import Anthropic from '@anthropic-ai/sdk';
import type { ConceptId } from '../types/index';

export async function generateChallengeQuestion(
    client: Anthropic,
    concept: ConceptId,
    userMessage: string,
    fileContent: string | null
): Promise<string> {
    const fileSection = fileContent
        ? `## Active file (excerpt):\n\`\`\`\n${fileContent.slice(0, 2000)}\n\`\`\``
        : '## Active file:\n(none)';

    const message = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 150,
        messages: [
            {
                role: 'user',
                content: `You are a senior developer doing a code review. A junior has asked for help with code that involves the concept of "${concept}".

Your job is to ask them ONE short, targeted question that challenges their specific design choice — not their general knowledge of the concept.

Rules:
- Sound like a colleague in a code review, not an examiner
- Challenge the decision, not the vocabulary ("why here?" not "what is it?")
- Reference the actual request or file context where possible
- One sentence or two short sentences maximum
- No preamble, no "Great question", just the question itself

${fileSection}

## What the developer asked for:
${userMessage}

Write the challenge question now:`,
            },
        ],
    });

    const block = message.content[0];
    if (block.type !== 'text' || !block.text.trim()) {
        return `Why does this need to use ${concept} here — what would break if you approached it differently?`;
    }

    return block.text.trim();
}
