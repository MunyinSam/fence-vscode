# Fence

**Keep AI in learning mode.** Fence scans your code, figures out what you already know, and writes a `CLAUDE.md` file that instructs Claude to teach rather than just hand you answers.

## How it works

1. Run **Fence: Init** in any project
2. Fence scans your code files and detects which patterns and skills you actually use
3. It writes a `CLAUDE.md` at the project root
4. Claude reads that file and adjusts — explaining concepts you're still learning instead of writing the code for you

## Features

- Detects skills across **8 languages**: JavaScript, TypeScript, React, Python, Go, Java, C#, Rust, Ruby, PHP
- Confidence scoring — distinguishes *Expert* from *Familiar* based on how often you use a pattern
- Accumulates knowledge across multiple projects (stored in `~/.fence/skills.json`)
- Skills grouped by language in the generated `CLAUDE.md`

## Usage

Open any project in VS Code and run the command:

- **Command Palette** (`Ctrl+Shift+P`): `Fence: Init`
- **Keyboard shortcut**: `Ctrl+Shift+F` (Mac: `Cmd+Shift+F`)

A `CLAUDE.md` file will be created or updated at your project root.

## Example output

```markdown
## What I Already Know
### TypeScript
- Async / Await (Expert)
- TypeScript Interfaces & Types (Proficient)

## What I'm Still Learning
### JavaScript/TypeScript
- Error Handling
- Promises
```

Claude will freely use skills you know, but will guide you through the ones you're still learning.

## Requirements

- VS Code 1.115.0 or higher
- A project with source files (`.ts`, `.js`, `.py`, `.go`, `.java`, `.cs`, `.rs`, `.rb`, or `.php`)
