import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
	const cmd = vscode.commands.registerCommand('fence.helloWorld', () => {
		vscode.window.showInformationMessage('Fence is alive!');
	});

	context.subscriptions.push(cmd);
}

export function deactivate() {}
