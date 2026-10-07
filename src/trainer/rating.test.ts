import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  calculateExpectedScore,
  getKFactor,
  calculateRatingDelta,
  getRatingLevel,
  getRatingLevelI18nKey,
  loadRatingProfile,
  saveRatingProfile,
  recordGameResult,
  formatRating,
  BOT_RATINGS,
  STORAGE_KEY_RATING,
} from './rating';

describe('Rating Ladder & Elo System', () => {
  const originalLocalStorage = globalThis.localStorage;

  beforeEach(() => {
    const store = new Map<string, string>();
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

  it('calculates expected score correctly', () => {
    // Equal ratings: 50% expected
    expect(calculateExpectedScore(1000, 1000)).toBeCloseTo(0.5);

    // Player 400 points higher: ~90.9% expected
    const highAdvantage = calculateExpectedScore(1400, 1000);
    expect(highAdvantage).toBeGreaterThan(0.9);

    // Player 400 points lower: ~9.1% expected
    const highDisadvantage = calculateExpectedScore(1000, 1400);
    expect(highDisadvantage).toBeLessThan(0.1);
  });

  it('uses K=32 for provisional and K=16 for established', () => {
    expect(getKFactor(0)).toBe(32);
    expect(getKFactor(15)).toBe(32);
    expect(getKFactor(29)).toBe(32);
    expect(getKFactor(30)).toBe(16);
    expect(getKFactor(50)).toBe(16);
  });

  it('calculates rating delta correctly', () => {
    // Win against equal rating with K=32: Math.round(32 * (1 - 0.5)) = +16
    expect(calculateRatingDelta(1000, 1000, 1, 0)).toBe(16);

    // Loss against equal rating with K=32: Math.round(32 * (0 - 0.5)) = -16
    expect(calculateRatingDelta(1000, 1000, 0, 0)).toBe(-16);

    // Draw against equal rating: 0
    expect(calculateRatingDelta(1000, 1000, 0.5, 0)).toBe(0);

    // Win with K=16: Math.round(16 * (1 - 0.5)) = +8
    expect(calculateRatingDelta(1000, 1000, 1, 30)).toBe(8);
  });

  it('maps rating to appropriate rank level titles', () => {
    expect(getRatingLevel(950)).toBe('novice');
    expect(getRatingLevel(1099)).toBe('novice');
    expect(getRatingLevel(1100)).toBe('apprentice');
    expect(getRatingLevel(1299)).toBe('apprentice');
    expect(getRatingLevel(1300)).toBe('tactician');
    expect(getRatingLevel(1499)).toBe('tactician');
    expect(getRatingLevel(1500)).toBe('strategist');
    expect(getRatingLevel(1699)).toBe('strategist');
    expect(getRatingLevel(1700)).toBe('master');
    expect(getRatingLevel(1899)).toBe('master');
    expect(getRatingLevel(1900)).toBe('grandmaster');
    expect(getRatingLevel(2200)).toBe('grandmaster');

    expect(getRatingLevelI18nKey(1000)).toBe('rating.level.novice');
    expect(getRatingLevelI18nKey(1600)).toBe('rating.level.strategist');
  });

  it('persists and retrieves profile in localStorage', () => {
    const initial = loadRatingProfile();
    expect(initial.rating).toBe(1000);
    expect(initial.gamesPlayed).toBe(0);

    saveRatingProfile({
      rating: 1250,
      gamesPlayed: 10,
      wins: 7,
      losses: 2,
      draws: 1,
      history: [],
    });

    const retrieved = loadRatingProfile();
    expect(retrieved.rating).toBe(1250);
    expect(retrieved.gamesPlayed).toBe(10);
    expect(retrieved.wins).toBe(7);
  });

  it('records game results against bots and updates rating', () => {
    // Record win vs Pip (900)
    const { profile, delta } = recordGameResult('pip', 1);
    expect(delta).toBeGreaterThan(0);
    expect(profile.rating).toBe(1000 + delta);
    expect(profile.gamesPlayed).toBe(1);
    expect(profile.wins).toBe(1);
    expect(profile.history.length).toBe(1);
    expect(profile.history[0].opponentRating).toBe(BOT_RATINGS.pip);

    // Verify localStorage has the update
    const reloaded = loadRatingProfile();
    expect(reloaded.rating).toBe(profile.rating);
    expect(reloaded.wins).toBe(1);
  });

  it('formats rating display according to full lens gating', () => {
    expect(formatRating(1050, 'Novice', false)).toBe('Novice');
    expect(formatRating(1050, 'Novice', true)).toBe('Novice (1050)');
  });

  it('handles corrupted localStorage gracefully', () => {
    localStorage.setItem(STORAGE_KEY_RATING, 'invalid-json');
    const profile = loadRatingProfile();
    expect(profile.rating).toBe(1000);
    expect(profile.gamesPlayed).toBe(0);
  });
});
