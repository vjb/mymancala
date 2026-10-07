import React from 'react';
import { SkinTheme } from '../../theme';
import { Pebble } from '../../Pebble';

interface StorePebbleStackProps {
  count: number;
  theme: SkinTheme;
  player: 'p1' | 'p2';
  maxVisible?: number;
}

export const StorePebbleStack: React.FC<StorePebbleStackProps> = ({
  count,
  theme,
  player,
  maxVisible = 24
}) => {
  if (count === 0) return <div className="flex-1 w-full" />;

  const visibleCount = Math.min(count, maxVisible);
  const extra = count - visibleCount;

  // Stacking logic: 2 columns on mobile/tablet, 3 columns on large desktop screens
  const colsClass = visibleCount <= 1 ? 'grid-cols-1' : 'grid-cols-2 lg:grid-cols-3';

  return (
    <div className="flex-1 w-full flex flex-col justify-end items-center px-0.5 pb-1 overflow-hidden">
      {extra > 0 && (
        <span className={`text-[10px] sm:text-xs font-mono font-bold px-1.5 py-0.5 mb-1 rounded-full border shadow-xs animate-in fade-in duration-150 ${
          theme === 'high-contrast'
            ? 'bg-black text-white border-white'
            : theme === 'porcelain'
            ? 'bg-[#ede5d8] text-[#4a3e35] border-[#c8bea7]'
            : theme === 'walnut'
            ? 'bg-[#2a180e] text-[#fbbf24] border-[#4a2e1d]'
            : 'bg-[#181a24] text-sky-300 border-[#2d3244]'
        }`}>
          +{extra}
        </span>
      )}
      <div className={`grid ${colsClass} gap-1 sm:gap-1.5 place-items-center max-h-[260px] sm:max-h-[300px] overflow-hidden`}>
        {Array.from({ length: visibleCount }).map((_, i) => (
          <Pebble key={i} theme={theme} player={player} index={i} />
        ))}
      </div>
    </div>
  );
};
