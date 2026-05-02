import * as path from 'path';
import { scanFile } from '../scanner';

// fixture is in src/test/ — when compiled, this file lives in out/test/
const fixturePath = path.join(__dirname, '..', '..', 'src', 'test', 'fixture.ts');

const result = scanFile(fixturePath);

console.log('\n── Full scanner output ───────────────────────────────');
console.log(JSON.stringify(result, null, 2));

// ── Assertions ────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function assert(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) {
    console.log(`  ✓  ${label}`);
    passed++;
  } else {
    console.log(`  ✗  ${label}`);
    console.log(`       expected: ${JSON.stringify(expected)}`);
    console.log(`       actual:   ${JSON.stringify(actual)}`);
    failed++;
  }
}

console.log('\n── Idioms ────────────────────────────────────────────');
assert('arrayMethods',     result.idioms.arrayMethods,     2);
assert('optionalChaining', result.idioms.optionalChaining, 1);
assert('destructuring',    result.idioms.destructuring,    2);
assert('forLoopsOnArrays', result.idioms.forLoopsOnArrays, 1);

console.log('\n── Anti-patterns ─────────────────────────────────────');
assert('anyUsage',         result.antiPatterns.anyUsage,         2);
assert('anyAsReturnType',  result.antiPatterns.anyAsReturnType,  1);
assert('tsIgnore',         result.antiPatterns.tsIgnore,         1);
assert('unsafeAssertion',  result.antiPatterns.unsafeAssertion,  3); // val as string (1) + double-cast 123 as unknown as string (2)
assert('emptyCatch',       result.antiPatterns.emptyCatch,       1);

console.log('\n── Modern syntax ─────────────────────────────────────');
assert('varDeclarations',  result.modernSyntax.varDeclarations,  1);
assert('callbackNesting',  result.modernSyntax.callbackNesting,  1);

console.log('\n── Error handling ────────────────────────────────────');
assert('asyncFunctions',   result.errorHandling.asyncFunctions,  1);
assert('handledAsync',     result.errorHandling.handledAsync,    1);
assert('emptyCatch',       result.errorHandling.emptyCatch,      1);

console.log('\n── Tier constructs ───────────────────────────────────');
assert('tier1 contains basicTypes',        result.tierConstructs.tier1.includes('basicTypes'),        true);
assert('tier1 contains simpleInterfaces',  result.tierConstructs.tier1.includes('simpleInterfaces'),  true);
assert('tier1 contains typedFunctions',    result.tierConstructs.tier1.includes('typedFunctions'),    true);
assert('tier2 contains unionTypes',        result.tierConstructs.tier2.includes('unionTypes'),        true);
assert('tier2 contains consumingGenerics', result.tierConstructs.tier2.includes('consumingGenerics'), true);
assert('tier2 contains optionalChaining',  result.tierConstructs.tier2.includes('optionalChaining'),  true);
assert('tier2 contains nullishCoalescing', result.tierConstructs.tier2.includes('nullishCoalescing'), true);
assert('tier3 contains writingGenerics',   result.tierConstructs.tier3.includes('writingGenerics'),   true);
assert('tier3 contains typeGuards',        result.tierConstructs.tier3.includes('typeGuards'),        true);
assert('tier3 contains utilityTypes',      result.tierConstructs.tier3.includes('utilityTypes'),      true);
assert('tier3 contains discriminatedUnions', result.tierConstructs.tier3.includes('discriminatedUnions'), true);
assert('tier3 contains asyncAwait',        result.tierConstructs.tier3.includes('asyncAwait'),        true);
assert('tier4 contains conditionalTypes',  result.tierConstructs.tier4.includes('conditionalTypes'),  true);
assert('tier4 contains mappedTypes',       result.tierConstructs.tier4.includes('mappedTypes'),       true);
assert('tier4 contains inferKeyword',      result.tierConstructs.tier4.includes('inferKeyword'),      true);
assert('tier4 contains constrainedGenerics', result.tierConstructs.tier4.includes('constrainedGenerics'), true);
assert('tier4 contains templateLiteralTypes', result.tierConstructs.tier4.includes('templateLiteralTypes'), true);
assert('tier5 contains recursiveTypes',    result.tierConstructs.tier5.includes('recursiveTypes'),    true);

console.log(`\n── Result: ${passed} passed, ${failed} failed ──────────────────────`);
if (failed > 0) process.exit(1);
