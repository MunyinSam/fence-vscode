import * as vscode from 'vscode';
import Anthropic from '@anthropic-ai/sdk';
import type { ConceptId } from '../types/index';

type GenerationMode = 'normal' | 'annotated';

const NORMAL_SYSTEM = `You are a code generation assistant. Generate clean, correct code that directly addresses the user's request. Use the active file for context on style, framework, and conventions. Return only code and the minimum explanation needed to use it.`;

function annotatedSystem(concepts: ConceptId[]): string {
    return `You are a code generation assistant helping a developer who is still building their understanding of: ${concepts.join(', ')}.

Generate correct code that addresses the request. For every usage of ${concepts.join(' or ')} in the generated code, add an inline comment directly above that line or block that:
- Explains what this specific usage is doing
- Explains WHY this approach was chosen over a simpler alternative
- Is written as a teaching aside, not a label

Keep the comments concise — one or two lines each. The code must still work correctly.`;
}

export async function generateCode(
    client: Anthropic,
    userMessage: string,
    fileContent: string | null,
    mode: GenerationMode,
    boundaryConcepts: ConceptId[],
    chatStream: vscode.ChatResponseStream
): Promise<void> {
    const systemPrompt = mode === 'annotated'
        ? annotatedSystem(boundaryConcepts)
        : NORMAL_SYSTEM;

    const fileSection = fileContent
        ? `## Active file:\n\`\`\`\n${fileContent.slice(0, 3000)}\n\`\`\`\n\n`
        : '';

    const stream = client.messages.stream({
        model: 'claude-sonnet-4-6',
        max_tokens: 2048,
        system: systemPrompt,
        messages: [
            {
                role: 'user',
                content: `${fileSection}${userMessage}`,
            },
        ],
    });

    for await (const chunk of stream) {
        if (
            chunk.type === 'content_block_delta' &&
            chunk.delta.type === 'text_delta'
        ) {
            chatStream.markdown(chunk.delta.text);
        }
    }
}
