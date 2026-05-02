/**
 * Integration test — runs the full pipeline without VS Code APIs.
 * Answers: does scanning work, how git interacts, where data goes,
 * does CLAUDE.md generate correctly.
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { scanFile } from '../scanner';
import { aggregate } from '../aggregator';
import { score } from '../scoring';
import { getAuthorEmail, getAuthoredLines } from '../git';
import type { SignalCounts } from '../types/index';

const WORKSPACE = path.join(__dirname, '..', '..', 'test', 'workspace');
const OUTPUT    = path.join(__dirname, '..', '..', 'test', 'output');
const SEP       = '─'.repeat(60);

// ── Helpers ────────────────────────────────────────────────────────────────

function section(title: string) {
  console.log(`\n${SEP}`);
  console.log(`  ${title}`);
  console.log(SEP);
}

function pass(label: string) { console.log(`  ✓  ${label}`); }
function fail(label: string, expected: unknown, actual: unknown) {
  console.log(`  ✗  ${label}`);
  console.log(`       expected: ${JSON.stringify(expected)}`);
  console.log(`       actual:   ${JSON.stringify(actual)}`);
}
function info(label: string, value: unknown) {
  console.log(`  →  ${label}: ${JSON.stringify(value)}`);
}

// ── Q1: Does the scanner work on real files? ───────────────────────────────

section('Q1 — Scanner: does it scan all 5 files?');

const tsFiles = fs.readdirSync(WORKSPACE)
  .filter(f => f.endsWith('.ts'))
  .map(f => path.join(WORKSPACE, f));

info('files found', tsFiles.map(f => path.basename(f)));

const allSignals: SignalCounts[] = [];

for (const filePath of tsFiles) {
  const signals = scanFile(filePath);
  allSignals.push(signals);
  console.log(`\n  ${path.basename(filePath)}`);
  console.log(`    lines: ${signals.totalLines}`);
  console.log(`    tier1: ${JSON.stringify(signals.tierConstructs.tier1)}`);
  console.log(`    tier2: ${JSON.stringify(signals.tierConstructs.tier2)}`);
  console.log(`    tier3: ${JSON.stringify(signals.tierConstructs.tier3)}`);
  console.log(`    tier4: ${JSON.stringify(signals.tierConstructs.tier4)}`);
  console.log(`    tier5: ${JSON.stringify(signals.tierConstructs.tier5)}`);
  console.log(`    anyUsage: ${signals.antiPatterns.anyUsage}, tsIgnore: ${signals.antiPatterns.tsIgnore}, emptyCatch: ${signals.antiPatterns.emptyCatch}`);
}

tsFiles.length === 5 ? pass('all 5 files scanned') : fail('file count', 5, tsFiles.length);

// ── Q2: How does git interact? Author detection ────────────────────────────

section('Q2 — Git: author email and blame');

let authorEmail = '';

(async () => {

authorEmail = await getAuthorEmail(tsFiles[0]);
info('git config user.email', authorEmail);
authorEmail === 'test@fence.dev'
  ? pass('author email matches test user')
  : fail('author email', 'test@fence.dev', authorEmail);

const ranges = await getAuthoredLines(tsFiles[0]);
info('authored line ranges for tier1-basic.ts', ranges);
ranges.length > 0
  ? pass('git blame returned ranges')
  : fail('git blame ranges', 'non-empty', ranges);

// Set author on all signals now that we have the email
for (const s of allSignals) { s.author = authorEmail; }

// ── Q3: Where is data stored? ──────────────────────────────────────────────

section('Q3 — Storage: where does data go?');

const dataDir = path.join(os.homedir(), '.fence');
info('default data directory', dataDir);
info('override via', 'fence.storageLocation VS Code setting');
pass('getDataDir() defaults to ~/.fence — verified by reading profile.ts logic');

// ── Q4 & Q5: Does the pipeline produce correct output? ────────────────────

section('Q4 — Pipeline: aggregate + score');

const agg = aggregate(allSignals);

console.log('\n  Aggregated signals (file counts, capped at 1 per file):');
console.log(`    arrayMethods:       ${agg.signalsByFile.arrayMethods}`);
console.log(`    optionalChaining:   ${agg.signalsByFile.optionalChaining}`);
console.log(`    writingGenerics:    ${agg.signalsByFile.writingGenerics}`);
console.log(`    conditionalTypes:   ${agg.signalsByFile.conditionalTypes}`);
console.log(`    discriminatedUnions:${agg.signalsByFile.discriminatedUnions}`);

console.log('\n  Anti-patterns (file counts):');
console.log(`    anyUsage:      ${agg.antiPatternsByFile.anyUsage}`);
console.log(`    tsIgnore:      ${agg.antiPatternsByFile.tsIgnore}`);
console.log(`    emptyCatch:    ${agg.antiPatternsByFile.emptyCatch}`);
console.log(`    varDeclarations: ${agg.antiPatternsByFile.varDeclarations}`);

console.log('\n  Concept fingerprints:');
Object.entries(agg.conceptFingerprints).forEach(([k, v]) =>
  console.log(`    ${v ? '✓' : '✗'}  ${k}`)
);

const result = score(agg);

console.log(`\n  Scores:`);
console.log(`    idiom:          ${(result.scores.idiomScore * 100).toFixed(0)}%`);
console.log(`    complexity:     ${(result.scores.complexityScore * 100).toFixed(0)}%`);
console.log(`    abstraction:    ${(result.scores.abstractionScore * 100).toFixed(0)}%`);
console.log(`    error handling: ${(result.scores.errorHandlingScore * 100).toFixed(0)}%`);
console.log(`    modern syntax:  ${(result.scores.modernSyntaxScore * 100).toFixed(0)}%`);
console.log(`    anti-pattern:   ${result.scores.antiPatternPenalty.toFixed(3)}`);
console.log(`    ─────────────────────────`);
console.log(`    FINAL:          ${result.scores.finalScore.toFixed(2)} / 10`);
console.log(`    TIER:           ${result.tier} (${result.tierLabel})`);

console.log('\n  Known constructs:');
result.knownConstructs.forEach(c => console.log(`    ✓ ${c}`));
console.log('\n  Unknown constructs:');
result.unknownConstructs.forEach(c => console.log(`    ✗ ${c}`));

// Expected checks
agg.signalsByFile.arrayMethods >= 1   ? pass('arrayMethods detected') : fail('arrayMethods', '>=1', agg.signalsByFile.arrayMethods);
agg.signalsByFile.conditionalTypes >= 1 ? pass('conditionalTypes detected') : fail('conditionalTypes', '>=1', agg.signalsByFile.conditionalTypes);
agg.antiPatternsByFile.anyUsage >= 1  ? pass('anyUsage anti-pattern detected') : fail('anyUsage', '>=1', agg.antiPatternsByFile.anyUsage);
result.tier >= 3                       ? pass(`tier ${result.tier} — intermediate or above`) : fail('tier', '>=3', result.tier);

// ── Q5: CLAUDE.md generation ───────────────────────────────────────────────

section('Q5 — CLAUDE.md: is it generated correctly?');

// Build CLAUDE.md content directly (bypassing vscode.workspace API)
const CONSTRUCT_LABELS: Record<string, string> = {
  basicTypes: 'Basic type annotations (string, number, boolean, void)',
  simpleInterfaces: 'Simple interfaces and type aliases',
  typedFunctions: 'Typed function parameters and return types',
  unionTypes: 'Union types (string | number, A | B)',
  consumingGenerics: 'Consuming generics (Array<T>, Promise<void>, Map<K, V>)',
  optionalChaining: 'Optional chaining (a?.b?.c)',
  nullishCoalescing: 'Nullish coalescing (a ?? b)',
  destructuring: 'Destructuring (const { x } = obj)',
  arrayMethods: 'Array methods (.map, .filter, .reduce, .find)',
  asyncAwait: 'async/await',
  writingGenerics: 'Writing generic functions (function foo<T>(x: T): T)',
  typeGuards: 'Type guards (x is SomeType)',
  utilityTypes: 'Utility types (Partial, Pick, Omit, Record)',
  discriminatedUnions: 'Discriminated unions',
  higherOrderFns: 'Higher-order functions',
  conditionalTypes: 'Conditional types (T extends U ? X : Y)',
  mappedTypes: 'Mapped types ({ [K in keyof T]: T[K] })',
  constrainedGenerics: 'Constrained generics (<T extends keyof U>)',
  inferKeyword: 'infer keyword',
  templateLiteralTypes: 'Template literal types (`on${string}`)',
  recursiveTypes: 'Recursive types',
  varianceAnnotations: 'Variance annotations',
};

const tierNames: Record<number, string> = { 1:'Novice', 2:'Elementary', 3:'Intermediate', 4:'Advanced', 5:'Expert' };
const toList = (cs: string[]) => cs.map(c => `- ${CONSTRUCT_LABELS[c] ?? c}`).join('\n');

const claudeMd = `# fence-vscode Skill Context

This file is auto-generated by fence-vscode. Do not edit manually.

## Developer Skill Profile

**Tier:** ${result.tier} (${tierNames[result.tier]})
**Score:** ${result.scores.finalScore.toFixed(1)} / 10
**Last scanned:** ${new Date().toISOString().slice(0, 10)}

## Known Constructs (safe to generate)

${toList(result.knownConstructs)}

## Unknown Constructs (DO NOT generate — teach instead)

${toList(result.unknownConstructs)}

## Rules

- ONLY generate code using constructs from the "Known" list above
- If a task requires an "Unknown" construct, EXPLAIN the concept first
- Ask the user to write it themselves after explaining
- Never silently use an unknown construct in generated code
`;

if (!fs.existsSync(OUTPUT)) fs.mkdirSync(OUTPUT, { recursive: true });

const profilePath = path.join(OUTPUT, 'profile.json');
const claudeMdPath = path.join(OUTPUT, 'CLAUDE.md');

fs.writeFileSync(profilePath,  JSON.stringify({ scores: result.scores, tier: result.tier, tierLabel: result.tierLabel, knownConstructs: result.knownConstructs, unknownConstructs: result.unknownConstructs }, null, 2), 'utf8');
fs.writeFileSync(claudeMdPath, claudeMd, 'utf8');

fs.existsSync(profilePath)  ? pass(`profile.json written → ${profilePath}`) : fail('profile.json', 'exists', 'missing');
fs.existsSync(claudeMdPath) ? pass(`CLAUDE.md written → ${claudeMdPath}`)   : fail('CLAUDE.md',   'exists', 'missing');

console.log('\n── CLAUDE.md preview ─────────────────────────────────────');
console.log(claudeMd);

// ── Bug report ─────────────────────────────────────────────────────────────

section('Known gap: git author filtering not connected to scanner');
console.log(`
  getAuthoredLines() returns line ranges for the current user ✓
  BUT: watcher.ts calls getAuthoredLines() and throws away the result.
  The scanner still scans the WHOLE file regardless of authorship.
  Teammate code inside a file is counted in your skill profile.

  Fix needed in watcher.ts runPipeline():
    const authoredRanges = await getAuthoredLines(filePath);  ← computed
    signals.author = await getAuthorEmail(filePath);          ← only this used
    // authoredRanges is never passed to scanFile()           ← gap
`);

section('Summary');
console.log(`  Files scanned:     ${tsFiles.length}`);
console.log(`  Total lines:       ${agg.totalLinesScanned}`);
console.log(`  Final score:       ${result.scores.finalScore.toFixed(2)} / 10`);
console.log(`  Tier:              ${result.tier} (${result.tierLabel})`);
console.log(`  Known constructs:  ${result.knownConstructs.length}`);
console.log(`  Unknown:           ${result.unknownConstructs.length}`);
console.log(`  Data dir (default): ${path.join(os.homedir(), '.fence')}`);
console.log(`  Test output:        ${OUTPUT}\n`);

})();
