# DISPATCH — m0_explorer_1

## Task Assignment
- Milestone: M0 (Phase 0 Foundation)
- Role: teamwork_preview_explorer
- Focus: RuleSet interface, Kalah implementation, geometry extraction, and 2,000-game equivalence test.
- Working Directory: c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m0_explorer_1
- Parent Conversation ID: 85856d3d-5ca8-4fac-8578-3161a39fe3a5
- Mandatory Inputs:
  - c:\Users\vjbel\hacks\mymancala\.agents\teamwork\ORIGINAL_REQUEST.md
  - c:\Users\vjbel\hacks\mymancala\PROJECT.md
  - docs/plan/phase-0-foundation.md
  - src/engine.ts
  - src/preflight-diagnostics.ts
  - src/search.test.ts

## Objective
Analyze the exact technical implementation plan for:
1. `src/rules/types.ts`: `RuleSet`, `GameState`, `MoveResult`, `Board` interfaces.
2. `src/rules/kalah.ts`: Full encapsulation of Kalah rules and geometry (`rows`, `cols`, `stores`, `pitOwner(i)`, `label(i)`). Zero literal 13 or 12-i outside this file.
3. Updating `src/engine.ts` to delegate to `kalahRuleSet`.
4. `src/rules/kalah.test.ts`: 2,000 seeded random game fuzz test comparing legacy `simulateMove` vs `kalahRuleSet.apply` with zero board divergence.

Provide concrete type definitions, function designs, and file layout in your report.
Write handoff report to `c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m0_explorer_1\handoff.md`.
Notify parent via send_message.


## 2026-10-07T01:22:40Z
[Message] timestamp=2026-10-07T01:22:40Z sender=85856d3d-5ca8-4fac-8578-3161a39fe3a5 priority=MESSAGE_PRIORITY_HIGH
Task: Analyze and provide concrete specifications for:
1. src/rules/types.ts (RuleSet, GameState, MoveResult, Board).
2. src/rules/kalah.ts (Kalah implementation and geometry encapsulation; no 13 or 12-i literals outside this file).
3. Adapting src/engine.ts to delegate to kalahRuleSet while preserving legacy interfaces for existing tests.
4. src/rules/kalah.test.ts (2,000-game fuzz test comparing simulateMove vs RuleSet.apply).
