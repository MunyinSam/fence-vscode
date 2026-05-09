import * as vscode from 'vscode';
import Anthropic from '@anthropic-ai/sdk';
import { getApiKey, setApiKey } from './storage/apiKey';
import { getSkillModel, hasSkillModel } from './storage/skillModel';
import { runQuiz } from './quiz/runner';
import { readEditorContext } from './context/reader';
import { extractRequiredConcepts } from './gate/conceptExtractor';
import { compareConceptsToModel } from './gate/tierComparator';
import { generateChallengeQuestion } from './gate/questionGenerator';
import { evaluateExplanation } from './gate/explanationEvaluator';
import { routeResponse } from './gate/responseRouter';
import { generateCode } from './generation/generator';
import { buildRefusalMessage } from './generation/refusal';
import { applyScoreToModel } from './skillModel/updater';

async function handleFenceRequest(
    context: vscode.ExtensionContext,
    client: Anthropic,
    request: vscode.ChatRequest,
    stream: vscode.ChatResponseStream
): Promise<void> {
    const { fileContent, languageGroup } = readEditorContext();

    // Outside JS/TS/TSX — no concept model to gate against, generate freely
    if (languageGroup !== 'js-ts-tsx') {
        await generateCode(client, request.prompt, fileContent, 'normal', [], stream);
        return;
    }

    const model = getSkillModel(context);
    const requiredConcepts = await extractRequiredConcepts(client, request.prompt, fileContent);

    if (requiredConcepts.length === 0) {
        await generateCode(client, request.prompt, fileContent, 'normal', [], stream);
        return;
    }

    const { atBoundary, above } = compareConceptsToModel(requiredConcepts, model);

    if (atBoundary.length === 0 && above.length === 0) {
        await generateCode(client, request.prompt, fileContent, 'normal', [], stream);
        return;
    }

    const conceptToCheck = above[0] ?? atBoundary[0];
    const question = await generateChallengeQuestion(client, conceptToCheck, request.prompt, fileContent);

    stream.markdown(`**fence:** ${question}\n\n*(answer in the input box that just appeared)*`);

    const answer = await vscode.window.showInputBox({
        prompt: question,
        placeHolder: 'Type your answer here…',
        ignoreFocusOut: true,
        title: `fence — ${conceptToCheck}`,
    });

    if (answer === undefined) {
        stream.markdown('\n\n*Comprehension check cancelled. No code generated.*');
        return;
    }

    const score = await evaluateExplanation(client, conceptToCheck, question, answer);
    await applyScoreToModel(context, conceptToCheck, score);

    const route = routeResponse(score, above, atBoundary);

    if (route.action === 'refuse') {
        stream.markdown(buildRefusalMessage(conceptToCheck));
    } else if (route.action === 'annotated') {
        await generateCode(client, request.prompt, fileContent, 'annotated', [...above, ...atBoundary], stream);
    } else {
        await generateCode(client, request.prompt, fileContent, 'normal', [], stream);
    }
}

export async function activate(context: vscode.ExtensionContext): Promise<void> {
    let apiKey = await getApiKey(context);
    if (!apiKey) {
        apiKey = await setApiKey(context);
        if (!apiKey) {
            vscode.window.showErrorMessage('fence: an Anthropic API key is required. Reload the window to try again.');
            return;
        }
    }

    if (!hasSkillModel(context)) {
        await runQuiz(context, apiKey);
    }

    const client = new Anthropic({ apiKey });

    const participant = vscode.chat.createChatParticipant(
        'MunyinSam.fence',
        async (_request, _chatContext, stream, _token) => {
            await handleFenceRequest(context, client, _request, stream);
        }
    );

    context.subscriptions.push(participant);
}

export function deactivate(): void {}
