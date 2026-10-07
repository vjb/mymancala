import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Sparkles, Trophy, CheckCircle2, AlertTriangle, ArrowRight, RotateCcw, Brain, Check, Calendar } from 'lucide-react';
import { MistakeRecord, getDueDrills, answerDrill, loadMistakes } from '../../trainer/mistakes';
import { Board } from '../board/Board';
import { SkinTheme } from '../../theme';
import { kalahRuleSet } from '../../rules';
import { useTranslation } from '../../i18n';
import { explain } from '../../trainer/explain';
import { haptics } from '../../haptics';
import { GameState, Player } from '../../rules/types';

interface DrillViewProps {
  theme: any;
  currentSkin: SkinTheme;
  colorblindSafe?: boolean;
  onClose?: () => void;
}

export const DrillView: React.FC<DrillViewProps> = ({
  theme,
  currentSkin,
  colorblindSafe = false,
  onClose,
}) => {
  const { t } = useTranslation();
  const [drills, setDrills] = useState<MistakeRecord[]>(() => getDueDrills());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answeredState, setAnsweredState] = useState<{
    answered: boolean;
    correct: boolean;
    chosenPit: number | null;
  }>({
    answered: false,
    correct: false,
    chosenPit: null,
  });

  const isMoveLockedRef = useRef(false);

  useEffect(() => {
    setDrills(getDueDrills());
    setCurrentIndex(0);
    setAnsweredState({ answered: false, correct: false, chosenPit: null });
  }, []);

  const currentDrill = drills[currentIndex] as MistakeRecord | undefined;

  const currentGameState: GameState | null = useMemo(() => {
    if (!currentDrill) return null;
    return {
      board: [...currentDrill.position],
      turn: (currentDrill.turn ?? 0) as Player,
      over: false,
    };
  }, [currentDrill]);

  const explanationItems = useMemo(() => {
    if (!currentGameState || !currentDrill) return [];
    try {
      const pitToExplain = answeredState.answered && !answeredState.correct && answeredState.chosenPit !== null
        ? answeredState.chosenPit
        : currentDrill.best;
      return explain(kalahRuleSet, currentGameState, pitToExplain);
    } catch {
      return [];
    }
  }, [currentGameState, currentDrill, answeredState]);

  const handlePitClick = (pit: number) => {
    if (!currentDrill || answeredState.answered) return;

    // Must click player's own pit
    const owner = kalahRuleSet.layout.pitOwner(pit);
    if (owner !== currentDrill.turn) return;

    const isCorrect = pit === currentDrill.best;
    if (isCorrect) {
      haptics.freeTurn();
      answerDrill(currentDrill.id, true);
    } else {
      haptics.blunder();
      answerDrill(currentDrill.id, false);
    }

    setAnsweredState({
      answered: true,
      correct: isCorrect,
      chosenPit: pit,
    });
  };

  const handleNext = () => {
    const updated = getDueDrills();
    setDrills(updated);
    if (currentIndex + 1 < updated.length) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setCurrentIndex(0);
    }
    setAnsweredState({ answered: false, correct: false, chosenPit: null });
  };

  const handleRetry = () => {
    setAnsweredState({ answered: false, correct: false, chosenPit: null });
  };

  if (!currentDrill || drills.length === 0) {
    return (
      <div
        data-testid="drill-view"
        className="p-6 rounded-3xl border border-white/10 bg-slate-900/60 backdrop-blur-xl flex flex-col items-center justify-center text-center py-12 space-y-4"
      >
        <div className="w-16 h-16 rounded-2xl bg-amber-500/20 text-amber-300 flex items-center justify-center border border-amber-500/30">
          <Brain className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <h3 className="text-base sm:text-lg font-bold text-slate-100">Zero Mistakes In Queue</h3>
          <p className="text-xs sm:text-sm text-slate-400 max-w-sm">
            Play games against bots or friends. Whenever a tactical inaccuracy, mistake, or blunder occurs, it will automatically appear here for spaced-repetition practice!
          </p>
        </div>
      </div>
    );
  }

  const boxLabel = currentDrill.box === 1
    ? 'Box 1 • Daily Review'
    : currentDrill.box === 2
      ? 'Box 2 • 3-Day Review'
      : 'Box 3 • 7-Day Review';

  const boxBadgeColor = currentDrill.box === 1
    ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
    : currentDrill.box === 2
      ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
      : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';

  return (
    <div
      data-testid="drill-view"
      className="p-4 sm:p-6 rounded-3xl border border-white/10 bg-slate-900/80 backdrop-blur-2xl shadow-2xl flex flex-col gap-4 animate-in fade-in"
    >
      {/* Top Bar: Leitner Box & Progress */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            <Brain className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
              Tactical Drill #{currentIndex + 1} of {drills.length}
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              <span
                data-testid="drill-box-badge"
                className={`text-floor text-xs px-2 py-0.5 rounded-full font-semibold border ${boxBadgeColor}`}
              >
                {boxLabel}
              </span>
              <span className="text-floor text-xs text-slate-400">
                Solved: {currentDrill.solved}x
              </span>
            </div>
          </div>
        </div>

        {answeredState.answered && (
          <button
            data-testid="drill-next-btn"
            onClick={handleNext}
            className="ml-auto px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg transition flex items-center gap-1.5 active:scale-95"
          >
            <span>Next Drill</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Interactive Board */}
      <div className="rounded-2xl border border-white/10 bg-black/30 p-2 sm:p-4">
        <Board
          displayBoard={[...currentDrill.position]}
          currentPlayer={currentDrill.turn}
          isGameOver={false}
          animatingState={null}
          isMoveLocked={isMoveLockedRef}
          analysisResults={[]}
          showHints={false}
          showThreats={false}
          hoverPreview={null}
          hoveredPit={null}
          setHoveredPit={() => {}}
          tutorWarning={null}
          lastMovedPit={answeredState.chosenPit}
          gameMode="pvp"
          onPitClick={handlePitClick}
          onSandboxAdjust={() => {}}
          theme={theme}
          currentSkin={currentSkin}
        />
      </div>

      {/* Feedback Banner */}
      {answeredState.answered && (
        <div
          data-testid="drill-result"
          className={`p-3.5 sm:p-4 rounded-2xl border flex flex-col gap-2 animate-in slide-in-from-top-2 duration-200 ${
            answeredState.correct
              ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-200'
              : 'bg-rose-950/70 border-rose-500/50 text-rose-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {answeredState.correct ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span className="font-extrabold text-sm text-emerald-300">
                    ★ Best Move Found!
                  </span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
                  <span className="font-extrabold text-sm text-rose-300">
                    Not Quite! Optimal was {kalahRuleSet.layout.label(currentDrill.best)}
                  </span>
                </>
              )}
            </div>

            {!answeredState.correct && (
              <button
                onClick={handleRetry}
                className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Retry</span>
              </button>
            )}
          </div>

          {/* Tactical Explanation */}
          {explanationItems.length > 0 && (
            <div className="text-xs space-y-1 opacity-90 border-t border-white/10 pt-2">
              {explanationItems.map((item, idx) => (
                <div key={idx} className="flex items-start gap-1.5">
                  <span className="text-amber-300">•</span>
                  <span>{t(item.i18nKey as any, item.params as any)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!answeredState.answered && (
        <p className="text-xs text-center text-slate-400">
          Find the best move for Player {currentDrill.turn + 1} ({currentDrill.turn === 0 ? 'South' : 'North'})
        </p>
      )}
    </div>
  );
};
