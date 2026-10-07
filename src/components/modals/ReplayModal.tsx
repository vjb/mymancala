import React, { useState, useEffect, useMemo } from 'react';
import { X, Play, RotateCcw, ChevronLeft, ChevronRight, Share2, Download } from 'lucide-react';
import { decodeReplayHash, ReplayPayload } from '../../share/codec';
import { getRuleSet } from '../../rules';
import { GameState } from '../../rules/types';
import { shareOrDownloadResultCard } from '../../share/card';

interface ReplayModalProps {
  isOpen: boolean;
  onClose: () => void;
  replayHash?: string;
  onPlayFromHere?: (board: number[], turn: 0 | 1) => void;
  theme: any;
  currentSkin: string;
}

export const ReplayModal: React.FC<ReplayModalProps> = ({
  isOpen,
  onClose,
  replayHash,
  onPlayFromHere,
  theme,
  currentSkin,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const decoded = useMemo(() => {
    const hash = replayHash || (typeof window !== 'undefined' ? window.location.hash : '');
    return decodeReplayHash(hash);
  }, [replayHash, isOpen]);

  const history = useMemo(() => {
    if (!decoded.ok) return [];
    const rules = getRuleSet(decoded.replay.rulesId);
    let s = rules.initial();
    const states: GameState[] = [{ ...s, board: [...s.board] }];

    for (const move of decoded.replay.moves) {
      if (s.over || !rules.legalMoves(s).includes(move)) break;
      const res = rules.apply(s, move);
      s = res.state;
      states.push({ ...s, board: [...s.board] });
    }

    return states;
  }, [decoded]);

  useEffect(() => {
    setCurrentStep(0);
    setIsPlaying(false);
  }, [decoded]);

  useEffect(() => {
    if (!isPlaying) return;
    if (currentStep >= history.length - 1) {
      setIsPlaying(false);
      return;
    }
    const timer = setTimeout(() => {
      setCurrentStep(prev => Math.min(prev + 1, history.length - 1));
    }, 700);
    return () => clearTimeout(timer);
  }, [isPlaying, currentStep, history.length]);

  if (!isOpen) return null;

  const currentState = history[currentStep] || (history[0] ?? null);

  const handleExportCard = () => {
    if (!currentState) return;
    const finalState = history[history.length - 1] || currentState;
    const p0 = finalState.board[6];
    const p1 = finalState.board[13];
    shareOrDownloadResultCard({
      winner: p0 > p1 ? 0 : p1 > p0 ? 1 : null,
      p0Score: p0,
      p1Score: p1,
      totalMoves: decoded.ok ? decoded.replay.moves.length : 0,
      board: finalState.board,
      rulesName: decoded.ok ? decoded.replay.rulesId : 'Kalah',
      replayUrl: typeof window !== 'undefined' ? window.location.href : '',
      skinId: currentSkin,
    });
  };

  const replayError = decoded.ok === false ? decoded.error : null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Replay Viewer"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-md animate-fade-in"
    >
      <div className={`relative w-full max-w-2xl rounded-3xl border ${theme.cardBorder} ${theme.cardBg} p-5 shadow-2xl flex flex-col gap-4 max-h-[90vh] overflow-y-auto`}>
        <div className="flex items-center justify-between border-b pb-3 border-white/10">
          <div>
            <h2 className="text-lg font-bold text-slate-100">Match Replay Viewer</h2>
            <p className="text-xs text-slate-400">Step through moves read-only or play from any position</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close Replay"
            className="p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-slate-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {replayError ? (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs text-center">
            {replayError}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {/* Step info banner */}
            <div className="flex items-center justify-between bg-black/30 p-2.5 rounded-2xl text-xs text-slate-300">
              <span>
                Move <strong className="text-sky-400">{currentStep}</strong> of{' '}
                <strong>{history.length - 1}</strong>
              </span>
              <span>
                Turn: <strong className="text-amber-400">Player {(currentState?.turn ?? 0) + 1}</strong>
              </span>
            </div>

            {/* Read-only Mini Board */}
            {currentState && (
              <div className="p-4 rounded-2xl bg-black/40 border border-white/10 flex flex-col items-center gap-3">
                <div className="flex items-center justify-between w-full max-w-md gap-3">
                  {/* P2 Store (left) */}
                  <div className="flex flex-col items-center justify-center w-12 h-28 rounded-2xl bg-white/5 border border-white/10 text-amber-300 font-bold">
                    <span className="text-xs text-slate-500">P2</span>
                    <span className="text-lg">{currentState.board[13]}</span>
                  </div>

                  {/* Pits grid */}
                  <div className="flex flex-col gap-2 flex-1">
                    {/* P2 Row: 12 down to 7 */}
                    <div className="flex justify-between gap-1.5">
                      {[12, 11, 10, 9, 8, 7].map(pit => (
                        <div key={pit} className="flex-1 aspect-square rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-xs font-semibold text-slate-300">
                          {currentState.board[pit]}
                        </div>
                      ))}
                    </div>

                    {/* P1 Row: 0 up to 5 */}
                    <div className="flex justify-between gap-1.5">
                      {[0, 1, 2, 3, 4, 5].map(pit => (
                        <div key={pit} className="flex-1 aspect-square rounded-xl bg-sky-950/30 border border-sky-500/20 flex items-center justify-center text-xs font-semibold text-sky-300">
                          {currentState.board[pit]}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* P1 Store (right) */}
                  <div className="flex flex-col items-center justify-center w-12 h-28 rounded-2xl bg-sky-950/40 border border-sky-500/30 text-sky-300 font-bold">
                    <span className="text-xs text-sky-500">P1</span>
                    <span className="text-lg">{currentState.board[6]}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Step Controls */}
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setCurrentStep(0)}
                disabled={currentStep === 0}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-40 text-slate-300 transition"
                title="First move"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentStep(prev => Math.max(0, prev - 1))}
                disabled={currentStep === 0}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-40 text-slate-300 transition"
                title="Previous move"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center gap-1.5 transition active:scale-95"
              >
                <Play className={`w-3.5 h-3.5 ${isPlaying ? 'fill-current' : ''}`} />
                {isPlaying ? 'Pause' : 'Play'}
              </button>
              <button
                onClick={() => setCurrentStep(prev => Math.min(history.length - 1, prev + 1))}
                disabled={currentStep >= history.length - 1}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-40 text-slate-300 transition"
                title="Next move"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/10">
              <button
                onClick={handleExportCard}
                className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-slate-300 font-medium flex items-center gap-2 transition"
              >
                <Share2 className="w-3.5 h-3.5 text-sky-400" />
                Share Result Card
              </button>

              {onPlayFromHere && currentState && (
                <button
                  onClick={() => {
                    onPlayFromHere(currentState.board, currentState.turn);
                    onClose();
                  }}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs transition active:scale-95"
                >
                  Play from Here
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
