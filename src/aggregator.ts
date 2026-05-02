import type { SignalCounts, AggregatedSignals } from './types/index';

export function aggregate(files: SignalCounts[]): AggregatedSignals {
  if (files.length === 0) return emptyAggregatedSignals();

  // Running totals for signals and anti-patterns (capped at 1 per file each)
  const signals = zeroSignals();
  const antiPatterns = zeroAntiPatterns();

  // Raw sums (not capped) — needed for concept fingerprint checks
  let totalAsyncFunctions = 0;
  let totalHandledAsync = 0;
  let totalFloatingPromises = 0;
  let totalAnyUsage = 0;
  let totalTsIgnore = 0;
  let totalUnsafeAssertion = 0;
  let hasMappedTypes = false;

  for (const file of files) {
    // ── signalsByFile: each signal contributes at most 1 per file ──────────
    // The unit changes from "occurrences" to "files where this construct appears"
    if (file.idioms.arrayMethods > 0)              signals.arrayMethods++;
    if (file.idioms.optionalChaining > 0)           signals.optionalChaining++;
    if (file.idioms.nullishCoalescing > 0)          signals.nullishCoalescing++;
    if (file.idioms.destructuring > 0)              signals.destructuring++;
    if (file.idioms.forLoopsOnArrays > 0)           signals.forLoopsOnArrays++;
    if (file.abstraction.generics.consuming > 0)    signals.consumingGenerics++;
    if (file.abstraction.generics.writingBasic > 0) signals.writingGenerics++;
    if (file.abstraction.generics.constrained > 0)  signals.constrainedGenerics++;
    if (file.abstraction.generics.conditional > 0)  signals.conditionalTypes++;
    if (file.abstraction.higherOrderFns > 0)        signals.higherOrderFns++;
    if (file.abstraction.typeDefinitions > 0)       signals.typeDefinitions++;
    if (file.modernSyntax.asyncAwait > 0)           signals.asyncAwait++;
    if (file.errorHandling.handledAsync > 0)        signals.handledAsync++;
    if (file.tierConstructs.tier3.includes('typeGuards'))          signals.typeGuards++;
    if (file.tierConstructs.tier3.includes('discriminatedUnions')) signals.discriminatedUnions++;

    // ── antiPatternsByFile: same capping logic ───────────────────────────
    if (file.antiPatterns.anyUsage > 0)        antiPatterns.anyUsage++;
    if (file.antiPatterns.anyAsReturnType > 0) antiPatterns.anyAsReturnType++;
    if (file.antiPatterns.tsIgnore > 0)        antiPatterns.tsIgnore++;
    if (file.antiPatterns.eslintDisable > 0)   antiPatterns.eslintDisable++;
    if (file.antiPatterns.unsafeAssertion > 0) antiPatterns.unsafeAssertion++;
    if (file.antiPatterns.emptyCatch > 0)      antiPatterns.emptyCatch++;
    if (file.modernSyntax.varDeclarations > 0) antiPatterns.varDeclarations++;
    if (file.modernSyntax.callbackNesting > 0) antiPatterns.callbackNesting++;
    if (file.errorHandling.floatingPromises > 0) antiPatterns.floatingPromises++;

    // ── Raw totals for fingerprint checks ────────────────────────────────
    totalAsyncFunctions  += file.errorHandling.asyncFunctions;
    totalHandledAsync    += file.errorHandling.handledAsync;
    totalFloatingPromises += file.errorHandling.floatingPromises;
    totalAnyUsage        += file.antiPatterns.anyUsage;
    totalTsIgnore        += file.antiPatterns.tsIgnore;
    totalUnsafeAssertion += file.antiPatterns.unsafeAssertion;
    if (file.tierConstructs.tier4.includes('mappedTypes')) hasMappedTypes = true;
  }

  return {
    lastUpdated: new Date().toISOString(),
    totalFilesScanned: files.length,
    totalLinesScanned: files.reduce((sum, f) => sum + f.totalLines, 0),
    signalsByFile: signals,
    antiPatternsByFile: antiPatterns,
    conceptFingerprints: detectFingerprints({
      signals,
      totalAsyncFunctions,
      totalHandledAsync,
      totalFloatingPromises,
      totalAnyUsage,
      totalTsIgnore,
      totalUnsafeAssertion,
      hasMappedTypes,
    }),
  };
}

// ── Concept fingerprints ───────────────────────────────────────────────────
//
// These are concept-level signals, not construct-level. Each fingerprint
// requires a specific combination of constructs — hard to arrive at by accident.
// Defined in (C) Skill Detection Research Layer 4.

interface FingerprintInputs {
  signals: ReturnType<typeof zeroSignals>;
  totalAsyncFunctions: number;
  totalHandledAsync: number;
  totalFloatingPromises: number;
  totalAnyUsage: number;
  totalTsIgnore: number;
  totalUnsafeAssertion: number;
  hasMappedTypes: boolean;
}

function detectFingerprints(i: FingerprintInputs): AggregatedSignals['conceptFingerprints'] {
  return {
    // Discriminated unions in 2+ files: strong signal the developer understands
    // exhaustive type narrowing, not just the syntax
    typeNarrowing: i.signals.discriminatedUnions >= 2,

    // Constrained generics + conditional types together — the combination
    // that defines "thinking in terms of type relationships"
    genericDesign: i.signals.constrainedGenerics >= 1 && i.signals.conditionalTypes >= 1,

    // Every async function is handled AND zero floating promises across the whole repo
    asyncMastery:
      i.totalAsyncFunctions > 0 &&
      i.totalHandledAsync === i.totalAsyncFunctions &&
      i.totalFloatingPromises === 0,

    // Zero any, zero @ts-ignore, zero unsafe assertions anywhere in the repo
    typeSafety:
      i.totalAnyUsage === 0 &&
      i.totalTsIgnore === 0 &&
      i.totalUnsafeAssertion === 0,

    // MappedType nodes already imply keyof + in together — detecting one
    // is sufficient, no need to cross-reference separately
    mappedTypes: i.hasMappedTypes,
  };
}

// ── Zero-value factories ───────────────────────────────────────────────────

function zeroSignals(): AggregatedSignals['signalsByFile'] {
  return {
    arrayMethods: 0,
    optionalChaining: 0,
    nullishCoalescing: 0,
    destructuring: 0,
    forLoopsOnArrays: 0,
    consumingGenerics: 0,
    writingGenerics: 0,
    constrainedGenerics: 0,
    conditionalTypes: 0,
    higherOrderFns: 0,
    typeDefinitions: 0,
    asyncAwait: 0,
    handledAsync: 0,
    typeGuards: 0,
    discriminatedUnions: 0,
  };
}

function zeroAntiPatterns(): AggregatedSignals['antiPatternsByFile'] {
  return {
    anyUsage: 0,
    anyAsReturnType: 0,
    tsIgnore: 0,
    eslintDisable: 0,
    unsafeAssertion: 0,
    emptyCatch: 0,
    varDeclarations: 0,
    callbackNesting: 0,
    floatingPromises: 0,
  };
}

function emptyAggregatedSignals(): AggregatedSignals {
  return {
    lastUpdated: new Date().toISOString(),
    totalFilesScanned: 0,
    totalLinesScanned: 0,
    signalsByFile: zeroSignals(),
    antiPatternsByFile: zeroAntiPatterns(),
    conceptFingerprints: {
      typeNarrowing: false,
      genericDesign: false,
      asyncMastery: false,
      typeSafety: false,
      mappedTypes: false,
    },
  };
}
