import { describe, it, expect } from 'vitest';
import puzzlesData from './data.json';
import { Puzzle } from './types';
import { kalahRuleSet } from '../rules/kalah';
import { evaluateMovesWithExactSolver } from './generate';
import { puzzleFor, getUtcDayIndex, getTotalPuzzleCount } from './daily';

describe('Daily Puzzle Bank & Exact Solver Verification', () => {
  const puzzles = puzzlesData as Puzzle[];

  it('contains at least 365 offline bundled puzzles', () => {
    expect(puzzles.length).toBeGreaterThanOrEqual(365);
    expect(getTotalPuzzleCount()).toBeGreaterThanOrEqual(365);
  });

  it('ensures every puzzle has valid metadata and legal layout', () => {
    for (const p of puzzles) {
      expect(p.id).toBeDefined();
      expect(p.rulesId).toBe('kalah');
      expect(p.board).toHaveLength(14);
      expect(p.turn).toBe(0);
      expect(p.solution.length).toBeGreaterThan(0);
      expect(['capture', 'go-again chain', 'starve']).toContain(p.theme);
      expect(['easy', 'medium', 'hard']).toContain(p.difficulty);
      expect(p.hint).toBeDefined();
      expect(p.hint.pit).toBe(p.solution[0]);
    }
  });

  it('re-verifies a representative sample of 30 bundled puzzles with exact solver in CI', () => {
    // Verifying 30 evenly-spaced puzzles to keep CI fast while guaranteeing solver correctness
    const step = Math.floor(puzzles.length / 30);
    const sample = puzzles.filter((_, i) => i % step === 0).slice(0, 30);

    for (const p of sample) {
      const state = { board: [...p.board], turn: p.turn, over: false };
      const evaluated = evaluateMovesWithExactSolver(kalahRuleSet, state);

      expect(evaluated.length).toBeGreaterThanOrEqual(2);
      const best = evaluated[0];
      const secondBest = evaluated[1];

      // Solution move must be the unique best move
      expect(best.move).toBe(p.solution[0]);
      // Advantage must be >= 2 stones
      expect(best.score - secondBest.score).toBeGreaterThanOrEqual(2);
    }
  });

  it('selects puzzles deterministically by UTC day index without throwing', () => {
    const today = getUtcDayIndex();
    const pToday = puzzleFor(today);
    expect(pToday).toBeDefined();
    expect(pToday.solution.length).toBeGreaterThan(0);

    // Same day index produces exact same puzzle
    const pTodayRepeat = puzzleFor(today);
    expect(pTodayRepeat.id).toBe(pToday.id);

    // Verify 365 consecutive days return valid puzzles
    for (let day = 0; day < 365; day++) {
      const p = puzzleFor(day);
      expect(p).toBeDefined();
      expect(p.id).toBeDefined();
    }
  });
});
