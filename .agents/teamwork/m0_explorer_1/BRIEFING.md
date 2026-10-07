# BRIEFING — 2026-10-07T01:28:30Z

## Mission
Analyze and provide concrete specifications for RuleSet architecture (types, kalah.ts, engine.ts delegation, and 2,000-game fuzz test).

## 🔒 My Identity
- Archetype: Teamwork explorer
- Roles: teamwork_preview_explorer
- Working directory: c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m0_explorer_1
- Original parent: 85856d3d-5ca8-4fac-8578-3161a39fe3a5
- Milestone: M0 (Phase 0 Foundation)

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- No file modifications outside c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m0_explorer_1
- No board geometry literals (13, 12-i) outside src/rules/kalah.ts
- Preserve legacy interfaces in src/engine.ts for existing tests
- Provide concrete types, specifications, and handoff report

## Current Parent
- Conversation ID: 85856d3d-5ca8-4fac-8578-3161a39fe3a5
- Updated: not yet

## Investigation State
- **Explored paths**: ORIGINAL_REQUEST.md, PROJECT.md, docs/plan/phase-0-foundation.md, docs/plan/README.md, DISPATCH.md, src/engine.ts, src/preflight-diagnostics.ts, src/search.test.ts, src/engine.test.ts, src/tactics.ts, src/tactics.test.ts, src/bots.test.ts, src/lenses.test.ts, src/App.tsx.
- **Key findings**:
  1. `src/rules/types.ts`: Defined `Player`, `Board`, `GameState`, `MoveResult`, `BoardLayout`, and `RuleSet` according to contract.
  2. `src/rules/kalah.ts`: Encapsulates all 14-pit, store 6/13, opposite 12-i geometry. Exports `KALAH_TOTAL_PITS`, `KALAH_P1_STORE`, `KALAH_P2_STORE`, `KALAH_P1_PITS`, `KALAH_P2_PITS`, `kalahRules()`, `createKalahRuleSet()`, and `kalahRuleSet`.
  3. `src/engine.ts`: Re-exports constants from `rules/kalah.ts`, adapts `simulateMove` and `getLegalMoves` to delegate to `kalahRuleSet.apply` and `kalahRuleSet.legalMoves`, adapts `minimax` to be generic over `RuleSet` while keeping the legacy parameter signature for `search.test.ts` and `preflight-diagnostics.ts`.
  4. `src/rules/kalah.test.ts`: 2,000 seeded random games with PRNG across 4 rule combinations asserting exact board, player, termination, extraTurn, and capture parity on every single ply.
- **Unexplored areas**: None for M0 Phase 0.1 scope.

## Key Decisions Made
- `minimax` keeps its 7-parameter signature `(board, player, depth, alpha, beta, rules, maxDepth)` but supports `rules: RulesConfig | RuleSet`, delegating terminal scoring to `ruleSet.score()` instead of hardcoded store indices.
- `simulateMove` delegates to `kalahRules(rules).apply()` and maps `MoveResult` to `MoveSimulationResult` without losing `lastLanding` or `capturedFromPit`.
- Board geometry constants (`13`, `12 - `, `14`, `6`) isolated entirely in `src/rules/kalah.ts`.

## Artifact Index
- c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m0_explorer_1\handoff.md — Final handoff report
- c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m0_explorer_1\progress.md — Liveness heartbeat
