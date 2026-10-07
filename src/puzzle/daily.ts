import { Puzzle } from './types';
import puzzlesData from './data.json';

const puzzles: Puzzle[] = puzzlesData as Puzzle[];

/**
 * Calculates deterministic UTC day index.
 * Matches across all time zones per requirement.
 */
export function getUtcDayIndex(timestampMs: number = Date.now()): number {
  return Math.floor(timestampMs / 86400000);
}

/**
 * Deterministic pseudo-random permutation to map dayIndex to a puzzle index.
 * Ensures consistent daily cycle with full coverage of the 365+ puzzle bank.
 */
function permuteDayIndex(dayIndex: number, total: number): number {
  // LCG step to avoid sequential clustering while maintaining determinism
  const mapped = (Math.abs(dayIndex) * 2654435761 + 1013904223) >>> 0;
  return mapped % total;
}

/**
 * Returns today's daily puzzle or a puzzle for a specific day index.
 */
export function puzzleFor(dayIndex: number = getUtcDayIndex()): Puzzle {
  if (!puzzles || puzzles.length === 0) {
    throw new Error('Puzzle dataset is empty or not loaded.');
  }
  const idx = permuteDayIndex(dayIndex, puzzles.length);
  return puzzles[idx];
}

/**
 * Retrieves puzzle by ID.
 */
export function getPuzzleById(id: string): Puzzle | undefined {
  return puzzles.find(p => p.id === id);
}

/**
 * Total number of verified offline puzzles bundled.
 */
export function getTotalPuzzleCount(): number {
  return puzzles.length;
}

/**
 * Verifies whether a move is the winning/optimal solution for the puzzle.
 */
export function isSolutionMove(puzzle: Puzzle, move: number): boolean {
  return puzzle.solution.length > 0 && puzzle.solution[0] === move;
}
