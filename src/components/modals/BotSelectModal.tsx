import React, { useEffect, useRef } from 'react';
import { X, Check, Bot, Zap, Swords, Award, Shield, Sparkles } from 'lucide-react';
import { BOT_PERSONAS, BotPersona } from '../../bots';
import { SkinTheme } from '../../theme';
import { BOT_RATINGS, loadRatingProfile } from '../../trainer/rating';
import { haptics } from '../../haptics';

interface BotSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedBotId: string;
  onSelectBot: (botId: string) => void;
  currentSkin: SkinTheme;
  theme: any;
}

export const BotSelectModal: React.FC<BotSelectModalProps> = ({
  isOpen,
  onClose,
  selectedBotId,
  onSelectBot,
  currentSkin,
  theme,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const ratingProfile = loadRatingProfile();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const botList = Object.values(BOT_PERSONAS);

  const handlePickBot = (botId: string) => {
    haptics.tap();
    onSelectBot(botId);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        ref={modalRef}
        data-testid="bot-select-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Choose AI Opponent"
        className={`w-full max-w-lg rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${theme.cardBg} ${theme.cardBorder} ${theme.appText}`}
      >
        {/* Header */}
        <div className={`p-4 border-b ${theme.cardBorder} flex items-center justify-between shrink-0`}>
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-2xl flex items-center justify-center border ${
              currentSkin === 'porcelain' ? 'bg-stone-200 border-stone-300 text-stone-800' : 'bg-white/10 border-white/15 text-amber-300'
            }`}>
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-base sm:text-lg">Choose Your Opponent</h2>
              <p className={`text-xs ${theme.cardTextMuted}`}>Select an AI personality to match your skill level</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 rounded-xl hover:bg-white/10 opacity-70 hover:opacity-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Bot Cards List */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2.5">
          {botList.map((bot) => {
            const isSelected = bot.id === selectedBotId;
            const rating = BOT_RATINGS[bot.id.toLowerCase()] || (800 + bot.depth * 130);
            const headToHeadMatches = ratingProfile.history.filter(h => h.opponentId.toLowerCase() === bot.id.toLowerCase());
            const wins = headToHeadMatches.filter(h => h.result === 1).length;
            const losses = headToHeadMatches.filter(h => h.result === 0).length;

            return (
              <div
                key={bot.id}
                data-testid={`bot-card-${bot.id}`}
                onClick={() => handlePickBot(bot.id)}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer select-none flex flex-col gap-2 relative ${
                  isSelected
                    ? currentSkin === 'porcelain'
                      ? 'bg-amber-100/80 border-amber-500 shadow-md ring-2 ring-amber-400/50'
                      : 'bg-amber-500/15 border-amber-500/60 shadow-lg ring-2 ring-amber-400/40'
                    : currentSkin === 'porcelain'
                    ? 'bg-white hover:bg-stone-50 border-[#ded5c6]'
                    : 'bg-white/5 hover:bg-white/10 border-white/10'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl sm:text-3xl p-1 rounded-xl bg-black/10 border border-white/5 shadow-xs">
                      {bot.avatar}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm sm:text-base tracking-tight">{bot.name}</span>
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${bot.badgeColor}`}>
                          {rating} Elo
                        </span>
                      </div>
                      <div className={`text-xs ${theme.cardTextMuted} font-medium`}>
                        {bot.title} • Depth {bot.depth}
                      </div>
                    </div>
                  </div>

                  {isSelected ? (
                    <div className="w-7 h-7 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center font-bold shadow-xs">
                      <Check className="w-4 h-4 stroke-[3]" />
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-white/15 bg-white/5 hover:bg-white/15 transition"
                    >
                      Select
                    </button>
                  )}
                </div>

                <p className={`text-xs ${theme.cardTextMuted} leading-relaxed`}>
                  {bot.tagline}
                </p>

                {/* Head-to-Head & Quote Preview */}
                <div className="flex items-center justify-between text-[11px] pt-1 border-t border-white/5 font-mono">
                  <span className="italic opacity-80 truncate max-w-[260px]">
                    "{bot.quotes.start[0]}"
                  </span>
                  <span className="shrink-0 opacity-75">
                    H2H: {wins}W - {losses}L
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className={`p-3 border-t ${theme.cardBorder} flex justify-end shrink-0`}>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
