import { describe, it, expect } from 'vitest';
import {
  LENSES,
  PRESETS,
  PRESET_ORDER,
  applyPreset,
  detectPreset,
  toggleLens,
  loadLenses,
  saveLenses
} from './lenses';

function memoryStorage(initial: Record<string, string> = {}) {
  const data = { ...initial };
  return {
    getItem: (k: string) => (k in data ? data[k] : null),
    setItem: (k: string, v: string) => {
      data[k] = v;
    }
  };
}

describe('lens system', () => {
  it('Just Play shows nothing at all', () => {
    expect(Object.values(applyPreset('justPlay')).every(v => v === false)).toBe(true);
  });

  it('every preset covers every lens, and every lens is documented', () => {
    for (const id of PRESET_ORDER) {
      expect(Object.keys(PRESETS[id].lenses).sort()).toEqual(LENSES.map(l => l.id).sort());
    }
  });

  it('detects presets and reports custom after a manual change', () => {
    expect(detectPreset(applyPreset('full'))).toBe('full');
    expect(detectPreset(toggleLens(applyPreset('hints'), 'coach', true))).toBe('custom');
  });

  it('round-trips through storage', () => {
    const s = memoryStorage();
    const state = toggleLens(applyPreset('hints'), 'mainLine', true);
    saveLenses(state, s);
    expect(loadLenses(s)).toEqual(state);
  });

  it('migrates the old standalone coach/hints settings', () => {
    const s = memoryStorage({ mancala_tutor_mode: 'false', mancala_show_hints: 'true' });
    const loaded = loadLenses(s);
    expect(loaded.coach).toBe(false);
    expect(loaded.bestMoveMarks).toBe(true);
  });

  it('survives corrupt storage', () => {
    const s = memoryStorage({ mancala_lenses_v1: '{not json' });
    expect(() => loadLenses(s)).not.toThrow();
  });
});
