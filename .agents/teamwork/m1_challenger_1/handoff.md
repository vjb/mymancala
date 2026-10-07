# M1 Challenger Handoff Report: Adversarial Stress Test & Verification

**Verdict**: **REJECT**
**Risk Assessment**: **HIGH**

---

## 1. Observation

### Observation 1.1: Missing `isAnalysisEmpty` and Preset Wiring in `src/App.tsx`
- **File**: `c:\Users\vjbel\hacks\mymancala\src\App.tsx:191-200`
- **Verbatim Code**:
  ```tsx
  <AnalysisPanel
    analysisResults={game.analysisResults} isAnalyzing={game.isAnalyzing} searchDepth={game.state.searchDepth}
    matchStats={game.state.matchStats} showErrorRate={lenses.errorRate} showWinPercent={lenses.winPercent}
    showMainLine={lenses.mainLine} canReview={game.state.isGameOver || game.state.gameMovesHistory.length >= 2}
    onOpenReview={() => setGameReviewOpen(true)} expandedPit={expandedAnalysisPit}
    onToggleExpandPit={(pit) => setExpandedAnalysisPit(prev => prev === pit ? null : pit)}
    onPlayMove={(pit) => game.executeMove(pit, true)} isGameOver={game.state.isGameOver}
    board={game.state.board} currentPlayer={game.state.currentPlayer} rules={game.state.rules}
    colorblindSafe={colorblindSafe} currentSkin={currentSkin} theme={theme} mobileHidden={mobileTab === 'settings'} layout={kalahRuleSet.layout}
  />
  ```
- **Component Definition**: `c:\Users\vjbel\hacks\mymancala\src\components\panels\AnalysisPanel.tsx:57-62`
  ```tsx
  export const AnalysisPanel: React.FC<AnalysisPanelProps> = ({
    ...
    isAnalysisEmpty = false,
    onApplyPreset,
    onNavigateTab
  }) => {
  ```
- In `AnalysisPanel.tsx:114`, the calm empty state is guarded by `if (isAnalysisEmpty) { return (<div data-testid="analysis-empty-state">...); }`.
- Because `isAnalysisEmpty` is omitted in `App.tsx`, it always defaults to `false`. When the user selects the `justPlay` preset (or turns off all analytical lenses), `<AnalysisPanel>` **never** renders `data-testid="analysis-empty-state"` or `data-testid="enable-coach-btn"`. Instead, it continues to render the `Candidate Move Evaluations` table.
- **Empirical Failure Output (`npx playwright test e2e/m1_adversarial_stress.spec.ts`)**:
  ```
  Error: expect(locator).toBeVisible() failed
  Locator: locator('[data-testid="analysis-empty-state"]')
  Expected: visible
  Timeout: 5000ms
  Error: element(s) not found
  ```
  Failed on all 4 viewports: `mobile-small`, `mobile-iphone`, `tablet-portrait`, `desktop-landscape`.

### Observation 1.2: Hardcoded English Strings in Arabic / Internationalized Context
- **File**: `c:\Users\vjbel\hacks\mymancala\src\components\shell\TurnBanner.tsx:86-87`
  ```tsx
  <span data-testid="total-stones" ...>
    Stones: {totalStones}
  </span>
  ```
  `TurnBanner.tsx` hardcodes `'Stones: ' + totalStones` rather than translating via `t('board.stones', { count: totalStones })`.
- **File**: `c:\Users\vjbel\hacks\mymancala\src\components\board\StorePit.tsx:45`
  ```tsx
  const ariaLabel = `${title}, ${stones} ${stones === 1 ? 'stone' : 'stones'} banked.`;
  ```
  Hardcodes `'stone' / 'stones'` in English.
- **File**: `c:\Users\vjbel\hacks\mymancala\src\lib\a11y.ts:103`
  ```tsx
  const stoneText = stones === 1 ? '1 stone' : `${stones} stones`;
  ```
  Hardcodes ARIA stone count in English.
- **File**: `c:\Users\vjbel\hacks\mymancala\e2e\rtl.spec.ts:58-63`
  The test asserting Arabic plural formatting tested only `expect(text.length).toBeGreaterThan(0)`, which passed falsely because `"Stones: 48"` is non-empty.

### Observation 1.3: Non-Enumerable Property Loss on Spread in `src/lenses.ts`
- **File**: `c:\Users\vjbel\hacks\mymancala\src\lenses.ts:106-139`
  `attachLegacyAliases` sets `enumerable: false` for `advantageBar`, `bestMoveMarks`, `mainLine`, `coach`, `winPercent`.
- Any component or consumer performing `{ ...lenses }` silently strips all legacy aliases, setting them to `undefined`.
- Verified empirically in `src/m1_adversarial_stress.test.ts`.

### Observation 1.4: Highlight Precedence Invariant & Touch Preview (VERIFIED ROBUST)
- **File**: `c:\Users\vjbel\hacks\mymancala\src\components\board\highlights.ts:47-80`
- Pure precedence: `preview` > `best` > `lastMove` > `threat` > `playable` > `none`.
- Combinatoric fuzz suite across 10,000+ permutations in `src/m1_adversarial_stress.test.ts` passed 100%. No pit ever receives more than one highlight role or conflicting badges.
- Animation state (`isAnimating === true`) strictly suppresses all static highlights.
- Touch preview long-press (350ms) cancels cleanly on `touchend`, `touchcancel`, and `touchmove` (>10px threshold) across all viewports (verified in `e2e/m1_adversarial_stress.spec.ts`).

---

## 2. Logic Chain

1. **Premise**: Milestone 1 specification (`ORIGINAL_REQUEST.md:41-43`, `PROJECT.md:25`, `DISPATCH.md:19-21`) mandates:
   > "Strictly enforce the 7 lenses and 4 presets (justPlay, hints, coach, full). In justPlay, only board, turn indicator, and tray are visible... show friendly empty state when analysis lenses off."
2. **Finding**: Worker implemented the empty state component in `AnalysisPanel.tsx`, but omitted passing `isAnalysisEmpty={activePreset === 'justPlay'}` (or checking `CANONICAL_KEYS.every(k => !lenses[k])`), `onApplyPreset`, and `onNavigateTab` in `src/App.tsx:191-200`.
3. **Consequence**: When players or test suites select `justPlay`, the Analysis tab continues displaying candidate move rankings, lookahead depth, and full engine evaluation data. The empty state (`data-testid="analysis-empty-state"`) and recovery action (`data-testid="enable-coach-btn"`) are never rendered in the DOM.
4. **Conclusion**: M1 cannot be approved until `justPlay` strictly gates the analysis UI and displays the empty state as required.

---

## 3. Stress Test Results Summary

| Test Case | Target System | Expected Behavior | Actual Behavior | Result |
|-----------|--------------|-------------------|-----------------|--------|
| **ST-1: 10,000 Permutations Highlight Precedence** | `highlights.ts` | Strictly 1 highlight role, no conflicting badges | Returned exactly 1 role matching precedence hierarchy | **PASS** |
| **ST-2: Touch Preview Cancellation** | `PitButton.tsx` | Instant cleanup on `touchend`, `touchcancel`, `touchmove` >10px | Cleaned up instantly across all viewports | **PASS** |
| **ST-3: Arabic 6 Plural Categories (0, 1, 2, 3..10, 11..99, 100+)** | `i18nContext.tsx` | All 6 CLDR categories select correct plural forms | Formatted correctly for zero, one, two, few, many, other | **PASS** |
| **ST-4: Fallback on Missing Keys & Malformed Params** | `i18nContext.tsx` | Returns raw key / handles NaN, null, undefined without throwing | Graceful fallback without uncaught exceptions | **PASS** |
| **ST-5: Presets & Legacy Aliases Synchronization** | `lenses.ts` | All presets map correctly; aliases mirror canonical lenses | Correctly synchronized via getters/setters | **PASS** |
| **ST-6: `justPlay` Empty State on Analysis Tab** | `App.tsx` + `AnalysisPanel.tsx` | Renders `data-testid="analysis-empty-state"` and `enable-coach-btn` | Empty state NOT rendered; candidate table still visible | **FAIL (CRITICAL)** |
| **ST-7: Live UI Stone Count i18n Pluralization** | `TurnBanner.tsx` | Stone count formatted via `t()` in Arabic | Hardcoded English `"Stones: 48"` | **FAIL (HIGH)** |

---

## 4. Caveats
- No caveats. All failure modes and pass results were reproduced empirically via executable test runners (`vitest` and `playwright`).

---

## 5. Conclusion & Actionable Remediation

**Verdict**: **REJECT**.

### Required Fixes for Worker:
1. **Wire `isAnalysisEmpty` in `src/App.tsx`**:
   In `src/App.tsx`, compute whether analytical lenses are empty:
   ```tsx
   const isAnalysisEmpty = useMemo(() => {
     return !lenses.principalVariation && !lenses.errorRate && !lenses.winPercent && !lenses.evalBar;
   }, [lenses]);
   ```
   Or simply check `activePreset === 'justPlay'`. Pass to `AnalysisPanel`:
   ```tsx
   <AnalysisPanel
     ...
     isAnalysisEmpty={activePreset === 'justPlay' || isAnalysisEmpty}
     onApplyPreset={(preset) => setLenses(applyPreset(preset))}
     onNavigateTab={(tab) => setMobileTab(tab)}
   />
   ```
2. **Translate Stone Count in `TurnBanner.tsx`**:
   Replace:
   ```tsx
   Stones: {totalStones}
   ```
   With:
   ```tsx
   {t('board.stones', { count: totalStones })}
   ```
3. **Verify with the Stress Test Suite**:
   Run `npx playwright test e2e/m1_adversarial_stress.spec.ts` and confirm all 8 tests pass cleanly.

---

## 6. Verification Method

To independently verify these findings:
```bash
# 1. Run unit stress tests (11 passed)
npx vitest run src/m1_adversarial_stress.test.ts

# 2. Run Playwright stress tests (demonstrates 4 failures on justPlay empty state)
npx playwright test e2e/m1_adversarial_stress.spec.ts
```
