# Handoff Report: Milestone M0 (Phase 0 Foundation)

## 1. Observation
1. **RuleSet & Kalah Geometry Encapsulation**:
   - `src/rules/types.ts`: Defines `Player`, `BoardLayout`, `GameState`, `MoveResult`, `RuleSet`.
   - `src/rules/kalah.ts`: Encapsulates all board geometry constants:
     - `KALAH_TOTAL_PITS = 14`
     - `KALAH_P1_STORE = 6`
     - `KALAH_P2_STORE = 13`
     - Opposite pit formula: `12 - pit`
     - Pit labels: `P1 Store`, `P2 Store`, `P1-1` through `P1-6`, `P2-1` through `P2-6`
     - Pure functions: `initialKalahState`, `getKalahLegalMoves`, `applyKalahMove`, `isKalahTerminal`, `scoreKalah`, `getKalahPositionKey`, `createKalahRuleSet`.
   - `src/engine.ts`: Refactored to delegate rules to `kalahRuleSet`. Board geometry constants (`TOTAL_PITS`, `P1_STORE`, `P2_STORE`, `OPPOSITE_PIT`) re-exported for legacy compatibility. Full PV search (`minimaxWithPV`) preserved and intact.
   - `src/tactics.ts`: `formatDescriptiveLabel(pitIndex)` used instead of literal `13 - pitIndex`.
   - `src/rules/kalah.test.ts`: Runs 2,000 seeded random games comparing legacy `simulateMove` vs `RuleSet.apply` across 4 variants: Standard Kalah (1,000 games), No Free Turns (350 games), No Captures (350 games), Pure Sowing (300 games). All 2,000 games match board, turn, score, and terminal state exactly.

2. **Web Worker Search Engine Offload**:
   - `src/workers/protocol.ts`: Type contracts `AnalyzeRequest`, `AnalyzeResponse`, `AnalysisResult`.
   - `src/workers/search.worker.ts`: Worker executing `minimaxWithPV`, invalidating transposition table on rule variation changes, and tracking latest cancellation id.
   - `src/workers/searchClient.ts`: Singleton client tracking active request ID with latest-request-wins cancellation. Provides automatic synchronous main-thread fallback when `typeof Worker === 'undefined'`.
   - `src/workers/searchClient.test.ts`: 2 unit tests verifying analysis and fallback mechanism.

3. **Storage & Move-Replay Autosave**:
   - `src/lib/storage.ts`: Schema `SavedGameV1` under key `mancala_game_v1`. `replayGameFromHistory` validates move sequences by replaying from `initial()` without snapshots. `usePersistentState` hook with versioning and localStorage error boundaries.
   - `src/lib/storage.test.ts`: 3 unit tests verifying state replay, serialization, and invalid game handling.

4. **Principal Variation Components**:
   - `src/components/panels/PVDisplay.tsx`: Compact badge displaying first 2 moves of the principal variation with `+N` indicator and tap-to-expand trigger.
   - `src/components/panels/PVSheet.tsx`: Vertical bottom sheet listing PV steps with zero horizontal scrolling, Esc key dismissal, and clipboard copy.

5. **Monolith Decomposition of `src/App.tsx`**:
   - Monolith decomposed from ~2,600 lines down to **258 lines** in `src/App.tsx` (verified `< 300` lines).
   - Extracted state management:
     - `src/game/gameTypes.ts`: State and Action interfaces.
     - `src/game/gameReducer.ts`: Pure reducer for `APPLY_MOVE`, `UNDO_MOVE`, `RESET_GAME`, `RECORD_MOVE_EVALUATION`, `SET_MODE`, `ADJUST_SANDBOX_PIT`, `RESTORE_SAVED_GAME`.
     - `src/game/gameReducer.test.ts`: 7 unit tests.
     - `src/game/reviewHelper.ts`: Extracted review metrics calculation.
     - `src/game/useGame.ts`: Orchestrator hook managing move animation ticks, bot delays (1.2 s normal / 1.6 s slow), worker search client, audio/haptic cues, and autosave.
   - Extracted UI components:
     - `src/components/board/PitButton.tsx`
     - `src/components/board/StorePit.tsx`
     - `src/components/board/Board.tsx`
     - `src/components/shell/Header.tsx`
     - `src/components/shell/EvalGauge.tsx`
     - `src/components/shell/TurnBanner.tsx`
     - `src/components/shell/BottomTray.tsx`
     - `src/components/panels/CoachPanel.tsx`
     - `src/components/panels/AnalysisPanel.tsx`
     - `src/components/panels/SettingsPanel.tsx`
     - `src/components/modals/DiagnosticsModal.tsx`
   - `src/preserved-testids.test.ts`: 34 unit tests verifying presence and preservation of all 35+ `data-testid` attributes.

6. **Playwright Mobile Guardrails & Test Results**:
   - `playwright.config.ts`: Configured 4 viewports (`mobile-small` 360x740, `mobile-iphone` 393x852, `tablet-portrait` 768x1024, `desktop-landscape` 1280x800).
   - `vite.config.ts`: Excluded `**/e2e/**` from Vitest runner.
   - `e2e/no-hscroll.spec.ts`: Asserts `document.documentElement.scrollWidth <= window.innerWidth` across Board, Analysis, Settings, and Rules modal.
   - `e2e/tray.spec.ts`: Asserts exactly 5 buttons in `[data-testid="bottom-tray"]` and verifies Rules modal is housed exclusively in tray.
   - Execution outputs:
     - `npm test`: 10 test files passed, 78 tests passed (exited 0).
     - `npm run build`: `tsc && vite build` bundled cleanly (exited 0).
     - `npm run test:e2e`: 20 Playwright tests passed across 4 workers (exited 0).

7. **Documentation**:
   - `docs/plan/PROGRESS.md`: Documented Milestone M0 completion with component breakdown, verification evidence, and Phase 1 readiness.

## 2. Logic Chain
1. By extracting all Kalah board geometry literals (`14`, `13`, `6`, `12 - pit`) into `src/rules/kalah.ts` under a generic `RuleSet` interface, the engine and UI are decoupled from hardcoded geometry, satisfying requirement 0.1.
2. By validating 2,000 games of randomized legal moves between `RuleSet.apply` and legacy `simulateMove`, mathematical equivalence of board state, captured counts, extra turns, and terminal conditions is proven without regressions.
3. By delegating worker minimax calls to `searchClient` with request ID tracking and cancellation, UI responsiveness is unblocked on mobile threads while ensuring headless node testing succeeds seamlessly via the fallback mechanism.
4. By using move-history replay (`history: number[]`) from `initial()` rather than storing raw board snapshots in `mancala_game_v1`, future rule extensions and bug fixes will not corrupt user saved games.
5. By splitting `App.tsx` into pure reducer (`gameReducer.ts`), hook (`useGame.ts`), and modular presentation components, `App.tsx` line count was reduced from ~2,600 to 258 lines while retaining all 35+ `data-testid` selectors confirmed by `src/preserved-testids.test.ts`.
6. By implementing Playwright tests running on mobile viewports down to 360px, zero horizontal scrolling and tray invariants are verified and guarded against regression.

## 3. Caveats
- Playwright E2E tests require a web server to be reachable at `http://localhost:5173`. Playwright's `webServer` config manages this automatically during `npm run test:e2e`.
- Web Workers in pure Node.js environments do not have a native `Worker` constructor; the `searchClient` fallback handles this transparently in test environments.

## 4. Conclusion
Milestone M0 (Phase 0 Foundation) is complete, functionally verified, and meets all architectural, code size, and test coverage requirements. The codebase is clean, robust, and prepared for Phase 1 (Lenses & Accessibility).

## 5. Verification Method
To independently verify:
1. **Type Checking**:
   ```bash
   npx tsc --noEmit
   ```
   (Must exit 0 with no errors).
2. **Vitest Unit & Fuzz Suite**:
   ```bash
   npm test
   ```
   (Must run 10 test files, 78 tests including the 2,000-game fuzz suite in `src/rules/kalah.test.ts`, all passing).
3. **Production Bundle Build**:
   ```bash
   npm run build
   ```
   (Must compile and bundle with Vite cleanly, including worker chunk).
4. **Playwright Mobile E2E Suite**:
   ```bash
   npm run test:e2e
   ```
   (Must run 20 tests across 4 viewports, verifying zero horizontal scroll and 5-item tray navigation).
5. **Line Count Verification**:
   ```powershell
   (Get-Content src/App.tsx).Length
   ```
   (Must be < 300 lines; current: 258 lines).
