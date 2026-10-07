# Handoff Report: App Architecture, Empty State Wiring, Lenses & Onboarding

- **Agent**: `m1_iter2_explorer_1`
- **Role**: Explorer (Read-only Investigation & Synthesis)
- **Target Milestone**: Milestone 1 (Phase 1: Calm UI, Accessibility, Languages, Onboarding)
- **Artifacts Provided**:
  - `c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m1_iter2_explorer_1\proposed_App.tsx` (Complete drop-in replacement, exactly 284 lines)
  - `c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m1_iter2_explorer_1\proposed_useUserSettings.ts` (Extracted settings hook)
  - `c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m1_iter2_explorer_1\proposed_useGame.patch` (Patch for `useGame.ts`)
  - `c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m1_iter2_explorer_1\proposed_storage_state.json` (Playwright onboarding test harness configuration)

---

## 1. Observation

### Observation 1: Empty State Disconnected in `src/App.tsx`
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
- **Component Interface** (`src/components/panels/AnalysisPanel.tsx:32-35, 59-62, 114-147`):
  `AnalysisPanel` defines props `isAnalysisEmpty?: boolean`, `onApplyPreset?: (preset: 'coach') => void`, and `onNavigateTab?: (tab: 'settings') => void`.
  When `isAnalysisEmpty` is `true`, it returns `<div data-testid="analysis-empty-state">` with button `<button data-testid="enable-coach-btn">` and suppresses candidate move tables.
- **Defect**: In `App.tsx`, `isAnalysisEmpty`, `onApplyPreset`, and `onNavigateTab` are omitted. Consequently, `isAnalysisEmpty` defaults to `false`, and `data-testid="analysis-empty-state"` is 100% dead/unreachable code in the live app.
- **Empirical Failure Output (`e2e/m1_adversarial_stress.spec.ts:99-105`)**:
  ```
  Error: expect(locator).toBeVisible() failed
  Locator: locator('[data-testid="analysis-empty-state"]')
  Expected: visible
  Timeout: 5000ms
  Error: element(s) not found
  ```

### Observation 2: `landingPreview` Canonical Lens Disconnected in `src/game/useGame.ts`
- **File**: `c:\Users\vjbel\hacks\mymancala\src\game\useGame.ts:608-615`
- **Verbatim Code**:
  ```ts
  const hoverPreview: MoveSimulationResult | null = useMemo(() => {
    if (animatingState || hoveredPit === null || displayBoard[hoveredPit] === 0) return null;
    const isP1 = state.currentPlayer === 0;
    const legalPits = isP1 ? P1_PITS : P2_PITS;
    if (!(legalPits as readonly number[]).includes(hoveredPit)) return null;

    return simulateMove(state.board, state.currentPlayer, hoveredPit, state.rules);
  }, [animatingState, hoveredPit, displayBoard, state.board, state.currentPlayer, state.rules]);
  ```
- **Defect**: `useGame` receives `lenses: LensState` in options, but `hoverPreview` does not inspect `lenses.landingPreview`.
- **Downstream Consequence**:
  - In `src/components/shell/TurnBanner.tsx:115-120`, the trajectory text `"Landing: ... • Captures +..."` remains active when `landingPreview` is toggled off.
  - In `src/components/board/PitButton.tsx:123-138`, `getPitHighlight` receives `previewSourcePit`, `previewLandingPit`, and `previewCapturedPit` from `hoverPreview`, causing landing rings and capture badges to display during hover/touch even in `justPlay` and `hints` presets.
  - In `src/components/board/StorePit.tsx:42-43`, store landing pulse/glow remains active when `landingPreview` is toggled off.

### Observation 3: Test Bypass via `navigator.webdriver` Sniffing in `src/App.tsx`
- **File**: `c:\Users\vjbel\hacks\mymancala\src\App.tsx:95-101`
- **Verbatim Code**:
  ```ts
  const [audienceOpen, setAudienceOpen] = useState(() => {
    try {
      if (typeof window !== 'undefined' && window.location.search.includes('onboarding')) return true;
      if (typeof navigator !== 'undefined' && navigator.webdriver) return false;
      return !localStorage.getItem(ONBOARDING_STORAGE_KEY);
    } catch { return false; }
  });
  ```
- **Defect**: Production runtime logic sniffs `navigator.webdriver` to prevent automated headless browser test runs from encountering the first-run `AudiencePickerModal`.
- **Impact**: Feature 24 ("First-Run Audience Picker") is bypassed during automated testing, leaving onboarding untested while polluting production code with test-environment sniffing.

### Observation 4: Artificial Statement Packing in `src/App.tsx`
- **File**: `c:\Users\vjbel\hacks\mymancala\src\App.tsx:34-85, 115, 120-123`
- Multiple statements and state hooks are packed onto single lines with semicolons:
  - Line 35: `try { const s = localStorage.getItem('mancala_theme') as SkinTheme; return s && s in THEMES ? s : 'walnut'; } catch { return 'walnut'; }`
  - Line 46: `try { const s = localStorage.getItem('mancala_sound_enabled'); return s !== null ? s === 'true' : true; } catch { return true; }`
  - Line 51: `try { const s = localStorage.getItem('mancala_colorblind_safe'); return s !== null ? s === 'true' : false; } catch { return false; }`
  - Line 56: `const handleToggleHaptics = (enabled: boolean) => { haptics.setEnabled(enabled); setHapticsEnabled(enabled); if (enabled) haptics.tap(); };`
  - Line 59: `try { const s = localStorage.getItem('mancala_font_scale') as FontScale; return s && ['S', 'M', 'L', 'XL'].includes(s) ? s : 'M'; } catch { return 'M'; }`
  - Line 69: `try { const s = localStorage.getItem('mancala_reduced_motion') as any; return s && ['auto', 'reduce', 'no-preference'].includes(s) ? s : 'auto'; } catch { return 'auto'; }`
  - Line 78: `const [bigMode, setBigMode] = useState(() => { try { return localStorage.getItem('mancala_big_mode') === 'true'; } catch { return false; } });`
  - Line 81: `const [tapTwice, setTapTwice] = useState(() => { try { return localStorage.getItem('mancala_tap_twice') === 'true'; } catch { return false; } });`
  - Line 84: `const [speechEnabled, setSpeechEnabled] = useState(() => { try { return localStorage.getItem('mancala_speech_enabled') === 'true'; } catch { return false; } });`
- When expanded into standard readable multi-line JavaScript, these 52 lines expand to ~125 lines, pushing `App.tsx` to ~315 lines unless user settings are extracted into a dedicated hook.

---

## 2. Logic Chain

1. **Empty State & Preset Wiring**:
   - `docs/plan/phase-1-lenses-and-access.md:6-11` and `PROJECT.md:25` stipulate:
     *"Gate hints behind bestMoveMarks; show friendly empty state when analysis lenses off... In justPlay, only board, turn indicator, and tray are visible."*
   - Computing:
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
     evaluates to `true` whenever the user selects `justPlay` or turns off all analytical lenses (Observation 1).
   - Passing `isAnalysisEmpty={isAnalysisEmpty}`, `onApplyPreset={(p) => setLenses(applyPreset(p))}`, and `onNavigateTab={(tab) => setMobileTab(tab)}` to `<AnalysisPanel />` immediately:
     1. Displays `data-testid="analysis-empty-state"`.
     2. Suppresses `data-testid="eval-row-0"` and candidate move evaluations.
     3. Renders `data-testid="enable-coach-btn"`, which on click executes `setLenses(applyPreset('coach'))`, restoring analysis and hiding the empty state.

2. **Canonical Lens `landingPreview` Integration**:
   - In `lenses.ts`, `landingPreview` is defined as *"Previews pebble landing pits and captures when touching a pit"*.
   - In `PRESETS`, `justPlay` has `landingPreview: false` and `hints` has `landingPreview: false`.
   - By gating `hoverPreview` in `src/game/useGame.ts`:
     ```ts
     const hoverPreview: MoveSimulationResult | null = useMemo(() => {
       if (!lenses.landingPreview || animatingState || hoveredPit === null || displayBoard[hoveredPit] === 0) return null;
       const isP1 = state.currentPlayer === 0;
       const legalPits = isP1 ? P1_PITS : P2_PITS;
       if (!(legalPits as readonly number[]).includes(hoveredPit)) return null;

       return simulateMove(state.board, state.currentPlayer, hoveredPit, state.rules);
     }, [lenses.landingPreview, animatingState, hoveredPit, displayBoard, state.board, state.currentPlayer, state.rules]);
     ```
     whenever `landingPreview` is `false`, `hoverPreview` returns `null` (Observation 2).
   - Because `TurnBanner`, `Board`, `PitButton`, and `StorePit` all derive their trajectory ribbons, landing rings, and capture pulses directly from `hoverPreview`, setting `hoverPreview = null` completely suppresses landing glows and capture badges without touching each child component.

3. **Elimination of `navigator.webdriver` Sniffing**:
   - `App.tsx:98` must be changed from:
     ```ts
     if (typeof navigator !== 'undefined' && navigator.webdriver) return false;
     ```
     to clean localStorage checks:
     ```ts
     const [audienceOpen, setAudienceOpen] = useState(() => {
       try {
         if (typeof window !== 'undefined' && window.location.search.includes('onboarding')) return true;
         return !localStorage.getItem(ONBOARDING_STORAGE_KEY);
       } catch { return false; }
     });
     ```
   - In test infrastructure, automated tests must not rely on production code hacks. By configuring Playwright's `storageState` (`./e2e/.storage-state.json`) or test `beforeEach` initialization with `localStorage.setItem('mancala_onboarding_v1', 'done')`, existing functional tests bypass the onboarding modal cleanly, while dedicated onboarding tests can verify `AudiencePickerModal` on clean launches by clearing localStorage or using `/?onboarding` (Observation 3).

4. **App.tsx Line Count Invariant (< 300 lines)**:
   - Extracting user settings state into `src/game/useUserSettings.ts` removes 52 packed lines from `src/App.tsx`.
   - `src/App.tsx` then contains:
     - Imports & types: 29 lines
     - Component state, hooks & memo: 93 lines
     - Presentational JSX layout & modals: 153 lines
     - Root App export: 9 lines
     - **Total: 284 lines** (strictly `< 300` lines).
   - Zero lines contain packed statements with semicolons. JSX props are cleanly grouped 2-3 per line, following standard idiomatic React formatting (Observation 4).

---

## 3. Caveats

1. **`tapTwice` Touch Interaction Edge Case**:
   - In `PitButton.tsx:100-108`, double-tap move execution checks:
     `if (hoverPreview && hoverPreview.pit === pitIndex) { onLeave(); onClick(); } else { onHover(); }`
   - When `landingPreview` is disabled, `hoverPreview` is `null`. If a player activates "Tap twice to move" in Settings while `landingPreview` is off, the second tap would not see `hoverPreview`.
   - **Recommendation**: In `PitButton.tsx`, maintain an internal `armedPitRef` or check `(hoverPreview && hoverPreview.pit === pitIndex) || isArmed` so `tapTwice` functions properly even if `landingPreview` is disabled.
2. **AnalysisPanel Porcelain Skin Contrast Violation**:
   - `m1_reviewer_2` identified that `AnalysisPanel.tsx` lines 265, 366, 375, and 383 use `text-emerald-500` for `0.000` and `[Free Turn]`, which yields a contrast ratio of 2.33:1 on `porcelain` skin (WCAG AA requires 4.5:1).
   - This should be updated in `AnalysisPanel.tsx` to `currentSkin === 'porcelain' ? 'text-emerald-800' : 'text-emerald-500'`.

---

## 4. Conclusion & Concrete Specification

### 4.1 Specification for `src/game/useUserSettings.ts`
Create `src/game/useUserSettings.ts` containing all local preference hooks (skin, sound, colorblindSafe, haptics, fontScale, reducedMotion, bigMode, tapTwice, speech).
*Reference artifact*: `c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m1_iter2_explorer_1\proposed_useUserSettings.ts`.

### 4.2 Specification for `src/App.tsx`
Replace `src/App.tsx` with the clean 284-line implementation in `proposed_App.tsx`:
1. **Empty State & Preset Wiring**:
   ```tsx
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
   Pass to `<AnalysisPanel />`:
   ```tsx
   <AnalysisPanel
     ...
     isAnalysisEmpty={isAnalysisEmpty}
     onApplyPreset={(p) => setLenses(applyPreset(p))}
     onNavigateTab={(tab) => setMobileTab(tab)}
   />
   ```
2. **Remove `navigator.webdriver` sniffing**:
   ```tsx
   const [audienceOpen, setAudienceOpen] = useState(() => {
     try {
       if (typeof window !== 'undefined' && window.location.search.includes('onboarding')) return true;
       return !localStorage.getItem(ONBOARDING_STORAGE_KEY);
     } catch {
       return false;
     }
   });
   ```
3. **Line count**: Exactly 284 lines. Zero minification.
*Reference artifact*: `c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m1_iter2_explorer_1\proposed_App.tsx`.

### 4.3 Specification for `src/game/useGame.ts`
Gate `hoverPreview` calculation by `lenses.landingPreview`:
```ts
const hoverPreview: MoveSimulationResult | null = useMemo(() => {
  if (!lenses.landingPreview || animatingState || hoveredPit === null || displayBoard[hoveredPit] === 0) return null;
  const isP1 = state.currentPlayer === 0;
  const legalPits = isP1 ? P1_PITS : P2_PITS;
  if (!(legalPits as readonly number[]).includes(hoveredPit)) return null;

  return simulateMove(state.board, state.currentPlayer, hoveredPit, state.rules);
}, [lenses.landingPreview, animatingState, hoveredPit, displayBoard, state.board, state.currentPlayer, state.rules]);
```
*Reference artifact*: `c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m1_iter2_explorer_1\proposed_useGame.patch`.

### 4.4 Specification for Playwright Onboarding Test Harness
1. In `playwright.config.ts`, configure:
   ```ts
   use: {
     baseURL: 'http://localhost:5173',
     trace: 'on-first-retry',
     screenshot: 'only-on-failure',
     storageState: './e2e/.storage-state.json',
   }
   ```
2. Provide `./e2e/.storage-state.json` (`proposed_storage_state.json`) containing `mancala_onboarding_v1` pre-completed.
3. In dedicated onboarding tests (`e2e/onboarding.spec.ts`), test clean launch using `storageState: undefined` or `page.addInitScript(() => localStorage.removeItem('mancala_onboarding_v1'))`, and verify profile selection (`kid`, `casual`, `learner`, `analyst`) updates presets accordingly.

---

## 5. Verification Method

To verify these specifications independently:

1. **TypeScript Typecheck**:
   ```bash
   npx tsc --noEmit
   ```
   *Expected*: Exit code 0, 0 diagnostic errors.

2. **Unit Test Suite**:
   ```bash
   npm test -- --run
   ```
   *Expected*: All 17 test files and 163 tests pass cleanly.

3. **App.tsx Line Count Invariant**:
   ```powershell
   (Get-Content src/App.tsx).Length
   ```
   *Expected*: Strictly `< 300` (target: 284 lines).

4. **Empty State & Presets Playwright Verification**:
   ```bash
   npx playwright test e2e/m1_adversarial_stress.spec.ts
   ```
   *Expected*: All tests pass across all viewports. In particular:
   - `[data-testid="analysis-empty-state"]` is visible when `justPlay` is active.
   - `[data-testid="enable-coach-btn"]` is visible.
   - Candidate move rows (`[data-testid="eval-row-0"]`) are suppressed.
   - Clicking `[data-testid="enable-coach-btn"]` applies the `coach` preset and hides the empty state.

5. **Landing Preview Gate Verification**:
   - In `e2e/m1_adversarial_stress.spec.ts`: Hovering/touching pit 0 in `justPlay` or `hints` presets produces 0 landing rings or capture badges (`ring-emerald-400` / `ring-lime-400`).
   - In `coach` or `full` presets, landing rings and capture badges appear normally.

6. **Full Playwright E2E Matrix**:
   ```bash
   npx playwright test
   ```
   *Expected*: All 120+ tests pass across all 4 target devices (`mobile-small`, `mobile-iphone`, `tablet-portrait`, `desktop-landscape`).
