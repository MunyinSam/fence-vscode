import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { scanFile } from './scanner';
import { aggregate } from './aggregator';
import { score } from './scoring';
import { getCurrentProfile, updateProfile, getDataDir } from './profile';
import { generateClaudeMd } from './claude-md';
import { getAuthorEmail } from './git';

// Output channel is created once and reused — creating a new one on every
// showProfile call would litter the OUTPUT dropdown with duplicates.
let outputChannel: vscode.OutputChannel | undefined;

function getOutputChannel(): vscode.OutputChannel {
  if (!outputChannel) {
    outputChannel = vscode.window.createOutputChannel('Fence');
  }
  return outputChannel;
}

// ── Registration ───────────────────────────────────────────────────────────

export function register(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand('fence.scanWorkspace', cmdScanWorkspace),
    vscode.commands.registerCommand('fence.showProfile',   cmdShowProfile),
    vscode.commands.registerCommand('fence.setMode',       cmdSetMode),
    vscode.commands.registerCommand('fence.resetProfile',  cmdResetProfile),
  );
}

// ── fence.scanWorkspace ────────────────────────────────────────────────────

async function cmdScanWorkspace(): Promise<void> {
  const files = await vscode.workspace.findFiles(
    '**/*.{ts,tsx}',
    '{**/node_modules/**,**/out/**,**/.fence/**}'
  );

  if (files.length === 0) {
    vscode.window.showInformationMessage('fence: no TypeScript files found in workspace.');
    return;
  }

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: `fence: scanning ${files.length} files…`,
      cancellable: false,
    },
    async () => {
      const authorEmail = await getAuthorEmail(files[0].fsPath);

      const signalCounts = files.map(f => {
        const signals = scanFile(f.fsPath);
        signals.author = authorEmail;
        return signals;
      });

      const agg     = aggregate(signalCounts);
      const result  = score(agg);
      const profile = updateProfile(result, agg);
      generateClaudeMd(profile);
    }
  );

  vscode.window.showInformationMessage('fence: workspace scan complete. Profile updated.');
}

// ── fence.showProfile ──────────────────────────────────────────────────────

function cmdShowProfile(): void {
  const profile = getCurrentProfile();

  if (!profile) {
    vscode.window.showInformationMessage(
      'fence: no profile found. Run "Fence: Scan Workspace" first.'
    );
    return;
  }

  const ch = getOutputChannel();
  ch.clear();

  const line = '─'.repeat(50);
  const { scores, tier, tierLabel, knownConstructs, unknownConstructs,
          conceptsUnderstood, conceptsNotYet, mode, lastUpdated } = profile;

  ch.appendLine('fence — Developer Skill Profile');
  ch.appendLine(line);
  ch.appendLine(`Tier:    ${tier} (${capitalize(tierLabel)})`);
  ch.appendLine(`Score:   ${scores.finalScore.toFixed(1)} / 10`);
  ch.appendLine(`Mode:    ${mode}`);
  ch.appendLine(`Updated: ${lastUpdated.slice(0, 10)}`);
  ch.appendLine('');

  ch.appendLine('Score breakdown');
  ch.appendLine(line);
  ch.appendLine(`  Idiom:          ${pct(scores.idiomScore)}`);
  ch.appendLine(`  Complexity:     ${pct(scores.complexityScore)}`);
  ch.appendLine(`  Abstraction:    ${pct(scores.abstractionScore)}`);
  ch.appendLine(`  Error handling: ${pct(scores.errorHandlingScore)}`);
  ch.appendLine(`  Modern syntax:  ${pct(scores.modernSyntaxScore)}`);
  ch.appendLine(`  Anti-pattern:   ${scores.antiPatternPenalty.toFixed(2)} (penalty)`);
  ch.appendLine('');

  ch.appendLine(`Known constructs (${knownConstructs.length})`);
  ch.appendLine(line);
  knownConstructs.forEach(c => ch.appendLine(`  ✓  ${c}`));
  ch.appendLine('');

  ch.appendLine(`Unknown constructs (${unknownConstructs.length})`);
  ch.appendLine(line);
  unknownConstructs.forEach(c => ch.appendLine(`  ✗  ${c}`));
  ch.appendLine('');

  ch.appendLine('Concept fingerprints');
  ch.appendLine(line);
  conceptsUnderstood.forEach(c => ch.appendLine(`  ✓  ${c}`));
  conceptsNotYet.forEach(c =>     ch.appendLine(`  ✗  ${c}`));
  ch.appendLine('');

  ch.appendLine(`Data stored in: ${getDataDir()}`);

  ch.show(true); // true = preserve focus on editor
}

// ── fence.setMode ──────────────────────────────────────────────────────────

async function cmdSetMode(): Promise<void> {
  const profile = getCurrentProfile();

  if (!profile) {
    vscode.window.showInformationMessage(
      'fence: no profile found. Run "Fence: Scan Workspace" first.'
    );
    return;
  }

  const current = profile.mode;

  const picked = await vscode.window.showQuickPick(
    [
      {
        label: 'Learn',
        description: current === 'learn' ? '(current)' : '',
        detail: 'When Claude encounters an unknown construct, it explains it and asks you to write it yourself.',
        value: 'learn' as const,
      },
      {
        label: 'Assist',
        description: current === 'assist' ? '(current)' : '',
        detail: 'Claude only generates code using constructs from your known list. No teaching, just assistance.',
        value: 'assist' as const,
      },
    ],
    { placeHolder: 'Select fence mode' }
  );

  if (!picked || picked.value === current) return;

  // Patch the mode field in place — leave everything else untouched
  profile.mode = picked.value;
  const dataDir = getDataDir();
  fs.writeFileSync(
    path.join(dataDir, 'profile.json'),
    JSON.stringify(profile, null, 2),
    'utf8'
  );
  generateClaudeMd(profile);

  vscode.window.showInformationMessage(`fence: mode set to ${picked.value}.`);
}

// ── fence.resetProfile ─────────────────────────────────────────────────────

async function cmdResetProfile(): Promise<void> {
  const confirmed = await vscode.window.showWarningMessage(
    'fence: delete profile and start fresh? This cannot be undone.',
    { modal: true },
    'Delete'
  );

  if (confirmed !== 'Delete') return;

  // Delete the data directory (home / workspace / custom depending on setting)
  const dataDir = getDataDir();
  if (fs.existsSync(dataDir)) {
    fs.rmSync(dataDir, { recursive: true, force: true });
  }

  // Also clear the workspace .fence/ where CLAUDE.md lives, if different
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (workspaceFolders) {
    const workspaceFence = path.join(workspaceFolders[0].uri.fsPath, '.fence');
    if (workspaceFence !== dataDir && fs.existsSync(workspaceFence)) {
      fs.rmSync(workspaceFence, { recursive: true, force: true });
    }
  }

  vscode.window.showInformationMessage(
    'fence: profile deleted. Save a TypeScript file or run "Fence: Scan Workspace" to start fresh.'
  );
}

// ── Formatters ─────────────────────────────────────────────────────────────

function pct(score: number): string {
  return `${(score * 100).toFixed(0)}%`;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
