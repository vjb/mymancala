import { RuleSet, GameState, MoveResult, Player, BoardLayout } from './types';

// Bao 4x8 pits layout (or simplified 2x8 for standard interface)
export const baoLayout: BoardLayout = {
  rows: 2,
  cols: 8,
  stores: [8, 17],
  pitOwner(i: number): Player {
    if (i >= 0 && i <= 7) return 0;
    if (i >= 9 && i <= 16) return 1;
    return i === 8 ? 0 : 1;
  },
  label(i: number): string {
    if (i === 8) return 'Mji 1';
    if (i === 17) return 'Mji 2';
    return `Shimo ${i + 1}`;
  },
};

export class BaoRuleSet implements RuleSet {
  id = 'bao';
  name = 'Bao la Kiswahili (Beta)';
  layout = baoLayout;

  initial(): GameState {
    const board = new Array(18).fill(0);
    // 2 stones per pit (32 stones total)
    for (let i = 0; i <= 7; i++) board[i] = 2;
    for (let i = 9; i <= 16; i++) board[i] = 2;
    board[8] = 0;
    board[17] = 0;
    return {
      board,
      turn: 0,
      over: false,
    };
  }

  legalMoves(s: GameState): number[] {
    if (s.over) return [];
    const valid: number[] = [];
    const start = s.turn === 0 ? 0 : 9;
    const end = s.turn === 0 ? 7 : 16;
    for (let i = start; i <= end; i++) {
      if (s.board[i] > 1) valid.push(i); // Bao requires pit with >= 2 stones to sow
    }
    // Fallback if only singletons remain
    if (valid.length === 0) {
      for (let i = start; i <= end; i++) {
        if (s.board[i] > 0) valid.push(i);
      }
    }
    return valid;
  }

  apply(s: GameState, move: number): MoveResult {
    const board = [...s.board];
    const path: number[] = [];
    let stones = board[move];
    board[move] = 0;

    let curr = move;
    while (stones > 0) {
      curr = (curr + 1) % 18;
      if (curr === 8 || curr === 17) continue; // Pits only
      board[curr]++;
      path.push(curr);
      stones--;
    }

    const lastLanding = curr;
    let captured = 0;
    const opponent = s.turn === 0 ? 1 : 0;

    // Capture front row opposite
    if (this.layout.pitOwner(lastLanding) === s.turn && board[lastLanding] > 1) {
      const opposite = 16 - lastLanding + 1;
      if (opposite >= 0 && opposite < board.length && board[opposite] > 0) {
        captured = board[opposite];
        board[s.turn === 0 ? 8 : 17] += captured;
        board[opposite] = 0;
      }
    }

    const p0Stones = board.slice(0, 8).reduce((a, b) => a + b, 0);
    const p1Stones = board.slice(9, 17).reduce((a, b) => a + b, 0);
    const over = p0Stones === 0 || p1Stones === 0;

    return {
      state: {
        board,
        turn: s.turn === 0 ? 1 : 0,
        over,
      },
      captured,
      extraTurn: false,
      path,
      lastLanding,
    };
  }

  isTerminal(s: GameState): boolean {
    return s.over || this.legalMoves(s).length === 0;
  }

  score(s: GameState): [number, number] {
    return [s.board[8], s.board[17]];
  }

  key(s: GameState): string {
    return `bao:${s.turn}:${s.board.join(',')}`;
  }
}

export const baoRuleSet = new BaoRuleSet();
