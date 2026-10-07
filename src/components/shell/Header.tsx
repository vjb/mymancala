import React from 'react';
import { RotateCcw, Settings } from 'lucide-react';
import { SkinTheme } from '../../theme';

interface HeaderProps {
  currentSkin: SkinTheme;
  onSelectSkin: (skin: SkinTheme) => void;
  onReset: () => void;
  onOpenSettings?: () => void;
  theme: any;
}

export const Header: React.FC<HeaderProps> = ({
  currentSkin,
  onSelectSkin,
  onReset,
  onOpenSettings,
  theme
}) => {
  return (
    <header className={`border-b ${theme.headerBorder} ${theme.headerBg} backdrop-blur-md sticky top-0 z-40 px-3 sm:px-6 py-2 transition-colors w-full overflow-hidden`}>
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
        {/* Brand Mark */}
        <div className="flex items-center space-x-2 shrink-0">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold border shadow-xs ${
            currentSkin === 'porcelain' 
              ? 'bg-[#eae3d5] border-[#d8cfbe] text-[#342e29]' 
              : currentSkin === 'walnut'
              ? 'bg-[#2b1b12] border-[#4a2e1d] text-amber-300'
              : 'bg-[#181a24] border-[#292d3b] text-sky-300'
          }`}>
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="8" cy="12" r="3.5" />
              <circle cx="16" cy="12" r="3.5" />
            </svg>
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <h1 className="font-extrabold text-sm sm:text-base tracking-tight">
                Mancala
              </h1>
              <span className={`text-floor text-xs uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-full border ${
                currentSkin === 'porcelain'
                  ? 'bg-[#eee7dc] text-[#5e5346] border-[#d8cfbe]'
                  : currentSkin === 'walnut'
                  ? 'bg-[#2a1a12] text-amber-300/90 border-[#4a2e1d]'
                  : 'bg-[#151722] text-sky-300 border-[#2b3042]'
              }`}>
                Coach
              </span>
            </div>
          </div>
        </div>

        {/* Theme Switcher & Fast Reset */}
        <div className="flex items-center space-x-1.5 shrink-0">
          {/* Skin Selector Pill */}
          <div className={`flex items-center rounded-xl p-0.5 border text-xs ${
            currentSkin === 'porcelain' ? 'bg-[#ede5d8] border-[#dbd0c0]' : 'bg-black/30 border-white/10'
          }`}>
            <button
              onClick={() => onSelectSkin('walnut')}
              title="Warm Walnut"
              className={`px-2 py-1 rounded-lg font-semibold transition ${
                currentSkin === 'walnut' 
                  ? 'bg-[#3b2316] text-amber-200 shadow-xs' 
                  : `${theme.cardTextMuted} hover:opacity-100`
              }`}
            >
              Walnut
            </button>

            <button
              onClick={() => onSelectSkin('porcelain')}
              title="Nordic Clay"
              className={`px-2 py-1 rounded-lg font-semibold transition ${
                currentSkin === 'porcelain' 
                  ? 'bg-white text-[#2c2723] shadow-xs' 
                  : `${theme.cardTextMuted} hover:opacity-100`
              }`}
            >
              Clay
            </button>

            <button
              onClick={() => onSelectSkin('obsidian')}
              title="Midnight Slate"
              className={`px-2 py-1 rounded-lg font-semibold transition ${
                currentSkin === 'obsidian' 
                  ? 'bg-[#202330] text-sky-200 shadow-xs' 
                  : `${theme.cardTextMuted} hover:opacity-100`
              }`}
            >
              Slate
            </button>
          </div>

          {/* Settings Drawer Button */}
          {onOpenSettings && (
            <button
              onClick={onOpenSettings}
              data-testid="header-settings-btn"
              title="Settings & Options"
              className={`flex items-center space-x-1 px-2.5 py-1 rounded-xl border text-xs font-bold transition shadow-xs ${
                currentSkin === 'porcelain'
                  ? 'bg-stone-200 hover:bg-stone-300 text-stone-800 border-stone-300'
                  : 'bg-white/10 hover:bg-white/15 text-white border-white/15'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Settings</span>
            </button>
          )}

          {/* Quick Reset Button */}
          <button
            onClick={onReset}
            data-testid="reset-game-btn"
            title="Reset Board"
            className={`flex items-center space-x-1 px-2.5 py-1 rounded-xl border text-xs font-bold transition shadow-xs ${
              currentSkin === 'porcelain'
                ? 'bg-[#2c2723] hover:bg-[#1a1714] text-white border-transparent'
                : 'bg-white/10 hover:bg-white/15 text-white border-white/15'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">New</span>
          </button>
        </div>
      </div>
    </header>
  );
};
