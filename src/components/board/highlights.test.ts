import { describe, it, expect } from 'vitest';
import { getPitHighlight, getHighlightStyle, PitHighlightContext } from './highlights';

describe('highlights precedence', () => {
  const baseCtx: PitHighlightContext = {
    pitIndex: 2,
    currentPlayer: 0,
    isLegal: true,
    isGameOver: false,
    isAnimating: false,
    previewSourcePit: null,
    previewLandingPit: null,
    previewCapturedPit: null,
    showBestMove: false,
    showThreats: false,
    isBestMove: false,
    isOpponentThreat: false,
    lastMovedPit: null,
    isLastMoveActive: false
  };

  it('assigns playable when pit is legal and no higher priority exists', () => {
    expect(getPitHighlight(baseCtx)).toBe('playable');
  });

  it('assigns threat when showThreats and isOpponentThreat', () => {
    const ctx = { ...baseCtx, showThreats: true, isOpponentThreat: true };
    expect(getPitHighlight(ctx)).toBe('threat');
  });

  it('assigns lastMove over threat and playable', () => {
    const ctx = {
      ...baseCtx,
      showThreats: true,
      isOpponentThreat: true,
      lastMovedPit: 2,
      isLastMoveActive: true
    };
    expect(getPitHighlight(ctx)).toBe('lastMove');
  });

  it('assigns best over lastMove, threat, and playable', () => {
    const ctx = {
      ...baseCtx,
      showBestMove: true,
      isBestMove: true,
      showThreats: true,
      isOpponentThreat: true,
      lastMovedPit: 2,
      isLastMoveActive: true
    };
    expect(getPitHighlight(ctx)).toBe('best');
  });

  it('assigns preview over best move and all others', () => {
    const ctx = {
      ...baseCtx,
      previewSourcePit: 2,
      showBestMove: true,
      isBestMove: true
    };
    expect(getPitHighlight(ctx)).toBe('preview');
  });

  it('assigns landing to destination pit during preview', () => {
    const ctx = {
      ...baseCtx,
      pitIndex: 4,
      previewSourcePit: 2,
      previewLandingPit: 4
    };
    expect(getPitHighlight(ctx)).toBe('landing');
  });

  it('assigns captured to captured pit during preview', () => {
    const ctx = {
      ...baseCtx,
      pitIndex: 10,
      previewSourcePit: 2,
      previewLandingPit: 2,
      previewCapturedPit: 10
    };
    expect(getPitHighlight(ctx)).toBe('captured');
  });

  it('suppresses static highlights when isAnimating is true', () => {
    const ctx = {
      ...baseCtx,
      isAnimating: true,
      showBestMove: true,
      isBestMove: true
    };
    expect(getPitHighlight(ctx)).toBe('none');
  });

  it('returns high-contrast styles with AAA compliant badges', () => {
    const style = getHighlightStyle('best', 'high-contrast');
    expect(style.ringClass).toContain('yellow');
    expect(style.badge).not.toBeNull();
    expect(style.badge?.text).toContain('BEST');
  });
});
