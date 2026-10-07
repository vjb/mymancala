import { describe, it, expect } from 'vitest';
import { sowAndScoreRuleSet, SOW_SCORE_P0_PITS, SOW_SCORE_P1_PITS } from './sow-and-score';

describe('Sow & Score RuleSet Suite', () => {
  it('initializes 36 total stones (3 per pit)', () => {
    const s = sowAndScoreRuleSet.initial();
    expect(s.board).toHaveLength(14);
    for (const p of SOW_SCORE_P0_PITS) expect(s.board[p]).toBe(3);
    for (const p of SOW_SCORE_P1_PITS) expect(s.board[p]).toBe(3);
    expect(s.board[6]).toBe(0);
    expect(s.board[13]).toBe(0);

    const sum = s.board.reduce((a, b) => a + b, 0);
    expect(sum).toBe(36);
  });

  it('earns free turn when last stone lands in own store', () => {
    const s = sowAndScoreRuleSet.initial();
    // Pit 3 has 3 stones -> sows to 4, 5, 6 (Store 1)
    const res = sowAndScoreRuleSet.apply(s, 3);
    expect(res.extraTurn).toBe(true);
    expect(res.state.turn).toBe(0); // Same player plays again
    expect(res.state.board[6]).toBe(1); // 1 banked stone
    expect(res.captured).toBe(0);
  });

  it('passes turn when last stone lands in regular pit', () => {
    const s = sowAndScoreRuleSet.initial();
    // Pit 2 has 3 stones -> sows to 3, 4, 5
    const res = sowAndScoreRuleSet.apply(s, 2);
    expect(res.extraTurn).toBe(false);
    expect(res.state.turn).toBe(1);
  });

  it('conserves stone count invariant across random playthroughs', () => {
    let s = sowAndScoreRuleSet.initial();
    for (let i = 0; i < 80; i++) {
      if (sowAndScoreRuleSet.isTerminal(s)) break;
      const legal = sowAndScoreRuleSet.legalMoves(s);
      if (legal.length === 0) break;
      const move = legal[i % legal.length];
      const res = sowAndScoreRuleSet.apply(s, move);
      s = res.state;

      const sum = s.board.reduce((a, b) => a + b, 0);
      expect(sum).toBe(36);
    }
  });
});
