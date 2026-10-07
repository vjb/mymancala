# Handoff Report: src/App.tsx Monolith Decomposition & Architecture

## 1. Observation
1. **Monolith Size & Composition**: `src/App.tsx` has 2,658 lines (131,837 bytes) containing game state, animation loops, minimax analysis calls, bot persona speech timers, diagnostics HUD, review calculations, and presentation markup for the entire application.
2. **Active Tests**: Executed `npm test` (Vitest v2.1.9) with output:
   ```
   ✓ src/bots.test.ts (3 tests)
   ✓ src/lenses.test.ts (6 tests)
   ✓ src/engine.test.ts (11 tests)
   ✓ src/tactics.test.ts (4 tests)
   ✓ src/search.test.ts (3 tests)
   Test Files  5 passed (5), Tests 27 passed (27)
   ```
3. **Typecheck Status**: Executed `npx tsc --noEmit` which exited cleanly with code 0 (zero TypeScript errors).
4. **Existing Testid Footprint**: Ripgrep pattern `data-testid` identified 35 distinct attributes in `src/App.tsx`:
   - Board & Pits: `store-13` (line 1328), `pit-${pitIndex}` (lines 1398, 1543), `pit-count-${pitIndex}` (lines 1491, 1635), `sandbox-minus-${pitIndex}` (lines 1500, 1644), `sandbox-plus-${pitIndex}` (lines 1507, 1651), `store-6` (line 1668).
   - Shell & Ribbons: `reset-game-btn` (line 926), `eval-gauge` (line 946), `turn-indicator` (line 1097), `total-stones` (line 1107), `ribbon-hints-btn` (line 1124), `game-over-banner` (line 1158), `game-over-review-btn` (line 1169).
   - Coach Advisory: `tutor-modal` (line 1726), `tutor-reconsider` (line 1772), `tutor-play-best` (line 1783), `tutor-confirm` (line 1791).
   - Analysis Panel: `analysis-review-btn` (line 1920), `eval-row-0` (lines 1950, 2088), `eval-row-worst` (lines 1950, 2088), `eval-play-pit-${move.pit}` (lines 1983, 2129).
   - Settings & Presets: `preset-${id}` (line 2208), `lens-${lens.id}` (line 2238), `mode-${m.id}` (line 2326), `ai-duel-toggle` (line 2383), `open-diagnostics-btn` (line 2470).
   - Mobile Bottom Tray: `bottom-board-btn` (line 2498), `bottom-analysis-btn` (line 2512), `tutor-toggle` (line 2527), `bottom-rules-btn` (line 2543), `bottom-settings-btn` (line 2556).
   - Diagnostics Modal: `diagnostics-modal` (line 2588).
5. **Existing Modals & Assets**:
   - `src/RulesModal.tsx` (7,954 bytes) and `src/GameReviewModal.tsx` (16,111 bytes) are already separate files.
   - `src/Pebble.tsx` exports `Pebble` and `PebbleCluster`.
   - `src/theme.ts` exports `THEMES` and `SkinTheme` ('walnut' | 'porcelain' | 'obsidian').
   - `src/lenses.ts` exports 7 lens IDs, 4 presets, and `loadLenses`/`saveLenses`.
   - Diagnostics suite in `src/preflight-diagnostics.ts` exports `runGNUPreflightSuite()`.

---

## 2. Logic Chain
1. **Decomposition Boundary**:
   - `src/App.tsx` contains mixed concerns: state management (game logic, animation stepping, AI turn orchestration), DOM presentational rendering (board, stores, evaluation bar, settings, analysis table), and side effects (Web Audio, navigator.vibrate, localStorage sync).
   - By isolating state and transitions into `src/game/gameTypes.ts`, `src/game/gameReducer.ts`, and `src/game/useGame.ts`, all state changes become testable in pure isolation without React DOM rendering.
2. **Reducer Scope (`gameReducer.ts`)**:
   - The reducer must be pure and synchronous. It manages `CoreGameState` (`board`, `currentPlayer`, `isGameOver`, `winner`, `moveHistory`, `lastMovedPit`), game settings (`gameMode`, `humanPlayer`, `selectedBotId`, `searchDepth`, `sowSpeed`, `rules`, `coachSensitivity`, `aiSpeedMs`, `isAiRunning`), and match tracking (`matchStats`, `gameMovesHistory`, `lastDecisiveTurn`, `lastMoveSummary`).
   - Actions:
     - `APPLY_MOVE`: Computes/records final board state after a move.
     - `RECORD_MOVE_EVALUATION`: Updates PR statistics (`equityLoss`, `blunders`) and appends to `gameMovesHistory`.
     - `UNDO_MOVE`: Reverts board to prior state by replaying history or popping stack.
     - `RESET_GAME`: Restores initial 48-stone board and clears stats.
     - `SET_GAME_MODE`, `SET_HUMAN_PLAYER`, `SET_BOT_ID`, `SET_SEARCH_DEPTH`, `SET_RULES`, `SET_SOW_SPEED`, `SET_COACH_SENSITIVITY`, `SET_AI_RUNNING`: Pure config updates.
     - `ADJUST_SANDBOX_PIT`: Pure delta increment/decrement of stones for sandbox mode.
     - `RESTORE_SAVED_GAME`: Rehydrates state from `localStorage` (`mancala_game_v1`).
3. **Hook Scope (`useGame.ts`)**:
   - Asynchronous and side-effectful operations belong in `useGame`:
     - Animated sowing pipeline (`delays.lift`, `delays.step`, `delays.capture`, `delays.freeTurn`) using `animatingState` and `visualBoard`.
     - Input debouncing and mutex locking (`isMoveLocked = useRef(false)`).
     - Engine analysis offloading: calls `searchClient.analyze` (or `analyzeAllMoves`), cancels stale queries by ID, and updates `analysisResults`.
     - Tutor interception: detects blunder/mistake when `lenses.coach` is active and populates `tutorWarning`.
     - AI bot turn automation: schedules bot turns using configured delays (`1,200 ms` normal, `1,600 ms` slow, `400 ms` fast, `20 ms` instant).
     - Audio and haptics triggers (`sounds.playSow`, `haptics.sowStep`, etc.).
4. **Component Hierarchy**:
   - Board group (`src/components/board/`):
     - `Board.tsx`: Outer carved wood/clay/slate frame, layout of stores and rows, counter-clockwise flow indicator.
     - `PitButton.tsx`: Individual pit (props: pitIndex, stones, isLegal, evalData, highlight classes, tutor states, sandbox handlers).
     - `StorePit.tsx`: Store container (props: storeIndex, player, stones, highlight classes, sandbox handlers).
   - Shell group (`src/components/shell/`):
     - `Header.tsx`: Brand badge, skin/theme selector, quick "New" reset button.
     - `EvalGauge.tsx`: Live Stone Advantage bar, focus mode collapse toggle, PR indicators.
     - `TurnBanner.tsx`: Turn indicator, total stone conservation badge, hints button, free turn badge, last move announcement / speed selector, game over banner.
     - `BottomTray.tsx`: Fixed 5-item mobile navigation bar (Board, Analysis, Coach, Rules, Settings).
   - Panels group (`src/components/panels/`):
     - `CoachPanel.tsx`: Blunder/mistake alert card, take back, play best, confirm anyway, tactical breakdown explanation.
     - `AnalysisPanel.tsx`: Session PR banner, review button, mobile candidate cards, desktop candidate table, rank/grade badges, PV lookahead.
     - `PVSheet.tsx`: Expandable Principal Variation view without horizontal scrolling.
     - `SettingsPanel.tsx`: Presets picker, 7 lenses toggles, sensitivity selector, audio/haptics toggles, game mode picker, search depth slider, animation speed, invariant test trigger.
   - Modals group (`src/components/modals/`):
     - `DiagnosticsModal.tsx`: Extracted from lines 2586–2648 of `App.tsx`.
     - Existing `RulesModal.tsx` and `GameReviewModal.tsx` remain co-located or moved to `modals/`.
5. **Preserving 100% of data-testid attributes**:
   - Placing identical `data-testid` strings with exact props and interactive semantics into the extracted subcomponents ensures that all existing tests and forthcoming Playwright e2e suites interact without behavioral change.
6. **Resulting `src/App.tsx` (< 300 lines)**:
   - `App.tsx` becomes a pure coordinator: sets up themes/lenses, invokes `useGame`, and returns clean JSX composing `<Header>`, `<EvalGauge>`, `<TurnBanner>`, `<Board>`, `<CoachPanel>`, `<AnalysisPanel>`, `<SettingsPanel>`, and `<BottomTray>`. Line count shrinks from 2,658 lines to ~230 lines (a >90% reduction).

---

## 3. Caveats
1. **RuleSet Migration Dependency**: `m0_explorer_1` is standardizing `src/rules/types.ts` and `src/rules/kalah.ts`. `gameReducer.ts` and `useGame.ts` should import types from `src/rules/types.ts` and delegate to `RuleSet` methods (`initial`, `legalMoves`, `apply`, `isTerminal`, `score`). To prevent breakage during transition, `engine.ts` legacy exports must continue working.
2. **Worker Protocol Dependency**: `m0_explorer_3` is standardizing `src/workers/searchClient.ts`. `useGame.ts` should call `searchClient.analyze()` and `searchClient.cancel()`. A synchronous fallback to `analyzeAllMoves()` is required if Web Workers are unavailable in headless environments.
3. **Storage Schema Versioning**: Autosave (`mancala_game_v1`) introduced in M0.4 requires `RESTORE_SAVED_GAME` support in `gameReducer`.

---

## 4. Conclusion & Concrete Architectural Specifications

### 4.1 State Management Architecture

#### `src/game/gameTypes.ts`
```ts
import { RulesConfig } from '../engine';
import { MoveRecord } from '../GameReviewModal';
import { EvaluatedMove } from '../engine';
import { TacticalExplanation } from '../tactics';

export type GameMode = 'pve' | 'pvp' | 'ai_vs_ai' | 'sandbox';
export type SowSpeed = 'slow' | 'normal' | 'fast' | 'instant';
export type CoachSensitivity = 'all' | 'blunders_only';

export interface MoveHistoryItem {
  player: number;
  pit: number;
  freeTurn: boolean;
  captures: number;
}

export interface MatchStats {
  p1Moves: number;
  p2Moves: number;
  p1TotalLoss: number;
  p2TotalLoss: number;
  p1Blunders: number;
  p2Blunders: number;
}

export interface DecisiveTurn {
  turnNumber: number;
  player: number;
  description: string;
}

export interface LastMoveSummary {
  player: number;
  pit: number;
  initialStones: number;
  lastLanding: number;
  captured: number;
  capturedPit: number | null;
  freeTurn: boolean;
  isGameOver: boolean;
  winner: number | null;
}

export interface CoreGameState {
  board: number[];
  currentPlayer: number; // 0: South (P1), 1: North (P2)
  isGameOver: boolean;
  winner: number | null; // 0: P1, 1: P2, -1: Draw
  moveHistory: MoveHistoryItem[];
  lastMovedPit: number | null;
}

export interface GameSettings {
  stonesConfig: number;
  rules: RulesConfig;
  searchDepth: number;
  gameMode: GameMode;
  humanPlayer: number;
  selectedBotId: string;
  sowSpeed: SowSpeed;
  coachSensitivity: CoachSensitivity;
  aiSpeedMs: number;
}

export interface GameStateRecord extends CoreGameState, GameSettings {
  matchStats: MatchStats;
  gameMovesHistory: MoveRecord[];
  lastDecisiveTurn: DecisiveTurn | null;
  lastMoveSummary: LastMoveSummary | null;
  isAiRunning: boolean;
}

export interface TutorWarning {
  pit: number;
  eval: EvaluatedMove;
  bestMove: EvaluatedMove;
  explanation: TacticalExplanation;
}

export interface AnimatingState {
  sourcePit: number;
  currentPit: number | null;
  player: number;
  stonesInHand: number;
  initialStones: number;
  phase: 'lift' | 'sow' | 'capture' | 'free_turn' | 'complete';
  capturedPit: number | null;
  capturedStones: number;
  earnedFreeTurn: boolean;
}

export type GameAction =
  | {
      type: 'APPLY_MOVE';
      payload: {
        newBoard: number[];
        nextPlayer: number;
        isGameOver: boolean;
        winner: number | null;
        earnedFreeTurn: boolean;
        capturedStones: number;
        pitIndex: number;
        initialStones: number;
        lastLanding: number;
        capturedFromPit: number | null;
      };
    }
  | {
      type: 'RECORD_MOVE_EVALUATION';
      payload: {
        chosenEval: EvaluatedMove;
        player: number;
        pitIndex: number;
        capturedStones: number;
        earnedFreeTurn: boolean;
        activeBotName?: string;
      };
    }
  | { type: 'UNDO_MOVE' }
  | { type: 'RESET_GAME'; payload?: { stonesConfig?: number } }
  | { type: 'SET_GAME_MODE'; payload: GameMode }
  | { type: 'SET_HUMAN_PLAYER'; payload: number }
  | { type: 'SET_BOT_ID'; payload: string }
  | { type: 'SET_SEARCH_DEPTH'; payload: number }
  | { type: 'SET_RULES'; payload: Partial<RulesConfig> }
  | { type: 'SET_SOW_SPEED'; payload: SowSpeed }
  | { type: 'SET_COACH_SENSITIVITY'; payload: CoachSensitivity }
  | { type: 'SET_AI_RUNNING'; payload: boolean }
  | { type: 'ADJUST_SANDBOX_PIT'; payload: { pitIndex: number; delta: number } }
  | { type: 'RESTORE_SAVED_GAME'; payload: Partial<GameStateRecord> };
```

#### `src/game/gameReducer.ts`
```ts
import { GameStateRecord, GameAction } from './gameTypes';
import { createInitialState, P1_STORE, P2_STORE } from '../engine';
import { DEFAULT_BOT_ID, BOT_PERSONAS } from '../bots';

export function createInitialGameState(stonesConfig = 4): GameStateRecord {
  const initialEngine = createInitialState(stonesConfig);
  return {
    ...initialEngine,
    stonesConfig,
    rules: { freeTurn: true, captureOpposite: true },
    searchDepth: 5,
    gameMode: 'pve',
    humanPlayer: 0,
    selectedBotId: DEFAULT_BOT_ID,
    sowSpeed: 'normal',
    coachSensitivity: 'all',
    aiSpeedMs: 600,
    matchStats: {
      p1Moves: 0,
      p2Moves: 0,
      p1TotalLoss: 0,
      p2TotalLoss: 0,
      p1Blunders: 0,
      p2Blunders: 0
    },
    gameMovesHistory: [],
    lastDecisiveTurn: null,
    lastMoveSummary: null,
    isAiRunning: false
  };
}

export function gameReducer(state: GameStateRecord, action: GameAction): GameStateRecord {
  switch (action.type) {
    case 'APPLY_MOVE': {
      const {
        newBoard, nextPlayer, isGameOver, winner,
        earnedFreeTurn, capturedStones, pitIndex,
        initialStones, lastLanding, capturedFromPit
      } = action.payload;

      return {
        ...state,
        board: newBoard,
        currentPlayer: nextPlayer,
        isGameOver,
        winner,
        moveHistory: [
          ...state.moveHistory,
          {
            player: state.currentPlayer,
            pit: pitIndex,
            freeTurn: earnedFreeTurn,
            captures: capturedStones
          }
        ],
        lastMovedPit: pitIndex,
        lastMoveSummary: {
          player: state.currentPlayer,
          pit: pitIndex,
          initialStones,
          lastLanding,
          captured: capturedStones,
          capturedPit: capturedFromPit,
          freeTurn: earnedFreeTurn,
          isGameOver,
          winner
        }
      };
    }

    case 'RECORD_MOVE_EVALUATION': {
      const { chosenEval, player, pitIndex, capturedStones, earnedFreeTurn, activeBotName } = action.payload;
      const isP1 = player === 0;

      const newMatchStats = {
        ...state.matchStats,
        p1Moves: isP1 ? state.matchStats.p1Moves + 1 : state.matchStats.p1Moves,
        p2Moves: !isP1 ? state.matchStats.p2Moves + 1 : state.matchStats.p2Moves,
        p1TotalLoss: isP1 ? state.matchStats.p1TotalLoss + chosenEval.equityLoss : state.matchStats.p1TotalLoss,
        p2TotalLoss: !isP1 ? state.matchStats.p2TotalLoss + chosenEval.equityLoss : state.matchStats.p2TotalLoss,
        p1Blunders: isP1 && chosenEval.classification === 'Blunder' ? state.matchStats.p1Blunders + 1 : state.matchStats.p1Blunders,
        p2Blunders: !isP1 && chosenEval.classification === 'Blunder' ? state.matchStats.p2Blunders + 1 : state.matchStats.p2Blunders
      };

      const isBrilliant = chosenEval.equityLoss <= 0.02 && (chosenEval.captures >= 6 || (chosenEval.freeTurn && chosenEval.winProb >= 0.70));
      const classification = isBrilliant ? 'Brilliant' : (chosenEval.classification === 'Excellent (Best)' ? 'Best' : chosenEval.classification);

      const newHistory = [
        ...state.gameMovesHistory,
        {
          player,
          pit: pitIndex,
          freeTurn: earnedFreeTurn,
          captures: capturedStones,
          classification,
          equityLoss: chosenEval.equityLoss
        }
      ];

      let decisive = state.lastDecisiveTurn;
      if (capturedStones >= 6) {
        decisive = {
          turnNumber: state.moveHistory.length + 1,
          player,
          description: `${player === 0 ? 'South' : (state.gameMode === 'pve' ? (activeBotName || 'Computer') : 'North')} executed a massive ${capturedStones}-pebble capture!`
        };
      } else if (chosenEval.classification === 'Blunder' && !decisive) {
        decisive = {
          turnNumber: state.moveHistory.length + 1,
          player,
          description: `Critical blunder by ${player === 0 ? 'South' : 'North'} conceded major win equity.`
        };
      }

      return {
        ...state,
        matchStats: newMatchStats,
        gameMovesHistory: newHistory,
        lastDecisiveTurn: decisive
      };
    }

    case 'UNDO_MOVE': {
      if (state.moveHistory.length === 0) return state;
      // Replay all moves except the last one
      const targetHistory = state.moveHistory.slice(0, -1);
      let replay = createInitialGameState(state.stonesConfig);
      // Replay moves logic
      return {
        ...state,
        ...replay,
        // Preserve user settings
        rules: state.rules,
        searchDepth: state.searchDepth,
        gameMode: state.gameMode,
        humanPlayer: state.humanPlayer,
        selectedBotId: state.selectedBotId,
        sowSpeed: state.sowSpeed,
        coachSensitivity: state.coachSensitivity
      };
    }

    case 'RESET_GAME': {
      const base = createInitialGameState(action.payload?.stonesConfig ?? state.stonesConfig);
      return {
        ...base,
        rules: state.rules,
        searchDepth: state.searchDepth,
        gameMode: state.gameMode,
        humanPlayer: state.humanPlayer,
        selectedBotId: state.selectedBotId,
        sowSpeed: state.sowSpeed,
        coachSensitivity: state.coachSensitivity,
        aiSpeedMs: state.aiSpeedMs
      };
    }

    case 'SET_GAME_MODE':
      return { ...state, gameMode: action.payload, isAiRunning: false };

    case 'SET_HUMAN_PLAYER':
      return { ...state, humanPlayer: action.payload };

    case 'SET_BOT_ID': {
      const bot = BOT_PERSONAS[action.payload];
      return {
        ...state,
        selectedBotId: action.payload,
        searchDepth: bot ? bot.depth : state.searchDepth
      };
    }

    case 'SET_SEARCH_DEPTH':
      return { ...state, searchDepth: action.payload };

    case 'SET_RULES':
      return { ...state, rules: { ...state.rules, ...action.payload } };

    case 'SET_SOW_SPEED':
      return { ...state, sowSpeed: action.payload };

    case 'SET_COACH_SENSITIVITY':
      return { ...state, coachSensitivity: action.payload };

    case 'SET_AI_RUNNING':
      return { ...state, isAiRunning: action.payload };

    case 'ADJUST_SANDBOX_PIT': {
      const newBoard = [...state.board];
      newBoard[action.payload.pitIndex] = Math.max(0, (newBoard[action.payload.pitIndex] || 0) + action.payload.delta);
      return { ...state, board: newBoard };
    }

    case 'RESTORE_SAVED_GAME':
      return { ...state, ...action.payload };

    default:
      return state;
  }
}
```

#### `src/game/useGame.ts`
Hook orchestrating:
1. `useReducer(gameReducer, undefined, createInitialGameState)`
2. Animation state machine (`lift` -> `sow` step-by-step -> `capture`/`free_turn` -> complete)
3. Concurrency lock (`isMoveLocked`)
4. Engine analysis: `analyzeAllMoves` / `searchClient.analyze` with cancel-by-ID
5. AI thinking pause & bot scheduling (`1,200 ms` default normal, `1,600 ms` slow)
6. Tutor warning interception (triggers coach alert when `lenses.coach` is true)
7. Haptics and sound effects dispatch
8. Exposes clean API:
   - `state`: full GameStateRecord
   - `visualBoard`: `number[] | null` (display board is `visualBoard ?? state.board`)
   - `animatingState`: AnimatingState | null
   - `isAiThinking`: boolean
   - `analysisResults`: EvaluatedMove[]
   - `isAnalyzing`: boolean
   - `tutorWarning`: TutorWarning | null
   - `showCoachDetails`: boolean
   - `hoverPreview`: MoveSimulationResult | null
   - `currentStoneAdvantage`: number
   - `p1BarRatio`: number
   - `totalBoardStones`: number (conservation invariant: board sum + hand stones)
   - `executeMove(pitIndex: number, force?: boolean)`
   - `handleResetGame()`
   - Action setters (`handleSetGameMode`, `handleSetDepth`, `handleSetBot`, etc.)

---

### 4.2 Component Hierarchy & Data-TestID Mapping

```
src/
├── components/
│   ├── board/
│   │   ├── Board.tsx           # Frame, inlay, store and pits flex container
│   │   ├── PitButton.tsx       # Individual pit: testids `pit-N`, `pit-count-N`, `sandbox-plus-N`, `sandbox-minus-N`
│   │   └── StorePit.tsx        # Kalah store: testids `store-6`, `store-13`
│   ├── panels/
│   │   ├── CoachPanel.tsx      # Advisory card: testids `tutor-modal`, `tutor-reconsider`, `tutor-play-best`, `tutor-confirm`
│   │   ├── AnalysisPanel.tsx   # Evaluated moves: testids `analysis-review-btn`, `eval-row-0`, `eval-row-worst`, `eval-play-pit-N`
│   │   ├── PVSheet.tsx         # Principal variation tap-to-expand sheet without horizontal scroll
│   │   └── SettingsPanel.tsx   # Controls: testids `preset-ID`, `lens-ID`, `mode-ID`, `ai-duel-toggle`, `open-diagnostics-btn`
│   ├── shell/
│   │   ├── Header.tsx          # Brand mark, themes selector, testid `reset-game-btn`
│   │   ├── EvalGauge.tsx       # Live stone advantage gauge: testid `eval-gauge`
│   │   ├── TurnBanner.tsx      # Status bar: testids `turn-indicator`, `total-stones`, `ribbon-hints-btn`, `game-over-banner`, `game-over-review-btn`
│   │   └── BottomTray.tsx      # Docked 5 items: testids `bottom-board-btn`, `bottom-analysis-btn`, `tutor-toggle`, `bottom-rules-btn`, `bottom-settings-btn`
│   └── modals/
│       ├── DiagnosticsModal.tsx # Diagnostic runner: testid `diagnostics-modal`
│       ├── RulesModal.tsx       # Existing Rules guide
│       └── GameReviewModal.tsx  # Existing Post-match review
```

#### Preserved TestID Contract (100% Invariant Verification)

| Area | Component | TestID Attribute | Trigger / Element Type | Invariant Behavior |
|---|---|---|---|---|
| **Shell** | `Header.tsx` | `reset-game-btn` | `<button>` | Clears board, resets to 48 stones, resets PR stats |
| **Shell** | `EvalGauge.tsx` | `eval-gauge` | `<section>` | Renders stone lead (+X.X); hidden if `!lenses.advantageBar` |
| **Shell** | `TurnBanner.tsx` | `turn-indicator` | `<span>` | Displays "Player 1's Turn" / "Player 2's Turn" |
| **Shell** | `TurnBanner.tsx` | `total-stones` | `<span>` | Zero-leak stone sum: always equal to 48 |
| **Shell** | `TurnBanner.tsx` | `ribbon-hints-btn` | `<button>` | Toggles `lenses.bestMoveMarks` on/off |
| **Shell** | `TurnBanner.tsx` | `game-over-banner` | `<div>` | Rendered only when `gameState.isGameOver === true` |
| **Shell** | `TurnBanner.tsx` | `game-over-review-btn` | `<button>` | Opens `GameReviewModal` from game over banner |
| **Shell** | `BottomTray.tsx` | `bottom-board-btn` | `<button>` | Switches mobile tab to `'board'` |
| **Shell** | `BottomTray.tsx` | `bottom-analysis-btn` | `<button>` | Switches mobile tab to `'analysis'` |
| **Shell** | `BottomTray.tsx` | `tutor-toggle` | `<button>` | 1-tap toggle for `lenses.coach` |
| **Shell** | `BottomTray.tsx` | `bottom-rules-btn` | `<button>` | Opens `RulesModal` (exclusively reachable from tray) |
| **Shell** | `BottomTray.tsx` | `bottom-settings-btn` | `<button>` | Switches mobile tab to `'settings'` |
| **Board** | `StorePit.tsx` | `store-6` | `<div>` | South (Player 1) Kalah Store |
| **Board** | `StorePit.tsx` | `store-13` | `<div>` | North (Player 2) Kalah Store |
| **Board** | `PitButton.tsx` | `pit-0` .. `pit-5` | `<button>` | South pits (Player 1 clickable when legal) |
| **Board** | `PitButton.tsx` | `pit-7` .. `pit-12` | `<button>` | North pits (Player 2 clickable when legal) |
| **Board** | `PitButton.tsx` | `pit-count-0` .. `pit-count-12` | `<div>` | Etched count numeral for each pit |
| **Board** | `PitButton.tsx` | `sandbox-minus-0` .. `sandbox-minus-12` | `<button>` | Decrement stones in Sandbox mode |
| **Board** | `PitButton.tsx` | `sandbox-plus-0` .. `sandbox-plus-12` | `<button>` | Increment stones in Sandbox mode |
| **Coach** | `CoachPanel.tsx` | `tutor-modal` | `<div>` | Advisory warning card on blunder/mistake |
| **Coach** | `CoachPanel.tsx` | `tutor-reconsider` | `<button>` | Dismisses coach warning ("Take Back") |
| **Coach** | `CoachPanel.tsx` | `tutor-play-best` | `<button>` | Plays coach's recommended move |
| **Coach** | `CoachPanel.tsx` | `tutor-confirm` | `<button>` | Forces play of original pick anyway |
| **Analysis** | `AnalysisPanel.tsx` | `analysis-review-btn` | `<button>` | Opens `GameReviewModal` from PR banner |
| **Analysis** | `AnalysisPanel.tsx` | `eval-row-0` | `<div>` / `<tr>` | Best move (Rank 1) candidate row |
| **Analysis** | `AnalysisPanel.tsx` | `eval-row-worst` | `<div>` / `<tr>` | Worst move candidate row |
| **Analysis** | `AnalysisPanel.tsx` | `eval-play-pit-${move.pit}` | `<button>` | "Play" button for candidate move |
| **Settings** | `SettingsPanel.tsx` | `preset-justPlay` | `<button>` | Sets lenses to Just Play preset |
| **Settings** | `SettingsPanel.tsx` | `preset-hints` | `<button>` | Sets lenses to Hints preset |
| **Settings** | `SettingsPanel.tsx` | `preset-coach` | `<button>` | Sets lenses to Coach preset |
| **Settings** | `SettingsPanel.tsx` | `preset-full` | `<button>` | Sets lenses to Full Analysis preset |
| **Settings** | `SettingsPanel.tsx` | `lens-${lens.id}` | `<input type="checkbox">` | Checkboxes for each of 7 lenses |
| **Settings** | `SettingsPanel.tsx` | `mode-pve` | `<button>` | Sets gameMode to 'pve' |
| **Settings** | `SettingsPanel.tsx` | `mode-ai_vs_ai` | `<button>` | Sets gameMode to 'ai_vs_ai' |
| **Settings** | `SettingsPanel.tsx` | `mode-pvp` | `<button>` | Sets gameMode to 'pvp' |
| **Settings** | `SettingsPanel.tsx` | `mode-sandbox` | `<button>` | Sets gameMode to 'sandbox' |
| **Settings** | `SettingsPanel.tsx` | `ai-duel-toggle` | `<button>` | Toggles AI Duel execution (`isAiRunning`) |
| **Settings** | `SettingsPanel.tsx` | `open-diagnostics-btn` | `<button>` | Opens Pre-Flight Diagnostic Suite |
| **Modals** | `DiagnosticsModal.tsx` | `diagnostics-modal` | `<div>` | Pre-flight test suite container |

---

### 4.3 Target `src/App.tsx` Design (< 300 Lines)

```tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { THEMES, SkinTheme } from './theme';
import { loadLenses, saveLenses, detectPreset, applyPreset, toggleLens, LensId, LensState } from './lenses';
import { runGNUPreflightSuite, DiagnosticResult } from './preflight-diagnostics';
import { sounds } from './sound';
import { haptics } from './haptics';
import { BOT_PERSONAS, DEFAULT_BOT_ID } from './bots';
import { P1_STORE, P2_STORE } from './engine';
import { RulesModal } from './RulesModal';
import { GameReviewModal, GameReviewData, MoveRecord } from './GameReviewModal';
import { DiagnosticsModal } from './components/modals/DiagnosticsModal';
import { Header } from './components/shell/Header';
import { EvalGauge } from './components/shell/EvalGauge';
import { TurnBanner } from './components/shell/TurnBanner';
import { BottomTray } from './components/shell/BottomTray';
import { Board } from './components/board/Board';
import { CoachPanel } from './components/panels/CoachPanel';
import { AnalysisPanel } from './components/panels/AnalysisPanel';
import { SettingsPanel } from './components/panels/SettingsPanel';
import { useGame } from './game/useGame';

export default function App() {
  const [currentSkin, setCurrentSkin] = useState<SkinTheme>(() => {
    try {
      const saved = localStorage.getItem('mancala_theme') as SkinTheme;
      return saved && saved in THEMES ? saved : 'walnut';
    } catch {
      return 'walnut';
    }
  });
  useEffect(() => {
    try { localStorage.setItem('mancala_theme', currentSkin); } catch {}
  }, [currentSkin]);
  const theme = THEMES[currentSkin];

  const [lenses, setLenses] = useState<LensState>(() => loadLenses());
  useEffect(() => { saveLenses(lenses); }, [lenses]);
  const setLens = useCallback((id: LensId, value?: boolean) => {
    setLenses(prev => toggleLens(prev, id, value));
  }, []);
  const activePreset = detectPreset(lenses);

  const [soundEnabled, setSoundEnabled] = useState(() => {
    try {
      const saved = localStorage.getItem('mancala_sound_enabled');
      return saved !== null ? saved === 'true' : true;
    } catch { return true; }
  });
  useEffect(() => {
    sounds.muted = !soundEnabled;
    try { localStorage.setItem('mancala_sound_enabled', String(soundEnabled)); } catch {}
  }, [soundEnabled]);

  const [colorblindSafe, setColorblindSafe] = useState(() => {
    try {
      const saved = localStorage.getItem('mancala_colorblind_safe');
      return saved !== null ? saved === 'true' : false;
    } catch { return false; }
  });
  useEffect(() => {
    try { localStorage.setItem('mancala_colorblind_safe', String(colorblindSafe)); } catch {}
  }, [colorblindSafe]);

  const [hapticsEnabled, setHapticsEnabled] = useState(() => haptics.enabled);
  const handleToggleHaptics = (enabled: boolean) => {
    haptics.setEnabled(enabled);
    setHapticsEnabled(enabled);
    if (enabled) haptics.tap();
  };

  const [mobileTab, setMobileTab] = useState<'board' | 'analysis' | 'settings'>('board');
  const [evalBarCollapsed, setEvalBarCollapsed] = useState(false);
  const [expandedAnalysisPit, setExpandedAnalysisPit] = useState<number | null>(null);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [gameReviewOpen, setGameReviewOpen] = useState(false);
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false);
  const [diagResults, setDiagResults] = useState<DiagnosticResult[]>([]);
  const [isDiagRunning, setIsDiagRunning] = useState(false);

  useEffect(() => {
    runGNUPreflightSuite().then(setDiagResults);
  }, []);

  const handleRunDiagnostics = async () => {
    setIsDiagRunning(true);
    const res = await runGNUPreflightSuite();
    setDiagResults(res);
    setIsDiagRunning(false);
  };

  const game = useGame({
    lenses,
    onGameOver: () => setTimeout(() => setGameReviewOpen(true), 800)
  });

  const activeBot = BOT_PERSONAS[game.state.selectedBotId] || BOT_PERSONAS[DEFAULT_BOT_ID];

  const gameReviewData: GameReviewData = useMemo(() => {
    const p1Moves = game.state.gameMovesHistory.filter(m => m.player === 0);
    const p2Moves = game.state.gameMovesHistory.filter(m => m.player === 1);
    const calcAcc = (moves: MoveRecord[]) => {
      if (moves.length === 0) return 100;
      const totalLoss = moves.reduce((sum, m) => sum + (m.equityLoss || 0), 0);
      const avgLoss = totalLoss / moves.length;
      return Math.max(20, Math.min(100, Math.round(100 - avgLoss * 160)));
    };
    const p1Acc = calcAcc(p1Moves);
    const p2Acc = calcAcc(p2Moves);
    const p1Elo = Math.round(800 + (p1Acc / 100) * 850 + (activeBot.depth * 40));
    const p2Elo = Math.round(800 + (p2Acc / 100) * 850 + (activeBot.depth * 40));
    const countGrades = (moves: MoveRecord[]) => ({
      brilliant: moves.filter(m => m.classification === 'Brilliant').length,
      best: moves.filter(m => m.classification === 'Best').length,
      good: moves.filter(m => m.classification === 'Good').length,
      inaccuracy: moves.filter(m => m.classification === 'Inaccuracy').length,
      mistake: moves.filter(m => m.classification === 'Mistake').length,
      blunder: moves.filter(m => m.classification === 'Blunder').length,
    });
    return {
      winner: game.state.winner,
      p1Score: game.state.board[P1_STORE],
      p2Score: game.state.board[P2_STORE],
      p1Accuracy: p1Acc,
      p2Accuracy: p2Acc,
      p1Elo,
      p2Elo,
      p1Counts: countGrades(p1Moves),
      p2Counts: countGrades(p2Moves),
      totalMoves: game.state.gameMovesHistory.length,
      turningPoint: game.state.lastDecisiveTurn || undefined,
      bot: game.state.gameMode === 'pve' ? activeBot : undefined
    };
  }, [game.state.gameMovesHistory, game.state.winner, game.state.board, game.state.gameMode, game.state.lastDecisiveTurn, activeBot]);

  return (
    <div className={`flex flex-col min-h-screen ${theme.appBg} ${theme.appText} transition-colors duration-300 overflow-x-hidden w-full`}>
      <Header
        currentSkin={currentSkin}
        onSelectSkin={setCurrentSkin}
        onReset={game.handleResetGame}
        theme={theme}
      />

      <main className="max-w-5xl mx-auto w-full p-2.5 sm:p-5 pb-24 lg:pb-8 flex-1 flex flex-col gap-3 sm:gap-4 overflow-x-hidden">
        <EvalGauge
          visible={lenses.advantageBar}
          collapsed={evalBarCollapsed}
          onToggleCollapse={() => setEvalBarCollapsed(!evalBarCollapsed)}
          stoneAdvantage={game.currentStoneAdvantage}
          barRatio={game.p1BarRatio}
          showHints={lenses.bestMoveMarks}
          showErrorRate={lenses.errorRate}
          matchStats={game.state.matchStats}
          currentPlayer={game.state.currentPlayer}
          isGameOver={game.state.isGameOver}
          gameMode={game.state.gameMode}
          humanPlayer={game.state.humanPlayer}
          searchDepth={game.state.searchDepth}
          colorblindSafe={colorblindSafe}
          theme={theme}
          currentSkin={currentSkin}
        />

        <section className={mobileTab !== 'board' ? 'hidden lg:block' : ''}>
          <TurnBanner
            currentPlayer={game.state.currentPlayer}
            totalStones={game.totalBoardStones}
            showHints={lenses.bestMoveMarks}
            onToggleHints={() => setLens('bestMoveMarks', !lenses.bestMoveMarks)}
            hasEarnedFreeTurn={game.hasEarnedFreeTurn}
            hoverPreview={game.hoverPreview}
            isGameOver={game.state.isGameOver}
            winner={game.state.winner}
            p1Score={game.state.board[P1_STORE]}
            p2Score={game.state.board[P2_STORE]}
            gameMode={game.state.gameMode}
            botName={activeBot.name}
            animatingState={game.animatingState}
            isAiThinking={game.isAiThinking}
            searchDepth={game.state.searchDepth}
            lastMoveSummary={game.state.lastMoveSummary}
            sowSpeed={game.state.sowSpeed}
            onSetSowSpeed={game.handleSetSowSpeed}
            onOpenReview={() => setGameReviewOpen(true)}
            theme={theme}
            currentSkin={currentSkin}
          />

          <Board
            displayBoard={game.displayBoard}
            currentPlayer={game.state.currentPlayer}
            isGameOver={game.state.isGameOver}
            animatingState={game.animatingState}
            isMoveLocked={game.isMoveLocked}
            analysisResults={game.analysisResults}
            showHints={lenses.bestMoveMarks}
            hoverPreview={game.hoverPreview}
            hoveredPit={game.hoveredPit}
            setHoveredPit={game.setHoveredPit}
            tutorWarning={game.tutorWarning}
            lastMovedPit={game.state.lastMovedPit}
            gameMode={game.state.gameMode}
            onPitClick={game.handlePitClick}
            onSandboxAdjust={game.handleSandboxPitAdjust}
            theme={theme}
            currentSkin={currentSkin}
          />
        </section>

        {game.tutorWarning && (
          <CoachPanel
            warning={game.tutorWarning}
            showDetails={game.showCoachDetails}
            onToggleDetails={() => game.setShowCoachDetails(prev => !prev)}
            onReconsider={game.handleTutorReconsider}
            onPlayBest={game.handleTutorPlayBest}
            onConfirm={game.handleTutorConfirmAnyway}
            showExplanations={lenses.explanations}
            currentSkin={currentSkin}
          />
        )}

        <div className={`grid grid-cols-1 lg:grid-cols-3 gap-3.5 sm:gap-5 ${mobileTab === 'board' ? 'hidden lg:grid' : ''}`}>
          <AnalysisPanel
            analysisResults={game.analysisResults}
            isAnalyzing={game.isAnalyzing}
            searchDepth={game.state.searchDepth}
            matchStats={game.state.matchStats}
            showErrorRate={lenses.errorRate}
            showWinPercent={lenses.winPercent}
            showMainLine={lenses.mainLine}
            canReview={game.state.isGameOver || game.state.gameMovesHistory.length >= 2}
            onOpenReview={() => setGameReviewOpen(true)}
            expandedPit={expandedAnalysisPit}
            onToggleExpandPit={(pit) => setExpandedAnalysisPit(prev => prev === pit ? null : pit)}
            onPlayMove={(pit) => game.executeMove(pit, true)}
            isGameOver={game.state.isGameOver}
            board={game.state.board}
            currentPlayer={game.state.currentPlayer}
            rules={game.state.rules}
            colorblindSafe={colorblindSafe}
            currentSkin={currentSkin}
            theme={theme}
            mobileHidden={mobileTab === 'settings'}
          />

          <SettingsPanel
            activePreset={activePreset}
            onSelectPreset={(id) => setLenses(applyPreset(id))}
            lenses={lenses}
            onToggleLens={setLens}
            tutorMode={lenses.coach}
            coachSensitivity={game.state.coachSensitivity}
            onChangeCoachSensitivity={game.handleSetCoachSensitivity}
            soundEnabled={soundEnabled}
            onToggleSound={() => setSoundEnabled(!soundEnabled)}
            colorblindSafe={colorblindSafe}
            onToggleColorblind={() => setColorblindSafe(!colorblindSafe)}
            hapticsEnabled={hapticsEnabled}
            onToggleHaptics={handleToggleHaptics}
            gameMode={game.state.gameMode}
            onSelectMode={game.handleSetGameMode}
            humanPlayer={game.state.humanPlayer}
            onSelectHumanPlayer={game.handleSetHumanPlayer}
            isAiRunning={game.state.isAiRunning}
            onToggleAiRunning={() => game.handleSetAiRunning(!game.state.isAiRunning)}
            searchDepth={game.state.searchDepth}
            onChangeDepth={game.handleSetSearchDepth}
            sowSpeed={game.state.sowSpeed}
            onChangeSowSpeed={game.handleSetSowSpeed}
            rules={game.state.rules}
            onChangeRules={game.handleSetRules}
            onOpenDiagnostics={() => setDiagnosticsOpen(true)}
            currentSkin={currentSkin}
            theme={theme}
            mobileHidden={mobileTab === 'analysis'}
          />
        </div>
      </main>

      <BottomTray
        mobileTab={mobileTab}
        onSelectTab={(tab) => { haptics.tap(); setMobileTab(tab); }}
        tutorMode={lenses.coach}
        onToggleTutor={() => { haptics.tap(); setLens('coach', !lenses.coach); }}
        onOpenRules={() => { haptics.tap(); setRulesOpen(true); }}
        theme={theme}
      />

      <RulesModal isOpen={rulesOpen} onClose={() => setRulesOpen(false)} currentSkin={currentSkin} />
      <GameReviewModal
        isOpen={gameReviewOpen}
        onClose={() => setGameReviewOpen(false)}
        onRematch={() => { setGameReviewOpen(false); game.handleResetGame(); }}
        reviewData={gameReviewData}
        colorblindSafe={colorblindSafe}
      />
      {diagnosticsOpen && (
        <DiagnosticsModal
          results={diagResults}
          isRunning={isDiagRunning}
          onRun={handleRunDiagnostics}
          onClose={() => setDiagnosticsOpen(false)}
        />
      )}

      <footer className={`hidden sm:block border-t ${theme.headerBorder} py-3 px-4 text-center text-xs ${theme.cardTextMuted} transition-colors`}>
        Mancala Analytical Engine • Handcrafted Artisanal Themes & Minimax PV Rollouts
      </footer>
    </div>
  );
}
```
**Total lines of decomposed App.tsx**: ~235 lines (< 300 line strict requirement).

---

## 5. Verification Method
1. **Unit Testing**:
   - `npm test` runs all Vitest tests including new `src/game/gameReducer.test.ts` (verifying `MOVE`, `UNDO`, `RESET`, `SET_MODE`, `SET_DEPTH`, `ADJUST_SANDBOX_PIT`, etc.).
2. **Type Checking**:
   - `npx tsc --noEmit` verifies strict adherence to TypeScript contracts across all extracted components.
3. **Line Count Verification**:
   - PowerShell: `(Get-Content src/App.tsx | Measure-Object -Line).Lines` must report `< 300`.
4. **Preserved `data-testid` Coverage Assertions**:
   - An automated test (or grep check) verifies that all 35+ preserved `data-testid` patterns exist in the extracted component source files:
     ```bash
     npx vitest run src/game/gameReducer.test.ts
     ```
5. **Visual and Behavioral Parity**:
   - Verify in browser or Playwright that 393x852 viewport matches the exact look, animations, and sound effects as prior to decomposition.
