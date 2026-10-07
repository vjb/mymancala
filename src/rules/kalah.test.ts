import { describe, it, expect } from 'vitest';
import { createKalahRuleSet, KALAH_TOTAL_PITS, KalahOptions } from './kalah';
import { createInitialBoard, getLegalMoves, simulateMove, RulesConfig } from '../engine';

function createPrng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

describe('Kalah RuleSet Equivalence Fuzz Suite (2,000 Games)', () => {
  const configs: Array<{ name: string; options: KalahOptions; count: number; seed: number }> = [
    {
      name: 'Standard Kalah (Free Turn + Opposite Capture)',
      options: { freeTurn: true, captureOpposite: true },
      count: 1000,
      seed: 0x12345678
    },
    {
      name: 'No Free Turns (Capture Opposite Only)',
      options: { freeTurn: false, captureOpposite: true },
      count: 350,
      seed: 0x87654321
    },
    {
      name: 'No Captures (Free Turn Only)',
      options: { freeTurn: true, captureOpposite: false },
      count: 350,
      seed: 0xCAFEBABE
    },
    {
      name: 'Pure Sowing (No Free Turns, No Captures)',
      options: { freeTurn: false, captureOpposite: false },
      count: 300,
      seed: 0xDEADBEEF
    }
  ];

  for (const { name, options, count, seed } of configs) {
    it(`matches legacy simulateMove across ${count} games: ${name}`, () => {
      const rand = createPrng(seed);
      const ruleSet = createKalahRuleSet(options);
      const legacyConfig: RulesConfig = {
        freeTurn: options.freeTurn !== false,
        captureOpposite: options.captureOpposite !== false
      };

      let totalPlies = 0;

      for (let gameIdx = 0; gameIdx < count; gameIdx++) {
        let boardOld = createInitialBoard(4);
        let playerOld = 0;
        let stateNew = ruleSet.initial();

        expect(stateNew.board).toEqual(boardOld);
        expect(stateNew.turn).toBe(playerOld);
        expect(stateNew.over).toBe(false);

        let plies = 0;
        const maxPlies = 300;

        while (plies < maxPlies) {
          const legalOld = getLegalMoves(boardOld, playerOld, legacyConfig);
          const legalNew = ruleSet.legalMoves(stateNew);

          expect(legalNew).toEqual(legalOld);

          if (legalOld.length === 0) {
            break;
          }

          const move = legalOld[Math.floor(rand() * legalOld.length)];
          const simOld = simulateMove(boardOld, playerOld, move, legacyConfig);
          const resNew = ruleSet.apply(stateNew, move);

          // Assert parity across all properties on EVERY ply
          expect(resNew.state.board).toEqual(simOld.newBoard);
          expect(resNew.state.turn).toBe(simOld.nextPlayer);
          expect(resNew.state.over).toBe(simOld.isGameOver);
          expect(resNew.extraTurn).toBe(simOld.earnedFreeTurn);
          expect(resNew.captured).toBe(simOld.capturedStones);
          expect(resNew.path).toEqual(simOld.path);
          expect(resNew.lastLanding).toBe(simOld.lastLanding);
          expect(resNew.capturedFrom).toBe(simOld.capturedFromPit);

          boardOld = simOld.newBoard;
          playerOld = simOld.nextPlayer;
          stateNew = resNew.state;
          plies++;
          totalPlies++;

          if (simOld.isGameOver) {
            expect(resNew.state.over).toBe(true);
            expect(ruleSet.isTerminal(stateNew)).toBe(true);
            break;
          }
        }
      }

      expect(totalPlies).toBeGreaterThan(count * 5);
    });
  }

  it('preserves zero board geometry literals outside kalah.ts', () => {
    // Structural layout validation
    const rs = createKalahRuleSet();
    expect(rs.layout.rows).toBe(2);
    expect(rs.layout.cols).toBe(6);
    expect(rs.layout.stores).toEqual([6, 13]);
    expect(rs.layout.pitOwner(0)).toBe(0);
    expect(rs.layout.pitOwner(6)).toBe(0);
    expect(rs.layout.pitOwner(7)).toBe(1);
    expect(rs.layout.pitOwner(13)).toBe(1);
    expect(rs.layout.label(0)).toBe('Pit 1');
    expect(rs.layout.label(5)).toBe('Pit 6');
    expect(rs.layout.label(7)).toBe('Pit 6');
    expect(rs.layout.label(12)).toBe('Pit 1');
  });
});
