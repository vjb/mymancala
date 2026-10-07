import { RuleSet, GameState, MoveResult, Player, BoardLayout } from './types';

export const OWARE_P0_PITS = [0, 1, 2, 3, 4, 5];
export const OWARE_P1_PITS = [7, 8, 9, 10, 11, 12];
export const OWARE_STORES = [6, 13];

// Counter-clockwise pit cycle (skipping stores during sowing)
const PIT_CYCLE = [0, 1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 12];

function getNextPit(pit: number): number {
  const idx = PIT_CYCLE.indexOf(pit);
  return PIT_CYCLE[(idx + 1) % PIT_CYCLE.length];
}

function getPrevPit(pit: number): number {
  const idx = PIT_CYCLE.indexOf(pit);
  return PIT_CYCLE[(idx - 1 + PIT_CYCLE.length) % PIT_CYCLE.length];
}

export const owareLayout: BoardLayout = {
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

export class OwareRuleSet implements RuleSet {
  id = 'oware';
  name = 'Oware (Abapa)';
  layout = owareLayout;

  initial(): GameState {
    const board = new Array(14).fill(0);
    // 4 stones per pit, 48 total
    for (const p of OWARE_P0_PITS) board[p] = 4;
    for (const p of OWARE_P1_PITS) board[p] = 4;
    board[6] = 0;
    board[13] = 0;
    return {
      board,
      turn: 0,
      over: false,
    };
  }

  private countSideStones(board: number[], player: Player): number {
    const pits = player === 0 ? OWARE_P0_PITS : OWARE_P1_PITS;
    return pits.reduce((sum, p) => sum + board[p], 0);
  }

  legalMoves(s: GameState): number[] {
    if (s.over) return [];
    const playerPits = s.turn === 0 ? OWARE_P0_PITS : OWARE_P1_PITS;
    const opponent = s.turn === 0 ? 1 : 0;
    const opponentStones = this.countSideStones(s.board, opponent);

    const candidates = playerPits.filter(p => s.board[p] > 0);
    if (candidates.length === 0) return [];

    // Feeding rule: if opponent has 0 stones, player MUST feed if possible
    if (opponentStones === 0) {
      const feedingMoves = candidates.filter(p => {
        // Test if sowing from pit p reaches opponent's side
        let stones = s.board[p];
        let curr = p;
        while (stones > 0) {
          curr = getNextPit(curr);
          if (curr !== p) {
            if (this.layout.pitOwner(curr) === opponent) {
              return true;
            }
            stones--;
          }
        }
        return false;
      });

      if (feedingMoves.length > 0) {
        return feedingMoves;
      }
    }

    return candidates;
  }

  apply(s: GameState, move: number): MoveResult {
    const board = [...s.board];
    const path: number[] = [];
    let stones = board[move];
    board[move] = 0;

    let curr = move;
    while (stones > 0) {
      curr = getNextPit(curr);
      // Skip origin pit on 12+ stone laps
      if (curr === move) continue;

      board[curr]++;
      path.push(curr);
      stones--;
    }

    const lastLanding = curr;
    const opponent: Player = s.turn === 0 ? 1 : 0;
    let captured = 0;

    // Check potential capture backwards chain
    if (this.layout.pitOwner(lastLanding) === opponent && (board[lastLanding] === 2 || board[lastLanding] === 3)) {
      const capturedPits: number[] = [];
      let checkPit = lastLanding;

      while (
        this.layout.pitOwner(checkPit) === opponent &&
        (board[checkPit] === 2 || board[checkPit] === 3)
      ) {
        capturedPits.push(checkPit);
        checkPit = getPrevPit(checkPit);
      }

      // Grand slam protection: cannot capture all stones if it starves opponent
      const opponentRemainingPits = (opponent === 0 ? OWARE_P0_PITS : OWARE_P1_PITS)
        .filter(p => !capturedPits.includes(p));
      const opponentRemainingStones = opponentRemainingPits.reduce((sum, p) => sum + board[p], 0);

      if (opponentRemainingStones > 0 || opponentRemainingPits.length === 0) {
        // Valid capture: award stones
        const store = s.turn === 0 ? 6 : 13;
        for (const p of capturedPits) {
          captured += board[p];
          board[store] += board[p];
          board[p] = 0;
        }
      }
      // If grand slam would leave opponent with 0 stones, capture is forfeited (stones remain)
    }

    // Determine terminal state
    const nextTurn: Player = s.turn === 0 ? 1 : 0;
    const nextSideStones = this.countSideStones(board, nextTurn);
    let over = false;

    // Immediate win if a player has > 24 stones
    if (board[6] > 24 || board[13] > 24) {
      over = true;
    } else if (board[6] === 24 && board[13] === 24) {
      over = true;
    } else if (nextSideStones === 0) {
      // Opponent has no stones and cannot be fed
      over = true;
      // Remaining stones collected
      const playerPits = s.turn === 0 ? OWARE_P0_PITS : OWARE_P1_PITS;
      for (const p of playerPits) {
        board[s.turn === 0 ? 6 : 13] += board[p];
        board[p] = 0;
      }
    }

    return {
      state: {
        board,
        turn: nextTurn,
        over,
      },
      captured,
      extraTurn: false, // Oware has no free turns
      path,
      lastLanding,
    };
  }

  isTerminal(s: GameState): boolean {
    return s.over || s.board[6] > 24 || s.board[13] > 24 || this.legalMoves(s).length === 0;
  }

  score(s: GameState): [number, number] {
    return [s.board[6], s.board[13]];
  }

  key(s: GameState): string {
    return `oware:${s.turn}:${s.board.join(',')}`;
  }
}

export const owareRuleSet = new OwareRuleSet();
