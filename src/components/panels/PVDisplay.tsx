import React, { useState } from 'react';
import { PVSheet } from './PVSheet';
import { BoardLayout } from '../../rules/types';
import { kalahRuleSet } from '../../rules/kalah';

interface PVDisplayProps {
  pv: number[];
  moveLabel?: string;
  themeSkin?: string;
  layout?: BoardLayout;
}

export const PVDisplay: React.FC<PVDisplayProps> = ({ pv, moveLabel, themeSkin, layout }) => {
  const activeLayout = layout ?? kalahRuleSet.layout;
  const [isOpen, setIsOpen] = useState(false);

  if (!pv || pv.length === 0) return null;

  // Format first 2-3 moves for compact view
  const previewLimit = 3;
  const formatStep = (p: number) => {
    const lbl = activeLayout.label(p);
    return lbl.startsWith('Pit ') ? `P${lbl.slice(4)}` : lbl;
  };
  const previewMoves = pv.slice(0, previewLimit).map(formatStep).join(' → ');
  const remainingCount = pv.length - previewLimit;

  return (
    <>
      <div 
        className="inline-flex items-center gap-1 max-w-full font-mono text-floor text-xs cursor-pointer group"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(true);
        }}
        title="Tap to expand full line"
      >
        <span className="truncate opacity-75 group-hover:opacity-100 transition">
          PV: {previewMoves}
        </span>
        {remainingCount > 0 && (
          <span className="shrink-0 px-1 py-0.5 rounded bg-amber-500/20 text-amber-300 text-floor text-xs font-semibold border border-amber-500/30">
            +{remainingCount}
          </span>
        )}
      </div>

      <PVSheet
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        pv={pv}
        moveLabel={moveLabel}
        themeSkin={themeSkin}
        layout={activeLayout}
      />
    </>
  );
};
