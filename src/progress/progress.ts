import { ProgressState, GameProgressEvent, Badge } from './types';
import { BADGES } from './badges';

export const PROGRESS_STORAGE_KEY = 'mancala_progress_v1';

export function getDefaultProgress(): ProgressState {
  return {
    streak: 0,
    bestStreak: 0,
    lastDay: 0,
    lastFreezeWeek: -1,
    badges: [],
    stats: {
      puzzlesSolved: 0,
      gamesWon: 0,
      gamesPlayed: 0,
      capturesMade: 0,
      flawlessWins: 0,
      tutorialCompleted: false,
      variantsPlayed: [],
    },
  };
}

export function loadProgress(): ProgressState {
  try {
    if (typeof localStorage === 'undefined') return getDefaultProgress();
    const raw = localStorage.getItem(PROGRESS_STORAGE_KEY);
    if (!raw) return getDefaultProgress();
    const parsed = JSON.parse(raw);
    return {
      ...getDefaultProgress(),
      ...parsed,
      stats: {
        ...getDefaultProgress().stats,
        ...(parsed.stats || {}),
        variantsPlayed: parsed.stats?.variantsPlayed || [],
      },
      badges: Array.isArray(parsed.badges) ? parsed.badges : [],
    };
  } catch {
    return getDefaultProgress();
  }
}

export function saveProgress(state: ProgressState): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(state));
    }
  } catch {}
}

export interface ActivityResult {
  progress: ProgressState;
  newBadges: Badge[];
  freezeApplied: boolean;
  welcomeBack: boolean;
}

/**
 * Updates streak with forgiving weekly freeze and evaluates badges.
 * A miss never shames the player — gentle "Welcome back!" is returned.
 */
export function recordActivity(
  event?: GameProgressEvent,
  timestampMs: number = Date.now(),
  currentProgress?: ProgressState
): ActivityResult {
  const p = currentProgress ? { ...currentProgress } : loadProgress();
  const dayIndex = Math.floor(timestampMs / 86400000);
  const weekIndex = Math.floor(dayIndex / 7);

  let freezeApplied = false;
  let welcomeBack = false;

  // 1. Process streak progression
  if (p.lastDay === 0) {
    // Initial activity
    p.streak = 1;
    p.bestStreak = 1;
    p.lastDay = dayIndex;
  } else if (p.lastDay === dayIndex) {
    // Same day: streak already updated today
  } else if (dayIndex === p.lastDay + 1) {
    // Consecutive day
    p.streak += 1;
    p.bestStreak = Math.max(p.streak, p.bestStreak);
    p.lastDay = dayIndex;
  } else if (dayIndex === p.lastDay + 2 && p.lastFreezeWeek !== weekIndex) {
    // Missed exactly 1 day and weekly freeze is available
    freezeApplied = true;
    p.lastFreezeWeek = weekIndex;
    p.streak += 1;
    p.bestStreak = Math.max(p.streak, p.bestStreak);
    p.lastDay = dayIndex;
  } else {
    // Streak reset (missed > 1 day or freeze already used)
    welcomeBack = true;
    p.streak = 1;
    p.lastDay = dayIndex;
  }

  // 2. Update stats based on event
  if (event) {
    if (event.type === 'game_won') {
      p.stats.gamesWon += 1;
      p.stats.gamesPlayed += 1;
      if (event.flawless) {
        p.stats.flawlessWins += 1;
      }
    } else if (event.type === 'game_played') {
      p.stats.gamesPlayed += 1;
    } else if (event.type === 'capture_made') {
      p.stats.capturesMade += (event.captures || 1);
    } else if (event.type === 'puzzle_solved') {
      p.stats.puzzlesSolved += 1;
    } else if (event.type === 'tutorial_completed') {
      p.stats.tutorialCompleted = true;
    }

    if (event.variantId && !p.stats.variantsPlayed.includes(event.variantId)) {
      p.stats.variantsPlayed = [...p.stats.variantsPlayed, event.variantId];
    }
  }

  // 3. Evaluate unlocked badges
  const newBadges: Badge[] = [];
  for (const b of BADGES) {
    if (!p.badges.includes(b.id)) {
      if (b.check(p, event)) {
        p.badges.push(b.id);
        newBadges.push(b);
      }
    }
  }

  saveProgress(p);

  return {
    progress: p,
    newBadges,
    freezeApplied,
    welcomeBack,
  };
}
