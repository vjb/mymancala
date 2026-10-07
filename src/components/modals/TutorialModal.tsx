import React, { useState, useEffect, useRef } from 'react';
import { X, Volume2, ArrowLeft, ArrowRight, RotateCcw, CheckCircle } from 'lucide-react';
import { TUTORIAL_STEPS, applyMiniMove, MINI_P1_PITS } from '../../tutorial/miniKalah';
import { useTranslation } from '../../i18n';
import { speech } from '../../lib/speech';
import { trapFocus } from '../../lib/a11y';
import { SkinTheme, THEMES } from '../../theme';

interface TutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
  currentSkin?: SkinTheme;
}

export const TutorialModal: React.FC<TutorialModalProps> = ({
  isOpen,
  onClose,
  onComplete,
  currentSkin = 'walnut'
}) => {
  const { t, locale } = useTranslation();
  const theme = THEMES[currentSkin] || THEMES.walnut;
  const modalRef = useRef<HTMLDivElement>(null);

  const [stepIndex, setStepIndex] = useState(0);
  const currentStep = TUTORIAL_STEPS[stepIndex];

  const [board, setBoard] = useState<number[]>(currentStep.initialBoard);
  const [stepSuccess, setStepSuccess] = useState(false);
  const [lastMoveSummary, setLastMoveSummary] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setBoard([...currentStep.initialBoard]);
    setStepSuccess(currentStep.allowedMovePit === null);
    setLastMoveSummary(null);
  }, [isOpen, stepIndex, currentStep]);

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

  const handlePitClick = (pitIndex: number) => {
    if (currentStep.allowedMovePit === null) return;
    if (pitIndex !== currentStep.allowedMovePit) return;

    const result = applyMiniMove({ board, turn: 0, over: false }, pitIndex);
    setBoard(result.state.board);
    setStepSuccess(true);

    if (result.earnedFreeTurn) {
      setLastMoveSummary(t('turn.freeTurnBonus'));
    } else if (result.capturedStones > 0) {
      setLastMoveSummary(`Captured ${result.capturedStones} stones!`);
    } else {
      setLastMoveSummary('Move completed!');
    }
  };

  const handleNext = () => {
    if (stepIndex < TUTORIAL_STEPS.length - 1) {
      setStepIndex(stepIndex + 1);
    } else {
      onClose();
      onComplete?.();
    }
  };

  const handlePrev = () => {
    if (stepIndex > 0) {
      setStepIndex(stepIndex - 1);
    }
  };

  const handleRestartStep = () => {
    setBoard([...currentStep.initialBoard]);
    setStepSuccess(currentStep.allowedMovePit === null);
    setLastMoveSummary(null);
  };

  const handleSpeak = () => {
    const textToSpeak = `${t(currentStep.titleKey as any)}. ${t(currentStep.descKey as any)} ${t(currentStep.actionKey as any)}`;
    speech.speak(textToSpeak, locale);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="tutorial-step-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/85 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-lg ${theme.cardBg} border ${theme.cardBorder} rounded-3xl p-4 sm:p-6 shadow-2xl flex flex-col max-h-[92vh] overflow-y-auto`}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-2.5 border-b border-white/10 mb-3">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold font-mono">
              {t('tutorial.stepOf', { current: stepIndex + 1, total: TUTORIAL_STEPS.length })}
            </span>
            <button
              onClick={handleSpeak}
              aria-label={t('tutorial.speak')}
              className="p-1 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition"
              title={t('tutorial.speak')}
            >
              <Volume2 className="w-4 h-4 text-amber-400" />
            </button>
          </div>
          <button
            onClick={onClose}
            aria-label={t('tutorial.skip')}
            className="text-xs font-semibold px-2 py-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition"
          >
            {t('tutorial.skip')}
          </button>
        </div>

        {/* Step Title & Instruction */}
        <div className="mb-3">
          <h2 id="tutorial-step-title" className="text-sm sm:text-base font-bold text-white mb-1">
            {t(currentStep.titleKey as any)}
          </h2>
          <p className={`text-xs sm:text-sm leading-relaxed ${theme.cardTextMuted} mb-2`}>
            {t(currentStep.descKey as any)}
          </p>
          <div className="p-2 sm:p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200 flex items-center gap-2">
            <span className="font-bold shrink-0">👉</span>
            <span>{t(currentStep.actionKey as any)}</span>
          </div>
        </div>

        {/* 2x3 Mini-Kalah Board - EXPLICITLY dir="ltr" SO BOARD NEVER MIRRORS IN RTL! */}
        <div
          dir="ltr"
          className="my-2 p-2.5 sm:p-4 rounded-2xl bg-black/40 border border-white/15 flex items-center justify-between gap-1.5 sm:gap-3 select-none"
        >
          {/* North Store (Index 7) - Opponent's store on Left */}
          <div
            data-testid="tutorial-store-7"
            className="w-10 sm:w-14 h-28 sm:h-36 rounded-xl sm:rounded-2xl border-2 border-white/20 bg-black/60 flex flex-col items-center justify-between p-1.5 shrink-0"
          >
            <span className="text-floor text-xs font-mono font-bold text-slate-400">N-STORE</span>
            <span className="text-sm sm:text-lg font-mono font-black text-cyan-300">{board[7]}</span>
            <span className="text-floor text-xs text-slate-500 font-mono">P2</span>
          </div>

          {/* Central Pits Grid */}
          <div className="flex-1 flex flex-col gap-1.5 sm:gap-2">
            {/* North Pits: 6, 5, 4 */}
            <div className="grid grid-cols-3 gap-1.5">
              {[6, 5, 4].map((pit) => (
                <div
                  key={pit}
                  className="h-12 sm:h-16 rounded-xl border border-white/10 bg-white/5 flex flex-col items-center justify-between p-1 opacity-70"
                >
                  <span className="text-floor text-xs font-mono text-slate-400">P{pit - 3}</span>
                  <span className="text-xs sm:text-sm font-mono font-bold text-slate-300">{board[pit]}</span>
                </div>
              ))}
            </div>

            {/* South Pits: 0, 1, 2 */}
            <div className="grid grid-cols-3 gap-1.5">
              {[0, 1, 2].map((pit) => {
                const isTarget = currentStep.allowedMovePit === pit && !stepSuccess;
                return (
                  <button
                    key={pit}
                    data-testid={`tutorial-pit-${pit}`}
                    onClick={() => handlePitClick(pit)}
                    disabled={currentStep.allowedMovePit === null || stepSuccess}
                    className={`h-12 sm:h-16 rounded-xl border flex flex-col items-center justify-between p-1 transition-all ${
                      isTarget
                        ? 'border-amber-400 bg-amber-500/25 ring-2 ring-amber-400 animate-pulse cursor-pointer shadow-lg shadow-amber-500/30'
                        : 'border-white/20 bg-white/10 cursor-default'
                    }`}
                  >
                    <span className="text-floor text-xs font-mono font-bold text-amber-300">Pit {pit + 1}</span>
                    <span className="text-xs sm:text-sm font-mono font-black text-white">{board[pit]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* South Store (Index 3) - Your store on Right */}
          <div
            data-testid="tutorial-store-3"
            className="w-10 sm:w-14 h-28 sm:h-36 rounded-xl sm:rounded-2xl border-2 border-amber-400/60 bg-amber-950/30 flex flex-col items-center justify-between p-1.5 shrink-0"
          >
            <span className="text-floor text-xs font-mono font-bold text-amber-400">YOURS</span>
            <span className="text-sm sm:text-lg font-mono font-black text-amber-300">{board[3]}</span>
            <span className="text-floor text-xs text-amber-400/80 font-mono">P1</span>
          </div>
        </div>

        {/* Feedback / Success Notice */}
        {stepSuccess && currentStep.allowedMovePit !== null && (
          <div className="mt-2 p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-xs text-emerald-300 flex items-center justify-between gap-2 animate-fade-in">
            <div className="flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{currentStep.successKey ? t(currentStep.successKey as any) : lastMoveSummary}</span>
            </div>
            <button
              onClick={handleRestartStep}
              className="p-1 rounded hover:bg-emerald-500/20 text-emerald-300"
              title={t('tutorial.restart')}
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Controls Footer */}
        <div className="pt-3 mt-3 border-t border-white/10 flex items-center justify-between gap-2">
          <button
            onClick={handlePrev}
            disabled={stepIndex === 0}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition ${
              stepIndex === 0 ? 'opacity-40 cursor-not-allowed border-white/5' : 'hover:bg-white/10 border-white/15 text-slate-200'
            }`}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{t('tutorial.prev')}</span>
          </button>

          <button
            data-testid="tutorial-next-btn"
            onClick={handleNext}
            disabled={!stepSuccess}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-md ${
              stepSuccess
                ? 'bg-amber-600 hover:bg-amber-500 text-white active:scale-95'
                : 'bg-white/10 text-slate-400 cursor-not-allowed opacity-50'
            }`}
          >
            <span>{stepIndex === TUTORIAL_STEPS.length - 1 ? t('tutorial.complete') : t('tutorial.next')}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
