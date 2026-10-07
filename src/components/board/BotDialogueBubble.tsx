import React from 'react';
import { BotPersona } from '../../bots';
import { SkinTheme } from '../../theme';
import { X } from 'lucide-react';

interface BotDialogueBubbleProps {
  dialogue: { text: string; id: number } | null;
  bot: BotPersona;
  currentSkin: SkinTheme;
  theme: any;
  onDismiss?: () => void;
}

export const BotDialogueBubble: React.FC<BotDialogueBubbleProps> = ({
  dialogue,
  bot,
  currentSkin,
  theme,
  onDismiss
}) => {
  if (!dialogue || !dialogue.text) return null;

  return (
    <div 
      data-testid="bot-dialogue-bubble"
      className="relative z-40 animate-in fade-in zoom-in-95 duration-200 pointer-events-auto filter drop-shadow-2xl select-none"
    >
      <div className={`flex items-start gap-2 px-3 py-2 rounded-2xl border shadow-lg backdrop-blur-md max-w-sm sm:max-w-md ${
        currentSkin === 'porcelain'
          ? 'bg-[#ffffff]/95 border-[#d8cfbe] text-[#2c2723]'
          : currentSkin === 'high-contrast'
          ? 'bg-black border-2 border-white text-white'
          : 'bg-zinc-900/90 border-amber-500/30 text-zinc-100 shadow-[0_4px_20px_rgba(0,0,0,0.5)]'
      }`}>
        <span className="text-xl shrink-0 select-none" aria-hidden="true">
          {bot.avatar}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className={`text-[11px] font-extrabold uppercase tracking-wider ${
              currentSkin === 'porcelain' ? 'text-amber-800' : 'text-amber-400'
            }`}>
              {bot.name}
            </span>
          </div>
          <p className="text-xs font-medium leading-snug">
            "{dialogue.text}"
          </p>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            aria-label="Dismiss banter"
            className="p-1 rounded-lg opacity-50 hover:opacity-100 transition -mr-1 -mt-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      {/* Speech Balloon Pointer */}
      <div className={`w-2.5 h-2.5 rotate-45 border-b border-r -mt-1.5 ml-6 ${
        currentSkin === 'porcelain'
          ? 'bg-[#ffffff] border-[#d8cfbe]'
          : currentSkin === 'high-contrast'
          ? 'bg-black border-white'
          : 'bg-zinc-900 border-amber-500/30'
      }`} />
    </div>
  );
};
