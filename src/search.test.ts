import { describe, it, expect, beforeEach } from 'vitest';
import {
  createInitialBoard,
  getLegalMoves,
  simulateMove,
  evaluatePosition,
  minimax,
  transpositionTable,
  P1_STORE,
  P2_STORE,
  RulesConfig
} from './engine';

const RULES: RulesConfig = { freeTurn: true, captureOpposite: true };

/** Plain minimax: no pruning, no cache. Same depth/terminal semantics as the engine. */
function referenceMinimax(board: number[], player: number, depth: number, rules: RulesConfig): number {
  const legal = getLegalMoves(board, player);
  if (depth === 0 || legal.length === 0) return evaluatePosition(board);
  let best = player === 0 ? -Infinity : Infinity;
  for (const move of legal) {
    const res = simulateMove(board, player, move, rules);
    const value = res.isGameOver
      ? (res.newBoard[P1_STORE] - res.newBoard[P2_STORE]) * 100
      : referenceMinimax(res.newBoard, res.nextPlayer, res.nextPlayer === player ? depth : depth - 1, rules);
    best = player === 0 ? Math.max(best, value) : Math.min(best, value);
  }
  return best;
}

/** Deterministic pseudo-random playout to reach varied positions. */
function randomPositions(count: number): Array<{ board: number[]; player: number }> {
  let seed = 12345;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
  const out: Array<{ board: number[]; player: number }> = [];
  while (out.length < count) {
    let board = createInitialBoard(4);
    let player = 0;
    const plies = Math.floor(rand() * 18);
    for (let i = 0; i < plies; i++) {
      const legal = getLegalMoves(board, player);
      if (legal.length === 0) break;
      const res = simulateMove(board, player, legal[Math.floor(rand() * legal.length)], RULES);
      if (res.isGameOver) break;
      board = res.newBoard;
      player = res.nextPlayer;
    }
    if (getLegalMoves(board, player).length > 0) out.push({ board, player });
  }
  return out;
}

describe('Search correctness vs reference minimax', () => {
  beforeEach(() => transpositionTable.clear());

  it('matches the reference at depths 1-4 on varied positions, sharing one cache', () => {
    for (const { board, player } of randomPositions(25)) {
      for (const depth of [1, 2, 3, 4]) {
        const expected = referenceMinimax(board, player, depth, RULES);
        const actual = minimax(board, player, depth, -Infinity, Infinity, RULES, depth).score;
        expect(actual).toBe(expected);
      }
    }
  });

  it('does not reuse cached values across different rule sets', () => {
    const noCapture: RulesConfig = { freeTurn: true, captureOpposite: false };
    for (const { board, player } of randomPositions(15)) {
      minimax(board, player, 3, -Infinity, Infinity, RULES, 3);
      const expected = referenceMinimax(board, player, 3, noCapture);
      const actual = minimax(board, player, 3, -Infinity, Infinity, noCapture, 3).score;
      expect(actual).toBe(expected);
    }
  });

  it('keeps the cache bounded', () => {
    for (const { board, player } of randomPositions(40)) {
      minimax(board, player, 5, -Infinity, Infinity, RULES, 5);
    }
    expect(transpositionTable.size).toBeLessThanOrEqual(300_000);
  });
});
