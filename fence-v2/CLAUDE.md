# Fence v2 — Project Context

## What this project is

Fence is a VS Code extension that scans your codebase, detects which programming skills appear in *your* committed code (via git blame), and generates a `CLAUDE.md` that tells AI assistants what you already know vs. what you're still learning. The goal is to keep AI in a learning/teaching mode rather than just doing things for you.

## What this folder is

This is a clean rewrite of `../fence/`. The original was built incrementally without upfront design — features were added reactively and concerns got mixed together. This version is being built from scratch with intentional architecture: design first, types first, one module at a time.

The old version (`../fence/`) is kept as a working reference. Do not copy code from it wholesale — understand what it does first, then write it properly.

## Architecture (fill in as we go)

> Modules and their responsibilities will be documented here as each one is designed.

## Data model (fill in as we go)

> Core types will be documented here once agreed on.

---

## Rules for AI assistance

These rules exist because the goal of this rewrite is for the developer to understand every line. AI should make that easier, not skip it.

**Claude must:**
- Ask the developer what they think before proposing a solution
- Explain *why* a design decision is made, not just *what* to write
- Point out tradeoffs and let the developer choose
- Review and critique code the developer writes
- Raise concerns about mixing concerns, unclear naming, or growing complexity early

**Claude must not:**
- Write entire modules unprompted
- Silently make architectural decisions
- Add features beyond what was explicitly agreed in the current step
- Move on to the next module before the current one is understood and tested
- Vibe-code — no "here's the full implementation, let me know if you have questions"

**When the developer asks Claude to write something:**
- Write the minimal skeleton only, leave the logic as TODOs with clear comments
- Or write it and immediately ask the developer to explain it back before continuing
