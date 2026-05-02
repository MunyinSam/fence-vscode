import * as vscode from 'vscode';
import * as path from 'path';
import { getAuthoredLines, getAuthorEmail } from './git';
import { scanFile } from './scanner';
import { aggregate } from './aggregator';
import { score } from './scoring';
import { updateProfile } from './profile';
import { generateClaudeMd } from './claude-md';
import type { SignalCounts } from './types/index';

const DEBOUNCE_MS = 5000;
const TS_EXTENSIONS = new Set(['.ts', '.tsx']);

// In-memory cache of the latest SignalCounts per file path.
// Grows as files are saved. Re-aggregated on every update so the
// profile reflects all files seen this session, not just the latest save.
const fileCache = new Map<string, SignalCounts>();

// Tracks when each file was last scanned (epoch ms) for debouncing.
const lastScanTime = new Map<string, number>();

// ── Registration ───────────────────────────────────────────────────────────

export function register(context: vscode.ExtensionContext): void {
  const disposable = vscode.workspace.onDidSaveTextDocument(onSave);
  context.subscriptions.push(disposable);
}

// ── Save handler ───────────────────────────────────────────────────────────

async function onSave(document: vscode.TextDocument): Promise<void> {
  const filePath = document.uri.fsPath;

  if (!isTypeScriptFile(filePath)) return;
  if (isDebounced(filePath)) return;

  lastScanTime.set(filePath, Date.now());

  try {
    await runPipeline(filePath);
  } catch (err) {
    vscode.window.showErrorMessage(
      `fence: scan failed for ${path.basename(filePath)} — ${String(err)}`
    );
  }
}

// ── Pipeline ───────────────────────────────────────────────────────────────

async function runPipeline(filePath: string): Promise<void> {
  // Layer 8: isolate lines authored by the current git user.
  // Falls back to all lines if not a git repo or file is uncommitted.
  const authoredRanges = await getAuthoredLines(filePath);

  // Layer 1: AST scan. Author field filled from git config email.
  const signals = scanFile(filePath);
  signals.author = await getAuthorEmail(filePath);

  // Update the cache and re-aggregate from all files seen this session.
  fileCache.set(filePath, signals);
  const agg = aggregate(Array.from(fileCache.values()));

  // Score and persist.
  const result = score(agg);
  const profile = updateProfile(result, agg);
  generateClaudeMd(profile);
}

// ── Helpers ────────────────────────────────────────────────────────────────

function isTypeScriptFile(filePath: string): boolean {
  return TS_EXTENSIONS.has(path.extname(filePath));
}

function isDebounced(filePath: string): boolean {
  const last = lastScanTime.get(filePath) ?? 0;
  return Date.now() - last < DEBOUNCE_MS;
}

