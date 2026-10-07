import { RuleSet, GameState, MoveResult, Player, BoardLayout } from './types';

export const congkakLayout: BoardLayout = {
  rows: 2,
  cols: 7,
  stores: [7, 15],
  pitOwner(i: number): Player {
    if (i >= 0 && i <= 6) return 0;
    if (i >= 8 && i <= 14) return 1;
    return i === 7 ? 0 : 1;
  },
  label(i: number): string {
    if (i === 7) return 'Rumah 1';
    if (i === 15) return 'Rumah 2';
    return `Lubang ${i + 1}`;
  },
};

export class CongkakRuleSet implements RuleSet {
  id = 'congkak';
  name = 'Congkak / Dakon (Beta)';
  layout = congkakLayout;

  initial(): GameState {
    const board = new Array(16).fill(0);
    // 7 stones per pit (98 stones total)
    for (let i = 0; i <= 6; i++) board[i] = 7;
    for (let i = 8; i <= 14; i++) board[i] = 7;
    board[7] = 0;
    board[15] = 0;
    return {
      board,
      turn: 0,
      over: false,
    };
  }

  legalMoves(s: GameState): number[] {
    if (s.over) return [];
    const valid: number[] = [];
    const start = s.turn === 0 ? 0 : 8;
    const end = s.turn === 0 ? 6 : 14;
    for (let i = start; i <= end; i++) {
      if (s.board[i] > 0) valid.push(i);
    }
    return valid;
  }

  apply(s: GameState, move: number): MoveResult {
    const board = [...s.board];
    const path: number[] = [];
    let stones = board[move];
    board[move] = 0;

    let curr = move;
    const opponentStore = s.turn === 0 ? 15 : 7;
    const ownStore = s.turn === 0 ? 7 : 15;

    while (stones > 0) {
      curr = (curr + 1) % 16;
      if (curr === opponentStore) continue; // Skip opponent store
      board[curr]++;
      path.push(curr);
      stones--;
    }

    const lastLanding = curr;
    let extraTurn = lastLanding === ownStore;
    let captured = 0;

    // Menembak (shooting) capture: if last stone lands in empty own pit with opponent stones opposite
    if (
      this.layout.pitOwner(lastLanding) === s.turn &&
      board[lastLanding] === 1 &&
      lastLanding !== ownStore
    ) {
      const opposite = 14 - lastLanding;
      if (board[opposite] > 0) {
        captured = board[opposite] + 1;
        board[ownStore] += captured;
        board[opposite] = 0;
        board[lastLanding] = 0;
      }
    }

    // Check if one side is empty
    const p0Stones = board.slice(0, 7).reduce((a, b) => a + b, 0);
    const p1Stones = board.slice(8, 15).reduce((a, b) => a + b, 0);
    const over = p0Stones === 0 || p1Stones === 0;

    const nextTurn: Player = extraTurn && !over ? s.turn : s.turn === 0 ? 1 : 0;

    return {
      state: {
        board,
        turn: nextTurn,
        over,
      },
      captured,
      extraTurn,
      path,
      lastLanding,
    };
  }

  isTerminal(s: GameState): boolean {
    return s.over || this.legalMoves(s).length === 0;
  }

  score(s: GameState): [number, number] {
    return [s.board[7], s.board[15]];
  }

  key(s: GameState): string {
    return `congkak:${s.turn}:${s.board.join(',')}`;
  }
}

export const congkakRuleSet = new CongkakRuleSet();
