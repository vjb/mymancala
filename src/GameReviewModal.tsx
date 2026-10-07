import React, { useState, useEffect, useRef } from 'react';
import { 
  Award, Sparkles, CheckCircle2, AlertTriangle, 
  RotateCcw, Share2, Check, Zap, Flame, Trophy,
  X, ChevronRight, Swords, HelpCircle, ArrowRight, Brain
} from 'lucide-react';
import { BotPersona } from './bots';
import { haptics } from './haptics';
import { trapFocus } from './lib/a11y';
import { recordMistake } from './trainer/mistakes';
import { MoveGrade } from './trainer/classify';

export interface MoveRecord {
  player: number;
  pit: number;
  freeTurn: boolean;
  captures: number;
  classification?: 'Best' | 'Good' | 'Inaccuracy' | 'Mistake' | 'Blunder' | string;
  grade?: MoveGrade;
  equityLoss?: number;
  boardBeforeMove?: number[];
  bestPit?: number;
}

export interface SwingMoment {
  turnNumber: number;
  player: number;
  pit: number;
  lossStones: number;
  grade: 'best' | 'good' | 'inaccuracy' | 'mistake' | 'blunder';
  bestPit?: number;
  boardBeforeMove?: number[];
  description: string;
}

export interface GameReviewData {
  winner: number | null; // 0 = South, 1 = North, null = Draw
  p1Score: number;
  p2Score: number;
  p1Accuracy: number;
  p2Accuracy: number;
  p1Elo: number;
  p2Elo: number;
  ratingDelta?: number;
  p1Counts: {
    best: number;
    good: number;
    inaccuracy: number;
    mistake: number;
    blunder: number;
  };
  p2Counts: {
    best: number;
    good: number;
    inaccuracy: number;
    mistake: number;
    blunder: number;
  };
  totalMoves: number;
  turningPoint?: {
    turnNumber: number;
    player: number;
    description: string;
  };
  topSwings?: SwingMoment[];
  bot?: BotPersona;
}

interface GameReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameState?: any;
  activeBot?: BotPersona;
  theme?: any;
  colorblindSafe?: boolean;
  fontScale?: number;
  onRematch?: () => void;
  reviewData?: GameReviewData;
  onPracticeMistakes?: () => void;
}

export const GameReviewModal: React.FC<GameReviewModalProps> = ({
  isOpen,
  onClose,
  gameState,
  activeBot,
  theme,
  colorblindSafe = false,
  fontScale = 1,
  onRematch,
  reviewData: externalReviewData,
  onPracticeMistakes,
}) => {
  const [copied, setCopied] = useState(false);
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

  // If reviewData is passed directly use it, otherwise compute fallback from gameState
  const reviewData: GameReviewData = externalReviewData || {
    winner: gameState?.winner ?? null,
    p1Score: gameState?.board?.[6] ?? 0,
    p2Score: gameState?.board?.[13] ?? 0,
    p1Accuracy: 85,
    p2Accuracy: 80,
    p1Elo: 1000,
    p2Elo: 1000,
    p1Counts: { best: 0, good: 0, inaccuracy: 0, mistake: 0, blunder: 0 },
    p2Counts: { best: 0, good: 0, inaccuracy: 0, mistake: 0, blunder: 0 },
    totalMoves: gameState?.gameMovesHistory?.length ?? 0,
    topSwings: [],
    bot: activeBot,
  };

  const {
    winner,
    p1Score,
    p2Score,
    p1Accuracy,
    p2Accuracy,
    p1Elo,
    p2Elo,
    p1Counts,
    p2Counts,
    totalMoves,
    turningPoint,
    topSwings = [],
    bot
  } = reviewData;

  const getTier = (elo: number) => {
    if (elo >= 1900) return { title: 'Grandmaster', icon: '👑', color: 'text-purple-400' };
    if (elo >= 1700) return { title: 'Master', icon: '🦉', color: 'text-amber-400' };
    if (elo >= 1500) return { title: 'Strategist', icon: '🧠', color: 'text-blue-400' };
    if (elo >= 1300) return { title: 'Tactician', icon: '⚔️', color: 'text-cyan-400' };
    if (elo >= 1100) return { title: 'Apprentice', icon: '🌿', color: 'text-emerald-400' };
    return { title: 'Novice', icon: '🌱', color: 'text-zinc-400' };
  };

  const p1Tier = getTier(p1Elo);

  const handleCopyShare = async () => {
    haptics.tap();
    const resultText = winner === 0 ? 'WON 🏆' : winner === 1 ? 'LOST 🥈' : 'TIED 🤝';
    const opponentName = bot ? bot.name : 'Player 2';
    const text = [
      `🎮 Mancala Game Review: ${resultText}`,
      `South (${p1Score} pts | ${p1Accuracy}% Acc) vs ${opponentName} (${p2Score} pts | ${p2Accuracy}% Acc)`,
      `🔥 Performance: ${p1Elo} Elo (${p1Tier.icon} ${p1Tier.title})`,
      `📊 Moves: ${totalMoves} | Best: ${p1Counts.best} ★ | Good: ${p1Counts.good} ✓ | Inacc: ${p1Counts.inaccuracy} ?! | Mistakes: ${p1Counts.mistake} ? | Blunders: ${p1Counts.blunder} ??`,
      turningPoint ? `⚡ Turning Point: Turn ${turningPoint.turnNumber} (${turningPoint.description})` : '',
      `Play on Mancala Trainer!`
    ].filter(Boolean).join('\n');

    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    } catch {
      // fallback
    }
  };

  const handlePracticeSwings = () => {
    haptics.tap();
    // Record top swing moments to the Leitner mistake log
    if (topSwings && topSwings.length > 0 && gameState?.board) {
      for (const swing of topSwings) {
        if (swing.lossStones >= 1.0) {
          recordMistake({
            rulesId: 'kalah',
            position: swing.boardBeforeMove && swing.boardBeforeMove.length === 14 ? swing.boardBeforeMove : gameState.board,
            turn: (swing.player as 0 | 1) ?? 0,
            played: swing.pit,
            best: swing.bestPit ?? ((swing.pit + 1) % 6),
            loss: swing.lossStones,
            grade: swing.grade,
          });
        }
      }
    }
    onClose();
    onPracticeMistakes?.();
  };

  const getAccuracyColor = (acc: number) => {
    if (acc >= 90) return 'text-emerald-500 dark:text-emerald-400 border-emerald-500';
    if (acc >= 75) return 'text-blue-500 dark:text-blue-400 border-blue-500';
    if (acc >= 60) return 'text-amber-500 dark:text-amber-400 border-amber-500';
    return 'text-rose-500 dark:text-rose-400 border-rose-500';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        ref={modalRef}
        data-testid="game-review-modal"
        className="w-full max-w-lg bg-zinc-900 border border-zinc-700/80 rounded-3xl shadow-2xl text-zinc-100 flex flex-col max-h-[92vh] overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 bg-zinc-950/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight text-white flex items-center gap-1.5">
                Game Review
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Accuracy Analysis
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                {winner === 0 ? 'South Victory!' : winner === 1 ? (bot ? `${bot.name} Wins!` : 'North Victory!') : 'Honorable Draw!'}
              </p>
            </div>
          </div>
          <button 
            onClick={() => { haptics.tap(); onClose(); }}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          
          {/* Accuracy Scoreboards */}
          <div className="grid grid-cols-2 gap-3">
            {/* South Player */}
            <div className="bg-zinc-800/60 rounded-2xl p-3.5 border border-zinc-700/60 flex flex-col items-center text-center relative overflow-hidden">
              <span className="text-xs font-medium text-emerald-400 mb-1 flex items-center gap-1">
                South (You)
              </span>
              <div className={`w-16 h-16 rounded-full border-4 flex flex-col items-center justify-center my-1 ${getAccuracyColor(p1Accuracy)}`}>
                <span className="text-lg font-black leading-none">{p1Accuracy}%</span>
                <span className="text-xs uppercase tracking-wider text-zinc-400 mt-0.5">Acc</span>
              </div>
              <div className="mt-1 text-xs text-zinc-300 font-semibold">
                {p1Score} pebbles stored
              </div>
              <div className="text-xs font-medium text-amber-400 flex items-center gap-1 mt-0.5">
                <span>{p1Tier.icon}</span>
                <span>{p1Elo} Elo</span>
              </div>
            </div>

            {/* North Player (Bot or P2) */}
            <div className="bg-zinc-800/60 rounded-2xl p-3.5 border border-zinc-700/60 flex flex-col items-center text-center relative overflow-hidden">
              <span className="text-xs font-medium text-blue-400 mb-1 flex items-center gap-1">
                {bot ? bot.name : 'North'}
              </span>
              <div className={`w-16 h-16 rounded-full border-4 flex flex-col items-center justify-center my-1 ${getAccuracyColor(p2Accuracy)}`}>
                <span className="text-lg font-black leading-none">{p2Accuracy}%</span>
                <span className="text-xs uppercase tracking-wider text-zinc-400 mt-0.5">Acc</span>
              </div>
              <div className="mt-1 text-xs text-zinc-300 font-semibold">
                {p2Score} pebbles stored
              </div>
              <div className="text-xs font-medium text-blue-300 flex items-center gap-1 mt-0.5">
                <span>{bot ? bot.avatar : '🤖'}</span>
                <span>{p2Elo} Elo</span>
              </div>
            </div>
          </div>

          {/* Top 3 Swing Moments & Practice Trigger */}
          {topSwings && topSwings.length > 0 && (
            <div className="bg-amber-950/30 border border-amber-500/30 rounded-2xl p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-amber-400" />
                  Top Swing Moments ({topSwings.length})
                </span>
                <button
                  data-testid="practice-swings-btn"
                  onClick={handlePracticeSwings}
                  className="px-2.5 py-1 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-md transition flex items-center gap-1 active:scale-95"
                >
                  <Brain className="w-3.5 h-3.5" />
                  <span>Practice these</span>
                </button>
              </div>

              <div className="space-y-1.5">
                {topSwings.map((swing, idx) => (
                  <div
                    key={idx}
                    data-testid="swing-moment-item"
                    className="p-2 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 font-bold flex items-center justify-center text-xs">
                        #{idx + 1}
                      </span>
                      <span className="text-slate-300">
                        Turn {swing.turnNumber}: Pit {swing.pit}
                      </span>
                    </div>
                    <span className="font-mono font-bold text-rose-400">
                      -{swing.lossStones.toFixed(1)} stones
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 5-Tier Move Quality Breakdown Table */}
          <div className="space-y-2">
            <div className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center justify-between px-1">
              <span>Move Quality Breakdown</span>
              <span className="text-xs text-zinc-500">South vs North</span>
            </div>

            <div className="bg-zinc-950/40 rounded-2xl border border-zinc-800/80 divide-y divide-zinc-800/60 overflow-hidden text-xs">
              {/* Best Move ★ */}
              <div className="flex items-center justify-between px-3.5 py-2 hover:bg-zinc-800/30 transition">
                <div className="flex items-center gap-2">
                  <span className="px-1.5 py-0.5 rounded font-black text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                    ★
                  </span>
                  <span className="font-medium text-zinc-200">Best Move</span>
                </div>
                <div className="flex items-center gap-4 font-bold">
                  <span className="text-emerald-400 w-6 text-center">{p1Counts.best}</span>
                  <span className="text-zinc-600">|</span>
                  <span className="text-zinc-400 w-6 text-center">{p2Counts.best}</span>
                </div>
              </div>

              {/* Good ✓ */}
              <div className="flex items-center justify-between px-3.5 py-2 hover:bg-zinc-800/30 transition">
                <div className="flex items-center gap-2">
                  <span className="px-1.5 py-0.5 rounded font-black text-xs bg-blue-500/20 text-blue-400 border border-blue-500/40">
                    ✓
                  </span>
                  <span className="font-medium text-zinc-200">Good</span>
                </div>
                <div className="flex items-center gap-4 font-bold">
                  <span className="text-blue-400 w-6 text-center">{p1Counts.good}</span>
                  <span className="text-zinc-600">|</span>
                  <span className="text-zinc-400 w-6 text-center">{p2Counts.good}</span>
                </div>
              </div>

              {/* Inaccuracy ?! */}
              <div className="flex items-center justify-between px-3.5 py-2 hover:bg-zinc-800/30 transition">
                <div className="flex items-center gap-2">
                  <span className="px-1.5 py-0.5 rounded font-black text-xs bg-amber-500/20 text-amber-400 border border-amber-500/40">
                    ?!
                  </span>
                  <span className="font-medium text-zinc-200">Inaccuracy</span>
                </div>
                <div className="flex items-center gap-4 font-bold">
                  <span className="text-amber-400 w-6 text-center">{p1Counts.inaccuracy}</span>
                  <span className="text-zinc-600">|</span>
                  <span className="text-zinc-400 w-6 text-center">{p2Counts.inaccuracy}</span>
                </div>
              </div>

              {/* Mistake ? */}
              <div className="flex items-center justify-between px-3.5 py-2 hover:bg-zinc-800/30 transition">
                <div className="flex items-center gap-2">
                  <span className="px-1.5 py-0.5 rounded font-black text-xs bg-orange-500/20 text-orange-400 border border-orange-500/40">
                    ?
                  </span>
                  <span className="font-medium text-zinc-200">Mistake</span>
                </div>
                <div className="flex items-center gap-4 font-bold">
                  <span className="text-orange-400 w-6 text-center">{p1Counts.mistake}</span>
                  <span className="text-zinc-600">|</span>
                  <span className="text-zinc-400 w-6 text-center">{p2Counts.mistake}</span>
                </div>
              </div>

              {/* Blunder ?? */}
              <div className="flex items-center justify-between px-3.5 py-2 hover:bg-zinc-800/30 transition">
                <div className="flex items-center gap-2">
                  <span className="px-1.5 py-0.5 rounded font-black text-xs bg-rose-500/20 text-rose-400 border border-rose-500/40">
                    ??
                  </span>
                  <span className="font-medium text-zinc-200">Blunder</span>
                </div>
                <div className="flex items-center gap-4 font-bold">
                  <span className="text-rose-400 w-6 text-center">{p1Counts.blunder}</span>
                  <span className="text-zinc-600">|</span>
                  <span className="text-zinc-400 w-6 text-center">{p2Counts.blunder}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Footer */}
        <div className="px-5 py-3.5 border-t border-zinc-800 bg-zinc-950 flex items-center gap-3">
          <button
            onClick={handleCopyShare}
            className="flex-1 py-2.5 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold flex items-center justify-center gap-2 transition active:scale-[0.98]"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
            {copied ? 'Copied to Clipboard!' : 'Share Match Recap'}
          </button>

          {onRematch && (
            <button
              onClick={() => {
                haptics.tap();
                onRematch();
              }}
              className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition active:scale-[0.98]"
            >
              <RotateCcw className="w-4 h-4" />
              Rematch
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
