import * as vscode from 'vscode';
import type { ConceptId, ConceptTierEntry, SkillModel } from '../types/index';

const STORAGE_KEY = 'fence.skillModel';

const ALL_CONCEPTS: ConceptId[] = [
    'closures',
    'async-model',
    'pure-functions',
    'immutability',
    'component-composition',
    'async-error-handling',
    'separation-of-concerns',
];

function blankSkillModel(): SkillModel {
    return {
        languageGroup: 'js-ts-tsx',
        concepts: ALL_CONCEPTS.map((concept) => ({
            concept,
            tier: 1,
            confidence: 'low',
        })),
        lastUpdated: new Date().toISOString(),
    };
}

export function hasSkillModel(context: vscode.ExtensionContext): boolean {
    return context.globalState.get<SkillModel>(STORAGE_KEY) !== undefined;
}

export function getSkillModel(context: vscode.ExtensionContext): SkillModel {
    const stored = context.globalState.get<SkillModel>(STORAGE_KEY);
    return stored ?? blankSkillModel();
}

export async function saveSkillModel(
    context: vscode.ExtensionContext,
    model: SkillModel
): Promise<void> {
    await context.globalState.update(STORAGE_KEY, model);
}

export async function updateConcept(
    context: vscode.ExtensionContext,
    entry: ConceptTierEntry
): Promise<void> {
    const model = getSkillModel(context);
    const index = model.concepts.findIndex((c) => c.concept === entry.concept);

    if (index === -1) {
        model.concepts.push(entry);
    } else {
        model.concepts[index] = entry;
    }

    model.lastUpdated = new Date().toISOString();
    await saveSkillModel(context, model);
}
