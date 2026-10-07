import React, { useRef, useEffect, useState } from 'react';
import {
  X, Trophy, ArrowRight, Zap, Target, CheckCircle2, BookOpen, HelpCircle, History, ExternalLink
} from 'lucide-react';
import { haptics } from './haptics';
import { useTranslation } from './i18n';
import { trapFocus } from './lib/a11y';
import { CULTURAL_STORIES } from './stories';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSkin?: string;
  onOpenTutorial?: () => void;
  onOpenLegend?: () => void;
}

export const RulesModal: React.FC<RulesModalProps> = ({
  isOpen,
  onClose,
  currentSkin = 'walnut',
  onOpenTutorial,
  onOpenLegend
}) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'rules' | 'stories'>('rules');
  const contentRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && contentRef.current) {
      contentRef.current.scrollTop = 0;
    }
  }, [isOpen, activeTab]);

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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="rules-modal-title"
    >
      <div
        ref={modalRef}
        className="w-full max-w-lg bg-zinc-900 border border-zinc-700/80 rounded-2xl sm:rounded-3xl shadow-2xl text-zinc-100 flex flex-col max-h-[88vh] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 sm:py-3.5 border-b border-zinc-800 bg-zinc-950/80 shrink-0">
          <div className="flex items-center gap-2 sm:gap-2.5">
            <div className="p-1.5 sm:p-2 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
              <BookOpen className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h2 id="rules-modal-title" className="text-sm sm:text-base font-bold tracking-tight text-white flex items-center gap-1.5">
                {t('rules.title')}
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  {t('rules.badge')}
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                {t('rules.subtitle')}
              </p>
            </div>
          </div>
          <button
            onClick={() => { haptics.tap(); onClose(); }}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition"
            aria-label={t('rules.close')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher & Quick Launchers */}
        <div className="px-4 py-2 border-b border-zinc-800/80 bg-zinc-950/50 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1 bg-zinc-900/90 p-1 rounded-xl border border-zinc-800">
            <button
              onClick={() => setActiveTab('rules')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                activeTab === 'rules'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              How to Play
            </button>
            <button
              onClick={() => setActiveTab('stories')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'stories'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              About the Game
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            {onOpenTutorial && (
              <button
                data-testid="rules-tutorial-btn"
                onClick={() => { onClose(); onOpenTutorial(); }}
                className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 py-1 px-2 rounded-lg bg-amber-500/10 border border-amber-500/20 transition"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>{t('rules.openTutorial')}</span>
              </button>
            )}
            {onOpenLegend && (
              <button
                onClick={() => { onClose(); onOpenLegend(); }}
                className="text-xs font-semibold text-zinc-400 hover:text-zinc-200 flex items-center gap-1 py-1 px-2 rounded-lg border border-zinc-800 hover:bg-zinc-800 transition"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Legend</span>
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Content */}
        <div
          ref={contentRef}
          className="flex-1 overflow-y-auto px-3.5 sm:px-5 py-3 sm:py-4 space-y-2.5 sm:space-y-3.5 text-xs overscroll-contain"
        >
          {activeTab === 'stories' ? (
            <div className="space-y-3.5">
              {CULTURAL_STORIES.map(story => (
                <div key={story.id} className="p-3.5 rounded-xl bg-zinc-800/60 border border-zinc-700/60 flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <h3 className="font-bold text-sm text-amber-300">{story.title.en}</h3>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-semibold">
                      {story.region}
                    </span>
                  </div>
                  {story.body.en.map((paragraph, idx) => (
                    <p key={idx} className="text-zinc-300 leading-relaxed text-xs">
                      {paragraph}
                    </p>
                  ))}
                  <div className="mt-1 pt-2 border-t border-zinc-700/50 flex flex-col gap-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                      Academic Sources & Historical Documentation:
                    </span>
                    {story.sources.map((src, sIdx) => (
                      <div key={sIdx} className="text-xs text-zinc-400 italic">
                        • {src.author} ({src.year}). <em>{src.work}</em>{src.publisher ? `. ${src.publisher}` : ''}.
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
          {/* Card 1: The Goal */}
          <div className="p-3 sm:p-3.5 rounded-xl bg-zinc-800/60 border border-zinc-700/60 flex items-start gap-2.5 sm:gap-3">
            <div className="p-1.5 sm:p-2 rounded-lg bg-amber-500/20 text-amber-400 shrink-0 mt-0.5">
              <Trophy className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-sm text-zinc-100">{t('rules.goalTitle')}</div>
              <p className="text-zinc-300 mt-1 leading-relaxed">
                {t('rules.goalBody')}
              </p>
            </div>
          </div>

          {/* Card 2: Sowing Seeds */}
          <div className="p-3 sm:p-3.5 rounded-xl bg-zinc-800/60 border border-zinc-700/60 flex items-start gap-2.5 sm:gap-3">
            <div className="p-1.5 sm:p-2 rounded-lg bg-blue-500/20 text-blue-400 shrink-0 mt-0.5">
              <ArrowRight className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-sm text-zinc-100">{t('rules.sowingTitle')}</div>
              <p className="text-zinc-300 mt-1 leading-relaxed">
                {t('rules.sowingBody')}
              </p>
              <div className="mt-1.5 text-xs p-2 rounded-lg bg-zinc-900/80 border border-zinc-800 text-zinc-300">
                {t('rules.storeRule')}
              </div>
            </div>
          </div>

          {/* Card 3: Free Turn */}
          <div className="p-3 sm:p-3.5 rounded-xl bg-zinc-800/60 border border-zinc-700/60 flex items-start gap-2.5 sm:gap-3">
            <div className="p-1.5 sm:p-2 rounded-lg bg-emerald-500/20 text-emerald-400 shrink-0 mt-0.5">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-sm text-zinc-100 flex items-center gap-1.5">
                <span>{t('rules.freeTurnTitle')}</span>
                <span className="text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full font-bold whitespace-nowrap">
                  {t('rules.freeTurnBadge')}
                </span>
              </div>
              <p className="text-zinc-300 mt-1 leading-relaxed">
                {t('rules.freeTurnBody')}
              </p>
            </div>
          </div>

          {/* Card 4: Opposite Pit Capture */}
          <div className="p-3 sm:p-3.5 rounded-xl bg-zinc-800/60 border border-zinc-700/60 flex items-start gap-2.5 sm:gap-3">
            <div className="p-1.5 sm:p-2 rounded-lg bg-rose-500/20 text-rose-400 shrink-0 mt-0.5">
              <Target className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-sm text-zinc-100 flex items-center gap-1.5">
                <span>{t('rules.captureTitle')}</span>
                <span className="text-xs bg-rose-500/20 text-rose-300 border border-rose-500/40 px-2 py-0.5 rounded-full font-bold whitespace-nowrap">
                  {t('rules.captureBadge')}
                </span>
              </div>
              <p className="text-zinc-300 mt-1 leading-relaxed">
                {t('rules.captureBody')}
              </p>
            </div>
          </div>

          {/* Card 5: Game End */}
          <div className="p-3 sm:p-3.5 rounded-xl bg-zinc-800/60 border border-zinc-700/60 flex items-start gap-2.5 sm:gap-3">
            <div className="p-1.5 sm:p-2 rounded-lg bg-purple-500/20 text-purple-400 shrink-0 mt-0.5">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-sm text-zinc-100">{t('rules.endgameTitle')}</div>
              <p className="text-zinc-300 mt-1 leading-relaxed">
                {t('rules.endgameBody')}
              </p>
            </div>
          </div>
          </>
          )}
        </div>

        {/* Action Footer */}
        <div className="px-5 py-3.5 border-t border-zinc-800 bg-zinc-950 flex items-center justify-between gap-3">
          <span className="text-xs text-zinc-400">
            {t('rules.footerNote')}
          </span>
          <button
            onClick={() => {
              haptics.tap();
              onClose();
            }}
            className="py-2 px-5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-bold shadow-lg shadow-amber-500/20 transition active:scale-95"
          >
            {t('rules.playBtn')}
          </button>
        </div>
      </div>
    </div>
  );
};
