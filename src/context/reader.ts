import * as vscode from 'vscode';
import type { LanguageGroup } from '../types/index';

export interface EditorContext {
    fileContent: string | null;
    selectedText: string | null;
    languageGroup: LanguageGroup | null;
}

const EXTENSION_TO_LANGUAGE_GROUP: Record<string, LanguageGroup> = {
    ts: 'js-ts-tsx',
    tsx: 'js-ts-tsx',
    js: 'js-ts-tsx',
    jsx: 'js-ts-tsx',
    mjs: 'js-ts-tsx',
    cjs: 'js-ts-tsx',
};

function detectLanguageGroup(fileName: string): LanguageGroup | null {
    const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
    return EXTENSION_TO_LANGUAGE_GROUP[ext] ?? null;
}

export function readEditorContext(): EditorContext {
    const editor = vscode.window.activeTextEditor;

    if (!editor) {
        return { fileContent: null, selectedText: null, languageGroup: null };
    }

    const document = editor.document;
    const fileContent = document.getText();
    const selectedText = editor.selection.isEmpty
        ? null
        : document.getText(editor.selection);
    const languageGroup = detectLanguageGroup(document.fileName);

    return { fileContent, selectedText, languageGroup };
}
