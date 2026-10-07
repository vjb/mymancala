import React, { useState, useEffect } from 'react';
import { Calendar, HelpCircle, CheckCircle2, RotateCcw, Sparkles, Flame, ShieldAlert } from 'lucide-react';
import { puzzleFor, getUtcDayIndex, isSolutionMove } from '../../puzzle/daily';
import { Puzzle } from '../../puzzle/types';
import { recordActivity, loadProgress } from '../../progress/progress';
import { kalahRuleSet } from '../../rules/kalah';

interface DailyPuzzleCardProps {
  theme: any;
  currentSkin: string;
}

export const DailyPuzzleCard: React.FC<DailyPuzzleCardProps> = ({
  theme,
  currentSkin,
}) => {
  const [dayIndex] = useState(() => getUtcDayIndex());
  const [puzzle, setPuzzle] = useState<Puzzle>(() => puzzleFor(dayIndex));
  const [currentBoard, setCurrentBoard] = useState<number[]>(() => [...puzzle.board]);
  const [tries, setTries] = useState(0);
  const [solved, setSolved] = useState(false);
  const [hintLevel, setHintLevel] = useState<0 | 1 | 2>(0);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [progress, setProgress] = useState(() => loadProgress());

  useEffect(() => {
    const p = puzzleFor(dayIndex);
    setPuzzle(p);
    setCurrentBoard([...p.board]);
    setTries(0);
    setSolved(false);
    setHintLevel(0);
    setFeedback(null);
  }, [dayIndex]);

  const handleReset = () => {
    setCurrentBoard([...puzzle.board]);
    setFeedback(null);
  };

  const handlePlayMove = (pit: number) => {
    if (solved) return;
    const newTries = tries + 1;
    setTries(newTries);

    if (isSolutionMove(puzzle, pit)) {
      // Solved! Apply the move on board
      const res = kalahRuleSet.apply({ board: currentBoard, turn: puzzle.turn, over: false }, pit);
      setCurrentBoard(res.state.board);
      setSolved(true);
      setFeedback(`Solved in ${newTries} ${newTries === 1 ? 'try' : 'tries'}! Excellent tactical foresight.`);

      // Update progress and streak
      const act = recordActivity({ type: 'puzzle_solved' });
      setProgress(act.progress);
    } else {
      // Failed attempt
      setFeedback('Not the optimal move. Observe stone distribution and try again.');
    }
  };

  const handleHint = () => {
    if (hintLevel === 0) {
      setHintLevel(1);
    } else {
      setHintLevel(2);
    }
  };

  return (
    <div
      data-testid="daily-puzzle-card"
      className={`p-4 rounded-2xl border ${theme.cardBorder} ${
        currentSkin === 'porcelain' ? 'bg-[#f7efe1]' : 'bg-black/30'
      } flex flex-col gap-3.5`}
    >
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-sky-400" />
          <h4 className="font-bold text-sm text-slate-100">Today's Daily Puzzle</h4>
          <span className="text-xs px-2 py-0.5 rounded-full font-bold uppercase bg-sky-500/20 text-sky-300 border border-sky-500/30">
            {puzzle.theme}
          </span>
          <span className="text-xs text-slate-400">({puzzle.difficulty})</span>
        </div>

        {/* Streak Display */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold">
          <Flame className="w-3.5 h-3.5 fill-current" />
          <span>{progress.streak} Day Streak</span>
        </div>
      </div>

      <p className="text-xs text-slate-300 leading-relaxed font-sans">
        {puzzle.title} — Find the decisive winning line evaluated by exact negamax endgame solver.
      </p>

      {/* Mini Interactive Board */}
      <div className="p-3 rounded-xl bg-black/40 border border-white/10 flex flex-col items-center gap-2">
        <div className="flex items-center justify-between w-full max-w-sm gap-2">
          {/* P2 Store (left) */}
          <div className="w-10 h-24 rounded-xl bg-white/5 border border-white/10 flex flex-col items-center justify-center text-amber-300 text-sm font-bold">
            <span className="text-xs text-slate-500">P2</span>
            <span>{currentBoard[13]}</span>
          </div>

          <div className="flex flex-col gap-2 flex-1">
            {/* Top row (Opponent P2) */}
            <div className="flex justify-between gap-1">
              {[12, 11, 10, 9, 8, 7].map(pit => (
                <div key={pit} className="flex-1 aspect-square rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-xs text-slate-400">
                  {currentBoard[pit]}
                </div>
              ))}
            </div>

            {/* Bottom row (Player P1 - Clickable) */}
            <div className="flex justify-between gap-1">
              {[0, 1, 2, 3, 4, 5].map(pit => {
                const count = currentBoard[pit];
                const isHinted = hintLevel === 2 && puzzle.hint.pit === pit;
                return (
                  <button
                    key={pit}
                    disabled={solved || count === 0}
                    onClick={() => handlePlayMove(pit)}
                    data-testid={`puzzle-pit-${pit}`}
                    className={`flex-1 aspect-square rounded-lg flex items-center justify-center text-xs font-bold transition active:scale-95 ${
                      isHinted
                        ? 'bg-amber-500/40 text-amber-200 border-2 border-amber-400 animate-pulse'
                        : count > 0 && !solved
                          ? 'bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40'
                          : 'bg-white/5 text-slate-600 border border-white/5 opacity-50'
                    }`}
                  >
                    {count}
                  </button>
                );
              })}
            </div>
          </div>

          {/* P1 Store (right) */}
          <div className="w-10 h-24 rounded-xl bg-sky-950/40 border border-sky-500/30 flex flex-col items-center justify-center text-sky-300 text-sm font-bold">
            <span className="text-xs text-sky-500">P1</span>
            <span>{currentBoard[6]}</span>
          </div>
        </div>
      </div>

      {/* Hints and Feedback */}
      {hintLevel >= 1 && (
        <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-200 text-xs flex items-center gap-2">
          <Sparkles className="w-4 h-4 shrink-0 text-amber-400" />
          <span>
            {hintLevel === 1 ? `Hint (Theme): ${puzzle.hint.theme}` : `Hint (Target Pit): Play Pit ${puzzle.hint.pit + 1}!`}
          </span>
        </div>
      )}

      {feedback && (
        <div
          data-testid="puzzle-feedback"
          className={`p-2.5 rounded-xl text-xs flex items-center gap-2 font-medium ${
            solved
              ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/40'
              : 'bg-rose-500/15 text-rose-200 border border-rose-500/30'
          }`}
        >
          {solved ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> : <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />}
          <span>{feedback}</span>
        </div>
      )}

      {/* Footer Controls */}
      <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/10">
        <button
          onClick={handleHint}
          disabled={solved || hintLevel === 2}
          data-testid="puzzle-hint-btn"
          className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-40 text-xs text-slate-300 font-medium flex items-center gap-1.5 transition"
        >
          <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
          <span>{hintLevel === 0 ? 'Need a Hint?' : hintLevel === 1 ? 'Show Target Pit' : 'Hint Active'}</span>
        </button>

        <button
          onClick={handleReset}
          disabled={solved}
          className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-40 text-xs text-slate-300 font-medium flex items-center gap-1.5 transition"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset</span>
        </button>
      </div>
    </div>
  );
};
