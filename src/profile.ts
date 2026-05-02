import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import type { SkillProfile, AggregatedSignals, ScanHistory, HistoryEntry } from './types/index';
import type { ScoringResult } from './scoring';

const FENCE_DIR    = '.fence';
const PROFILE_FILE = 'profile.json';
const SIGNALS_FILE = 'signals.json';
const HISTORY_FILE = 'history.json';

// ── Workspace helpers ──────────────────────────────────────────────────────

function getWorkspaceRoot(): string {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders || folders.length === 0) {
    throw new Error('fence: no workspace folder is open');
  }
  return folders[0].uri.fsPath;
}

function getFenceDir(): string {
  return path.join(getWorkspaceRoot(), FENCE_DIR);
}

// Called before any write. Creates .fence/ and adds it to .gitignore.
// Safe to call multiple times — checks existence before acting.
function ensureFenceDir(): void {
  const fenceDir = getFenceDir();

  if (!fs.existsSync(fenceDir)) {
    fs.mkdirSync(fenceDir, { recursive: true });
  }

  const gitignorePath = path.join(getWorkspaceRoot(), '.gitignore');
  const entry = '.fence/';

  if (fs.existsSync(gitignorePath)) {
    const contents = fs.readFileSync(gitignorePath, 'utf8');
    if (!contents.split('\n').map(l => l.trim()).includes(entry)) {
      const separator = contents.endsWith('\n') ? '' : '\n';
      fs.appendFileSync(gitignorePath, `${separator}${entry}\n`, 'utf8');
    }
  } else {
    fs.writeFileSync(gitignorePath, `${entry}\n`, 'utf8');
  }
}

// ── JSON helpers ───────────────────────────────────────────────────────────

function readJson<T>(filePath: string): T | null {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
  } catch {
    return null;
  }
}

function writeJson(filePath: string, data: unknown): void {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

// ── Public API ─────────────────────────────────────────────────────────────

export function getCurrentProfile(): SkillProfile | null {
  try {
    return readJson<SkillProfile>(path.join(getFenceDir(), PROFILE_FILE));
  } catch {
    return null;
  }
}

export function getHistory(): ScanHistory {
  try {
    return readJson<ScanHistory>(path.join(getFenceDir(), HISTORY_FILE)) ?? { entries: [] };
  } catch {
    return { entries: [] };
  }
}

// Assembles a full SkillProfile from scoring output, persists all three files,
// and appends a history entry. Returns the written profile.
export function updateProfile(result: ScoringResult, agg: AggregatedSignals): SkillProfile {
  ensureFenceDir();

  // Preserve user-controlled fields across scans — don't reset mode or settings
  const existing = getCurrentProfile();

  const profile: SkillProfile = {
    version: 1,
    lastUpdated: new Date().toISOString(),
    source: 'scan',
    scores: result.scores,
    tier: result.tier,
    tierLabel: result.tierLabel,
    knownConstructs: result.knownConstructs,
    unknownConstructs: result.unknownConstructs,
    conceptsUnderstood: result.conceptsUnderstood,
    conceptsNotYet: result.conceptsNotYet,
    mode: existing?.mode ?? 'learn',
    settings: existing?.settings ?? {
      scanOnSave: true,
      scanOnCommit: false,
      autoUpdateClaudeMd: true,
    },
  };

  const fenceDir = getFenceDir();
  writeJson(path.join(fenceDir, PROFILE_FILE), profile);
  writeJson(path.join(fenceDir, SIGNALS_FILE), agg);
  appendHistory(result, agg);

  return profile;
}

// ── Internal ───────────────────────────────────────────────────────────────

function appendHistory(result: ScoringResult, agg: AggregatedSignals): void {
  const history = getHistory();

  const ap = agg.antiPatternsByFile;
  const antiPatternCount =
    ap.anyUsage + ap.anyAsReturnType + ap.tsIgnore + ap.eslintDisable +
    ap.unsafeAssertion + ap.emptyCatch + ap.varDeclarations +
    ap.callbackNesting + ap.floatingPromises;

  const entry: HistoryEntry = {
    date: new Date().toISOString().slice(0, 10),
    finalScore: result.scores.finalScore,
    tier: result.tier,
    knownConstructCount: result.knownConstructs.length,
    antiPatternCount,
    filesScanned: agg.totalFilesScanned,
  };

  history.entries.push(entry);
  writeJson(path.join(getFenceDir(), HISTORY_FILE), history);
}
