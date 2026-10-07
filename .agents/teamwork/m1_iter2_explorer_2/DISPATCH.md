# Task Assignment: M1 Iteration 2 Explorer 2 (A11y, Contrast, Font Floor & Touch Ergonomics)

## Objective
Analyze and provide concrete fix specifications for:
1. **WCAG AA Color Contrast on Porcelain Skin in `AnalysisPanel.tsx`**:
   - Contrast of `#10b981` (`text-emerald-500`) on porcelain backgrounds (`#fffefe` / `#fef4e6`) is 2.33:1–2.51:1 (failing WCAG AA >= 4.5:1).
   - In `AnalysisPanel.tsx` (lines 265, 366, 375, 383), replace `text-emerald-500` with skin-aware token:
     `currentSkin === 'porcelain' ? 'text-emerald-800' : 'text-emerald-500'` (or `text-emerald-900`) for `0.000` and `[Free Turn]` badges.
   - Verify with Axe-core that `desktop-landscape` porcelain audit achieves 0 critical and 0 serious violations.
2. **Hard Font Floor >= 12px at Scale M**:
   - In `src/components/shell/BottomTray.tsx`, `EvalGauge.tsx`, `TutorialModal.tsx`, `PVDisplay.tsx`:
     Replace hardcoded `text-[9px]`, `text-[10px]`, `text-[11px]` with `.text-floor` / `text-xs` (minimum 12px at scale M).
   - Ensure all 25 element violations reported by `challenger-m1.spec.ts` are resolved.
3. **`PitButton.tsx` Touch Ergonomics & Timer Cleanup**:
   - Add `useEffect` cleanup for `longPressTimerRef` on unmount.
   - In `handleTouchEnd`, add `e.preventDefault()` when `!tapTwice` before calling `onClick()` to prevent duplicate click dispatch on touch devices.
4. **`DiagnosticsModal.tsx` Keyboard Navigation**:
   - Add `Escape` key listener to dismiss the modal and wrap in focus trap.

## Input Artifacts
- `c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m1_reviewer_2\handoff.md`
- `c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m1_challenger_2\handoff.md`
- `c:\Users\vjbel\hacks\mymancala\src\components\panels\AnalysisPanel.tsx`
- `c:\Users\vjbel\hacks\mymancala\src\components\shell\BottomTray.tsx`
- `c:\Users\vjbel\hacks\mymancala\src\components\shell\EvalGauge.tsx`
- `c:\Users\vjbel\hacks\mymancala\src\components\board\PitButton.tsx`
- `c:\Users\vjbel\hacks\mymancala\src\components\modals\DiagnosticsModal.tsx`

## Deliverables
Write detailed fix plan and code diffs to `c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m1_iter2_explorer_2\handoff.md`.


## 2026-10-07T04:32:43Z
You are m1_iter2_explorer_2.
Your working directory is c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m1_iter2_explorer_2.
Your caller/parent is the Project Orchestrator (ID: 85856d3d-5ca8-4fac-8578-3161a39fe3a5).

MANDATORY FIRST STEP: Read the original user request at:
c:\Users\vjbel\hacks\mymancala\.agents\teamwork\ORIGINAL_REQUEST.md
Also read PROJECT.md at:
c:\Users\vjbel\hacks\mymancala\PROJECT.md
And your task assignment at:
c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m1_iter2_explorer_2\DISPATCH.md
And previous failure reports at:
- c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m1_reviewer_2\handoff.md
- c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m1_challenger_2\handoff.md

Inspect:
- src/components/panels/AnalysisPanel.tsx
- src/components/shell/BottomTray.tsx
- src/components/shell/EvalGauge.tsx
- src/components/modals/TutorialModal.tsx
- src/components/panels/PVDisplay.tsx
- src/components/board/PitButton.tsx
- src/components/modals/DiagnosticsModal.tsx

Analyze and provide concrete specifications for:
1. WCAG AA Color Contrast on Porcelain Skin in AnalysisPanel.tsx:
   - Replace text-emerald-500 with skin-aware class: currentSkin === 'porcelain' ? 'text-emerald-800' : 'text-emerald-500' (or text-emerald-900) for 0.000 and [Free Turn] badges, achieving >= 4.5:1 contrast against light cream backgrounds (#fef4e6, #fffefe).
2. Hard Font Floor >= 12px at scale M:
   - Identify every arbitrary Tailwind class (text-[9px], text-[10px], text-[11px]) in BottomTray.tsx, EvalGauge.tsx, TutorialModal.tsx, PVDisplay.tsx.
   - Replace with .text-floor / text-xs ensuring computed font size is >= 12px at scale M across all visible elements.
3. PitButton.tsx Touch Ergonomics & Timer Cleanup:
   - Add useEffect unmount cleanup for longPressTimerRef.
   - In handleTouchEnd, add e.preventDefault() on normal taps before onClick() to prevent duplicate synthetic click events on touch devices.
4. DiagnosticsModal.tsx Keyboard Navigation:
   - Add Escape key listener to close modal and wrap in focus trap.

Write your report to c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m1_iter2_explorer_2\handoff.md.
Send a message to your parent (ID: 85856d3d-5ca8-4fac-8578-3161a39fe3a5) when done.
