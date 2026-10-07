# BRIEFING — 2026-10-07T05:46:00Z

## Mission
Analyze and provide concrete specifications for Exact Endgame Solver, 500-Position Cross-Check Benchmark, and Truthful Evaluation Labelling.

## 🔒 My Identity
- Archetype: Teamwork explorer (read-only investigation, synthesis, structured report)
- Roles: Explorer, Synthesizer
- Working directory: c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m2_explorer_1
- Original parent: 85856d3d-5ca8-4fac-8578-3161a39fe3a5
- Milestone: Phase 2 Trainer / Milestone 2

## 🔒 Key Constraints
- Read-only investigation — do NOT implement directly in src/
- Deliverables must be written in c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m2_explorer_1\handoff.md
- Use send_message to notify parent upon completion
- 500-position cross-check must assert 0 mismatches between solveExact and reference minimax
- Exact evaluations win % must be strictly 0 / 50 / 100% (never fake fractional percentages)
- Estimate evaluations labelled as "about +X stones" with "estimate" tag

## Current Parent
- Conversation ID: 85856d3d-5ca8-4fac-8578-3161a39fe3a5
- Updated: 2026-10-07T05:46:00Z

## Investigation State
- **Explored paths**:
  - `src/rules/types.ts`, `src/rules/kalah.ts`, `src/rules/index.ts`
  - `src/engine.ts`, `src/search.test.ts`
  - `src/workers/protocol.ts`, `src/workers/search.worker.ts`, `src/workers/searchClient.ts`
  - `src/components/shell/EvalGauge.tsx`, `src/components/panels/AnalysisPanel.tsx`
  - `src/game/useGame.ts`, `src/game/gameTypes.ts`, `src/lenses.ts`
  - `ORIGINAL_REQUEST.md`, `PROJECT.md`, `docs/plan/phase-2-trainer.md`, `docs/plan/README.md`
- **Key findings**:
  - Mathematical acyclicity of Kalah ensures game trees are DAGs; full-depth alpha-beta negamax with TT is completely sound.
  - Perspective convention: `value` is exact terminal margin from perspective of `s.turn` (win > 0, draw = 0, loss < 0).
  - Web Worker triggering condition: unbanked stones (stones in non-store pits) <= 14, default budget 300,000 nodes.
  - Critical scaling bug averted: heuristic score in `useGame.ts` was divided by 3.5; exact solver score is already in stones and must NOT be divided by 3.5.
  - 500-position benchmark design uses independent reference minimax (no pruning, no cache) on deterministic seeded positions with 0 mismatches asserted.
  - Truthful labelling defines `Evaluation` type (`kind: 'exact' | 'estimate'`), strict 0/50/100% win rate for exact, and "about +X stones" + "estimate" badge for heuristic evaluations.
- **Unexplored areas**: None for M2 Explorer 1 scope.

## Key Decisions Made
- Architected `solveExact` in `src/solver/endgame.ts` using negamax formulation supporting free turns without code branching.
- Formulated `src/solver/endgame.test.ts` with 500-position cross-check and unit tests preventing non-trivial percentages on exact positions.
- Designed comprehensive UI contracts for `EvalGauge.tsx` and `AnalysisPanel.tsx`.

## Artifact Index
- `c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m2_explorer_1\DISPATCH.md` — Task assignment and message log
- `c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m2_explorer_1\BRIEFING.md` — Persistent working memory
- `c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m2_explorer_1\progress.md` — Liveness heartbeat
- `c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m2_explorer_1\handoff.md` — Final 5-component handoff report
