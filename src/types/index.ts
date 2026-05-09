export type ConceptId =
    | 'closures'
    | 'async-model'
    | 'pure-functions'
    | 'immutability'
    | 'component-composition'
    | 'async-error-handling'
    | 'separation-of-concerns';

export type LanguageGroup = 'js-ts-tsx';

export type Tier = 1 | 2 | 3 | 4 | 5;

export interface ConceptTierEntry {
    concept: ConceptId;
    tier: Tier;
    confidence: 'low' | 'medium' | 'high';
}

export interface SkillModel {
    languageGroup: LanguageGroup;
    concepts: ConceptTierEntry[];
    lastUpdated: string;
}

export interface ScoringResult {
    tier: Tier;
    rationale: string;
    followUpNeeded: boolean;
}

export interface GenerationRequest {
    userMessage: string;
    activeFileContent: string | null;
    requiredConcepts: ConceptId[];
}
