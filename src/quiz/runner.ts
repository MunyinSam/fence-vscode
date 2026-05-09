import * as vscode from 'vscode';
import Anthropic from '@anthropic-ai/sdk';
import type { ConceptId, ScoringResult, Tier } from '../types/index';
import { QUIZ_QUESTIONS } from './questions';
import { getSkillModel, updateConcept } from '../storage/skillModel';

interface ScoreResponse extends ScoringResult {
    followUpQuestion?: string;
}

const TIER_LABELS: Record<Tier, string> = {
    1: 'Aware',
    2: 'Recognizes',
    3: 'Applies',
    4: 'Chooses',
    5: 'Designs',
};

const RUBRIC = `
Score using four dimensions:
- Accuracy: Is what they said correct?
- Depth: Do they explain WHY, not just WHAT?
- Tradeoff awareness: Do they know what they chose over?
- Edge case awareness: Do they know where it breaks?

Tier mapping:
- Tier 1-2: Accurate but surface-level. No why, no tradeoffs.
- Tier 3: Accurate + some why. No tradeoffs.
- Tier 4: Accurate + why + tradeoffs.
- Tier 5: Accurate + why + tradeoffs + edge cases.
`.trim();

async function scoreExplanation(
    client: Anthropic,
    concept: ConceptId,
    snippet: string,
    questionPrompt: string,
    explanation: string
): Promise<ScoreResponse> {
    const message = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 512,
        messages: [
            {
                role: 'user',
                content: `You are scoring a developer's understanding of a programming concept based on their written explanation.

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

Respond with JSON only — no markdown, no commentary:
{
  "tier": <number 1-5>,
  "rationale": "<one sentence explaining the score>",
  "followUpNeeded": <true if score is borderline between two tiers>,
  "followUpQuestion": "<targeted Socratic question to resolve ambiguity, only present if followUpNeeded is true>"
}`,
            },
        ],
    });

    const text = message.content[0].type === 'text' ? message.content[0].text : '{}';
    return JSON.parse(text) as ScoreResponse;
}

function showSummary(context: vscode.ExtensionContext): void {
    const model = getSkillModel(context);
    const channel = vscode.window.createOutputChannel('fence — Quiz Results');

    channel.appendLine('fence — Skill Quiz Results');
    channel.appendLine('─'.repeat(40));

    for (const entry of model.concepts) {
        const label = TIER_LABELS[entry.tier];
        channel.appendLine(`${entry.concept.padEnd(28)} Tier ${entry.tier} — ${label}  (${entry.confidence})`);
    }

    channel.appendLine('─'.repeat(40));
    channel.appendLine(`Last updated: ${model.lastUpdated}`);
    channel.show();
}

export async function runQuiz(
    context: vscode.ExtensionContext,
    apiKey: string
): Promise<void> {
    const client = new Anthropic({ apiKey });

    const confirmed = await vscode.window.showInformationMessage(
        `fence onboarding quiz — 7 questions. You'll see a code snippet and be asked to explain it. Ready?`,
        'Start',
        'Cancel'
    );
    if (confirmed !== 'Start') {
        return;
    }

    for (const question of QUIZ_QUESTIONS) {
        const prompt = `[${question.concept}]\n\n${question.snippet}\n\n${question.prompt}`;

        const explanation = await vscode.window.showInputBox({
            prompt: question.prompt,
            placeHolder: 'Type your explanation here…',
            ignoreFocusOut: true,
            title: `fence quiz — ${question.concept} (${QUIZ_QUESTIONS.indexOf(question) + 1} of ${QUIZ_QUESTIONS.length})`,
        });

        if (explanation === undefined) {
            vscode.window.showWarningMessage('fence quiz cancelled. Progress so far has been saved.');
            break;
        }

        let score = await scoreExplanation(
            client,
            question.concept,
            question.snippet,
            question.prompt,
            explanation
        );

        if (score.followUpNeeded && score.followUpQuestion) {
            const followUp = await vscode.window.showInputBox({
                prompt: score.followUpQuestion,
                placeHolder: 'Type your answer here…',
                ignoreFocusOut: true,
                title: `fence quiz — follow-up on ${question.concept}`,
            });

            if (followUp === undefined) {
                vscode.window.showWarningMessage('fence quiz cancelled. Progress so far has been saved.');
                break;
            }

            score = await scoreExplanation(
                client,
                question.concept,
                question.snippet,
                score.followUpQuestion,
                followUp
            );
        }

        await updateConcept(context, {
            concept: question.concept,
            tier: score.tier as Tier,
            confidence: score.followUpNeeded ? 'medium' : 'high',
        });
    }

    showSummary(context);
}
