import React, { useRef, useEffect } from 'react';
import { 
  X, Trophy, ArrowRight, Zap, Target, CheckCircle2, BookOpen
} from 'lucide-react';
import { haptics } from './haptics';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSkin?: string;
}

export const RulesModal: React.FC<RulesModalProps> = ({
  isOpen,
  onClose,
  currentSkin = 'walnut'
}) => {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && contentRef.current) {
      contentRef.current.scrollTop = 0;
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      <div 
        className="w-full max-w-lg bg-zinc-900 border border-zinc-700/80 rounded-2xl sm:rounded-3xl shadow-2xl text-zinc-100 flex flex-col max-h-[88vh] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 sm:py-3.5 border-b border-zinc-800 bg-zinc-950/80 shrink-0">
          <div className="flex items-center gap-2 sm:gap-2.5">
            <div className="p-1.5 sm:p-2 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
              <BookOpen className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold tracking-tight text-white flex items-center gap-1.5">
                How to Play Mancala
                <span className="text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  Quick Guide
                </span>
              </h2>
              <p className="text-[11px] sm:text-xs text-zinc-400">
                Official Kalah rules explained in 60 seconds
              </p>
            </div>
          </div>
          <button 
            onClick={() => { haptics.tap(); onClose(); }}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition"
            aria-label="Close rules"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div 
          ref={contentRef}
          className="flex-1 overflow-y-auto px-3.5 sm:px-5 py-3 sm:py-4 space-y-2.5 sm:space-y-3.5 text-xs overscroll-contain"
        >
          
          {/* Card 1: The Goal */}
          <div className="p-3 sm:p-3.5 rounded-xl bg-zinc-800/60 border border-zinc-700/60 flex items-start gap-2.5 sm:gap-3">
            <div className="p-1.5 sm:p-2 rounded-lg bg-amber-500/20 text-amber-400 shrink-0 mt-0.5">
              <Trophy className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-sm text-zinc-100">1. The Goal</div>
              <p className="text-zinc-300 mt-1 leading-relaxed">
                Collect the most pebbles into your <strong>Kalah Store</strong> (the large pit on your right). With 48 total pebbles on the board, the first player to reach <strong>25 pebbles</strong> guarantees victory!
              </p>
            </div>
          </div>

          {/* Card 2: Sowing Seeds */}
          <div className="p-3 sm:p-3.5 rounded-xl bg-zinc-800/60 border border-zinc-700/60 flex items-start gap-2.5 sm:gap-3">
            <div className="p-1.5 sm:p-2 rounded-lg bg-blue-500/20 text-blue-400 shrink-0 mt-0.5">
              <ArrowRight className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-sm text-zinc-100">2. Sowing Seeds (Counter-Clockwise)</div>
              <p className="text-zinc-300 mt-1 leading-relaxed">
                On your turn, pick up all pebbles from any pit on your side. Sowing moves <strong>counter-clockwise</strong>, dropping exactly <strong>one pebble</strong> into each subsequent pit.
              </p>
              <div className="mt-1.5 text-[11px] p-2 rounded-lg bg-zinc-900/80 border border-zinc-800 text-zinc-300">
                ⭐ <strong>Store Rule:</strong> You drop pebbles into your own Store, but you always skip your opponent's Store.
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
                <span>3. Free Turn (Bonus Play)</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full font-bold whitespace-nowrap">
                  Key Strategy
                </span>
              </div>
              <p className="text-zinc-300 mt-1 leading-relaxed">
                If the <strong>last pebble</strong> you drop lands in <strong>your own Kalah Store</strong>, you immediately earn an extra <strong>Free Turn</strong>! You can chain multiple free turns in one sequence.
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
                <span>4. Opposite Capture (Stealing Stones)</span>
                <span className="text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/40 px-2 py-0.5 rounded-full font-bold whitespace-nowrap">
                  Power Move
                </span>
              </div>
              <p className="text-zinc-300 mt-1 leading-relaxed">
                If your last pebble lands in an <strong>empty pit on your side</strong>, and the opponent's pit directly opposite has pebbles, you <strong>capture all of them</strong> plus your pebble, sending them to your store!
              </p>
            </div>
          </div>

          {/* Card 5: Game End */}
          <div className="p-3 sm:p-3.5 rounded-xl bg-zinc-800/60 border border-zinc-700/60 flex items-start gap-2.5 sm:gap-3">
            <div className="p-1.5 sm:p-2 rounded-lg bg-purple-500/20 text-purple-400 shrink-0 mt-0.5">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-sm text-zinc-100">5. Endgame & Sweeping</div>
              <p className="text-zinc-300 mt-1 leading-relaxed">
                The game ends when all 6 pits on either side are empty. The other player sweeps their remaining pebbles into their store. Most pebbles wins!
              </p>
            </div>
          </div>

        </div>

        {/* Action Footer */}
        <div className="px-5 py-3.5 border-t border-zinc-800 bg-zinc-950 flex items-center justify-between gap-3">
          <span className="text-[11px] text-zinc-400">
            Coach mode will alert you if you make a blunder!
          </span>
          <button
            onClick={() => {
              haptics.tap();
              onClose();
            }}
            className="py-2 px-5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-bold shadow-lg shadow-amber-500/20 transition active:scale-95"
          >
            Got It, Let's Play!
          </button>
        </div>

      </div>
    </div>
  );
};
