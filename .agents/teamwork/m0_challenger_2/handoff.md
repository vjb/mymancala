# Adversarial Challenge Report: Milestone M0 (Phase 0 Foundation)

**Final Verdict**: **REJECT** (Pending 2-line defensive fix for storage corruption fallback)

---

## 1. Observation

1. **Storage Corruption Testing & Uncaught Exception Reproduction**:
   - `src/lib/storage.ts` lines 62–69:
     ```ts
     if (
       parsed &&
       parsed.version === 1 &&
       typeof parsed.rulesId === 'string' &&
       Array.isArray(parsed.history)
     ) {
       return parsed as SavedGameV1;
     }
     ```
     `loadGameSession()` checks `version === 1`, `rulesId: string`, and `Array.isArray(history)`. It does **not** validate `parsed.options` or ensure `parsed.options.stonesPerPit` exists.
   - `src/game/useGame.ts` lines 63–74:
     ```ts
     const handleResumeSavedGame = () => {
       if (!savedGamePrompt) return;
       const replay = replayGameFromHistory(kalahRuleSet, savedGamePrompt.history);
       if (replay.valid) {
         // Replay all moves to reconstruct the game state
         let replayedState = createInitialGameState(savedGamePrompt.options.stonesPerPit);
         ...
         for (const pit of savedGamePrompt.history) {
           const sim = simulateMove(currentBoard, currentPlayer, pit, savedGamePrompt.options);
     ```
     When `mancala_game_v1` in `localStorage` has a valid history array (e.g. `{"version": 1, "rulesId": "kalah", "history": [2]}`), but `options` is missing or undefined, `replayGameFromHistory` validates the move `[2]` and sets `savedGamePrompt`.
   - In `e2e/storage-stress.spec.ts` (test: `reproduces uncaught TypeError vulnerability when options is missing in savedGameV1`), clicking the "Continue Game" button immediately produces the following uncaught error:
     ```
     TypeError: Cannot read properties of undefined (reading 'stonesPerPit')
     ```
     This triggers an uncaught exception in the React event handler, violating Criterion 1: *"assert clean fallback without uncaught exceptions"*.

2. **Clean Storage Fallbacks Verified**:
   - Authored `src/lib/storage-corruption.test.ts` (12 unit tests) and `e2e/storage-stress.spec.ts` (20 Playwright tests across 4 viewports).
   - Verified clean recovery to `initial()` without exceptions for:
     - Malformed JSON strings (`{"version": 1, "history": [0,`) -> `loadGameSession()` catches JSON parse error, removes item, returns `null`.
     - Non-object JSON (`"null"`, `"123"`, `"true"`, `"[1, 2]"`) -> Rejected, returns `null`.
     - Version mismatch (`version: 2`, `version: 0`) -> Rejected, returns `null`.
     - Out-of-bounds pit numbers (`history: [999]`, `[-1]`) -> `replayGameFromHistory` returns `valid: false, appliedMoves: 0`. Storage cleared, prompt omitted.
     - Store pits in history (`history: [6]`, `[13]`) -> `replayGameFromHistory` returns `valid: false`.
     - Pits with 0 stones played -> `replayGameFromHistory` returns `valid: false`.
     - Non-turn moves (Player 1 playing pits 7–12 on move 0) -> `valid: false`.
     - Non-integer moves (`NaN`, `null`, `undefined`, `1.5`, `"0"`, `{}`) -> `valid: false`.
     - Trailing moves past terminal game over -> `valid: false`.
     - Finished game in storage -> `replay.state.over === true`, prompt suppressed, storage cleared.
     - Valid autosave and resume lifecycle: verified with `[2]` (store 6 scored, prompt appears on reload, resume restores board).

3. **Preserved testid Completeness in Browser DOM**:
   - The worker's previous test `src/preserved-testids.test.ts` was an offline file string scanner (`allSourceContent.includes(...)`), which did not verify DOM rendering or interactivity.
   - Authored `e2e/preserved-testids.spec.ts` testing actual DOM rendering and click handlers across all 4 viewports (24 tests total).
   - Fully verified that all required testids render and respond in their respective states:
     - Board & Stores: `store-6`, `store-13`, `pit-0`..`pit-5`, `pit-7`..`pit-12`, `pit-count-0`..`pit-count-5`, `pit-count-7`..`pit-count-12`.
     - Header & Shell: `turn-indicator`, `total-stones`, `eval-gauge`, `reset-game-btn`, `bottom-tray`, `bottom-board-btn`, `bottom-analysis-btn`, `tutor-toggle`, `bottom-rules-btn`, `bottom-settings-btn`.
     - Presets: `preset-justPlay`, `preset-hints`, `preset-coach`, `preset-full`.
     - Lenses: `lens-advantageBar`, `lens-bestMoveMarks`, `lens-coach`, `lens-explanations`, `lens-errorRate`, `lens-winPercent`, `lens-mainLine`.
     - Modes: `mode-pve`, `mode-ai_vs_ai`, `mode-pvp`, `mode-sandbox`.
     - Dynamic Controls:
       - `ai-duel-toggle`: correctly conditioned on `mode === 'ai_vs_ai'`.
       - `sandbox-plus-0`, `sandbox-minus-0`: correctly conditioned on `mode === 'sandbox'`, tested modifying stone counts.
       - `open-diagnostics-btn` & `diagnostics-modal`: opens and closes cleanly.
       - `eval-row-0`, `eval-row-worst`, `eval-play-pit-*`: tested in Analysis panel.
       - `tutor-modal`, `tutor-reconsider`, `tutor-play-best`, `tutor-confirm`: tested by triggering a coach mistake interception on pit 0.
     - Found nuance: `analysis-review-btn` is gated behind `canReview` (`isGameOver || gameMovesHistory.length >= 2`). It renders once 2 moves are recorded or the game is finished.
     - Found nuance: `RulesModal` and `DiagnosticsModal` currently close via close button; Esc key listener is planned for M1 per `PROJECT.md:36`.

4. **Mobile Viewport & Tray Verification**:
   - Executed `e2e/no-hscroll.spec.ts` and `e2e/tray.spec.ts` across all 4 configured viewports:
     - `mobile-small` (360x740)
     - `mobile-iphone` (393x852)
     - `tablet-portrait` (768x1024)
     - `desktop-landscape` (1280x800)
   - Zero horizontal overflow (`document.documentElement.scrollWidth <= window.innerWidth`) confirmed across Main Board, Analysis tab, Settings tab, and Rules modal.
   - Tray invariant confirmed: exactly 5 items on mobile viewports; Rules button housed exclusively in tray (absent from header).

5. **Test & Build Execution Suite**:
   - `npm test`: 13 test files passed, 133 tests passed (16.14s).
   - `npx tsc --noEmit`: Exited 0 with no diagnostic errors.
   - `npm run build`: Vite build passed cleanly (dist created, worker bundled).
   - `npm run test:e2e`: 64 Playwright tests passed across 4 workers (49.7s).

---

## 2. Logic Chain

1. **Storage Corruption Vulnerability**:
   - `SavedGameV1` defines `options: { stonesPerPit: number; freeTurn: boolean; captureOpposite: boolean; }`.
   - `loadGameSession()` in `src/lib/storage.ts` verifies `version`, `rulesId`, and `history`, but omits verifying `options`.
   - When a stored payload is loaded where `options` is missing or undefined, `useGame.ts` passes `history` to `replayGameFromHistory`. Since `replayGameFromHistory` only needs the `RuleSet` (which uses default initial state), replay succeeds.
   - The user is presented with the resume prompt banner.
   - When the user clicks "Continue Game", `handleResumeSavedGame` directly accesses `savedGamePrompt.options.stonesPerPit`.
   - Because `savedGamePrompt.options` is `undefined`, this immediately throws `TypeError: Cannot read properties of undefined (reading 'stonesPerPit')`.
   - Therefore, storage corruption resilience fails to provide a clean fallback when `options` is missing, crashing the application.

2. **Remediation**:
   - The defect requires a 2-part defensive guard:
     1. In `src/lib/storage.ts`:
        ```ts
        if (
          parsed &&
          parsed.version === 1 &&
          typeof parsed.rulesId === 'string' &&
          Array.isArray(parsed.history) &&
          parsed.options &&
          typeof parsed.options.stonesPerPit === 'number'
        ) {
          return parsed as SavedGameV1;
        }
        ```
     2. In `src/game/useGame.ts`:
        ```ts
        const options = savedGamePrompt.options ?? {
          stonesPerPit: 4,
          freeTurn: true,
          captureOpposite: true
        };
        let replayedState = createInitialGameState(options.stonesPerPit ?? 4);
        ...
        const sim = simulateMove(currentBoard, currentPlayer, pit, options);
        ```

3. **Preserved testids & Mobile Responsiveness**:
   - All 35+ preserved testids render and function in real browser DOM across all 4 responsive viewports.
   - Zero horizontal scroll holds across all 4 breakpoints.

---

## 3. Caveats

- The storage corruption uncaught exception only triggers if localStorage contains a JSON object with valid version, rulesId, and legal history, but missing or null `options`. When full autosave writes through normal gameplay, `options` is always populated. However, adversarial input, browser storage sync partial writes, or older saved versions cause an uncaught crash upon resume.
- The 4-viewport Playwright suite requires local Vite dev server port 5173 (managed automatically by Playwright `webServer`).

---

## 4. Conclusion

**Verdict: REJECT**

While M0 satisfies monolith decomposition (< 300 lines in `App.tsx`), headless Kalah `RuleSet` abstraction, Web Worker minimax offloading, preserved testids (35+ tested in DOM), and mobile responsive viewport guardrails (zero horizontal scroll, 5-item tray), it fails Requirement 1 of the dispatch:
- Malformed storage with missing `options` causes an uncaught `TypeError` upon clicking "Continue Game".

Once the worker applies the 2-line defensive check in `storage.ts` and `useGame.ts`, this milestone will be ready for immediate approval.

---

## 5. Verification Method

To independently reproduce the finding and verify the test suites:

1. **Empirical Storage Bug Reproduction**:
   ```bash
   npx playwright test e2e/storage-stress.spec.ts -g "reproduces uncaught TypeError vulnerability"
   ```
   (Directly catches the uncaught `TypeError` thrown when resuming without `options`).

2. **Unit Storage Corruption Suite**:
   ```bash
   npx vitest run src/lib/storage-corruption.test.ts
   ```
   (Verifies 12 corruption cases including store moves, out of bounds, and bad versions).

3. **Full Preserved testid DOM Suite**:
   ```bash
   npx playwright test e2e/preserved-testids.spec.ts
   ```
   (Runs 24 tests across all 4 viewports verifying all 35+ testids).

4. **Full E2E Guardrail Suite**:
   ```bash
   npm run test:e2e
   ```
   (Runs 64 tests across 4 viewports covering no-hscroll, tray lock, storage stress, and testids).
