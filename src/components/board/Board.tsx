import React, { useCallback } from 'react';
import { P1_STORE, P2_STORE, EvaluatedMove, MoveSimulationResult } from '../../engine';
import { kalahRuleSet } from '../../rules';
import { AnimatingState, TutorWarning } from '../../game/gameTypes';
import { SkinTheme } from '../../theme';
import { PitButton } from './PitButton';
import { StorePit } from './StorePit';
import { getNextPitOnArrowKey } from '../../lib/a11y';
import { useTranslation } from '../../i18n';

interface BoardProps {
  displayBoard: number[];
  currentPlayer: number;
  isGameOver: boolean;
  animatingState: AnimatingState | null;
  isMoveLocked: React.MutableRefObject<boolean>;
  analysisResults: EvaluatedMove[];
  showHints: boolean;
  showThreats?: boolean;
  hoverPreview: MoveSimulationResult | null;
  hoveredPit: number | null;
  setHoveredPit: (pit: number | null) => void;
  tutorWarning: TutorWarning | null;
  lastMovedPit: number | null;
  gameMode: string;
  onPitClick: (pit: number) => void;
  onSandboxAdjust: (pitIndex: number, delta: number) => void;
  theme: any;
  currentSkin: SkinTheme;
  bigMode?: boolean;
  tapTwice?: boolean;
}

export const Board: React.FC<BoardProps> = ({
  displayBoard,
  currentPlayer,
  isGameOver,
  animatingState,
  isMoveLocked,
  analysisResults,
  showHints,
  showThreats = false,
  hoverPreview,
  hoveredPit,
  setHoveredPit,
  tutorWarning,
  lastMovedPit,
  gameMode,
  onPitClick,
  onSandboxAdjust,
  theme,
  currentSkin,
  bigMode = false,
  tapTwice = false
}) => {
  const { t } = useTranslation();
  const northPits = [12, 11, 10, 9, 8, 7];
  const southPits = [0, 1, 2, 3, 4, 5];

  const handlePitKeyDown = useCallback((currentPit: number, e: React.KeyboardEvent) => {
    const nextPit = getNextPitOnArrowKey(currentPit, e.key);
    if (nextPit !== null) {
      e.preventDefault();
      const targetBtn = document.querySelector<HTMLButtonElement>(`[data-testid="pit-${nextPit}"]`);
      if (targetBtn) targetBtn.focus();
    }
  }, []);

  return (
    /* CRITICAL: Explicit dir="ltr" ensures the physical board layout NEVER mirrors in RTL locales! */
    <div
      dir="ltr"
      className={`relative p-2.5 sm:p-5 rounded-3xl sm:rounded-4xl border-2 sm:border-4 shadow-2xl transition-all duration-300 ${theme.boardBg} ${theme.boardBorder} w-full overflow-hidden`}
    >
      {/* Inlay Trim */}
      <div className={`absolute inset-1 sm:inset-2 border ${theme.boardTrim} rounded-xl sm:rounded-2xl pointer-events-none`} />

      <div className="relative flex items-center justify-between gap-1.5 sm:gap-3">
        {/* Left Store: Player 2 (North) */}
        <StorePit
          storeIndex={P2_STORE}
          title={t('board.p2Store')}
          label="P2"
          player="p2"
          stones={displayBoard[P2_STORE]}
          animatingState={animatingState}
          hoverPreview={hoverPreview}
          gameMode={gameMode}
          currentSkin={currentSkin}
          theme={theme}
          onSandboxAdjust={(delta) => onSandboxAdjust(P2_STORE, delta)}
          bigMode={bigMode}
        />

        {/* Center Playable Pits */}
        <div className="flex-1 flex flex-col gap-2 sm:gap-3.5 min-w-0">
          {/* North Row (Indices 12 down to 7) */}
          <div className="grid grid-cols-6 gap-1 sm:gap-2.5">
            {northPits.map((pitIndex) => {
              const stones = displayBoard[pitIndex];
              const isLegal = currentPlayer === 1 && stones > 0 && !isGameOver && !animatingState && !isMoveLocked.current;
              const evalData = analysisResults.find(m => m.pit === pitIndex);
              const labelText = `P${kalahRuleSet.layout.label(pitIndex).replace('Pit ', '')}`;

              return (
                <PitButton
                  key={pitIndex}
                  pitIndex={pitIndex}
                  label={labelText}
                  stones={stones}
                  isLegal={isLegal}
                  evalData={evalData}
                  showHints={showHints}
                  showThreats={showThreats}
                  animatingState={animatingState}
                  lastMovedPit={lastMovedPit}
                  hoverPreview={hoverPreview}
                  tutorWarning={tutorWarning}
                  gameMode={gameMode}
                  player="p2"
                  currentSkin={currentSkin}
                  theme={theme}
                  bigMode={bigMode}
                  tapTwice={tapTwice}
                  isCurrentTurn={currentPlayer === 1}
                  onKeyDown={(e) => handlePitKeyDown(pitIndex, e)}
                  onClick={() => {
                    if (gameMode === 'sandbox') onSandboxAdjust(pitIndex, 1);
                    else if (isLegal) onPitClick(pitIndex);
                  }}
                  onHover={() => !animatingState && setHoveredPit(pitIndex)}
                  onLeave={() => setHoveredPit(null)}
                  onSandboxAdjust={(delta) => onSandboxAdjust(pitIndex, delta)}
                />
              );
            })}
          </div>

          {/* Center Inlay & Dynamic Flow Indicator */}
          <div className="flex items-center justify-between px-3 py-1 text-xs font-mono font-semibold min-h-[22px]">
            {hoverPreview ? (
              <>
                <span className="text-amber-400/90 animate-pulse">{t('board.ccwFlow')}</span>
                <span className="text-emerald-400/90 animate-pulse">{t('board.ownStorePoints')}</span>
              </>
            ) : (
              <div className="w-full flex items-center justify-center opacity-25">
                <div className="h-px w-32 bg-gradient-to-r from-transparent via-current to-transparent" />
              </div>
            )}
          </div>

          {/* South Row (Indices 0 to 5) */}
          <div className="grid grid-cols-6 gap-1 sm:gap-2.5">
            {southPits.map((pitIndex) => {
              const stones = displayBoard[pitIndex];
              const isLegal = currentPlayer === 0 && stones > 0 && !isGameOver && !animatingState && !isMoveLocked.current;
              const evalData = analysisResults.find(m => m.pit === pitIndex);
              const labelText = `P${kalahRuleSet.layout.label(pitIndex).replace('Pit ', '')}`;

              return (
                <PitButton
                  key={pitIndex}
                  pitIndex={pitIndex}
                  label={labelText}
                  stones={stones}
                  isLegal={isLegal}
                  evalData={evalData}
                  showHints={showHints}
                  showThreats={showThreats}
                  animatingState={animatingState}
                  lastMovedPit={lastMovedPit}
                  hoverPreview={hoverPreview}
                  tutorWarning={tutorWarning}
                  gameMode={gameMode}
                  player="p1"
                  currentSkin={currentSkin}
                  theme={theme}
                  bigMode={bigMode}
                  tapTwice={tapTwice}
                  isCurrentTurn={currentPlayer === 0}
                  onKeyDown={(e) => handlePitKeyDown(pitIndex, e)}
                  onClick={() => {
                    if (gameMode === 'sandbox') onSandboxAdjust(pitIndex, 1);
                    else if (isLegal) onPitClick(pitIndex);
                  }}
                  onHover={() => !animatingState && setHoveredPit(pitIndex)}
                  onLeave={() => setHoveredPit(null)}
                  onSandboxAdjust={(delta) => onSandboxAdjust(pitIndex, delta)}
                />
              );
            })}
          </div>
        </div>

        {/* Right Store: Player 1 (South) */}
        <StorePit
          storeIndex={P1_STORE}
          title={t('board.p1Store')}
          label="P1"
          player="p1"
          stones={displayBoard[P1_STORE]}
          animatingState={animatingState}
          hoverPreview={hoverPreview}
          gameMode={gameMode}
          currentSkin={currentSkin}
          theme={theme}
          onSandboxAdjust={(delta) => onSandboxAdjust(P1_STORE, delta)}
          bigMode={bigMode}
        />
      </div>
    </div>
  );
};
