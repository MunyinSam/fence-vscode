import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext): void {
    const participant = vscode.chat.createChatParticipant('fence', handleRequest);
    context.subscriptions.push(participant);
}

async function handleRequest(
    request: vscode.ChatRequest,
    _context: vscode.ChatContext,
    stream: vscode.ChatResponseStream,
    _token: vscode.CancellationToken
): Promise<void> {
    stream.markdown('fence is not yet implemented.');
}

export function deactivate(): void {}
