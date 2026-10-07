import { describe, it, expect } from 'vitest';
import {
  classify,
  computeLossStones,
  computeErrorRate,
  getGradeBadgeTokens,
  DEFAULT_CLASSIFICATION_THRESHOLDS,
  MoveRecord
} from './classify';

describe('Move Classification & Error Rate Tracking', () => {
  it('correctly classifies moves based on stone equity loss boundaries', () => {
    expect(classify(0.0)).toBe('best');
    expect(classify(-0.5)).toBe('best'); // Negative/zero loss is best
    expect(classify(0.5)).toBe('good');
    expect(classify(1.0)).toBe('good');
    expect(classify(1.01)).toBe('inaccuracy');
    expect(classify(1.5)).toBe('inaccuracy');
    expect(classify(2.0)).toBe('inaccuracy');
    expect(classify(2.01)).toBe('mistake');
    expect(classify(3.0)).toBe('mistake');
    expect(classify(4.0)).toBe('mistake');
    expect(classify(4.01)).toBe('blunder');
    expect(classify(12.0)).toBe('blunder');
  });

  it('computes loss stones correctly when evaluation kinds match', () => {
    const loss = computeLossStones(
      { value: 4.5, kind: 'estimate', depth: 6 },
      { value: 2.0, kind: 'estimate', depth: 6 }
    );
    expect(loss).toBe(2.5);

    const exactLoss = computeLossStones(
      { value: 3, kind: 'exact' },
      { value: -1, kind: 'exact' }
    );
    expect(exactLoss).toBe(4);
  });

  it('uses equalDepthFallback when evaluation kinds differ', () => {
    const loss = computeLossStones(
      { value: 5, kind: 'exact' },
      { value: 1.2, kind: 'estimate', depth: 4 },
      () => ({ bestScore: 4.0, playedScore: 2.5 })
    );
    expect(loss).toBe(1.5);
  });

  it('computes error rate and mistakes per 100 moves accurately', () => {
    const history: MoveRecord[] = [
      { moveNumber: 1, player: 0, playedPit: 0, bestPit: 0, lossStones: 0.0, grade: 'best', evalKind: 'estimate' },
      { moveNumber: 2, player: 0, playedPit: 1, bestPit: 2, lossStones: 0.8, grade: 'good', evalKind: 'estimate' },
      { moveNumber: 3, player: 0, playedPit: 3, bestPit: 4, lossStones: 1.5, grade: 'inaccuracy', evalKind: 'estimate' },
      { moveNumber: 4, player: 0, playedPit: 2, bestPit: 5, lossStones: 3.2, grade: 'mistake', evalKind: 'estimate' },
      { moveNumber: 5, player: 0, playedPit: 0, bestPit: 1, lossStones: 5.0, grade: 'blunder', evalKind: 'estimate' },
    ];

    const summary = computeErrorRate(history);
    expect(summary.totalMoves).toBe(5);
    expect(summary.totalLossStones).toBe(10.5);
    expect(summary.averageLossPerMove).toBe(2.1);
    expect(summary.mistakesPer100Moves).toBe(210);
    expect(summary.counts.best).toBe(1);
    expect(summary.counts.good).toBe(1);
    expect(summary.counts.inaccuracy).toBe(1);
    expect(summary.counts.mistake).toBe(1);
    expect(summary.counts.blunder).toBe(1);
    expect(summary.accuracyScore).toBeGreaterThanOrEqual(10);
    expect(summary.accuracyScore).toBeLessThanOrEqual(100);
  });

  it('returns calm defaults for empty move history', () => {
    const summary = computeErrorRate([]);
    expect(summary.totalMoves).toBe(0);
    expect(summary.totalLossStones).toBe(0);
    expect(summary.averageLossPerMove).toBe(0);
    expect(summary.mistakesPer100Moves).toBe(0);
    expect(summary.accuracyScore).toBe(100);
  });

  it('provides accessible badge styling tokens for all 5 grades', () => {
    for (const grade of ['best', 'good', 'inaccuracy', 'mistake', 'blunder'] as const) {
      const tokens = getGradeBadgeTokens(grade);
      expect(tokens.bg).toBeTruthy();
      expect(tokens.border).toBeTruthy();
      expect(tokens.text).toBeTruthy();
    }
  });
});
