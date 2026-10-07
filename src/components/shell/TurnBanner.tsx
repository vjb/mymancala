import React from 'react';
import { Eye, EyeOff, Zap, Award, Trophy, Bot, User, Sparkles } from 'lucide-react';
import { P1_STORE, P2_STORE, MoveSimulationResult } from '../../engine';
import { formatDescriptiveLabel } from '../../rules/kalah';
import { AnimatingState, LastMoveSummary } from '../../game/gameTypes';
import { SkinTheme } from '../../theme';
import { useTranslation } from '../../i18n';

interface TurnBannerProps {
  currentPlayer: number;
  totalStones: number;
  showHints: boolean;
  onToggleHints: () => void;
  hasEarnedFreeTurn: boolean;
  hoverPreview: MoveSimulationResult | null;
  isGameOver: boolean;
  winner: number | null;
  p1Score: number;
  p2Score: number;
  gameMode: string;
  humanPlayer?: number;
  botName: string;
  animatingState: AnimatingState | null;
  isAiThinking: boolean;
  searchDepth: number;
  lastMoveSummary: LastMoveSummary | null;
  onOpenReview: () => void;
  theme: any;
  currentSkin: SkinTheme;
}

export const TurnBanner: React.FC<TurnBannerProps> = ({
  currentPlayer,
  totalStones,
  showHints,
  onToggleHints,
  hasEarnedFreeTurn,
  hoverPreview,
  isGameOver,
  winner,
  p1Score,
  p2Score,
  gameMode,
  humanPlayer = 0,
  botName,
  animatingState,
  isAiThinking,
  searchDepth,
  lastMoveSummary,
  onOpenReview,
  theme,
  currentSkin
}) => {
  const { t } = useTranslation();

  const getPitDisplayName = (pitIndex: number): string => {
    return formatDescriptiveLabel(pitIndex);
  };

  return (
    <>
      {/* Status Ribbon: Turn, Conservation Invariant, Trajectory Preview */}
      <div className="mb-2 sm:mb-2.5 flex flex-wrap items-center justify-between gap-1.5 px-1">
        <div className="flex items-center flex-wrap gap-1.5">
          <span
            data-testid="turn-indicator"
            className={`px-3 py-1 rounded-full text-xs font-bold border shadow-xs transition-colors ${
              currentPlayer === 0 ? theme.turnP1Bg : theme.turnP2Bg
            }`}
          >
            {currentPlayer === 0 ? t('turn.yourTurn') : t('turn.aiTurn')}
          </span>

          {/* Strict Conservation Invariant */}
          <span
            data-testid="total-stones"
            className={`px-2.5 py-1 rounded-full text-xs font-mono font-semibold border ${
              currentSkin === 'porcelain'
                ? 'bg-[#ded5c6] text-[#342e29] border-[#cfc4b4]'
                : currentSkin === 'high-contrast'
                ? 'bg-black text-white border-white font-black'
                : 'bg-black/30 border-white/10 text-slate-300'
            }`}
            title="Strict zero-leak stone conservation invariant"
          >
            {t('board.stones', { count: totalStones })}
          </span>

          {/* Gated 1-Tap Move Hints Toggle (gated behind bestMoveHighlight lens) */}
          {showHints && (
            <button
              onClick={onToggleHints}
              data-testid="ribbon-hints-btn"
              title={showHints ? 'Move hints are visible on board pits' : 'Move hints hidden'}
              className={`px-2.5 py-1 rounded-full text-xs font-semibold border flex items-center gap-1 transition ${
                showHints
                  ? currentSkin === 'porcelain'
                    ? 'bg-amber-100 text-amber-900 border-amber-500 font-bold'
                    : 'bg-amber-500/20 text-amber-400 border-amber-500/40 font-bold'
                  : `${theme.cardTextMuted} ${currentSkin === 'porcelain' ? 'border-[#dbd0c0]' : 'border-white/10 hover:border-white/20'}`
              }`}
            >
              <Eye className={`w-3.5 h-3.5 ${currentSkin === 'porcelain' ? 'text-amber-800' : 'text-amber-400'}`} />
              <span>Hints On</span>
            </button>
          )}

          {hasEarnedFreeTurn && (
            <span className="flex items-center space-x-1 text-xs font-bold text-emerald-400 bg-emerald-950/70 border border-emerald-600/50 px-2.5 py-1 rounded-full animate-bounce">
              <Zap className="w-3.5 h-3.5 text-emerald-300" />
              <span>{t('turn.freeTurnBonus')}</span>
            </span>
          )}

          {hoverPreview && (
            <span className={`text-xs flex items-center space-x-1 ${theme.cardTextMuted}`}>
              <Eye className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span className="truncate">
                Landing: {hoverPreview.lastLanding === P1_STORE ? 'Your Store (Bonus Turn!)' : hoverPreview.lastLanding === P2_STORE ? 'Opponent Store' : `Pit ${hoverPreview.lastLanding + 1}`}
                {hoverPreview.capturedStones > 0 && ` • Captures +${hoverPreview.capturedStones}!`}
              </span>
            </span>
          )}
        </div>

        {/* Game Over Banner */}
        {isGameOver && (
          <div className="flex items-center gap-2 flex-wrap">
            <div
              data-testid="game-over-banner"
              className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-500 text-slate-950 text-xs font-extrabold shadow-md animate-pulse"
            >
              <Award className="w-3.5 h-3.5" />
              <span>
                {winner === -1
                  ? t('turn.tie')
                  : `${winner === 0 ? 'South (You)' : (gameMode === 'pve' ? botName : 'North')} Wins (${p1Score} - ${p2Score})!`}
              </span>
            </div>
            <button
              data-testid="game-over-review-btn"
              onClick={onOpenReview}
              className="flex items-center space-x-1 px-3 py-1 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md transition active:scale-95"
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>Review Match 🏆</span>
            </button>
          </div>
        )}
      </div>

      {/* Move Announcement & Live Action Banner */}
      <div className={`mb-2.5 p-2.5 sm:p-3 rounded-2xl border transition-all duration-300 flex flex-col sm:flex-row items-center justify-between gap-2 shadow-sm ${
        animatingState
          ? animatingState.phase === 'capture'
            ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
            : animatingState.phase === 'free_turn'
            ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
            : currentSkin === 'porcelain'
            ? 'bg-[#ede5d8] border-[#dbd0c0] text-[#2c2723]'
            : 'bg-white/10 border-white/20 text-white'
          : isAiThinking
          ? currentSkin === 'porcelain'
            ? 'bg-sky-100 border-sky-300 text-sky-900'
            : 'bg-sky-500/15 border-sky-500/30 text-sky-200'
          : lastMoveSummary
          ? currentSkin === 'porcelain'
            ? 'bg-[#f4efe6] border-[#e2d9cb] text-[#2c2723]'
            : 'bg-black/30 border-white/10 text-slate-200'
          : currentSkin === 'porcelain'
          ? 'bg-[#f4efe6] border-[#e2d9cb] text-[#2c2723]'
          : 'bg-black/20 border-white/5 text-slate-400'
      }`}>
        {/* Left: Move Description / Animation Live Feed */}
        <div className="flex items-center space-x-2.5 w-full sm:w-auto">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
            animatingState
              ? animatingState.player === 0
                ? 'bg-amber-500/20 border-amber-500 text-amber-300 animate-pulse'
                : 'bg-emerald-500/20 border-emerald-500 text-emerald-300 animate-pulse'
              : isAiThinking
              ? 'bg-sky-500/20 border-sky-500 text-sky-300 animate-pulse'
              : lastMoveSummary
              ? lastMoveSummary.player === 0
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                : 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
              : 'bg-black/10 border-white/10 opacity-70'
          }`}>
            {isAiThinking ? (
              <Bot className="w-4 h-4 animate-bounce" />
            ) : animatingState ? (
              animatingState.player === 0 ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />
            ) : lastMoveSummary ? (
              lastMoveSummary.player === 0 ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            {animatingState ? (
              <div className="flex flex-col">
                <div className="text-xs font-bold flex items-center gap-1.5 flex-wrap">
                  <span className={animatingState.player === 0 ? 'text-amber-400' : 'text-emerald-400'}>
                    {animatingState.player === 0 ? (gameMode === 'pve' && humanPlayer === 0 ? 'You' : 'South') : (gameMode === 'pve' && humanPlayer === 0 ? 'Computer' : 'North')}
                  </span>
                  <span className="font-normal opacity-90">
                    {animatingState.phase === 'lift' && `picked up ${animatingState.initialStones} stones from ${getPitDisplayName(animatingState.sourcePit)}`}
                    {animatingState.phase === 'sow' && `sowing → ${getPitDisplayName(animatingState.currentPit!)}`}
                    {animatingState.phase === 'capture' && `captured ${animatingState.capturedStones} stones!`}
                    {animatingState.phase === 'free_turn' && `landed in store — bonus turn!`}
                  </span>
                </div>
                <div className="text-xs font-mono opacity-80 flex items-center gap-2">
                  <span className="font-bold text-amber-300">In Hand: {animatingState.stonesInHand}</span>
                  {animatingState.phase === 'sow' && (
                    <span className="animate-pulse opacity-75">● Sowing around board...</span>
                  )}
                </div>
              </div>
            ) : isAiThinking ? (
              <div className="flex flex-col">
                <div className="text-xs font-bold flex items-center gap-1.5">
                  <span>{t('turn.aiThinking')}</span>
                  <span className={`text-xs font-mono ${currentSkin === 'porcelain' ? 'text-[#4e463f]' : 'opacity-70'}`}>(Depth {searchDepth})</span>
                </div>
                <div className={`text-xs ${currentSkin === 'porcelain' ? 'text-[#4e463f]' : 'opacity-70'}`}>Finding the most thoughtful next move...</div>
              </div>
            ) : lastMoveSummary ? (
              <div className="flex flex-col">
                <div className="text-xs font-bold flex items-center gap-1.5 flex-wrap">
                  <span className={lastMoveSummary.player === 0 ? 'text-amber-400 font-extrabold' : 'text-emerald-400 font-extrabold'}>
                    {lastMoveSummary.player === 0 ? (gameMode === 'pve' && humanPlayer === 0 ? 'You' : 'South') : (gameMode === 'pve' && humanPlayer === 0 ? 'Computer' : 'North')}
                  </span>
                  <span>played {getPitDisplayName(lastMoveSummary.pit)}</span>
                  <span className="text-xs font-mono font-normal opacity-80">({lastMoveSummary.initialStones} stones)</span>
                  {lastMoveSummary.freeTurn && (
                    <span className="px-1.5 py-0.5 rounded-full text-xs font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse">
                      ⚡ Free Turn
                    </span>
                  )}
                  {lastMoveSummary.captured > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full text-xs font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      💥 +{lastMoveSummary.captured} Captured
                    </span>
                  )}
                </div>
                <div className={`text-xs truncate ${currentSkin === 'porcelain' ? 'text-[#4e463f]' : 'opacity-70'}`}>
                  Last landed in {getPitDisplayName(lastMoveSummary.lastLanding)}
                  {isGameOver ? ' • Game ended' : ` • ${currentPlayer === 0 ? (gameMode === 'pve' && humanPlayer === 0 ? 'Your' : "South's") : (gameMode === 'pve' && humanPlayer === 0 ? "Computer's" : "North's")} turn`}
                </div>
              </div>
            ) : (
              <div className={`text-xs font-medium ${currentSkin === 'porcelain' ? 'text-[#2c2723]' : 'opacity-80'}`}>
                {gameMode === 'pve' && currentPlayer === humanPlayer
                  ? 'Your turn — pick a pit from your side (South P1–P6)'
                  : 'Game started — pick a pit to begin'}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};
