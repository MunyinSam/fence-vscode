import type { ConceptId, ScoringResult } from '../types/index';

export type RouteAction = 'generate' | 'annotated' | 'refuse';

export interface RouteResult {
    action: RouteAction;
    reason: string;
}

export function routeResponse(
    score: ScoringResult | null,
    aboveTier: ConceptId[],
    atBoundary: ConceptId[]
): RouteResult {
    if (aboveTier.length === 0 && atBoundary.length === 0) {
        return {
            action: 'generate',
            reason: 'All required concepts are within your current tier.',
        };
    }

    if (score === null) {
        return {
            action: 'generate',
            reason: 'No comprehension check was required.',
        };
    }

    if (score.tier >= 4) {
        return {
            action: 'generate',
            reason: `Strong explanation (Tier ${score.tier}). Generating without annotation.`,
        };
    }

    if (score.tier >= 2) {
        const concepts = [...aboveTier, ...atBoundary].join(', ');
        return {
            action: 'annotated',
            reason: `Partial understanding of ${concepts} (Tier ${score.tier}). Generating with inline explanations.`,
        };
    }

    return {
        action: 'refuse',
        reason: `The explanation didn't demonstrate enough understanding of ${[...aboveTier, ...atBoundary].join(', ')} to generate safely. Here's what to learn first.`,
    };
}
