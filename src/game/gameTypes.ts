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
