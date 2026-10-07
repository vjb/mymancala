import React, { useState } from 'react';
import { Undo2, Lightbulb, RotateCcw, Bot, AlertTriangle } from 'lucide-react';
import { SkinTheme } from '../../theme';
import { useTranslation } from '../../i18n';

interface ActionBarProps {
  canUndo: boolean;
  onUndo: () => void;
  showHints: boolean;
  onToggleHints: () => void;
  onResetGame: () => void;
  gameMode: string;
  botName: string;
  isAiThinking: boolean;
  theme: any;
  currentSkin: SkinTheme;
}

export const ActionBar: React.FC<ActionBarProps> = ({
  canUndo,
  onUndo,
  showHints,
  onToggleHints,
  onResetGame,
  gameMode,
  botName,
  isAiThinking,
  theme,
  currentSkin
}) => {
  const { t } = useTranslation();
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);

  return (
    <div className={`w-full flex items-center justify-between gap-2 p-2 sm:p-3 rounded-2xl border shadow-md ${
      currentSkin === 'porcelain'
        ? 'bg-[#ffffff]/90 border-[#e5ded4]'
        : currentSkin === 'high-contrast'
        ? 'bg-black border-2 border-white'
        : 'bg-black/20 backdrop-blur-md border-white/10'
    }`}>
      {/* Left Action Buttons: Undo & Hint */}
      <div className="flex items-center gap-2">
        <button
          onClick={onUndo}
          disabled={!canUndo || isAiThinking}
          title={canUndo ? "Take back last move" : "No moves to undo"}
          className={`flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl border text-xs sm:text-sm font-bold transition shadow-xs ${
            canUndo && !isAiThinking
              ? currentSkin === 'porcelain'
                ? 'bg-stone-100 hover:bg-stone-200 text-[#2c2723] border-[#d8cfbe] active:scale-95'
                : 'bg-white/10 hover:bg-white/20 text-white border-white/20 active:scale-95'
              : 'opacity-40 cursor-not-allowed border-transparent bg-white/5 text-zinc-500'
          }`}
        >
          <Undo2 className="w-4 h-4" />
          <span>{t ? t('action.undo') || 'Undo' : 'Undo'}</span>
        </button>

        <button
          onClick={onToggleHints}
          data-testid="action-hint-toggle"
          title={showHints ? "Hide move hints" : "Show move hints"}
          className={`flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl border text-xs sm:text-sm font-bold transition shadow-xs ${
            showHints
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-[0_0_12px_rgba(245,158,11,0.25)]'
              : currentSkin === 'porcelain'
              ? 'bg-stone-100 hover:bg-stone-200 text-[#2c2723] border-[#d8cfbe]'
              : 'bg-white/10 hover:bg-white/15 text-stone-300 border-white/10'
          }`}
        >
          <Lightbulb className={`w-4 h-4 ${showHints ? 'text-amber-400 fill-amber-400/30' : ''}`} />
          <span>{showHints ? 'Hints On' : 'Hints Off'}</span>
        </button>
      </div>

      {/* Center: Bot Status Indicator */}
      <div className={`hidden sm:flex items-center gap-2 px-3 py-1 rounded-xl border text-xs font-semibold ${
        currentSkin === 'porcelain'
          ? 'bg-stone-100 border-[#d8cfbe] text-[#2c2723]'
          : currentSkin === 'high-contrast'
          ? 'bg-black border border-white text-white'
          : 'bg-black/20 border-white/10 text-white/90'
      }`}>
        <Bot className="w-3.5 h-3.5 opacity-80" />
        <span>
          {gameMode === 'pve' ? `Opponent: ${botName}` : 'Two Player Pass & Play'}
        </span>
      </div>

      {/* Right: New Game Confirmation */}
      <div className="relative">
        <button
          onClick={() => setConfirmResetOpen(true)}
          data-testid="action-new-game-btn"
          title="Start a new game"
          className={`flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl border text-xs sm:text-sm font-bold transition shadow-xs ${
            currentSkin === 'porcelain'
              ? 'bg-stone-200 hover:bg-stone-300 text-stone-800 border-stone-300'
              : 'bg-white/10 hover:bg-rose-500/20 hover:border-rose-500/40 text-stone-300 hover:text-rose-200 border-white/15'
          }`}
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>New Game</span>
        </button>

        {/* Confirmation Popover */}
        {confirmResetOpen && (
          <div className="absolute right-0 bottom-full mb-2 z-50 p-3 w-64 rounded-2xl border bg-zinc-900 border-zinc-700 shadow-2xl text-left">
            <div className="flex items-start gap-2 mb-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs text-zinc-200">
                Start a fresh game? Your current board progress will be reset.
              </div>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setConfirmResetOpen(false)}
                className="px-2.5 py-1 text-xs rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setConfirmResetOpen(false);
                  onResetGame();
                }}
                className="px-2.5 py-1 text-xs rounded-lg font-bold bg-rose-600 hover:bg-rose-500 text-white"
              >
                Reset
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
