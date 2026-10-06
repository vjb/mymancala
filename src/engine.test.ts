import { describe, it, expect } from 'vitest';
import {
  testStoneConservation,
  testStoreSowingBypass,
  testWrapAroundMultiLap,
  testCaptureMechanics,
  testFreeTurnRules,
  testEndgameSweeping,
  testPerftDeterminism,
  testTranspositionConsistency,
  testEvaluationBounds,
  testBlunderClassificationHierarchy,
  runGNUPreflightSuite
} from './preflight-diagnostics';

describe('GNU Mancala Mathematical & Game Rule Invariants', () => {
  it('Stone Conservation Invariant (Zero-Leak across 1,000 random plies)', () => {
    expect(() => testStoneConservation(1000)).not.toThrow();
  });

  it('Store Sowing Bypass (P0 skips 13, P1 skips 6)', () => {
    expect(() => testStoreSowingBypass()).not.toThrow();
  });

  it('Wrap-Around & Multi-Lap Trajectory (N >= 13 stones)', () => {
    expect(() => testWrapAroundMultiLap()).not.toThrow();
  });

  it('Capture Mechanic & Empty Opposite Symmetry', () => {
    expect(() => testCaptureMechanics()).not.toThrow();
  });

  it('Free Turn Continuity (Own Store Landing Only)', () => {
    expect(() => testFreeTurnRules()).not.toThrow();
  });

  it('Endgame Sweeping & Termination Conservation', () => {
    expect(() => testEndgameSweeping()).not.toThrow();
  });
});

describe('GNU Solver & Analytical Verification', () => {
  it('Perft Determinism & Node Branching', () => {
    expect(() => testPerftDeterminism()).not.toThrow();
  });

  it('Transposition Table & Position Key Integrity', () => {
    expect(() => testTranspositionConsistency()).not.toThrow();
  });

  it('Equity & Win Probability Bounds (0.0% to 100.0%)', () => {
    expect(() => testEvaluationBounds()).not.toThrow();
  });

  it('Blunder Classification Hierarchy (Best, Good, Inaccuracy, Mistake, Blunder)', () => {
    expect(() => testBlunderClassificationHierarchy()).not.toThrow();
  });

  it('Complete Pre-Flight Diagnostic Suite Execution', async () => {
    const results = await runGNUPreflightSuite();
    expect(results.length).toBeGreaterThan(5);
    const failures = results.filter(r => r.status === 'FAIL');
    expect(failures).toEqual([]);
  });
});
