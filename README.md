# Fence

**Keep AI in learning mode.** Fence analyzes your TypeScript code, builds a skill profile from what you actually write, and generates a `CLAUDE.md` that tells Claude to teach — not just produce — the constructs you haven't mastered yet.

## How it works

1. Run **Fence: Scan Workspace** in any TypeScript project
2. Fence parses every `.ts`/`.tsx` file using a full AST scanner
3. It scores your code across 7 dimensions and assigns you a tier (Novice → Expert)
4. A `CLAUDE.md` is written listing your known and unknown constructs
5. Claude reads that file and adjusts — freely using what you know, guiding you through what you don't
6. On every subsequent file save, Fence re-scans and keeps the profile current

## Skill tiers

| Tier | Label | What it signals |
|------|-------|-----------------|
| 1 | Novice | Basic types, simple interfaces, typed functions |
| 2 | Elementary | Union types, optional chaining, nullish coalescing, destructuring |
| 3 | Intermediate | Writing generics, type guards, async/await, higher-order functions |
| 4 | Advanced | Conditional types, mapped types, constrained generics, template literal types |
| 5 | Expert | Recursive types, variance annotations |

## Scoring

Fence measures presence across 7 dimensions (capped at 1 per file to reward breadth, not repetition):

- **Idioms** (20%) — patterns that show you write idiomatic TypeScript
- **Complexity** (15%) — use of advanced constructs
- **Abstraction** (20%) — generic design
- **Error handling** (15%) — how consistently you handle failure paths
- **Modern syntax** (10%) — adoption of newer language features
- **Construct breadth** (20%) — your breadth of TS knowledge
- **Anti-pattern penalty** — `any`, `@ts-ignore`, unsafe assertions subtract from your score
- **Concept fingerprints** — bonus detection for combinations like *Type Narrowing*, *Async Mastery*, *Type Safety*, and *Generic Design*

The final score (1–10) maps to a tier and drives what Claude will and won't generate for you.

## Commands

Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`) and run:

| Command | What it does |
|---------|-------------|
| `Fence: Scan Workspace` | Scan all `.ts`/`.tsx` files and build your profile |
| `Fence: Show Profile` | Print your current profile and scores to the Output panel |
| `Fence: Set Mode` | Switch between **learn** mode (Claude teaches unknown constructs) and **assist** mode (Claude only uses known constructs) |
| `Fence: Reset Profile` | Delete all profile data and start fresh |
| `Fence: Show Dashboard` | Show your current skills breakdown and overtime growth graph |

## Storage

Profile data is saved to three files — `profile.json`, `signals.json`, and `history.json` — in one of three locations, configurable via VS Code settings:

| Setting | Location |
|---------|----------|
| `home` (default) | `~/.fence/` |
| `workspace` | `.fence/` in your project root (auto-added to `.gitignore`) |
| `custom` | Any absolute path you specify |

Configure under `fence.storageLocation` and `fence.customStoragePath`.

## Live updates

Fence watches for file saves. When you save a `.ts` or `.tsx` file, it debounces for 5 seconds, re-scans that file, re-aggregates the session cache, and rewrites `CLAUDE.md` — no manual re-scan needed.

## Requirements

- VS Code 1.115.0 or higher
- A project containing `.ts` or `.tsx` files
