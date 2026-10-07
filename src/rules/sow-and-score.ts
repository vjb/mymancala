import { RuleSet, GameState, MoveResult, Player, BoardLayout } from './types';

export const SOW_SCORE_P0_PITS = [0, 1, 2, 3, 4, 5];
export const SOW_SCORE_P1_PITS = [7, 8, 9, 10, 11, 12];
export const SOW_SCORE_STORES = [6, 13];

export const sowAndScoreLayout: BoardLayout = {
  rows: 2,
  cols: 6,
  stores: [6, 13],
  pitOwner(i: number): Player {
    if (i >= 0 && i <= 5) return 0;
    if (i >= 7 && i <= 12) return 1;
    return i === 6 ? 0 : 1;
  },
  label(i: number): string {
    if (i === 6) return 'Store 1';
    if (i === 13) return 'Store 2';
    if (i >= 0 && i <= 5) return `Pit ${i + 1}`;
    return `Pit ${i}`;
  },
};

export class SowAndScoreRuleSet implements RuleSet {
  id = 'sow-and-score';
  name = 'Sow & Score';
  layout = sowAndScoreLayout;

  initial(): GameState {
    const board = new Array(14).fill(0);
    // 3 stones per pit for a brisk, kid-friendly teaching game (36 total)
    for (const p of SOW_SCORE_P0_PITS) board[p] = 3;
    for (const p of SOW_SCORE_P1_PITS) board[p] = 3;
    board[6] = 0;
    board[13] = 0;
    return {
      board,
      turn: 0,
      over: false,
    };
  }

  legalMoves(s: GameState): number[] {
    if (s.over) return [];
    const pits = s.turn === 0 ? SOW_SCORE_P0_PITS : SOW_SCORE_P1_PITS;
    return pits.filter(p => s.board[p] > 0);
  }

  apply(s: GameState, move: number): MoveResult {
    const board = [...s.board];
    const path: number[] = [];
    let stones = board[move];
    board[move] = 0;

    let curr = move;
    const opponentStore = s.turn === 0 ? 13 : 6;
    const ownStore = s.turn === 0 ? 6 : 13;

    while (stones > 0) {
      curr = (curr + 1) % 14;
      if (curr === opponentStore) continue; // Skip opponent store

      board[curr]++;
      path.push(curr);
      stones--;
    }

    const lastLanding = curr;
    // Free turn if landing in own store (teaching incentive)
    const extraTurn = lastLanding === ownStore;

    // Check if one side is empty
    const p0Stones = SOW_SCORE_P0_PITS.reduce((sum, p) => sum + board[p], 0);
    const p1Stones = SOW_SCORE_P1_PITS.reduce((sum, p) => sum + board[p], 0);
    let over = false;

    if (p0Stones === 0 || p1Stones === 0) {
      over = true;
      // Sweep remaining stones into stores
      for (const p of SOW_SCORE_P0_PITS) {
        board[6] += board[p];
        board[p] = 0;
      }
      for (const p of SOW_SCORE_P1_PITS) {
        board[13] += board[p];
        board[p] = 0;
      }
    }

    const nextTurn: Player = extraTurn && !over ? s.turn : s.turn === 0 ? 1 : 0;

    return {
      state: {
        board,
        turn: nextTurn,
        over,
      },
      captured: 0, // No captures in Sow & Score
      extraTurn,
      path,
      lastLanding,
    };
  }

  isTerminal(s: GameState): boolean {
    return s.over || this.legalMoves(s).length === 0;
  }

  score(s: GameState): [number, number] {
    return [s.board[6], s.board[13]];
  }

  key(s: GameState): string {
    return `sow-and-score:${s.turn}:${s.board.join(',')}`;
  }
}

export const sowAndScoreRuleSet = new SowAndScoreRuleSet();
