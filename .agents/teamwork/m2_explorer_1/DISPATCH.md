# Task Assignment: M2 Explorer 1 (Exact Endgame Solver & Truthful Evaluation)

## Objective
Analyze and provide concrete architectural specifications for:
1. **Exact Endgame Solver (`src/solver/endgame.ts`)**:
   - `solveExact(rules: RuleSet, s: GameState, budgetNodes: number): { value: number; best: number[]; exact: true } | null`.
   - Full-depth alpha-beta with transposition table (TT) and memoization by `rules.key`. Value = final stone differential under active rules. Returns `null` if node budget (e.g. 300,000 nodes) is exceeded.
   - Run in the Web Worker (`src/workers/search.worker.ts`).
   - Trigger condition: total stones on board <= 14 (or customizable threshold).
2. **500-Position Cross-Check Test (`src/solver/endgame.test.ts`)**:
   - Generate 500 random positions with stone counts <= 14.
   - Compare `solveExact` results against an independent plain minimax reference (with zero pruning/TT, brute-force ground truth).
   - Assert 0 mismatches across all 500 positions (`ORIGINAL_REQUEST.md:76`).
   - Also test known-terminal and forced-sequence positions.
3. **Truthful Evaluation Labelling**:
   - Type definition:
     ```ts
     export type Evaluation = { value: number; kind: 'exact' | 'estimate'; depth?: number; winPct?: number; nodes?: number; };
     ```
   - Exact: value is true final stone margin with best play; win % shown as 0/50/100% only (win/draw/loss) — NEVER a fake fractional percentage.
   - Estimate: search evaluation; display as stone advantage ("about +2 stones") with an "estimate" tag. Win % only shown when lens `winPercent` is on, labelled as "rough chance".
   - Remove or relabel the logistic `1/(1+exp(-score*0.022))` formula as a rough indicator; add a unit test that exact positions never show non-trivial percentages.
   - UI updates in `EvalGauge.tsx` and `AnalysisPanel.tsx`.

## Input Artifacts
- `c:\Users\vjbel\hacks\mymancala\.agents\teamwork\ORIGINAL_REQUEST.md`
- `c:\Users\vjbel\hacks\mymancala\docs\plan\phase-2-trainer.md`
- `c:\Users\vjbel\hacks\mymancala\src\rules\types.ts`
- `c:\Users\vjbel\hacks\mymancala\src\rules\kalah.ts`
- `c:\Users\vjbel\hacks\mymancala\src\search.ts`
- `c:\Users\vjbel\hacks\mymancala\src\workers\protocol.ts`
- `c:\Users\vjbel\hacks\mymancala\src\workers\search.worker.ts`
- `c:\Users\vjbel\hacks\mymancala\src\workers\searchClient.ts`

## Deliverables
Write your comprehensive architectural report to `c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m2_explorer_1\handoff.md`.
Notify parent via `send_message`.

## 2026-10-07T05:40:11Z
Parent message:
Analyze and provide concrete specifications for:
1. Exact Endgame Solver (src/solver/endgame.ts)
2. 500-Position Cross-Check Benchmark (src/solver/endgame.test.ts)
3. Truthful Evaluation Labelling (EvalGauge.tsx, AnalysisPanel.tsx, types, etc.)
Write report to handoff.md and notify parent.
