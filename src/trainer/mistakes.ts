/**
 * Mistake Log Persistence & Leitner Spaced Repetition Scheduling
 *
 * Implements:
 * - Storage key: mancala_mistakes_v1
 * - Capacity cap: 200 items (newest-first)
 * - De-duplication: matching position + played pit
 * - Leitner Spaced-Repetition:
 *   - Box 1: 1 day (86,400,000 ms)
 *   - Box 2: 3 days (259,200,000 ms)
 *   - Box 3: 7 days (604,800,000 ms)
 * - Correct answer advances box (Box 1 -> 2 -> 3).
 * - Incorrect answer demotes to Box 1.
 */

import { MoveGrade } from './classify';

export interface MistakeRecord {
  readonly id: string;
  readonly rulesId: string;
  readonly position: readonly number[];
  readonly turn: 0 | 1;
  readonly played: number;
  readonly best: number;
  readonly loss: number;
  readonly grade: MoveGrade;
  readonly at: number;
  readonly box: 1 | 2 | 3;
  readonly nextReviewAt: number;
  readonly solved: number;
  readonly explanationCode?: string;
}

export const STORAGE_KEY_MISTAKES = 'mancala_mistakes_v1';
export const MAX_MISTAKES = 200;

export const BOX_INTERVALS_MS: Record<1 | 2 | 3, number> = {
  1: 86_400_000,    // 1 day
  2: 259_200_000,   // 3 days
  3: 604_800_000,   // 7 days
};

/**
 * Generate a unique position signature for de-duplication.
 */
export function getPositionKey(position: readonly number[], turn: number, played: number): string {
  return `${position.join(',')}_p${turn}_m${played}`;
}

/**
 * Load mistake log from localStorage with safe error recovery.
 */
export function loadMistakes(): MistakeRecord[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_MISTAKES);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter(item => (
        item &&
        typeof item.id === 'string' &&
        Array.isArray(item.position) &&
        typeof item.played === 'number' &&
        typeof item.best === 'number'
      ));
    }
  } catch {
    // Return empty on corrupt JSON
  }
  return [];
}

/**
 * Save mistake log to localStorage.
 */
export function saveMistakes(mistakes: readonly MistakeRecord[]): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_MISTAKES, JSON.stringify(mistakes.slice(0, MAX_MISTAKES)));
  } catch {
    // Ignore storage quota errors
  }
}

/**
 * Record a mistake into the log.
 * - De-duplicates matching (position + played pit)
 * - Sets initial Leitner Box 1, due immediately
 * - Caps at 200 newest-first
 */
export function recordMistake(params: {
  rulesId: string;
  position: readonly number[];
  turn?: 0 | 1;
  played: number;
  best: number;
  loss: number;
  grade: MoveGrade;
  explanationCode?: string;
  now?: number;
}): MistakeRecord {
  const now = params.now ?? Date.now();
  const turn = params.turn ?? 0;
  const currentMistakes = loadMistakes();

  const keyToMatch = getPositionKey(params.position, turn, params.played);
  const existingIndex = currentMistakes.findIndex(m => 
    getPositionKey(m.position, m.turn, m.played) === keyToMatch
  );

  let newRecord: MistakeRecord;

  if (existingIndex !== -1) {
    const existing = currentMistakes[existingIndex];
    // Update existing record, reset to Box 1, bring to front
    newRecord = {
      ...existing,
      best: params.best,
      loss: params.loss,
      grade: params.grade,
      explanationCode: params.explanationCode ?? existing.explanationCode,
      at: now,
      box: 1,
      nextReviewAt: now, // immediately available for drill
    };
    currentMistakes.splice(existingIndex, 1);
  } else {
    // Create new record
    newRecord = {
      id: `mistake_${now}_${Math.random().toString(36).slice(2, 8)}`,
      rulesId: params.rulesId,
      position: [...params.position],
      turn,
      played: params.played,
      best: params.best,
      loss: params.loss,
      grade: params.grade,
      at: now,
      box: 1,
      nextReviewAt: now, // immediately available
      solved: 0,
      explanationCode: params.explanationCode,
    };
  }

  const updated = [newRecord, ...currentMistakes].slice(0, MAX_MISTAKES);
  saveMistakes(updated);
  return newRecord;
}

/**
 * Handle user's drill response.
 * - If correct: advances Box 1 -> 2 -> 3, increments solved count, schedules next review.
 * - If incorrect: resets to Box 1, schedules review in 1 day.
 */
export function answerDrill(id: string, correct: boolean, now = Date.now()): MistakeRecord | null {
  const currentMistakes = loadMistakes();
  const index = currentMistakes.findIndex(m => m.id === id);
  if (index === -1) return null;

  const mistake = currentMistakes[index];
  let updatedRecord: MistakeRecord;

  if (correct) {
    let nextBox: 1 | 2 | 3 = 1;
    if (mistake.box === 1) nextBox = 2;
    else if (mistake.box === 2) nextBox = 3;
    else nextBox = 3;

    updatedRecord = {
      ...mistake,
      box: nextBox,
      solved: mistake.solved + 1,
      nextReviewAt: now + BOX_INTERVALS_MS[nextBox],
    };
  } else {
    updatedRecord = {
      ...mistake,
      box: 1,
      nextReviewAt: now + BOX_INTERVALS_MS[1],
    };
  }

  currentMistakes[index] = updatedRecord;
  saveMistakes(currentMistakes);
  return updatedRecord;
}

/**
 * Retrieve drill cards due for review.
 * If no cards are strictly due, returns upcoming mistakes sorted by nextReviewAt
 * so the player can always practice drills on demand.
 */
export function getDueDrills(now = Date.now()): MistakeRecord[] {
  const mistakes = loadMistakes();
  const due = mistakes.filter(m => m.nextReviewAt <= now);
  if (due.length > 0) {
    return due;
  }
  // If none due, return all available sorted by nextReviewAt asc
  return [...mistakes].sort((a, b) => a.nextReviewAt - b.nextReviewAt);
}

/**
 * Clear all mistake records (e.g. for reset/testing).
 */
export function clearMistakes(): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY_MISTAKES);
  } catch {
    // Ignore
  }
}
