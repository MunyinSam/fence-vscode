import * as vscode from 'vscode';
import { register as registerWatcher } from './watcher';

export function activate(context: vscode.ExtensionContext) {
	registerWatcher(context);
}

export function deactivate() {}
