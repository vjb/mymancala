# Phase 4: Reach (variants, friend play, stories)

Prereq: phases 0–3. Rules definitions and sources: [appendix-rules-and-sources.md](appendix-rules-and-sources.md). Never invent rules or cultural facts; unverified items stay `beta` or are cut.

## 4.1 Variant framework
- Registry `src/rules/index.ts`: `getRules(id, options)`. Variant picker (Settings and new-game sheet) shows name, one-line description, `beta` badge when applicable.
- Each variant ships: `RuleSet` implementation, rules text (en/ar/es), tutorial steps, reference tests (known hand-computed move sequences), and a random-play invariant test (stone count conserved, no infinite loops, always terminates).
- Analysis grade per variant: `exact-endgame+search` (Kalah, Oware, Sow & Score) or `search-only` (Congkak/Dakon, Bao). Search-only variants must never show `exact` labels or the exact endgame badge.

## 4.2 Oware (full)
- 2x6 pits, 4 stones each, 48 total, counter-clockwise sowing, skip origin pit on 12+ stone laps, capture 2–3 backwards chain, grand slam and no-move rules per appendix (pick ONE documented rule set, e.g. Abapa; list as the default; others as options only if tested).
- Exact solver works for few-stones endgames only (state space too large to solve fully; do not claim otherwise).
- Tests: reference positions, grand-slam cases, starvation/must-feed rule, stone conservation fuzz.

## 4.3 "Sow & Score" (intro variant)
- Simple sowing, no captures, designed for ages 6+. Name is deliberately not "Ayo" (not historical Ayo). Description must say "a simple teaching version".
- Fully solvable; ship exact analysis.

## 4.4 Congkak/Dakon and Bao (beta)
- Only after sources are verified in the appendix. Congkak/Dakon vary widely: ship a single clearly-labelled option set. Bao la Kiswahili is complex (two phases, kutakatia, etc.): ship only if rules are implemented from cited sources and have heavy tests; otherwise leave behind a flag `features.bao = false` and record in `OPEN-QUESTIONS.md`.
- Beta badge + "Rules vary by region" note; search-only grading.

## 4.5 Friend play by link (optional relay)
- Zero accounts. Flow: host creates room -> gets URL with random 128-bit room id -> friend opens URL.
- Transport: one tiny serverless relay (Cloudflare Worker + Durable Object or equivalent) that forwards opaque JSON `{type:'move', n, move}` between two sockets by room id; stores nothing, no logs of content, rooms expire after 30 min idle. Source in `relay/`.
- Protocol (`src/net/protocol.ts`): `hello{v, rulesId, options, seat}`, `move{n, pit}`, `resign`, `rematch`, `ping`. Both clients run the rules engine locally and reject illegal moves/out-of-order `n`; desync -> offer resume from replay codec (3.3).
- Asynchronous fallback (no relay at all): "Play by passing a link": each move produces a new replay URL to send via any messenger.
- **No chat, no names, no free text.** Preset emoji reactions only (fixed list).
- Env var `VITE_RELAY_URL`; if unset, hide live play entirely and keep link-passing.
- Tests: protocol unit tests with a fake socket pair; relay worker tests (miniflare) for forwarding and expiry; e2e with two browser contexts.

## 4.6 Cultural stories
- `src/stories/*.ts` typed data: `{id, title, body[], sources[]}` with at least one verifiable source each. Short, respectful, no stereotyping, reviewed `// REVIEW-NATIVE` for ar/es. Unlocked via badges but always reachable in Rules > About the game. If no source can be found for a claim, omit it.

## Definition of done (phase 4)
Kalah, Oware, Sow & Score complete with tests; beta labels correct; friend play works with relay and gracefully absent without; privacy statement in-app is accurate; commit `feat: phase 4 reach`.
