import { describe, it, expect } from 'vitest';
import { getPitHighlight, getHighlightStyle, HighlightKind, PitHighlightContext } from './components/board/highlights';
import {
  PRESETS,
  PRESET_ORDER,
  applyPreset,
  detectPreset,
  toggleLens,
  attachLegacyAliases,
  loadLenses,
  saveLenses,
  LensState,
  PresetId
} from './lenses';
import { en } from './i18n/en';
import { ar } from './i18n/ar';
import { es } from './i18n/es';
import { TranslationKey } from './i18n/types';

describe('M1 Adversarial Challenge 1: Highlight Precedence & Visual Invariants', () => {
  it('strictly enforces single highlight role across exhaustive combinatoric state permutations', () => {
    const booleanOptions = [false, true];
    const pitIndices = [0, 2, 5, 6, 9, 13];

    let permutationsTested = 0;

    for (const pitIndex of pitIndices) {
      for (const currentPlayer of [0, 1]) {
        for (const isLegal of booleanOptions) {
          for (const isGameOver of booleanOptions) {
            for (const isAnimating of booleanOptions) {
              for (const isBestMove of booleanOptions) {
                for (const showBestMove of booleanOptions) {
                  for (const isOpponentThreat of booleanOptions) {
                    for (const showThreats of booleanOptions) {
                      for (const isLastMoveActive of booleanOptions) {
                        for (const lastMovedMatches of booleanOptions) {
                          for (const previewRole of ['none', 'source', 'landing', 'captured', 'other'] as const) {
                            permutationsTested++;

                            const ctx: PitHighlightContext = {
                              pitIndex,
                              currentPlayer,
                              isLegal,
                              isGameOver,
                              isAnimating,
                              previewSourcePit: previewRole === 'none' ? null : (previewRole === 'source' ? pitIndex : 1),
                              previewLandingPit: previewRole === 'landing' ? pitIndex : 3,
                              previewCapturedPit: previewRole === 'captured' ? pitIndex : 8,
                              showBestMove,
                              showThreats,
                              isBestMove,
                              isOpponentThreat,
                              lastMovedPit: lastMovedMatches ? pitIndex : 99,
                              isLastMoveActive
                            };

                            const highlight = getPitHighlight(ctx);

                            // Invariant 1: Result is always a valid HighlightKind
                            expect([
                              'none',
                              'playable',
                              'preview',
                              'landing',
                              'captured',
                              'best',
                              'threat',
                              'lastMove'
                            ]).toContain(highlight);

                            // Invariant 2: Animation suppresses all highlights
                            if (isAnimating) {
                              expect(highlight).toBe('none');
                              continue;
                            }

                            // Invariant 3: Active preview takes absolute precedence over all other cues
                            if (ctx.previewSourcePit !== null) {
                              if (pitIndex === ctx.previewSourcePit) {
                                expect(highlight).toBe('preview');
                              } else if (pitIndex === ctx.previewLandingPit) {
                                expect(highlight).toBe('landing');
                              } else if (pitIndex === ctx.previewCapturedPit) {
                                expect(highlight).toBe('captured');
                              } else {
                                expect(highlight).toBe('none');
                              }
                              continue;
                            }

                            // Invariant 4: Best move takes precedence over lastMove, threat, and playable
                            if (showBestMove && isBestMove && !isGameOver) {
                              expect(highlight).toBe('best');
                              continue;
                            }

                            // Invariant 5: Last move takes precedence over threat and playable
                            if (lastMovedMatches && isLastMoveActive && !isGameOver) {
                              expect(highlight).toBe('lastMove');
                              continue;
                            }

                            // Invariant 6: Threat takes precedence over playable
                            if (showThreats && isOpponentThreat && !isGameOver) {
                              expect(highlight).toBe('threat');
                              continue;
                            }

                            // Invariant 7: Playable only when legal and not game over
                            if (isLegal && !isGameOver) {
                              expect(highlight).toBe('playable');
                              continue;
                            }

                            // Default fallback
                            expect(highlight).toBe('none');
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }

    expect(permutationsTested).toBeGreaterThan(10000);
  });

  it('guarantees no pit ever receives conflicting visual badges in any skin', () => {
    const kinds: HighlightKind[] = ['none', 'playable', 'preview', 'landing', 'captured', 'best', 'threat', 'lastMove'];
    const skins = ['walnut', 'porcelain', 'obsidian', 'high-contrast'];

    for (const skin of skins) {
      for (const kind of kinds) {
        const style = getHighlightStyle(kind, skin);

        // At most one badge object is returned
        if (style.badge) {
          expect(typeof style.badge.text).toBe('string');
          expect(style.badge.text.length).toBeGreaterThan(0);
          expect(typeof style.badge.color).toBe('string');
        } else {
          expect(style.badge).toBeNull();
        }

        // Playable and preview must never show text badges (ring-only)
        if (kind === 'playable' || kind === 'preview' || kind === 'none') {
          expect(style.badge).toBeNull();
        }
      }
    }
  });

  it('handles edge case where preview source pit equals landing pit (sowing loop around board)', () => {
    const ctx: PitHighlightContext = {
      pitIndex: 2,
      currentPlayer: 0,
      isLegal: true,
      isGameOver: false,
      isAnimating: false,
      previewSourcePit: 2,
      previewLandingPit: 2, // 13 stones sowed in Kalah lands back in origin pit!
      previewCapturedPit: null,
      showBestMove: true,
      isBestMove: true,
      showThreats: true,
      isOpponentThreat: true,
      lastMovedPit: 2,
      isLastMoveActive: true
    };

    // Source pit precedence resolves to 'preview' without collision
    const highlight = getPitHighlight(ctx);
    expect(highlight).toBe('preview');
  });

  it('handles game-over state: suppresses best, lastMove, threat, and playable highlights', () => {
    const ctx: PitHighlightContext = {
      pitIndex: 2,
      currentPlayer: 0,
      isLegal: true,
      isGameOver: true,
      isAnimating: false,
      previewSourcePit: null,
      previewLandingPit: null,
      previewCapturedPit: null,
      showBestMove: true,
      isBestMove: true,
      showThreats: true,
      isOpponentThreat: true,
      lastMovedPit: 2,
      isLastMoveActive: true
    };

    expect(getPitHighlight(ctx)).toBe('none');
  });
});

describe('M1 Adversarial Challenge 2: Lens Toggling, Presets & Legacy Aliases', () => {
  it('rapidly toggles all 4 presets and preserves invariant specifications', () => {
    const sequence: PresetId[] = [
      'justPlay', 'hints', 'coach', 'full',
      'justPlay', 'full', 'coach', 'hints',
      'justPlay', 'coach', 'justPlay', 'full'
    ];

    for (const preset of sequence) {
      const state = applyPreset(preset);
      expect(detectPreset(state)).toBe(preset);

      if (preset === 'justPlay') {
        expect(state.evalBar).toBe(false);
        expect(state.bestMoveHighlight).toBe(false);
        expect(state.threatPits).toBe(false);
        expect(state.landingPreview).toBe(false);
        expect(state.principalVariation).toBe(false);
        expect(state.explanations).toBe(false);
        expect(state.errorRate).toBe(false);

        // Legacy aliases must all be false
        expect(state.advantageBar).toBe(false);
        expect(state.bestMoveMarks).toBe(false);
        expect(state.mainLine).toBe(false);
        expect(state.coach).toBe(false);
        expect(state.winPercent).toBe(false);
      } else if (preset === 'full') {
        expect(state.evalBar).toBe(true);
        expect(state.bestMoveHighlight).toBe(true);
        expect(state.threatPits).toBe(true);
        expect(state.landingPreview).toBe(true);
        expect(state.principalVariation).toBe(true);
        expect(state.explanations).toBe(true);
        expect(state.errorRate).toBe(true);

        expect(state.advantageBar).toBe(true);
        expect(state.bestMoveMarks).toBe(true);
        expect(state.mainLine).toBe(true);
        expect(state.coach).toBe(true);
        expect(state.winPercent).toBe(true);
      }
    }
  });

  it('keeps legacy aliases synchronized when toggled individually', () => {
    let state = applyPreset('justPlay');

    // Toggle advantageBar -> evalBar should become true
    state = toggleLens(state, 'advantageBar', true);
    expect(state.evalBar).toBe(true);
    expect(state.advantageBar).toBe(true);
    expect(state.winPercent).toBe(true);

    // Toggle bestMoveMarks -> bestMoveHighlight should become true
    state = toggleLens(state, 'bestMoveMarks', true);
    expect(state.bestMoveHighlight).toBe(true);
    expect(state.bestMoveMarks).toBe(true);

    // Toggle mainLine -> principalVariation should become true
    state = toggleLens(state, 'mainLine', true);
    expect(state.principalVariation).toBe(true);
    expect(state.mainLine).toBe(true);

    // Toggle coach -> explanations should become true
    state = toggleLens(state, 'coach', true);
    expect(state.explanations).toBe(true);
    expect(state.coach).toBe(true);

    // Toggle canonical lens directly -> legacy alias should reflect it
    state = toggleLens(state, 'evalBar', false);
    expect(state.evalBar).toBe(false);
    expect(state.advantageBar).toBe(false);
    expect(state.winPercent).toBe(false);

    state = toggleLens(state, 'bestMoveHighlight', false);
    expect(state.bestMoveHighlight).toBe(false);
    expect(state.bestMoveMarks).toBe(false);
  });

  it('preserves legacy aliases across localStorage serialization and deserialization', () => {
    const memoryStore: Record<string, string> = {};
    const mockStorage = {
      getItem: (key: string) => memoryStore[key] || null,
      setItem: (key: string, value: string) => { memoryStore[key] = value; }
    };

    const initial = applyPreset('hints');
    saveLenses(initial, mockStorage);

    const loaded = loadLenses(mockStorage);
    expect(loaded.bestMoveMarks).toBe(true);
    expect(loaded.bestMoveHighlight).toBe(true);
    expect(loaded.mainLine).toBe(true);
    expect(loaded.principalVariation).toBe(true);
    expect(loaded.advantageBar).toBe(false);
    expect(loaded.evalBar).toBe(false);
  });

  it('demonstrates legacy alias loss if state is cloned via spread operator without attachLegacyAliases', () => {
    const state = applyPreset('full');
    expect(state.advantageBar).toBe(true);

    // Spread operator does not copy non-enumerable getters
    const shallowCopy = { ...state };
    expect(shallowCopy.advantageBar).toBeUndefined();

    // But calling attachLegacyAliases restores them
    const fixedCopy = attachLegacyAliases(shallowCopy);
    expect(fixedCopy.advantageBar).toBe(true);
  });
});

describe('M1 Adversarial Challenge 3: i18n Pluralization, 6 Arabic Categories & Fallbacks', () => {
  // Pure replication of t() resolver from i18nContext.tsx for unit stress testing
  function createTranslator(locale: 'en' | 'ar' | 'es') {
    const CATALOGS = { en, ar, es };
    const catalog = CATALOGS[locale];

    return (key: string, params?: Record<string, any>): string => {
      let template: string | undefined;

      if (params && typeof params.count === 'number') {
        try {
          const pluralRules = new Intl.PluralRules(locale);
          const category = pluralRules.select(params.count);
          const pluralKey = `${key}_${category}` as TranslationKey;
          const fallbackPlural = `${key}_other` as TranslationKey;
          template = catalog[pluralKey] || catalog[fallbackPlural] || catalog[key as TranslationKey] || en[pluralKey] || en[fallbackPlural];
        } catch {
          template = catalog[key as TranslationKey];
        }
      }

      if (!template) {
        template = catalog[key as TranslationKey] || en[key as TranslationKey] || key;
      }

      if (!params) return template;

      const numFormatter = new Intl.NumberFormat(locale);
      return template.replace(/{(\w+)}/g, (match, paramName) => {
        if (paramName in params) {
          const val = params[paramName];
          return typeof val === 'number' ? numFormatter.format(val) : String(val);
        }
        return match;
      });
    };
  }

  it('handles all 6 Arabic plural categories across boundary counts (0, 1, 2, 3..10, 11..99, 100+)', () => {
    const tAr = createTranslator('ar');
    const pluralRulesAr = new Intl.PluralRules('ar');

    // Verification of categories according to CLDR Arabic Plural Rules:
    // zero: 0
    expect(pluralRulesAr.select(0)).toBe('zero');
    const zeroResult = tAr('board.stones', { count: 0 });
    expect(zeroResult).toContain('حجر');

    // one: 1
    expect(pluralRulesAr.select(1)).toBe('one');
    const oneResult = tAr('board.stones', { count: 1 });
    expect(oneResult).toBe('حجر واحد');

    // two: 2
    expect(pluralRulesAr.select(2)).toBe('two');
    const twoResult = tAr('board.stones', { count: 2 });
    expect(twoResult).toBe('حجران');

    // few: 3..10, 103..110
    const fewCounts = [3, 4, 7, 10, 103, 108, 110];
    for (const count of fewCounts) {
      expect(pluralRulesAr.select(count)).toBe('few');
      const res = tAr('board.stones', { count });
      expect(res).toContain('أحجار');
    }

    // many: 11..99, 111..199
    const manyCounts = [11, 12, 25, 48, 99, 111, 199];
    for (const count of manyCounts) {
      expect(pluralRulesAr.select(count)).toBe('many');
      const res = tAr('board.stones', { count });
      expect(res).toContain('حجراً');
    }

    // other: 100, 101, 102, 200, 300, 1000
    const otherCounts = [100, 101, 102, 200, 1000];
    for (const count of otherCounts) {
      expect(pluralRulesAr.select(count)).toBe('other');
      const res = tAr('board.stones', { count });
      expect(res).toContain('حجر');
    }
  });

  it('gracefully handles missing translation keys without throwing errors', () => {
    const tEn = createTranslator('en');
    const tAr = createTranslator('ar');
    const tEs = createTranslator('es');

    expect(tEn('completely.missing.key')).toBe('completely.missing.key');
    expect(tAr('non.existent.path', { count: 5 })).toBe('non.existent.path');
    expect(tEs('undefined_token', { foo: 'bar' })).toBe('undefined_token');
  });

  it('gracefully handles malformed or hostile parameters without uncaught exceptions', () => {
    const tEn = createTranslator('en');
    const tAr = createTranslator('ar');

    // NaN count
    expect(() => tEn('board.stones', { count: NaN })).not.toThrow();
    // Infinity count
    expect(() => tAr('board.stones', { count: Infinity })).not.toThrow();
    // Negative count
    expect(() => tAr('board.stones', { count: -10 })).not.toThrow();
    // Null value
    expect(() => tEn('board.pitLabel', { n: null })).not.toThrow();
    expect(tEn('board.pitLabel', { n: null })).toBe('Pit null');
    // Undefined value
    expect(() => tEn('board.pitLabel', { n: undefined })).not.toThrow();
    expect(tEn('board.pitLabel', { n: undefined })).toBe('Pit undefined');
    // Object value
    expect(() => tEn('board.pitLabel', { n: { foo: 'bar' } })).not.toThrow();
  });
});
