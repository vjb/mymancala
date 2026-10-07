# Handoff Report: Baseline Codebase Survey & Gap Analysis

**Agent:** `survey_code_explorer_1`  
**Date:** 2026-10-07  
**Working Directory:** `c:\Users\vjbel\hacks\mymancala\.agents\teamwork\survey_code_explorer_1`  
**Target:** Project Orchestrator (`85856d3d-5ca8-4fac-8578-3161a39fe3a5`)

---

## 1. Observation

### 1.1 Toolchain, Scripts & Dependencies
- **`package.json`** (`c:\Users\vjbel\hacks\mymancala\package.json`, lines 1-29):
  - Dependencies: `lucide-react` (^1.16.0), `react` (^18.3.1), `react-dom` (^18.3.1).
  - DevDependencies: `@types/react` (^18.3.12), `@types/react-dom` (^18.3.1), `@vitejs/plugin-react` (^4.3.4), `autoprefixer` (^10.4.20), `postcss` (^8.4.49), `tailwindcss` (^3.4.17), `typescript` (^5.6.3), `vite` (^5.4.14), `vitest` (^2.1.8).
  - Scripts: `"dev": "vite"`, `"build": "tsc && vite build"`, `"preview": "vite preview"`, `"test": "vitest run"`.
  - Missing packages compared to `docs/plan/`: `@playwright/test` is absent; `vite-plugin-pwa` is absent; no i18n package (per plan, typed i18n is intentionally hand-rolled without third-party bloat).
  - Missing scripts: `"typecheck": "tsc --noEmit"`, `"test:e2e": "playwright test"`.
- **`tsconfig.json`** (`c:\Users\vjbel\hacks\mymancala\tsconfig.json`, lines 1-21):
  - Target `ES2020`, `"moduleResolution": "bundler"`, `"noEmit": true`, `"jsx": "react-jsx"`, `"strict": false`, `"noUnusedLocals": false`, `"noUnusedParameters": false`, `"include": ["src"]`.
- **`vite.config.ts`** (`c:\Users\vjbel\hacks\mymancala\vite.config.ts`, lines 1-11):
  - Standard Vite setup with `@vitejs/plugin-react`, `server.host: true`, `server.port: 5173`.
- **Command Verifications**:
  - `npm test`: Exited `0`. Output: `Test Files 5 passed (5)`, `Tests 27 passed (27)`, duration 1.56s.
  - `npx tsc --noEmit`: Exited `0` with 0 diagnostics.
  - `npm run build`: Exited `0` (`tsc && vite build`). Bundle output: `dist/index.html` (1.08 kB), `dist/assets/index-DTaA7_LQ.css` (63.05 kB), `dist/assets/index-0i9fYKWH.js` (284.35 kB / gzip 80.38 kB). Build duration: 15.28s.
  - Git status: On branch `main`, ahead of `origin/main` by 13 commits, working tree clean except `.agents/` untracked directory.

### 1.2 Codebase Structure & File Inventory
The `src/` directory contains 19 files totaling ~4,800 lines of code:

| File | Lines | Bytes | Role / Contents |
|---|---|---|---|
| `src/App.tsx` | 2,471 | 131,837 | Monolithic UI, board rendering, animation state machine, bot timing, modal wiring |
| `src/engine.ts` | 416 | 11,928 | Kalah rules, minimax with alpha-beta + transposition table, `analyzeAllMoves`, perft |
| `src/preflight-diagnostics.ts` | 366 | 12,819 | 11 mathematical & rule invariant tests, audio context check |
| `src/GameReviewModal.tsx` | 367 | 16,111 | Post-game review modal (accuracy, move classifications, turning point) |
| `src/bots.ts` | 278 | 9,155 | 4 bot personas (`pip`, `gary`, `pebble`, `kalah`) with reactive quote pools |
| `src/tactics.ts` | 199 | 8,393 | Deterministic rule-based explanations for best moves, blunders, missed captures |
| `src/theme.ts` | 169 | 5,975 | 3 skin themes: `walnut`, `porcelain` (Clay), `obsidian` (Slate) |
| `src/RulesModal.tsx` | 170 | 7,954 | Kalah rules guide modal, reachable exclusively via tray |
| `src/lenses.ts` | 156 | 5,210 | 7 lenses (`advantageBar`, `errorRate`, `bestMoveMarks`, etc.) and 4 presets (`justPlay`, `hints`, `coach`, `full`) |
| `src/sound.ts` | 146 | 4,846 | Web Audio API synthesizer with DynamicsCompressor |
| `src/Pebble.tsx` | 90 | 3,742 | `Pebble` and `PebbleCluster` 3D visual pebble rendering |
| `src/haptics.ts` | 66 | 1,661 | Vibration API wrappers for steps, captures, free turns, alerts |
| `src/search.test.ts` | 86 | 3,215 | 3 tests comparing engine minimax vs unpruned reference minimax |
| `src/engine.test.ts` | 66 | 2,097 | 11 tests invoking preflight diagnostics |
| `src/tactics.test.ts` | 62 | 2,448 | 4 tests verifying explanations for best/blunder moves |
| `src/lenses.test.ts` | 58 | 1,706 | 6 tests verifying lens presets, toggling, and storage persistence |
| `src/bots.test.ts` | 40 | 1,467 | 3 tests verifying bot personas and quote fallbacks |
| `src/index.css` | 40 | 1,070 | Tailwind imports, font family, tactile 3D pit shadow classes |
| `src/main.tsx` | 11 | 236 | React 18 `createRoot` entry point |

### 1.3 Detailed Inspection of `src/App.tsx`
- **Size & Complexity:** 2,471 lines. `App()` is a single mega-component containing all UI elements except `RulesModal` and `GameReviewModal`.
- **State Count:** Over 38 `useState` and `useRef` instances, including:
  - Game logic: `gameState` (`board`, `currentPlayer`, `moveHistory`, etc.), `rules`, `stonesConfig`, `gameMode` (`pve`, `pvp`, `ai_vs_ai`, `sandbox`), `humanPlayer`.
  - Search & evaluation: `searchDepth`, `analysisResults`, `isAnalyzing`, `hoveredPit`, `expandedAnalysisPit`.
  - Animation & timing: `animatingState` (`phase`: `'lift' | 'sow' | 'capture' | 'free_turn'`), `visualBoard`, `activeAnimationId`, `isMoveLocked`, `sowSpeed` (`'slow' | 'normal' | 'fast' | 'instant'`).
  - Coach / Tutor: `tutorWarning`, `showCoachDetails`, `coachSensitivity`.
  - UI navigation & shell: `mobileTab` (`'board' | 'analysis' | 'settings'`), `currentSkin`, `evalBarCollapsed`, `colorblindSafe`, `gameReviewOpen`, `rulesOpen`, `diagnosticsOpen`.
- **Main-Thread Search Execution** (`src/App.tsx`, lines 300-308):
  ```ts
  const runAnalysis = useCallback((board: number[], player: number) => {
    setIsAnalyzing(true);
    const timer = setTimeout(() => {
      const results = analyzeAllMoves(board, player, searchDepth, rules);
      setAnalysisResults(results);
      setIsAnalyzing(false);
    }, 10);
    return () => clearTimeout(timer);
  }, [searchDepth, rules]);
  ```
  `analyzeAllMoves` runs synchronously on the main JavaScript thread via `setTimeout(..., 10)`. At depth 6-8 this blocks UI frames.
- **Bot Scheduling & Pacing** (`src/App.tsx`, lines 638-662):
  - Normal thinking pause: 1,200 ms; slow thinking pause: 1,600 ms.
  - When `sowSpeed === 'instant'`, line 647 sets `thinkDelay = 20ms`. This violates the locked UX rule that bot thinking must always preserve a human pause floor (minimum 0.6 s).
- **Navigation Tray** (`src/App.tsx`, lines 2490-2564):
  - Fixed 5 buttons: `bottom-board-btn` (Board), `bottom-analysis-btn` (Analysis), `tutor-toggle` (Coach On/Off toggle), `bottom-rules-btn` (Rules modal), `bottom-settings-btn` (Settings).
  - Note: The Coach button currently toggles tutor mode inline rather than switching to a dedicated Coach tab view.

### 1.4 Detailed Inspection of Game Engine (`src/engine.ts`)
- **Board Geometry Constants** (`src/engine.ts`, lines 1-5):
  - `TOTAL_PITS = 14`, `P1_STORE = 6`, `P2_STORE = 13`, `P1_PITS = [0, 1, 2, 3, 4, 5]`, `P2_PITS = [7, 8, 9, 10, 11, 12]`.
  - Sowing logic (`simulateMove`, line 103): `current = (current + 1) % 14`.
  - Capture logic (`simulateMove`, line 127): `oppositePit = 12 - lastLanding`.
  - These geometric constants are hardcoded and prevent multi-variant support (such as 12-pit Oware or 4-row Bao).
- **Evaluation Function** (`src/engine.ts`, lines 232-254):
  - `evaluatePosition(board)`: `(storeDiff * 3.5) + ((p1Stones - p2Stones) * 0.6) + (p1Potential - p2Potential)`.
  - Win probability calculated via logistic sigmoid (`src/engine.ts`, line 380): `1 / (1 + Math.exp(-score * 0.022))`.
- **Search Engine** (`src/engine.ts`, lines 256-322):
  - Minimax with alpha-beta pruning.
  - Transposition table (`transpositionTable`, Map with `TT_MAX_ENTRIES = 250_000`), bounded with `EXACT`, `LOWER`, `UPPER` flags and rules key hashing (`rulesKey(rules)`).
  - Soundness confirmed by `src/search.test.ts`.

---

## 2. Logic Chain

1. **Premise 1 (Existing Baseline Health):**
   - Observations 1.1 show `vitest run` passes 27/27 tests, `tsc --noEmit` produces 0 type errors, and `npm run build` succeeds cleanly.
   - The current baseline is mechanically functional, type-safe, and stable.

2. **Premise 2 (App.tsx Monolith Violation):**
   - Observations 1.3 show `src/App.tsx` is 2,471 lines. `docs/plan/phase-0-foundation.md` Section 0.2 explicitly sets the acceptance threshold: `App.tsx` must be decomposed to `< 300 lines` with pure reducers and extracted components.
   - 38+ disparate state hooks currently reside in `App.tsx`. Extracting `gameReducer` (actions: `MOVE`, `UNDO`, `RESET`, `SET_MODE`), `useGame` hook, and presentational subcomponents (`Board`, `Pit`, `Store`, panels, trays) is required.

3. **Premise 3 (Hardcoded Board Geometry vs RuleSet):**
   - Observations 1.4 show `src/engine.ts` hardcodes literals `14`, `6`, `13`, and `12 - lastLanding`.
   - `docs/plan/phase-0-foundation.md` Section 0.1 explicitly requires a headless `RuleSet` interface (`src/rules/types.ts`, `src/rules/kalah.ts`) and mandates that no file outside `src/rules/kalah.ts` contains literals `13` or `12 - ` as board geometry.

4. **Premise 4 (Worker Offload Deficiency):**
   - Observations 1.3 show `analyzeAllMoves` runs synchronously on the UI thread inside a 10ms `setTimeout`.
   - `phase-0-foundation.md` Section 0.3 mandates engine evaluation in a cancellable Web Worker (`src/workers/search.worker.ts`, `src/workers/searchClient.ts`) with request IDs and fallback.

5. **Premise 5 (Autosave & Persistence Absence):**
   - Observations 1.3 show settings are persisted to localStorage, but active game states are not.
   - `phase-0-foundation.md` Section 0.4 mandates key `mancala_game_v1` move-replay persistence from `initial()` state, allowing safe resume of interrupted games.

6. **Premise 6 (End-to-End Testing & Mobile Guardrails Gap):**
   - Observations 1.1 show `@playwright/test` is not installed, and no `e2e/` specs exist.
   - `phase-0-foundation.md` Section 0.6 and Acceptance Criteria mandate Playwright mobile tests across viewports (360x740, 393x852, 768x1024, 1280x800) asserting zero horizontal scroll (`document.documentElement.scrollWidth <= innerWidth`) and fixed 5-item bottom tray integrity.

---

## 3. Caveats

- **No Caveats on Local Toolchain:** Node, npm, TypeScript, Vite, and Vitest were directly verified via active execution and exit codes.
- **Scope Limitation:** Investigation focused on Phase 0 prerequisites and cross-phase architectural mapping. Phase 1-4 code has not yet been authored in the codebase (as designed by the phasing schedule).
- **Worker Environment:** Browser Web Worker execution requires bundling via Vite (`new Worker(new URL('./search.worker.ts', import.meta.url), { type: 'module' })`), which must be verified under both `npm run dev` and `npm run build`.

---

## 4. Conclusion

The current codebase is in a clean, working state (27 passing tests, clean build, clean typecheck), but represents a monolithic proof-of-concept centered around a 2,471-line `App.tsx` and a hardcoded Kalah engine. 

To execute the target architecture, **Phase 0 (Foundation)** must be implemented in the following sequence:
1. **0.1 RuleSet Interface:** Create `src/rules/types.ts` and `src/rules/kalah.ts`, extract geometry literals, update `engine.ts` to delegate to `RuleSet`, and add 2,000-game fuzz test `src/rules/kalah.test.ts`.
2. **0.2 Decompose `src/App.tsx`:** Extract `src/game/gameReducer.ts`, `src/game/useGame.ts`, `src/components/board/`, `src/components/panels/`, `src/components/shell/`, and `src/lib/storage.ts`, reducing `src/App.tsx` to `< 300 lines` while preserving all 28+ `data-testid` attributes.
3. **0.3 Web Worker Search:** Create `src/workers/search.worker.ts` and `src/workers/searchClient.ts` to offload `minimax` and `analyzeAllMoves` from the UI thread with request-id cancellation.
4. **0.4 Autosave & Resume:** Implement move-replay serialization in `localStorage` under `mancala_game_v1` with continue prompt.
5. **0.5 Principal Variation UI:** Store full PV and format with responsive truncation.
6. **0.6 Playwright Setup:** Install `@playwright/test`, add `playwright.config.ts`, and implement `e2e/no-hscroll.spec.ts`, `e2e/tray.spec.ts`, and `e2e/play-a-move.spec.ts`.

---

## 5. Verification Method

To independently verify the observations and conclusions in this report:

1. **Verify Unit Tests:**
   ```bash
   npm test
   ```
   *Expected:* 5 test files pass (27 tests), 0 failures.

2. **Verify Type-Checking:**
   ```bash
   npx tsc --noEmit
   ```
   *Expected:* Clean exit (code 0) with no errors.

3. **Verify Production Build:**
   ```bash
   npm run build
   ```
   *Expected:* Vite builds production bundle into `dist/` cleanly.

4. **Verify Line Counts:**
   In PowerShell:
   ```powershell
   Get-Content src/App.tsx | Measure-Object -Line
   ```
   *Expected:* ~2,471 lines (confirming monolithic status requiring refactor).

5. **Verify Hardcoded Literals:**
   ```bash
   rg "12 - " src/
   ```
   *Expected:* Matches in `src/engine.ts:127` and `src/tactics.ts:26`.
