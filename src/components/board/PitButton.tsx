import React, { useRef, useEffect, useState } from 'react';
import { EvaluatedMove, MoveSimulationResult } from '../../engine';
import { AnimatingState, TutorWarning } from '../../game/gameTypes';
import { SkinTheme } from '../../theme';
import { PebbleCluster } from '../../Pebble';
import { getPitHighlight, getHighlightStyle } from './highlights';
import { getPitAriaLabel } from '../../lib/a11y';
import { useTranslation } from '../../i18n';

interface PitButtonProps {
  pitIndex: number;
  label: string;
  stones: number;
  isLegal: boolean;
  evalData?: EvaluatedMove;
  showHints: boolean;
  showThreats?: boolean;
  animatingState: AnimatingState | null;
  lastMovedPit: number | null;
  hoverPreview: MoveSimulationResult | null;
  tutorWarning: TutorWarning | null;
  gameMode: string;
  player: 'p1' | 'p2';
  currentSkin: SkinTheme;
  theme: any;
  onClick: () => void;
  onHover: () => void;
  onLeave: () => void;
  onSandboxAdjust: (delta: number) => void;
  bigMode?: boolean;
  tapTwice?: boolean;
  isCurrentTurn?: boolean;
  onKeyDown?: (e: React.KeyboardEvent) => void;
}

export const PitButton: React.FC<PitButtonProps> = ({
  pitIndex,
  label,
  stones,
  isLegal,
  evalData,
  showHints,
  showThreats = false,
  animatingState,
  lastMovedPit,
  hoverPreview,
  tutorWarning,
  gameMode,
  player,
  currentSkin,
  theme,
  onClick,
  onHover,
  onLeave,
  onSandboxAdjust,
  bigMode = false,
  tapTwice = false,
  isCurrentTurn = true,
  onKeyDown
}) => {
  const { t } = useTranslation();
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const didLongPressFireRef = useRef(false);
  const armedRef = useRef(false);

  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    };
  }, []);

  // 350ms touch long-press preview with cancel on scroll (>10px) or touch end
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isLegal) return;
    const touch = e.touches[0];
    touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };
    didLongPressFireRef.current = false;

    longPressTimerRef.current = setTimeout(() => {
      didLongPressFireRef.current = true;
      onHover();
    }, 350);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartPosRef.current) return;
    const touch = e.touches[0];
    const dx = Math.abs(touch.clientX - touchStartPosRef.current.x);
    const dy = Math.abs(touch.clientY - touchStartPosRef.current.y);

    if (dx > 10 || dy > 10) {
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
      if (didLongPressFireRef.current) onLeave();
      armedRef.current = false;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);

    if (didLongPressFireRef.current) {
      e.preventDefault();
      onLeave();
      armedRef.current = false;
      return;
    }

    if (!isLegal) return;

    if (tapTwice) {
      e.preventDefault();
      if ((hoverPreview && hoverPreview.pit === pitIndex) || armedRef.current) {
        armedRef.current = false;
        onLeave();
        onClick();
      } else {
        armedRef.current = true;
        onHover();
      }
    } else {
      e.preventDefault();
      onLeave();
      onClick();
    }
  };

  const handleTouchCancel = () => {
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    armedRef.current = false;
    onLeave();
  };

  // Evaluate single highlight state with strict precedence
  const isBestMove = Boolean(showHints && evalData && evalData.rank === 1);
  const isOpponentThreat = Boolean(tutorWarning?.explanation?.opponentThreatPit === pitIndex);

  const highlightKind = getPitHighlight({
    pitIndex,
    currentPlayer: player === 'p1' ? 0 : 1,
    isLegal,
    isGameOver: false,
    isAnimating: Boolean(animatingState),
    previewSourcePit: hoverPreview ? hoverPreview.pit : null,
    previewLandingPit: hoverPreview ? hoverPreview.lastLanding : null,
    previewCapturedPit: hoverPreview ? hoverPreview.capturedFromPit : null,
    showBestMove: showHints,
    showThreats,
    isBestMove,
    isOpponentThreat,
    lastMovedPit,
    isLastMoveActive: Boolean(lastMovedPit === pitIndex && !animatingState)
  });

  const highlightStyle = getHighlightStyle(highlightKind, currentSkin);

  const ariaLabel = getPitAriaLabel(
    pitIndex,
    stones,
    isLegal,
    isBestMove,
    player,
    isCurrentTurn,
    tapTwice,
    t
  );

  return (
    <button
      data-testid={`pit-${pitIndex}`}
      aria-label={ariaLabel}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onClick={onClick}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
      className={`relative flex flex-col items-center justify-between p-1 sm:p-2 rounded-xl sm:rounded-2xl transition-all duration-150 select-none touch-manipulation border ${theme.pitBg} ${theme.pitBorder} ${theme.pitShadowClass} ${
        bigMode ? 'min-h-[56px] min-w-[56px] h-28 sm:h-40' : 'min-h-[50px] min-w-[44px] h-24 sm:h-36'
      } ${
        isLegal
          ? `cursor-pointer ${theme.pitHoverBorder} hover:scale-[1.02] active:scale-95 focus:outline-hidden focus:ring-2 focus:ring-yellow-400`
          : 'cursor-default opacity-85 focus:outline-hidden'
      } ${highlightStyle.ringClass}`}
    >
      {/* Pit Header & Single Highlight Badge */}
      <div className={`flex items-center justify-between w-full text-xs font-mono ${theme.cardTextMuted}`}>
        <span className="font-bold">{label}</span>

        {highlightStyle.badge && (
          <span
            className={`px-1.5 py-0.5 rounded text-xs font-extrabold border ${highlightStyle.badge.color}`}
          >
            {highlightStyle.badge.text}
          </span>
        )}
      </div>

      {/* Tactile Pebble Mound */}
      <PebbleCluster count={stones} theme={currentSkin} player={player} />

      {/* Etched Count Numerals (Guaranteed >= 12px at scale M) */}
      <div
        data-testid={`pit-count-${pitIndex}`}
        className={`text-xs sm:text-base font-mono font-extrabold px-1.5 py-0.5 rounded-lg border ${theme.pitCountBg} ${theme.pitCountText}`}
      >
        {stones}
      </div>

      {/* Sandbox manual adjustments */}
      {gameMode === 'sandbox' && (
        <div className={`absolute ${player === 'p2' ? '-top-2' : '-bottom-2'} flex gap-1 z-20`}>
          <button
            data-testid={`sandbox-minus-${pitIndex}`}
            onClick={(e) => {
              e.stopPropagation();
              onSandboxAdjust(-1);
            }}
            className="w-5 h-5 bg-rose-600 rounded text-xs flex items-center justify-center text-white font-bold"
            aria-label={`Subtract stone from pit ${pitIndex}`}
          >
            -
          </button>
          <button
            data-testid={`sandbox-plus-${pitIndex}`}
            onClick={(e) => {
              e.stopPropagation();
              onSandboxAdjust(1);
            }}
            className="w-5 h-5 bg-emerald-600 rounded text-xs flex items-center justify-center text-white font-bold"
            aria-label={`Add stone to pit ${pitIndex}`}
          >
            +
          </button>
        </div>
      )}
    </button>
  );
};
