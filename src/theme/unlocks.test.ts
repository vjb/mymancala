import { describe, it, expect } from 'vitest';
import { isSkinUnlocked, getSkinUnlockRequirement, SKIN_UNLOCK_REGISTRY } from './unlocks';
import { getDefaultProgress } from '../progress/progress';

describe('Cosmetic Skin Unlocks System', () => {
  it('guarantees standard core skins are unconditionally free', () => {
    const defaultProgress = getDefaultProgress();
    expect(isSkinUnlocked('walnut', defaultProgress)).toBe(true);
    expect(isSkinUnlocked('porcelain', defaultProgress)).toBe(true);
    expect(isSkinUnlocked('obsidian', defaultProgress)).toBe(true);
    expect(isSkinUnlocked('high-contrast', defaultProgress)).toBe(true);
  });

  it('locks emerald skin until 3-day streak or first win is achieved', () => {
    const fresh = getDefaultProgress();
    expect(isSkinUnlocked('emerald', fresh)).toBe(false);

    // With 3-day streak
    const streakProgress = { ...fresh, streak: 3 };
    expect(isSkinUnlocked('emerald', streakProgress)).toBe(true);

    // With first win badge
    const badgeProgress = { ...fresh, badges: ['first_win'] };
    expect(isSkinUnlocked('emerald', badgeProgress)).toBe(true);
  });

  it('locks amethyst skin until 7-day streak or 10 puzzles are achieved', () => {
    const fresh = getDefaultProgress();
    expect(isSkinUnlocked('amethyst', fresh)).toBe(false);

    // With 7-day streak
    const streakProgress = { ...fresh, streak: 7 };
    expect(isSkinUnlocked('amethyst', streakProgress)).toBe(true);

    // With 10 puzzles badge
    const badgeProgress = { ...fresh, badges: ['puzzles_10'] };
    expect(isSkinUnlocked('amethyst', badgeProgress)).toBe(true);
  });

  it('provides descriptive unlock requirements for UI', () => {
    expect(getSkinUnlockRequirement('walnut')).toContain('Classic');
    expect(getSkinUnlockRequirement('emerald')).toContain('streak');
    expect(getSkinUnlockRequirement('amethyst')).toContain('puzzles');
  });
});
