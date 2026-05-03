// Per-file AST scanner output
export interface SignalCounts {
  filePath: string;
  scannedAt: string;
  author: string;
  totalLines: number;

  idioms: {
    arrayMethods: number;
    optionalChaining: number;
    nullishCoalescing: number;
    destructuring: number;
    forLoopsOnArrays: number;
  };

  complexity: {
    functions: number;
    totalComplexity: number;
  };

  abstraction: {
    generics: {
      consuming: number;
      writingBasic: number;
      constrained: number;
      conditional: number;
    };
    higherOrderFns: number;
    typeDefinitions: number;
  };

  errorHandling: {
    asyncFunctions: number;
    handledAsync: number;
    emptyCatch: number;
    floatingPromises: number;
  };

  modernSyntax: {
    asyncAwait: number;
    varDeclarations: number;
    callbackNesting: number;
  };

  antiPatterns: {
    anyUsage: number;
    anyAsReturnType: number;
    tsIgnore: number;
    eslintDisable: number;
    unsafeAssertion: number;
    emptyCatch: number;
  };

  // Which constructs were found, not just counts
  tierConstructs: {
    tier1: string[];
    tier2: string[];
    tier3: string[];
    tier4: string[];
    tier5: string[];
  };
}

// Repo-level aggregation after per-file capping
// Note: signalsByFile values are FILE counts, not occurrence counts
// e.g. arrayMethods: 18 means the pattern appeared in 18 files
export interface AggregatedSignals {
  lastUpdated: string;
  totalFilesScanned: number;
  totalLinesScanned: number;

  signalsByFile: {
    arrayMethods: number;
    optionalChaining: number;
    nullishCoalescing: number;
    destructuring: number;
    forLoopsOnArrays: number;
    consumingGenerics: number;
    writingGenerics: number;
    constrainedGenerics: number;
    conditionalTypes: number;
    higherOrderFns: number;
    typeDefinitions: number;
    asyncAwait: number;
    handledAsync: number;
    typeGuards: number;
    discriminatedUnions: number;
  };

  antiPatternsByFile: {
    anyUsage: number;
    anyAsReturnType: number;
    tsIgnore: number;
    eslintDisable: number;
    unsafeAssertion: number;
    emptyCatch: number;
    varDeclarations: number;
    callbackNesting: number;
    floatingPromises: number;
  };

  // Concept-level booleans set when a construct combination is detected
  conceptFingerprints: {
    typeNarrowing: boolean;
    genericDesign: boolean;
    asyncMastery: boolean;
    typeSafety: boolean;
    mappedTypes: boolean;
  };
}

// Scoring output — the numbers that go into profile.json
export interface Scores {
  idiomScore: number;
  complexityScore: number;
  abstractionScore: number;
  errorHandlingScore: number;
  modernSyntaxScore: number;
  breadthScore: number;
  antiPatternPenalty: number; // negative value, e.g. -0.08
  finalScore: number;         // 0–10
}

export type Tier = 1 | 2 | 3 | 4 | 5;

export type TierLabel = 'novice' | 'elementary' | 'intermediate' | 'advanced' | 'expert';

// profile.json — main output read by the CLAUDE.md writer and skill checker
export interface SkillProfile {
  version: number;
  lastUpdated: string;
  source: 'scan' | 'manual';

  scores: Scores;

  tier: Tier;
  tierLabel: TierLabel;

  knownConstructs: string[];
  unknownConstructs: string[];

  conceptsUnderstood: string[];
  conceptsNotYet: string[];

  mode: 'learn' | 'assist';

  settings: {
    scanOnSave: boolean;
    scanOnCommit: boolean;
    autoUpdateClaudeMd: boolean;
  };
}

// history.json — one entry per scan, powers the growth dashboard
export interface HistoryEntry {
  date: string;               // "YYYY-MM-DD"
  finalScore: number;
  tier: Tier;
  knownConstructCount: number;
  antiPatternCount: number;
  filesScanned: number;
}

export interface ScanHistory {
  entries: HistoryEntry[];
}
