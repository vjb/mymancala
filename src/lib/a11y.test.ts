import { describe, it, expect, vi } from 'vitest';
import {
  FONT_SCALE_VALUES,
  getPitAriaLabel,
  getNextPitOnArrowKey,
  trapFocus
} from './a11y';

describe('accessibility utilities', () => {
  it('defines valid font scales with M as 1.0', () => {
    expect(FONT_SCALE_VALUES.M).toBe(1.0);
    expect(FONT_SCALE_VALUES.S).toBeLessThan(1.0);
    expect(FONT_SCALE_VALUES.XL).toBeGreaterThan(1.0);
  });

  it('generates descriptive ARIA labels for pits', () => {
    const labelP1 = getPitAriaLabel(2, 4, true, true, 'p1', true, false);
    expect(labelP1).toContain('Your pit 3');
    expect(labelP1).toContain('4 stones');
    expect(labelP1).toContain("Coach's recommended move");
    expect(labelP1).toContain('Press Enter or double tap');

    const labelP2 = getPitAriaLabel(10, 2, false, false, 'p2', false, false);
    expect(labelP2).toContain("Opponent's pit 3");
    expect(labelP2).toContain('Not your turn');
  });

  it('navigates pits using 2D arrow keys on Kalah 2x6 grid', () => {
    // South row
    expect(getNextPitOnArrowKey(0, 'ArrowRight')).toBe(1);
    expect(getNextPitOnArrowKey(1, 'ArrowLeft')).toBe(0);
    expect(getNextPitOnArrowKey(0, 'ArrowUp')).toBe(12);
    expect(getNextPitOnArrowKey(5, 'ArrowUp')).toBe(7);

    // North row
    expect(getNextPitOnArrowKey(12, 'ArrowDown')).toBe(0);
    expect(getNextPitOnArrowKey(12, 'ArrowRight')).toBe(11); // Moving right visually on top row
    expect(getNextPitOnArrowKey(7, 'ArrowLeft')).toBe(8);   // Moving left visually on top row
  });

  it('handles modal focus trap escape key', () => {
    const fakeContainer = { querySelectorAll: () => [] } as unknown as HTMLElement;
    const onClose = vi.fn();
    const preventDefault = vi.fn();
    const escEvent = { key: 'Escape', preventDefault } as unknown as KeyboardEvent;

    trapFocus(fakeContainer, escEvent, onClose);
    expect(preventDefault).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });
});
