import * as vscode from 'vscode';

const SECRET_KEY = 'fence.anthropicApiKey';

export async function hasApiKey(context: vscode.ExtensionContext): Promise<boolean> {
    const key = await context.secrets.get(SECRET_KEY);
    return key !== undefined && key.length > 0;
}

export async function getApiKey(context: vscode.ExtensionContext): Promise<string | undefined> {
    return context.secrets.get(SECRET_KEY);
}

export async function setApiKey(context: vscode.ExtensionContext): Promise<string | undefined> {
    const input = await vscode.window.showInputBox({
        prompt: 'Enter your Anthropic API key',
        placeHolder: 'sk-ant-...',
        password: true,
        ignoreFocusOut: true,
        validateInput: (value) => {
            if (!value || value.trim().length === 0) {
                return 'API key cannot be empty';
            }
            if (!value.startsWith('sk-ant-')) {
                return 'Anthropic API keys start with sk-ant-';
            }
            return null;
        },
    });

    if (input === undefined) {
        return undefined;
    }

    await context.secrets.store(SECRET_KEY, input.trim());
    return input.trim();
}
