import Anthropic from '@anthropic-ai/sdk';
import type { ConceptId } from '../types/index';
import { scoreExplanation, type DetailedScoringResult } from '../quiz/scorer';

export async function evaluateExplanation(
    client: Anthropic,
    concept: ConceptId,
    question: string,
    answer: string
): Promise<DetailedScoringResult> {
    return scoreExplanation(client, concept, '', question, answer);
}
