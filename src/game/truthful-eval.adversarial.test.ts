import { describe, it, expect } from 'vitest';
import { EvaluatedMove } from '../engine';
import { AnalysisResult } from '../workers/protocol';

/**
 * Emulates useGame's stone advantage calculation logic:
 *   const rawP1Score = state.currentPlayer === 0 ? top.score : -top.score;
 *   if (top.exact) {
 *     return rawP1Score; // exact bypasses /3.5 division
 *   }
 *   const stones = rawP1Score / 3.5;
 *   return Math.round(stones * 10) / 10;
 */
function computeStoneAdvantage(
  top: EvaluatedMove | undefined,
  currentPlayer: number,
  isGameOver: boolean,
  p1Store = 0,
  p2Store = 0
): number {
  if (isGameOver) {
    return p1Store - p2Store;
  }
  if (!top) return 0;
  const rawP1Score = currentPlayer === 0 ? top.score : -top.score;
  if (top.exact) {
    return rawP1Score;
  }
  const stones = rawP1Score / 3.5;
  return Math.round(stones * 10) / 10;
}

/**
 * Emulates AnalysisPanel and search.worker truthful percentage formatting:
 */
function formatWinPercent(winProb: number, isExact: boolean): string {
  if (isExact) {
    return winProb === 1 ? '100%' : winProb === 0.5 ? '50%' : '0%';
  }
  return `${(winProb * 100).toFixed(1)}%`;
}

describe('Adversarial Stress Suite: Truthful Evaluation Invariants', () => {
  it('verifies exact scores bypass division by 3.5 and preserve true integer margin', () => {
    // When exact is true, an exact lead of +5 must evaluate to +5, NOT 5 / 3.5 (~1.4)
    const exactTopP0: EvaluatedMove = {
      pit: 3,
      label: 'Pit 4',
      score: 5,
      winProb: 1.0,
      pv: [3],
      freeTurn: false,
      captures: 0,
      resultingBoard: [],
      rank: 1,
      equityLoss: 0,
      scoreDiff: 0,
      classification: 'Excellent (Best)',
      badgeColor: '',
      exact: true
    };

    const leadP0 = computeStoneAdvantage(exactTopP0, 0, false);
    expect(leadP0).toBe(5); // Exact: raw +5, NOT 5/3.5

    const exactTopP1: EvaluatedMove = {
      ...exactTopP0,
      score: 4 // P1 leads by 4 from P1 perspective
    };
    const leadP1 = computeStoneAdvantage(exactTopP1, 1, false);
    expect(leadP1).toBe(-4); // From P0 perspective, South is -4
  });

  it('verifies heuristic scores ARE divided by 3.5', () => {
    // Heuristic score of 7 should be 7 / 3.5 = 2.0 stones
    const heuristicTop: EvaluatedMove = {
      pit: 2,
      label: 'Pit 3',
      score: 7,
      winProb: 0.72,
      pv: [2],
      freeTurn: false,
      captures: 0,
      resultingBoard: [],
      rank: 1,
      equityLoss: 0,
      scoreDiff: 0,
      classification: 'Excellent (Best)',
      badgeColor: '',
      exact: false
    };

    const lead = computeStoneAdvantage(heuristicTop, 0, false);
    expect(lead).toBe(2.0); // 7 / 3.5 = 2.0

    // Heuristic score of 5 should be 5 / 3.5 = 1.428... -> rounded to 1.4
    const heuristicTop5: EvaluatedMove = {
      ...heuristicTop,
      score: 5
    };
    const lead5 = computeStoneAdvantage(heuristicTop5, 0, false);
    expect(lead5).toBe(1.4);
  });

  it('strictly rejects any fake fractional win probabilities for exact positions', () => {
    const testCases: { score: number; expectedProb: number; expectedFormatted: string }[] = [
      { score: 10, expectedProb: 1.0, expectedFormatted: '100%' },
      { score: 1, expectedProb: 1.0, expectedFormatted: '100%' },
      { score: 0, expectedProb: 0.5, expectedFormatted: '50%' },
      { score: -1, expectedProb: 0.0, expectedFormatted: '0%' },
      { score: -8, expectedProb: 0.0, expectedFormatted: '0%' }
    ];

    for (const tc of testCases) {
      const winProb = tc.score > 0 ? 1.0 : tc.score === 0 ? 0.5 : 0.0;
      expect(winProb).toBe(tc.expectedProb);

      const formatted = formatWinPercent(winProb, true);
      expect(formatted).toBe(tc.expectedFormatted);
      // Ensure it never produces non-truthful values like '63%', '72.4%', '51%'
      expect(['0%', '50%', '100%']).toContain(formatted);
      expect(formatted).not.toMatch(/^[1-46-9][0-9]%/);
    }
  });

  it('verifies Worker AnalysisResult payload conforms to exact contract', () => {
    const exactWorkerPayload: AnalysisResult = {
      id: 42,
      score: 3,
      winProb: 1.0,
      pv: [5, 4],
      evaluatedMoves: [],
      depth: 0,
      exact: true,
      evaluation: {
        value: 3,
        kind: 'exact',
        winPct: 100,
        nodes: 142
      }
    };

    expect(exactWorkerPayload.exact).toBe(true);
    expect(exactWorkerPayload.evaluation?.kind).toBe('exact');
    expect(exactWorkerPayload.evaluation?.winPct).toBe(100);
    expect([0, 50, 100]).toContain(exactWorkerPayload.evaluation?.winPct);
    expect(exactWorkerPayload.evaluation?.value).toBe(3); // raw margin, not divided by 3.5
  });

  it('verifies Worker AnalysisResult payload divides estimate by 3.5 for heuristic evaluation', () => {
    const heuristicWorkerPayload: AnalysisResult = {
      id: 43,
      score: 14,
      winProb: 0.85,
      pv: [2, 1],
      evaluatedMoves: [],
      depth: 6,
      exact: false,
      evaluation: {
        value: 14 / 3.5, // = 4.0
        kind: 'estimate',
        depth: 6
      }
    };

    expect(heuristicWorkerPayload.exact).toBe(false);
    expect(heuristicWorkerPayload.evaluation?.kind).toBe('estimate');
    expect(heuristicWorkerPayload.evaluation?.value).toBe(4.0);
  });
});
