import { GameStateRecord, GameAction } from './gameTypes';
import { createInitialState, simulateMove } from '../engine';
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
      const classification: 'Brilliant' | 'Best' | 'Good' | 'Inaccuracy' | 'Mistake' | 'Blunder' = 
        isBrilliant ? 'Brilliant' : (chosenEval.classification === 'Excellent (Best)' ? 'Best' : chosenEval.classification);

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
      const targetHistory = state.moveHistory.slice(0, -1);
      const base = createInitialGameState(state.stonesConfig);
      let currentBoard = [...base.board];
      let currentPlayer = base.currentPlayer;
      let isGameOver = false;
      let winner: number | null = null;
      const newMoveHistory: typeof state.moveHistory = [];

      for (const item of targetHistory) {
        const sim = simulateMove(currentBoard, currentPlayer, item.pit, state.rules);
        currentBoard = sim.newBoard;
        currentPlayer = sim.nextPlayer;
        isGameOver = sim.isGameOver;
        winner = sim.winner;
        newMoveHistory.push({
          player: item.player,
          pit: item.pit,
          freeTurn: sim.earnedFreeTurn,
          captures: sim.capturedStones
        });
      }

      return {
        ...state,
        board: currentBoard,
        currentPlayer,
        isGameOver,
        winner,
        moveHistory: newMoveHistory,
        lastMovedPit: targetHistory.length > 0 ? targetHistory[targetHistory.length - 1].pit : null,
        lastMoveSummary: null,
        gameMovesHistory: state.gameMovesHistory.slice(0, targetHistory.length)
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
