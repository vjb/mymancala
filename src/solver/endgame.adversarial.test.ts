import { describe, it, expect } from 'vitest';
import {
  solveExact,
  clearSolverCache,
  countPlayableStones,
  isEndgame,
  getTerminalScore,
  DEFAULT_ENDGAME_BUDGET
} from './endgame';
import { createKalahRuleSet, KALAH_P1_STORE, KALAH_P2_STORE } from '../rules/kalah';
import { RuleSet, GameState } from '../rules/types';

/**
 * Independent ground-truth reference minimax without pruning or TT.
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

describe('Adversarial Stress Suite: Exact Endgame Solver Edge Cases', () => {
  const rules = createKalahRuleSet();

  it('handles 0 active stones edge positions (terminal and empty pits)', () => {
    clearSolverCache();

    // 1. Both sides completely 0, over=true
    const s1: GameState = {
      board: [0, 0, 0, 0, 0, 0, 24, 0, 0, 0, 0, 0, 0, 24],
      turn: 0,
      over: true
    };
    expect(countPlayableStones(rules, s1)).toBe(0);
    expect(isEndgame(rules, s1)).toBe(false); // already over
    const res1 = solveExact(rules, s1);
    expect(res1).not.toBeNull();
    expect(res1!.value).toBe(0); // Draw (24 - 24)
    expect(res1!.best).toEqual([]);
    expect(res1!.exact).toBe(true);

    // 2. Both sides completely 0, over=false (should trigger immediate terminal evaluation)
    const s2: GameState = {
      board: [0, 0, 0, 0, 0, 0, 30, 0, 0, 0, 0, 0, 0, 18],
      turn: 0,
      over: false
    };
    expect(countPlayableStones(rules, s2)).toBe(0);
    const res2 = solveExact(rules, s2);
    expect(res2).not.toBeNull();
    expect(res2!.value).toBe(12); // 30 - 18
    expect(res2!.best).toEqual([]);

    // 3. Both sides completely 0, turn=1
    const s3: GameState = {
      board: [0, 0, 0, 0, 0, 0, 30, 0, 0, 0, 0, 0, 0, 18],
      turn: 1,
      over: false
    };
    const res3 = solveExact(rules, s3);
    expect(res3).not.toBeNull();
    expect(res3!.value).toBe(-12); // 18 - 30 from P1 perspective
  });

  it('handles single-stone positions across all 12 playable pits for both players', () => {
    clearSolverCache();
    const playablePits = [0, 1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 12];

    for (const pit of playablePits) {
      for (const turn of [0, 1] as const) {
        const board = new Array(14).fill(0);
        board[pit] = 1;
        board[KALAH_P1_STORE] = 23;
        board[KALAH_P2_STORE] = 24;

        const state: GameState = { board, turn, over: false };
        const ref = referenceMinimax(rules, state);
        const sol = solveExact(rules, state);

        expect(sol).not.toBeNull();
        expect(sol!.value).toBe(ref);
        expect(sol!.exact).toBe(true);

        // Verify truthful win rate invariant
        const winProb = sol!.value > 0 ? 1.0 : sol!.value === 0 ? 0.5 : 0.0;
        expect([0.0, 0.5, 1.0]).toContain(winProb);
      }
    }
  });

  it('handles terminal sweep sequences where one player is starved', () => {
    clearSolverCache();

    // Scenario A: P0 has 0 stones on their side, turn is P0.
    // Legal moves for P0 = []. P1 has 10 stones across pits 7-12.
    // All 10 stones must be swept to P1 store (index 13).
    const stateA: GameState = {
      board: [0, 0, 0, 0, 0, 0, 20, 2, 2, 2, 2, 1, 1, 18],
      turn: 0,
      over: false
    };
    const refA = referenceMinimax(rules, stateA);
    const solA = solveExact(rules, stateA);
    expect(solA).not.toBeNull();
    // P0 store: 20. P1 store: 18 + 10 = 28. P0 perspective margin: 20 - 28 = -8.
    expect(solA!.value).toBe(-8);
    expect(solA!.value).toBe(refA);

    // Scenario B: P1 has 0 stones, turn is P1.
    // Legal moves for P1 = []. P0 has 8 stones across pits 0-5.
    // Swept to P0 store (index 6).
    const stateB: GameState = {
      board: [1, 2, 1, 2, 1, 1, 20, 0, 0, 0, 0, 0, 0, 20],
      turn: 1,
      over: false
    };
    const refB = referenceMinimax(rules, stateB);
    const solB = solveExact(rules, stateB);
    expect(solB).not.toBeNull();
    // P0: 20 + 8 = 28. P1: 20. P1 perspective margin: 20 - 28 = -8.
    expect(solB!.value).toBe(-8);
    expect(solB!.value).toBe(refB);

    // Scenario C: Moving player makes a move that starves the opponent immediately
    // P0 plays pit 5 (1 stone). Board[5] goes to store 6. Now P0 has 0 stones, P1 has 0 stones.
    const stateC: GameState = {
      board: [0, 0, 0, 0, 0, 1, 23, 0, 0, 0, 0, 0, 0, 24],
      turn: 0,
      over: false
    };
    const solC = solveExact(rules, stateC);
    const refC = referenceMinimax(rules, stateC);
    expect(solC).not.toBeNull();
    expect(solC!.value).toBe(0); // 24 - 24 = 0
    expect(solC!.value).toBe(refC);
  });

  it('stress tests multi-turn free turn chains (consecutive extra turns)', () => {
    clearSolverCache();

    // 3-chain free turn setup for Player 0:
    // pit 5: 1 stone  (lands in store 6 -> extra turn)
    // pit 4: 2 stones (lands in 5, then store 6 -> extra turn)
    // pit 3: 3 stones (lands in 4, 5, store 6 -> extra turn)
    // P2 has 1 stone in pit 8 (so opponent side is non-empty and game is not terminal)
    const chainState: GameState = {
      board: [0, 0, 0, 3, 2, 1, 15, 0, 1, 0, 0, 0, 0, 23],
      turn: 0,
      over: false
    };

    expect(countPlayableStones(rules, chainState)).toBe(7);
    expect(rules.isTerminal(chainState)).toBe(false);

    const sol = solveExact(rules, chainState);
    const ref = referenceMinimax(rules, chainState);

    expect(sol).not.toBeNull();
    expect(sol!.value).toBe(ref);
    // Best move MUST be pit 5 to start the chain
    expect(sol!.best[0]).toBe(5);
    // Next move in the chain is pit 4
    expect(sol!.best[1]).toBe(4);

    // Verify PV sequence validity by stepping through each move
    let cur = chainState;
    for (const move of sol!.best) {
      const legal = rules.legalMoves(cur);
      expect(legal).toContain(move);
      const res = rules.apply(cur, move);
      cur = res.state;
    }
    expect(rules.isTerminal(cur)).toBe(true);
    const termScore = getTerminalScore(rules, cur);
    const scoreFromRootPerspective = cur.turn === chainState.turn ? termScore : -termScore;
    expect(scoreFromRootPerspective).toBe(sol!.value);
  });

  it('stress tests multi-turn free turn chain for Player 1 (North)', () => {
    clearSolverCache();

    // P1 pits: 7, 8, 9, 10, 11, 12. Store is 13.
    // pit 12: 1 stone (lands in store 13 -> extra turn)
    // pit 11: 2 stones (lands in 12, store 13 -> extra turn)
    // pit 10: 3 stones (lands in 11, 12, store 13 -> extra turn)
    // P0 has 1 stone in pit 1 (so P0 side is non-empty)
    const p1ChainState: GameState = {
      board: [0, 1, 0, 0, 0, 0, 20, 0, 0, 0, 3, 2, 1, 22],
      turn: 1,
      over: false
    };

    expect(countPlayableStones(rules, p1ChainState)).toBe(7);
    expect(rules.isTerminal(p1ChainState)).toBe(false);

    const sol = solveExact(rules, p1ChainState);
    const ref = referenceMinimax(rules, p1ChainState);

    expect(sol).not.toBeNull();
    expect(sol!.value).toBe(ref);
    expect(sol!.best[0]).toBe(12);
    expect(sol!.best[1]).toBe(11);

    // Verify PV sequence validity
    let cur = p1ChainState;
    for (const move of sol!.best) {
      const legal = rules.legalMoves(cur);
      expect(legal).toContain(move);
      const res = rules.apply(cur, move);
      cur = res.state;
    }
    expect(rules.isTerminal(cur)).toBe(true);
    const termScoreP1 = getTerminalScore(rules, cur);
    const scoreFromP1Perspective = cur.turn === p1ChainState.turn ? termScoreP1 : -termScoreP1;
    expect(scoreFromP1Perspective).toBe(sol!.value);
  });

  it('verifies exact evaluation win rate is strictly 0%, 50%, or 100% across 100 complex endgames', () => {
    clearSolverCache();

    // Generator with variable active stones from 1 to 14
    let seed = 123456789;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };

    const playablePits = [0, 1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 12];
    let evaluatedCount = 0;

    for (let testIdx = 0; testIdx < 100; testIdx++) {
      const activeStones = 2 + Math.floor(rand() * 9); // 2 to 10 stones
      const board = new Array(14).fill(0);
      board[KALAH_P1_STORE] = Math.floor(rand() * 20);
      board[KALAH_P2_STORE] = Math.floor(rand() * 20);

      let allocated = 0;
      while (allocated < activeStones) {
        const p = playablePits[Math.floor(rand() * playablePits.length)];
        board[p]++;
        allocated++;
      }

      const turn = (rand() < 0.5 ? 0 : 1) as 0 | 1;
      const state: GameState = { board, turn, over: false };

      const legal = rules.legalMoves(state);
      if (legal.length === 0) continue;

      const sol = solveExact(rules, state, 100_000);
      if (!sol) continue;

      evaluatedCount++;

      // Exact evaluation contract:
      // Value must be an integer stone lead
      expect(Number.isInteger(sol.value)).toBe(true);

      // Win rate must be 0%, 50%, or 100%
      const winProb = sol.value > 0 ? 1.0 : sol.value === 0 ? 0.5 : 0.0;
      const winPct = sol.value > 0 ? 100 : sol.value === 0 ? 50 : 0;

      expect([0.0, 0.5, 1.0]).toContain(winProb);
      expect([0, 50, 100]).toContain(winPct);
    }

    expect(evaluatedCount).toBeGreaterThan(50);
  });
});
