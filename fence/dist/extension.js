"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const detector_1 = require("./detector");
const generator_1 = require("./generator");
const writer_1 = require("./writer");
const store_1 = require("./store");
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
function getStressedSkills() {
    const stressed = new Set();
    for (const [, diags] of vscode.languages.getDiagnostics()) {
        for (const d of diags) {
            if (d.severity !== vscode.DiagnosticSeverity.Error) {
                continue;
            }
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
async function runScan(projectPath, singleFile) {
    const detected = await (0, detector_1.detect)(projectPath, singleFile);
    await (0, store_1.saveSkills)(detected);
    const allSkills = await (0, store_1.LoadSkills)();
    const stressed = getStressedSkills();
    const content = (0, generator_1.generate)(allSkills, stressed);
    await (0, writer_1.write)(projectPath, content);
}
// ---------------------------------------------------------------------------
// Activation
// ---------------------------------------------------------------------------
function activate(context) {
    console.log('fence is active');
    // ── Manual full-scan command (Ctrl+Shift+F) ───────────────────────────
    const initCommand = vscode.commands.registerCommand('fence.init', async () => {
        const projectPath = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
        if (!projectPath) {
            return;
        }
        await runScan(projectPath);
    });
    // ── Incremental scan on every file save ───────────────────────────────
    // Runs detection on the saved file only (fast). Each save that contains
    // a recognised skill increments that skill's editCount in the store,
    // which applies a confidence bonus on top of the base scan score.
    const saveListener = vscode.workspace.onDidSaveTextDocument(async (doc) => {
        const projectPath = vscode.workspace.getWorkspaceFolder(doc.uri)?.uri.fsPath;
        if (!projectPath) {
            return;
        }
        await runScan(projectPath, doc.uri.fsPath);
    });
    context.subscriptions.push(initCommand, saveListener);
}
function deactivate() { }
//# sourceMappingURL=extension.js.map