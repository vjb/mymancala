import { SkinTheme } from '../theme';
import { ProgressState } from '../progress/types';
import { loadProgress } from '../progress/progress';

export interface SkinUnlockInfo {
  id: SkinTheme;
  free: boolean;
  requiredBadges?: string[];
  requiredStreak?: number;
  description: string;
}

export const SKIN_UNLOCK_REGISTRY: Record<SkinTheme, SkinUnlockInfo> = {
  walnut: {
    id: 'walnut',
    free: true,
    description: 'Classic artisanal hardwood (always unlocked)',
  },
  porcelain: {
    id: 'porcelain',
    free: true,
    description: 'Minimalist warm cream ceramic (always unlocked)',
  },
  obsidian: {
    id: 'obsidian',
    free: true,
    description: 'Tactical volcanic glass & glowing runes (always unlocked)',
  },
  'high-contrast': {
    id: 'high-contrast',
    free: true,
    description: 'WCAG AAA 7:1 accessibility skin (always unlocked)',
  },
  emerald: {
    id: 'emerald',
    free: false,
    requiredBadges: ['streak_3', 'first_win'],
    requiredStreak: 3,
    description: 'Unlocked by a 3-day streak or your first match victory',
  },
  amethyst: {
    id: 'amethyst',
    free: false,
    requiredBadges: ['streak_7', 'puzzles_10'],
    requiredStreak: 7,
    description: 'Unlocked by a 7-day streak or solving 10 daily puzzles',
  },
};

/**
 * Checks whether a cosmetic skin is unlocked for the user.
 * Existing default skins are strictly free.
 */
export function isSkinUnlocked(skin: SkinTheme, progress?: ProgressState): boolean {
  const info = SKIN_UNLOCK_REGISTRY[skin];
  if (!info || info.free) return true;

  const p = progress || loadProgress();
  if (info.requiredStreak && (p.streak >= info.requiredStreak || p.bestStreak >= info.requiredStreak)) {
    return true;
  }
  if (info.requiredBadges && info.requiredBadges.some(b => p.badges.includes(b))) {
    return true;
  }

  return false;
}

export function getSkinUnlockRequirement(skin: SkinTheme): string {
  return SKIN_UNLOCK_REGISTRY[skin]?.description || 'Unlocked';
}
