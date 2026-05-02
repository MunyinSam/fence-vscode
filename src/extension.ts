import * as vscode from 'vscode';
import { register as registerWatcher } from './watcher';
import { register as registerCommands } from './commands';
import { getCurrentProfile, updateProfile } from './profile';
import { scanFile } from './scanner';
import { aggregate } from './aggregator';
import { score } from './scoring';
import { generateClaudeMd } from './claude-md';
import { getAuthorEmail } from './git';

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  const existing = getCurrentProfile();

  registerCommands(context);

  if (existing) {
    // Profile already exists — go straight to watching for changes
    registerWatcher(context);
  } else {
    // First run — scan the whole workspace to build an initial profile,
    // then start the watcher for incremental updates
    await runInitialScan();
    registerWatcher(context);
  }
}

export function deactivate(): void {
  // Subscriptions in context.subscriptions are disposed automatically by VS Code.
  // All profile writes are synchronous so there's nothing to flush here.
}

// ── Initial scan ───────────────────────────────────────────────────────────

async function runInitialScan(): Promise<void> {
  const files = await vscode.workspace.findFiles(
    '**/*.{ts,tsx}',
    '{**/node_modules/**,**/out/**,**/.fence/**}'
  );

  if (files.length === 0) {
    // No TypeScript files yet — profile will be created on the first save
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
}
