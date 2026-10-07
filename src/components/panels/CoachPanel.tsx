import React from 'react';
import { Sparkles, ShieldAlert, AlertTriangle, Bot, ChevronUp, ChevronDown } from 'lucide-react';
import { TutorWarning } from '../../game/gameTypes';
import { SkinTheme } from '../../theme';

interface CoachPanelProps {
  warning: TutorWarning;
  showDetails: boolean;
  onToggleDetails: () => void;
  onReconsider: () => void;
  onPlayBest: () => void;
  onConfirm: () => void;
  showExplanations: boolean;
  currentSkin: SkinTheme;
}

export const CoachPanel: React.FC<CoachPanelProps> = ({
  warning,
  showDetails,
  onToggleDetails,
  onReconsider,
  onPlayBest,
  onConfirm,
  showExplanations,
  currentSkin
}) => {
  return (
    <div 
      data-testid="tutor-modal"
      className={`p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border-2 flex flex-col gap-3.5 shadow-2xl backdrop-blur-md animate-in fade-in duration-200 transition-all ${
        currentSkin === 'porcelain'
          ? 'bg-[#fff5ea] border-[#f0c08a] text-[#5c3a1a]'
          : warning.eval.classification === 'Blunder'
            ? 'bg-rose-950/90 border-rose-500/70 text-rose-100 shadow-[0_0_30px_rgba(244,63,94,0.25)]'
            : 'bg-amber-950/90 border-amber-500/70 text-amber-100 shadow-[0_0_30px_rgba(251,191,36,0.25)]'
      }`}
    >
      {/* Header row: Coach Badge, Warning Type, & Actions */}
      <div className="flex items-center justify-between gap-2.5 flex-wrap">
        <div className="flex items-center space-x-2.5">
          <div className={`p-2 rounded-xl ${
            warning.eval.classification === 'Blunder'
              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
              : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
          }`}>
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-extrabold tracking-wide uppercase">
                Coach Advisory
              </span>
              <span className={`text-floor text-xs px-2 py-0.5 rounded-full font-bold border flex items-center gap-1 ${
                warning.eval.classification === 'Blunder'
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
              }`}>
                {warning.eval.classification === 'Blunder' ? (
                  <ShieldAlert className="w-3 h-3" />
                ) : (
                  <AlertTriangle className="w-3 h-3" />
                )}
                <span>{warning.eval.classification} Alert</span>
              </span>
            </div>
            <div className="text-floor text-xs opacity-80 font-mono mt-0.5">
              Sacrifices <strong className="underline font-bold text-rose-300">{(warning.eval.equityLoss * 100).toFixed(1)}%</strong> win equity compared to <strong>{warning.bestMove.label}</strong>
            </div>
          </div>
        </div>

        {/* Action Buttons for Mobile/Desktop */}
        <div className="flex items-center gap-2 ml-auto shrink-0 w-full sm:w-auto justify-end pt-1 sm:pt-0">
          <button
            data-testid="tutor-reconsider"
            onClick={onReconsider}
            className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-xl text-xs font-semibold transition border ${
              currentSkin === 'porcelain'
                ? 'bg-[#ded5c6] text-[#342e29] border-[#cfc4b4] hover:bg-[#cfc4b4]'
                : 'bg-white/10 text-slate-200 border-white/15 hover:bg-white/20'
            }`}
          >
            Take Back
          </button>
          <button
            data-testid="tutor-play-best"
            onClick={onPlayBest}
            className="flex-1 sm:flex-none px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md transition flex items-center justify-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Play {warning.bestMove.label}</span>
          </button>
          <button
            data-testid="tutor-confirm"
            onClick={onConfirm}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium opacity-80 hover:opacity-100 transition border ${
              currentSkin === 'porcelain'
                ? 'border-[#d0b898] text-[#704d2a] hover:bg-amber-100/50'
                : 'border-white/20 text-slate-300 hover:bg-white/5'
            }`}
            title="Ignore Coach and play your pick"
          >
            Confirm Anyway
          </button>
        </div>
      </div>

      {/* Natural Language Summary Banner */}
      <div className={`${showExplanations ? 'flex' : 'hidden'} p-2.5 sm:p-3 rounded-xl border text-xs sm:text-[13px] leading-relaxed items-start gap-2.5 ${
        currentSkin === 'porcelain'
          ? 'bg-white/70 border-[#f0c08a]/60 text-[#4c3116]'
          : 'bg-black/30 border-white/10 text-slate-100'
      }`}>
        <Bot className="w-4 h-4 mt-0.5 text-amber-400 shrink-0" />
        <div className="flex-1">
          <span className="font-semibold">{warning.explanation.summary}</span>
        </div>
      </div>

      {/* "Why?" Toggle Button */}
      <div className={`${showExplanations ? 'flex' : 'hidden'} items-center justify-between border-t border-white/10 pt-2`}>
        <button
          type="button"
          onClick={onToggleDetails}
          className={`text-xs font-bold flex items-center gap-1.5 py-1 px-2.5 rounded-lg transition ${
            currentSkin === 'porcelain'
              ? 'hover:bg-amber-200/50 text-[#5c3a1a]'
              : 'hover:bg-white/10 text-amber-300'
          }`}
        >
          <span>{showDetails ? "Hide Tactical Breakdown" : "Why is this a bad move? (Tactical Breakdown)"}</span>
          {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        <span className="text-floor text-xs opacity-70 font-mono hidden sm:inline">
          Highlighted pits on board reveal opponent threats
        </span>
      </div>

      {/* Expandable Tactical Breakdown Card */}
      {showExplanations && showDetails && (
        <div className={`grid grid-cols-1 md:grid-cols-3 gap-2.5 sm:gap-3 p-3 rounded-xl border animate-in fade-in duration-150 ${
          currentSkin === 'porcelain'
            ? 'bg-[#faf2e6] border-[#e8d2b8]'
            : 'bg-black/40 border-white/10'
        }`}>
          {/* 1. Consequence */}
          <div className="flex flex-col gap-1 p-2 rounded-lg bg-rose-500/10 border border-rose-500/20">
            <div className="flex items-center gap-1.5 text-floor text-xs font-bold text-rose-400 uppercase tracking-wide">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>1. Immediate Consequence</span>
            </div>
            <p className="text-floor text-xs leading-relaxed opacity-90">
              {warning.explanation.consequence}
            </p>
          </div>

          {/* 2. Opponent Threat */}
          <div className="flex flex-col gap-1 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <div className="flex items-center gap-1.5 text-floor text-xs font-bold text-amber-400 uppercase tracking-wide">
              <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
              <span>2. Opponent Response</span>
            </div>
            <p className="text-floor text-xs leading-relaxed opacity-90">
              {warning.explanation.threat || "No immediate opponent capture, but concedes valuable tempo or defense."}
            </p>
          </div>

          {/* 3. Coach's Alternative */}
          <div className="flex flex-col gap-1 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <div className="flex items-center gap-1.5 text-floor text-xs font-bold text-emerald-400 uppercase tracking-wide">
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              <span>3. Better Line: {warning.bestMove.label}</span>
            </div>
            <p className="text-floor text-xs leading-relaxed opacity-90">
              {warning.explanation.recommendationComparison}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
