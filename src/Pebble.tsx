import React from 'react';
import { SkinTheme } from './theme';

interface PebbleProps {
  theme: SkinTheme;
  player: 'p1' | 'p2' | 'neutral';
  index: number;
}

export function Pebble({ theme, player, index }: PebbleProps) {
  let stoneClasses = "";
  if (theme === 'walnut') {
    // Honey Carnelian (P1) vs Mountain Jade (P2)
    stoneClasses = player === 'p1'
      ? "bg-gradient-to-tr from-[#9a3412] via-[#ea580c] to-[#fed7aa] border-[#fdba74]/60 shadow-[0_2px_4px_rgba(0,0,0,0.7)]"
      : player === 'p2'
      ? "bg-gradient-to-tr from-[#064e3b] via-[#059669] to-[#a7f3d0] border-[#6ee7b7]/60 shadow-[0_2px_4px_rgba(0,0,0,0.7)]"
      : "bg-gradient-to-tr from-[#78350f] via-[#b45309] to-[#fde68a] border-[#fcd34d]/50 shadow-[0_2px_4px_rgba(0,0,0,0.6)]";
  } else if (theme === 'porcelain') {
    // Terracotta (P1) vs Nordic Sage (P2)
    stoneClasses = player === 'p1'
      ? "bg-gradient-to-tr from-[#9c3821] via-[#c85a3c] to-[#f4a28c] border-[#f0947d]/60 shadow-[0_2px_4px_rgba(60,30,20,0.3)]"
      : player === 'p2'
      ? "bg-gradient-to-tr from-[#264e3c] via-[#4a7c64] to-[#a3c9b7] border-[#91c0ab]/60 shadow-[0_2px_4px_rgba(20,50,35,0.3)]"
      : "bg-gradient-to-tr from-[#6e6357] via-[#8c8072] to-[#c7bcb0] border-[#b8ab9b]/40 shadow-[0_2px_4px_rgba(50,40,30,0.2)]";
  } else {
    // Sapphire Crystal (P1) vs Topaz Quartz (P2)
    stoneClasses = player === 'p1'
      ? "bg-gradient-to-tr from-[#0369a1] via-[#0284c7] to-[#bae6fd] border-[#7dd3fc]/60 shadow-[0_2px_5px_rgba(0,0,0,0.85)]"
      : player === 'p2'
      ? "bg-gradient-to-tr from-[#b45309] via-[#d97706] to-[#fef08a] border-[#fde047]/60 shadow-[0_2px_5px_rgba(0,0,0,0.85)]"
      : "bg-gradient-to-tr from-[#475569] via-[#64748b] to-[#cbd5e1] border-[#94a3b8]/40 shadow-[0_2px_5px_rgba(0,0,0,0.7)]";
  }

  // Subtle organic rotation and slight scale variation
  const rotations = [-8, 12, -15, 20, -5, 14, -22, 10];
  const rot = rotations[index % rotations.length];

  return (
    <div
      style={{ transform: `rotate(${rot}deg)` }}
      className={`relative w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full border transition-all duration-150 shrink-0 ${stoneClasses}`}
    >
      {/* 3D Specular Highlight */}
      <span className="absolute top-[1.5px] left-[2px] w-1.5 h-0.5 rounded-full bg-white/70 blur-[0.2px] pointer-events-none" />
    </div>
  );
}

interface PebbleClusterProps {
  count: number;
  theme: SkinTheme;
  player: 'p1' | 'p2';
  maxVisible?: number;
}

export function PebbleCluster({ count, theme, player, maxVisible = 6 }: PebbleClusterProps) {
  if (count === 0) return <div className="h-9 sm:h-12" />;

  const visibleCount = Math.min(count, maxVisible);
  const extra = count - visibleCount;

  // Responsive grid layout:
  // 1-2 stones: 1 or 2 items centered
  // 3-4 stones: 2x2 grid
  // 5-6 stones: 2x3 grid
  const gridCols = visibleCount <= 1 ? 'grid-cols-1' : visibleCount <= 4 ? 'grid-cols-2' : 'grid-cols-3';

  return (
    <div className="flex flex-col items-center justify-center my-auto min-h-[36px] sm:min-h-[48px] py-1">
      <div className={`grid ${gridCols} gap-1 place-items-center`}>
        {Array.from({ length: visibleCount }).map((_, i) => (
          <Pebble key={i} theme={theme} player={player} index={i} />
        ))}
      </div>
      {extra > 0 && (
        <span className={`text-[9px] font-mono font-bold leading-none px-1.5 py-0.5 mt-0.5 rounded-full border shadow-xs ${
          theme === 'porcelain'
            ? 'bg-[#ede5d8] text-[#4a3e35] border-[#c8bea7]'
            : theme === 'walnut'
            ? 'bg-[#2a180e] text-[#fbbf24] border-[#4a2e1d]'
            : 'bg-[#181a24] text-sky-300 border-[#2d3244]'
        }`}>
          +{extra}
        </span>
      )}
    </div>
  );
}
