import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  Play, Pause, RotateCcw, Award, Settings, BarChart3, 
  Sparkles, Volume2, VolumeX, Eye, 
  ArrowRight, AlertTriangle, Zap, CheckCircle2, ShieldCheck, X,
  ShieldAlert, HelpCircle, EyeOff, LayoutGrid, Palette, Bot, User
} from 'lucide-react';
import {
  createInitialState,
  simulateMove,
  analyzeAllMoves,
  transpositionTable,
  P1_STORE,
  P2_STORE,
  P1_PITS,
  P2_PITS,
  RulesConfig,
  GameState,
  EvaluatedMove
} from './engine';
import { runGNUPreflightSuite, DiagnosticResult } from './preflight-diagnostics';
import { sounds } from './sound';
import { SkinTheme, THEMES } from './theme';
import { PebbleCluster } from './Pebble';

export default function App() {
  const [stonesConfig, setStonesConfig] = useState(4);
  const [rules, setRules] = useState<RulesConfig>({ freeTurn: true, captureOpposite: true });
  const [gameState, setGameState] = useState<GameState>(() => createInitialState(4));
  const [searchDepth, setSearchDepth] = useState(5);
  
  // Theme / Skin State
  const [currentSkin, setCurrentSkin] = useState<SkinTheme>('walnut');
  const theme = THEMES[currentSkin];

  // Game modes: 'pve', 'pvp', 'ai_vs_ai', 'sandbox'
  const [gameMode, setGameMode] = useState<string>('pve');
  const [humanPlayer, setHumanPlayer] = useState<number>(0); // 0 = P1 (South), 1 = P2 (North)
  const [tutorMode, setTutorMode] = useState(true);
  const [isAiRunning, setIsAiRunning] = useState(false);
  const [aiSpeedMs, setAiSpeedMs] = useState(600);
  const [instantSpeed, setInstantSpeed] = useState(false);

  // Red Team Accessibility & Layout Features
  const [colorblindSafe, setColorblindSafe] = useState(false);
  const [mobileTab, setMobileTab] = useState<'board' | 'analysis' | 'settings'>('board');

  // Input debouncing & concurrency mutex lock
  const isMoveLocked = useRef(false);

  // Analysis state
  const [analysisResults, setAnalysisResults] = useState<EvaluatedMove[]>([]);
  const [hoveredPit, setHoveredPit] = useState<number | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [tutorWarning, setTutorWarning] = useState<{
    pit: number;
    eval: EvaluatedMove;
    bestMove: EvaluatedMove;
  } | null>(null);

  // Diagnostics HUD State
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false);
  const [diagResults, setDiagResults] = useState<DiagnosticResult[]>([]);
  const [isDiagRunning, setIsDiagRunning] = useState(false);

  // Performance Rating (PR) Tracker
  const [matchStats, setMatchStats] = useState({
    p1Moves: 0,
    p2Moves: 0,
    p1TotalLoss: 0,
    p2TotalLoss: 0,
    p1Blunders: 0,
    p2Blunders: 0
  });

  const [soundEnabled, setSoundEnabled] = useState(true);
  useEffect(() => {
    sounds.muted = !soundEnabled;
  }, [soundEnabled]);

  // Run pre-flight suite on initial load
  useEffect(() => {
    runGNUPreflightSuite().then(results => {
      setDiagResults(results);
    });
  }, []);

  const handleRunDiagnostics = async () => {
    setIsDiagRunning(true);
    const res = await runGNUPreflightSuite();
    setDiagResults(res);
    setIsDiagRunning(false);
  };

  const runAnalysis = useCallback((board: number[], player: number) => {
    setIsAnalyzing(true);
    const timer = setTimeout(() => {
      const results = analyzeAllMoves(board, player, searchDepth, rules);
      setAnalysisResults(results);
      setIsAnalyzing(false);
    }, 10);
    return () => clearTimeout(timer);
  }, [searchDepth, rules]);

  useEffect(() => {
    if (!gameState.isGameOver) {
      runAnalysis(gameState.board, gameState.currentPlayer);
    } else {
      setAnalysisResults([]);
    }
  }, [gameState.board, gameState.currentPlayer, gameState.isGameOver, runAnalysis]);

  const executeMove = useCallback((pitIndex: number, force = false) => {
    if (gameState.isGameOver) return;
    
    // Concurrency mutex check
    if (isMoveLocked.current && !force) return;
    isMoveLocked.current = true;

    try {
      // Check legality
      const legalPits = gameState.currentPlayer === 0 ? P1_PITS : P2_PITS;
      if (!(legalPits as readonly number[]).includes(pitIndex) || gameState.board[pitIndex] === 0) {
        isMoveLocked.current = false;
        return;
      }

      // Check tutor warning if Human in Tutor mode
      if (!force && tutorMode && gameMode === 'pve' && gameState.currentPlayer === humanPlayer) {
        const moveEval = analysisResults.find(m => m.pit === pitIndex);
        if (moveEval && (moveEval.classification === 'Mistake' || moveEval.classification === 'Blunder')) {
          setTutorWarning({
            pit: pitIndex,
            eval: moveEval,
            bestMove: analysisResults[0]
          });
          isMoveLocked.current = false;
          return;
        }
      }

      // Play procedural audio
      sounds.playSow(gameState.board[pitIndex]);

      // Track PR stats
      const chosenEval = analysisResults.find(m => m.pit === pitIndex);
      if (chosenEval) {
        setMatchStats(prev => {
          const isP1 = gameState.currentPlayer === 0;
          return {
            ...prev,
            p1Moves: isP1 ? prev.p1Moves + 1 : prev.p1Moves,
            p2Moves: !isP1 ? prev.p2Moves + 1 : prev.p2Moves,
            p1TotalLoss: isP1 ? prev.p1TotalLoss + chosenEval.equityLoss : prev.p1TotalLoss,
            p2TotalLoss: !isP1 ? prev.p2TotalLoss + chosenEval.equityLoss : prev.p2TotalLoss,
            p1Blunders: isP1 && chosenEval.classification === 'Blunder' ? prev.p1Blunders + 1 : prev.p1Blunders,
            p2Blunders: !isP1 && chosenEval.classification === 'Blunder' ? prev.p2Blunders + 1 : prev.p2Blunders
          };
        });
      }

      const result = simulateMove(gameState.board, gameState.currentPlayer, pitIndex, rules);

      if (!instantSpeed) {
        if (result.capturedStones > 0) {
          setTimeout(() => sounds.playCapture(), 120);
        }
        if (result.earnedFreeTurn && !result.isGameOver) {
          setTimeout(() => sounds.playFreeTurn(), 80);
        }
        if (result.isGameOver) {
          setTimeout(() => sounds.playGameOver(), 200);
        }
      }

      setGameState(prev => ({
        board: result.newBoard,
        currentPlayer: result.nextPlayer,
        isGameOver: result.isGameOver,
        winner: result.winner,
        moveHistory: [
          ...prev.moveHistory,
          {
            player: prev.currentPlayer,
            pit: pitIndex,
            freeTurn: result.earnedFreeTurn,
            captures: result.capturedStones
          }
        ],
        lastMovedPit: pitIndex
      }));

      setTutorWarning(null);
    } finally {
      setTimeout(() => {
        isMoveLocked.current = false;
      }, instantSpeed ? 10 : 80);
    }
  }, [gameState, tutorMode, gameMode, humanPlayer, analysisResults, rules, instantSpeed]);

  // AI turn automation
  useEffect(() => {
    if (gameState.isGameOver) {
      setIsAiRunning(false);
      return;
    }

    const isEngineTurn = 
      (gameMode === 'ai_vs_ai' && isAiRunning) || 
      (gameMode === 'pve' && gameState.currentPlayer !== humanPlayer);

    if (isEngineTurn && analysisResults.length > 0 && !isAnalyzing) {
      const timer = setTimeout(() => {
        const topMove = analysisResults[0];
        if (topMove) {
          executeMove(topMove.pit, true);
        }
      }, instantSpeed ? 20 : (gameMode === 'ai_vs_ai' ? aiSpeedMs : 450));

      return () => clearTimeout(timer);
    }
  }, [gameState.currentPlayer, gameState.isGameOver, gameMode, humanPlayer, isAiRunning, analysisResults, isAnalyzing, executeMove, aiSpeedMs, instantSpeed]);

  const handleResetGame = () => {
    transpositionTable.clear();
    setGameState(createInitialState(stonesConfig));
    setTutorWarning(null);
    setMatchStats({
      p1Moves: 0,
      p2Moves: 0,
      p1TotalLoss: 0,
      p2TotalLoss: 0,
      p1Blunders: 0,
      p2Blunders: 0
    });
  };

  const handleSandboxPitAdjust = (pitIndex: number, delta: number) => {
    setGameState(prev => {
      const newBoard = [...prev.board];
      newBoard[pitIndex] = Math.max(0, (newBoard[pitIndex] || 0) + delta);
      return { ...prev, board: newBoard };
    });
  };

  const hoverPreview = useMemo(() => {
    if (hoveredPit === null || gameState.board[hoveredPit] === 0) return null;
    const isP1 = gameState.currentPlayer === 0;
    const legalPits = isP1 ? P1_PITS : P2_PITS;
    if (!(legalPits as readonly number[]).includes(hoveredPit)) return null;

    const sim = simulateMove(gameState.board, gameState.currentPlayer, hoveredPit, rules);
    return sim;
  }, [hoveredPit, gameState.board, gameState.currentPlayer, rules]);

  // Total stone sum for Zero-Leak DOM assertion
  const totalBoardStones = useMemo(() => {
    return gameState.board.reduce((a, b) => a + b, 0);
  }, [gameState.board]);

  // Win probability calculation for GNU meter (Player 1 perspective)
  const p1CurrentWinProb = useMemo(() => {
    if (gameState.isGameOver) {
      if (gameState.winner === 0) return 1.0;
      if (gameState.winner === 1) return 0.0;
      return 0.5;
    }
    if (!analysisResults || analysisResults.length === 0) return 0.5;
    const top = analysisResults[0];
    return gameState.currentPlayer === 0 ? top.winProb : 1 - top.winProb;
  }, [gameState.isGameOver, gameState.winner, gameState.currentPlayer, analysisResults]);

  const calcPR = (loss: number, moves: number) => {
    if (moves === 0) return '0.00';
    const pr = ((loss * 100) / moves) * 3.5;
    return pr.toFixed(2);
  };

  // Helper for accessible badges & icons
  const renderGradeBadge = (classification: string, badgeColor: string) => {
    let icon = <CheckCircle2 className="w-3 h-3 mr-1 inline" />;
    let customColor = badgeColor;

    if (classification === 'Good') {
      icon = <Award className="w-3 h-3 mr-1 inline" />;
    } else if (classification === 'Inaccuracy') {
      icon = <HelpCircle className="w-3 h-3 mr-1 inline" />;
    } else if (classification === 'Mistake') {
      icon = <AlertTriangle className="w-3 h-3 mr-1 inline" />;
      if (colorblindSafe) {
        customColor = 'bg-orange-500/20 text-orange-400 border-orange-500/40';
      }
    } else if (classification === 'Blunder') {
      icon = <ShieldAlert className="w-3 h-3 mr-1 inline" />;
      if (colorblindSafe) {
        customColor = 'bg-fuchsia-600/25 text-fuchsia-400 border-fuchsia-600/40';
      }
    }

    return (
      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border flex items-center shrink-0 ${customColor}`}>
        {icon}
        <span>{classification}</span>
      </span>
    );
  };

  return (
    <div className={`flex flex-col min-h-screen ${theme.appBg} ${theme.appText} transition-colors duration-300`}>
      
      {/* Refined Modern Header */}
      <header className={`border-b ${theme.headerBorder} ${theme.headerBg} backdrop-blur-md sticky top-0 z-40 px-3 sm:px-6 py-2.5 transition-colors`}>
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          
          {/* Brand Mark */}
          <div className="flex items-center space-x-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-lg shadow-sm border ${
              currentSkin === 'porcelain' 
                ? 'bg-[#eae3d5] border-[#d8cfbe] text-[#342e29]' 
                : currentSkin === 'walnut'
                ? 'bg-[#2b1b12] border-[#4a2e1d] text-amber-300'
                : 'bg-[#181a24] border-[#292d3b] text-sky-300'
            }`}>
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="8" cy="12" r="3.5" />
                <circle cx="16" cy="12" r="3.5" />
              </svg>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="font-extrabold text-base sm:text-lg tracking-tight">
                  Mancala
                </h1>
                <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border ${
                  currentSkin === 'porcelain'
                    ? 'bg-[#eee7dc] text-[#5e5346] border-[#d8cfbe]'
                    : currentSkin === 'walnut'
                    ? 'bg-[#2a1a12] text-amber-300/90 border-[#4a2e1d]'
                    : 'bg-[#151722] text-sky-300 border-[#2b3042]'
                }`}>
                  Tournament AI
                </span>
              </div>
              <p className={`text-[11px] ${theme.cardTextMuted} hidden xs:block`}>
                {theme.tagline}
              </p>
            </div>
          </div>

          {/* Clean Segmented Controls & Theme Switcher */}
          <div className="flex items-center space-x-1.5 sm:space-x-2.5">
            
            {/* Skin Selector Pill */}
            <div className={`flex items-center rounded-xl p-0.5 border ${
              currentSkin === 'porcelain' ? 'bg-[#ede5d8] border-[#dbd0c0]' : 'bg-black/30 border-white/10'
            }`}>
              <button
                onClick={() => setCurrentSkin('walnut')}
                title="Warm Walnut (Artisanal Wood)"
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center space-x-1 transition ${
                  currentSkin === 'walnut' 
                    ? 'bg-[#3b2316] text-amber-200 shadow-sm' 
                    : `${theme.cardTextMuted} hover:opacity-100`
                }`}
              >
                <span>Walnut</span>
              </button>

              <button
                onClick={() => setCurrentSkin('porcelain')}
                title="Nordic Clay (Minimal Ceramic)"
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center space-x-1 transition ${
                  currentSkin === 'porcelain' 
                    ? 'bg-white text-[#2c2723] shadow-sm' 
                    : `${theme.cardTextMuted} hover:opacity-100`
                }`}
              >
                <span>Clay</span>
              </button>

              <button
                onClick={() => setCurrentSkin('obsidian')}
                title="Midnight Slate (Dark Obsidian)"
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center space-x-1 transition ${
                  currentSkin === 'obsidian' 
                    ? 'bg-[#202330] text-sky-200 shadow-sm' 
                    : `${theme.cardTextMuted} hover:opacity-100`
                }`}
              >
                <span>Slate</span>
              </button>
            </div>

            {/* Audio Toggle */}
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? "Mute sound" : "Enable sound"}
              className={`p-2 rounded-xl border transition ${
                currentSkin === 'porcelain'
                  ? 'bg-white/80 border-[#ded5c6] text-[#4a3e35] hover:bg-white'
                  : 'bg-black/30 border-white/10 text-slate-300 hover:bg-white/5'
              }`}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 opacity-50" />}
            </button>

            {/* Tutor Mode Pill */}
            <button
              onClick={() => setTutorMode(!tutorMode)}
              data-testid="tutor-toggle"
              className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition ${
                tutorMode 
                  ? currentSkin === 'porcelain'
                    ? 'bg-[#faebd7] border-[#e2be9b] text-[#9c5a23]'
                    : 'bg-amber-500/20 border-amber-500/40 text-amber-300 shadow-sm'
                  : currentSkin === 'porcelain'
                    ? 'bg-white/80 border-[#ded5c6] text-[#7d7368]'
                    : 'bg-black/30 border-white/10 text-slate-400'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Coach</span>
            </button>

            {/* New Game Button */}
            <button
              onClick={handleResetGame}
              data-testid="reset-game-btn"
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition shadow-sm ${
                currentSkin === 'porcelain'
                  ? 'bg-[#2c2723] hover:bg-[#1a1714] text-white border-transparent'
                  : 'bg-white/10 hover:bg-white/15 text-white border-white/15'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>New</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-5xl mx-auto w-full p-2.5 sm:p-5 pb-20 lg:pb-8 flex-1 flex flex-col gap-3.5 sm:gap-5 overflow-x-hidden">
        
        {/* Modern Live Win Probability & Evaluation Card */}
        <section 
          data-testid="eval-gauge"
          className={`${theme.cardBg} border ${theme.cardBorder} rounded-2xl sm:rounded-3xl p-3 sm:p-4 shadow-lg backdrop-blur-md transition-colors`}
        >
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-6">
            
            {/* Player 2 (North / Top) */}
            <div className="flex items-center justify-between sm:justify-start space-x-3 w-full sm:w-auto">
              <div className="flex items-center space-x-2.5">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center border ${
                  gameState.currentPlayer === 1 && !gameState.isGameOver
                    ? 'ring-2 ring-emerald-500/60 bg-emerald-500/20 border-emerald-500 text-emerald-300'
                    : 'bg-black/10 border-white/10 opacity-70'
                }`}>
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <div className={`text-[11px] font-semibold flex items-center gap-1 ${theme.cardTextMuted}`}>
                    <span>Player 2 (North)</span>
                    {gameMode === 'pve' && humanPlayer === 0 && <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-black/20 font-bold">Engine</span>}
                  </div>
                  <div className="text-sm sm:text-base font-extrabold tracking-tight">
                    {((1 - p1CurrentWinProb) * 100).toFixed(1)}% <span className={`text-[10px] font-normal ${theme.cardTextMuted}`}>chance</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Broadcast-Style Smooth Balance Bar */}
            <div className="w-full flex-1 max-w-lg mx-auto flex flex-col gap-1.5">
              <div className="flex justify-between text-[11px] font-semibold">
                <span className={currentSkin === 'porcelain' ? 'text-[#b85038]' : 'text-amber-400'}>
                  South: {(p1CurrentWinProb * 100).toFixed(1)}%
                </span>
                <span className={currentSkin === 'porcelain' ? 'text-[#3b6654]' : 'text-emerald-400'}>
                  North: {((1 - p1CurrentWinProb) * 100).toFixed(1)}%
                </span>
              </div>

              {/* Silky Capsule Equity Meter */}
              <div className={`h-3 sm:h-3.5 rounded-full border ${theme.barBg} overflow-hidden flex shadow-inner relative`}>
                <div 
                  className={`h-full transition-all duration-500 ease-out ${
                    colorblindSafe 
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-500' 
                      : theme.barP1
                  }`}
                  style={{ width: `${p1CurrentWinProb * 100}%` }}
                />
                <div 
                  className={`h-full transition-all duration-500 ease-out ${
                    colorblindSafe 
                      ? 'bg-gradient-to-l from-orange-500 to-amber-500' 
                      : theme.barP2
                  }`}
                  style={{ width: `${(1 - p1CurrentWinProb) * 100}%` }}
                />
                <div className={`absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-0.5 ${theme.barDivider} shadow-xs`} />
              </div>

              {/* Quality & PR Ratings */}
              <div className={`flex justify-between text-[10px] font-mono ${theme.cardTextMuted}`}>
                <span>PR: {calcPR(matchStats.p1TotalLoss, matchStats.p1Moves)} ({matchStats.p1Blunders} blunders)</span>
                <span>PR: {calcPR(matchStats.p2TotalLoss, matchStats.p2Moves)} ({matchStats.p2Blunders} blunders)</span>
              </div>
            </div>

            {/* Player 1 (South / Bottom) */}
            <div className="flex items-center justify-between sm:justify-end space-x-3 w-full sm:w-auto">
              <div className="text-left sm:text-right">
                <div className={`text-[11px] font-semibold flex items-center justify-start sm:justify-end gap-1 ${theme.cardTextMuted}`}>
                  {gameMode === 'pve' && humanPlayer === 0 && <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-black/20 font-bold">You</span>}
                  <span>Player 1 (South)</span>
                </div>
                <div className="text-sm sm:text-base font-extrabold tracking-tight">
                  {(p1CurrentWinProb * 100).toFixed(1)}% <span className={`text-[10px] font-normal ${theme.cardTextMuted}`}>chance</span>
                </div>
              </div>
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center border ${
                gameState.currentPlayer === 0 && !gameState.isGameOver
                  ? 'ring-2 ring-amber-500/60 bg-amber-500/20 border-amber-500 text-amber-300'
                  : 'bg-black/10 border-white/10 opacity-70'
              }`}>
                <User className="w-4 h-4" />
              </div>
            </div>

          </div>
        </section>

        {/* Mobile Segmented Navigation Tabs */}
        <div className={`flex lg:hidden rounded-2xl p-1 gap-1 border ${
          currentSkin === 'porcelain' ? 'bg-[#ede5d8] border-[#dbd0c0]' : 'bg-black/40 border-white/10'
        }`}>
          <button
            onClick={() => setMobileTab('board')}
            className={`flex-1 py-1.5 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition ${
              mobileTab === 'board' ? theme.tabActiveBg : theme.tabInactiveText
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Board</span>
          </button>
          <button
            onClick={() => setMobileTab('analysis')}
            className={`flex-1 py-1.5 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition ${
              mobileTab === 'analysis' ? theme.tabActiveBg : theme.tabInactiveText
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Analysis</span>
          </button>
          <button
            onClick={() => setMobileTab('settings')}
            className={`flex-1 py-1.5 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition ${
              mobileTab === 'settings' ? theme.tabActiveBg : theme.tabInactiveText
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Settings</span>
          </button>
        </div>

        {/* Tactile Mancala Board Section */}
        <section className={`${mobileTab !== 'board' ? 'hidden lg:block' : ''}`}>
          
          {/* Status Ribbon & Indicators */}
          <div className="mb-2 sm:mb-3 flex flex-wrap items-center justify-between gap-2 px-1">
            <div className="flex items-center flex-wrap gap-2">
              <span 
                data-testid="turn-indicator"
                className={`px-3 py-1 rounded-full text-xs font-bold border shadow-xs transition-colors ${
                  gameState.currentPlayer === 0 ? theme.turnP1Bg : theme.turnP2Bg
                }`}
              >
                {gameState.currentPlayer === 0 ? "Player 1's Turn" : "Player 2's Turn"}
              </span>

              {/* Strict Conservation Invariant */}
              <span 
                data-testid="total-stones"
                className={`px-2.5 py-1 rounded-full text-xs font-mono font-semibold border ${
                  currentSkin === 'porcelain' 
                    ? 'bg-[#ded5c6] text-[#342e29] border-[#cfc4b4]' 
                    : 'bg-black/30 border-white/10 text-slate-300'
                }`}
                title="Strict zero-leak stone conservation invariant"
              >
                Stones: {totalBoardStones}
              </span>

              {gameState.moveHistory.length > 0 && gameState.moveHistory[gameState.moveHistory.length - 1].freeTurn && (
                <span className="flex items-center space-x-1 text-xs font-bold text-emerald-400 bg-emerald-950/70 border border-emerald-600/50 px-2.5 py-1 rounded-full animate-bounce">
                  <Zap className="w-3 h-3 text-emerald-300" />
                  <span>Free Turn!</span>
                </span>
              )}

              {hoverPreview && (
                <span className={`text-[11px] flex items-center space-x-1.5 ${theme.cardTextMuted}`}>
                  <Eye className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span className="truncate">
                    Landing: {hoverPreview.lastLanding === P1_STORE ? 'Your Store (Bonus Turn!)' : hoverPreview.lastLanding === P2_STORE ? 'Opponent Store' : `Pit ${hoverPreview.lastLanding + 1}`}
                    {hoverPreview.capturedStones > 0 && ` • Captures +${hoverPreview.capturedStones}!`}
                  </span>
                </span>
              )}
            </div>

            {/* Game Over Banner */}
            {gameState.isGameOver && (
              <div 
                data-testid="game-over-banner"
                className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-500 text-slate-950 text-xs font-extrabold shadow-md animate-pulse"
              >
                <Award className="w-3.5 h-3.5" />
                <span>
                  {gameState.winner === -1 
                    ? "Game Ended in a Draw!" 
                    : `Player ${gameState.winner! + 1} Wins (${gameState.board[P1_STORE]} - ${gameState.board[P2_STORE]})!`}
                </span>
              </div>
            )}
          </div>

          {/* Carved Physical Board Frame */}
          <div className={`relative ${theme.boardBg} border-2 ${theme.boardBorder} rounded-2xl sm:rounded-3xl p-1.5 sm:p-4 shadow-2xl transition-colors duration-300`}>
            
            {/* Subtle Carved Wood Inlay Trim */}
            <div className={`absolute inset-1 sm:inset-2 border ${theme.boardTrim} rounded-xl sm:rounded-2xl pointer-events-none`} />

            <div className="relative flex items-center justify-between gap-1.5 sm:gap-3">
              
              {/* Left Store: Player 2 (North) */}
              <div 
                data-testid="store-13"
                title="Player 2 Kalah Store"
                className={`w-11 sm:w-24 h-56 sm:h-80 rounded-2xl sm:rounded-3xl border flex flex-col items-center justify-between p-1.5 sm:p-3 select-none shrink-0 transition-all duration-200 ${theme.storeBg} ${theme.storeBorder} ${theme.pitShadowClass} ${
                  hoverPreview?.lastLanding === P2_STORE 
                    ? theme.landingGlow 
                    : hoverPreview?.path?.includes(P2_STORE)
                      ? theme.pathGlow
                      : ''
                }`}
              >
                <div className={`text-[9px] sm:text-xs font-bold uppercase tracking-wider ${theme.storeP2Text}`}>
                  P2
                </div>

                {/* Natural Store Pebble Mound */}
                <div className="flex-1 flex items-center justify-center w-full px-0.5">
                  <PebbleCluster count={gameState.board[P2_STORE]} theme={currentSkin} player="p2" maxVisible={14} />
                </div>

                <div className={`text-base sm:text-2xl font-black font-mono ${theme.storeP2Text}`}>
                  {gameState.board[P2_STORE]}
                </div>

                {gameMode === 'sandbox' && (
                  <div className="flex gap-1 mt-1">
                    <button 
                      onClick={() => handleSandboxPitAdjust(P2_STORE, -1)}
                      className="w-4 h-4 bg-rose-600 rounded text-xs flex items-center justify-center text-white font-bold"
                    >
                      -
                    </button>
                    <button 
                      onClick={() => handleSandboxPitAdjust(P2_STORE, 1)}
                      className="w-4 h-4 bg-emerald-600 rounded text-xs flex items-center justify-center text-white font-bold"
                    >
                      +
                    </button>
                  </div>
                )}
              </div>

              {/* Center Playable Pits */}
              <div className="flex-1 flex flex-col gap-2 sm:gap-3.5 min-w-0">
                
                {/* North Row (Indices 12 down to 7) */}
                <div className="grid grid-cols-6 gap-1 sm:gap-2.5">
                  {[12, 11, 10, 9, 8, 7].map((pitIndex) => {
                    const stones = gameState.board[pitIndex];
                    const isLegal = gameState.currentPlayer === 1 && stones > 0 && !gameState.isGameOver;
                    const evalData = analysisResults.find(m => m.pit === pitIndex);
                    const isHighlightedPath = hoverPreview?.path?.includes(pitIndex);
                    const isLanding = hoverPreview?.lastLanding === pitIndex;

                    return (
                      <button
                        key={pitIndex}
                        data-testid={`pit-${pitIndex}`}
                        onClick={() => {
                          if (gameMode === 'sandbox') handleSandboxPitAdjust(pitIndex, 1);
                          else if (isLegal) executeMove(pitIndex);
                        }}
                        onMouseEnter={() => setHoveredPit(pitIndex)}
                        onMouseLeave={() => setHoveredPit(null)}
                        className={`relative flex flex-col items-center justify-between p-1 sm:p-2 rounded-xl sm:rounded-2xl transition-all duration-150 select-none min-h-[50px] min-w-[44px] touch-manipulation border ${theme.pitBg} ${theme.pitBorder} ${theme.pitShadowClass} ${
                          isLegal ? `cursor-pointer ${theme.pitHoverBorder} hover:scale-[1.02] active:scale-95` : 'cursor-default opacity-85'
                        } ${
                          isLanding 
                            ? theme.landingGlow 
                            : isHighlightedPath 
                              ? theme.pathGlow 
                              : ''
                        } h-24 sm:h-36`}
                      >
                        {/* Pit Label & Subtle Rank */}
                        <div className={`flex items-center justify-between w-full text-[8px] sm:text-[10px] font-mono ${theme.cardTextMuted}`}>
                          <span>P{13 - pitIndex}</span>
                          {evalData && (
                            <span className={`px-1 py-0.2 rounded text-[7px] sm:text-[9px] font-bold border ${evalData.badgeColor}`}>
                              <span className="sm:hidden">{evalData.rank === 1 ? '★' : `#${evalData.rank}`}</span>
                              <span className="hidden sm:inline">{evalData.rank === 1 ? 'BEST' : `#${evalData.rank}`}</span>
                            </span>
                          )}
                        </div>

                        {/* Tactile Pebble Mound */}
                        <PebbleCluster count={stones} theme={currentSkin} player="p2" />

                        {/* Etched Count Numerals */}
                        <div 
                          data-testid={`pit-count-${pitIndex}`}
                          className={`text-xs sm:text-base font-mono font-extrabold px-1.5 py-0.5 rounded-lg border ${theme.pitCountBg} ${theme.pitCountText}`}
                        >
                          {stones}
                        </div>

                        {gameMode === 'sandbox' && (
                          <div className="absolute -top-2 flex gap-1 z-20">
                            <button 
                              data-testid={`sandbox-minus-${pitIndex}`}
                              onClick={(e) => { e.stopPropagation(); handleSandboxPitAdjust(pitIndex, -1); }}
                              className="w-4 h-4 bg-rose-600 rounded text-xs flex items-center justify-center text-white"
                            >
                              -
                            </button>
                            <button 
                              data-testid={`sandbox-plus-${pitIndex}`}
                              onClick={(e) => { e.stopPropagation(); handleSandboxPitAdjust(pitIndex, 1); }}
                              className="w-4 h-4 bg-emerald-600 rounded text-xs flex items-center justify-center text-white"
                            >
                              +
                            </button>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* South Row (Indices 0 to 5) */}
                <div className="grid grid-cols-6 gap-1 sm:gap-2.5">
                  {[0, 1, 2, 3, 4, 5].map((pitIndex) => {
                    const stones = gameState.board[pitIndex];
                    const isLegal = gameState.currentPlayer === 0 && stones > 0 && !gameState.isGameOver;
                    const evalData = analysisResults.find(m => m.pit === pitIndex);
                    const isHighlightedPath = hoverPreview?.path?.includes(pitIndex);
                    const isLanding = hoverPreview?.lastLanding === pitIndex;

                    return (
                      <button
                        key={pitIndex}
                        data-testid={`pit-${pitIndex}`}
                        onClick={() => {
                          if (gameMode === 'sandbox') handleSandboxPitAdjust(pitIndex, 1);
                          else if (isLegal) executeMove(pitIndex);
                        }}
                        onMouseEnter={() => setHoveredPit(pitIndex)}
                        onMouseLeave={() => setHoveredPit(null)}
                        className={`relative flex flex-col items-center justify-between p-1 sm:p-2 rounded-xl sm:rounded-2xl transition-all duration-150 select-none min-h-[50px] min-w-[44px] touch-manipulation border ${theme.pitBg} ${theme.pitBorder} ${theme.pitShadowClass} ${
                          isLegal ? `cursor-pointer ${theme.pitHoverBorder} hover:scale-[1.02] active:scale-95` : 'cursor-default opacity-85'
                        } ${
                          isLanding 
                            ? theme.landingGlow 
                            : isHighlightedPath 
                              ? theme.pathGlow 
                              : ''
                        } h-24 sm:h-36`}
                      >
                        <div className={`flex items-center justify-between w-full text-[8px] sm:text-[10px] font-mono ${theme.cardTextMuted}`}>
                          <span>P{pitIndex + 1}</span>
                          {evalData && (
                            <span className={`px-1 py-0.2 rounded text-[7px] sm:text-[9px] font-bold border ${evalData.badgeColor}`}>
                              <span className="sm:hidden">{evalData.rank === 1 ? '★' : `#${evalData.rank}`}</span>
                              <span className="hidden sm:inline">{evalData.rank === 1 ? 'BEST' : `#${evalData.rank}`}</span>
                            </span>
                          )}
                        </div>

                        {/* Tactile Pebble Mound */}
                        <PebbleCluster count={stones} theme={currentSkin} player="p1" />

                        {/* Etched Count Numerals */}
                        <div 
                          data-testid={`pit-count-${pitIndex}`}
                          className={`text-xs sm:text-base font-mono font-extrabold px-1.5 py-0.5 rounded-lg border ${theme.pitCountBg} ${theme.pitCountText}`}
                        >
                          {stones}
                        </div>

                        {gameMode === 'sandbox' && (
                          <div className="absolute -bottom-2 flex gap-1 z-20">
                            <button 
                              data-testid={`sandbox-minus-${pitIndex}`}
                              onClick={(e) => { e.stopPropagation(); handleSandboxPitAdjust(pitIndex, -1); }}
                              className="w-4 h-4 bg-rose-600 rounded text-xs flex items-center justify-center text-white"
                            >
                              -
                            </button>
                            <button 
                              data-testid={`sandbox-plus-${pitIndex}`}
                              onClick={(e) => { e.stopPropagation(); handleSandboxPitAdjust(pitIndex, 1); }}
                              className="w-4 h-4 bg-emerald-600 rounded text-xs flex items-center justify-center text-white"
                            >
                              +
                            </button>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

              </div>

              {/* Right Store: Player 1 (South) */}
              <div 
                data-testid="store-6"
                title="Player 1 Kalah Store"
                className={`w-11 sm:w-24 h-56 sm:h-80 rounded-2xl sm:rounded-3xl border flex flex-col items-center justify-between p-1.5 sm:p-3 select-none shrink-0 transition-all duration-200 ${theme.storeBg} ${theme.storeBorder} ${theme.pitShadowClass} ${
                  hoverPreview?.lastLanding === P1_STORE 
                    ? theme.landingGlow 
                    : hoverPreview?.path?.includes(P1_STORE)
                      ? theme.pathGlow
                      : ''
                }`}
              >
                <div className={`text-[9px] sm:text-xs font-bold uppercase tracking-wider ${theme.storeP1Text}`}>
                  P1
                </div>

                {/* Natural Store Pebble Mound */}
                <div className="flex-1 flex items-center justify-center w-full px-0.5">
                  <PebbleCluster count={gameState.board[P1_STORE]} theme={currentSkin} player="p1" maxVisible={14} />
                </div>

                <div className={`text-base sm:text-2xl font-black font-mono ${theme.storeP1Text}`}>
                  {gameState.board[P1_STORE]}
                </div>

                {gameMode === 'sandbox' && (
                  <div className="flex gap-1 mt-1">
                    <button 
                      onClick={() => handleSandboxPitAdjust(P1_STORE, -1)}
                      className="w-4 h-4 bg-rose-600 rounded text-xs flex items-center justify-center text-white font-bold"
                    >
                      -
                    </button>
                    <button 
                      onClick={() => handleSandboxPitAdjust(P1_STORE, 1)}
                      className="w-4 h-4 bg-emerald-600 rounded text-xs flex items-center justify-center text-white font-bold"
                    >
                      +
                    </button>
                  </div>
                )}
              </div>

            </div>

            {/* Sowing Flow Direction */}
            <div className={`mt-2 flex items-center justify-center gap-1.5 text-[9px] sm:text-[10px] uppercase font-mono tracking-widest ${theme.cardTextMuted}`}>
              <span>Counter-Clockwise Flow</span>
              <ArrowRight className="w-3 h-3 opacity-60" />
            </div>
          </div>
        </section>

        {/* Coach Suggestion Card (Tutor Mode) */}
        {tutorWarning && (
          <div 
            data-testid="tutor-modal"
            className={`p-3.5 sm:p-4 rounded-2xl border-2 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xl backdrop-blur-md animate-in fade-in ${
              currentSkin === 'porcelain'
                ? 'bg-[#fff5ea] border-[#f0c08a] text-[#5c3a1a]'
                : 'bg-amber-950/80 border-amber-500/70 text-amber-200'
            }`}
          >
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-amber-500/20 rounded-xl text-amber-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold flex items-center gap-1.5">
                  <span>Coach Recommendation</span>
                  <span className="text-[10px] px-2 py-0.2 rounded-full bg-amber-500/20 border border-amber-500/40">
                    {tutorWarning.eval.classification}
                  </span>
                </h4>
                <p className="text-xs opacity-90 mt-0.5">
                  Pit {tutorWarning.pit + 1} sacrifices <strong className="underline">{(tutorWarning.eval.equityLoss * 100).toFixed(1)}%</strong> win chance compared to recommended <strong>{tutorWarning.bestMove.label}</strong>.
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2 shrink-0">
              <button
                data-testid="tutor-reconsider"
                onClick={() => setTutorWarning(null)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
                  currentSkin === 'porcelain'
                    ? 'bg-[#ded5c6] text-[#342e29] hover:bg-[#cfc4b4]'
                    : 'bg-white/10 text-slate-200 hover:bg-white/20'
                }`}
              >
                Reconsider
              </button>
              <button
                data-testid="tutor-confirm"
                onClick={() => executeMove(tutorWarning.pit, true)}
                className="px-4 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-md transition"
              >
                Confirm Move
              </button>
            </div>
          </div>
        )}

        {/* Bottom Section: Analysis Table & Settings */}
        <div className={`grid grid-cols-1 lg:grid-cols-3 gap-3.5 sm:gap-5 ${mobileTab === 'board' ? 'hidden lg:grid' : ''}`}>
          
          {/* Candidate Analysis Table */}
          <div className={`lg:col-span-2 ${theme.cardBg} border ${theme.cardBorder} rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 flex flex-col shadow-lg overflow-x-auto ${mobileTab === 'settings' ? 'hidden lg:flex' : ''}`}>
            
            <div className={`flex items-center justify-between pb-3 border-b ${theme.cardBorder}`}>
              <div className="flex items-center space-x-2">
                <BarChart3 className="w-4 h-4 opacity-70" />
                <h3 className="font-bold text-xs sm:text-sm tracking-wide">
                  Candidate Move Evaluations
                </h3>
              </div>
              <span className={`text-[11px] font-mono ${theme.cardTextMuted}`}>
                Lookahead: {searchDepth} plies {isAnalyzing ? '(Thinking...)' : ''}
              </span>
            </div>

            {/* Session PR Banner */}
            <div className={`flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl border text-[11px] font-mono mt-3 mb-1 ${
              currentSkin === 'porcelain' ? 'bg-[#ede5d8] border-[#dbd0c0]' : 'bg-black/30 border-white/5'
            }`}>
              <div className="flex items-center space-x-2">
                <Award className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span className="font-semibold">Session Rating:</span>
                <span className="font-bold text-amber-500">P1: {calcPR(matchStats.p1TotalLoss, matchStats.p1Moves)}</span>
                <span className="opacity-40">•</span>
                <span className="font-bold text-emerald-500">P2: {calcPR(matchStats.p2TotalLoss, matchStats.p2Moves)}</span>
              </div>
              <div className={`text-[10px] ${theme.cardTextMuted}`}>
                Blunders: P1({matchStats.p1Blunders}) / P2({matchStats.p2Blunders})
              </div>
            </div>

            {/* Candidates Table */}
            <div className="overflow-x-auto mt-2">
              <table className="w-full text-left text-xs min-w-[460px]">
                <thead>
                  <tr className={`border-b ${theme.cardBorder} ${theme.cardTextMuted} font-mono uppercase text-[10px]`}>
                    <th className="py-2.5 px-2">Rank</th>
                    <th className="py-2.5 px-2">Pit Action</th>
                    <th className="py-2.5 px-2">Win %</th>
                    <th className="py-2.5 px-2">Equity Diff</th>
                    <th className="py-2.5 px-2">Grade</th>
                    <th className="py-2.5 px-2 hidden sm:table-cell">Bonus / PV Lookahead</th>
                    <th className="py-2.5 px-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-mono">
                  {analysisResults.length === 0 ? (
                    <tr>
                      <td colSpan={7} className={`py-6 text-center ${theme.cardTextMuted}`}>
                        {gameState.isGameOver ? "Match completed. No moves available." : "Calculating optimal lines..."}
                      </td>
                    </tr>
                  ) : (
                    analysisResults.map((move, idx) => (
                      <tr 
                        key={move.pit}
                        data-testid={idx === 0 ? "eval-row-0" : idx === analysisResults.length - 1 ? "eval-row-worst" : undefined}
                        className={`hover:bg-white/5 transition ${move.rank === 1 ? 'bg-amber-500/10' : ''}`}
                      >
                        <td className="py-2.5 px-2 font-bold opacity-80">
                          #{move.rank}
                        </td>
                        <td className="py-2.5 px-2 font-bold">
                          <div>{move.label}</div>
                          <div className={`sm:hidden text-[9px] font-normal ${theme.cardTextMuted} mt-0.5 flex flex-wrap gap-1 items-center`}>
                            {move.freeTurn && <span className="text-emerald-500 font-bold">[Free Turn]</span>}
                            {move.captures > 0 && <span className="text-amber-500 font-bold">[+{move.captures} Cap]</span>}
                            <span className="opacity-60">{move.pv.map(p => `P${p+1}`).join('→')}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-2 font-semibold">
                          {(move.winProb * 100).toFixed(1)}%
                        </td>
                        <td className="py-2.5 px-2">
                          <span className={move.equityLoss === 0 ? 'text-emerald-500 font-semibold' : 'text-rose-400'}>
                            {move.equityLoss === 0 ? '0.000' : `-${(move.equityLoss * 100).toFixed(1)}%`}
                          </span>
                        </td>
                        <td className="py-2.5 px-2">
                          {renderGradeBadge(move.classification, move.badgeColor)}
                        </td>
                        <td className={`py-2.5 px-2 hidden sm:table-cell text-[10px] ${theme.cardTextMuted}`}>
                          {move.freeTurn && <span className="text-emerald-500 font-bold mr-1.5">[Free Turn]</span>}
                          {move.captures > 0 && <span className="text-amber-500 font-bold mr-1.5">[+{move.captures} Cap]</span>}
                          <span className="opacity-60">PV: {move.pv.map(p => `P${p+1}`).join(' → ')}</span>
                        </td>
                        <td className="py-2.5 px-2 text-right">
                          <button
                            data-testid={`eval-play-pit-${move.pit}`}
                            onClick={() => executeMove(move.pit, true)}
                            disabled={gameState.isGameOver}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition ${
                              currentSkin === 'porcelain'
                                ? 'bg-white hover:bg-[#ded5c6] text-[#2c2723] border-[#cdc3b2]'
                                : 'bg-white/10 hover:bg-white/20 text-white border-white/15'
                            }`}
                          >
                            Play
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Tournament Controls & Settings Drawer */}
          <div className={`${theme.cardBg} border ${theme.cardBorder} rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 flex flex-col gap-4 shadow-lg ${mobileTab === 'analysis' ? 'hidden lg:flex' : ''}`}>
            
            <div className={`flex items-center space-x-2 pb-3 border-b ${theme.cardBorder}`}>
              <Settings className="w-4 h-4 opacity-70" />
              <h3 className="font-bold text-xs sm:text-sm">Game Settings & Controls</h3>
            </div>

            {/* Game Mode */}
            <div className="flex flex-col gap-1.5">
              <label className={`text-[11px] font-semibold ${theme.cardTextMuted}`}>Game Mode</label>
              <div className="grid grid-cols-2 gap-1.5 text-xs">
                {[
                  { id: 'pve', label: 'vs Engine' },
                  { id: 'ai_vs_ai', label: 'AI Duel' },
                  { id: 'pvp', label: 'Pass & Play' },
                  { id: 'sandbox', label: 'Sandbox' }
                ].map(m => (
                  <button
                    key={m.id}
                    data-testid={`mode-${m.id}`}
                    onClick={() => {
                      setGameMode(m.id);
                      setIsAiRunning(false);
                    }}
                    className={`p-2 rounded-xl border font-semibold text-left transition text-[11px] ${
                      gameMode === m.id
                        ? currentSkin === 'porcelain'
                          ? 'bg-[#2c2723] text-white border-transparent'
                          : 'bg-white/20 border-white/30 text-white'
                        : `${theme.cardTextMuted} hover:bg-white/5 border-transparent`
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* PvE Player Side */}
            {gameMode === 'pve' && (
              <div className={`flex items-center justify-between p-2.5 rounded-xl border text-[11px] ${
                currentSkin === 'porcelain' ? 'bg-[#ede5d8] border-[#dbd0c0]' : 'bg-black/30 border-white/5'
              }`}>
                <span className="font-semibold">Your Side:</span>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => setHumanPlayer(0)}
                    className={`px-2.5 py-1 rounded-lg border text-xs font-semibold transition ${
                      humanPlayer === 0
                        ? 'bg-amber-600 text-white border-transparent'
                        : `${theme.cardTextMuted} hover:opacity-100 border-transparent`
                    }`}
                  >
                    South (P1)
                  </button>
                  <button
                    onClick={() => setHumanPlayer(1)}
                    className={`px-2.5 py-1 rounded-lg border text-xs font-semibold transition ${
                      humanPlayer === 1
                        ? 'bg-emerald-600 text-white border-transparent'
                        : `${theme.cardTextMuted} hover:opacity-100 border-transparent`
                    }`}
                  >
                    North (P2)
                  </button>
                </div>
              </div>
            )}

            {/* AI vs AI Automation */}
            {gameMode === 'ai_vs_ai' && (
              <div className={`p-2.5 rounded-xl border flex items-center justify-between ${
                currentSkin === 'porcelain' ? 'bg-[#ede5d8] border-[#dbd0c0]' : 'bg-black/30 border-white/5'
              }`}>
                <span className="text-[11px] font-semibold">Self-Play:</span>
                <button
                  data-testid="ai-duel-toggle"
                  onClick={() => setIsAiRunning(!isAiRunning)}
                  className={`flex items-center space-x-1.5 px-3 py-1 rounded-xl text-xs font-bold transition shadow-sm ${
                    isAiRunning ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'
                  }`}
                >
                  {isAiRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  <span>{isAiRunning ? 'Pause' : 'Start Duel'}</span>
                </button>
              </div>
            )}

            {/* Engine Search Depth Slider */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between text-[11px]">
                <span className={`font-semibold ${theme.cardTextMuted}`}>Search Lookahead</span>
                <span className="font-mono font-bold">{searchDepth} Plies</span>
              </div>
              <input 
                type="range" 
                min="1" 
                max="8" 
                value={searchDepth} 
                onChange={(e) => setSearchDepth(Number(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer h-1.5 bg-black/20 rounded-lg"
              />
              <div className={`flex justify-between text-[9px] font-mono ${theme.cardTextMuted}`}>
                <span>Rapid (1)</span>
                <span>Deep (8)</span>
              </div>
            </div>

            {/* Instant Speed & Rules Modifiers */}
            <div className={`flex flex-col gap-2 pt-2 border-t ${theme.cardBorder}`}>
              <label className="flex items-center justify-between text-[11px] font-semibold cursor-pointer">
                <span>Instant Sowing Animations</span>
                <input 
                  type="checkbox" 
                  checked={instantSpeed}
                  onChange={(e) => setInstantSpeed(e.target.checked)}
                  className="rounded accent-amber-500"
                />
              </label>

              <label className="flex items-center justify-between text-[11px] font-semibold cursor-pointer">
                <span>Store Finish = Bonus Turn</span>
                <input 
                  type="checkbox" 
                  checked={rules.freeTurn}
                  onChange={(e) => setRules({ ...rules, freeTurn: e.target.checked })}
                  className="rounded accent-amber-500"
                />
              </label>

              <label className="flex items-center justify-between text-[11px] font-semibold cursor-pointer">
                <span>Opposite Pit Capture</span>
                <input 
                  type="checkbox" 
                  checked={rules.captureOpposite}
                  onChange={(e) => setRules({ ...rules, captureOpposite: e.target.checked })}
                  className="rounded accent-amber-500"
                />
              </label>
            </div>

            {/* Pre-Flight Test Launcher Button */}
            <div className={`pt-2 border-t ${theme.cardBorder}`}>
              <button
                onClick={() => setDiagnosticsOpen(true)}
                data-testid="open-diagnostics-btn"
                className={`w-full flex items-center justify-center space-x-2 py-2 rounded-xl border text-xs font-semibold transition ${
                  currentSkin === 'porcelain'
                    ? 'bg-[#ede5d8] border-[#dbd0c0] text-[#4a3e35] hover:bg-[#e2d9cb]'
                    : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                }`}
              >
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>Run Invariant Pre-Flight Tests</span>
              </button>
            </div>

          </div>

        </div>

      </main>

      {/* Docked Mobile Thumb Bar */}
      <div className={`fixed bottom-0 left-0 right-0 z-40 backdrop-blur-md border-t py-1 px-4 flex lg:hidden items-center justify-around gap-2 text-xs transition-colors ${theme.thumbBarBg} ${theme.thumbBarBorder}`}>
        <button
          onClick={() => setMobileTab('board')}
          className={`flex flex-col items-center py-1 px-3 rounded-xl transition ${
            mobileTab === 'board' ? theme.tabActiveText : theme.cardTextMuted
          }`}
        >
          <LayoutGrid className="w-4 h-4" />
          <span className="text-[10px] font-semibold">Board</span>
        </button>

        <button
          onClick={() => setMobileTab('analysis')}
          className={`flex flex-col items-center py-1 px-3 rounded-xl transition ${
            mobileTab === 'analysis' ? theme.tabActiveText : theme.cardTextMuted
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span className="text-[10px] font-semibold">Analysis</span>
        </button>

        <button
          onClick={() => setTutorMode(!tutorMode)}
          className={`flex flex-col items-center py-1 px-3 rounded-xl transition ${
            tutorMode ? 'text-amber-500 font-bold' : theme.cardTextMuted
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span className="text-[10px] font-semibold">Coach</span>
        </button>

        <button
          onClick={handleResetGame}
          className={`flex flex-col items-center py-1 px-3 rounded-xl ${theme.cardTextMuted} hover:opacity-100 transition`}
        >
          <RotateCcw className="w-4 h-4" />
          <span className="text-[10px] font-semibold">Reset</span>
        </button>

        <button
          onClick={() => setMobileTab('settings')}
          className={`flex flex-col items-center py-1 px-3 rounded-xl transition ${
            mobileTab === 'settings' ? theme.tabActiveText : theme.cardTextMuted
          }`}
        >
          <Settings className="w-4 h-4" />
          <span className="text-[10px] font-semibold">Settings</span>
        </button>
      </div>

      {/* Pre-Flight Diagnostics Modal */}
      {diagnosticsOpen && (
        <div 
          data-testid="diagnostics-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm"
        >
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden text-slate-100">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
              <div className="flex items-center space-x-2.5">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-sm sm:text-base">
                  Pre-Flight Diagnostic Suite
                </h3>
              </div>
              <button 
                onClick={() => setDiagnosticsOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 sm:p-5 overflow-y-auto flex flex-col gap-2.5 font-mono text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-slate-400">
                <span>Total Tests: {diagResults.length}</span>
                <span className="text-emerald-400 font-bold">
                  Passed: {diagResults.filter(r => r.status === 'PASS').length} / {diagResults.length}
                </span>
              </div>

              <div className="divide-y divide-slate-800/80">
                {diagResults.map((item, i) => (
                  <div key={i} className="py-2.5 flex items-center justify-between gap-2">
                    <div className="flex items-center space-x-2 min-w-0">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <div className="truncate">
                        <div className="font-semibold text-slate-200 truncate">{item.name}</div>
                        <div className="text-[10px] text-slate-500">{item.category}</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 shrink-0">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        {item.status}
                      </span>
                      <span className="text-[10px] text-slate-400">{item.duration}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="px-5 py-3.5 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">Zero-Leak Conservation & Solver Invariants</span>
              <button
                onClick={handleRunDiagnostics}
                disabled={isDiagRunning}
                className="px-3.5 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-semibold shadow-md transition disabled:opacity-50"
              >
                {isDiagRunning ? "Running..." : "Re-run"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clean Footer (Desktop Only) */}
      <footer className={`hidden sm:block border-t ${theme.headerBorder} py-3 px-4 text-center text-xs ${theme.cardTextMuted} transition-colors`}>
        Mancala Analytical Engine • Handcrafted Artisanal Themes & Minimax PV Rollouts
      </footer>

    </div>
  );
}
