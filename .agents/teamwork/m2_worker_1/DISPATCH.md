# Milestone M2 Implementation Dispatch

**Agent**: `m2_worker_1`
**Role**: Implementation Worker (Phase 2: The Trainer & Exact Endgame Solver)
**Parent**: Project Orchestrator (`85856d3d-5ca8-4fac-8578-3161a39fe3a5`)

---

## 1. Objective
Implement all features, solver engines, classification and explanation systems, drill loops, rating ladders, and review workflows for Milestone M2 (Phase 2: The Trainer & Exact Endgame Solver), strictly adhering to the architectural handoffs of `m2_explorer_1`, `m2_explorer_2`, and `m2_explorer_3`.

## 2. Input Specifications
You MUST read and follow these 3 Explorer handoff reports:
- `c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m2_explorer_1\handoff.md` (Exact solver, 500-pos benchmark, truthful eval)
- `c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m2_explorer_2\handoff.md` (Classification, deterministic explanations, rating ladder)
- `c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m2_explorer_3\handoff.md` (Mistakes storage, Leitner drills, game review upgrade, AppModals extraction)
Also read:
- `c:\Users\vjbel\hacks\mymancala\.agents\teamwork\ORIGINAL_REQUEST.md`
- `c:\Users\vjbel\hacks\mymancala\PROJECT.md`
- `c:\Users\vjbel\hacks\mymancala\docs\plan\phase-2-trainer.md`

---

## 3. Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

---

## 4. Key Architectural Constraints & Invariants
1. **5-Item Bottom Tray**: The mobile bottom tray MUST strictly contain exactly 5 buttons (`Board`, `Analysis`, `Coach`, `Rules`, `Settings`). Drills MUST be housed inside the `Coach` tab (`CoachPanel.tsx`). NEVER add a 6th button to the bottom tray!
2. **App.tsx Line Count**: `src/App.tsx` MUST be strictly `< 300 lines`. Extract modals into `src/components/shell/AppModals.tsx`.
3. **Truthful Evaluation**: Exact positions must show 0%, 50%, or 100% win rate only (never fake fractional percentages like 63%). Exact scores must NOT be divided by 3.5 in `useGame.ts`.
4. **500-Position Benchmark**: `src/solver/endgame.test.ts` must compare `solveExact` against an independent unpruned reference minimax across 500 deterministic positions (stone count <= 14) with 0 mismatches.
5. **Deterministic Explanations**: Pure functional `explain(rules, before, move, analysis)` using rule engine queries (no LLM, no buzzwords). 100% key parity across `en.ts`, `ar.ts`, and `es.ts`.
6. **Mistake Log Cap**: `mancala_mistakes_v1` strictly capped at 200 items (newest first).
7. **Offline-Only**: Zero external network calls, tracking pixels, or remote CDNs.

---

## 5. Verification Commands
- `npx tsc --noEmit` (0 errors)
- `npm test` (all tests passing including 500-position benchmark)
- `npm run build` (production build clean)
- `npx playwright test` (all E2E tests passing across all viewports)
- Verify `(Get-Content src/App.tsx).Length` is strictly < 300 lines.

Write your handoff report to `c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m2_worker_1\handoff.md` and notify parent via `send_message`.


## 2026-10-07T05:48:15Z
[Message] timestamp=2026-10-07T05:48:15Z sender=85856d3d-5ca8-4fac-8578-3161a39fe3a5 priority=MESSAGE_PRIORITY_HIGH content=You are m2_worker_1.
Your working directory is c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m2_worker_1.
Your caller/parent is the Project Orchestrator (ID: 85856d3d-5ca8-4fac-8578-3161a39fe3a5).

MANDATORY FIRST STEP: Read the original user request at:
c:\Users\vjbel\hacks\mymancala\.agents\teamwork\ORIGINAL_REQUEST.md
Also read PROJECT.md at:
c:\Users\vjbel\hacks\mymancala\PROJECT.md
And your task assignment at:
c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m2_worker_1\DISPATCH.md

Read the three Explorer handoff reports:
- c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m2_explorer_1\handoff.md (Exact Endgame Solver, 500-Position Cross-Check Benchmark, Truthful Evaluation Labelling)
- c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m2_explorer_2\handoff.md (Mistake Classification, Deterministic Explanations, Rating Ladder & Bot Calibration)
- c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m2_explorer_3\handoff.md (Mistake Log Persistence, Leitner Drill Trainer in Coach tab, Upgraded Game Review, AppModals extraction)
