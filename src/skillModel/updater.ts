import * as vscode from 'vscode';
import type { ConceptId, ScoringResult, Tier } from '../types/index';
import { getSkillModel, updateConcept } from '../storage/skillModel';

export async function applyScoreToModel(
    context: vscode.ExtensionContext,
    concept: ConceptId,
    score: ScoringResult
): Promise<void> {
    const model = getSkillModel(context);
    const entry = model.concepts.find((c) => c.concept === concept);
    const currentTier = entry?.tier ?? 1;

    let newTier: Tier;
    let confidence: 'low' | 'medium' | 'high';

    if (score.tier >= 4) {
        newTier = Math.min(currentTier + 1, 5) as Tier;
        confidence = 'high';
    } else if (score.tier === 3) {
        newTier = currentTier;
        confidence = 'medium';
    } else {
        newTier = Math.max(currentTier - 1, 1) as Tier;
        confidence = 'low';
    }

    await updateConcept(context, { concept, tier: newTier, confidence });
}
