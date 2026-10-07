import { describe, it, expect } from 'vitest';
import { explain } from './explain';
import { createKalahRuleSet } from '../rules/kalah';
import { GameState } from '../rules/types';

describe('Deterministic Tactical Explanations Engine', () => {
  const rules = createKalahRuleSet();

  it('triggers EARNS_EXTRA_TURN when move lands in store', () => {
    // Pit 5 has 1 stone, lands in store 6
    const state: GameState = {
      board: [4, 4, 4, 4, 4, 1, 0, 4, 4, 4, 4, 4, 4, 0],
      turn: 0,
      over: false,
    };
    const items = explain(rules, state, 5);
    const codes = items.map(i => i.code);
    expect(codes).toContain('EARNS_EXTRA_TURN');
  });

  it('triggers EXTRA_TURN_MISSED when an extra turn was available on another pit', () => {
    // Pit 2 has 4 stones (lands in store 6), but player plays pit 0
    const state: GameState = {
      board: [2, 0, 4, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 0],
      turn: 0,
      over: false,
    };
    const items = explain(rules, state, 0);
    const codes = items.map(i => i.code);
    expect(codes).toContain('EXTRA_TURN_MISSED');
  });

  it('triggers EXECUTES_CAPTURE when move captures stones', () => {
    // Pit 0 has 1 stone. Pit 1 is empty. Opposite pit 11 has 5 stones.
    // Playing 0 lands in pit 1, triggering capture of pit 11.
    const state: GameState = {
      board: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 0, 0],
      turn: 0,
      over: false,
    };
    const items = explain(rules, state, 0);
    const codes = items.map(i => i.code);
    expect(codes).toContain('EXECUTES_CAPTURE');
  });

  it('triggers CAPTURE_AVAILABLE when player missed a capture', () => {
    // Pit 0 can capture pit 11 (5 stones). Player plays pit 2 instead.
    const state: GameState = {
      board: [1, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 5, 0, 0],
      turn: 0,
      over: false,
    };
    const items = explain(rules, state, 2);
    const codes = items.map(i => i.code);
    expect(codes).toContain('CAPTURE_AVAILABLE');
  });

  it('triggers LEAVES_OPEN_CAPTURE when move leaves a pit vulnerable to opponent capture', () => {
    // South pit 1 has 1 stone, lands in empty pit 2 opposite North pit 10 (4 stones).
    // In before: North cannot capture pit 2 because pit 2 is empty and North pit 10 wouldn't capture anything.
    // After South plays 1: pit 2 now has 1 stone. North has a move that lands in empty pit 10 and captures pit 2!
    // North pit 9 has 1 stone. North lands in empty pit 10 opposite South pit 2.
    const state: GameState = {
      board: [0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0],
      turn: 0,
      over: false,
    };
    const items = explain(rules, state, 1);
    const codes = items.map(i => i.code);
    expect(codes).toContain('LEAVES_OPEN_CAPTURE');
  });

  it('triggers DEFENDS_THREAT when player move neutralizes an existing capture threat', () => {
    // North pit 9 (1 stone) threatens to land in empty pit 10 and capture South pit 2 (which has 4 stones).
    // South plays pit 2 (emptying it). Now North lands in 10 but captures nothing!
    const state: GameState = {
      board: [0, 0, 4, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0],
      turn: 0,
      over: false,
    };
    const items = explain(rules, state, 2);
    const codes = items.map(i => i.code);
    expect(codes).toContain('DEFENDS_THREAT');
  });

  it('triggers SETUP_EXTRA_TURN when sowing deposits a stone to set up future free turn', () => {
    // Pit 3 has 2 stones (needs 3 stones to reach store 6).
    // Pit 1 has 2 stones. Playing pit 1 drops 1 into pit 2 and 1 into pit 3.
    // Now pit 3 has 3 stones = exactly 3 away from store 6!
    const state: GameState = {
      board: [0, 2, 0, 2, 0, 0, 0, 1, 1, 1, 1, 1, 1, 0],
      turn: 0,
      over: false,
    };
    const items = explain(rules, state, 1);
    const codes = items.map(i => i.code);
    expect(codes).toContain('SETUP_EXTRA_TURN');
  });

  it('triggers STARVES_OPPONENT when opponent is left with <= 2 active stones', () => {
    // North has only 1 stone in pit 7. South has stone in pit 0 and pit 5.
    // South plays pit 5 (lands in store 6). South still has stones so match continues.
    // North is left with 1 active stone.
    const state: GameState = {
      board: [1, 0, 0, 0, 0, 1, 10, 1, 0, 0, 0, 0, 0, 10],
      turn: 0,
      over: false,
    };
    const items = explain(rules, state, 5);
    const codes = items.map(i => i.code);
    expect(codes).toContain('STARVES_OPPONENT');
  });

  it('triggers HOARD_TOO_LONG when player has >= 10 stones in a pit and fails to move it', () => {
    // South pit 1 has 12 stones. South plays pit 4 instead.
    const state: GameState = {
      board: [0, 12, 0, 0, 1, 0, 0, 2, 2, 2, 2, 2, 2, 0],
      turn: 0,
      over: false,
    };
    const items = explain(rules, state, 4);
    const codes = items.map(i => i.code);
    expect(codes).toContain('HOARD_TOO_LONG');
  });

  it('triggers ENDGAME_SWEEP_TRIGGERED when move ends the match', () => {
    // South has only 1 stone in pit 5 (adjacent to store 6). North has stones in pit 7.
    // Playing pit 5 empties South side, triggering game over sweep!
    const state: GameState = {
      board: [0, 0, 0, 0, 0, 1, 20, 2, 0, 0, 0, 0, 0, 20],
      turn: 0,
      over: false,
    };
    const items = explain(rules, state, 5);
    const codes = items.map(i => i.code);
    expect(codes).toContain('ENDGAME_SWEEP_TRIGGERED');
  });

  it('falls back to OPTIMAL_POSITIONAL when no tactical triggers match', () => {
    // Quiet position with no extra turns, captures, or threats available
    const state: GameState = {
      board: [1, 1, 1, 1, 1, 0, 0, 0, 3, 3, 3, 3, 3, 0],
      turn: 0,
      over: false,
    };
    const items = explain(rules, state, 0);
    const codes = items.map(i => i.code);
    expect(codes).toContain('OPTIMAL_POSITIONAL');
  });
});
