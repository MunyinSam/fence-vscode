# scanner.ts — How It Works

`src/scanner.ts` takes a single TypeScript file path and returns a `SignalCounts` object — a structured snapshot of everything detectable about the code in that file.

---

## The Big Picture

```
your .ts file
      │
      ▼
  ts-morph parses it into an AST (Abstract Syntax Tree)
      │
      ▼
  7 counter functions walk the tree
      │
      ▼
  SignalCounts object returned
```

The AST is a tree of nodes. Every piece of your code — every function, type annotation, operator, keyword — is a node with a `SyntaxKind` that identifies what it is. The scanner uses `getDescendantsOfKind(SyntaxKind.X)` to pull all nodes of a specific kind at once, then counts or inspects them.

---

## Entry Point: `scanFile(filePath)`

```ts
export function scanFile(filePath: string): SignalCounts
```

1. Creates a ts-morph `Project` (a lightweight TypeScript compiler instance)
2. Tries to load the file with `project.addSourceFileAtPath(filePath)`
3. If the file doesn't exist or can't be read, returns `emptySignalCounts` (all zeros) instead of crashing
4. Calls all 7 counter functions and assembles the result

**Fields set directly here (not by a counter):**

| Field | Value |
|---|---|
| `filePath` | the path passed in |
| `scannedAt` | current timestamp as ISO string |
| `author` | `""` — filled later by the git blame layer |
| `totalLines` | `sf.getEndLineNumber()` — last line number in the file |

---

## Shared Helpers

### `getFunctionLike(sf)`

Every counter that needs to inspect functions calls this. It collects all four kinds of function nodes in one array:

- `FunctionDeclaration` — `function foo() {}`
- `FunctionExpression` — `const foo = function() {}`
- `ArrowFunction` — `const foo = () => {}`
- `MethodDeclaration` — `class Foo { bar() {} }`

All four share the same useful methods in ts-morph: `isAsync()`, `getTypeParameters()`, `getParameters()`, `getReturnTypeNode()`.

### `extractComments(sf)`

ts-morph treats comments as invisible "trivia" — they attach to adjacent nodes but can't be queried with `getDescendantsOfKind`. So this helper reads the raw source text and extracts all comments with two regexes:

- `//[^\n]*` — single-line comments
- `/\*[\s\S]*?\*/` — multi-line comments

Returns them as an array of strings so anti-pattern detection can search for `@ts-ignore`, `eslint-disable`, etc.

---

## The 7 Counter Functions

### 1. `countIdioms(sf)` → `idioms`

Measures how idiomatically the developer writes JavaScript/TypeScript.

| Field | How it's counted |
|---|---|
| `arrayMethods` | Every `CallExpression` whose callee is a `PropertyAccessExpression` with a name in the set `{map, filter, reduce, forEach, find, findIndex, some, every, flat, flatMap}`. Counts occurrences — `arr.map(...).filter(...)` is 2. |
| `optionalChaining` | Counts `QuestionDotToken` nodes. The `?.` operator is a punctuation token in the AST — one token per usage. `a?.b?.c` is 2. |
| `nullishCoalescing` | `BinaryExpression` nodes whose operator token is `QuestionQuestionToken` (`??`). |
| `destructuring` | `ObjectBindingPattern` nodes (`const { a, b } = obj`) plus `ArrayBindingPattern` nodes (`const [x, y] = arr`). Parameter destructuring is included. |
| `forLoopsOnArrays` | `ForStatement` nodes — traditional `for (let i = 0; ...)` loops. Counted as a negative-ish signal: high count relative to `arrayMethods` suggests the developer isn't using idiomatic iteration. |

---

### 2. `countComplexity(sf)` → `complexity`

Measures code complexity using cyclomatic complexity — the number of independent paths through a function.

| Field | How it's counted |
|---|---|
| `functions` | Total length of the `getFunctionLike` array — all four function kinds combined. |
| `totalComplexity` | Sum of cyclomatic complexity across all functions. Per function: start at 1, add 1 for each `if`, `while`, `for`, `for-of`, `for-in`, `case` clause (in a switch), ternary (`?:`), `&&`, and `\|\|`. A function with no branches scores 1. |

**Why `&&` and `||` add complexity:** each one is a decision point. `a && b()` only calls `b` if `a` is truthy — that's a branch.

---

### 3. `countAbstraction(sf)` → `abstraction`

Measures sophistication of TypeScript type usage, especially generics.

**Generics are split into 4 levels** because they're not all the same skill:

| Field | What it detects | Example |
|---|---|---|
| `consuming` | `TypeReference` nodes with type arguments — using an existing generic | `Array<string>`, `Promise<void>`, `Map<K, V>` |
| `writingBasic` | Function nodes that declare their own `TypeParameter` where none have a constraint | `function identity<T>(x: T): T` |
| `constrained` | `TypeParameter` nodes that have a `getConstraint()` value | `<T extends string>`, `<T extends keyof U>` |
| `conditional` | `ConditionalType` nodes | `T extends U ? X : Y` |

These are separate dimensions. A function like `function wrap<T>(x: Array<T>): Promise<T>` contributes 1 to `writingBasic` (it writes `<T>`) and 2 to `consuming` (`Array<T>` and `Promise<T>` are TypeReferences with type args).

| Field | How it's counted |
|---|---|
| `higherOrderFns` | Functions where at least one parameter has a `FunctionType` annotation (`(x: string) => void`). Only explicitly typed callbacks count — untyped callbacks are invisible to the AST. |
| `typeDefinitions` | `InterfaceDeclaration` + `TypeAliasDeclaration` nodes. Measures how much the developer defines reusable types vs. just annotating inline. |

---

### 4. `countErrorHandling(sf)` → `errorHandling`

Measures whether async code is actually handled safely.

| Field | How it's counted |
|---|---|
| `asyncFunctions` | Function-like nodes where `fn.isAsync()` is true. |
| `handledAsync` | Of those async functions, how many contain at least one `TryStatement` node anywhere in their body. |
| `emptyCatch` | `CatchClause` nodes whose block has zero statements — `catch (e) {}`. |
| `floatingPromises` | `ExpressionStatement` nodes wrapping a `CallExpression` where `expr.getType().getText()` starts with `"Promise<"`. Uses ts-morph's type resolver — it runs the TypeScript type checker on the file even without a full project setup. Wrapped in `try/catch` because type resolution can fail for external types. |

**`handledAsync` is not the same as `asyncFunctions`**. A function can be `async` and never handle its own errors — the caller is expected to. This gap is what `asyncFunctions - handledAsync` reveals.

---

### 5. `countModernSyntax(sf)` → `modernSyntax`

Measures use of modern JavaScript syntax vs. older patterns.

| Field | How it's counted |
|---|---|
| `asyncAwait` | `AwaitExpression` nodes. Each `await` keyword in the file is one node. |
| `varDeclarations` | `VariableDeclarationList` nodes where the TypeScript compiler flags have neither `NodeFlags.Let` nor `NodeFlags.Const` set. When both flags are absent, the declaration used `var`. Accessed via `vdl.compilerNode.flags` — ts-morph doesn't expose this directly, so we reach into the underlying TypeScript compiler node. |
| `callbackNesting` | Counts callback arguments that themselves contain another callback argument. Specifically: for each `CallExpression`, if an argument is a function/arrow, check if *that* function/arrow contains any `CallExpression` that also has a function/arrow argument. This is the callback hell pattern — `doA(function() { doB(function() { ... }) })`. |

---

### 6. `countAntiPatterns(sf)` → `antiPatterns`

Negative signals — patterns that indicate the developer is working around the type system rather than with it.

| Field | How it's counted |
|---|---|
| `anyUsage` | `AnyKeyword` nodes anywhere in the file — parameters, variables, return types, casts. Every `any` is counted. |
| `anyAsReturnType` | Function-like nodes where `fn.getReturnTypeNode()?.getKind() === SyntaxKind.AnyKeyword`. Worse than `any` on a variable because it propagates unsafety to every caller. |
| `tsIgnore` | Comments containing `@ts-ignore` or `@ts-nocheck`. Signals the developer suppressed a type error rather than fixing it. |
| `eslintDisable` | Comments containing `eslint-disable`. Same pattern — suppression rather than understanding. |
| `unsafeAssertion` | `AsExpression` nodes (`expr as T`) where the type text is not `"const"`. `as const` is safe and idiomatic; everything else forces the type system to accept a claim you haven't proven. |
| `emptyCatch` | Same as `errorHandling.emptyCatch` — `CatchClause` nodes with an empty block. Errors are swallowed silently. |

---

### 7. `detectTierConstructs(sf)` → `tierConstructs`

Instead of counts, this records *which* named constructs were found — as string arrays per tier. Used to build `knownConstructs` in the skill profile.

Each construct is a presence check (found or not found), not a count. A construct is added to its tier array at most once per file.

**Tier 1 — Novice constructs**

| Construct | Detection |
|---|---|
| `basicTypes` | Any of `StringKeyword`, `NumberKeyword`, `BooleanKeyword`, `VoidKeyword` present |
| `simpleInterfaces` | Any `InterfaceDeclaration` present |
| `typedFunctions` | Any function whose parameters have at least one type annotation |

**Tier 2 — Elementary constructs**

| Construct | Detection |
|---|---|
| `unionTypes` | Any `UnionType` node (`string \| number`) |
| `consumingGenerics` | Any `TypeReference` with type arguments (`Array<string>`) |
| `optionalChaining` | Any `QuestionDotToken` |
| `nullishCoalescing` | Any `BinaryExpression` with `??` operator |

**Tier 3 — Intermediate constructs**

| Construct | Detection |
|---|---|
| `writingGenerics` | Any function-like with type parameters |
| `typeGuards` | Any `TypePredicate` node (`x is SomeType` return type) |
| `utilityTypes` | Any `TypeReference` whose name is in `{Partial, Required, Pick, Omit, Record, ReturnType, Parameters, NonNullable, Readonly, Extract, Exclude, InstanceType, Awaited}` |
| `discriminatedUnions` | Any `SwitchStatement` whose expression is a `PropertyAccessExpression` — the `switch(x.kind)` pattern |
| `asyncAwait` | Any `AwaitExpression` |

**Tier 4 — Advanced constructs**

| Construct | Detection |
|---|---|
| `conditionalTypes` | Any `ConditionalType` node (`T extends U ? X : Y`) |
| `mappedTypes` | Any `MappedType` node (`{ [K in keyof T]: ... }`) |
| `inferKeyword` | Any `InferType` node (`infer U` inside a conditional type) |
| `constrainedGenerics` | Any `TypeParameter` with a constraint (`T extends string`) |
| `templateLiteralTypes` | Any `TemplateLiteralType` node (`` `on${string}` `` as a type) |

**Tier 5 — Expert constructs**

| Construct | Detection |
|---|---|
| `recursiveTypes` | Any `TypeAliasDeclaration` whose body text contains its own name — e.g. `type JSON = ... \| JSON[]` |
| `varianceAnnotations` | Any `TypeParameter` with modifiers (`in`/`out` from TypeScript 4.7+) |

---

## What the Scanner Does NOT Do

- **No git blame** — `author` is left empty. A separate layer reads `git blame` and fills it in.
- **No file-level capping** — the scanner returns raw occurrence counts. The aggregator (Layer 2) is responsible for converting "30 array method uses in one file" into "1 file uses array methods."
- **No scoring** — raw signals only. The scorer reads the aggregated output and produces a `Scores` object.
- **No concept fingerprinting** — whether constructs appear *together* (Layer 4) is checked at the repo level by the aggregator, not per file.

---

## Error Handling

If `project.addSourceFileAtPath` throws (file not found, permission error), the scanner returns `emptySignalCounts` — a valid `SignalCounts` object with all numeric fields set to zero and all tier arrays empty. The rest of the pipeline treats this file as a blank slate rather than crashing.

Syntax errors in the file being scanned do **not** cause a throw. ts-morph parses what it can and tolerates malformed TypeScript — the AST is partial but usable.
