import React from 'react';
import { AnimatingState } from '../../game/gameTypes';
import { MoveSimulationResult } from '../../engine';
import { SkinTheme } from '../../theme';
import { PebbleCluster } from '../../Pebble';
import { useTranslation } from '../../i18n';

interface StorePitProps {
  storeIndex: number; // 6 or 13
  title: string;
  label: 'P1' | 'P2';
  player: 'p1' | 'p2';
  stones: number;
  animatingState: AnimatingState | null;
  hoverPreview: MoveSimulationResult | null;
  gameMode: string;
  currentSkin: SkinTheme;
  theme: any;
  onSandboxAdjust: (delta: number) => void;
  bigMode?: boolean;
}

export const StorePit: React.FC<StorePitProps> = ({
  storeIndex,
  title,
  label,
  player,
  stones,
  animatingState,
  hoverPreview,
  gameMode,
  currentSkin,
  theme,
  onSandboxAdjust,
  bigMode = false
}) => {
  const isP1 = player === 'p1';
  const playerNum = isP1 ? 0 : 1;
  const storeText = isP1 ? theme.storeP1Text : theme.storeP2Text;

  const isSown = animatingState?.currentPit === storeIndex && animatingState.phase === 'sow';
  const isCaptured = animatingState?.phase === 'capture' && animatingState.player === playerNum;
  const isLanding = hoverPreview?.lastLanding === storeIndex;
  const isPath = hoverPreview?.path?.includes(storeIndex);

  const { t } = useTranslation();
  const ariaLabel = `${title}, ${t ? t('board.stones', { count: stones }) : (stones === 1 ? '1 stone' : `${stones} stones`)} banked.`;

  return (
    <div
      role="status"
      aria-label={ariaLabel}
      data-testid={`store-${storeIndex}`}
      title={title}
      className={`${bigMode ? 'w-14 sm:w-28 lg:w-32' : 'w-12 sm:w-24 lg:w-28'} h-60 sm:h-84 lg:h-96 rounded-3xl sm:rounded-4xl border-2 flex flex-col items-center justify-between p-1.5 sm:p-3 select-none shrink-0 transition-all duration-200 shadow-inner ${theme.storeBg} ${theme.storeBorder} ${theme.pitShadowClass} ${
        isSown
          ? isP1
            ? 'ring-2 ring-amber-400 bg-amber-950/70 scale-[1.03] shadow-[0_0_24px_rgba(251,191,36,0.7)] animate-drop-ripple'
            : 'ring-2 ring-emerald-400 bg-emerald-950/70 scale-[1.03] shadow-[0_0_24px_rgba(52,211,153,0.7)] animate-drop-ripple'
          : isCaptured
          ? 'ring-2 ring-amber-400 bg-amber-950/70 scale-[1.03] shadow-[0_0_24px_rgba(251,191,36,0.7)] animate-pulse'
          : isLanding
          ? theme.landingGlow
          : isPath
          ? theme.pathGlow
          : ''
      }`}
    >
      <div className={`text-xs sm:text-sm font-extrabold uppercase tracking-wider ${storeText}`}>
        {label}
      </div>

      <div className="flex-1 flex items-center justify-center w-full px-0.5">
        <PebbleCluster count={stones} theme={currentSkin} player={player} maxVisible={14} />
      </div>

      <div className={`text-lg sm:text-2xl lg:text-3xl font-black font-mono ${storeText}`}>
        {stones}
      </div>

      {gameMode === 'sandbox' && (
        <div className="flex gap-1 mt-1">
          <button
            onClick={() => onSandboxAdjust(-1)}
            aria-label={`Subtract stone from store ${storeIndex}`}
            className="w-5 h-5 bg-rose-600 rounded text-xs flex items-center justify-center text-white font-bold"
          >
            -
          </button>
          <button
            onClick={() => onSandboxAdjust(1)}
            aria-label={`Add stone to store ${storeIndex}`}
            className="w-5 h-5 bg-emerald-600 rounded text-xs flex items-center justify-center text-white font-bold"
          >
            +
          </button>
        </div>
      )}
    </div>
  );
};
