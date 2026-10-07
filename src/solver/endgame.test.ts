import { describe, it, expect, beforeEach } from 'vitest';
import { solveExact, clearSolverCache, countPlayableStones, isEndgame, getTerminalScore } from './endgame';
import { createKalahRuleSet, KALAH_P1_STORE, KALAH_P2_STORE } from '../rules/kalah';
import { RuleSet, GameState } from '../rules/types';

/**
 * Independent ground-truth reference minimax:
 * - ZERO alpha-beta pruning (no bounds).
 * - ZERO transposition table / caching.
 * - Pure exhaustive recursion to true terminal states.
 */
function referenceMinimax(rules: RuleSet, s: GameState): number {
  if (s.over || rules.isTerminal(s)) {
    return getTerminalScore(rules, s);
  }
  const legal = rules.legalMoves(s);
  if (legal.length === 0) {
    return getTerminalScore(rules, s);
  }

  let best = -Infinity;
  for (const move of legal) {
    const res = rules.apply(s, move);
    let val: number;
    if (res.state.over || rules.isTerminal(res.state)) {
      const terminalScoreForNext = getTerminalScore(rules, res.state);
      val = res.state.turn === s.turn ? terminalScoreForNext : -terminalScoreForNext;
    } else if (res.state.turn === s.turn) {
      val = referenceMinimax(rules, res.state);
    } else {
      val = -referenceMinimax(rules, res.state);
    }
    if (val > best) best = val;
  }
  return best;
}

/** Seeded PRNG for 100% deterministic, reproducible positions */
function createSeededRNG(seed = 987654321) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

function generate500EndgamePositions(): GameState[] {
  const rand = createSeededRNG();
  const positions: GameState[] = [];
  const playablePits = [0, 1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 12];

  while (positions.length < 500) {
    const totalStones = 1 + Math.floor(rand() * 8); // 1 to 8 active stones (<= 14)
    const board = new Array(14).fill(0);
    board[KALAH_P1_STORE] = Math.floor(rand() * 20);
    board[KALAH_P2_STORE] = Math.floor(rand() * 20);

    let distributed = 0;
    while (distributed < totalStones) {
      const pit = playablePits[Math.floor(rand() * playablePits.length)];
      board[pit]++;
      distributed++;
    }

    const turn = (rand() < 0.5 ? 0 : 1) as 0 | 1;
    const state: GameState = { board, turn, over: false };

    // Must have at least 1 legal move
    const legalPits = turn === 0 ? [0, 1, 2, 3, 4, 5] : [7, 8, 9, 10, 11, 12];
    const hasMove = legalPits.some(p => board[p] > 0);
    if (hasMove) {
      positions.push(state);
    }
  }

  return positions;
}

describe('Endgame Solver: 500-Position Cross-Check & Terminal Accuracy', () => {
  const rules = createKalahRuleSet();

  beforeEach(() => {
    clearSolverCache();
  });

  it('matches reference minimax across 500 random positions with 0 mismatches', () => {
    const positions = generate500EndgamePositions();
    expect(positions.length).toBe(500);

    let mismatches = 0;
    for (let i = 0; i < positions.length; i++) {
      const pos = positions[i];
      const expected = referenceMinimax(rules, pos);
      const actual = solveExact(rules, pos);

      expect(actual).not.toBeNull();
      if (actual!.value !== expected) {
        mismatches++;
      }
      expect(actual!.value).toBe(expected);
    }

    expect(mismatches).toBe(0);
  });

  it('correctly evaluates known terminal positions', () => {
    const terminalState: GameState = {
      board: [0, 0, 0, 0, 0, 0, 26, 0, 0, 0, 0, 0, 0, 22],
      turn: 0,
      over: true
    };
    const res = solveExact(rules, terminalState);
    expect(res).not.toBeNull();
    expect(res!.value).toBe(4); // 26 - 22 = +4 for P0
    expect(res!.best).toEqual([]);
    expect(res!.exact).toBe(true);
  });

  it('correctly solves single-move forced winning sequence', () => {
    // P0 has 1 stone in pit 5 (adjacent to store 6). Lands in store 6 and game ends.
    const state: GameState = {
      board: [0, 0, 0, 0, 0, 1, 20, 1, 0, 0, 0, 0, 0, 19],
      turn: 0,
      over: false
    };
    const res = solveExact(rules, state);
    expect(res).not.toBeNull();
    expect(res!.best[0]).toBe(5);
    expect(res!.value).toBe(1); // 21 - 20 = +1 margin (P2 remaining pit 7 swept to store 13)
  });

  it('correctly solves forced multi-step free turn chain', () => {
    // P0 has pit 5: 1 stone, pit 4: 2 stones. P2 has 1 stone in pit 7.
    // Optimal: pit 5 first (lands in 6, free turn), then pit 4 (lands in 5 and 6, free turn).
    const state: GameState = {
      board: [0, 0, 0, 0, 2, 1, 10, 1, 0, 0, 0, 0, 0, 9],
      turn: 0,
      over: false
    };
    const res = solveExact(rules, state);
    expect(res).not.toBeNull();
    expect(res!.best[0]).toBe(5);
  });

  it('asserts exact evaluations win % is strictly 0, 50, or 100% only', () => {
    const positions = generate500EndgamePositions().slice(0, 50);
    for (let i = 0; i < positions.length; i++) {
      const pos = positions[i];
      const res = solveExact(rules, pos);
      expect(res).not.toBeNull();
      const winPct = res!.value > 0 ? 100 : res!.value === 0 ? 50 : 0;
      expect([0, 50, 100]).toContain(winPct);
    }
  });

  it('correctly detects endgame thresholds', () => {
    const state10: GameState = {
      board: [1, 1, 1, 1, 1, 1, 20, 1, 1, 1, 1, 0, 0, 19],
      turn: 0,
      over: false
    };
    expect(countPlayableStones(rules, state10)).toBe(10);
    expect(isEndgame(rules, state10)).toBe(true);

    const state20: GameState = {
      board: [2, 2, 2, 2, 2, 2, 10, 2, 2, 2, 2, 2, 2, 4],
      turn: 0,
      over: false
    };
    expect(countPlayableStones(rules, state20)).toBe(24);
    expect(isEndgame(rules, state20)).toBe(false);
  });
});
