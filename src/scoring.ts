import type { AggregatedSignals, Scores, Tier, TierLabel } from './types/index';

export interface ScoringResult {
  scores: Scores;
  tier: Tier;
  tierLabel: TierLabel;
  knownConstructs: string[];
  unknownConstructs: string[];
  conceptsUnderstood: string[];
  conceptsNotYet: string[];
}

export function score(agg: AggregatedSignals): ScoringResult {
  const s  = agg.signalsByFile;
  const ap = agg.antiPatternsByFile;
  const n  = agg.totalFilesScanned;
  const { knownConstructs, unknownConstructs } =
    classifyConstructs(s, agg.conceptFingerprints, n);

  // ── breadth score ──────────────────────────────────────────────────────
  const breadthScore = knownConstructs.length / (knownConstructs.length + unknownConstructs.length)

  // ── idiom score ────────────────────────────────────────────────────────
  // Preserved from original: ratio of idiomatic patterns over idiomatic + anti-idiomatic.
  // Inputs are now file-counts (how many files used each pattern) instead of occurrences.
  const idiomNumerator = s.arrayMethods + s.optionalChaining + s.nullishCoalescing + s.destructuring;
  const idiomTotal     = idiomNumerator + s.forLoopsOnArrays;
  const idiomScore     = idiomTotal === 0 ? 0.5 : idiomNumerator / idiomTotal;

  // ── complexity score ───────────────────────────────────────────────────
  // Original used avgComplexity = totalComplexity / functions, which isn't
  // available at the aggregated level. Proxy: rate of callback-nesting across
  // the repo. A repo with no callback hell scores 1; one where every file has
  // it scores 0.
  const complexityScore = n === 0 ? 0.5 : Math.max(0, 1 - (ap.callbackNesting / n));

  // ── abstraction score ──────────────────────────────────────────────────
  // Original: (signals * 10) / totalLines — signal density per line.
  // Adapted: signal density per file. 3 abstraction signals per file = 1.0.
  // Higher-tier generics (constrained, conditional) included alongside basic ones.
  const abstractionSignals = s.writingGenerics + s.higherOrderFns + s.typeDefinitions
    + s.constrainedGenerics + s.conditionalTypes;
  const abstractionScore = n === 0 ? 0.5 : Math.min(1, abstractionSignals / (n * 3));

  // ── error handling score ───────────────────────────────────────────────
  // Preserved from original: handled / total, penalised by empty catches.
  // asyncAwait (files with any await) is the closest proxy for asyncFunctions
  // count at the aggregated level.
  const errorHandlingScore = s.asyncAwait === 0
    ? 0.5
    : Math.max(0, (s.handledAsync - ap.emptyCatch) / s.asyncAwait);

  // ── modern syntax score ────────────────────────────────────────────────
  // Preserved from original: async ratio minus var penalty.
  const modernTotal      = s.asyncAwait + ap.callbackNesting;
  const modernBaseRatio  = modernTotal === 0 ? 0.5 : s.asyncAwait / modernTotal;
  const varRate          = n === 0 ? 0 : ap.varDeclarations / n;
  const modernSyntaxScore = Math.max(0, modernBaseRatio - varRate);

  // ── anti-pattern penalty (new dimension) ──────────────────────────────
  // Normalised by files scanned so large repos aren't unfairly penalised.
  // anyAsReturnType weighted double — it propagates unsafety to every caller.
  // Capped at -0.3 so a messy repo can't score below 0 on this axis alone.
  const rawPenalty = n === 0 ? 0
    : (ap.anyUsage + (ap.anyAsReturnType * 2) + ap.tsIgnore + ap.unsafeAssertion + ap.emptyCatch + ap.floatingPromises) / n;
  const antiPatternPenalty = -Math.min(0.3, rawPenalty * 0.05);

  // ── final score ────────────────────────────────────────────────────────
  // Same weights as original. Penalty applied after weighted sum.
  const weighted =
    (idiomScore         * 0.20) +
    (complexityScore    * 0.15) +
    (abstractionScore   * 0.20) +
    (errorHandlingScore * 0.15) +
    (modernSyntaxScore  * 0.10) +
    (breadthScore       * 0.20);

  const finalScore = Math.max(1, Math.min(10, (weighted + antiPatternPenalty) * 10));

  const scores: Scores = {
    idiomScore,
    complexityScore,
    abstractionScore,
    errorHandlingScore,
    modernSyntaxScore,
    breadthScore,
    antiPatternPenalty,
    finalScore,
  };

  const tier      = getTier(finalScore);
  const tierLabel = TIER_LABELS[tier];

  const { conceptsUnderstood, conceptsNotYet } =
    classifyFingerprints(agg.conceptFingerprints);

  return { scores, tier, tierLabel, knownConstructs, unknownConstructs, conceptsUnderstood, conceptsNotYet };
}

// ── Tier mapping ───────────────────────────────────────────────────────────

function getTier(finalScore: number): Tier {
  if (finalScore <= 2) return 1;
  if (finalScore <= 4) return 2;
  if (finalScore <= 6) return 3;
  if (finalScore <= 8) return 4;
  return 5;
}

const TIER_LABELS: Record<Tier, TierLabel> = {
  1: 'novice',
  2: 'elementary',
  3: 'intermediate',
  4: 'advanced',
  5: 'expert',
};

// ── Construct classification ───────────────────────────────────────────────
//
// Threshold: a construct needs to appear in enough files before it's "known".
// Research doc suggests 3+ files. For small repos (<10 files) we scale down
// so the scanner isn't uselessly conservative.

function classifyConstructs(
  s: AggregatedSignals['signalsByFile'],
  fp: AggregatedSignals['conceptFingerprints'],
  n: number,
): { knownConstructs: string[]; unknownConstructs: string[] } {
  // Base threshold scaled to repo size (research doc: 3+ files = known).
  const base = Math.max(1, Math.min(3, Math.floor(n * 0.3)));

  // Tier-aware thresholds: reliability scales with construct complexity.
  // Tier 1-2 constructs are easy to copy — require repeated evidence.
  // Tier 3 slightly lower bar. Tier 4-5: any appearance is significant
  // because nobody accidentally writes conditional types across a codebase.
  const t1 = base;
  const t2 = base;
  const t3 = Math.max(1, base - 1);
  const t4 = 1; // tier 5 shares this — any appearance counts for both

  // [construct name, is known]
  const checks: Array<[string, boolean]> = [
    // Tier 1 — proxy: any typed definition at all
    ['basicTypes',          s.typeDefinitions >= 1 || s.consumingGenerics >= 1],
    ['simpleInterfaces',    s.typeDefinitions >= t1],
    ['typedFunctions',      s.typeDefinitions >= 1 || s.consumingGenerics >= t1],

    // Tier 2
    // unionTypes: requires consistent nullable/multi-type usage, NOT just discriminated
    // unions — someone can use string|null everywhere without ever writing switch(x.kind).
    // optionalChaining and nullishCoalescing are the stronger evidence of union type
    // awareness since both require understanding that a value can be null|undefined.
    ['unionTypes',          s.optionalChaining >= t2 || s.nullishCoalescing >= t2],
    ['consumingGenerics',   s.consumingGenerics >= t2],
    ['optionalChaining',    s.optionalChaining >= t2],
    ['nullishCoalescing',   s.nullishCoalescing >= t2],
    ['destructuring',       s.destructuring >= t2],

    // Tier 3
    ['arrayMethods',        s.arrayMethods >= t3],
    ['asyncAwait',          s.asyncAwait >= t3],
    ['writingGenerics',     s.writingGenerics >= t3],
    ['typeGuards',          s.typeGuards >= t3],
    ['discriminatedUnions', s.discriminatedUnions >= t3],
    ['higherOrderFns',      s.higherOrderFns >= t3],
    ['utilityTypes',        false], // not yet tracked in aggregated signals

    // Tier 4 — any appearance counts
    ['conditionalTypes',    s.conditionalTypes >= t4],
    ['mappedTypes',         fp.mappedTypes],
    ['constrainedGenerics', s.constrainedGenerics >= t4],
    ['inferKeyword',        false], // not yet tracked
    ['templateLiteralTypes', false], // not yet tracked

    // Tier 5 — any appearance counts
    ['recursiveTypes',      false], // not yet tracked
    ['varianceAnnotations', false], // not yet tracked
  ];

  const knownConstructs: string[]   = [];
  const unknownConstructs: string[] = [];
  for (const [name, isKnown] of checks) {
    (isKnown ? knownConstructs : unknownConstructs).push(name);
  }
  return { knownConstructs, unknownConstructs };
}

// ── Concept fingerprint classification ────────────────────────────────────

function classifyFingerprints(
  fp: AggregatedSignals['conceptFingerprints'],
): { conceptsUnderstood: string[]; conceptsNotYet: string[] } {
  const checks: Array<[string, boolean]> = [
    ['typeNarrowing', fp.typeNarrowing],
    ['genericDesign', fp.genericDesign],
    ['asyncMastery',  fp.asyncMastery],
    ['typeSafety',    fp.typeSafety],
    ['mappedTypes',   fp.mappedTypes],
  ];
  const conceptsUnderstood: string[] = [];
  const conceptsNotYet: string[]     = [];
  for (const [name, understood] of checks) {
    (understood ? conceptsUnderstood : conceptsNotYet).push(name);
  }
  return { conceptsUnderstood, conceptsNotYet };
}
