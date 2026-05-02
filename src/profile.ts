import * as vscode from 'vscode';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import type { SkillProfile, AggregatedSignals, ScanHistory, HistoryEntry } from './types/index';
import type { ScoringResult } from './scoring';

const PROFILE_FILE = 'profile.json';
const SIGNALS_FILE = 'signals.json';
const HISTORY_FILE = 'history.json';

// ── Storage location ───────────────────────────────────────────────────────

// Returns the directory where data files live, based on the user's setting.
//
//   home (default) → ~/.fence/
//   workspace      → <workspaceRoot>/.fence/
//   custom         → fence.customStoragePath (~ expanded)
//
// CLAUDE.md always goes to the workspace regardless — see claude-md.ts.

export function getDataDir(): string {
  const config   = vscode.workspace.getConfiguration('fence');
  const location = config.get<string>('storageLocation', 'home');

  switch (location) {
    case 'workspace':
      return path.join(getWorkspaceRoot(), '.fence');

    case 'custom': {
      const custom = config.get<string>('customStoragePath', '').trim();
      if (!custom) return path.join(os.homedir(), '.fence'); // fallback if unset
      return custom.startsWith('~')
        ? path.join(os.homedir(), custom.slice(2))
        : custom;
    }

    default: // 'home'
      return path.join(os.homedir(), '.fence');
  }
}

function getWorkspaceRoot(): string {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders || folders.length === 0) {
    throw new Error('fence: no workspace folder is open');
  }
  return folders[0].uri.fsPath;
}

// Creates the data directory if needed.
// Also adds .fence/ to .gitignore when using workspace storage so the
// data files don't get committed.
function ensureDataDir(): void {
  const dataDir = getDataDir();

  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const config   = vscode.workspace.getConfiguration('fence');
  const location = config.get<string>('storageLocation', 'home');

  if (location === 'workspace') {
    ensureGitignore(getWorkspaceRoot(), '.fence/');
  }
}

function ensureGitignore(root: string, entry: string): void {
  const gitignorePath = path.join(root, '.gitignore');

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
    return readJson<SkillProfile>(path.join(getDataDir(), PROFILE_FILE));
  } catch {
    return null;
  }
}

export function getHistory(): ScanHistory {
  try {
    return readJson<ScanHistory>(path.join(getDataDir(), HISTORY_FILE)) ?? { entries: [] };
  } catch {
    return { entries: [] };
  }
}

// Assembles a full SkillProfile from scoring output, persists all three data
// files, and appends a history entry. Returns the written profile.
export function updateProfile(result: ScoringResult, agg: AggregatedSignals): SkillProfile {
  ensureDataDir();

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

  const dataDir = getDataDir();
  writeJson(path.join(dataDir, PROFILE_FILE), profile);
  writeJson(path.join(dataDir, SIGNALS_FILE), agg);
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
  writeJson(path.join(getDataDir(), HISTORY_FILE), history);
}
