import type { ConceptId, SkillModel } from '../types/index';

export interface ComparisonResult {
    withinTier: ConceptId[];
    atBoundary: ConceptId[];
    above: ConceptId[];
}

export function compareConceptsToModel(
    requiredConcepts: ConceptId[],
    model: SkillModel
): ComparisonResult {
    const result: ComparisonResult = { withinTier: [], atBoundary: [], above: [] };

    for (const conceptId of requiredConcepts) {
        const entry = model.concepts.find((c) => c.concept === conceptId);
        const userTier = entry?.tier ?? 1;

        if (userTier >= 4) {
            result.withinTier.push(conceptId);
        } else if (userTier === 3) {
            result.atBoundary.push(conceptId);
        } else {
            result.above.push(conceptId);
        }
    }

    return result;
}
