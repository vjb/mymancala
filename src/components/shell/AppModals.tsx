import React, { useState, useEffect } from 'react';
import { RulesModal } from '../../RulesModal';
import { GameReviewModal, GameReviewData } from '../../GameReviewModal';
import { DiagnosticsModal } from '../modals/DiagnosticsModal';
import { TutorialModal } from '../modals/TutorialModal';
import { AudiencePickerModal, AudienceProfile } from '../modals/AudiencePickerModal';
import { HighlightLegendModal } from '../modals/HighlightLegendModal';
import { ReplayModal } from '../modals/ReplayModal';
import { InstallPrompt } from '../pwa/InstallPrompt';
import { SkinTheme } from '../../theme';
import { DiagnosticResult } from '../../preflight-diagnostics';

export interface AppModalsProps {
  rulesOpen: boolean;
  setRulesOpen: (open: boolean) => void;
  gameReviewOpen: boolean;
  setGameReviewOpen: (open: boolean) => void;
  diagnosticsOpen: boolean;
  setDiagnosticsOpen: (open: boolean) => void;
  tutorialOpen: boolean;
  setTutorialOpen: (open: boolean) => void;
  audienceOpen: boolean;
  setAudienceOpen: (open: boolean) => void;
  legendOpen: boolean;
  setLegendOpen: (open: boolean) => void;
  currentSkin: SkinTheme;
  gameReviewData: GameReviewData;
  colorblindSafe: boolean;
  onRematch: () => void;
  onPracticeMistakes?: () => void;
  diagResults: DiagnosticResult[];
  isDiagRunning: boolean;
  handleRunDiagnostics: () => void;
  handleSelectProfile: (profile: AudienceProfile) => void;
}

export const AppModals: React.FC<AppModalsProps> = ({
  rulesOpen,
  setRulesOpen,
  gameReviewOpen,
  setGameReviewOpen,
  diagnosticsOpen,
  setDiagnosticsOpen,
  tutorialOpen,
  setTutorialOpen,
  audienceOpen,
  setAudienceOpen,
  legendOpen,
  setLegendOpen,
  currentSkin,
  gameReviewData,
  colorblindSafe,
  onRematch,
  onPracticeMistakes,
  diagResults,
  isDiagRunning,
  handleRunDiagnostics,
  handleSelectProfile,
}) => {
  const [replayOpen, setReplayOpen] = useState(() => {
    try {
      return typeof window !== 'undefined' && window.location.hash.startsWith('#/r/');
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const handleHash = () => {
      if (typeof window !== 'undefined' && window.location.hash.startsWith('#/r/')) {
        setReplayOpen(true);
      }
    };
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  return (
    <>
      <RulesModal
        isOpen={rulesOpen}
        onClose={() => setRulesOpen(false)}
        currentSkin={currentSkin}
        onOpenTutorial={() => { setRulesOpen(false); setTutorialOpen(true); }}
        onOpenLegend={() => { setRulesOpen(false); setLegendOpen(true); }}
      />
      <GameReviewModal
        isOpen={gameReviewOpen}
        onClose={() => setGameReviewOpen(false)}
        onRematch={onRematch}
        reviewData={gameReviewData}
        colorblindSafe={colorblindSafe}
        onPracticeMistakes={onPracticeMistakes}
      />
      {diagnosticsOpen && (
        <DiagnosticsModal
          results={diagResults}
          isRunning={isDiagRunning}
          onRun={handleRunDiagnostics}
          onClose={() => setDiagnosticsOpen(false)}
        />
      )}
      <TutorialModal
        isOpen={tutorialOpen}
        onClose={() => setTutorialOpen(false)}
        currentSkin={currentSkin}
      />
      <AudiencePickerModal
        isOpen={audienceOpen}
        onClose={() => setAudienceOpen(false)}
        onSelectProfile={handleSelectProfile}
        currentSkin={currentSkin}
      />
      <HighlightLegendModal
        isOpen={legendOpen}
        onClose={() => setLegendOpen(false)}
        currentSkin={currentSkin}
      />
      <ReplayModal
        isOpen={replayOpen}
        onClose={() => {
          setReplayOpen(false);
          try {
            if (window.location.hash.startsWith('#/r/')) {
              window.history.replaceState(null, '', window.location.pathname);
            }
          } catch {}
        }}
        theme={{ cardBorder: 'border-white/10', cardBg: 'bg-[#1c1612]' }}
        currentSkin={currentSkin}
      />
      <InstallPrompt
        hasCompletedFirstGame={gameReviewData?.totalMoves > 0}
        theme={{ cardBorder: 'border-white/10' }}
      />
    </>
  );
};
