# Milestone M1 Iteration 2 Review & Adversarial Challenge Report

- **Reviewer**: `m1_iter2_reviewer_1`
- **Roles**: reviewer, critic
- **Target**: Milestone M1 Iteration 2 Remediations (`m1_iter2_worker_1`)
- **Caller / Parent**: Project Orchestrator (`85856d3d-5ca8-4fac-8578-3161a39fe3a5`)
- **Date**: 2026-10-07
- **Verdict**: **APPROVE**

---

## 1. Observation

### Observation 1.1: `src/App.tsx` Line Count and Code Structure
- **Line Count**: Exactly **285 lines** in `src/App.tsx`, which satisfies the invariant strictly $< 300$ lines.
- **Formatting & Structure**:
  - Code is standard, idiomatic React formatting without artificial minification or semicolon packing.
  - Decomposed top-level state via `useUserSettings()` and `useGame()`.
  - Coordinates header, eval gauge, turn banner, board, coach panel, analysis panel, settings panel, bottom tray, and modal overlays.

### Observation 1.2: `src/game/useUserSettings.ts` Extraction
- Extracted settings state into custom hook `useUserSettings`:
  - `currentSkin`, `setCurrentSkin`, `theme`
  - `soundEnabled`, `setSoundEnabled`
  - `colorblindSafe`, `setColorblindSafe`
  - `hapticsEnabled`, `handleToggleHaptics`
  - `fontScale`, `setFontScale` (and dynamic `.font-scale-*` HTML classes)
  - `reducedMotion`, `setReducedMotion`, `isReducedMotion` (and `.reduced-motion` HTML class)
  - `bigMode`, `setBigMode`
  - `tapTwice`, `setTapTwice`
  - `speechEnabled`, `setSpeechEnabled`
- Safely synchronizes with `localStorage` and updates external audio/haptics/speech runtime singletons.

### Observation 1.3: `isAnalysisEmpty` Computation and Wiring into `AnalysisPanel.tsx`
- In `src/App.tsx:55-68`:
  ```ts
  const isAnalysisEmpty = useMemo(() => {
    return (
      activePreset === 'justPlay' ||
      (!lenses.advantageBar &&
        !lenses.bestMoveMarks &&
        !lenses.threatPits &&
        !lenses.landingPreview &&
        !lenses.coach &&
        !lenses.explanations &&
        !lenses.errorRate &&
        !lenses.winPercent &&
        !lenses.mainLine)
    );
  }, [activePreset, lenses]);
  ```
- In `src/App.tsx:204-217`: `isAnalysisEmpty`, `onApplyPreset={(p) => setLenses(applyPreset(p))}`, and `onNavigateTab` are passed to `<AnalysisPanel>`.
- In `src/components/panels/AnalysisPanel.tsx:114-147`:
  - When `isAnalysisEmpty` is true, an early return renders the calm empty state container with `data-testid="analysis-empty-state"`.
  - The empty state contains `data-testid="enable-coach-btn"` with label "Turn on Gentle Coach".
  - Candidate move evaluation rows (`data-testid="eval-row-*"`) and analysis tables are strictly suppressed.
  - Clicking `enable-coach-btn` invokes `onApplyPreset('coach')`, which updates lens state to the `coach` preset, turning `isAnalysisEmpty` to false and rendering candidate move evaluations.

### Observation 1.4: `landingPreview` Canonical Lens Gating in `src/game/useGame.ts`
- In `src/game/useGame.ts:608-615`:
  ```ts
  const hoverPreview: MoveSimulationResult | null = useMemo(() => {
    if (!lenses.landingPreview || animatingState || hoveredPit === null || displayBoard[hoveredPit] === 0) return null;
    const isP1 = state.currentPlayer === 0;
    const legalPits = isP1 ? P1_PITS : P2_PITS;
    if (!(legalPits as readonly number[]).includes(hoveredPit)) return null;

    return simulateMove(state.board, state.currentPlayer, hoveredPit, state.rules);
  }, [lenses.landingPreview, animatingState, hoveredPit, displayBoard, state.board, state.currentPlayer, state.rules]);
  ```
- When `lenses.landingPreview` is false:
  - `hoverPreview` evaluates strictly to `null`.
  - In `src/components/board/PitButton.tsx:140-155`, `previewSourcePit`, `previewLandingPit`, and `previewCapturedPit` are all null.
  - In `src/components/board/highlights.ts:51-57`, preview precedence check fails, suppressing `preview` source glow, `landing` ring + badge, and `captured` pulse + badge.
  - In `src/components/board/StorePit.tsx:43-67`, `isLanding` and `isPath` evaluate to false, suppressing store landing and trajectory glows.
  - In `src/components/shell/TurnBanner.tsx:115-123`, `{hoverPreview && ...}` trajectory ribbon is suppressed.

### Observation 1.5: Complete Removal of `navigator.webdriver` Sniffing
- Ripgrep across `src/` for `webdriver` returned 0 matches.
- In `src/App.tsx:78-87`, initial `audienceOpen` reads solely from query param and `localStorage.getItem(ONBOARDING_STORAGE_KEY)`.
- Playwright harness uses clean `storageState: './e2e/.storage-state.json'` in `playwright.config.ts` for standard tests, while `e2e/onboarding.spec.ts` uses empty storage state to test the first-run onboarding picker.

### Observation 1.6: Independent Build & Test Execution
- `npx tsc --noEmit`: Exited with code 0 (0 diagnostic errors).
- `npm test -- --run`: Exited with code 0 (17 test files passed, 171 tests passed).
- `npm run build`: Exited with code 0 (clean production build, search worker chunk generated).
- `npx playwright test e2e/m1_adversarial_stress.spec.ts`: Exited with code 0 (8/8 passed across 4 viewports).
- `npx playwright test e2e/onboarding.spec.ts`: Exited with code 0 (8/8 passed across 4 viewports).
- `npx playwright test e2e/challenger-m1.spec.ts`: Exited with code 0 (48/48 passed across 4 viewports).

---

## 2. Logic Chain

1. **Architecture & Line Count**:
   Extracting the persistent user settings hook to `src/game/useUserSettings.ts` directly relieved `src/App.tsx` of 100+ lines of state and side-effects. This brought `src/App.tsx` to 285 lines cleanly, satisfying Feature Inventory Item 3 and the `< 300` lines requirement without artificial minification.
2. **Empty State & Lens Gating**:
   `isAnalysisEmpty` correctly identifies when all analytical lenses are disabled (including `justPlay` preset). Passing this down to `AnalysisPanel` enables the specified calm empty state (`data-testid="analysis-empty-state"`), suppresses lookahead numbers, and provides a direct 1-tap pathway (`data-testid="enable-coach-btn"`) to enable coach assistance.
3. **Hover & Touch Preview Suppression**:
   Gating `hoverPreview` behind `lenses.landingPreview` at the custom hook level ensures that board components (`PitButton`, `StorePit`) and chrome components (`TurnBanner`) react consistently: when the lens is disabled, all landing rings, capture pulses, and trajectory badges disappear.
4. **Test Harness Cleanliness**:
   Removing `navigator.webdriver` eliminates a production anti-pattern where application behavior was altered based on automation flags. Shifting to Playwright's native `storageState` mechanism is standard practice and allows both returning-user and clean-launch onboarding scenarios to be independently validated.
5. **Integrity & Quality Check**:
   No hardcoded test outputs or dummy implementations were found. The code adheres to all TypeScript strict typing, accessibility tokens, and invariant constraints.

---

## 3. Caveats

- **No caveats**: All remediations were tested and verified against their specifications across all 4 target device viewports (mobile-small 360x740, mobile-iphone 393x852, tablet-portrait 768x1024, desktop-landscape 1280x800).

---

## 4. Conclusion

- **Verdict**: **APPROVE**
- All 6 task assignment deliverables have been verified and meet all project acceptance criteria:
  1. `src/App.tsx` has 285 lines (strictly $< 300$ lines) and clean architecture.
  2. `src/game/useUserSettings.ts` cleanly extracts settings state with full persistence and DOM hooks.
  3. `isAnalysisEmpty` properly computes and wires to `AnalysisPanel.tsx`, displaying `data-testid="analysis-empty-state"` and `data-testid="enable-coach-btn"` in `justPlay` mode, suppressing evaluations, and enabling coach mode upon click.
  4. `landingPreview` in `src/game/useGame.ts` correctly gates all hover/touch preview indicators.
  5. `navigator.webdriver` sniffing is completely removed from production code.
  6. `npx tsc --noEmit`, `npm test`, `npm run build`, and targeted Playwright suites pass cleanly with 0 errors.

---

## 5. Verification Method

To independently verify these results:

```powershell
# 1. Typecheck
npx tsc --noEmit

# 2. Vitest Unit & Adversarial Test Suites (17 files, 171 tests)
npm test -- --run

# 3. Line Count Invariant Check (< 300)
(Get-Content src/App.tsx).Length

# 4. Production Build Check
npm run build

# 5. Playwright Targeted E2E Suites across 4 viewports
npx playwright test e2e/m1_adversarial_stress.spec.ts
npx playwright test e2e/onboarding.spec.ts
npx playwright test e2e/challenger-m1.spec.ts
```
