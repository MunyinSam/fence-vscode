import * as vscode from 'vscode';
import { detect } from './detector';
import { generate } from './generator';
import { write } from './writer';
import { LoadSkills, saveSkills } from './store';

// ---------------------------------------------------------------------------
// Diagnostics — stressed skills
// ---------------------------------------------------------------------------

/**
 * Inspects all active VS Code diagnostics and returns the set of skill names
 * that currently have TypeScript / lint errors pointing at them.
 *
 * These skills are passed to generate() so they are forced into the
 * "Still Learning" section regardless of their stored confidence score.
 * A developer with active errors on a construct doesn't own it yet.
 */
function getStressedSkills(): Set<string> {
    const stressed = new Set<string>();

    for (const [, diags] of vscode.languages.getDiagnostics()) {
        for (const d of diags) {
            if (d.severity !== vscode.DiagnosticSeverity.Error) { continue; }
            const msg = d.message.toLowerCase();

            if (msg.includes('type argument') || msg.includes('type parameter') || msg.includes('generic')) {
                stressed.add('TypeScript Generics');
            }
            if (msg.includes('interface') || msg.includes("property '") || msg.includes('does not exist on type')) {
                stressed.add('TypeScript Interfaces & Types');
            }
            if (msg.includes('promise') || msg.includes('async') || msg.includes('await')) {
                stressed.add('Async / Await');
            }
            if (msg.includes('hook') || msg.includes('usestate') || msg.includes('useeffect')) {
                stressed.add('React Hooks');
            }
        }
    }

    return stressed;
}

// ---------------------------------------------------------------------------
// Shared scan-and-write helper
// ---------------------------------------------------------------------------

async function runScan(projectPath: string, singleFile?: string): Promise<void> {
    const detected  = await detect(projectPath, singleFile);
    await saveSkills(detected);
    const allSkills = await LoadSkills();
    const stressed  = getStressedSkills();
    const content   = generate(allSkills, stressed);
    await write(projectPath, content);
}

// ---------------------------------------------------------------------------
// Activation
// ---------------------------------------------------------------------------

export function activate(context: vscode.ExtensionContext) {
    console.log('fence is active');

    // ── Manual full-scan command (Ctrl+Shift+F) ───────────────────────────
    const initCommand = vscode.commands.registerCommand('fence.init', async () => {
        const projectPath = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
        if (!projectPath) { return; }
        await runScan(projectPath);
    });

    // ── Incremental scan on every file save ───────────────────────────────
    // Runs detection on the saved file only (fast). Each save that contains
    // a recognised skill increments that skill's editCount in the store,
    // which applies a confidence bonus on top of the base scan score.
    const saveListener = vscode.workspace.onDidSaveTextDocument(async (doc) => {
        const projectPath = vscode.workspace.getWorkspaceFolder(doc.uri)?.uri.fsPath;
        if (!projectPath) { return; }
        await runScan(projectPath, doc.uri.fsPath);
    });

    context.subscriptions.push(initCommand, saveListener);
}

export function deactivate() {}
