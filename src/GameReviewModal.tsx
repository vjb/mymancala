import React, { useState } from 'react';
import { 
  Award, Sparkles, CheckCircle2, AlertTriangle, 
  RotateCcw, Share2, Check, Zap, Flame, Trophy,
  X, ChevronRight, Swords, HelpCircle
} from 'lucide-react';
import { BotPersona } from './bots';
import { haptics } from './haptics';

export interface MoveRecord {
  player: number;
  pit: number;
  freeTurn: boolean;
  captures: number;
  classification?: 'Brilliant' | 'Best' | 'Good' | 'Inaccuracy' | 'Mistake' | 'Blunder';
  equityLoss?: number;
}

export interface GameReviewData {
  winner: number | null; // 0 = South, 1 = North, null = Draw
  p1Score: number;
  p2Score: number;
  p1Accuracy: number;
  p2Accuracy: number;
  p1Elo: number;
  p2Elo: number;
  p1Counts: {
    brilliant: number;
    best: number;
    good: number;
    inaccuracy: number;
    mistake: number;
    blunder: number;
  };
  p2Counts: {
    brilliant: number;
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
  bot?: BotPersona;
}

interface GameReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRematch: () => void;
  reviewData: GameReviewData;
  colorblindSafe?: boolean;
}

export const GameReviewModal: React.FC<GameReviewModalProps> = ({
  isOpen,
  onClose,
  onRematch,
  reviewData,
  colorblindSafe = false
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

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
    bot
  } = reviewData;

  const getTier = (elo: number) => {
    if (elo >= 1800) return { title: 'Grandmaster', icon: '💎', color: 'text-purple-400' };
    if (elo >= 1500) return { title: 'Master Tactician', icon: '🔥', color: 'text-amber-400' };
    if (elo >= 1200) return { title: 'Sharp Strategist', icon: '⚡', color: 'text-blue-400' };
    if (elo >= 900) return { title: 'Pebble Challenger', icon: '🌱', color: 'text-emerald-400' };
    return { title: 'Rookie Apprentice', icon: '🐣', color: 'text-zinc-400' };
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
      `📊 Moves: ${totalMoves} | Brilliant: ${p1Counts.brilliant} !! | Best: ${p1Counts.best} ★ | Blunders: ${p1Counts.blunder} ??`,
      turningPoint ? `⚡ Turning Point: Turn ${turningPoint.turnNumber} (${turningPoint.description})` : '',
      `Play on Mancala Coach!`
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

  const getAccuracyColor = (acc: number) => {
    if (acc >= 90) return 'text-emerald-500 dark:text-emerald-400 border-emerald-500';
    if (acc >= 75) return 'text-blue-500 dark:text-blue-400 border-blue-500';
    if (acc >= 60) return 'text-amber-500 dark:text-amber-400 border-amber-500';
    return 'text-rose-500 dark:text-rose-400 border-rose-500';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-lg bg-zinc-900 border border-zinc-700/80 rounded-2xl shadow-2xl text-zinc-100 flex flex-col max-h-[92vh] overflow-hidden"
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
          
          {/* Accuracy Scoreboards Ring / Big Badges */}
          <div className="grid grid-cols-2 gap-3">
            {/* South Player */}
            <div className="bg-zinc-800/60 rounded-xl p-3.5 border border-zinc-700/60 flex flex-col items-center text-center relative overflow-hidden">
              <span className="text-xs font-medium text-emerald-400 mb-1 flex items-center gap-1">
                South (You)
              </span>
              <div className={`w-16 h-16 rounded-full border-4 flex flex-col items-center justify-center my-1 ${getAccuracyColor(p1Accuracy)}`}>
                <span className="text-lg font-black leading-none">{p1Accuracy}%</span>
                <span className="text-[9px] uppercase tracking-wider text-zinc-400 mt-0.5">Acc</span>
              </div>
              <div className="mt-1 text-xs text-zinc-300 font-semibold">
                {p1Score} pebbles stored
              </div>
              <div className="text-[11px] font-medium text-amber-400 flex items-center gap-1 mt-0.5">
                <span>{p1Tier.icon}</span>
                <span>{p1Elo} Elo</span>
              </div>
            </div>

            {/* North Player (Bot or P2) */}
            <div className="bg-zinc-800/60 rounded-xl p-3.5 border border-zinc-700/60 flex flex-col items-center text-center relative overflow-hidden">
              <span className="text-xs font-medium text-blue-400 mb-1 flex items-center gap-1">
                {bot ? bot.name : 'North'}
              </span>
              <div className={`w-16 h-16 rounded-full border-4 flex flex-col items-center justify-center my-1 ${getAccuracyColor(p2Accuracy)}`}>
                <span className="text-lg font-black leading-none">{p2Accuracy}%</span>
                <span className="text-[9px] uppercase tracking-wider text-zinc-400 mt-0.5">Acc</span>
              </div>
              <div className="mt-1 text-xs text-zinc-300 font-semibold">
                {p2Score} pebbles stored
              </div>
              <div className="text-[11px] font-medium text-blue-300 flex items-center gap-1 mt-0.5">
                <span>{bot ? bot.avatar : '🤖'}</span>
                <span>{p2Elo} Elo</span>
              </div>
            </div>
          </div>

          {/* Performance Assessment Banner */}
          <div className="bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-blue-500/10 border border-amber-500/20 rounded-xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="text-2xl">{p1Tier.icon}</span>
              <div>
                <div className="text-xs text-zinc-400 font-medium">Estimated Performance</div>
                <div className="text-sm font-bold text-white flex items-center gap-1.5">
                  <span className={p1Tier.color}>{p1Tier.title}</span>
                  <span className="text-xs text-zinc-400 font-normal">({p1Elo} Rating)</span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-zinc-400">Total Moves</div>
              <div className="text-sm font-bold text-white">{totalMoves}</div>
            </div>
          </div>

          {/* Decisive Turning Point */}
          {turningPoint && (
            <div className="bg-zinc-800/40 border border-zinc-700/50 rounded-xl p-3 flex items-start gap-2.5">
              <div className="p-1.5 bg-yellow-500/20 text-yellow-400 rounded-lg shrink-0 mt-0.5">
                <Zap className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <div className="font-semibold text-zinc-200">
                  Decisive Turning Point (Turn {turningPoint.turnNumber})
                </div>
                <div className="text-zinc-400 mt-0.5 leading-relaxed">
                  {turningPoint.description}
                </div>
              </div>
            </div>
          )}

          {/* Move Quality Breakdown Table */}
          <div className="space-y-2">
            <div className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center justify-between px-1">
              <span>Move Quality Breakdown</span>
              <span className="text-[11px] text-zinc-500">South vs North</span>
            </div>

            <div className="bg-zinc-950/40 rounded-xl border border-zinc-800/80 divide-y divide-zinc-800/60 overflow-hidden text-xs">
              
              {/* Brilliant !! */}
              <div className="flex items-center justify-between px-3.5 py-2 hover:bg-zinc-800/30 transition">
                <div className="flex items-center gap-2">
                  <span className="px-1.5 py-0.5 rounded font-black text-[11px] bg-cyan-500/20 text-cyan-400 border border-cyan-500/40">
                    !!
                  </span>
                  <span className="font-medium text-zinc-200">Brilliant</span>
                </div>
                <div className="flex items-center gap-4 font-bold">
                  <span className="text-cyan-400 w-6 text-center">{p1Counts.brilliant}</span>
                  <span className="text-zinc-600">|</span>
                  <span className="text-zinc-400 w-6 text-center">{p2Counts.brilliant}</span>
                </div>
              </div>

              {/* Best Move ★ */}
              <div className="flex items-center justify-between px-3.5 py-2 hover:bg-zinc-800/30 transition">
                <div className="flex items-center gap-2">
                  <span className="px-1.5 py-0.5 rounded font-black text-[11px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
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
                  <span className="px-1.5 py-0.5 rounded font-black text-[11px] bg-blue-500/20 text-blue-400 border border-blue-500/40">
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
                  <span className="px-1.5 py-0.5 rounded font-black text-[11px] bg-amber-500/20 text-amber-400 border border-amber-500/40">
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
                  <span className="px-1.5 py-0.5 rounded font-black text-[11px] bg-orange-500/20 text-orange-400 border border-orange-500/40">
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
                  <span className="px-1.5 py-0.5 rounded font-black text-[11px] bg-rose-500/20 text-rose-400 border border-rose-500/40">
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
        </div>

      </div>
    </div>
  );
};
