import Anthropic from '@anthropic-ai/sdk';
import type { ConceptId } from '../types/index';

const ALL_CONCEPT_IDS: ConceptId[] = [
    'closures',
    'async-model',
    'pure-functions',
    'immutability',
    'component-composition',
    'async-error-handling',
    'separation-of-concerns',
];

const CONCEPT_DEFINITIONS = `
closures
  A function that captures variables from its surrounding scope. The inner function
  retains access to those variables even after the outer function has returned.
  Required when code uses: factory functions, callback state, memoisation, event
  handlers that close over local variables, or any returned function that reads
  outer-scope values.

async-model
  The mental model of asynchronous execution — not the syntax. Understanding that
  JS is single-threaded, that awaited operations yield control back to the event
  loop, and that code after an await does not run until the awaited value resolves.
  Required when code uses: fetch, timers, any Promise-based API, async/await,
  or depends on execution order across async boundaries.

pure-functions
  A function whose output depends only on its inputs and produces no side effects.
  Given the same inputs it always returns the same output and does not mutate
  external state, write to disk, or call APIs.
  Required when code uses: transformation pipelines, utility functions that compute
  from inputs, or any function that must be predictable and testable in isolation.

immutability
  Treating data as read-only and producing new values instead of modifying existing
  ones. In React, state must not be mutated directly — a new object or array must
  be produced and passed to the setter.
  Required when code uses: React state updates with objects or arrays, spread
  operators to update nested state, or patterns where referential equality matters
  (useMemo, useCallback dependencies).

component-composition
  Building complex UI by combining small, focused components rather than writing
  one large component. Each component does one thing; larger components assemble
  smaller ones.
  Required when code uses: multiple UI concerns inside one component that could be
  extracted, passing children or render props, or building reusable UI pieces that
  appear in more than one place.

async-error-handling
  Handling failures in asynchronous code — network errors, rejected Promises,
  non-OK HTTP responses, and unhandled rejections in async chains.
  Required when code uses: fetch without checking res.ok, async functions without
  try/catch, Promise chains without .catch(), or operations that can fail over the
  network or I/O.

separation-of-concerns
  Keeping data fetching, business logic, and UI rendering in separate layers.
  In React this means not writing fetch calls directly inside components — instead
  extracting them into custom hooks, services, or utility modules.
  Required when code mixes: data fetching + rendering in one component, business
  logic + JSX in the same function, or API calls that belong in a service layer.
`.trim();

export async function extractRequiredConcepts(
    client: Anthropic,
    userMessage: string,
    fileContent: string | null
): Promise<ConceptId[]> {
    const fileSection = fileContent
        ? `## Active file:\n\`\`\`\n${fileContent.slice(0, 3000)}\n\`\`\``
        : '## Active file:\n(none)';

    const message = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 256,
        messages: [
            {
                role: 'user',
                content: `You identify which programming concepts a piece of code would require the developer to understand.

## Concept definitions:
${CONCEPT_DEFINITIONS}

## Valid concept IDs (return only these exact strings):
${ALL_CONCEPT_IDS.join(', ')}

${fileSection}

## User's request:
${userMessage}

Which of the 7 concepts would a developer need to genuinely understand in order to write, read, or maintain the code being requested? Only include a concept if the code meaningfully depends on it — not just if the concept is tangentially related.

Respond with a JSON array of concept ID strings only — no markdown, no explanation:
["concept-id", ...]

If no concepts apply, respond with an empty array: []`,
            },
        ],
    });

    const block = message.content[0];
    if (block.type !== 'text') {
        return [];
    }

    try {
        const parsed = JSON.parse(block.text) as unknown[];
        return parsed.filter((id): id is ConceptId =>
            ALL_CONCEPT_IDS.includes(id as ConceptId)
        );
    } catch {
        return [];
    }
}
