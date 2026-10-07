export type Player = 0 | 1;

export interface Board {
  pits: number[];
}

export interface GameState {
  board: number[];
  turn: Player;
  over: boolean;
  extra?: unknown;
}

export interface MoveResult {
  state: GameState;
  captured: number;
  extraTurn: boolean;
  path: number[];
  capturedFrom?: number | null;
  lastLanding?: number;
}

export interface BoardLayout {
  rows: number;
  cols: number;
  stores: number[];
  pitOwner(i: number): Player;
  label(i: number): string;
}

export interface RuleSet {
  id: string;                         // 'kalah' | 'oware' | 'sow-and-score' | 'congkak' | 'bao'
  name: string;                       // display name (i18n key)
  initial(): GameState;
  legalMoves(s: GameState): number[]; // valid pit indices
  apply(s: GameState, move: number): MoveResult; // pure functional transition
  isTerminal(s: GameState): boolean;
  score(s: GameState): [number, number];     // banked stones [P0, P1]
  key(s: GameState): string;                 // TT key including variant options
  layout: BoardLayout;
}
