import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  saveGameSession,
  loadGameSession,
  clearSavedGame,
  replayGameFromHistory,
  STORAGE_KEY_GAME,
  SavedGameV1
} from './storage';
import { kalahRuleSet } from '../rules';

describe('Adversarial Storage Corruption & Fallback Suite', () => {
  const originalLocalStorage = globalThis.localStorage;

  beforeEach(() => {
    const store = new Map<string, string>();
    globalThis.localStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => { store.set(k, String(v)); },
      removeItem: (k: string) => { store.delete(k); },
      clear: () => store.clear(),
      length: 0,
      key: () => null
    } as any;
  });

  afterEach(() => {
    globalThis.localStorage = originalLocalStorage;
  });

  describe('Corrupted JSON in localStorage', () => {
    it('handles truncated or malformed JSON syntax gracefully', () => {
      localStorage.setItem(STORAGE_KEY_GAME, '{"version":1, "history": [0,');
      expect(() => {
        const loaded = loadGameSession();
        expect(loaded).toBeNull();
      }).not.toThrow();
      expect(localStorage.getItem(STORAGE_KEY_GAME)).toBeNull();
    });

    it('handles non-object JSON values cleanly', () => {
      const nonObjects = ['null', '12345', 'true', '"a string"', '[1, 2, 3]'];
      for (const raw of nonObjects) {
        localStorage.setItem(STORAGE_KEY_GAME, raw);
        expect(() => {
          const loaded = loadGameSession();
          expect(loaded).toBeNull();
        }).not.toThrow();
      }
    });

    it('rejects version mismatch (e.g. version 2 or 0)', () => {
      const badVersions = [0, 2, 99, -1, '1'];
      for (const v of badVersions) {
        localStorage.setItem(STORAGE_KEY_GAME, JSON.stringify({
          version: v,
          rulesId: 'kalah',
          history: [0]
        }));
        const loaded = loadGameSession();
        expect(loaded).toBeNull();
      }
    });

    it('rejects missing or non-string rulesId', () => {
      const badRules = [null, 123, true, {}, []];
      for (const r of badRules) {
        localStorage.setItem(STORAGE_KEY_GAME, JSON.stringify({
          version: 1,
          rulesId: r,
          history: [0]
        }));
        const loaded = loadGameSession();
        expect(loaded).toBeNull();
      }
    });

    it('rejects non-array history', () => {
      const badHistory = [null, 123, '0', {}, true];
      for (const h of badHistory) {
        localStorage.setItem(STORAGE_KEY_GAME, JSON.stringify({
          version: 1,
          rulesId: 'kalah',
          history: h
        }));
        const loaded = loadGameSession();
        expect(loaded).toBeNull();
      }
    });
  });

  describe('Move Replay Illegal & Adversarial Move Sequences', () => {
    it('rejects store indices (6, 13) as moves', () => {
      const replayStore6 = replayGameFromHistory(kalahRuleSet, [6]);
      expect(replayStore6.valid).toBe(false);
      expect(replayStore6.appliedMoves).toBe(0);
      expect(replayStore6.state.board).toEqual(kalahRuleSet.initial().board);

      const replayStore13 = replayGameFromHistory(kalahRuleSet, [13]);
      expect(replayStore13.valid).toBe(false);
      expect(replayStore13.appliedMoves).toBe(0);
    });

    it('rejects out of range pit numbers (negative, > 13)', () => {
      const outOfRange = [-1, -100, 14, 999, 999999];
      for (const badMove of outOfRange) {
        const replay = replayGameFromHistory(kalahRuleSet, [badMove]);
        expect(replay.valid).toBe(false);
        expect(replay.appliedMoves).toBe(0);
        expect(replay.state.board).toEqual(kalahRuleSet.initial().board);
      }
    });

    it('rejects opponent pit on first turn (pits 7-12 belong to P2)', () => {
      for (let p2Pit = 7; p2Pit <= 12; p2Pit++) {
        const replay = replayGameFromHistory(kalahRuleSet, [p2Pit]);
        expect(replay.valid).toBe(false);
        expect(replay.appliedMoves).toBe(0);
      }
    });

    it('rejects playing a pit with 0 stones', () => {
      // Pit 0 is played (initial 4 stones). Pits 1, 2, 3, 4 receive 1 stone. Pit 0 has 0 stones.
      // Now turn depends on landing: 0 + 4 = pit 4 (not store 6), so turn switches to P2 (turn = 1).
      // Even if P1 tried to play pit 0, pit 0 has 0 stones and it is P2's turn.
      // Let's test playing pit 0 twice:
      const replay = replayGameFromHistory(kalahRuleSet, [0, 0]);
      expect(replay.valid).toBe(false);
      expect(replay.appliedMoves).toBe(1); // 1st move succeeded, 2nd rejected
    });

    it('rejects non-integer moves (NaN, null, undefined, float, string)', () => {
      const weirdMoves = [NaN, null as any, undefined as any, 1.5, '0' as any, {} as any];
      for (const m of weirdMoves) {
        const replay = replayGameFromHistory(kalahRuleSet, [m]);
        expect(replay.valid).toBe(false);
        expect(replay.appliedMoves).toBe(0);
      }
    });

    it('rejects continuation after terminal state is reached', () => {
      // Construct a near-terminal state or artificial history that terminates
      // Let's verify that if a game terminates, extra trailing moves invalidate the replay
      const initial = kalahRuleSet.initial();
      let state = initial;
      const history: number[] = [];

      // Play up to 100 legal moves or until game is over
      for (let step = 0; step < 100 && !state.over; step++) {
        const legal = kalahRuleSet.legalMoves(state);
        if (legal.length === 0) break;
        const move = legal[0];
        history.push(move);
        state = kalahRuleSet.apply(state, move).state;
      }

      if (state.over) {
        // Appending an illegal extra move after game over
        const trailingHistory = [...history, 0];
        const replay = replayGameFromHistory(kalahRuleSet, trailingHistory);
        expect(replay.valid).toBe(false);
        expect(replay.state.board).toEqual(kalahRuleSet.initial().board);
      }
    });
  });

  describe('SavedGameV1 Schema Defense: Missing or Null options', () => {
    it('rejects payload without options and clears storage', () => {
      // A payload with valid version, rulesId, and history, but missing options
      const incompleteSave = {
        version: 1,
        rulesId: 'kalah',
        history: [0]
      };
      localStorage.setItem(STORAGE_KEY_GAME, JSON.stringify(incompleteSave));
      const loaded = loadGameSession();
      expect(loaded).toBeNull();
      expect(localStorage.getItem(STORAGE_KEY_GAME)).toBeNull();
    });

    it('rejects payload where options.stonesPerPit is not a number', () => {
      const badOptionsSave = {
        version: 1,
        rulesId: 'kalah',
        options: { freeTurn: true, captureOpposite: true },
        history: [0]
      };
      localStorage.setItem(STORAGE_KEY_GAME, JSON.stringify(badOptionsSave));
      const loaded = loadGameSession();
      expect(loaded).toBeNull();
      expect(localStorage.getItem(STORAGE_KEY_GAME)).toBeNull();
    });
  });
});
