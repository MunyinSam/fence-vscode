# fence-vscode-v2

A VS Code extension that estimates the user's programming skill level using AI, generates code within that level, and updates the skill model over time.

Rewrite of fence-vscode. Core scanner code will be ported — new AI pipeline replaces the static signal counter.

---

## New Pipeline

```
Estimate Skill Level → Generate Code Within Level → Update Skill Level
```

1. **Estimate** — AI observes user code + onboarding to build a skill profile per language/framework
2. **Generate** — When user requests code, fence caps generation at their current level
3. **Update** — Each interaction refines the skill model over time

### Open Design Questions
- How does AI estimate skill on first launch? (onboarding diagnostic vs. passive scan)
- What does "generate within level" look like in practice for a concept they don't know yet?
- How do we prevent skill model from going stale?

---

## Concept Mastery Tiers

Each concept is rated independently on this scale. A user is not globally "Tier 3" — they might be Tier 4 on async mental models and Tier 1 on architecture patterns.

| Tier | Label      | What it means                                                     |
| ---- | ---------- | ----------------------------------------------------------------- |
| 1    | Aware      | Knows the term, has heard of it                                   |
| 2    | Recognizes | Can identify it in existing code when shown                       |
| 3    | Applies    | Can use it when told to, but doesn't choose it independently      |
| 4    | Chooses    | Knows when to reach for it vs alternatives, understands tradeoffs |
| 5    | Designs    | Can architect systems around it, teaches it, sees edge cases      |

AI estimates where the user sits per concept — not globally — and blocks generation of code that requires concepts above their current tier.

---

## Skill Taxonomy

### Concepts (Language-Agnostic)

These apply regardless of language. Understanding them in JS transfers to Python, Go, etc.

**Mutability & State**
- Immutability vs mutability — when each is appropriate
- Pure functions and side effects — what makes a function pure, why it matters
- Referential transparency
- Local vs global state — when to lift, when to keep local
- Derived state vs stored state — not storing what you can compute

**Functions as First-Class**
- Higher-order functions — functions that take or return functions
- Closures — what closes over what and why it matters
- Currying and partial application — transforming function signatures
- Function composition — building behavior by combining small functions

**Async Mental Model**
- Synchronous vs asynchronous execution — not syntax, the *model*
- Callbacks and callback hell — why it happened, what it costs
- Promises as values — a promise is a box around a future value
- async/await as syntax sugar — what it compiles to conceptually
- Concurrency vs parallelism — JS is single-threaded, what that actually means
- Error propagation in async chains

**Composition vs Inheritance**
- Classical inheritance and its problems (fragile base class, deep hierarchies)
- Composition — building behavior by combining, not extending
- Mixins and trait-like patterns
- "Favor composition over inheritance" — knows *why*, not just the rule

**Error Handling**
- Exceptions vs return values for errors
- Fail fast vs fail safe
- Error boundaries and recovery strategies
- Result/Either pattern — errors as values, not thrown exceptions

**Separation of Concerns**
- Why mixing UI, business logic, and data access is a problem
- What a "layer" is and why you draw the line where you do
- Single responsibility — applied to functions, modules, services, not just classes

**Dependency Management**
- Dependency injection — passing dependencies in vs hardcoding them
- Inversion of control — who owns the lifecycle
- Why tight coupling makes code hard to test and change

---

### Patterns

Reusable solutions to recurring problems. Language has syntax for these — the concept is universal.

**Creational**
- Factory — abstract the creation decision
- Builder — construct complex objects step by step
- Singleton — one instance, global access (and why it's often a trap)

**Behavioral**
- Observer / Pub-Sub — notify without coupling (events, reactive systems)
- Strategy — swap algorithms at runtime without changing callers
- Command — encapsulate actions as objects (undo/redo, queues)
- State machine — model transitions explicitly, no implicit state flags
- Iterator — traverse without exposing internals

**Structural**
- Adapter — make incompatible interfaces work together
- Decorator — extend behavior without subclassing
- Facade — simplify a complex subsystem behind a clean interface
- Proxy — intercept access (lazy loading, validation, caching)

**Functional Patterns**
- Option / Maybe — represent nullable values without null checks everywhere
- Result / Either — represent success/failure as a value, not an exception
- Functor / Monad — map and chain operations over wrapped values (practical understanding, not category theory)
- Pipeline operator mental model — data flows through transformations

**Frontend Patterns (React / JS)**
- Component composition — build complex UI from small, focused pieces
- Compound components — components that share implicit state
- Custom hooks as abstraction — extracting behavior, not just logic
- Context + reducer — predictable local state without a library
- Optimistic updates — update UI before the server confirms

---

### Architecture

System-level thinking. This is where most junior devs have the biggest gap.

**Application Structure**
- MVC / MVP / MVVM — separating data, display, and control
- Clean architecture — dependency rule, layers that don't know about each other
- Hexagonal (ports and adapters) — core logic isolated from I/O
- Feature-based vs layer-based folder structure — and when each makes sense

**API Design**
- REST — resource-oriented, stateless, when it fits
- GraphQL — client-driven queries, when the flexibility is worth the cost
- tRPC — type-safe RPC, when you control both ends
- Knowing which to reach for and why

**State & Data Flow**
- Unidirectional data flow — why React enforces it
- CQRS — separate read and write models
- Event sourcing — state as a log of events, not current values
- Caching strategies — what to cache, where, and invalidation

**Backend Concerns**
- Authentication vs authorization — not the same thing
- Stateless vs stateful services — what serverless forces you to think about
- Database normalization vs denormalization tradeoffs
- Idempotency — why it matters in distributed systems
- Rate limiting and backpressure

**Scalability Thinking**
- Monolith vs microservices — tradeoffs, not religion
- Event-driven architecture — decoupling via events
- Horizontal vs vertical scaling — and what your bottleneck actually is

---

## Scope Note

Syntax is not tracked here. Whether the user knows `Array.prototype.flatMap` or TypeScript's `infer` keyword is secondary. The question is: **do they understand the concept well enough that AI-generated code using it won't be opaque to them?**

Expand to other languages (Python, Go, etc.) later — the taxonomy above is already mostly portable.

---

## Related
- [[fence-vscode]] — v1 (static AST scanner, TS only, no AI)
- [[(C) fence-vscode data schemas]] — type definitions to port to v2
- [[(C) TypeScript Skill Tiers]] — original tier research (still valid, fold in above)
- [[(C) Skill Detection Research]] — signal detection logic (partially portable)
