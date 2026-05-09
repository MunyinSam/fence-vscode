# fence-vscode-v2 — Pipeline Decisions

Decisions and design rationale from the planning session (2026-05-09).

---

## Core Pipeline

```
Estimate Skill → Gate Generation → Update Skill Model
```

Each stage is per-concept, per-language-group — not a global score.

---

## MVP Scope

**What's in MVP:**
- Full pipeline (estimate → gate → update) in minimal form
- Chat Participant integration (`@fence`) with Claude via Anthropic SDK
- JS/TS/TSX concept taxonomy with scoring
- Comprehension check before generation (reasoning prompt)

**What's deferred (post-MVP):**
- Dashboard and skill progress tracking
- Additional language groups (Python, Go, Rust)
- Persistent skill model refinement over time

**Reasoning:** Ship the core gate first. Prove the comprehension check is useful. Dashboard and tracking are v2.1.

---

## Stage 1: Estimate (Cold Start)

**Problem:** No data on day one. Wrong estimate = fence too loose (vibe-coding continues) or too tight (tool is useless).

**Solution: Quiz + Bayesian feedback loop**

- Run a lightweight onboarding quiz at install (7–10 questions)
- Quiz covers the most important concepts in the taxonomy
- Results become the initial prior per concept
- Model updates continuously from real usage — initial estimate just needs to survive the first session, not be perfect

**Failure mode asymmetry:** Too-loose is safer than too-tight on day one. Default to calibrating low and expanding fast.

**Unknown concepts:** Default to Tier 2 (Recognizes). Safe floor — user can identify the concept but the fence won't generate code that requires choosing or designing with it.

**Workspace scan (supplements quiz):**
On install, scan open workspace files using `vscode.workspace.findFiles()` to detect concept patterns in real code the user wrote. Used as a secondary signal to fill gaps and catch obvious inconsistencies (e.g. claimed Tier 5 on closures but no closures anywhere in their code).

---

## Stage 2: Gate Generation

**Integration approach: VS Code Chat Participant + vscode.lm API**

User invokes `@fence` in VS Code chat. The extension owns the full pipeline — no interception of Copilot or other extensions needed.

**Why not CLAUDE.md editing (v1's approach):**
- CLAUDE.md is static — can't update constraints per-request based on the concept being asked about
- It pollutes the user's actual project config
- No control over the conversation — just prepending text and hoping
- Not viable for a dynamic, per-concept skill model

**Context the extension can read:**

| Context | How |
|---|---|
| Current open file | `vscode.window.activeTextEditor.document.getText()` |
| Selected text | `vscode.window.activeTextEditor.selection` |
| User-attached files | `request.references` (via `#file:foo.ts` in chat) |
| Workspace files | `vscode.workspace.findFiles()` + `openTextDocument()` |

The user invokes `@fence` explicitly — context is read at that point. No invisible background scanning during generation.

---

**Flow:**
```
User sends message to @fence
→ Extension reads active file + request for context
→ AI identifies concepts the code would require
→ If all concepts below user's tier: generate silently (no friction)
→ If any concept at/near/above user's tier:
    → Read the request, identify the specific concept at the boundary
    → Ask a targeted question about that concept
      (e.g. "You're near your boundary on closures — why use a closure
       here instead of storing state in a module variable?")
    → Evaluate reasoning quality
    → Route to appropriate response (see below)
```

**Why targeted questions, not generic "explain your reasoning":**
A vague prompt ("explain your approach") can be faked with surface-level answers. A targeted question about the specific concept exposes whether the user understands the tradeoff. Someone who actually knows closures can answer it. Someone vibe-coding cannot.

**Why ask before generating, not after accepting:**
Passive acceptance is not a signal. A user who clicks "accept" without reading is indistinguishable from one who understood it deeply. Active explanation is harder to fake.

This is v1's comprehension check mechanic repurposed as v2's feedback signal.

### Generation Response Tiers

| Situation | Response |
|---|---|
| All concepts within tier | Generate silently |
| Concept is new, user engages with explanation | Generate with heavy inline annotation |
| User has seen it but can't explain it clearly | Generate annotated — make the concept legible |
| User demonstrates zero understanding AND won't engage | Refuse, surface a resource, do not generate |

**Hard refusal is the last resort**, not the first response. The tool tries to help the user understand before blocking them. Refusing immediately is paternalistic and teaches nothing — users will just open ChatGPT.

---

## Stage 3: Update Skill Model

**Signal sources (ranked by quality):**
1. Comprehension check quality — how well the user answered the targeted question
2. Edits the user makes to generated code — confident edits suggest real understanding
3. Follow-up questions and re-generation requests — signal of confusion
4. Code the user writes themselves — passive but real

**What passive acceptance tells you:** Almost nothing on its own. Do not use it as a positive signal.

**Upgrade path:** Good comprehension check + confident edits → nudge tier up. Weak explanation + no engagement → hold or nudge down.

---

## Workspace Awareness

Skill tiers are tracked per `(concept, language_group)` pair.

**Language groups (MVP: js/ts only):**
- `js/ts/tsx` — same group (MVP scope)
- `python` — post-MVP
- `go` — post-MVP
- `rust` — post-MVP

A user can be Tier 4 on async in `js/ts` and Tier 1 on async in `go` simultaneously. The fence evaluates against the active workspace's language group.

---

## Concept Taxonomy — MVP Scope (JS/TS/TSX)

Quiz assesses these 7 concepts. Fence detects the full taxonomy — anything not in the quiz defaults to Tier 2.

| # | Concept | Why |
|---|---|---|
| 1 | Closures | Fundamental JS — hooks, callbacks, event handlers. Biggest differentiator. |
| 2 | Async mental model | The *model*, not the syntax. Most 2nd years know async/await but not what's happening. |
| 3 | Pure functions & side effects | The difference between React making sense and React being confusing. Critical for hooks. |
| 4 | Immutability vs mutability | Why you don't mutate state directly. Daily useState/object spreading work. |
| 5 | Component composition | Primary Next.js/React frontend pattern. The "small focused pieces" mental model. |
| 6 | Error handling in async | try/catch in async chains, unhandled rejections, error boundaries. Rarely understood deeply. |
| 7 | Separation of concerns | Most common beginner mistake in React — fetch calls in components, no abstraction layer. |

**Deferred to post-MVP:** Higher-order functions, custom hooks, composition vs inheritance, dependency injection, all patterns, all architecture concepts.

---

## Skill Model Persistence

**Decision: `vscode.globalState` for MVP.**

Built-in VS Code key-value store. Persists locally across sessions, tied to the extension, zero setup from the user.

Post-MVP: cloud sync for cross-machine support (requires auth + infra).

**API key storage: `vscode.SecretStorage`** — VS Code's secure credential store. Never stored in globalState or plain files.

---

## Quiz Scoring Rubric

**Method: Rubric-guided scoring (base) + Socratic follow-up (escalation on borderline cases)**

Claude scores each written explanation against a per-concept rubric using four dimensions:

| Dimension | What it checks |
|---|---|
| Accuracy | Is what they said correct? |
| Depth | Do they explain WHY, not just WHAT? |
| Tradeoff awareness | Do they know what they chose over? |
| Edge case awareness | Do they know where it breaks? |

**Tier mapping:**

| Tier | Signals present |
|---|---|
| 1–2 | Accurate but surface-level. No why, no tradeoffs. |
| 3 | Accurate + some why. No tradeoffs. |
| 4 | Accurate + why + tradeoffs. |
| 5 | Accurate + why + tradeoffs + edge cases. |

**Borderline cases:** If score lands between two tiers, trigger one Socratic follow-up question to resolve it. Consistent rubric for normal cases, accuracy preserved for edge cases.

**Why not keywords:** Keyword presence is gameable — someone can write "I chose a closure over a class because of tradeoffs" without knowing the tradeoff. The rubric evaluates quality, not vocabulary.

---

## Targeted Question Tone

**Voice: senior asking a junior.** Not an exam. A natural challenge to a design decision.

Instead of: *"Explain what a closure is."*

Like: *"Why a closure here? Couldn't you just lift this into module state?"*

Assumes some competence, challenges the specific choice made, sounds like a code review comment — not a pop quiz.
