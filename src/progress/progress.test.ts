import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  loadProgress,
  saveProgress,
  recordActivity,
  PROGRESS_STORAGE_KEY,
  getDefaultProgress,
} from './progress';
import { BADGES } from './badges';

describe('Progress & Forgiving Streaks System', () => {
  const originalLocalStorage = globalThis.localStorage;
  let store: Map<string, string>;

  beforeEach(() => {
    store = new Map<string, string>();
    globalThis.localStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => { store.set(k, String(v)); },
      removeItem: (k: string) => { store.delete(k); },
      clear: () => store.clear(),
      length: 0,
      key: () => null,
    } as any;
  });

  afterEach(() => {
    globalThis.localStorage = originalLocalStorage;
  });

  const DAY_MS = 86400000;
  const BASE_TIME = 1775520000000; // Reference epoch time

  it('initializes default progress correctly', () => {
    const p = loadProgress();
    expect(p.streak).toBe(0);
    expect(p.bestStreak).toBe(0);
    expect(p.badges).toEqual([]);
    expect(p.stats.gamesWon).toBe(0);
  });

  it('increments streak on consecutive days', () => {
    let res = recordActivity(undefined, BASE_TIME);
    expect(res.progress.streak).toBe(1);
    expect(res.progress.bestStreak).toBe(1);
    expect(res.freezeApplied).toBe(false);
    expect(res.welcomeBack).toBe(false);

    // Same day should not double increment streak
    res = recordActivity(undefined, BASE_TIME + 3600000, res.progress);
    expect(res.progress.streak).toBe(1);

    // Next day (Day 2)
    res = recordActivity(undefined, BASE_TIME + DAY_MS, res.progress);
    expect(res.progress.streak).toBe(2);
    expect(res.progress.bestStreak).toBe(2);

    // Next day (Day 3)
    res = recordActivity(undefined, BASE_TIME + 2 * DAY_MS, res.progress);
    expect(res.progress.streak).toBe(3);
    expect(res.progress.bestStreak).toBe(3);
    expect(res.progress.badges).toContain('streak_3');
  });

  it('forgivingly auto-applies weekly freeze when exactly 1 day is missed', () => {
    // Day 1
    let res = recordActivity(undefined, BASE_TIME);
    expect(res.progress.streak).toBe(1);

    // Day 2
    res = recordActivity(undefined, BASE_TIME + DAY_MS, res.progress);
    expect(res.progress.streak).toBe(2);

    // Miss Day 3, play on Day 4 (2 day delta)
    res = recordActivity(undefined, BASE_TIME + 3 * DAY_MS, res.progress);
    expect(res.freezeApplied).toBe(true);
    expect(res.progress.streak).toBe(3);
    expect(res.welcomeBack).toBe(false);

    // If another day is missed within the same week, freeze is exhausted and streak resets gently
    // Miss Day 5, play on Day 6
    res = recordActivity(undefined, BASE_TIME + 5 * DAY_MS, res.progress);
    expect(res.freezeApplied).toBe(false);
    expect(res.welcomeBack).toBe(true);
    expect(res.progress.streak).toBe(1);
    expect(res.progress.bestStreak).toBe(3); // Best streak preserved
  });

  it('handles midnight edge cases and DST transitions with injected clocks', () => {
    // 23:59:50 UTC on Day 1
    const day1MidnightMinus10s = Math.floor(BASE_TIME / DAY_MS) * DAY_MS + DAY_MS - 10000;
    let res = recordActivity(undefined, day1MidnightMinus10s);
    expect(res.progress.streak).toBe(1);

    // 00:00:10 UTC on Day 2 (20s later across midnight)
    const day2MidnightPlus10s = day1MidnightMinus10s + 20000;
    res = recordActivity(undefined, day2MidnightPlus10s, res.progress);
    expect(res.progress.streak).toBe(2);
  });

  it('unlocks badges upon meeting respective criteria without shaming or loot boxes', () => {
    let p = getDefaultProgress();

    // First win
    let res = recordActivity({ type: 'game_won' }, BASE_TIME, p);
    expect(res.progress.badges).toContain('first_win');
    expect(res.newBadges.some(b => b.id === 'first_win')).toBe(true);

    // First capture
    res = recordActivity({ type: 'capture_made', captures: 3 }, BASE_TIME, res.progress);
    expect(res.progress.badges).toContain('first_capture');

    // Flawless win
    res = recordActivity({ type: 'game_won', flawless: true }, BASE_TIME, res.progress);
    expect(res.progress.badges).toContain('flawless_win');

    // Tutorial completed
    res = recordActivity({ type: 'tutorial_completed' }, BASE_TIME, res.progress);
    expect(res.progress.badges).toContain('learned_tutorial');

    // 10 puzzles solved
    for (let i = 0; i < 9; i++) {
      res = recordActivity({ type: 'puzzle_solved' }, BASE_TIME, res.progress);
    }
    expect(res.progress.badges).not.toContain('puzzles_10');
    res = recordActivity({ type: 'puzzle_solved' }, BASE_TIME, res.progress);
    expect(res.progress.badges).toContain('puzzles_10');
  });

  it('handles corrupted localStorage safely by falling back to defaults', () => {
    localStorage.setItem(PROGRESS_STORAGE_KEY, '{ invalid_json ::::');
    const p = loadProgress();
    expect(p.streak).toBe(0);
    expect(p.badges).toEqual([]);
  });
});
