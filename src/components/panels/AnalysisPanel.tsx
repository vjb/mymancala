import React, { useState } from 'react';
import { BarChart3, Award, Trophy, ChevronDown, ChevronUp, CheckCircle2, AlertTriangle, ShieldAlert, HelpCircle, Bot, Sparkles, Brain, Calendar } from 'lucide-react';
import { EvaluatedMove, RulesConfig } from '../../engine';
import { MatchStats } from '../../game/gameTypes';
import { BoardLayout } from '../../rules/types';
import { generateTacticalExplanation } from '../../tactics';
import { SkinTheme } from '../../theme';
import { PVDisplay } from './PVDisplay';
import { DrillView } from './DrillView';
import { DailyPuzzleCard } from './DailyPuzzleCard';

interface AnalysisPanelProps {
  analysisResults: EvaluatedMove[];
  isAnalyzing: boolean;
  searchDepth: number;
  matchStats: MatchStats;
  showErrorRate: boolean;
  showWinPercent: boolean;
  showMainLine: boolean;
  canReview: boolean;
  onOpenReview: () => void;
  expandedPit: number | null;
  onToggleExpandPit: (pit: number) => void;
  onPlayMove: (pit: number) => void;
  isGameOver: boolean;
  board: number[];
  currentPlayer: number;
  rules: RulesConfig;
  colorblindSafe: boolean;
  currentSkin: SkinTheme;
  theme: any;
  mobileHidden: boolean;
  layout?: BoardLayout;
  isAnalysisEmpty?: boolean;
  onApplyPreset?: (preset: 'coach') => void;
  onNavigateTab?: (tab: 'settings') => void;
  isExact?: boolean;
}

export const AnalysisPanel: React.FC<AnalysisPanelProps> = ({
  analysisResults,
  isAnalyzing,
  searchDepth,
  matchStats,
  showErrorRate,
  showWinPercent,
  showMainLine,
  canReview,
  onOpenReview,
  expandedPit,
  onToggleExpandPit,
  onPlayMove,
  isGameOver,
  board,
  currentPlayer,
  rules,
  colorblindSafe,
  currentSkin,
  theme,
  mobileHidden,
  layout,
  isAnalysisEmpty = false,
  onApplyPreset,
  onNavigateTab,
  isExact = false
}) => {
  const [panelMode, setPanelMode] = useState<'moves' | 'drills' | 'puzzle'>('moves');

  const calcPR = (loss: number, moves: number) => {
    if (moves === 0) return '0.00';
    const pr = ((loss * 100) / moves) * 3.5;
    return pr.toFixed(2);
  };

  const renderGradeBadge = (classification: string, badgeColor: string) => {
    let icon = <CheckCircle2 className="w-3.5 h-3.5 mr-1 inline" />;
    let customColor = badgeColor;

    if (classification === 'Good') {
      icon = <Award className="w-3.5 h-3.5 mr-1 inline" />;
    } else if (classification === 'Inaccuracy') {
      icon = <HelpCircle className="w-3.5 h-3.5 mr-1 inline" />;
    } else if (classification === 'Mistake') {
      icon = <AlertTriangle className="w-3.5 h-3.5 mr-1 inline" />;
      if (colorblindSafe) {
        customColor = 'bg-orange-500/20 text-orange-400 border-orange-500/40';
      }
    } else if (classification === 'Blunder') {
      icon = <ShieldAlert className="w-3.5 h-3.5 mr-1 inline" />;
      if (colorblindSafe) {
        customColor = 'bg-fuchsia-600/25 text-fuchsia-400 border-fuchsia-600/40';
      }
    }

    if (currentSkin === 'porcelain') {
      if (classification.includes('Best') || classification === 'Good') {
        customColor = 'bg-emerald-100 text-emerald-950 border-emerald-400';
      } else if (classification === 'Inaccuracy') {
        customColor = 'bg-amber-100 text-amber-950 border-amber-400';
      } else if (classification === 'Mistake') {
        customColor = colorblindSafe
          ? 'bg-orange-100 text-orange-950 border-orange-400'
          : 'bg-amber-100 text-amber-950 border-amber-400';
      } else if (classification === 'Blunder') {
        customColor = colorblindSafe
          ? 'bg-fuchsia-100 text-fuchsia-950 border-fuchsia-400'
          : 'bg-rose-100 text-rose-950 border-rose-400';
      }
    }

    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border flex items-center shrink-0 ${customColor}`}>
        {icon}
        <span>{classification}</span>
      </span>
    );
  };

  // Calm empty state when all analytical lenses are toggled off
  if (isAnalysisEmpty) {
    return (
      <div
        data-testid="analysis-empty-state"
        className={`lg:col-span-2 ${theme.cardBg} border ${theme.cardBorder} rounded-2xl sm:rounded-3xl p-6 sm:p-10 flex flex-col items-center justify-center text-center shadow-lg ${
          mobileHidden ? 'hidden lg:flex' : ''
        }`}
      >
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-4">
          <Sparkles className="w-7 h-7" />
        </div>
        <h3 className="font-bold text-base sm:text-lg mb-2">Stats and Analysis are Hidden</h3>
        <p className={`text-xs sm:text-sm max-w-md ${theme.cardTextMuted} mb-6 leading-relaxed`}>
          You are in <strong>Just Play</strong> mode. Engine lookahead, move rankings, and ratings are turned off so you can enjoy the pure tactile board.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            data-testid="enable-coach-btn"
            onClick={() => onApplyPreset?.('coach')}
            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-md transition active:scale-95 flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>Turn on Gentle Coach</span>
          </button>
          <button
            onClick={() => onNavigateTab?.('settings')}
            className={`px-4 py-2 rounded-xl border text-xs font-semibold transition ${theme.cardTextMuted} hover:text-white border-white/10 hover:border-white/20`}
          >
            Customize in Settings
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`lg:col-span-2 ${theme.cardBg} border ${theme.cardBorder} rounded-2xl sm:rounded-3xl p-3 sm:p-5 flex flex-col shadow-lg overflow-hidden sm:overflow-visible ${mobileHidden ? 'hidden lg:flex' : ''}`}>
      <div className={`flex items-center justify-between pb-3 border-b ${theme.cardBorder}`}>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center space-x-2">
            <BarChart3 className="w-4 h-4 opacity-70" />
            <h3 className="font-bold text-xs sm:text-sm tracking-wide">
              {panelMode === 'moves' ? 'Candidate Move Evaluations' : panelMode === 'drills' ? 'Interactive Tactical Drills' : 'Daily Date-Seeded Puzzle'}
            </h3>
          </div>
          <div className={`flex items-center gap-1 p-0.5 rounded-lg border ml-1 ${
            currentSkin === 'porcelain' ? 'bg-[#eee6da] border-[#dbd0c0]' : 'bg-black/20 border-white/5'
          }`}>
            <button
              data-testid="tab-moves"
              onClick={() => setPanelMode('moves')}
              className={`px-2 py-0.5 rounded-md text-xs font-semibold transition ${
                panelMode === 'moves'
                  ? (currentSkin === 'porcelain' ? 'bg-[#d8c8b4] text-[#2c1d11] font-bold shadow-sm' : 'bg-white/20 text-white')
                  : (currentSkin === 'porcelain' ? 'text-[#5c3a1a] hover:text-[#2c1d11]' : 'text-slate-400 hover:text-white')
              }`}
            >
              Moves
            </button>
            <button
              data-testid="tab-drills"
              onClick={() => setPanelMode('drills')}
              className={`px-2 py-0.5 rounded-md text-xs font-semibold transition flex items-center gap-1 ${
                panelMode === 'drills'
                  ? (currentSkin === 'porcelain' ? 'bg-emerald-100 text-emerald-950 border border-emerald-400 font-bold' : 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/30')
                  : (currentSkin === 'porcelain' ? 'text-[#5c3a1a] hover:text-[#2c1d11]' : 'text-slate-400 hover:text-white')
              }`}
            >
              <Brain className="w-3 h-3" />
              <span>Drills</span>
            </button>
            <button
              data-testid="tab-puzzle"
              onClick={() => setPanelMode('puzzle')}
              className={`px-2 py-0.5 rounded-md text-xs font-semibold transition flex items-center gap-1 ${
                panelMode === 'puzzle'
                  ? (currentSkin === 'porcelain' ? 'bg-sky-100 text-sky-950 border border-sky-400 font-bold' : 'bg-sky-500/25 text-sky-300 border border-sky-500/30')
                  : (currentSkin === 'porcelain' ? 'text-[#5c3a1a] hover:text-[#2c1d11]' : 'text-slate-400 hover:text-white')
              }`}
            >
              <Calendar className="w-3 h-3" />
              <span>Daily Puzzle</span>
            </button>
          </div>
        </div>
        <span className={`text-xs font-mono ${theme.cardTextMuted}`}>
          {panelMode === 'drills'
            ? 'Spaced Repetition'
            : panelMode === 'puzzle'
              ? '365+ Verified Offline Bank'
              : isExact
                ? 'Endgame Solved (Exact)'
                : `Lookahead: ${searchDepth} turns ${isAnalyzing ? '(Thinking...)' : ''}`}
        </span>
      </div>

      {panelMode === 'drills' ? (
        <div className="mt-3">
          <DrillView theme={theme} currentSkin={currentSkin} colorblindSafe={colorblindSafe} />
        </div>
      ) : panelMode === 'puzzle' ? (
        <div className="mt-3">
          <DailyPuzzleCard theme={theme} currentSkin={currentSkin} />
        </div>
      ) : (
        <>

      {/* Session Accuracy Banner */}
      <div className={`flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl border text-xs font-mono mt-3 mb-1 ${
        currentSkin === 'porcelain' ? 'bg-[#ede5d8] border-[#dbd0c0]' : 'bg-black/30 border-white/5'
      }`}>
        <div className={`${showErrorRate ? 'flex' : 'hidden'} items-center space-x-2`}>
          <Award className="w-4 h-4 text-amber-500 shrink-0" />
          <span className="font-semibold">Accuracy Rating:</span>
          <span className="font-bold text-amber-500">P1: {calcPR(matchStats.p1TotalLoss, matchStats.p1Moves)}</span>
          <span className="opacity-40">•</span>
          <span className={`font-bold ${currentSkin === 'porcelain' ? 'text-emerald-800' : 'text-emerald-500'}`}>P2: {calcPR(matchStats.p2TotalLoss, matchStats.p2Moves)}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className={`${showErrorRate ? '' : 'hidden'} text-xs ${theme.cardTextMuted}`}>
            Blunders: P1({matchStats.p1Blunders}) / P2({matchStats.p2Blunders})
          </div>
          {canReview && (
            <button
              onClick={onOpenReview}
              data-testid="analysis-review-btn"
              className={`px-2.5 py-1 rounded-lg border text-xs font-bold transition flex items-center gap-1 ${
                currentSkin === 'porcelain'
                  ? 'bg-amber-600/10 text-amber-800 border-amber-700/30 hover:bg-amber-600/20'
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
              }`}
            >
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span>Review Game</span>
            </button>
          )}
        </div>
      </div>

      {/* Mobile Responsive Cards */}
      <div className="sm:hidden flex flex-col gap-2 mt-2 w-full">
        {analysisResults.length === 0 ? (
          <div className={`py-6 text-center text-xs ${theme.cardTextMuted}`}>
            {isGameOver ? 'Match completed. No moves available.' : 'Calculating optimal lines...'}
          </div>
        ) : (
          analysisResults.map((move, idx) => {
            const isExpanded = expandedPit === move.pit;
            const explanation = isExpanded && analysisResults[0]
              ? generateTacticalExplanation(board, currentPlayer, move, analysisResults[0], rules)
              : null;

            return (
              <div
                key={move.pit}
                data-testid={idx === 0 ? 'eval-row-0' : idx === analysisResults.length - 1 ? 'eval-row-worst' : undefined}
                className={`rounded-xl border p-2.5 flex flex-col gap-2 transition w-full select-none ${
                  move.rank === 1
                    ? 'bg-amber-500/10 border-amber-500/30'
                    : isExpanded
                      ? 'bg-white/10 border-white/20'
                      : 'bg-black/20 border-white/5'
                }`}
              >
                <div className="flex items-center justify-between gap-1 w-full">
                  <div
                    className="flex items-center space-x-1.5 flex-1 min-w-0 cursor-pointer"
                    onClick={() => onToggleExpandPit(move.pit)}
                  >
                    <span className="font-bold text-xs opacity-75 font-mono">#{move.rank}</span>
                    <span className="font-bold text-xs truncate">{move.label}</span>
                    <span className="text-xs text-amber-400 shrink-0">
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5 inline" /> : <ChevronDown className="w-3.5 h-3.5 inline" />}
                    </span>
                  </div>

                  <div className="flex items-center space-x-1.5 shrink-0">
                    <span className={`${showWinPercent ? '' : 'hidden'} text-xs font-bold font-mono`}>
                      {isExact
                        ? (move.winProb === 1 ? '100%' : move.winProb === 0.5 ? '50%' : '0%')
                        : `${(move.winProb * 100).toFixed(1)}%`}
                    </span>
                    <span className={`${showWinPercent ? '' : 'hidden'} text-xs font-mono ${move.equityLoss === 0 ? (currentSkin === 'porcelain' ? 'text-emerald-800 font-semibold' : 'text-emerald-500 font-semibold') : (currentSkin === 'porcelain' ? 'text-rose-800' : 'text-rose-400')}`}>
                      {move.equityLoss === 0 ? '0.0%' : `-${(move.equityLoss * 100).toFixed(1)}%`}
                    </span>
                    <div>
                      {renderGradeBadge(move.classification, move.badgeColor)}
                    </div>
                    <button
                      data-testid={`eval-play-pit-${move.pit}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onPlayMove(move.pit);
                      }}
                      disabled={isGameOver}
                      className={`px-3 py-1 rounded-lg text-xs font-bold border shadow-xs transition active:scale-95 ${
                        currentSkin === 'porcelain'
                          ? 'bg-amber-600 hover:bg-amber-500 text-white border-amber-700'
                          : 'bg-amber-600 hover:bg-amber-500 text-white border-amber-500'
                      }`}
                    >
                      Play
                    </button>
                  </div>
                </div>

                <div
                  className="flex items-center justify-between text-xs font-mono opacity-80 cursor-pointer"
                  onClick={() => onToggleExpandPit(move.pit)}
                >
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {move.freeTurn && <span className={`${currentSkin === 'porcelain' ? 'text-emerald-800' : 'text-emerald-500'} font-bold`}>[Free Turn]</span>}
                    {move.captures > 0 && <span className="text-amber-500 font-bold">[+{move.captures} Cap]</span>}
                    {showMainLine && (
                      <PVDisplay pv={move.pv} moveLabel={move.label} themeSkin={currentSkin} layout={layout} />
                    )}
                  </div>
                  <span className={`text-xs underline opacity-75 shrink-0 ${
                    currentSkin === 'porcelain' ? 'text-amber-800' : 'text-amber-300'
                  }`}>
                    {isExpanded ? 'Hide Details' : 'Details'}
                  </span>
                </div>

                {isExpanded && explanation && (
                  <div className={`mt-1 p-2.5 rounded-lg border text-xs flex flex-col gap-2 ${
                    currentSkin === 'porcelain'
                      ? 'bg-[#faf2e6] border-[#e8d2b8] text-[#2c2723]'
                      : 'bg-black/40 border-white/10 text-slate-100'
                  }`}>
                    <div className={`flex items-center gap-1.5 font-bold ${
                      currentSkin === 'porcelain' ? 'text-amber-900' : 'text-amber-400'
                    }`}>
                      <Bot className="w-4 h-4 shrink-0" />
                      <span>Tactical Breakdown for {move.label} ({move.classification}):</span>
                    </div>
                    <p className="leading-relaxed opacity-95 text-xs">
                      {explanation.summary}
                    </p>
                    <div className="grid grid-cols-1 gap-1.5">
                      <div className="p-2 rounded bg-rose-500/10 border border-rose-500/20">
                        <div className="text-xs font-bold text-rose-400 uppercase">Immediate Effect</div>
                        <div className="text-xs opacity-90 mt-0.5">{explanation.consequence}</div>
                      </div>
                      <div className="p-2 rounded bg-amber-500/10 border border-amber-500/20">
                        <div className="text-xs font-bold text-amber-400 uppercase">Opponent Response</div>
                        <div className="text-xs opacity-90 mt-0.5">{explanation.threat || 'No immediate opponent threat; general positional shift.'}</div>
                      </div>
                      {move.rank > 1 && (
                        <div className="p-2 rounded bg-emerald-500/10 border border-emerald-500/20">
                          <div className={`text-xs font-bold uppercase ${currentSkin === 'porcelain' ? 'text-emerald-900' : 'text-emerald-400'}`}>Why {analysisResults[0]?.label || 'Best Move'} is better</div>
                          <div className="text-xs opacity-90 mt-0.5">{explanation.recommendationComparison}</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Desktop Candidates Table */}
      <div className="hidden sm:block overflow-x-auto mt-2">
        <table className="w-full text-left text-xs min-w-[460px]">
          <thead>
            <tr className={`border-b ${theme.cardBorder} ${theme.cardTextMuted} font-mono uppercase text-xs`}>
              <th className="py-2.5 px-2">Rank</th>
              <th className="py-2.5 px-2">Pit Action</th>
              <th className={`${showWinPercent ? '' : 'hidden'} py-2.5 px-2`}>Win %</th>
              <th className={`${showWinPercent ? '' : 'hidden'} py-2.5 px-2`}>Equity Diff</th>
              <th className="py-2.5 px-2">Grade</th>
              <th className="py-2.5 px-2 hidden sm:table-cell">{showMainLine ? 'Bonus / Line Lookahead' : 'Bonus'}</th>
              <th className="py-2.5 px-2 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 font-mono">
            {analysisResults.length === 0 ? (
              <tr>
                <td colSpan={7} className={`py-6 text-center ${theme.cardTextMuted}`}>
                  {isGameOver ? 'Match completed. No moves available.' : 'Calculating optimal lines...'}
                </td>
              </tr>
            ) : (
              analysisResults.map((move, idx) => {
                const isExpanded = expandedPit === move.pit;
                const explanation = isExpanded && analysisResults[0]
                  ? generateTacticalExplanation(board, currentPlayer, move, analysisResults[0], rules)
                  : null;

                return (
                  <React.Fragment key={move.pit}>
                    <tr
                      data-testid={idx === 0 ? 'eval-row-0' : idx === analysisResults.length - 1 ? 'eval-row-worst' : undefined}
                      onClick={() => onToggleExpandPit(move.pit)}
                      className={`hover:bg-white/5 transition cursor-pointer select-none ${
                        move.rank === 1 ? 'bg-amber-500/10' : ''
                      } ${isExpanded ? 'bg-white/10' : ''}`}
                      title="Click to view tactical breakdown"
                    >
                      <td className="py-2.5 px-2 font-bold opacity-80">
                        #{move.rank}
                      </td>
                      <td className="py-2.5 px-2 font-bold">
                        <div className="flex items-center gap-1.5">
                          <span>{move.label}</span>
                          <span className="text-xs opacity-70">
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5 inline text-amber-400" /> : <ChevronDown className="w-3.5 h-3.5 inline text-slate-400" />}
                          </span>
                        </div>
                        <div className={`sm:hidden text-xs font-normal ${theme.cardTextMuted} mt-0.5 flex flex-wrap gap-1 items-center`}>
                          {move.freeTurn && <span className={`${currentSkin === 'porcelain' ? 'text-emerald-800' : 'text-emerald-500'} font-bold`}>[Free Turn]</span>}
                          {move.captures > 0 && <span className="text-amber-500 font-bold">[+{move.captures} Cap]</span>}
                          {showMainLine && <PVDisplay pv={move.pv} moveLabel={move.label} themeSkin={currentSkin} layout={layout} />}
                        </div>
                      </td>
                      <td className={`${showWinPercent ? '' : 'hidden'} py-2.5 px-2 font-semibold`}>
                        {isExact
                          ? (move.winProb === 1 ? '100%' : move.winProb === 0.5 ? '50%' : '0%')
                          : `${(move.winProb * 100).toFixed(1)}%`}
                      </td>
                      <td className={`${showWinPercent ? '' : 'hidden'} py-2.5 px-2`}>
                        <span className={move.equityLoss === 0 ? (currentSkin === 'porcelain' ? 'text-emerald-800 font-semibold' : 'text-emerald-500 font-semibold') : (currentSkin === 'porcelain' ? 'text-rose-800' : 'text-rose-400')}>
                          {move.equityLoss === 0 ? '0.000' : `-${(move.equityLoss * 100).toFixed(1)}%`}
                        </span>
                      </td>
                      <td className="py-2.5 px-2">
                        {renderGradeBadge(move.classification, move.badgeColor)}
                      </td>
                      <td className={`py-2.5 px-2 hidden sm:table-cell text-xs ${theme.cardTextMuted}`}>
                        {move.freeTurn && <span className={`${currentSkin === 'porcelain' ? 'text-emerald-800' : 'text-emerald-500'} font-bold mr-1.5`}>[Free Turn]</span>}
                        {move.captures > 0 && <span className="text-amber-500 font-bold mr-1.5">[+{move.captures} Cap]</span>}
                        {showMainLine && <PVDisplay pv={move.pv} moveLabel={move.label} themeSkin={currentSkin} layout={layout} />}
                      </td>
                      <td className="py-2.5 px-2 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          data-testid={`eval-play-pit-${move.pit}`}
                          onClick={() => onPlayMove(move.pit)}
                          disabled={isGameOver}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition ${
                            currentSkin === 'porcelain'
                              ? 'bg-white hover:bg-[#ded5c6] text-[#2c2723] border-[#cdc3b2]'
                              : 'bg-white/10 hover:bg-white/20 text-white border-white/15'
                          }`}
                        >
                          Play
                        </button>
                      </td>
                    </tr>

                    {/* Tactical Explanation Accordion Row */}
                    {isExpanded && explanation && (
                      <tr className={currentSkin === 'porcelain' ? 'bg-[#faf2e6]/90' : 'bg-black/30'}>
                        <td colSpan={7} className="p-3 sm:p-4">
                          <div className="flex flex-col gap-2.5 text-xs">
                            <div className={`flex items-center gap-2 font-bold ${
                              currentSkin === 'porcelain' ? 'text-amber-900' : 'text-amber-400'
                            }`}>
                              <Bot className="w-4 h-4" />
                              <span>Tactical Breakdown for {move.label} ({move.classification}):</span>
                            </div>
                            <p className="leading-relaxed font-sans text-xs opacity-95">
                              {explanation.summary}
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1 font-sans">
                              <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20">
                                <div className="text-xs font-bold text-rose-400 uppercase">Immediate Effect</div>
                                <div className="text-xs opacity-90 mt-0.5">{explanation.consequence}</div>
                              </div>
                              <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                                <div className="text-xs font-bold text-amber-400 uppercase">Opponent Response</div>
                                <div className="text-xs opacity-90 mt-0.5">{explanation.threat || 'No immediate opponent threat; general positional shift.'}</div>
                              </div>
                            </div>
                            {move.rank > 1 && (
                              <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 font-sans">
                                <div className={`text-xs font-bold uppercase ${currentSkin === 'porcelain' ? 'text-emerald-900' : 'text-emerald-400'}`}>Why {analysisResults[0]?.label || 'Best Move'} is better</div>
                                <div className="text-xs opacity-90 mt-0.5">{explanation.recommendationComparison}</div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      </>
      )}
    </div>
  );
};
