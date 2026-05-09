import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext): void {
    const participant = vscode.chat.createChatParticipant('MunyinSam.fence', handleRequest);
    context.subscriptions.push(participant);
}

async function handleRequest(
    _request: vscode.ChatRequest,
    _context: vscode.ChatContext,
    stream: vscode.ChatResponseStream,
    _token: vscode.CancellationToken
): Promise<void> {
    stream.markdown('fence is alive');
}

export function deactivate(): void {}
