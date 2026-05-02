# Running Tests

## The one command

```bash
npm run compile && node out/test/runScanner.js
```

That's it. You'll see the full scanner output as JSON, then a pass/fail list at the bottom.

---

## What's happening

`npm run compile` — TypeScript compiles everything in `src/` into `out/`. This includes the test runner at `src/test/runScanner.ts` → `out/test/runScanner.js`.

`node out/test/runScanner.js` — runs the compiled test runner directly with Node. It:
1. Points the scanner at `src/test/fixture.ts`
2. Prints the full `SignalCounts` JSON
3. Checks specific expected values and prints ✓ or ✗ for each

---

## The files involved

| File | What it is |
|---|---|
| `src/test/fixture.ts` | The TypeScript file being scanned. Contains deliberate patterns at every tier level. |
| `src/test/runScanner.ts` | The test runner. Calls `scanFile()`, prints output, asserts counts. |
| `out/test/runScanner.js` | Compiled version of the runner — this is what Node actually executes. |

---

## Adding a new assertion

Open `src/test/runScanner.ts` and add a line anywhere in the assertions section:

```ts
assert('my label', result.someField, expectedValue);
```

Then recompile and run:

```bash
npm run compile && node out/test/runScanner.js
```

---

## Adding a new fixture pattern

Open `src/test/fixture.ts`, add your TypeScript pattern, then add a matching assertion in `runScanner.ts` to verify the scanner picks it up.

Example — testing that `.reduce()` is counted as an array method:

**In `fixture.ts`:**
```ts
const sum = nums.reduce((acc, n) => acc + n, 0); // arrayMethods +1
```

**In `runScanner.ts`:**
```ts
assert('arrayMethods includes reduce', result.idioms.arrayMethods, 3); // was 2
```

---

## If a test fails

The output shows you exactly what went wrong:

```
  ✗  unsafeAssertion
       expected: 1
       actual:   3
```

This means the scanner found 3 unsafe assertions but you expected 1. Either:
- Your fixture has more `as X` expressions than you thought (check for double-casts like `x as unknown as T` — those count twice)
- The scanner is detecting something it shouldn't

---

## Shortcut — add it to package.json scripts

Open `package.json` and add a `test` script:

```json
"scripts": {
  "compile": "tsc -p ./",
  "test": "npm run compile && node out/test/runScanner.js"
}
```

Then you can just run:

```bash
npm test
```
