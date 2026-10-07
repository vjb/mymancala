import { useState, useEffect } from 'react';
import { RuleSet, GameState } from '../rules/types';

export const STORAGE_KEY_GAME = 'mancala_game_v1';

export interface SavedGameV1 {
  version: 1;
  rulesId: string;
  options: {
    stonesPerPit: number;
    freeTurn: boolean;
    captureOpposite: boolean;
  };
  history: number[];
  mode: 'pve' | 'pvp' | 'ai_vs_ai' | 'sandbox';
  botLevel?: string;
  humanPlayer?: number;
  savedAt: number;
}

/**
 * Replays game move list from rules.initial() to verify legality and eliminate snapshot bugs.
 */
export function replayGameFromHistory(
  rules: RuleSet,
  history: number[]
): { state: GameState; valid: boolean; appliedMoves: number } {
  let state = rules.initial();
  for (let i = 0; i < history.length; i++) {
    const move = history[i];
    const legalMoves = rules.legalMoves(state);
    if (!legalMoves.includes(move)) {
      // Encountered illegal move: corrupted save file
      return { state: rules.initial(), valid: false, appliedMoves: i };
    }
    const res = rules.apply(state, move);
    state = res.state;
    if (state.over && i < history.length - 1) {
      return { state: rules.initial(), valid: false, appliedMoves: i + 1 };
    }
  }
  return { state, valid: true, appliedMoves: history.length };
}

export function saveGameSession(session: SavedGameV1): boolean {
  try {
    if (typeof localStorage === 'undefined') return false;
    localStorage.setItem(STORAGE_KEY_GAME, JSON.stringify(session));
    return true;
  } catch (err) {
    console.warn('Failed to save game session to localStorage:', err);
    return false;
  }
}

export function loadGameSession(): SavedGameV1 | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(STORAGE_KEY_GAME);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      parsed.version === 1 &&
      typeof parsed.rulesId === 'string' &&
      Array.isArray(parsed.history) &&
      parsed.options &&
      typeof parsed.options.stonesPerPit === 'number' &&
      parsed.options.stonesPerPit > 0
    ) {
      return parsed as SavedGameV1;
    }
    clearSavedGame();
    return null;
  } catch {
    clearSavedGame();
    return null;
  }
}

export function clearSavedGame(): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY_GAME);
    }
  } catch {}
}

/**
 * Type-safe persistent hook for user settings with version migrations.
 */
export function usePersistentState<T>(key: string, defaultValue: T, version = 1): [T, (val: T | ((prev: T) => T)) => void] {
  const versionedKey = `${key}_v${version}`;
  const [state, setState] = useState<T>(() => {
    try {
      if (typeof localStorage === 'undefined') return defaultValue;
      const item = localStorage.getItem(versionedKey);
      return item ? JSON.parse(item) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  useEffect(() => {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(versionedKey, JSON.stringify(state));
      }
    } catch {}
  }, [versionedKey, state]);

  return [state, setState];
}
