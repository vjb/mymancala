import { describe, it, expect } from 'vitest';
import { en } from './en';
import { ar } from './ar';
import { es } from './es';
import { GLOSSARY } from './glossary';
import { formatTranslation } from './i18nContext';

describe('i18n catalogs and translation engine', () => {
  it('ensures exact 1:1 key parity between en, ar, and es', () => {
    const enKeys = Object.keys(en).sort();
    const arKeys = Object.keys(ar).sort();
    const esKeys = Object.keys(es).sort();

    expect(arKeys).toEqual(enKeys);
    expect(esKeys).toEqual(enKeys);
  });

  it('contains valid non-empty translation strings across all keys in all languages', () => {
    for (const key of Object.keys(en) as (keyof typeof en)[]) {
      expect(en[key].trim().length).toBeGreaterThan(0);
      expect(ar[key].trim().length).toBeGreaterThan(0);
      expect(es[key].trim().length).toBeGreaterThan(0);
    }
  });

  it('contains 10 calm tactical glossary definitions', () => {
    const entries = Object.values(GLOSSARY);
    expect(entries.length).toBeGreaterThanOrEqual(10);
    for (const entry of entries) {
      expect(entry.term).toBeDefined();
      expect(entry.definition.length).toBeGreaterThan(10);
      expect(entry.mancalaExample.length).toBeGreaterThan(10);
    }
  });
});

describe('Arabic CLDR plural categories (Intl.PluralRules)', () => {
  const pluralRulesAr = new Intl.PluralRules('ar');

  it('selects "zero" for count 0', () => {
    expect(pluralRulesAr.select(0)).toBe('zero');
    const res = formatTranslation('ar', 'board.stones', { count: 0 });
    expect(res).toContain('حجر');
  });

  it('selects "one" for count 1', () => {
    expect(pluralRulesAr.select(1)).toBe('one');
    const res = formatTranslation('ar', 'board.stones', { count: 1 });
    expect(res).toBe('حجر واحد');
  });

  it('selects "two" for count 2', () => {
    expect(pluralRulesAr.select(2)).toBe('two');
    const res = formatTranslation('ar', 'board.stones', { count: 2 });
    expect(res).toBe('حجران');
  });

  it('selects "few" for counts 3..10 and counts ending in 3..10 (mod 100)', () => {
    const fewCounts = [3, 4, 7, 10, 103, 108, 110];
    for (const count of fewCounts) {
      expect(pluralRulesAr.select(count)).toBe('few');
      const res = formatTranslation('ar', 'board.stones', { count });
      expect(res).toContain('أحجار');
    }
  });

  it('selects "many" for counts 11..99 and counts ending in 11..99 (mod 100)', () => {
    const manyCounts = [11, 12, 25, 48, 99, 111, 148, 199];
    for (const count of manyCounts) {
      expect(pluralRulesAr.select(count)).toBe('many');
      const res = formatTranslation('ar', 'board.stones', { count });
      expect(res).toContain('حجراً');
    }
  });

  it('selects "other" for counts 100, 101, 102, 200, 300, 1000', () => {
    const otherCounts = [100, 101, 102, 200, 300, 1000];
    for (const count of otherCounts) {
      expect(pluralRulesAr.select(count)).toBe('other');
      const res = formatTranslation('ar', 'board.stones', { count });
      expect(res).toContain('حجر');
    }
  });
});

describe('English and Spanish plural category selection', () => {
  it('formats English singular and plural correctly', () => {
    expect(formatTranslation('en', 'board.stones', { count: 1 })).toBe('1 stone');
    expect(formatTranslation('en', 'board.stones', { count: 0 })).toBe('0 stones');
    expect(formatTranslation('en', 'board.stones', { count: 48 })).toBe('48 stones');
  });

  it('formats Spanish singular and plural correctly', () => {
    expect(formatTranslation('es', 'board.stones', { count: 1 })).toBe('1 piedra');
    expect(formatTranslation('es', 'board.stones', { count: 0 })).toBe('0 piedras');
    expect(formatTranslation('es', 'board.stones', { count: 48 })).toBe('48 piedras');
  });
});
