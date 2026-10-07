import { describe, it, expect } from 'vitest';
import { owareRuleSet, OwareRuleSet, OWARE_P0_PITS, OWARE_P1_PITS } from './oware';
import { GameState } from './types';

describe('Oware (Abapa) RuleSet Suite', () => {
  it('initializes standard Oware board with 48 stones (4 per pit)', () => {
    const s = owareRuleSet.initial();
    expect(s.board).toHaveLength(14);
    for (const p of OWARE_P0_PITS) expect(s.board[p]).toBe(4);
    for (const p of OWARE_P1_PITS) expect(s.board[p]).toBe(4);
    expect(s.board[6]).toBe(0); // P0 store
    expect(s.board[13]).toBe(0); // P1 store
    expect(s.turn).toBe(0);
    expect(s.over).toBe(false);

    const total = s.board.reduce((a, b) => a + b, 0);
    expect(total).toBe(48);
  });

  it('correctly executes a standard opening move without free turn', () => {
    const initial = owareRuleSet.initial();
    // P0 plays pit 5 (4 stones: sow to 7, 8, 9, 10)
    const res = owareRuleSet.apply(initial, 5);
    expect(res.state.board[5]).toBe(0);
    expect(res.state.board[7]).toBe(5);
    expect(res.state.board[8]).toBe(5);
    expect(res.state.board[9]).toBe(5);
    expect(res.state.board[10]).toBe(5);
    expect(res.captured).toBe(0);
    expect(res.extraTurn).toBe(false); // Oware has no extra turns
    expect(res.state.turn).toBe(1); // Turn passes to P1
  });

  it('captures 2 or 3 stones when landing in opponent territory', () => {
    // Setup position where landing in pit 7 produces exactly 2 stones
    const s: GameState = {
      board: [0, 0, 0, 0, 0, 1, 0, 1, 4, 4, 4, 4, 4, 0],
      turn: 0,
      over: false,
    };
    // P0 plays pit 5 (1 stone -> lands in pit 7, making count 2)
    const res = owareRuleSet.apply(s, 5);
    expect(res.state.board[7]).toBe(0); // Captured!
    expect(res.state.board[6]).toBe(2); // Banked in P0 store
    expect(res.captured).toBe(2);
  });

  it('chains captures backwards when consecutive opponent pits have 2 or 3 stones', () => {
    // Pit 7 has 1 stone, Pit 8 has 2 stones.
    // P0 plays pit 4 (2 stones: sows to 5, then 7).
    // Last landing is 7 (makes 2 stones). Preceding pit is 5 (own pit, stops chain).
    // Another setup:
    // P0 plays from 5 with 2 stones -> sows to 7 and 8.
    // Pit 7 had 1 stone -> becomes 2. Pit 8 had 2 stones -> becomes 3.
    const s: GameState = {
      board: [0, 0, 0, 0, 0, 2, 0, 1, 2, 4, 4, 4, 4, 0],
      turn: 0,
      over: false,
    };
    const res = owareRuleSet.apply(s, 5);
    // Last landing is pit 8 (became 3 stones). Preceding is pit 7 (became 2 stones).
    expect(res.captured).toBe(5); // 3 from pit 8 + 2 from pit 7
    expect(res.state.board[7]).toBe(0);
    expect(res.state.board[8]).toBe(0);
    expect(res.state.board[6]).toBe(5); // In P0 store
  });

  it('skips starting pit when sowing 12 or more stones', () => {
    // Pit 0 has 12 stones.
    const s: GameState = {
      board: [12, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      turn: 0,
      over: false,
    };
    const res = owareRuleSet.apply(s, 0);
    // Origin pit 0 must be skipped and remain 0
    expect(res.state.board[0]).toBe(0);
    // Pits 1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 12 receive stones (11 pits total)
    // 12th stone goes to pit 1
    expect(res.state.board[1]).toBe(2);
  });

  it('enforces feeding obligation when opponent has zero stones', () => {
    // P1 side has zero stones
    const s: GameState = {
      board: [1, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      turn: 0,
      over: false,
    };
    // Pit 0 has 1 stone (sows to 1, does NOT reach P1).
    // Pit 1 has 2 stones (sows to 2, does NOT reach P1).
    // If pit 5 had 1 stone, it would reach pit 7.
    s.board[5] = 1;
    const legal = owareRuleSet.legalMoves(s);
    // Only pit 5 can feed opponent!
    expect(legal).toEqual([5]);
  });

  it('forfeits capture (Grand Slam protection) if capture would leave opponent with no stones', () => {
    // P1 has stones ONLY in pit 7 (which has 1 stone) and pit 8 (which has 2 stones).
    // A capture of both pits 7 and 8 would leave P1 with 0 stones!
    const s: GameState = {
      board: [0, 0, 0, 0, 0, 2, 0, 1, 2, 0, 0, 0, 0, 0],
      turn: 0,
      over: false,
    };
    const res = owareRuleSet.apply(s, 5);
    // Because grand slam would starve P1, capture is forfeited and stones remain
    expect(res.captured).toBe(0);
    expect(res.state.board[7]).toBe(2);
    expect(res.state.board[8]).toBe(3);
  });

  it('strictly conserves total stones (48 stones) across randomized playthroughs', () => {
    let s = owareRuleSet.initial();
    let movesPlayed = 0;

    // Seeded play for 100 turns
    for (let i = 0; i < 100; i++) {
      if (owareRuleSet.isTerminal(s)) break;
      const legal = owareRuleSet.legalMoves(s);
      if (legal.length === 0) break;
      const move = legal[i % legal.length];
      const res = owareRuleSet.apply(s, move);
      s = res.state;
      movesPlayed++;

      const sum = s.board.reduce((a, b) => a + b, 0);
      expect(sum).toBe(48); // Invariant: exactly 48 stones
    }

    expect(movesPlayed).toBeGreaterThan(10);
  });
});
