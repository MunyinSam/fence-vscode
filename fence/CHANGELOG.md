# Changelog

## [1.0.9]

- **Git blame attribution** — skill detection now only counts code you personally authored
  - File-level filter: only TS/JS files you have committed to are scanned in the AST pass
  - Line-level filter: regex pass only counts pattern matches on lines attributed to you via `git blame`
  - Falls back to scanning all code when git is unavailable or a file is untracked (new files count fully)
- **Incremental save scanning** — extension now re-scans on every file save, not just on `Fence:Init`
  - Only the saved file is processed (fast), then the full CLAUDE.md is regenerated
- **Edit count bonus** — each save event that contains a skill increments an `editCount` counter
  - Confidence gets a log-scaled bonus (up to +15) based on how many times you've actively edited code for that skill
- **Stressed skills** — skills with active TypeScript/lint errors in the editor are forced to "Still Learning"
  - Annotated with `*(active errors)*` in the generated CLAUDE.md
  - Covers: Generics, Interfaces & Types, Async/Await, React Hooks
- **Improved confidence scoring** — replaced single log-scale with a three-signal formula
  - `freqScore` (intensity per file) × 0.5 + `breadthScore` (% of files with hits) × 0.3 + `diversityScore` (% of patterns fired) × 0.2
  - AST pass uses freq + breadth only (no pattern diversity signal)
- Added `editCount` field to the `Skill` type and store; existing stored skills migrate to `editCount: 0`

## [1.0.6 - 1.0.8]

- Switched from `tsc` to `esbuild` for bundling — separate entry points for the VS Code extension and CLI
- Fixed dist output so both `dist/extension.js` and `dist/cli/index.js` are correctly bundled and included in the published package
- Updated `.vscodeignore` to exclude source files and include only the built dist
- Updated VS Code engine requirement to `^1.115.0`
- Fixed CI workflow for publishing

## [1.0.5]

- AST-based skill detection for TypeScript/JavaScript using the TypeScript compiler API
  - Replaces regex for .ts/.tsx/.js/.jsx files — no more false positives from comments or strings
  - Accurately detects async functions, arrow functions, destructuring, generics, JSX, React hooks, and more
- Skill decay — confidence decreases ~0.5% per day of inactivity
  - A skill unused for 90 days drops from 100% → 64%, potentially falling back to "Still Learning"
  - Running Fence:Init on any project resets the decay clock for detected skills
- Fixed EMFILE crash on large projects — node_modules and other generated directories are now skipped
- Added .gitignore (dist/, out/, node_modules/, *.vsix)

## [1.0.3 – 1.0.4]

- Fixed CLI argument bug (required argument with default rejected by commander)
- Added LICENSE (MIT)
- Added repository field to package.json

## [1.0.2]
156
- Expanded skill detection to 8 languages: JavaScript/TypeScript, React, Python, Go, Java, C#, Rust, Ruby, PHP
- Replaced string matching with regex patterns for accuracy
- Added confidence scoring (Exploring → Familiar → Comfortable → Proficient → Expert)
- Skills now grouped by language in generated CLAUDE.md
- Accumulated skill store with cross-project confidence merging

## [1.0.0]

- Initial release
- Detects JavaScript/TypeScript patterns
- Generates CLAUDE.md with known/learning skill split
