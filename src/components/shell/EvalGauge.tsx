import React from 'react';
import { Bot, User, ChevronDown, ChevronUp } from 'lucide-react';
import { MatchStats } from '../../game/gameTypes';
import { SkinTheme } from '../../theme';

interface EvalGaugeProps {
  visible: boolean;
  collapsed: boolean;
  onToggleCollapse: () => void;
  stoneAdvantage: number;
  barRatio: number;
  showHints: boolean;
  showErrorRate: boolean;
  matchStats: MatchStats;
  currentPlayer: number;
  isGameOver: boolean;
  gameMode: string;
  humanPlayer: number;
  searchDepth: number;
  colorblindSafe: boolean;
  theme: any;
  currentSkin: SkinTheme;
  isExact?: boolean;
}

export const EvalGauge: React.FC<EvalGaugeProps> = ({
  visible,
  collapsed,
  onToggleCollapse,
  stoneAdvantage,
  barRatio,
  showHints,
  showErrorRate,
  matchStats,
  currentPlayer,
  isGameOver,
  gameMode,
  humanPlayer,
  searchDepth,
  colorblindSafe,
  theme,
  currentSkin,
  isExact = false
}) => {
  if (!visible) return null;

  const calcPR = (loss: number, moves: number) => {
    if (moves === 0) return '0.00';
    const pr = ((loss * 100) / moves) * 3.5;
    return pr.toFixed(2);
  };

  return (
    <section 
      data-testid="eval-gauge"
      className={`${theme.cardBg} border ${theme.cardBorder} rounded-2xl sm:rounded-3xl p-2.5 sm:p-4 shadow-lg backdrop-blur-md transition-colors`}
    >
      {/* Header Row: Title & Collapse Button */}
      <div className="flex items-center justify-between pb-1.5 mb-1 border-b border-white/5">
        <div className="flex items-center space-x-2">
          <span className="text-floor text-xs font-bold tracking-tight opacity-75">
            Live Advantage (Stones)
          </span>
          {isExact ? (
            <span className={`text-floor text-xs font-bold px-1.5 py-0.5 rounded-full border ${
              currentSkin === 'porcelain'
                ? 'bg-emerald-100 text-emerald-950 border-emerald-400'
                : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
            }`}>
              Exact
            </span>
          ) : (
            <span className={`text-floor text-xs font-bold px-1.5 py-0.5 rounded-full border ${
              currentSkin === 'porcelain'
                ? 'bg-stone-200 text-stone-800 border-stone-400'
                : 'bg-slate-500/20 text-slate-300 border border-slate-500/30'
            }`}>
              Estimate
            </span>
          )}
          {showHints && (
            <span className="text-floor text-xs font-bold px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
              Hints Visible
            </span>
          )}
        </div>

        <button
          onClick={onToggleCollapse}
          className={`flex items-center space-x-1 text-floor text-xs font-semibold px-2 py-0.5 rounded-lg transition ${theme.cardTextMuted} hover:opacity-100`}
          title={collapsed ? "Expand advantage gauge" : "Collapse advantage gauge (Focus mode)"}
        >
          <span>{collapsed ? "Show Bar" : "Focus"}</span>
          {collapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
        </button>
      </div>

      {!collapsed ? (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-6 pt-1">
          {/* Player 2 (North / Top) */}
          <div className="flex items-center justify-between sm:justify-start space-x-2.5 w-full sm:w-auto">
            <div className="flex items-center space-x-2">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center border text-base ${
                currentPlayer === 1 && !isGameOver
                  ? 'ring-2 ring-emerald-500/60 bg-emerald-500/20 border-emerald-500 text-emerald-300'
                  : 'bg-black/10 border-white/10 opacity-70'
              }`}>
                <Bot className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <div className={`text-floor text-xs font-semibold flex items-center gap-1 ${theme.cardTextMuted}`}>
                  <span>{gameMode === 'pve' ? 'Computer (Engine)' : 'North (P2)'}</span>
                  {gameMode === 'pve' && (
                    <span className="text-xs px-1.5 py-0.5 rounded-full bg-black/10 font-bold">
                      {isExact ? 'Solved' : `Depth ${searchDepth}`}
                    </span>
                  )}
                </div>
                <div className={`text-xs sm:text-sm font-extrabold tracking-tight ${
                  stoneAdvantage < -0.2 ? (currentSkin === 'porcelain' ? 'text-[#3b6654]' : 'text-emerald-400') : stoneAdvantage > 0.2 ? theme.cardTextMuted : ''
                }`}>
                  {isExact ? (
                    stoneAdvantage < 0
                      ? `+${Math.abs(stoneAdvantage)} stones`
                      : stoneAdvantage > 0
                      ? `-${stoneAdvantage}`
                      : 'Even (±0)'
                  ) : (
                    stoneAdvantage < -0.2 
                      ? `about +${Math.abs(stoneAdvantage).toFixed(1)} stones` 
                      : stoneAdvantage > 0.2 
                      ? `about -${stoneAdvantage.toFixed(1)}` 
                      : 'Even (±0.0)'
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Smooth Balance Bar */}
          <div className="w-full flex-1 max-w-lg mx-auto flex flex-col gap-1">
            <div data-testid="eval-lead-label" className="flex justify-between text-floor text-xs font-semibold">
              <span className={currentSkin === 'porcelain' ? 'text-[#b85038]' : 'text-amber-400'}>
                South: {isExact ? (stoneAdvantage === 0 ? '±0' : stoneAdvantage > 0 ? `+${stoneAdvantage}` : `${stoneAdvantage}`) : (Math.abs(stoneAdvantage) < 0.25 ? '±0.0' : stoneAdvantage > 0 ? `+${stoneAdvantage.toFixed(1)}` : stoneAdvantage.toFixed(1))}
              </span>
              <span className={`text-floor text-xs font-mono ${theme.cardTextMuted}`}>
                {Math.abs(stoneAdvantage) < 0.25 ? 'Even Match' : stoneAdvantage > 0 ? 'South Ahead' : 'Computer Ahead'}
              </span>
              <span className={currentSkin === 'porcelain' ? 'text-[#3b6654]' : 'text-emerald-400'}>
                North: {isExact ? (stoneAdvantage === 0 ? '±0' : stoneAdvantage < 0 ? `+${Math.abs(stoneAdvantage)}` : `-${stoneAdvantage}`) : (Math.abs(stoneAdvantage) < 0.25 ? '±0.0' : stoneAdvantage < 0 ? `+${Math.abs(stoneAdvantage).toFixed(1)}` : `-${stoneAdvantage.toFixed(1)}`)}
              </span>
            </div>

            <div className={`h-2.5 sm:h-3 rounded-full border ${theme.barBg} overflow-hidden flex shadow-inner relative`}>
              <div 
                className={`h-full transition-all duration-500 ease-out ${
                  colorblindSafe 
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-500' 
                    : theme.barP1
                }`}
                style={{ width: `${barRatio * 100}%` }}
              />
              <div 
                className={`h-full transition-all duration-500 ease-out ${
                  colorblindSafe 
                    ? 'bg-gradient-to-l from-orange-500 to-amber-500' 
                    : theme.barP2
                }`}
                style={{ width: `${(1 - barRatio) * 100}%` }}
              />
              <div className={`absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-0.5 ${theme.barDivider}`} />
            </div>

            <div className={`${showErrorRate ? 'flex' : 'hidden'} justify-between text-floor text-xs font-mono ${theme.cardTextMuted}`}>
              <span>PR: {calcPR(matchStats.p1TotalLoss, matchStats.p1Moves)} ({matchStats.p1Blunders} blunders)</span>
              <span>PR: {calcPR(matchStats.p2TotalLoss, matchStats.p2Moves)} ({matchStats.p2Blunders} blunders)</span>
            </div>
          </div>

          {/* Player 1 (South / Bottom) */}
          <div className="flex items-center justify-between sm:justify-end space-x-2.5 w-full sm:w-auto">
            <div className="text-left sm:text-right">
              <div className={`text-floor text-xs font-semibold flex items-center justify-start sm:justify-end gap-1 ${theme.cardTextMuted}`}>
                {gameMode === 'pve' && humanPlayer === 0 && <span className="text-xs px-1.5 py-0.5 rounded-full bg-black/10 font-bold">You</span>}
                <span>South (P1)</span>
              </div>
              <div className={`text-xs sm:text-sm font-extrabold tracking-tight ${
                stoneAdvantage > 0.25 ? (currentSkin === 'porcelain' ? 'text-[#b85038]' : 'text-amber-400') : stoneAdvantage < -0.25 ? theme.cardTextMuted : ''
              }`}>
                {isExact ? (
                  stoneAdvantage > 0 
                    ? `+${stoneAdvantage} stones` 
                    : stoneAdvantage < 0 
                    ? `${stoneAdvantage}` 
                    : 'Even (±0)'
                ) : (
                  stoneAdvantage > 0.25 
                    ? `about +${stoneAdvantage.toFixed(1)} stones` 
                    : stoneAdvantage < -0.25 
                    ? `about ${stoneAdvantage.toFixed(1)}` 
                    : 'Even (±0.0)'
                )}
              </div>
            </div>
            <div className={`w-7 h-7 rounded-xl flex items-center justify-center border ${
              currentPlayer === 0 && !isGameOver
                ? 'ring-2 ring-amber-500/60 bg-amber-500/20 border-amber-500 text-amber-300'
                : 'bg-black/10 border-white/10 opacity-70'
            }`}>
              <User className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>
      ) : (
        /* Collapsed Focus Mode Ribbon */
        <div className="flex items-center justify-between text-xs py-0.5">
          <span className={currentSkin === 'porcelain' ? 'text-[#b85038] font-bold' : 'text-amber-400 font-bold'}>
            South: {Math.abs(stoneAdvantage) < 0.25 ? 'Even (±0.0)' : stoneAdvantage > 0 ? `+${stoneAdvantage.toFixed(1)}` : stoneAdvantage.toFixed(1)}
          </span>
          <span className={`text-floor text-xs font-mono ${theme.cardTextMuted}`}>
            PR: {calcPR(matchStats.p1TotalLoss, matchStats.p1Moves)}
          </span>
          <span className={currentSkin === 'porcelain' ? 'text-[#3b6654] font-bold' : 'text-emerald-400 font-bold'}>
            North: {Math.abs(stoneAdvantage) < 0.25 ? 'Even (±0.0)' : stoneAdvantage < 0 ? `+${Math.abs(stoneAdvantage).toFixed(1)}` : `-${stoneAdvantage.toFixed(1)}`}
          </span>
        </div>
      )}
    </section>
  );
};
