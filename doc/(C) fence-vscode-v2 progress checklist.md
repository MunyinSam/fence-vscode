# fence-vscode-v2 — Progress Checklist

---

## Design Phase

### Pipeline
- [x] Core pipeline defined (Estimate → Gate → Update)
- [x] Cold start problem identified and solved (quiz + feedback loop)
- [x] Unknown concept fallback decided (default Tier 2)
- [x] Generation response tiers decided (silent / annotated / refuse)
- [x] Feedback signal design decided (targeted comprehension question before generation)
- [x] Passive acceptance ruled out as signal
- [x] Hard refusal positioned as last resort, not first response

### Integration
- [x] CLAUDE.md approach rejected (static, pollutes project config)
- [x] Chat Participant + vscode.lm API chosen as integration approach
- [x] Context reading capabilities mapped out (active file, selection, workspace scan, references)
- [x] Language groups decided (js/ts/tsx grouped together for MVP)

### Scope
- [x] MVP scope locked (core gate pipeline only — no dashboard, no multi-language)
- [x] Dashboard and skill tracking deferred to post-MVP

### Remaining Design Decisions
- [ ] Onboarding quiz design (question format, concept coverage order for JS/TS/TSX)
- [x] Targeted question prompt design — senior asking junior tone, challenges the choice not the knowledge
- [x] Quiz scoring rubric — rubric-guided (accuracy, depth, tradeoffs, edge cases) + Socratic follow-up on borderline cases
- [x] Skill model persistence — vscode.globalState for MVP, vscode.SecretStorage for API key
- [ ] API key storage strategy (vscode.SecretStorage)
- [x] Concept taxonomy finalized for JS/TS/TSX MVP scope (7 concepts: closures, async model, pure functions, immutability, component composition, async error handling, separation of concerns)

---

## Build Phase

### Setup
- [ ] Initialize VS Code extension project (TypeScript)
- [ ] Configure package.json with Chat Participant contribution point
- [ ] Set up Anthropic SDK dependency
- [ ] Implement API key input + storage (vscode.SecretStorage)

### Skill Estimation
- [ ] Build onboarding quiz UI and flow
- [ ] Workspace scanner (reads files, detects concept patterns)
- [ ] Skill model schema (concept × language_group → tier)
- [ ] Skill model persistence layer

### Gate Generation
- [ ] Chat Participant handler (`@fence` request routing)
- [ ] Concept extractor (identifies what concepts a request requires)
- [ ] Tier comparator (concept required vs user's current tier)
- [ ] Targeted question generator (reads request, asks about the specific concept)
- [ ] Reasoning evaluator (scores user's explanation via Claude)
- [ ] Response router (silent generate / annotated / refuse)

### Skill Model Update
- [ ] Post-generation signal collector (edits, follow-ups)
- [ ] Tier update logic (nudge up / hold / nudge down)

### Polish
- [ ] Onboarding flow end-to-end
- [ ] Error handling (no API key, API failure, unknown concept)
- [ ] Manual tier override (user can declare their level, trust-but-verify)

---

## Post-MVP

- [ ] Dashboard — visualize skill profile per concept
- [ ] Skill progress tracking over time
- [ ] Python language group
- [ ] Go language group
- [ ] Rust language group
- [ ] Concept taxonomy expansion beyond JS/TS/TSX
