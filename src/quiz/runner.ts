import * as vscode from 'vscode';
import Anthropic from '@anthropic-ai/sdk';
import type { Tier } from '../types/index';
import { QUIZ_QUESTIONS } from './questions';
import { scoreExplanation } from './scorer';
import { getSkillModel, updateConcept } from '../storage/skillModel';

const TIER_LABELS: Record<Tier, string> = {
    1: 'Aware',
    2: 'Recognizes',
    3: 'Applies',
    4: 'Chooses',
    5: 'Designs',
};

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
            tier: score.tier,
            confidence: score.followUpNeeded ? 'medium' : 'high',
        });
    }

    showSummary(context);
}
