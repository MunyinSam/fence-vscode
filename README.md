# Fence

Keep AI in learning mode. Fence integrates with Claude Code and limits it
to explaining concepts only — no code generation, no shortcuts.

## Why

AI writes code faster than you can learn from it. Fence fixes that by
forcing Claude Code to teach you the concept and ask guiding questions
instead of just handing you the answer.

## Install

npm install fence

## Usage

Navigate to any project and run:

fence init

Claude Code will now follow learning mode rules in that project.
Run "claude" as normal — it just won't write code for you anymore.

## Commands

fence init                    Activate with intermediate level (default)
fence init --level beginner   Activate with beginner level
fence set-level advanced      Switch to advanced level
fence status                  Check if Fence is active
fence off                     Deactivate Fence

## Skill levels

beginner      Simple language, no jargon, very guided questions
intermediate  Technical terms, pushes toward best practices
advanced      Brief, architecture-focused, treats you as a peer

## How it works

Fence writes a CLAUDE.md file to your project root. Claude Code reads
this file automatically and follows the instructions inside it.
That is the entire integration — no API keys, no background processes.
