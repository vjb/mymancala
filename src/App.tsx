import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { loadLenses, saveLenses, detectPreset, applyPreset, toggleLens, LensId, LensState } from './lenses';
import { runGNUPreflightSuite, DiagnosticResult } from './preflight-diagnostics';
import { haptics } from './haptics';
import { I18nProvider, useTranslation } from './i18n';
import { BOT_PERSONAS, DEFAULT_BOT_ID } from './bots';
import { P1_STORE, P2_STORE } from './engine';
import { kalahRuleSet } from './rules';
import { AppModals } from './components/shell/AppModals';
import { GameReviewData } from './GameReviewModal';
import { AudienceProfile, ONBOARDING_STORAGE_KEY } from './components/modals/AudiencePickerModal';
import { Header } from './components/shell/Header';
import { ActionBar } from './components/shell/ActionBar';
import { EvalGauge } from './components/shell/EvalGauge';
import { TurnBanner } from './components/shell/TurnBanner';
import { BottomTray } from './components/shell/BottomTray';
import { LiveAnnouncer } from './components/shell/LiveAnnouncer';
import { Board } from './components/board/Board';
import { BotDialogueBubble } from './components/board/BotDialogueBubble';
import { CoachPanel } from './components/panels/CoachPanel';
import { AnalysisPanel } from './components/panels/AnalysisPanel';
import { SettingsPanel } from './components/panels/SettingsPanel';
import { SettingsDrawer } from './components/modals/SettingsDrawer';
import { useGame } from './game/useGame';
import { useUserSettings } from './game/useUserSettings';
import { computeGameReviewData } from './game/reviewHelper';
import { buildSettingsProps } from './game/settingsPropsHelper';

function MancalaGame() {
  const { t } = useTranslation();
  const settings = useUserSettings();
  const {
    currentSkin, setCurrentSkin, theme,
    colorblindSafe, isReducedMotion,
    bigMode, tapTwice,
  } = settings;

  const [lenses, setLenses] = useState<LensState>(() => loadLenses());
  useEffect(() => {
    saveLenses(lenses);
  }, [lenses]);

  const setLens = useCallback((id: LensId, val?: boolean) => {
    setLenses(prev => toggleLens(prev, id, val));
  }, []);

  const activePreset = detectPreset(lenses);

  const isAnalysisEmpty = useMemo(() => (
    activePreset === 'justPlay' ||
    (!lenses.advantageBar && !lenses.bestMoveMarks && !lenses.threatPits &&
      !lenses.landingPreview && !lenses.coach && !lenses.explanations &&
      !lenses.errorRate && !lenses.winPercent && !lenses.mainLine)
  ), [activePreset, lenses]);

  const [mobileTab, setMobileTab] = useState<'board' | 'analysis' | 'settings'>('board');
  const [evalBarCollapsed, setEvalBarCollapsed] = useState(false);
  const [expandedAnalysisPit, setExpandedAnalysisPit] = useState<number | null>(null);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [gameReviewOpen, setGameReviewOpen] = useState(false);
  const [botSelectOpen, setBotSelectOpen] = useState(false);
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false);
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [legendOpen, setLegendOpen] = useState(false);
  const [audienceOpen, setAudienceOpen] = useState(() => {
    try {
      if (typeof window !== 'undefined' && window.location.search.includes('onboarding')) return true;
      return !localStorage.getItem(ONBOARDING_STORAGE_KEY);
    } catch {
      return false;
    }
  });
  const [diagResults, setDiagResults] = useState<DiagnosticResult[]>([]);
  const [isDiagRunning, setIsDiagRunning] = useState(false);

  useEffect(() => {
    runGNUPreflightSuite().then(setDiagResults);
    const handleGlobalKey = (e: KeyboardEvent) => {
      if (e.key === '?' && !['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        setRulesOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, []);

  const handleRunDiagnostics = async () => {
    setIsDiagRunning(true);
    setDiagResults(await runGNUPreflightSuite());
    setIsDiagRunning(false);
  };

  const handleSelectProfile = (profile: AudienceProfile) => {
    try { localStorage.setItem(ONBOARDING_STORAGE_KEY, profile); } catch {}
    setAudienceOpen(false);
    const presets: Record<AudienceProfile, any> = { kid: 'justPlay', casual: 'hints', learner: 'coach', analyst: 'full' };
    if (presets[profile]) setLenses(applyPreset(presets[profile]));
  };

  const game = useGame({
    lenses,
    onGameOver: () => setTimeout(() => setGameReviewOpen(true), 800),
    isReducedMotion,
  });
  const activeBot = BOT_PERSONAS[game.state.selectedBotId] || BOT_PERSONAS[DEFAULT_BOT_ID];
  const gameReviewData: GameReviewData = useMemo(() => computeGameReviewData(game.state, activeBot), [game.state, activeBot]);

  const liveMessage = useMemo(() => {
    if (game.state.isGameOver) {
      return game.state.winner !== null ? `Game over. Player ${game.state.winner + 1} wins.` : 'Game over. Draw game.';
    }
    const s = game.state.lastMoveSummary;
    if (s) {
      return `Player ${s.player + 1} played pit ${s.pit + 1}.${s.captured > 0 ? ` Captured ${s.captured}.` : ''}${s.freeTurn ? ' Free turn!' : ''}`;
    }
    return `Player ${game.state.currentPlayer + 1}'s turn.`;
  }, [game.state.isGameOver, game.state.winner, game.state.lastMoveSummary, game.state.currentPlayer]);

  const [settingsDrawerOpen, setSettingsDrawerOpen] = useState(false);

  const settingsProps = buildSettingsProps({
    settings,
    lenses,
    activePreset,
    setLens,
    setLenses,
    game,
    mobileHidden: mobileTab === 'analysis',
    onOpenDiagnostics: () => setDiagnosticsOpen(true),
    onOpenTutorial: () => setTutorialOpen(true),
    onOpenAudience: () => setAudienceOpen(true),
    onOpenLegend: () => setLegendOpen(true),
    onOpenBotModal: () => setBotSelectOpen(true),
  });

  return (
    <div className={`flex flex-col min-h-screen ${theme.appBg} ${theme.appText} transition-colors duration-300 overflow-x-hidden w-full`}>
      <LiveAnnouncer message={liveMessage} />
      <Header
        currentSkin={currentSkin}
        onSelectSkin={setCurrentSkin}
        onReset={game.handleResetGame}
        onOpenSettings={() => setSettingsDrawerOpen(true)}
        theme={theme}
      />

      <main className="max-w-7xl mx-auto w-full p-2.5 sm:p-5 pb-24 lg:pb-8 flex-1 flex flex-col gap-3 sm:gap-4 overflow-x-hidden">
        {game.savedGamePrompt && (
          <div className="p-3 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-between gap-3 text-xs">
            <span>You have an unfinished game in progress. Would you like to resume?</span>
            <div className="flex gap-2 shrink-0">
              <button onClick={game.handleResumeSavedGame} className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl">Continue Game</button>
              <button onClick={game.handleDismissSavedGame} className="px-3 py-1 bg-white/10 hover:bg-white/20 text-slate-300 rounded-xl">New Game</button>
            </div>
          </div>
        )}

        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 items-start">
          {/* Left Column (Cols 1-7 on Desktop): Arena & Controls */}
          <div className={`lg:col-span-7 xl:col-span-7 flex flex-col gap-3 sm:gap-4 ${mobileTab !== 'board' ? 'hidden lg:flex' : 'flex'}`}>
            <EvalGauge
              visible={lenses.advantageBar} collapsed={evalBarCollapsed}
              onToggleCollapse={() => setEvalBarCollapsed(!evalBarCollapsed)}
              stoneAdvantage={game.currentStoneAdvantage} barRatio={game.p1BarRatio}
              showHints={lenses.bestMoveMarks} showErrorRate={lenses.errorRate}
              matchStats={game.state.matchStats} currentPlayer={game.state.currentPlayer}
              isGameOver={game.state.isGameOver} gameMode={game.state.gameMode}
              humanPlayer={game.state.humanPlayer} searchDepth={game.state.searchDepth}
              colorblindSafe={colorblindSafe} theme={theme} currentSkin={currentSkin}
              isExact={game.isExactAnalysis}
            />

            <TurnBanner
              currentPlayer={game.state.currentPlayer} totalStones={game.totalBoardStones}
              showHints={lenses.bestMoveMarks} onToggleHints={() => setLens('bestMoveMarks', !lenses.bestMoveMarks)}
              hasEarnedFreeTurn={game.hasEarnedFreeTurn} hoverPreview={game.hoverPreview}
              isGameOver={game.state.isGameOver} winner={game.state.winner}
              p1Score={game.state.board[P1_STORE]} p2Score={game.state.board[P2_STORE]}
              gameMode={game.state.gameMode} humanPlayer={game.state.humanPlayer}
              botName={activeBot.name} animatingState={game.animatingState}
              isAiThinking={game.isAiThinking} searchDepth={game.state.searchDepth}
              lastMoveSummary={game.state.lastMoveSummary} onOpenReview={() => setGameReviewOpen(true)}
              theme={theme} currentSkin={currentSkin}
            />

            <div className="relative w-full">
              {game.state.gameMode === 'pve' && game.botDialogue && (
                <div className="absolute top-2 left-1/2 -translate-x-1/2 z-40 pointer-events-auto">
                  <BotDialogueBubble
                    dialogue={game.botDialogue} bot={activeBot}
                    currentSkin={currentSkin} theme={theme}
                    onDismiss={() => game.setBotDialogue(null)}
                  />
                </div>
              )}

              <Board
                displayBoard={game.displayBoard} currentPlayer={game.state.currentPlayer}
                isGameOver={game.state.isGameOver} animatingState={game.animatingState}
                isMoveLocked={game.isMoveLocked} analysisResults={game.analysisResults}
                showHints={lenses.bestMoveMarks} showThreats={lenses.threatPits}
                hoverPreview={game.hoverPreview} hoveredPit={game.hoveredPit}
                setHoveredPit={game.setHoveredPit} tutorWarning={game.tutorWarning}
                lastMovedPit={game.state.lastMovedPit} gameMode={game.state.gameMode}
                onPitClick={game.handlePitClick} onSandboxAdjust={game.handleSandboxPitAdjust}
                theme={theme} currentSkin={currentSkin} bigMode={bigMode} tapTwice={tapTwice}
              />
            </div>

            <ActionBar
              canUndo={game.state.gameMovesHistory.length > 0 && !game.state.isGameOver}
              onUndo={game.handleUndoMove} showHints={lenses.bestMoveMarks}
              onToggleHints={() => setLens('bestMoveMarks', !lenses.bestMoveMarks)}
              onResetGame={game.handleResetGame} gameMode={game.state.gameMode}
              botName={activeBot.name} isAiThinking={game.isAiThinking}
              theme={theme} currentSkin={currentSkin}
              onOpenBotModal={() => setBotSelectOpen(true)}
            />

            {game.tutorWarning && (
              <CoachPanel
                warning={game.tutorWarning} showDetails={game.showCoachDetails}
                onToggleDetails={() => game.setShowCoachDetails(prev => !prev)}
                onReconsider={game.handleTutorReconsider} onPlayBest={game.handleTutorPlayBest}
                onConfirm={game.handleTutorConfirmAnyway} showExplanations={lenses.explanations}
                currentSkin={currentSkin}
              />
            )}
          </div>

          {/* Right Column (Cols 8-12 on Desktop): Analysis & History */}
          <div className={`lg:col-span-5 xl:col-span-5 flex flex-col gap-4 ${mobileTab === 'board' ? 'hidden lg:flex' : 'flex'}`}>
            <AnalysisPanel
              analysisResults={game.analysisResults} isAnalyzing={game.isAnalyzing}
              searchDepth={game.state.searchDepth} matchStats={game.state.matchStats}
              showErrorRate={lenses.errorRate} showWinPercent={lenses.winPercent}
              showMainLine={lenses.mainLine} canReview={game.state.isGameOver || game.state.gameMovesHistory.length >= 2}
              onOpenReview={() => setGameReviewOpen(true)} expandedPit={expandedAnalysisPit}
              onToggleExpandPit={(pit) => setExpandedAnalysisPit(prev => prev === pit ? null : pit)}
              onPlayMove={(pit) => game.executeMove(pit, true)} isGameOver={game.state.isGameOver}
              board={game.state.board} currentPlayer={game.state.currentPlayer} rules={game.state.rules}
              colorblindSafe={colorblindSafe} currentSkin={currentSkin} theme={theme}
              mobileHidden={mobileTab === 'settings'} layout={kalahRuleSet.layout}
              isAnalysisEmpty={isAnalysisEmpty} onApplyPreset={(p) => setLenses(applyPreset(p))}
              onNavigateTab={(tab) => setMobileTab(tab)} isExact={game.isExactAnalysis}
            />

            {/* Settings View: strictly in slide-over drawer on desktop; mobile tab only on small screens */}
            {mobileTab === 'settings' && (
              <div className="lg:hidden">
                <SettingsPanel {...settingsProps} mobileHidden={false} />
              </div>
            )}
          </div>
        </div>
      </main>

      <SettingsDrawer
        isOpen={settingsDrawerOpen}
        onClose={() => setSettingsDrawerOpen(false)}
        settingsProps={settingsProps}
        theme={theme}
        currentSkin={currentSkin}
      />

      <BottomTray
        mobileTab={mobileTab} onSelectTab={(tab) => { haptics.tap(); setMobileTab(tab); }}
        tutorMode={lenses.coach} onToggleTutor={() => { haptics.tap(); setLens('coach', !lenses.coach); }}
        onOpenRules={() => { haptics.tap(); setRulesOpen(true); }} theme={theme}
      />

      <AppModals
        rulesOpen={rulesOpen} setRulesOpen={setRulesOpen} gameReviewOpen={gameReviewOpen} setGameReviewOpen={setGameReviewOpen}
        diagnosticsOpen={diagnosticsOpen} setDiagnosticsOpen={setDiagnosticsOpen} tutorialOpen={tutorialOpen} setTutorialOpen={setTutorialOpen}
        audienceOpen={audienceOpen} setAudienceOpen={setAudienceOpen} legendOpen={legendOpen} setLegendOpen={setLegendOpen}
        botSelectOpen={botSelectOpen} setBotSelectOpen={setBotSelectOpen} selectedBotId={game.state.selectedBotId} onSelectBot={game.handleSetBot}
        currentSkin={currentSkin} gameReviewData={gameReviewData} colorblindSafe={colorblindSafe}
        onRematch={() => { setGameReviewOpen(false); game.handleResetGame(); }} onPracticeMistakes={() => setMobileTab('analysis')}
        diagResults={diagResults} isDiagRunning={isDiagRunning} handleRunDiagnostics={handleRunDiagnostics}
        handleSelectProfile={handleSelectProfile} theme={theme}
      />

      <footer className={`hidden sm:block border-t ${theme.headerBorder} py-3 px-4 text-center text-xs ${theme.cardTextMuted} transition-colors`}>
        Mancala Analytical Engine • Handcrafted Artisanal Themes & Minimax PV Rollouts
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <I18nProvider>
      <MancalaGame />
    </I18nProvider>
  );
}
