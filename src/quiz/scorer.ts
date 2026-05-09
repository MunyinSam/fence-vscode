import Anthropic from '@anthropic-ai/sdk';
import type { ConceptId, ScoringResult, Tier } from '../types/index';

export interface DetailedScoringResult extends ScoringResult {
    followUpQuestion?: string;
}

const RUBRIC = `
Score the explanation using four dimensions:
- Accuracy: Is what they said correct?
- Depth: Do they explain WHY, not just WHAT?
- Tradeoff awareness: Do they know what they chose over?
- Edge case awareness: Do they know where it breaks?

Map to a tier:
- Tier 1-2: Accurate but surface-level. No why, no tradeoffs.
- Tier 3: Accurate + some why. No tradeoffs.
- Tier 4: Accurate + why + tradeoffs.
- Tier 5: Accurate + why + tradeoffs + edge cases.

Set followUpNeeded to true if the score lands on a boundary between tiers
and one targeted question could resolve the ambiguity.
`.trim();

export async function scoreExplanation(
    client: Anthropic,
    concept: ConceptId,
    snippet: string,
    questionPrompt: string,
    explanation: string
): Promise<DetailedScoringResult> {
    const message = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 512,
        messages: [
            {
                role: 'user',
                content: `You are scoring a developer's understanding of a programming concept.

## Code they were shown:
\`\`\`typescript
${snippet}
\`\`\`

## Question asked:
${questionPrompt}

## Their explanation:
${explanation}

## Rubric:
${RUBRIC}

Respond with JSON only — no markdown fences, no commentary:
{
  "tier": <number 1-5>,
  "rationale": "<one sentence explaining the score>",
  "followUpNeeded": <true|false>,
  "followUpQuestion": "<targeted Socratic question, only present when followUpNeeded is true>"
}`,
            },
        ],
    });

    const block = message.content[0];
    if (block.type !== 'text') {
        return { tier: 2, rationale: 'Scoring failed — unexpected response format.', followUpNeeded: false };
    }

    try {
        const parsed = JSON.parse(block.text) as DetailedScoringResult;
        return {
            tier: clampTier(parsed.tier),
            rationale: parsed.rationale ?? '',
            followUpNeeded: parsed.followUpNeeded ?? false,
            followUpQuestion: parsed.followUpQuestion,
        };
    } catch {
        return { tier: 2, rationale: 'Scoring failed — could not parse response.', followUpNeeded: false };
    }
}

function clampTier(value: unknown): Tier {
    const n = Number(value);
    if (n >= 1 && n <= 5 && Number.isInteger(n)) {
        return n as Tier;
    }
    return 2;
}
