# Task Assignment: M1 Iteration 2 Reviewer 2 (A11y, Contrast, Font Floor & i18n)

## Objective
Review the M1 Iteration 2 remediations:
1. Color contrast on porcelain skin in `AnalysisPanel.tsx` (must be >= 4.5:1 WCAG AA, target >= 7:1 WCAG AAA).
2. Hard font floor >= 12px at scale M: verify no visible text element renders below 12px in `BottomTray.tsx`, `EvalGauge.tsx`, `Header.tsx`, `TutorialModal.tsx`, `PVDisplay.tsx`, `PVSheet.tsx`, `CoachPanel.tsx`, `DiagnosticsModal.tsx`.
3. `PitButton.tsx` touch ergonomics: `useEffect` unmount timer cleanup, normal tap `e.preventDefault()`, and `tapTwice` support without `landingPreview`.
4. `DiagnosticsModal.tsx` accessibility: `Escape` key dismissal and focus trap via `trapFocus`.
5. Localized stone counts: `TurnBanner.tsx`, `StorePit.tsx`, `a11y.ts`, and 100% key parity for `'board.stones'` across `en.ts`, `ar.ts`, and `es.ts`.
6. Run `npm run build` and `npx playwright test`.

## Input Artifacts
- `c:\Users\vjbel\hacks\mymancala\src\components\panels\AnalysisPanel.tsx`
- `c:\Users\vjbel\hacks\mymancala\src\components\shell\BottomTray.tsx`
- `c:\Users\vjbel\hacks\mymancala\src\components\shell\EvalGauge.tsx`
- `c:\Users\vjbel\hacks\mymancala\src\components\board\PitButton.tsx`
- `c:\Users\vjbel\hacks\mymancala\src\components\modals\DiagnosticsModal.tsx`
- `c:\Users\vjbel\hacks\mymancala\src\components\shell\TurnBanner.tsx`
- `c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m1_iter2_worker_1\handoff.md`

## Deliverables
Write your review report to `c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m1_iter2_reviewer_2\handoff.md` with an explicit verdict (**APPROVE** or **REQUEST_CHANGES**).
Notify your parent via `send_message`.


## 2026-10-07T05:02:36Z
You are m1_iter2_reviewer_2.
Your working directory is c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m1_iter2_reviewer_2.
Your caller/parent is the Project Orchestrator (ID: 85856d3d-5ca8-4fac-8578-3161a39fe3a5).

MANDATORY FIRST STEP: Read the original user request at:
c:\Users\vjbel\hacks\mymancala\.agents\teamwork\ORIGINAL_REQUEST.md
Also read PROJECT.md at:
c:\Users\vjbel\hacks\mymancala\PROJECT.md
And your task assignment at:
c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m1_iter2_reviewer_2\DISPATCH.md
And the worker handoff report at:
c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m1_iter2_worker_1\handoff.md

Review the M1 Iteration 2 remediations:
1. Color contrast on porcelain skin in AnalysisPanel.tsx (must be >= 4.5:1 WCAG AA, target >= 7:1 WCAG AAA).
2. Hard font floor >= 12px at scale M: verify no visible text element renders below 12px in BottomTray.tsx, EvalGauge.tsx, Header.tsx, TutorialModal.tsx, PVDisplay.tsx, PVSheet.tsx, CoachPanel.tsx, DiagnosticsModal.tsx.
3. PitButton.tsx touch ergonomics: useEffect unmount timer cleanup, normal tap e.preventDefault(), and tapTwice support without landingPreview.
4. DiagnosticsModal.tsx accessibility: Escape key dismissal and focus trap via trapFocus.
5. Localized stone counts: TurnBanner.tsx, StorePit.tsx, a11y.ts, and 100% key parity for 'board.stones' across en.ts, ar.ts, and es.ts.
6. Run npm run build and npx playwright test.

Write your report to c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m1_iter2_reviewer_2\handoff.md with an explicit verdict (APPROVE or REQUEST_CHANGES).
Notify parent via send_message.
