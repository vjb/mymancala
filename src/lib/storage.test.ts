import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  saveGameSession,
  loadGameSession,
  clearSavedGame,
  replayGameFromHistory,
  SavedGameV1
} from './storage';
import { kalahRuleSet } from '../rules';

describe('Storage Autosave & Replay Suite', () => {
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

  it('correctly replays a sequence of valid moves from history', () => {
    const initial = kalahRuleSet.initial();
    const legalMoves = kalahRuleSet.legalMoves(initial);
    const m0 = legalMoves[0];
    const res1 = kalahRuleSet.apply(initial, m0);
    const legal2 = kalahRuleSet.legalMoves(res1.state);
    const m1 = legal2[0];
    const res2 = kalahRuleSet.apply(res1.state, m1);

    const replay = replayGameFromHistory(kalahRuleSet, [m0, m1]);
    expect(replay.valid).toBe(true);
    expect(replay.appliedMoves).toBe(2);
    expect(replay.state.board).toEqual(res2.state.board);
    expect(replay.state.turn).toBe(res2.state.turn);
  });

  it('rejects illegal moves in history and flags valid: false', () => {
    const replay = replayGameFromHistory(kalahRuleSet, [6]);
    expect(replay.valid).toBe(false);
    expect(replay.appliedMoves).toBe(0);
    expect(replay.state.board).toEqual(kalahRuleSet.initial().board);
  });

  it('saves and loads a game session', () => {
    const session: SavedGameV1 = {
      version: 1,
      rulesId: 'kalah',
      options: { stonesPerPit: 4, freeTurn: true, captureOpposite: true },
      history: [0, 7],
      mode: 'pve',
      savedAt: Date.now()
    };

    const saved = saveGameSession(session);
    expect(saved).toBe(true);

    const loaded = loadGameSession();
    expect(loaded).toEqual(session);

    clearSavedGame();
    expect(loadGameSession()).toBeNull();
  });
});
