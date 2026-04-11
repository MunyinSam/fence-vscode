# Changelog

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

- Expanded skill detection to 8 languages: JavaScript/TypeScript, React, Python, Go, Java, C#, Rust, Ruby, PHP
- Replaced string matching with regex patterns for accuracy
- Added confidence scoring (Exploring → Familiar → Comfortable → Proficient → Expert)
- Skills now grouped by language in generated CLAUDE.md
- Accumulated skill store with cross-project confidence merging

## [1.0.0]

- Initial release
- Detects JavaScript/TypeScript patterns
- Generates CLAUDE.md with known/learning skill split
