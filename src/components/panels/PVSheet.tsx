import React, { useEffect } from 'react';
import { X, GitCommit, Copy, Check } from 'lucide-react';
import { BoardLayout } from '../../rules/types';
import { kalahRuleSet } from '../../rules/kalah';

interface PVSheetProps {
  isOpen: boolean;
  onClose: () => void;
  pv: number[];
  moveLabel?: string;
  themeSkin?: string;
  layout?: BoardLayout;
}

export const PVSheet: React.FC<PVSheetProps> = ({
  isOpen,
  onClose,
  pv,
  moveLabel,
  themeSkin = 'walnut',
  layout
}) => {
  const activeLayout = layout ?? kalahRuleSet.layout;
  const [copied, setCopied] = React.useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const formatStep = (p: number) => {
    const lbl = activeLayout.label(p);
    return lbl.startsWith('Pit ') ? `P${lbl.slice(4)}` : lbl;
  };
  const fullLineString = pv.map(formatStep).join(' → ');

  const handleCopy = () => {
    navigator.clipboard?.writeText(fullLineString);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-md bg-zinc-900 border-t sm:border border-zinc-700/80 rounded-t-2xl sm:rounded-2xl shadow-2xl text-zinc-100 flex flex-col max-h-[70vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-950/80 shrink-0">
          <div className="flex items-center gap-2">
            <GitCommit className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-white">
              Principal Variation {moveLabel ? `(${moveLabel})` : ''}
            </h3>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleCopy}
              className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition"
              title="Copy line"
              aria-label="Copy line"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content with zero horizontal overflow */}
        <div className="p-4 overflow-y-auto overflow-x-hidden flex flex-col gap-2.5">
          <p className="text-xs text-zinc-400">
            Predicted sequence of optimal moves found by the engine:
          </p>
          <div className="flex flex-col gap-1.5">
            {pv.map((pit, idx) => (
              <div 
                key={idx}
                className="flex items-center justify-between p-2 rounded-lg bg-zinc-800/60 border border-zinc-700/40 text-xs font-mono"
              >
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-zinc-700/80 flex items-center justify-center text-floor text-xs text-zinc-300">
                    {idx + 1}
                  </span>
                  <span className="font-semibold text-white">
                    {activeLayout.label(pit)}
                  </span>
                </div>
                <span className="text-floor text-xs text-zinc-400">
                  {activeLayout.pitOwner(pit) === 0 ? 'Player 1' : 'Player 2'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
