import { RuleSet, GameState, MoveResult, Player, BoardLayout } from './types';

// Board geometry literals isolated strictly in this file
export const KALAH_TOTAL_PITS = 14;
export const KALAH_P1_STORE = 6;
export const KALAH_P2_STORE = 13;
export const KALAH_P1_PITS = [0, 1, 2, 3, 4, 5] as const;
export const KALAH_P2_PITS = [7, 8, 9, 10, 11, 12] as const;

export interface KalahOptions {
  freeTurn?: boolean;
  captureOpposite?: boolean;
  stonesPerPit?: number;
}

export function oppositePit(pit: number): number {
  return 12 - pit;
}

export function storeForPlayer(player: Player): number {
  return player === 0 ? KALAH_P1_STORE : KALAH_P2_STORE;
}

export function opponentStoreForPlayer(player: Player): number {
  return player === 0 ? KALAH_P2_STORE : KALAH_P1_STORE;
}

export function pitsForPlayer(player: Player): readonly number[] {
  return player === 0 ? KALAH_P1_PITS : KALAH_P2_PITS;
}

export function isStore(pit: number): boolean {
  return pit === KALAH_P1_STORE || pit === KALAH_P2_STORE;
}

export function pitOwner(pit: number): Player {
  return (pit >= 0 && pit <= KALAH_P1_STORE) ? 0 : 1;
}

export function formatPitLabel(pit: number): string {
  if (pit === KALAH_P1_STORE) return 'South Store (P1)';
  if (pit === KALAH_P2_STORE) return 'North Store (P2)';
  if (pit >= 0 && pit <= 5) return `Pit ${pit + 1}`;
  if (pit >= 7 && pit <= 12) return `Pit ${KALAH_P2_STORE - pit}`;
  return `Pit ${pit}`;
}

export function formatDescriptiveLabel(pit: number): string {
  if (pit === KALAH_P1_STORE) return 'South Store (P1)';
  if (pit === KALAH_P2_STORE) return 'North Store (P2)';
  if (pit >= 0 && pit <= 5) return `South Pit ${pit + 1}`;
  if (pit >= 7 && pit <= 12) return `North Pit ${KALAH_P2_STORE - pit}`;
  return `Pit ${pit}`;
}

export function createKalahRuleSet(options: KalahOptions = {}): RuleSet {
  const freeTurn = options.freeTurn !== false;
  const captureOpposite = options.captureOpposite !== false;
  const stonesPerPit = options.stonesPerPit ?? 4;

  const layout: BoardLayout = {
    rows: 2,
    cols: 6,
    stores: [KALAH_P1_STORE, KALAH_P2_STORE],
    pitOwner,
    label: formatPitLabel
  };

  return {
    id: 'kalah',
    name: 'Kalah',
    layout,

    initial(): GameState {
      const board = new Array(KALAH_TOTAL_PITS).fill(stonesPerPit);
      board[KALAH_P1_STORE] = 0;
      board[KALAH_P2_STORE] = 0;
      return {
        board,
        turn: 0,
        over: false
      };
    },

    legalMoves(s: GameState): number[] {
      if (s.over) return [];
      const pits = s.turn === 0 ? KALAH_P1_PITS : KALAH_P2_PITS;
      const legal: number[] = [];
      for (let i = 0; i < pits.length; i++) {
        const pit = pits[i];
        if (s.board[pit] > 0) legal.push(pit);
      }
      return legal;
    },

    apply(s: GameState, move: number): MoveResult {
      const initialSum = s.board.reduce((a, b) => a + b, 0);
      const newBoard = [...s.board];
      let stones = newBoard[move];
      newBoard[move] = 0;

      const player = s.turn;
      const playerStore = storeForPlayer(player);
      const opponentStore = opponentStoreForPlayer(player);
      const playerPits = pitsForPlayer(player);

      let current = move;
      const path: number[] = [];

      while (stones > 0) {
        current = (current + 1) % KALAH_TOTAL_PITS;
        if (current === opponentStore) continue;

        newBoard[current]++;
        path.push(current);
        stones--;
      }

      const lastLanding = current;
      let earnedFreeTurn = false;
      let capturedStones = 0;
      let capturedFromPit: number | null = null;

      // Free Turn rule: lands in own store
      if (freeTurn && lastLanding === playerStore) {
        earnedFreeTurn = true;
      }
      // Capture Opposite rule: lands in own empty pit with opposite having stones
      else if (
        captureOpposite &&
        (playerPits as readonly number[]).includes(lastLanding) &&
        newBoard[lastLanding] === 1
      ) {
        const oppPit = oppositePit(lastLanding);
        if (newBoard[oppPit] > 0) {
          capturedStones = newBoard[oppPit] + 1;
          capturedFromPit = oppPit;
          newBoard[oppPit] = 0;
          newBoard[lastLanding] = 0;
          newBoard[playerStore] += capturedStones;
        }
      }

      // Check Game Termination
      const p1Empty = KALAH_P1_PITS.every(p => newBoard[p] === 0);
      const p2Empty = KALAH_P2_PITS.every(p => newBoard[p] === 0);

      let isGameOver = false;

      if (p1Empty || p2Empty) {
        isGameOver = true;
        for (const p of KALAH_P1_PITS) {
          newBoard[KALAH_P1_STORE] += newBoard[p];
          newBoard[p] = 0;
        }
        for (const p of KALAH_P2_PITS) {
          newBoard[KALAH_P2_STORE] += newBoard[p];
          newBoard[p] = 0;
        }
      }

      // Stone conservation invariant
      const finalSum = newBoard.reduce((a, b) => a + b, 0);
      if (finalSum !== initialSum) {
        throw new Error(`Stone conservation violated: started with ${initialSum}, ended with ${finalSum}`);
      }

      const nextPlayer: Player = earnedFreeTurn && !isGameOver ? player : ((1 - player) as Player);

      return {
        state: {
          board: newBoard,
          turn: nextPlayer,
          over: isGameOver
        },
        captured: capturedStones,
        extraTurn: earnedFreeTurn,
        path,
        capturedFrom: capturedFromPit,
        lastLanding
      };
    },

    isTerminal(s: GameState): boolean {
      return (
        s.over ||
        KALAH_P1_PITS.every(p => s.board[p] === 0) ||
        KALAH_P2_PITS.every(p => s.board[p] === 0)
      );
    },

    score(s: GameState): [number, number] {
      return [s.board[KALAH_P1_STORE], s.board[KALAH_P2_STORE]];
    },

    key(s: GameState): string {
      return `${s.board.join(',')}_p${s.turn}_r${freeTurn ? 1 : 0}${captureOpposite ? 1 : 0}`;
    }
  };
}

export const kalahRules = createKalahRuleSet;
export const kalahRuleSet = createKalahRuleSet();
