/**
 * Rating Ladder & Elo Management (mancala_rating_v1)
 *
 * Implements:
 * - Local Elo rating ladder for human player vs bots.
 * - Calibrated bot ratings: Pip (900), Gary (1250), Pebble (1600), Kalah (1950).
 * - K-factor: K=32 (provisional, < 30 games) and K=16 (standard, >= 30 games).
 * - Level titles: Novice (<1100), Apprentice (<1300), Tactician (<1500),
 *   Strategist (<1700), Master (<1900), Grandmaster (>=1900).
 * - Gated numeric Elo: only exposed when lens.full is active.
 */

export type RatingLevel =
  | 'novice'
  | 'apprentice'
  | 'tactician'
  | 'strategist'
  | 'master'
  | 'grandmaster';

export interface RatingGameRecord {
  date: string;
  opponentId: string;
  opponentRating: number;
  result: 1 | 0.5 | 0; // 1 = win, 0.5 = draw, 0 = loss
  playerRatingBefore: number;
  playerRatingAfter: number;
  delta: number;
}

export interface RatingProfile {
  rating: number;
  gamesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  history: RatingGameRecord[];
}

export const STORAGE_KEY_RATING = 'mancala_rating_v1';

export const BOT_RATINGS: Record<string, number> = {
  pip: 900,
  gary: 1250,
  pebble: 1600,
  kalah: 1950,
};

export const DEFAULT_RATING_PROFILE: Readonly<RatingProfile> = {
  rating: 1000,
  gamesPlayed: 0,
  wins: 0,
  losses: 0,
  draws: 0,
  history: [],
};

/**
 * Standard Elo expected score formula:
 * E = 1 / (1 + 10^((R_opp - R_player) / 400))
 */
export function calculateExpectedScore(playerRating: number, opponentRating: number): number {
  return 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));
}

/**
 * Dynamic K-factor:
 * Provisional: K=32 for first 30 games.
 * Established: K=16 afterwards.
 */
export function getKFactor(gamesPlayed: number): number {
  return gamesPlayed < 30 ? 32 : 16;
}

/**
 * Compute rating delta given game result (1 = win, 0.5 = draw, 0 = loss).
 */
export function calculateRatingDelta(
  playerRating: number,
  opponentRating: number,
  result: 1 | 0.5 | 0,
  gamesPlayed: number
): number {
  const expected = calculateExpectedScore(playerRating, opponentRating);
  const k = getKFactor(gamesPlayed);
  return Math.round(k * (result - expected));
}

/**
 * Map numerical rating to rank level title key.
 */
export function getRatingLevel(rating: number): RatingLevel {
  if (rating < 1100) return 'novice';
  if (rating < 1300) return 'apprentice';
  if (rating < 1500) return 'tactician';
  if (rating < 1700) return 'strategist';
  if (rating < 1900) return 'master';
  return 'grandmaster';
}

export function getRatingLevelI18nKey(rating: number): string {
  return `rating.level.${getRatingLevel(rating)}`;
}

/**
 * Load rating profile from localStorage with safe fallback.
 */
export function loadRatingProfile(): RatingProfile {
  if (typeof localStorage === 'undefined') {
    return { ...DEFAULT_RATING_PROFILE, history: [] };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY_RATING);
    if (!raw) return { ...DEFAULT_RATING_PROFILE, history: [] };
    const parsed = JSON.parse(raw);
    if (typeof parsed?.rating === 'number' && typeof parsed?.gamesPlayed === 'number') {
      return {
        rating: Math.max(100, Math.round(parsed.rating)),
        gamesPlayed: Math.max(0, parsed.gamesPlayed || 0),
        wins: Math.max(0, parsed.wins || 0),
        losses: Math.max(0, parsed.losses || 0),
        draws: Math.max(0, parsed.draws || 0),
        history: Array.isArray(parsed.history) ? parsed.history.slice(-50) : [],
      };
    }
  } catch {
    // Ignore JSON errors and fallback
  }
  return { ...DEFAULT_RATING_PROFILE, history: [] };
}

/**
 * Save rating profile to localStorage.
 */
export function saveRatingProfile(profile: RatingProfile): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_RATING, JSON.stringify(profile));
  } catch {
    // Ignore storage quota errors
  }
}

/**
 * Record a game result, update rating, and persist to localStorage.
 */
export function recordGameResult(
  opponentId: string,
  result: 1 | 0.5 | 0,
  customOpponentRating?: number
): { profile: RatingProfile; delta: number } {
  const profile = loadRatingProfile();
  const oppRating = customOpponentRating ?? BOT_RATINGS[opponentId.toLowerCase()] ?? 1000;
  const delta = calculateRatingDelta(profile.rating, oppRating, result, profile.gamesPlayed);
  const newRating = Math.max(100, profile.rating + delta);

  const record: RatingGameRecord = {
    date: new Date().toISOString(),
    opponentId,
    opponentRating: oppRating,
    result,
    playerRatingBefore: profile.rating,
    playerRatingAfter: newRating,
    delta,
  };

  const updated: RatingProfile = {
    rating: newRating,
    gamesPlayed: profile.gamesPlayed + 1,
    wins: profile.wins + (result === 1 ? 1 : 0),
    losses: profile.losses + (result === 0 ? 1 : 0),
    draws: profile.draws + (result === 0.5 ? 1 : 0),
    history: [...profile.history, record].slice(-50),
  };

  saveRatingProfile(updated);
  return { profile: updated, delta };
}

/**
 * Format rating for display.
 * Numeric Elo is only shown when isFullLens is true.
 */
export function formatRating(rating: number, levelTitle: string, isFullLens: boolean): string {
  if (isFullLens) {
    return `${levelTitle} (${rating})`;
  }
  return levelTitle;
}
