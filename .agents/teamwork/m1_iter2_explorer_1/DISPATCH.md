# Task Assignment: M1 Iteration 2 Explorer 1 (App Architecture, Empty State, Lenses & Onboarding)

## Objective
Analyze and provide concrete fix specifications for:
1. **Empty State & Preset Wiring in `src/App.tsx`**:
   - Compute `isAnalysisEmpty`: `activePreset === 'justPlay' || (!lenses.advantageBar && !lenses.bestMoveMarks && !lenses.threatPits && !lenses.landingPreview && !lenses.coach && !lenses.explanations && !lenses.errorRate && !lenses.winPercent && !lenses.mainLine)`.
   - Pass `isAnalysisEmpty={isAnalysisEmpty}`, `onApplyPreset={(p) => setLenses(applyPreset(p))}`, and `onNavigateTab={(tab) => setMobileTab(tab)}` to `<AnalysisPanel />`.
   - Ensure `AnalysisPanel.tsx` suppresses candidate move tables and renders `data-testid="analysis-empty-state"` and `data-testid="enable-coach-btn"`.
2. **Canonical Lens `landingPreview` Integration**:
   - In `src/game/useGame.ts`, gate `hoverPreview` by `lenses.landingPreview`:
     `if (!lenses.landingPreview || animatingState || hoveredPit === null || ...) return null;`
   - Ensure toggling `landingPreview` off (or using `justPlay` / `hints`) completely suppresses landing glow and capture badges on hover/touch.
3. **Remove `navigator.webdriver` Sniffing in `src/App.tsx`**:
   - Remove `navigator.webdriver` check from `App.tsx:98`.
   - In test setup (`test.beforeEach` or url param or localStorage), ensure tests that do not test onboarding can cleanly set `localStorage.setItem('mancala_onboarding_v1', 'done')` so `AudiencePickerModal` doesn't block background clicks, while dedicated onboarding tests can verify it on clean launch.
4. **`src/App.tsx` Line Count Guard**:
   - Verify `src/App.tsx` line count remains strictly `< 300 lines` without code minification. Consider extracting user settings state into a custom hook if helpful.

## Input Artifacts
- `c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m1_reviewer_1\handoff.md`
- `c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m1_reviewer_2\handoff.md`
- `c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m1_challenger_1\handoff.md`
- `c:\Users\vjbel\hacks\mymancala\src\App.tsx`
- `c:\Users\vjbel\hacks\mymancala\src\components\panels\AnalysisPanel.tsx`
- `c:\Users\vjbel\hacks\mymancala\src\game\useGame.ts`

## Deliverables
Write detailed fix plan and code diffs to `c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m1_iter2_explorer_1\handoff.md`.


## 2026-10-07T04:32:43Z
You are m1_iter2_explorer_1.
Your working directory is c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m1_iter2_explorer_1.
Your caller/parent is the Project Orchestrator (ID: 85856d3d-5ca8-4fac-8578-3161a39fe3a5).

MANDATORY FIRST STEP: Read the original user request at:
c:\Users\vjbel\hacks\mymancala\.agents\teamwork\ORIGINAL_REQUEST.md
Also read PROJECT.md at:
c:\Users\vjbel\hacks\mymancala\PROJECT.md
And your task assignment at:
c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m1_iter2_explorer_1\DISPATCH.md
And previous failure reports at:
- c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m1_reviewer_1\handoff.md
- c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m1_reviewer_2\handoff.md
- c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m1_challenger_1\handoff.md

Inspect:
- src/App.tsx
- src/components/panels/AnalysisPanel.tsx
- src/lenses.ts
- src/game/useGame.ts
- src/components/modals/AudiencePickerModal.tsx

Analyze and provide concrete specifications for:
1. Empty State & Preset Wiring in src/App.tsx
2. Canonical Lens landingPreview Integration
3. Remove navigator.webdriver sniffing in App.tsx
4. App.tsx Line Count Invariant (< 300 lines)
