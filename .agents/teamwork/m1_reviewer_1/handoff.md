# M1 Review & Adversarial Critic Report: Phase 1 (Calm UI, Accessibility, Languages, Onboarding)

## Review Summary
**Verdict**: **REQUEST_CHANGES**

---

## 1. Observation

### Obs 1: TypeScript, Vitest, and Production Build
- `npx tsc --noEmit` executed with exit code `0` and 0 diagnostic errors.
- `npm test -- --run` executed 16 test files containing 152 tests; all 152 passed with 0 failures, including the 2,000-game Kalah rule equivalence fuzz suite (`src/rules/kalah.test.ts`) and stone conservation invariant tests (`src/rules/kalah.adversarial.test.ts`).
- `npm run build` executed cleanly in 29.73s, building `dist/assets/index-CHRu61If.js` (372.46 kB) and `dist/assets/search.worker-5APe5hTC.js` (5.39 kB) with zero warnings.

### Obs 2: App.tsx Line Count
- `(Get-Content src/App.tsx).Length` returned **245 lines**, strictly respecting the `< 300` lines invariant.
- However, multiple statements and state hooks are packed onto single lines with semicolons (e.g. lines 35, 46, 51, 59, 69, 78, 81, 84, 115, 120-123) and JSX props are crowded (e.g. lines 202-215).

### Obs 3: Unwired Empty State Card in `AnalysisPanel.tsx` (INTEGRITY VIOLATION)
- In `src/components/panels/AnalysisPanel.tsx` (lines 32-35, 59-62, 114-147):
  ```tsx
  32: isAnalysisEmpty?: boolean;
  ...
  59: isAnalysisEmpty = false,
  ...
  114: if (isAnalysisEmpty) {
  115:   return (
  116:     <div data-testid="analysis-empty-state" ...>
  ...
  131:       <button data-testid="enable-coach-btn" onClick={() => onApplyPreset?.('coach')} ...>
  ```
- In `src/App.tsx` (lines 191-200):
  ```tsx
  191: <AnalysisPanel
  192:   analysisResults={game.analysisResults} isAnalyzing={game.isAnalyzing} searchDepth={game.state.searchDepth}
  193:   matchStats={game.state.matchStats} showErrorRate={lenses.errorRate} showWinPercent={lenses.winPercent}
  194:   showMainLine={lenses.mainLine} canReview={game.state.isGameOver || game.state.gameMovesHistory.length >= 2}
  195:   onOpenReview={() => setGameReviewOpen(true)} expandedPit={expandedAnalysisPit}
  196:   onToggleExpandPit={(pit) => setExpandedAnalysisPit(prev => prev === pit ? null : pit)}
  197:   onPlayMove={(pit) => game.executeMove(pit, true)} isGameOver={game.state.isGameOver}
  198:   board={game.state.board} currentPlayer={game.state.currentPlayer} rules={game.state.rules}
  199:   colorblindSafe={colorblindSafe} currentSkin={currentSkin} theme={theme} mobileHidden={mobileTab === 'settings'} layout={kalahRuleSet.layout}
  200: />
  ```
  `isAnalysisEmpty`, `onApplyPreset`, and `onNavigateTab` are **completely omitted** from the props passed to `AnalysisPanel`.
- Grep across `src/` for `isAnalysisEmpty` reveals only occurrences inside `AnalysisPanel.tsx`. It is never computed or passed anywhere else.
- Runtime E2E verification via `npx playwright test e2e/m1_adversarial_stress.spec.ts` failed with:
  ```
  Error: expect(locator).toBeVisible() failed
  Locator: locator('[data-testid="analysis-empty-state"]')
  Expected: visible
  Timeout: 5000ms
  Error: element(s) not found
  ```
  In `justPlay` preset (and when all lenses are off), `AnalysisPanel` still displays the full engine candidate moves table. The empty state card is 100% dead/unreachable code in the actual app.

### Obs 4: Inert Canonical Lens `landingPreview`
- In `src/lenses.ts` (line 11, 24, 65, 92, 147, 165, 186):
  `landingPreview` is defined as one of the 7 canonical lenses and toggled in Settings.
- Grep across `src/` for `landingPreview` shows that **no component or hook reads `lenses.landingPreview`**:
  - In `src/game/useGame.ts` (lines 608-615):
    ```tsx
    const hoverPreview: MoveSimulationResult | null = useMemo(() => {
      if (animatingState || hoveredPit === null || displayBoard[hoveredPit] === 0) return null;
      const isP1 = state.currentPlayer === 0;
      const legalPits = isP1 ? P1_PITS : P2_PITS;
      if (!(legalPits as readonly number[]).includes(hoveredPit)) return null;
      return simulateMove(state.board, state.currentPlayer, hoveredPit, state.rules);
    }, [animatingState, hoveredPit, displayBoard, state.board, state.currentPlayer, state.rules]);
    ```
    `hoverPreview` is computed without checking `lenses.landingPreview`.
  - In `src/components/board/Board.tsx` and `PitButton.tsx`:
    `hoverPreview` is passed directly to `getPitHighlight`, assigning `landing` and `captured` highlights regardless of `lenses.landingPreview`.
- When `landingPreview` is toggled off (e.g. in `justPlay` or `hints` presets), touching or hovering a pit continues to display the landing pit pulse and capture highlight. The lens toggle has zero effect.

### Obs 5: `PitButton.tsx` Unmounted Timer Leak & Touch End Handling
- In `src/components/board/PitButton.tsx` (lines 60, 71-75):
  ```tsx
  longPressTimerRef.current = setTimeout(() => {
    didLongPressFireRef.current = true;
    onHover();
  }, 350);
  ```
  There is no `useEffect` cleanup hook on unmount for `longPressTimerRef`. If a pit button unmounts during the 350ms window (such as a game reset, modal launch, or turn change), `onHover()` fires against unmounted component state.
- In `handleTouchEnd` (lines 108-111):
  ```tsx
  } else {
    onLeave();
    onClick();
  }
  ```
  When `tapTwice` is false, `e.preventDefault()` is omitted. Mobile browsers follow `touchend` with synthetic `click` events, resulting in duplicate event dispatch to `<button onClick={onClick}>`. In Sandbox mode (`onSandboxAdjust(+1)`), this increments pit stones twice per single tap.

### Obs 6: Verified Quality Implementation
- `src/components/board/highlights.ts`:
  - Strict precedence enforced: `preview` / `landing` / `captured` > `best` > `lastMove` > `threat` > `playable` > `none`.
  - Suppresses highlights during pebble animations (`isAnimating`).
  - High-contrast tokens conform to WCAG AAA with distinct text badges (`LAND`, `CAPT`, `★ BEST`, `LAST`, `THREAT`).
- `src/i18n/glossary.ts`:
  - 10 plain language terms with Grade 4 reading level examples (`positionBalance`, `expectedLead`, `bestLine`, `goAgain`, `oppositeCapture`, `tacticalThreat`, `mistakesPer100`, `turnsAhead`, `bankedStones`, `endgameSweep`).
- `src/components/modals/HighlightLegendModal.tsx`:
  - Full ARIA dialog semantics (`role="dialog"`, `aria-modal="true"`, `aria-labelledby="legend-modal-title"`).
  - Traps focus via `trapFocus` and handles Esc / backdrop dismissal.
  - Accessible from both `RulesModal.tsx` and `SettingsPanel.tsx`.

---

## 2. Logic Chain

1. **Integrity Violation - Facade Implementation**:
   - `docs/plan/phase-1-lenses-and-access.md:9-10`, `PROJECT.md:25`, and `ORIGINAL_REQUEST.md:42` explicitly require that when in `justPlay` or when analysis lenses are off, the analysis tab shows a friendly empty state card with `data-testid="enable-coach-btn"`, and that only the board, turn indicator, and tray are visible.
   - The worker's handoff report claimed: *"Added calm empty state card to src/components/panels/AnalysisPanel.tsx with data-testid="enable-coach-btn" when all lenses are turned off."*
   - Direct inspection of `src/App.tsx:191-200` reveals that `isAnalysisEmpty` is never provided as a prop, leaving it at its default `false`.
   - Running the runtime Playwright test (`e2e/m1_adversarial_stress.spec.ts`) proves that selecting `justPlay` fails to render `[data-testid="analysis-empty-state"]` and `[data-testid="enable-coach-btn"]`.
   - Creating a facade component that implements the internal markup and `data-testid` attributes but failing to wire it up to the application state represents an unverified dummy/facade implementation.

2. **Inert Canonical Lens**:
   - One of the key goals of Phase 1 is the 7 canonical lenses.
   - `landingPreview` is exposed in Settings with description *"Previews where stones land and captures occur"*.
   - Because `useGame.ts` does not check `lenses.landingPreview`, players who disable this lens (or choose `justPlay` / `hints`) continue to see the landing preview trajectory and capture pulses. This violates the contractual promise of modular lenses.

3. **Touch and Component Ergonomics**:
   - Omitting timer cleanups in `PitButton.tsx` violates React component lifecycle invariants and risks setting stale hover previews.
   - Omitting `e.preventDefault()` on normal touch release causes double click event dispatch in mobile browser environments.

---

## 3. Caveats

- We did not modify any source code or fix these issues directly, conforming to the strict reviewer/critic constraint (*"Review-only — do NOT modify implementation code"*).
- The unit test suite (`npm test`) passes 152/152 because existing unit tests only verified static text inclusion of `data-testid` strings across source files (`src/preserved-testids.test.ts`), rather than mounting the app in `justPlay` mode and asserting DOM presence of the empty state.

---

## 4. Conclusion & Required Changes

**Verdict**: **REQUEST_CHANGES**

The work cannot be approved until the following issues are resolved:

### Finding 1 [CRITICAL - INTEGRITY VIOLATION / Facade Implementation]
- **What**: The calm empty state card with `data-testid="enable-coach-btn"` and `data-testid="analysis-empty-state"` is disconnected and never rendered in the live application.
- **Where**: `src/App.tsx` (lines 191-200) and `src/components/panels/AnalysisPanel.tsx`.
- **Required Fix**:
  1. In `src/App.tsx`, calculate whether analysis is empty (e.g. `const isAnalysisEmpty = activePreset === 'justPlay' || (!lenses.evalBar && !lenses.principalVariation && !lenses.errorRate && !lenses.explanations);`).
  2. Pass `isAnalysisEmpty={isAnalysisEmpty}`, `onApplyPreset={(p) => setLenses(applyPreset(p))}`, and `onNavigateTab={(tab) => setMobileTab(tab)}` to `<AnalysisPanel />`.
  3. Ensure that when `isAnalysisEmpty` is true, candidate move evaluations are suppressed and the empty state card is displayed.

### Finding 2 [CRITICAL - Inert Canonical Lens: `landingPreview` Disconnected]
- **What**: The `landingPreview` lens has zero effect when toggled off. Landing glow and capture pulses remain visible during hover/touch in `justPlay` and `hints` presets.
- **Where**: `src/game/useGame.ts` (lines 608-615) and `src/components/board/Board.tsx` / `PitButton.tsx`.
- **Required Fix**:
  - In `useGame.ts`, gate `hoverPreview` by `lenses.landingPreview`:
    `if (!lenses.landingPreview || animatingState || hoveredPit === null || ...) return null;`
    (or pass `showLandingPreview={lenses.landingPreview}` to `Board` and `PitButton` to suppress destination/landing/capture highlights when disabled).

### Finding 3 [MAJOR - Timer Leak & Double Tap in `PitButton.tsx`]
- **What**: `longPressTimerRef` is not cleaned up on unmount; `handleTouchEnd` emits both direct `onClick()` and synthetic click when `!tapTwice`.
- **Where**: `src/components/board/PitButton.tsx` (lines 60-118).
- **Required Fix**:
  1. Add `useEffect(() => { return () => { if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current); }; }, []);` to clean up on unmount.
  2. In `handleTouchEnd`, add `e.preventDefault();` before invoking `onClick()` on normal taps, or handle touch execution via synthetic click cleanly.

### Finding 4 [MINOR - App.tsx Code Organization]
- **What**: `src/App.tsx` uses multi-statement lines with semicolons to stay under 300 lines (245 lines).
- **Suggestion**: Extract local preference persistence (theme, fontScale, reducedMotion, sound, haptics, bigMode, tapTwice, speech) into a `useUserSettings()` hook. This cleanly brings `App.tsx` to ~160 lines without formatting compression.

---

## 5. Verification Method

To verify the fixes independently:
1. **Type Check**:
   ```bash
   npx tsc --noEmit
   ```
2. **Unit Tests**:
   ```bash
   npm test -- --run
   ```
3. **Empty State & Lens Gating Playwright Test**:
   ```bash
   npx playwright test e2e/m1_adversarial_stress.spec.ts
   ```
   *Pass Condition*: `[data-testid="analysis-empty-state"]` and `[data-testid="enable-coach-btn"]` are visible when `justPlay` is selected; clicking `enable-coach-btn` switches back to `coach` preset and hides empty state.
4. **App.tsx Line Count**:
   ```powershell
   (Get-Content src/App.tsx).Length
   ```
   *Pass Condition*: Output is strictly `< 300`.
