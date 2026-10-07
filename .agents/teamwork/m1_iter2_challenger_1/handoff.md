# Adversarial Challenge Report: Milestone M1 Iteration 2

- **Agent**: `m1_iter2_challenger_1`
- **Role**: Empirical Challenger (critic, specialist)
- **Target Milestone**: Milestone M1 (Phase 1: Calm UI, Accessibility, Languages, Onboarding) — Iteration 2
- **Caller / Parent**: Project Orchestrator (`85856d3d-5ca8-4fac-8578-3161a39fe3a5`)
- **Date**: 2026-10-07
- **Verdict**: **APPROVE**

---

## 1. Observation

### Observation 1.1: Playwright Adversarial Stress Suite across 4 Viewports
Executed `npx playwright test e2e/m1_adversarial_stress.spec.ts` across all 4 configured projects/viewports (`mobile-small`: 360x740, `mobile-iphone`: 393x852, `tablet-portrait`: 768x1024, `desktop-landscape`: 1280x800).
Results:
```
Running 12 tests using 4 workers

  ok  4 [mobile-iphone] › e2e\m1_adversarial_stress.spec.ts:9:3 › M1 Adversarial E2E Stress Suite › Touch preview cancellation: preview cleans up instantly on touch-end, touch-cancel, and touch-move (5.7s)
  ok  1 [mobile-small] › e2e\m1_adversarial_stress.spec.ts:9:3 › M1 Adversarial E2E Stress Suite › Touch preview cancellation: preview cleans up instantly on touch-end, touch-cancel, and touch-move (6.0s)
  ok  2 [mobile-small] › e2e\m1_adversarial_stress.spec.ts:72:3 › M1 Adversarial E2E Stress Suite › Lens Presets: justPlay strictly disables all analysis UI and renders empty state on Analysis tab (6.3s)
  ok  3 [mobile-small] › e2e\m1_adversarial_stress.spec.ts:124:3 › M1 Adversarial E2E Stress Suite › Landing Preview Lens: toggling landingPreview off suppresses all landing rings, capture pulses, and trajectory badges (7.7s)
  ok  5 [mobile-iphone] › e2e\m1_adversarial_stress.spec.ts:72:3 › M1 Adversarial E2E Stress Suite › Lens Presets: justPlay strictly disables all analysis UI and renders empty state on Analysis tab (5.3s)
  ok  6 [tablet-portrait] › e2e\m1_adversarial_stress.spec.ts:9:3 › M1 Adversarial E2E Stress Suite › Touch preview cancellation: preview cleans up instantly on touch-end, touch-cancel, and touch-move (3.9s)
  ok  7 [mobile-iphone] › e2e\m1_adversarial_stress.spec.ts:124:3 › M1 Adversarial E2E Stress Suite › Landing Preview Lens: toggling landingPreview off suppresses all landing rings, capture pulses, and trajectory badges (4.3s)
  ok  8 [tablet-portrait] › e2e\m1_adversarial_stress.spec.ts:124:3 › M1 Adversarial E2E Stress Suite › Landing Preview Lens: toggling landingPreview off suppresses all landing rings, capture pulses, and trajectory badges (4.5s)
  ok  9 [tablet-portrait] › e2e\m1_adversarial_stress.spec.ts:72:3 › M1 Adversarial E2E Stress Suite › Lens Presets: justPlay strictly disables all analysis UI and renders empty state on Analysis tab (5.4s)
  ok 11 [desktop-landscape] › e2e\m1_adversarial_stress.spec.ts:72:3 › M1 Adversarial E2E Stress Suite › Lens Presets: justPlay strictly disables all analysis UI and renders empty state on Analysis tab (3.4s)
  ok 10 [desktop-landscape] › e2e\m1_adversarial_stress.spec.ts:9:3 › M1 Adversarial E2E Stress Suite › Touch preview cancellation: preview cleans up instantly on touch-end, touch-cancel, and touch-move (4.0s)
  ok 12 [desktop-landscape] › e2e\m1_adversarial_stress.spec.ts:124:3 › M1 Adversarial E2E Stress Suite › Landing Preview Lens: toggling landingPreview off suppresses all landing rings, capture pulses, and trajectory badges (3.4s)

  12 passed (43.0s)
```

### Observation 1.2: Verification of Analysis Empty State & One-Tap Coach Restore
In `src/App.tsx:55-68`, `isAnalysisEmpty` is computed dynamically:
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
In `src/App.tsx:215-216`, `isAnalysisEmpty`, `onApplyPreset={(p) => setLenses(applyPreset(p))}`, and `onNavigateTab={(tab) => setMobileTab(tab)}` are wired into `<AnalysisPanel>`.
In `src/components/panels/AnalysisPanel.tsx:114-147`:
- When `isAnalysisEmpty` is true, renders `<div data-testid="analysis-empty-state">` with description and `<button data-testid="enable-coach-btn">Turn on Gentle Coach</button>`.
- In `e2e/m1_adversarial_stress.spec.ts:99-121`:
  - When switching to `justPlay` preset, `[data-testid="analysis-empty-state"]` is visible and `[data-testid="enable-coach-btn"]` is visible.
  - Candidate move rows `[data-testid="eval-row-0"]` are not rendered.
  - Clicking `[data-testid="enable-coach-btn"]` restores `preset-coach` (`aria-pressed="true"`), dismisses `[data-testid="analysis-empty-state"]`, and restores candidate evaluations (`[data-testid="eval-row-0"]:visible`).

### Observation 1.3: Verification of Landing Preview Suppression
In `src/game/useGame.ts:608-615`:
```ts
  const hoverPreview: MoveSimulationResult | null = useMemo(() => {
    if (!lenses.landingPreview || animatingState || hoveredPit === null || displayBoard[hoveredPit] === 0) return null;
    const isP1 = state.currentPlayer === 0;
    const legalPits = isP1 ? P1_PITS : P2_PITS;
    if (!(legalPits as readonly number[]).includes(hoveredPit)) return null;

    return simulateMove(state.board, state.currentPlayer, hoveredPit, state.rules);
  }, [lenses.landingPreview, animatingState, hoveredPit, displayBoard, state.board, state.currentPlayer, state.rules]);
```
In `e2e/m1_adversarial_stress.spec.ts:124-203`:
- Toggled `landingPreview` off (via `[data-testid="lens-landingPreview"]`).
- Hovered on pit 0 (desktop) and dispatched 350ms touch press on pit 0 (mobile/tablet/desktop).
- Verified:
  - Landing pit 4 has zero landing ring classes (`ring-emerald-400`, `ring-lime-400`).
  - Zero pits render `LAND` or `CAPT` badges.
  - Pits 7..12 render zero capture pulse rings (`ring-rose-500`, `ring-red-500`).
  - Turn banner renders zero `Landing:` trajectory badges.

### Observation 1.4: Unit Stress Test Verification
Executed `npm test -- src/i18n/i18n.test.ts src/m1_adversarial_stress.test.ts`:
```
 RUN  v2.1.9 C:/Users/vjbel/hacks/mymancala

 ✓ src/i18n/i18n.test.ts (11 tests) 112ms
 ✓ src/m1_adversarial_stress.test.ts (11 tests) 4116ms
   ✓ M1 Adversarial Challenge 1: Highlight Precedence & Visual Invariants > strictly enforces single highlight role across exhaustive combinatoric state permutations 4033ms

 Test Files  2 passed (2)
      Tests  22 passed (22)
```
- `src/i18n/i18n.test.ts`:
  - 1:1 key parity across `en`, `ar`, `es`.
  - Non-empty translations and 10 calm tactical glossary definitions.
  - Arabic CLDR plural forms across all 6 categories: `zero` (0), `one` (1), `two` (2), `few` (3..10, 103..110), `many` (11..99, 111..199), `other` (100, 101, 102, 200, 300, 1000).
  - English and Spanish plural formatting.
- `src/m1_adversarial_stress.test.ts`:
  - Highlight precedence across >10,000 combinatoric state permutations (`preview` > `best` > `lastMove` > `threat` > `playable` > `none`).
  - Skin styling collision prevention (at most one badge per pit; playable/preview ring-only).
  - Loop-around board edge case (preview source pit == landing pit).
  - Game-over highlight suppression.
  - Rapid preset transitions across all 4 presets.
  - Legacy alias bidirectional sync (`advantageBar` <-> `evalBar`, `bestMoveMarks` <-> `bestMoveHighlight`, `coach` <-> `explanations`, `mainLine` <-> `principalVariation`).
  - Serialization resilience in `localStorage`.
  - Translation fallback and error handling with malformed/hostile parameters.

### Observation 1.5: Invariants and Full Regression Matrix
1. **Typecheck**: `npx tsc --noEmit` exited with code 0 (zero errors).
2. **Line Count**: `(Get-Content src/App.tsx).Length` returned 284 lines (strictly `< 300 lines`).
3. **Full Vitest Suite**: `npm test -- --run` ran 17 test files, 171 tests — 100% passed (0 failed).
4. **Production Build**: `npm run build` compiled cleanly in 1m 31s with `search.worker` chunk generated.
5. **Full Playwright Matrix**: `npx playwright test` ran 196 tests across all 4 viewports (`mobile-small`, `mobile-iphone`, `tablet-portrait`, `desktop-landscape`) — 100% passed (196 passed, 0 failed, 0 skipped).

---

## 2. Logic Chain

1. **Empty State & Coach Preset Switch**:
   - In M1 Iteration 1, `<AnalysisPanel>` was decoupled from preset switching and empty-state flags.
   - Observation 1.2 confirms that `isAnalysisEmpty` is calculated using both preset state (`justPlay`) and individual lens gates.
   - When in `justPlay`, `<AnalysisPanel>` conditionally returns the calm empty state container (`data-testid="analysis-empty-state"`), suppressing candidate rows.
   - Clicking `data-testid="enable-coach-btn"` triggers `onApplyPreset('coach')`, which updates the lens state, clears `isAnalysisEmpty`, restores candidate move evaluation rows (`data-testid="eval-row-0"`), and marks `preset-coach` active (`aria-pressed="true"`).

2. **Landing Preview Lens Suppression**:
   - Observation 1.3 proves that `useGame.ts` gates `hoverPreview` by `lenses.landingPreview`.
   - When `landingPreview` is false, `hoverPreview` evaluates to `null`.
   - In `PitButton.tsx`, `previewSourcePit`, `previewLandingPit`, and `previewCapturedPit` all become `null`.
   - In `TurnBanner.tsx`, the trajectory badge requires truthy `hoverPreview` and therefore does not render.
   - Consequently, hovering or touching pit 0 produces zero landing rings, zero capture pulses, and zero trajectory indicators in the DOM.

3. **Plural Localization & Catalog Parity**:
   - Observation 1.4 proves that `board.stones` is properly localized in `en`, `ar`, and `es`, and the translation engine implements Intl.PluralRules conforming to CLDR Arabic plural grammar across all 6 categories.
   - Hardcoded stone strings in `TurnBanner` and `StorePit` were replaced with localized translation function calls.

4. **Production Quality & Invariant Conservation**:
   - Observation 1.5 proves that `src/App.tsx` remains strictly under the 300-line budget (284 lines) without minification or code cramming, the typechecker reports zero diagnostic errors, all 171 unit tests pass, and all 196 Playwright tests pass across all target devices.

---

## 3. Caveats

No caveats. All assigned adversarial challenges and stress scenarios were verified empirically and reproduced cleanly in automated test suites without regressions.

---

## 4. Conclusion

**Verdict**: **APPROVE**

Milestone M1 Iteration 2 satisfies all architectural, functional, accessibility, and testing specifications:
- Analysis empty state and one-tap coach enable button operate correctly in `justPlay`.
- Clicking the one-tap coach button restores the `coach` preset and reveals candidate evaluations.
- `landingPreview` lens disabling cleanly suppresses all landing rings, pulses, badges, and trajectory indicators.
- Arabic CLDR plural forms and 1:1 catalog parity are fully covered and verified.
- The entire Playwright matrix (196/196 tests) and Vitest matrix (171/171 tests) pass cleanly across all 4 viewports.

---

## 5. Verification Method

To independently reproduce and verify this report:

```powershell
# 1. Typecheck
npx tsc --noEmit

# 2. Line count guardrail (< 300 lines)
powershell -Command "(Get-Content src/App.tsx).Length"

# 3. Unit and stress tests
npm test -- src/i18n/i18n.test.ts src/m1_adversarial_stress.test.ts
npm test -- --run

# 4. Production build
npm run build

# 5. Playwright adversarial stress suite across 4 viewports (12 tests)
npx playwright test e2e/m1_adversarial_stress.spec.ts

# 6. Full Playwright E2E matrix across 4 viewports (196 tests)
npx playwright test
```

### Invalidation Conditions
- Any Playwright test in `e2e/m1_adversarial_stress.spec.ts` fails on any of the 4 viewports.
- Candidate evaluations fail to restore when clicking `enable-coach-btn`.
- Landing rings or trajectory badges appear when `landingPreview` is toggled off.
- `npx tsc --noEmit` reports diagnostic errors.
- `src/App.tsx` line count reaches or exceeds 300 lines.
