import React from 'react';
import { LayoutGrid, BarChart3, Sparkles, BookOpen, Settings } from 'lucide-react';

interface BottomTrayProps {
  mobileTab: 'board' | 'analysis' | 'settings';
  onSelectTab: (tab: 'board' | 'analysis' | 'settings') => void;
  tutorMode: boolean;
  onToggleTutor: () => void;
  onOpenRules: () => void;
  theme: any;
}

export const BottomTray: React.FC<BottomTrayProps> = ({
  mobileTab,
  onSelectTab,
  tutorMode,
  onToggleTutor,
  onOpenRules,
  theme
}) => {
  return (
    <nav 
      aria-label="Main Navigation"
      data-testid="bottom-tray"
      className={`fixed bottom-0 left-0 right-0 z-50 backdrop-blur-xl border-t py-1 px-2 flex lg:hidden items-center justify-between shadow-2xl transition-colors ${theme.thumbBarBg} ${theme.thumbBarBorder}`}
      style={{ paddingBottom: 'max(0.6rem, env(safe-area-inset-bottom))' }}
    >
      <button
        onClick={() => onSelectTab('board')}
        data-testid="bottom-board-btn"
        className={`flex flex-col items-center justify-center flex-1 py-1.5 px-1 rounded-xl transition active:scale-95 ${
          mobileTab === 'board' ? theme.tabActiveText : theme.cardTextMuted
        }`}
      >
        <LayoutGrid className="w-5 h-5" />
        <span className="text-floor text-xs font-semibold mt-0.5">Board</span>
      </button>

      <button
        onClick={() => onSelectTab('analysis')}
        data-testid="bottom-analysis-btn"
        className={`flex flex-col items-center justify-center flex-1 py-1.5 px-1 rounded-xl transition active:scale-95 ${
          mobileTab === 'analysis' ? theme.tabActiveText : theme.cardTextMuted
        }`}
      >
        <BarChart3 className="w-5 h-5" />
        <span className="text-floor text-xs font-semibold mt-0.5">Analysis</span>
      </button>

      {/* 1-Tap Toggle for Coach Mode */}
      <button
        onClick={onToggleTutor}
        data-testid="tutor-toggle"
        title={tutorMode ? "Coach mode active (will intervene on blunders)" : "Coach mode off"}
        className={`flex flex-col items-center justify-center flex-1 py-1.5 px-1 rounded-xl transition active:scale-95 ${
          tutorMode ? (theme.id === 'porcelain' ? 'text-emerald-800 font-bold' : 'text-emerald-400 font-bold') : theme.cardTextMuted
        }`}
      >
        <Sparkles className="w-5 h-5" />
        <span className="text-floor text-xs font-semibold mt-0.5">{tutorMode ? "Coach On" : "Coach Off"}</span>
      </button>

      {/* Rules Button in Mobile Nav (Kept on tray only per user request) */}
      <button
        onClick={onOpenRules}
        data-testid="bottom-rules-btn"
        title="How to Play Mancala (Quick Guide)"
        className={`flex flex-col items-center justify-center flex-1 py-1.5 px-1 rounded-xl transition active:scale-95 ${theme.cardTextMuted} hover:opacity-100`}
      >
        <BookOpen className={`w-5 h-5 ${theme.id === 'porcelain' ? 'text-amber-800' : 'text-amber-400'}`} />
        <span className="text-floor text-xs font-semibold mt-0.5">Rules</span>
      </button>

      <button
        onClick={() => onSelectTab('settings')}
        data-testid="bottom-settings-btn"
        className={`flex flex-col items-center justify-center flex-1 py-1.5 px-1 rounded-xl transition active:scale-95 ${
          mobileTab === 'settings' ? theme.tabActiveText : theme.cardTextMuted
        }`}
      >
        <Settings className="w-5 h-5" />
        <span className="text-floor text-xs font-semibold mt-0.5">Settings</span>
      </button>
    </nav>
  );
};
