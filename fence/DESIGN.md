# Fence — Skill Model Design

This document records the decisions behind how fence detects, scores, and stores developer skills. Update it when the model changes so the rationale stays alongside the code.

---

## What We Are Measuring

Fence measures **familiarity** — evidence that the current developer has actively written and used a language construct in their own code. It does not attempt to measure deep understanding or the ability to explain a concept. The output is a calibration signal for Claude, not a performance review.

Familiarity is considered sufficient for the output goal (CLAUDE.md context). A skill the developer uses regularly is a skill Claude can freely use in responses. A skill they haven't written themselves is one Claude should explain rather than assume.

---

## Signal Hierarchy

Signals are ranked by how much we trust them. Higher-ranked signals override or dampen lower ones.

| Rank | Signal | Source | Trust |
|------|--------|--------|-------|
| 1 | Active TS/lint errors on a construct | VS Code diagnostics API | Highest — proves the skill is not yet owned |
| 2 | File saved by the current user | `onDidSaveTextDocument` | Very high — user wrote this code right now |
| 3 | Lines attributed to the user by `git blame` | Per-file blame (regex pass) | High — committed work is owned work |
| 4 | Files the user has committed to | `git log --author` | Medium — file-level attribution (AST pass) |
| 5 | Pattern frequency across the codebase | Static scan | Low alone — could be teammates' or generated code |

A scan without git produces only signal 5. Each layer above it adds precision.

---

## Confidence Formula

### Regex pass (Python, Go, Java, C#, Rust, Ruby, PHP)

Three components, each 0–100:

```
freqScore     = min(100, log2((totalCount × weight / fileCount) + 1) × 50)
breadthScore  = (filesWithSkill / totalRelevantFiles) × 100
diversityScore = (distinctPatternsFired / totalPatternsInRule) × 100

confidence = freqScore × 0.5 + breadthScore × 0.3 + diversityScore × 0.2
```

- **freqScore** — how intensely the skill appears per file. Log-scaled so the first few uses matter most and noise doesn't dominate.
- **breadthScore** — what fraction of relevant files contain the skill. Punishes one-file-deep usage; rewards project-wide fluency.
- **diversityScore** — how much of the feature is used. A skill whose patterns all fire is better understood than one whose single pattern fires 100 times.

### AST pass (TypeScript / JavaScript)

No pattern diversity (the AST tracks node types, not regexes), so only two components:

```
confidence = freqScore × 0.65 + breadthScore × 0.35
```

### Edit bonus (applied at load time, not scan time)

Each save event that includes a skill increments `editCount` in the store. When loading:

```
effectiveConfidence = min(100, decayedConfidence + editBonus)
editBonus           = min(15, round(log2(editCount + 1) × 7))
```

The bonus caps at +15 to prevent edit spam from overriding a genuinely low scan score. A skill seen in one file but saved 100 times is not the same as one genuinely spread across the project.

---

## Decay

Confidence decays at 0.5% per day of inactivity:

```
decayed = storedConfidence × (1 − 0.005)^days
```

Milestones:
- 30 days → ~86% of original
- 90 days → ~64% (may cross the Knows/Learning boundary)
- 180 days → ~41%

Decay is applied at load time so the stored value is always the raw scan score. This lets us re-derive the effective confidence at any point without losing history.

---

## Git Blame Strategy

### Regex pass — per-line attribution
For non-TS languages, `git blame -e` is run on each relevant file. Only lines attributed to the current user's email (`git config user.email`) are counted against pattern regexes. This filters out teammates' code line-by-line.

**Fallback:** if the file is untracked (not yet committed), all lines are treated as owned by the current user. A file the user just created is their work even before the first commit.

### AST pass — file-level attribution
Running per-line blame on TypeScript files would require mapping compiler AST node positions to blame lines, adding complexity for limited gain. Instead, the AST pass filters at the file level: only TS/JS files the user has ever committed to are scanned (`git log --author`).

**Fallback:** if git is unavailable or the user has no commits, all files are scanned (equivalent to the pre-blame behaviour).

### Save events — no blame needed
When `onDidSaveTextDocument` fires, the user just wrote the file. Blame is skipped entirely for single-file scans.

---

## Skill Levels

```
score ≥ 60 → Knows
score < 60 → Learning
```

The binary split is intentional for the current output (CLAUDE.md). Finer-grained levels (Exposure / Familiar / Proficient / Fluent) are a future option once we have real-world data to calibrate thresholds against.

Confidence labels within the `Knows` tier for display purposes:

| Score | Label |
|-------|-------|
| ≥ 90 | Expert |
| ≥ 75 | Proficient |
| ≥ 60 | Comfortable |
| ≥ 40 | Familiar |
| < 40 | Exploring |

---

## Diagnostic Stress Override

If the VS Code diagnostics API reports active TypeScript errors on constructs related to a skill, that skill is forced to `Learning` in the generated output regardless of its stored confidence score. The raw store value is not modified — the override is applied only at generation time.

Current mappings (error message keyword → skill name):

| Keyword in error | Skill forced to Learning |
|---|---|
| `type argument`, `type parameter`, `generic` | TypeScript Generics |
| `interface`, `property '`, `does not exist on type` | TypeScript Interfaces & Types |
| `promise`, `async`, `await` | Async / Await |
| `hook`, `usestate`, `useeffect` | React Hooks |

These are intentionally conservative. A false positive (forcing a skill to Learning when the error is unrelated) is less harmful than a false negative (keeping a skill as Knows when the developer is actively struggling with it).

---

## Known Limitations

- **Generated code** (Copilot, scaffolding tools) can inflate scores if committed under the user's email. No mitigation currently — treat high scores on boilerplate-heavy skills with appropriate scepticism.
- **Untracked files** in the regex pass are treated as fully authored. A vendored file copied into the repo and never committed will be counted.
- **Rebases and squash merges** can reassign authorship. A squash-merged branch may attribute teammates' lines to whoever did the merge.
- **Per-line blame for TS/JS** is not implemented. File-level attribution is used instead, which means TS files with mixed authorship are counted in full or not at all.
- **Multi-line regex patterns** are not supported in the blame-filtered pass. Each line is matched independently. All current rules are single-line by design.
