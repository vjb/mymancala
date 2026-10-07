import React, { useEffect, useRef } from 'react';
import { X, Sparkles, Smile, Play, Target, Cpu } from 'lucide-react';
import { useTranslation } from '../../i18n';
import { trapFocus } from '../../lib/a11y';
import { SkinTheme, THEMES } from '../../theme';

export type AudienceProfile = 'kid' | 'casual' | 'learner' | 'analyst';

export const ONBOARDING_STORAGE_KEY = 'mancala_onboarding_v1';

interface AudiencePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProfile: (profile: AudienceProfile) => void;
  currentSkin?: SkinTheme;
}

export const AudiencePickerModal: React.FC<AudiencePickerModalProps> = ({
  isOpen,
  onClose,
  onSelectProfile,
  currentSkin = 'walnut'
}) => {
  const { t } = useTranslation();
  const theme = THEMES[currentSkin] || THEMES.walnut;
  const modalRef = useRef<HTMLDivElement>(null);

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

  const profiles: {
    id: AudienceProfile;
    icon: React.ReactNode;
    titleKey: string;
    descKey: string;
    badge: string;
    borderAccent: string;
  }[] = [
    {
      id: 'kid',
      icon: <Smile className="w-6 h-6 text-emerald-400" />,
      titleKey: 'audience.kid.title',
      descKey: 'audience.kid.desc',
      badge: 'Forgiving & Tactile',
      borderAccent: 'hover:border-emerald-400/80 hover:bg-emerald-500/10'
    },
    {
      id: 'casual',
      icon: <Play className="w-6 h-6 text-amber-400" />,
      titleKey: 'audience.casual.title',
      descKey: 'audience.casual.desc',
      badge: 'Pure Mancala',
      borderAccent: 'hover:border-amber-400/80 hover:bg-amber-500/10'
    },
    {
      id: 'learner',
      icon: <Target className="w-6 h-6 text-sky-400" />,
      titleKey: 'audience.learner.title',
      descKey: 'audience.learner.desc',
      badge: 'Coach & Hints',
      borderAccent: 'hover:border-sky-400/80 hover:bg-sky-500/10'
    },
    {
      id: 'analyst',
      icon: <Cpu className="w-6 h-6 text-indigo-400" />,
      titleKey: 'audience.analyst.title',
      descKey: 'audience.analyst.desc',
      badge: 'Deep Lookahead',
      borderAccent: 'hover:border-indigo-400/80 hover:bg-indigo-500/10'
    }
  ];

  const handleChoose = (id: AudienceProfile) => {
    try {
      localStorage.setItem(
        ONBOARDING_STORAGE_KEY,
        JSON.stringify({ completed: true, audience: id, timestamp: Date.now() })
      );
    } catch {}
    onSelectProfile(id);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="audience-picker-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-lg ${theme.cardBg} border ${theme.cardBorder} rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col max-h-[92vh] overflow-y-auto`}
      >
        <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <h2 id="audience-picker-title" className="text-base sm:text-lg font-bold text-white">
                {t('audience.title')}
              </h2>
            </div>
            <p className={`text-xs ${theme.cardTextMuted}`}>{t('audience.subtitle')}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close audience picker"
            className="p-1.5 rounded-full hover:bg-white/10 transition text-slate-300 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3">
          {profiles.map((p) => (
            <button
              key={p.id}
              data-testid={`audience-profile-${p.id}`}
              onClick={() => handleChoose(p.id)}
              className={`w-full text-left p-3.5 rounded-2xl border border-white/10 bg-white/5 transition-all flex items-start gap-3.5 ${p.borderAccent} active:scale-[0.99]`}
            >
              <div className="p-2.5 rounded-xl bg-white/5 shrink-0">{p.icon}</div>
              <div className="flex-1">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h3 className="text-xs sm:text-sm font-bold text-white">{t(p.titleKey as any)}</h3>
                  <span className="text-floor text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-white/10 text-slate-300">
                    {p.badge}
                  </span>
                </div>
                <p className={`text-xs leading-relaxed ${theme.cardTextMuted}`}>{t(p.descKey as any)}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
