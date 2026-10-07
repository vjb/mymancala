# Task Assignment: M1 Iteration 2 Reviewer 1 (App Architecture, Empty State & Canonical Lenses)

## Objective
Review the M1 Iteration 2 remediations:
1. `src/App.tsx` line count (must be strictly < 300 lines) and code structure.
2. `src/game/useUserSettings.ts` state hook extraction.
3. `isAnalysisEmpty` computation and wiring into `AnalysisPanel.tsx`:
   - Verify `data-testid="analysis-empty-state"` and `data-testid="enable-coach-btn"` display in `justPlay` mode.
   - Verify candidate move evaluations are suppressed when `isAnalysisEmpty` is true.
   - Verify clicking `enable-coach-btn` switches to `coach` preset and hides empty state.
4. `landingPreview` canonical lens gating in `src/game/useGame.ts`:
   - Verify hover and touch previews (landing ring, capture pulse, trajectory ribbon) are suppressed when `landingPreview` is false.
5. Removal of `navigator.webdriver` sniffing in `src/App.tsx`.
6. Run `npx tsc --noEmit` and `npm test`.

## Input Artifacts
- `c:\Users\vjbel\hacks\mymancala\src\App.tsx`
- `c:\Users\vjbel\hacks\mymancala\src\game\useUserSettings.ts`
- `c:\Users\vjbel\hacks\mymancala\src\components\panels\AnalysisPanel.tsx`
- `c:\Users\vjbel\hacks\mymancala\src\game\useGame.ts`
- `c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m1_iter2_worker_1\handoff.md`

## Deliverables
Write your review report to `c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m1_iter2_reviewer_1\handoff.md` with an explicit verdict (**APPROVE** or **REQUEST_CHANGES**).
Notify your parent via `send_message`.


## 2026-10-07T05:02:36Z
You are m1_iter2_reviewer_1.
Your working directory is c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m1_iter2_reviewer_1.
Your caller/parent is the Project Orchestrator (ID: 85856d3d-5ca8-4fac-8578-3161a39fe3a5).

MANDATORY FIRST STEP: Read the original user request at:
c:\Users\vjbel\hacks\mymancala\.agents\teamwork\ORIGINAL_REQUEST.md
Also read PROJECT.md at:
c:\Users\vjbel\hacks\mymancala\PROJECT.md
And your task assignment at:
c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m1_iter2_reviewer_1\DISPATCH.md
And the worker handoff report at:
c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m1_iter2_worker_1\handoff.md

Review the M1 Iteration 2 remediations:
1. src/App.tsx line count (must be strictly < 300 lines) and code structure.
2. src/game/useUserSettings.ts state hook extraction.
3. isAnalysisEmpty computation and wiring into AnalysisPanel.tsx:
   - Verify data-testid="analysis-empty-state" and data-testid="enable-coach-btn" display in justPlay mode.
   - Verify candidate move evaluations are suppressed when isAnalysisEmpty is true.
   - Verify clicking enable-coach-btn switches to coach preset and hides empty state.
4. landingPreview canonical lens gating in src/game/useGame.ts:
   - Verify hover and touch previews (landing ring, capture pulse, trajectory ribbon) are suppressed when landingPreview is false.
5. Removal of navigator.webdriver sniffing in src/App.tsx.
6. Run npx tsc --noEmit and npm test.

Write your report to c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m1_iter2_reviewer_1\handoff.md with an explicit verdict (APPROVE or REQUEST_CHANGES).
Notify parent via send_message.
