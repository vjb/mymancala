# Handoff Report: Milestone M0 Independent Review & Adversarial Audit

## Review Summary

**Verdict**: **APPROVE**

---

## 1. Observation

### 1.1 Line Count & Monolith Decomposition (`src/App.tsx`)
- Directly verified line count of `src/App.tsx`:
  - Command: `powershell -Command "(Get-Content src/App.tsx).Length"`
  - Result: **279 lines** (strictly `< 300 lines`, satisfying Requirement R1 and Milestone M0 criteria).
  - Decomposition structure:
    - Architecture moved from ~2,600 lines down to 279 lines.
    - Extracted domain state machine into `src/game/gameReducer.ts` (220 lines) and `src/game/gameTypes.ts` (131 lines).
    - Extracted game lifecycle orchestrator into `src/game/useGame.ts` (648 lines).
    - Extracted review helper into `src/game/reviewHelper.ts` (42 lines).
    - Extracted UI presentation into 11 modular components across `src/components/board/`, `src/components/panels/`, `src/components/shell/`, and `src/components/modals/`.

### 1.2 Pure State Management (`src/game/gameReducer.ts` & `src/game/useGame.ts`)
- `src/game/gameReducer.ts`:
  - Immutably handles actions: `APPLY_MOVE`, `RECORD_MOVE_EVALUATION`, `UNDO_MOVE`, `RESET_GAME`, `SET_GAME_MODE`, `SET_HUMAN_PLAYER`, `SET_BOT_ID`, `SET_SEARCH_DEPTH`, `SET_RULES`, `SET_SOW_SPEED`, `SET_COACH_SENSITIVITY`, `SET_AI_RUNNING`, `ADJUST_SANDBOX_PIT`, `RESTORE_SAVED_GAME`.
  - Zero side-effects inside reducer.
  - Unit tests: `src/game/gameReducer.test.ts` (7/7 tests passing).
- `src/game/useGame.ts`:
  - Orchestrates asynchronous engine evaluation via `searchClient`.
  - Enforces bot pacing: default `1200ms` thinking floor on normal, `1600ms` on slow (`lines 164, 171`).
  - Animates multi-step sowing with active cancellation token (`activeAnimationId.current`).
  - Coordinates move interception for coach advice before dispatching.

### 1.3 Preservation of Preserved `data-testid` Selectors
- Audited against the authoritative list in `docs/plan/README.md:62` and `src/preserved-testids.test.ts`:
  - Verified 100% preservation across all 35+ testids:
    - `turn-indicator` (`TurnBanner.tsx:67`)
    - `total-stones` (`TurnBanner.tsx:77`)
    - `ribbon-hints-btn` (`TurnBanner.tsx:91`)
    - `game-over-banner` (`TurnBanner.tsx:125`)
    - `game-over-review-btn` (`TurnBanner.tsx:136`)
    - `reset-game-btn` (`Header.tsx:99`)
    - `eval-gauge` (`EvalGauge.tsx:53`)
    - `bottom-tray` (`BottomTray.tsx:24`)
    - `bottom-board-btn` (`BottomTray.tsx:30`)
    - `bottom-analysis-btn` (`BottomTray.tsx:41`)
    - `tutor-toggle` (`BottomTray.tsx:53`)
    - `bottom-rules-btn` (`BottomTray.tsx:66`)
    - `bottom-settings-btn` (`BottomTray.tsx:76`)
    - `diagnostics-modal` (`DiagnosticsModal.tsx:20`)
    - `preset-<id>` (`SettingsPanel.tsx:92`)
    - `lens-<id>` (`SettingsPanel.tsx:119`)
    - `mode-<id>` (`SettingsPanel.tsx:207`)
    - `ai-duel-toggle` (`SettingsPanel.tsx:261`)
    - `open-diagnostics-btn` (`SettingsPanel.tsx:348`)
    - `tutor-modal` (`CoachPanel.tsx:29`)
    - `tutor-reconsider` (`CoachPanel.tsx:75`)
    - `tutor-play-best` (`CoachPanel.tsx:86`)
    - `tutor-confirm` (`CoachPanel.tsx:94`)
    - `analysis-review-btn` (`AnalysisPanel.tsx:120`)
    - `eval-row-0` (`AnalysisPanel.tsx:150, 287`)
    - `eval-row-worst` (`AnalysisPanel.tsx:150, 287`)
    - `eval-play-pit-<N>` (`AnalysisPanel.tsx:182, 328`)
    - `store-6`, `store-13` (`StorePit.tsx:45`)
    - `pit-<N>` (`PitButton.tsx:63`)
    - `pit-count-<N>` (`PitButton.tsx:153`)
    - `sandbox-minus-<N>` (`PitButton.tsx:162`)
    - `sandbox-plus-<N>` (`PitButton.tsx:169`)

### 1.4 Local Storage Autosave & Corruption Protection (`src/lib/storage.ts`)
- Key: `mancala_game_v1`.
- Move replay logic (`replayGameFromHistory`):
  - Validates sequence by re-executing `rules.apply` from `rules.initial()`.
  - Rejects illegal move sequences (`valid: false`), avoiding invalid board snapshots.
  - Safe error recovery on corrupt JSON (`try...catch` clears corrupt session without crashing).
  - Terminal games (`replay.state.over`) are not prompted for resume.
- Unit tests: `src/lib/storage.test.ts` (3/3 tests passing).

### 1.5 Web Worker Search Engine Offload & Fallback
- `src/workers/search.worker.ts`: Offloads minimax search with TT invalidation on rule changes.
- `src/workers/searchClient.ts`: Manages request IDs, cancellation tracking, and transparent fallback to main thread via microtask when Web Workers are unavailable.
- Unit tests: `src/workers/searchClient.test.ts` (2/2 tests passing).

### 1.6 Mobile Guardrails & Playwright Setup
- `playwright.config.ts`: Configures 4 responsive projects:
  - `mobile-small`: 360 × 740
  - `mobile-iphone`: 393 × 852
  - `tablet-portrait`: 768 × 1024
  - `desktop-landscape`: 1280 × 800
- `e2e/no-hscroll.spec.ts`: Asserts zero horizontal scroll across Board, Analysis, Settings, and Rules modal.
- `e2e/tray.spec.ts`: Asserts exactly 5 buttons in `[data-testid="bottom-tray"]` and ensures Rules is excluded from top header.

### 1.7 Independent Execution of Verification Commands
1. `npm test`:
   - 10 test files passed, 78 tests passed.
   - Includes 2,000-game fuzz suite in `src/rules/kalah.test.ts` (~15.9s).
2. `npx tsc --noEmit`:
   - Exited with code 0. Zero compiler errors or warnings.
3. `npm run build`:
   - Exited with code 0. Produced `dist/index.html`, `dist/assets/search.worker-*.js` (5.23 kB), `dist/assets/index-*.css` (63.56 kB), `dist/assets/index-*.js` (298.45 kB).
4. `npm run test:e2e`:
   - Exited with code 0. All 20 tests passed across all 4 viewports in 22.7s.

---

## 2. Logic Chain

1. **Architecture & File Size**: By decomposing `App.tsx` from ~2,600 lines down to 279 lines, the codebase complies with the strict `< 300` lines limit. Separating domain state into `gameReducer.ts` and UI into components preserves separation of concerns without impacting functionality.
2. **Selector Preservations**: Grep analysis and the automated test `src/preserved-testids.test.ts` confirm that all 35+ testids referenced in `docs/plan/README.md` are present at identical DOM interaction points.
3. **Engine Robustness**: Mathematical equivalence is proven by the 2,000-game fuzz test (`src/rules/kalah.test.ts`), which cross-checks `RuleSet.apply` against legacy `simulateMove` across 4 rule combinations on every ply.
4. **Data Integrity & Crash Safety**: Storing move history (`history: number[]`) and replaying from `initial()` prevents state deserialization exploits and snapshot versioning drift. In testing, corrupted entries are safely cleared without throwing unhandled exceptions.
5. **Mobile Compliance**: Zero horizontal scrolling down to 360px viewport width and the 5-item tray lock are verified by automated Playwright headless runs.
6. **No Integrity Violations Detected**:
   - Source code was searched for hardcoded test outputs or mock shortcuts. None exist.
   - Algorithmic logic (minimax with TT, perft tree generation, rule transitions) is authentic and verified.
   - Outputs from worker handoff match independent tool runs.

---

## 3. Caveats

1. **Search Worker Cancellation Granularity**: In `src/workers/searchClient.ts`, calling `analyze()` does not automatically post a `CANCEL` message for prior in-flight searches. Because search depth is bounded (1–8 plies) and React discards stale responses via closure subscription flags, this does not cause correctness bugs, but deep searches (depth >= 7) could queue behind each other on low-end single-worker threads.
2. **Oware and Sow & Score Variants**: In accordance with the project roadmap, these variants are scheduled for Phase 4. Phase 0 provides the extensible `RuleSet` interface and `kalah.ts` implementation.

---

## 4. Adversarial Challenge & Stress-Test Report

**Overall Risk Assessment**: **LOW**

### Challenge 1: Asynchronous Worker Cancellation & Out-of-Order Responses
- **Assumption Challenged**: Analysis results for earlier board states will never overwrite newer user moves.
- **Attack Scenario**: Fast multi-tap move sequence where worker finishes move 1 analysis after move 2 has already been made.
- **Stress-Test Finding**: In `src/game/useGame.ts:193-216`, a closure boolean `let isSubscribed = true; return () => { isSubscribed = false; }` ensures that cleanup immediately invalidates stale responses before updating `analysisResults`.
- **Verdict**: PASS.

### Challenge 2: Local Storage Session Corruption Injection
- **Assumption Challenged**: Invalid JSON or illegal move history will not crash the app on startup.
- **Attack Scenario**: Malformed data injected into `localStorage.getItem('mancala_game_v1')`.
- **Stress-Test Finding**: Tested in `src/lib/storage.test.ts:46` and audited in `storage.ts:56-75`. Illegal moves flag `valid: false` and JSON syntax errors hit `catch`, resulting in `clearSavedGame()` and clean fallback to a new game.
- **Verdict**: PASS.

### Challenge 3: Stone Conservation Invariant under Heavy Sowing
- **Assumption Challenged**: High-count multi-lap wrap-around moves (e.g. 28+ stones) will not drop or create stones.
- **Attack Scenario**: Sowing from a pit with more stones than total pits on board.
- **Stress-Test Finding**: Verified in `src/preflight-diagnostics.ts:80-93` and enforced at runtime in `src/rules/kalah.ts:163-166` (`finalSum !== initialSum` throws `Stone conservation violated`).
- **Verdict**: PASS.

---

## 5. Findings

- **[Minor] Advisory finding 1 (Performance Optimization)**:
  - Location: `src/workers/searchClient.ts:71`
  - Detail: `searchClient.analyze()` could explicitly cancel the previous request ID before queueing a new one to save unnecessary CPU work during fast move sequences.
  - Recommendation: Implement in Phase 2 alongside solver integration.

---

## 6. Verified Claims

| Worker Claim | Verified Method | Status |
|---|---|---|
| `src/App.tsx` < 300 lines | PowerShell `(Get-Content src/App.tsx).Length` (279 lines) | **PASS** |
| 100% testid preservation | Grep search & `src/preserved-testids.test.ts` (34 tests) | **PASS** |
| Web Worker search & fallback | `src/workers/searchClient.test.ts` & Vite build worker bundle | **PASS** |
| 2,000-game fuzz suite | `src/rules/kalah.test.ts` in Vitest | **PASS** |
| Move replay autosave | `src/lib/storage.test.ts` in Vitest | **PASS** |
| Playwright 4 viewports | `npm run test:e2e` (20/20 passing) | **PASS** |
| Zero horizontal scroll at 360px | `e2e/no-hscroll.spec.ts` | **PASS** |
| 5-item bottom tray lock | `e2e/tray.spec.ts` | **PASS** |
| Production build & types | `npm run build` & `npx tsc --noEmit` | **PASS** |

---

## 7. Conclusion

The Milestone M0 (Phase 0 Foundation) implementation delivered by `m0_worker_1` fulfills all requirements specified in `PROJECT.md` and `docs/plan/phase-0-foundation.md`. The code is clean, fully decoupled, rigorously tested, and free of integrity violations.

**Verdict**: **APPROVE**

---

## 8. Verification Method

To independently reproduce the verification:

1. **Verify Line Count**:
   ```powershell
   powershell -Command "(Get-Content src/App.tsx).Length"
   ```
   *(Must be < 300 lines; returns 279)*

2. **Run TypeScript Check**:
   ```bash
   npx tsc --noEmit
   ```
   *(Must exit 0 with no errors)*

3. **Run Unit and Fuzz Suite**:
   ```bash
   npm test
   ```
   *(Must pass all 10 test files and 78 tests)*

4. **Run Production Build**:
   ```bash
   npm run build
   ```
   *(Must bundle cleanly including search worker chunk)*

5. **Run Mobile E2E Suite**:
   ```bash
   npm run test:e2e
   ```
   *(Must pass all 20 tests across 4 viewports)*
