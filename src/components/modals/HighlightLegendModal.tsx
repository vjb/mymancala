import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { trapFocus } from '../../lib/a11y';
import { SkinTheme, THEMES } from '../../theme';

interface HighlightLegendModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSkin: SkinTheme;
}

export const HighlightLegendModal: React.FC<HighlightLegendModalProps> = ({
  isOpen,
  onClose,
  currentSkin
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const theme = THEMES[currentSkin] || THEMES.walnut;

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (modalRef.current) {
        trapFocus(modalRef.current, e, onClose);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const items = [
    {
      title: 'Playable Pit',
      desc: 'Legal pit on your side with stones ready to sow.',
      sampleClass: 'ring-2 ring-amber-400/80 bg-amber-500/10',
      badge: null
    },
    {
      title: 'Best Move (★)',
      desc: 'Top engine recommendation when hints or tactical coach is active.',
      sampleClass: 'ring-2 ring-emerald-400 bg-emerald-500/20',
      badge: { text: '★ BEST', color: 'bg-emerald-500/30 text-emerald-300 border-emerald-500/50' }
    },
    {
      title: 'Move Preview',
      desc: 'The source pit you are currently holding or hovering.',
      sampleClass: 'ring-2 ring-amber-400 bg-amber-500/30',
      badge: null
    },
    {
      title: 'Landing Pit (LAND)',
      desc: 'Where the final dropped pebble will land at the end of the move.',
      sampleClass: 'ring-2 ring-emerald-400 bg-emerald-500/20 animate-pulse',
      badge: { text: 'LAND', color: 'bg-emerald-500/30 text-emerald-300 border-emerald-500/50' }
    },
    {
      title: 'Captured Pit (CAPT)',
      desc: 'Opponent pit captured into your Kalah store.',
      sampleClass: 'ring-2 ring-rose-500 bg-rose-950/40 animate-pulse',
      badge: { text: 'CAPT', color: 'bg-rose-500/30 text-rose-300 border-rose-500/50' }
    },
    {
      title: 'Last Move (LAST)',
      desc: 'The pit that was sown on the previous turn (fades away automatically).',
      sampleClass: 'ring-1 ring-dashed ring-white/40 border-white/30',
      badge: { text: 'LAST', color: 'bg-white/20 text-white border-white/30' }
    },
    {
      title: 'Tactical Threat (THREAT)',
      desc: 'Opponent pit posing an immediate capture or bonus turn threat.',
      sampleClass: 'ring-2 ring-dashed ring-amber-500/70 bg-amber-500/10',
      badge: { text: 'THREAT', color: 'bg-amber-500/30 text-amber-300 border-amber-500/50' }
    }
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="legend-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-lg ${theme.cardBg} border ${theme.cardBorder} rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col max-h-[90vh] overflow-y-auto`}
      >
        <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
          <div>
            <h2 id="legend-modal-title" className="text-base sm:text-lg font-bold">
              Board Highlights Guide
            </h2>
            <p className={`text-xs ${theme.cardTextMuted}`}>
              Clean visual cues explain each highlight type at a glance
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close highlights guide"
            className="p-1.5 rounded-full hover:bg-white/10 transition text-slate-300 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3 flex-1 overflow-y-auto pr-1">
          {items.map((item) => (
            <div
              key={item.title}
              className="flex items-start gap-3 p-2.5 rounded-2xl bg-white/5 border border-white/5"
            >
              <div
                className={`w-12 h-12 rounded-xl shrink-0 flex items-center justify-center ${item.sampleClass}`}
              >
                {item.badge ? (
                  <span
                    className={`text-xs px-1 py-0.5 rounded font-extrabold border ${item.badge.color}`}
                  >
                    {item.badge.text}
                  </span>
                ) : (
                  <div className="w-3 h-3 rounded-full bg-amber-400" />
                )}
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-white mb-0.5">{item.title}</h3>
                <p className={`text-xs leading-relaxed ${theme.cardTextMuted}`}>{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="pt-4 mt-4 border-t border-white/10 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs transition"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};
