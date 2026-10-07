import React, { useState, useEffect, useRef, useCallback } from 'react';

export type FontScale = 'S' | 'M' | 'L' | 'XL';

export const FONT_SCALE_VALUES: Record<FontScale, number> = {
  S: 0.85,
  M: 1.0,
  L: 1.15,
  XL: 1.3
};

export interface AccessibilitySettings {
  fontScale: FontScale;
  highContrast: boolean;
  reducedMotion: 'auto' | 'reduce' | 'no-preference';
  bigMode: boolean;
  tapTwice: boolean;
  readAloud: boolean;
  speechRate: number;
}

export const DEFAULT_A11Y_SETTINGS: AccessibilitySettings = {
  fontScale: 'M',
  highContrast: false,
  reducedMotion: 'auto',
  bigMode: false,
  tapTwice: false,
  readAloud: false,
  speechRate: 1.0
};

export const A11Y_STORAGE_KEY = 'mancala_a11y_v1';

export function loadA11ySettings(): AccessibilitySettings {
  try {
    const raw = localStorage.getItem(A11Y_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_A11Y_SETTINGS, ...parsed };
    }
  } catch {}
  return { ...DEFAULT_A11Y_SETTINGS };
}

export function saveA11ySettings(settings: AccessibilitySettings): void {
  try {
    localStorage.setItem(A11Y_STORAGE_KEY, JSON.stringify(settings));
  } catch {}
}

/**
 * Checks system prefers-reduced-motion media query and respects manual user override.
 */
export function useReducedMotion(preference: 'auto' | 'reduce' | 'no-preference'): boolean {
  const [systemReduced, setSystemReduced] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (e: MediaQueryListEvent) => setSystemReduced(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  if (preference === 'reduce') return true;
  if (preference === 'no-preference') return false;
  return systemReduced;
}

/**
 * 250ms tap debounce hook to prevent double-tap race conditions.
 */
export function useDebouncedMove(onMove: (pit: number) => void, debounceMs = 250) {
  const lastTapRef = useRef<number>(0);

  return useCallback((pit: number) => {
    const now = Date.now();
    if (now - lastTapRef.current < debounceMs) {
      return; // Suppress accidental multi-tap
    }
    lastTapRef.current = now;
    onMove(pit);
  }, [onMove, debounceMs]);
}

/**
 * Generates descriptive ARIA label for Mancala pits.
 */
export function getPitAriaLabel(
  pitIndex: number,
  stones: number,
  isLegal: boolean,
  isBest: boolean,
  player: 'p1' | 'p2',
  isCurrentTurn: boolean,
  tapTwice = false,
  t?: (key: any, params?: Record<string, string | number>) => string
): string {
  const ownerLabel = player === 'p1' ? 'Your' : "Opponent's";
  const pitNum = player === 'p1' ? pitIndex + 1 : 13 - pitIndex;
  const stoneText = t ? t('board.stones', { count: stones }) : (stones === 1 ? '1 stone' : `${stones} stones`);

  let actionText = '';
  if (!isCurrentTurn) {
    actionText = 'Not your turn.';
  } else if (!isLegal) {
    actionText = stones === 0 ? 'Empty pit, cannot play.' : 'Cannot play this pit.';
  } else {
    actionText = tapTwice ? 'Tap once to preview, twice to play.' : 'Press Enter or double tap to play.';
  }

  const recommendation = isBest ? "Coach's recommended move." : '';

  return `${ownerLabel} pit ${pitNum}, ${stoneText}. ${recommendation} ${actionText}`.trim();
}

/**
 * Traps Tab focus inside modal dialogs and handles Escape key dismissal.
 */
export function trapFocus(container: HTMLElement, e: KeyboardEvent, onClose: () => void) {
  if (e.key === 'Escape') {
    e.preventDefault();
    onClose();
    return;
  }

  if (e.key === 'Tab') {
    const focusable = container.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }
}

/**
 * 2D Arrow key navigation for 2x6 Kalah board:
 * North row: 12, 11, 10, 9, 8, 7
 * South row: 0, 1, 2, 3, 4, 5
 */
export function getNextPitOnArrowKey(currentPit: number, key: string): number | null {
  // South row: 0..5
  if (currentPit >= 0 && currentPit <= 5) {
    switch (key) {
      case 'ArrowRight':
        return currentPit < 5 ? currentPit + 1 : currentPit;
      case 'ArrowLeft':
        return currentPit > 0 ? currentPit - 1 : currentPit;
      case 'ArrowUp':
        return 12 - currentPit; // North counterpart
      case 'ArrowDown':
        return currentPit;
      default:
        return null;
    }
  }

  // North row: 7..12 (rendered visually 12..7)
  if (currentPit >= 7 && currentPit <= 12) {
    switch (key) {
      case 'ArrowRight':
        // Moving visually right on top row means going from 12 towards 7
        return currentPit > 7 ? currentPit - 1 : currentPit;
      case 'ArrowLeft':
        // Moving visually left on top row means going from 7 towards 12
        return currentPit < 12 ? currentPit + 1 : currentPit;
      case 'ArrowDown':
        return 12 - currentPit; // South counterpart
      case 'ArrowUp':
        return currentPit;
      default:
        return null;
    }
  }

  return null;
}
