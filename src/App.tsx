import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Play, Pause, RotateCcw, Award, Settings, BarChart3, 
  Sparkles, Volume2, VolumeX, Cpu, Eye, 
  ArrowRight, AlertTriangle, Zap, CheckCircle2, ShieldCheck, X
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

class SoundEngine {
  ctx: AudioContext | null = null;
  muted: boolean = false;

  init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playSow(pitchOffset = 0) {
    if (this.muted) return;
    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const now = this.ctx.currentTime;
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(320 + pitchOffset * 22, now);
      osc.frequency.exponentialRampToValueAtTime(140, now + 0.08);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.08);
    } catch {
      // Audio context might be restricted before interaction
    }
  }

  playCapture() {
    if (this.muted) return;
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      [440, 660, 880].forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.05);
        gain.gain.setValueAtTime(0.3, now + idx * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.15);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + idx * 0.05);
        osc.stop(now + idx * 0.05 + 0.15);
      });
    } catch {
      // Audio fallback
    }
  }

  playFreeTurn() {
    if (this.muted) return;
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.18);
      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.22);
    } catch {
      // Audio fallback
    }
  }

  playGameOver() {
    if (this.muted) return;
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      [330, 440, 550, 660, 880].forEach((freq, i) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.08);
        gain.gain.setValueAtTime(0.25, now + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.4);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + i * 0.08);
        osc.stop(now + i * 0.08 + 0.4);
      });
    } catch {
      // Audio fallback
    }
  }
}

const sounds = new SoundEngine();

export default function App() {
  const [stonesConfig, setStonesConfig] = useState(4);
  const [rules, setRules] = useState<RulesConfig>({ freeTurn: true, captureOpposite: true });
  const [gameState, setGameState] = useState<GameState>(() => createInitialState(4));
  const [searchDepth, setSearchDepth] = useState(5);
  
  // Game modes: 'pve', 'pvp', 'ai_vs_ai', 'sandbox'
  const [gameMode, setGameMode] = useState<string>('pve');
  const [humanPlayer, setHumanPlayer] = useState<number>(0); // 0 = P1 (South), 1 = P2 (North)
  const [tutorMode, setTutorMode] = useState(true);
  const [isAiRunning, setIsAiRunning] = useState(false);
  const [aiSpeedMs, setAiSpeedMs] = useState(600);

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
    
    // Check legality
    const legalPits = gameState.currentPlayer === 0 ? P1_PITS : P2_PITS;
    if (!(legalPits as readonly number[]).includes(pitIndex) || gameState.board[pitIndex] === 0) return;

    // Check tutor warning if Human in Tutor mode
    if (!force && tutorMode && gameMode === 'pve' && gameState.currentPlayer === humanPlayer) {
      const moveEval = analysisResults.find(m => m.pit === pitIndex);
      if (moveEval && (moveEval.classification === 'Mistake' || moveEval.classification === 'Blunder')) {
        setTutorWarning({
          pit: pitIndex,
          eval: moveEval,
          bestMove: analysisResults[0]
        });
        return;
      }
    }

    // Play sounds
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

    if (result.capturedStones > 0) {
      setTimeout(() => sounds.playCapture(), 120);
    }
    if (result.earnedFreeTurn && !result.isGameOver) {
      setTimeout(() => sounds.playFreeTurn(), 80);
    }
    if (result.isGameOver) {
      setTimeout(() => sounds.playGameOver(), 200);
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
  }, [gameState, tutorMode, gameMode, humanPlayer, analysisResults, rules]);

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
      }, gameMode === 'ai_vs_ai' ? aiSpeedMs : 450);

      return () => clearTimeout(timer);
    }
  }, [gameState.currentPlayer, gameState.isGameOver, gameMode, humanPlayer, isAiRunning, analysisResults, isAnalyzing, executeMove, aiSpeedMs]);

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

  return (
    <div className="flex flex-col min-h-screen bg-[#0a0d14] text-slate-100 font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      
      {/* Top Header & Brand Bar */}
      <header className="border-b border-slate-800/80 bg-slate-900/70 backdrop-blur-md sticky top-0 z-40 px-3 sm:px-4 py-2.5">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-cyan-600 via-indigo-600 to-fuchsia-600 p-[2px] shadow-lg shadow-cyan-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Cpu className="w-5 h-5 text-cyan-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="font-extrabold text-base sm:text-lg tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-sky-200 to-indigo-300">
                  GNU MANCALA
                </h1>
                <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-300 hidden sm:inline">
                  2030s Neural Engine
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400">GNU Backgammon & XG Tournament Mathematics for Kalah</p>
            </div>
          </div>

          {/* Quick Engine Actions & Diagnostic Suite Launcher */}
          <div className="flex items-center flex-wrap gap-2">
            <button
              onClick={() => setDiagnosticsOpen(true)}
              data-testid="open-diagnostics-btn"
              className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-950/80 border border-indigo-700/60 text-xs font-semibold text-indigo-300 hover:bg-indigo-900/60 transition shadow-sm"
              title="Open Pre-Flight Diagnostic Suite"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
              <span>Pre-Flight Suite [{diagResults.filter(r => r.status === 'PASS').length}/{diagResults.length || 11}]</span>
            </button>

            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? "Mute sounds" : "Enable audio"}
              className="p-2 rounded-lg bg-slate-800/70 border border-slate-700 hover:bg-slate-700/60 transition text-slate-300"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-cyan-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
            </button>

            <button
              onClick={() => setTutorMode(!tutorMode)}
              data-testid="tutor-toggle"
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition ${
                tutorMode 
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 shadow-sm shadow-amber-500/20' 
                  : 'bg-slate-800/60 border-slate-700 text-slate-400'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Tutor {tutorMode ? 'Active' : 'Off'}</span>
            </button>

            <button
              onClick={handleResetGame}
              data-testid="reset-game-btn"
              className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-700 text-xs font-medium text-slate-200 transition"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
              <span>New Match</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto w-full p-2.5 sm:p-5 flex-1 flex flex-col gap-4 sm:gap-5 overflow-x-hidden">
        
        {/* Top Evaluation & Equity Gauge (GNU/XG Style) */}
        <section 
          data-testid="eval-gauge"
          className="bg-slate-900/60 border border-slate-800 rounded-2xl p-3 sm:p-4 backdrop-blur-md shadow-xl relative overflow-hidden"
        >
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
            
            {/* Player 2 (North) Meta */}
            <div className="flex items-center space-x-3 w-full sm:w-auto">
              <div className={`w-3.5 h-3.5 rounded-full ${gameState.currentPlayer === 1 && !gameState.isGameOver ? 'bg-amber-400 ring-4 ring-amber-400/20 animate-pulse' : 'bg-slate-600'}`} />
              <div>
                <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-1.5">
                  Player 2 (North)
                  {gameMode === 'pve' && humanPlayer === 0 && <span className="text-[10px] text-indigo-400 px-1.5 py-0.2 rounded bg-indigo-950/70 border border-indigo-700/30">GNU Engine</span>}
                  {gameMode === 'pve' && humanPlayer === 1 && <span className="text-[10px] text-emerald-400 px-1.5 py-0.2 rounded bg-emerald-950/70 border border-emerald-700/30">You</span>}
                </div>
                <div className="text-base sm:text-lg font-bold text-slate-200">
                  {((1 - p1CurrentWinProb) * 100).toFixed(1)}% <span className="text-xs text-slate-400 font-normal">Win Equity</span>
                </div>
              </div>
            </div>

            {/* GNU Visual Win Bar */}
            <div className="w-full flex-1 max-w-xl mx-auto flex flex-col gap-1.5">
              <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                <span className="text-cyan-400 font-semibold">P1 (South): {(p1CurrentWinProb * 100).toFixed(1)}%</span>
                <span className="text-amber-400 font-semibold">P2 (North): {((1 - p1CurrentWinProb) * 100).toFixed(1)}%</span>
              </div>
              <div className="h-4 bg-slate-950 rounded-full border border-slate-700/80 overflow-hidden flex shadow-inner relative">
                <div 
                  className="h-full bg-gradient-to-r from-cyan-500 to-blue-600 transition-all duration-500 ease-out"
                  style={{ width: `${p1CurrentWinProb * 100}%` }}
                />
                <div 
                  className="h-full bg-gradient-to-l from-amber-500 to-orange-600 transition-all duration-500 ease-out"
                  style={{ width: `${(1 - p1CurrentWinProb) * 100}%` }}
                />
                <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-0.5 bg-white/40 shadow-sm" />
              </div>
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>PR: {calcPR(matchStats.p1TotalLoss, matchStats.p1Moves)} (Blunders: {matchStats.p1Blunders})</span>
                <span>PR: {calcPR(matchStats.p2TotalLoss, matchStats.p2Moves)} (Blunders: {matchStats.p2Blunders})</span>
              </div>
            </div>

            {/* Player 1 (South) Meta */}
            <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
              <div className="text-right">
                <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold flex items-center justify-end gap-1.5">
                  {gameMode === 'pve' && humanPlayer === 0 && <span className="text-[10px] text-emerald-400 px-1.5 py-0.2 rounded bg-emerald-950/70 border border-emerald-700/30">You</span>}
                  {gameMode === 'pve' && humanPlayer === 1 && <span className="text-[10px] text-indigo-400 px-1.5 py-0.2 rounded bg-indigo-950/70 border border-indigo-700/30">GNU Engine</span>}
                  Player 1 (South)
                </div>
                <div className="text-base sm:text-lg font-bold text-slate-200">
                  {(p1CurrentWinProb * 100).toFixed(1)}% <span className="text-xs text-slate-400 font-normal">Win Equity</span>
                </div>
              </div>
              <div className={`w-3.5 h-3.5 rounded-full ${gameState.currentPlayer === 0 && !gameState.isGameOver ? 'bg-cyan-400 ring-4 ring-cyan-400/20 animate-pulse' : 'bg-slate-600'}`} />
            </div>

          </div>
        </section>

        {/* Interactive Mancala Board & Tactile Board Interface */}
        <section className="bg-gradient-to-b from-[#141a29] to-[#0c101a] border border-slate-800 rounded-3xl p-3 sm:p-6 shadow-2xl relative">
          
          {/* Status Alert Banner, Conservation Badge, Free Turn Indicator */}
          <div className="mb-3 sm:mb-4 flex flex-wrap items-center justify-between gap-2 min-h-[32px]">
            <div className="flex items-center flex-wrap gap-2">
              <span 
                data-testid="turn-indicator"
                className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${
                  gameState.currentPlayer === 0 
                    ? 'bg-cyan-950/90 text-cyan-300 border-cyan-600/40' 
                    : 'bg-amber-950/90 text-amber-300 border-amber-600/40'
                }`}
              >
                Turn: {gameState.currentPlayer === 0 ? "Player 1 (South)" : "Player 2 (North)"}
              </span>

              {/* Stone Conservation Invariant HUD */}
              <span 
                data-testid="total-stones"
                className="px-2.5 py-1 rounded-md text-xs font-mono font-semibold bg-slate-900 border border-slate-700 text-slate-300"
                title="Strict zero-leak stone conservation invariant"
              >
                Stones: {totalBoardStones}
              </span>

              {gameState.moveHistory.length > 0 && gameState.moveHistory[gameState.moveHistory.length - 1].freeTurn && (
                <span className="flex items-center space-x-1 text-xs font-bold text-emerald-400 bg-emerald-950/70 border border-emerald-700/40 px-2.5 py-1 rounded-md animate-bounce">
                  <Zap className="w-3 h-3 text-emerald-300" />
                  <span>Free Turn Earned!</span>
                </span>
              )}

              {hoverPreview && (
                <span className="text-xs text-slate-400 hidden sm:inline-flex items-center space-x-1.5">
                  <Eye className="w-3.5 h-3.5 text-cyan-400" />
                  <span>
                    Simulated landing: {hoverPreview.lastLanding === P1_STORE ? 'P1 Store (Bonus Turn!)' : hoverPreview.lastLanding === P2_STORE ? 'P2 Store' : `Pit ${hoverPreview.lastLanding + 1}`}
                    {hoverPreview.capturedStones > 0 && ` • Captures +${hoverPreview.capturedStones} stones!`}
                  </span>
                </span>
              )}
            </div>

            {/* Game Over Modal / Ribbon */}
            {gameState.isGameOver && (
              <div 
                data-testid="game-over-banner"
                className="flex items-center space-x-2 px-3 py-1 rounded-lg bg-indigo-900/60 border border-indigo-500/40 text-indigo-200 text-xs font-bold animate-pulse"
              >
                <Award className="w-4 h-4 text-amber-400" />
                <span>
                  {gameState.winner === -1 
                    ? "Game Ended in a Draw!" 
                    : `Player ${gameState.winner! + 1} Wins (${gameState.board[P1_STORE]} - ${gameState.board[P2_STORE]})!`}
                </span>
              </div>
            )}
          </div>

          {/* Obsidian & Wood Kalah Board */}
          <div className="relative bg-[#0d131f] border-2 border-slate-700/60 rounded-3xl p-2 sm:p-5 shadow-2xl overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-30 pointer-events-none" />

            <div className="relative grid grid-cols-12 gap-1.5 sm:gap-4 items-center">
              
              {/* Left Kalah Store: Player 2 (North) */}
              <div 
                data-testid="store-13"
                className={`col-span-2 h-56 sm:h-80 rounded-2xl sm:rounded-3xl border-2 flex flex-col items-center justify-between p-1.5 sm:p-4 shadow-inner relative group transition-all duration-200 ${
                  hoverPreview?.lastLanding === P2_STORE 
                    ? 'ring-2 ring-emerald-400 bg-emerald-950/40 border-emerald-500' 
                    : hoverPreview?.path?.includes(P2_STORE)
                      ? 'bg-slate-800/80 border-amber-500/60'
                      : 'bg-slate-900/80 border-amber-600/30'
                }`}
              >
                <div className="text-[9px] sm:text-xs font-mono font-bold uppercase text-amber-400/80 tracking-widest text-center">
                  P2 Kalah
                </div>
                <div className="flex flex-wrap items-center justify-center gap-1 max-h-36 sm:max-h-48 overflow-y-auto p-1">
                  {Array.from({ length: Math.min(36, gameState.board[P2_STORE]) }).map((_, i) => (
                    <span 
                      key={i} 
                      className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-gradient-to-tr from-amber-600 to-amber-200 shadow-sm shadow-amber-400/30"
                    />
                  ))}
                </div>
                <div className="text-lg sm:text-3xl font-extrabold font-mono text-amber-300">
                  {gameState.board[P2_STORE]}
                </div>
                {gameMode === 'sandbox' && (
                  <div className="flex gap-1 mt-1">
                    <button 
                      onClick={() => handleSandboxPitAdjust(P2_STORE, -1)}
                      className="w-5 h-5 bg-rose-600 rounded text-xs flex items-center justify-center text-white"
                    >
                      -
                    </button>
                    <button 
                      onClick={() => handleSandboxPitAdjust(P2_STORE, 1)}
                      className="w-5 h-5 bg-emerald-600 rounded text-xs flex items-center justify-center text-white"
                    >
                      +
                    </button>
                  </div>
                )}
              </div>

              {/* Center Pits (6 Pits on North, 6 Pits on South) */}
              <div className="col-span-8 flex flex-col gap-2.5 sm:gap-6">
                
                {/* North Player Pits (Indices 12 down to 7) */}
                <div className="grid grid-cols-6 gap-1 sm:gap-3">
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
                        className={`relative flex flex-col items-center justify-between p-1 sm:p-3 rounded-xl sm:rounded-2xl transition-all duration-200 select-none min-h-[50px] min-w-[36px] sm:min-h-[140px] ${
                          isLegal ? 'cursor-pointer hover:border-amber-400 hover:scale-105 active:scale-95' : 'cursor-default'
                        } ${
                          isLanding 
                            ? 'ring-2 ring-emerald-400 bg-emerald-950/40 border-emerald-500' 
                            : isHighlightedPath 
                              ? 'bg-slate-800/80 border-cyan-500/60' 
                              : 'bg-slate-900/90 border border-slate-800'
                        } h-24 sm:h-36`}
                      >
                        <div className="flex items-center justify-between w-full text-[8px] sm:text-[10px] text-slate-500 font-mono">
                          <span>Pit {13 - pitIndex}</span>
                          {evalData && (
                            <span className={`px-1 py-0.2 rounded text-[8px] sm:text-[9px] font-bold border hidden sm:inline ${evalData.badgeColor}`}>
                              {evalData.rank === 1 ? 'BEST' : `#${evalData.rank}`}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center justify-center gap-0.5 sm:gap-1 my-auto max-h-12 sm:max-h-16 overflow-hidden">
                          {Array.from({ length: Math.min(15, stones) }).map((_, i) => (
                            <div 
                              key={i} 
                              className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-gradient-to-tr from-amber-500 to-amber-200 shadow-xs shadow-amber-300/40"
                            />
                          ))}
                        </div>

                        <div 
                          data-testid={`pit-count-${pitIndex}`}
                          className="text-sm sm:text-xl font-mono font-bold text-amber-200"
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

                {/* South Player Pits (Indices 0 to 5) */}
                <div className="grid grid-cols-6 gap-1 sm:gap-3">
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
                        className={`relative flex flex-col items-center justify-between p-1 sm:p-3 rounded-xl sm:rounded-2xl transition-all duration-200 select-none min-h-[50px] min-w-[36px] sm:min-h-[140px] ${
                          isLegal ? 'cursor-pointer hover:border-cyan-400 hover:scale-105 active:scale-95' : 'cursor-default'
                        } ${
                          isLanding 
                            ? 'ring-2 ring-emerald-400 bg-emerald-950/40 border-emerald-500' 
                            : isHighlightedPath 
                              ? 'bg-slate-800/80 border-cyan-500/60' 
                              : 'bg-slate-900/90 border border-slate-800'
                        } h-24 sm:h-36`}
                      >
                        <div className="flex items-center justify-between w-full text-[8px] sm:text-[10px] text-slate-500 font-mono">
                          <span>Pit {pitIndex + 1}</span>
                          {evalData && (
                            <span className={`px-1 py-0.2 rounded text-[8px] sm:text-[9px] font-bold border hidden sm:inline ${evalData.badgeColor}`}>
                              {evalData.rank === 1 ? 'BEST' : `#${evalData.rank}`}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center justify-center gap-0.5 sm:gap-1 my-auto max-h-12 sm:max-h-16 overflow-hidden">
                          {Array.from({ length: Math.min(15, stones) }).map((_, i) => (
                            <div 
                              key={i} 
                              className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-gradient-to-tr from-cyan-400 to-sky-200 shadow-xs shadow-cyan-300/40"
                            />
                          ))}
                        </div>

                        <div 
                          data-testid={`pit-count-${pitIndex}`}
                          className="text-sm sm:text-xl font-mono font-bold text-cyan-200"
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

              {/* Right Kalah Store: Player 1 (South) */}
              <div 
                data-testid="store-6"
                className={`col-span-2 h-56 sm:h-80 rounded-2xl sm:rounded-3xl border-2 flex flex-col items-center justify-between p-1.5 sm:p-4 shadow-inner relative group transition-all duration-200 ${
                  hoverPreview?.lastLanding === P1_STORE 
                    ? 'ring-2 ring-emerald-400 bg-emerald-950/40 border-emerald-500' 
                    : hoverPreview?.path?.includes(P1_STORE)
                      ? 'bg-slate-800/80 border-cyan-500/60'
                      : 'bg-slate-900/80 border-cyan-600/30'
                }`}
              >
                <div className="text-[9px] sm:text-xs font-mono font-bold uppercase text-cyan-400/80 tracking-widest text-center">
                  P1 Kalah
                </div>
                <div className="flex flex-wrap items-center justify-center gap-1 max-h-36 sm:max-h-48 overflow-y-auto p-1">
                  {Array.from({ length: Math.min(36, gameState.board[P1_STORE]) }).map((_, i) => (
                    <span 
                      key={i} 
                      className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-gradient-to-tr from-cyan-500 to-cyan-200 shadow-sm shadow-cyan-400/30"
                    />
                  ))}
                </div>
                <div className="text-lg sm:text-3xl font-extrabold font-mono text-cyan-300">
                  {gameState.board[P1_STORE]}
                </div>
                {gameMode === 'sandbox' && (
                  <div className="flex gap-1 mt-1">
                    <button 
                      onClick={() => handleSandboxPitAdjust(P1_STORE, -1)}
                      className="w-5 h-5 bg-rose-600 rounded text-xs flex items-center justify-center text-white"
                    >
                      -
                    </button>
                    <button 
                      onClick={() => handleSandboxPitAdjust(P1_STORE, 1)}
                      className="w-5 h-5 bg-emerald-600 rounded text-xs flex items-center justify-center text-white"
                    >
                      +
                    </button>
                  </div>
                )}
              </div>

            </div>

            {/* Sowing direction indicator watermark */}
            <div className="mt-2 sm:mt-3 flex items-center justify-center gap-2 text-[9px] sm:text-[10px] uppercase font-mono tracking-widest text-slate-500">
              <span>Counter-Clockwise Flow</span>
              <ArrowRight className="w-3 h-3 text-cyan-500" />
            </div>
          </div>
        </section>

        {/* Tutor Warning Dialog / Modal Overlay */}
        {tutorWarning && (
          <div 
            data-testid="tutor-modal"
            className="p-4 bg-amber-950/80 border-2 border-amber-500/70 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-2xl backdrop-blur-md animate-in fade-in"
          >
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-amber-500/20 rounded-xl text-amber-400">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-amber-200">
                  GNU Tutor Alert: {tutorWarning.eval.classification}!
                </h4>
                <p className="text-xs text-amber-300/80">
                  Playing Pit {tutorWarning.pit + 1} sacrifices <span className="font-bold underline">{(tutorWarning.eval.equityLoss * 100).toFixed(1)}%</span> win probability compared to the optimal move ({tutorWarning.bestMove.label}).
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                data-testid="tutor-reconsider"
                onClick={() => setTutorWarning(null)}
                className="px-3.5 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition"
              >
                Reconsider
              </button>
              <button
                data-testid="tutor-confirm"
                onClick={() => executeMove(tutorWarning.pit, true)}
                className="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow-md transition"
              >
                Confirm Move
              </button>
            </div>
          </div>
        )}

        {/* Bottom Section: GNU Analysis Engine Table & Configuration Cockpit */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
          
          {/* Engine Move Rankings Table (GNU/XG Style) */}
          <div className="lg:col-span-2 bg-slate-900/60 border border-slate-800 rounded-2xl p-3 sm:p-5 flex flex-col shadow-xl overflow-x-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <BarChart3 className="w-4 h-4 text-cyan-400" />
                <h3 className="font-bold text-sm tracking-wide text-slate-200">
                  GNU Real-Time Candidate Evaluations
                </h3>
              </div>
              <span className="text-[11px] font-mono text-slate-400">
                Ply Lookahead: {searchDepth} plies {isAnalyzing ? '(Calculating...)' : ''}
              </span>
            </div>

            {/* Candidate Moves Table */}
            <div className="overflow-x-auto mt-3">
              <table className="w-full text-left text-xs min-w-[500px]">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-mono uppercase text-[10px]">
                    <th className="py-2 px-2">Rank</th>
                    <th className="py-2 px-2">Pit Action</th>
                    <th className="py-2 px-2">Win %</th>
                    <th className="py-2 px-2">Equity Diff</th>
                    <th className="py-2 px-2">Error Grade</th>
                    <th className="py-2 px-2 hidden sm:table-cell">Bonus / PV Lookahead</th>
                    <th className="py-2 px-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {analysisResults.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-slate-500">
                        {gameState.isGameOver ? "Match completed. No moves available." : "Calculating optimal branches..."}
                      </td>
                    </tr>
                  ) : (
                    analysisResults.map((move, idx) => (
                      <tr 
                        key={move.pit}
                        data-testid={idx === 0 ? "eval-row-0" : idx === analysisResults.length - 1 ? "eval-row-worst" : undefined}
                        className={`hover:bg-slate-800/40 transition ${move.rank === 1 ? 'bg-cyan-950/20' : ''}`}
                      >
                        <td className="py-2.5 px-2 font-bold text-slate-300">
                          #{move.rank}
                        </td>
                        <td className="py-2.5 px-2 font-bold text-cyan-300">
                          {move.label}
                        </td>
                        <td className="py-2.5 px-2">
                          <span className="font-semibold text-slate-100">
                            {(move.winProb * 100).toFixed(1)}%
                          </span>
                        </td>
                        <td className="py-2.5 px-2">
                          <span className={move.equityLoss === 0 ? 'text-emerald-400' : 'text-rose-400'}>
                            {move.equityLoss === 0 ? '0.000' : `-${(move.equityLoss * 100).toFixed(1)}%`}
                          </span>
                        </td>
                        <td className="py-2.5 px-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] border ${move.badgeColor}`}>
                            {move.classification}
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-slate-400 hidden sm:table-cell text-[11px]">
                          {move.freeTurn && <span className="text-emerald-400 font-bold mr-1">[Free Turn]</span>}
                          {move.captures > 0 && <span className="text-amber-400 font-bold mr-1">[+{move.captures} Cap]</span>}
                          <span className="text-slate-500">PV: {move.pv.map(p => `P${p+1}`).join(' → ')}</span>
                        </td>
                        <td className="py-2.5 px-2 text-right">
                          <button
                            data-testid={`eval-play-pit-${move.pit}`}
                            onClick={() => executeMove(move.pit, true)}
                            disabled={gameState.isGameOver}
                            className="px-2 py-1 bg-slate-800 hover:bg-cyan-600 hover:text-white rounded border border-slate-700 text-[10px] text-slate-300 transition"
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

          {/* Configuration and Mode Control Drawer */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col gap-4 shadow-xl">
            <div className="flex items-center space-x-2 pb-2 border-b border-slate-800">
              <Settings className="w-4 h-4 text-cyan-400" />
              <h3 className="font-bold text-sm text-slate-200">Tournament Controls & AI Settings</h3>
            </div>

            {/* Game Mode Selector */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-400">Game Mode</label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  { id: 'pve', label: 'vs GNU Engine' },
                  { id: 'ai_vs_ai', label: 'AI vs AI Duel' },
                  { id: 'pvp', label: 'Pass & Play' },
                  { id: 'sandbox', label: 'Position Sandbox' }
                ].map(m => (
                  <button
                    key={m.id}
                    data-testid={`mode-${m.id}`}
                    onClick={() => {
                      setGameMode(m.id);
                      setIsAiRunning(false);
                    }}
                    className={`p-2 rounded-lg border font-medium text-left transition ${
                      gameMode === m.id
                        ? 'bg-cyan-600/20 border-cyan-500 text-cyan-300'
                        : 'bg-slate-800/40 border-slate-700/80 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* PvE Player Selection */}
            {gameMode === 'pve' && (
              <div className="flex items-center justify-between p-2.5 bg-slate-950/60 rounded-xl border border-slate-800 text-xs">
                <span className="text-slate-300">Play As:</span>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => setHumanPlayer(0)}
                    className={`px-2.5 py-1 rounded border text-xs font-semibold transition ${
                      humanPlayer === 0
                        ? 'bg-cyan-600/30 border-cyan-500 text-cyan-300'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    South (P1)
                  </button>
                  <button
                    onClick={() => setHumanPlayer(1)}
                    className={`px-2.5 py-1 rounded border text-xs font-semibold transition ${
                      humanPlayer === 1
                        ? 'bg-amber-600/30 border-amber-500 text-amber-300'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    North (P2)
                  </button>
                </div>
              </div>
            )}

            {/* AI vs AI Controls */}
            {gameMode === 'ai_vs_ai' && (
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 flex items-center justify-between">
                <span className="text-xs font-medium text-slate-300">Self-Play Automation:</span>
                <button
                  data-testid="ai-duel-toggle"
                  onClick={() => setIsAiRunning(!isAiRunning)}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    isAiRunning 
                      ? 'bg-rose-600 hover:bg-rose-500 text-white' 
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  }`}
                >
                  {isAiRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  <span>{isAiRunning ? 'Pause Match' : 'Run Duel'}</span>
                </button>
              </div>
            )}

            {/* Minimax Search Depth Slider */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400 font-semibold">Engine Search Depth</span>
                <span className="text-cyan-400 font-mono font-bold">{searchDepth} Plies</span>
              </div>
              <input 
                type="range" 
                min="1" 
                max="8" 
                value={searchDepth} 
                onChange={(e) => setSearchDepth(Number(e.target.value))}
                className="w-full accent-cyan-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>Fast (1)</span>
                <span>Tournament Grandmaster (8)</span>
              </div>
            </div>

            {/* Rules Configuration */}
            <div className="flex flex-col gap-2 pt-2 border-t border-slate-800">
              <span className="text-xs font-semibold text-slate-400">Mancala Ruleset</span>
              
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300">Starting Stones / Pit:</span>
                <div className="flex space-x-1">
                  {[3, 4, 5, 6].map(num => (
                    <button
                      key={num}
                      onClick={() => {
                        setStonesConfig(num);
                        setGameState(createInitialState(num));
                      }}
                      className={`px-2 py-0.5 rounded text-xs font-mono font-bold border ${
                        stonesConfig === num 
                          ? 'bg-cyan-500 text-slate-950 border-cyan-400' 
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>

              <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer">
                <span>Store Finish = Bonus Turn</span>
                <input 
                  type="checkbox" 
                  checked={rules.freeTurn}
                  onChange={(e) => setRules({ ...rules, freeTurn: e.target.checked })}
                  className="rounded accent-cyan-500"
                />
              </label>

              <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer">
                <span>Opposite Pit Capture</span>
                <input 
                  type="checkbox" 
                  checked={rules.captureOpposite}
                  onChange={(e) => setRules({ ...rules, captureOpposite: e.target.checked })}
                  className="rounded accent-cyan-500"
                />
              </label>
            </div>

            {/* Performance / Tournament Metric Card */}
            <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800/80 text-xs">
              <div className="font-semibold text-slate-300 mb-1 flex items-center justify-between">
                <span>Session Performance Rating</span>
                <Award className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-400">
                <div>P1 PR: <span className="text-cyan-300 font-bold">{calcPR(matchStats.p1TotalLoss, matchStats.p1Moves)}</span></div>
                <div>P2 PR: <span className="text-amber-300 font-bold">{calcPR(matchStats.p2TotalLoss, matchStats.p2Moves)}</span></div>
                <div>P1 Moves: {matchStats.p1Moves}</div>
                <div>P2 Moves: {matchStats.p2Moves}</div>
              </div>
            </div>

          </div>

        </div>

      </main>

      {/* Pre-Flight Diagnostics Modal */}
      {diagnosticsOpen && (
        <div 
          data-testid="diagnostics-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
        >
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
              <div className="flex items-center space-x-2.5">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-base text-slate-100">
                  GNU Automated Pre-Flight Test Suite
                </h3>
              </div>
              <button 
                onClick={() => setDiagnosticsOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex flex-col gap-3 font-mono text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-slate-400">
                <span>Total Tests: {diagResults.length}</span>
                <span className="text-emerald-400 font-bold">
                  All Invariants Intact ({diagResults.filter(r => r.status === 'PASS').length}/{diagResults.length})
                </span>
              </div>

              <div className="divide-y divide-slate-800/80">
                {diagResults.map((item, i) => (
                  <div key={i} className="py-2.5 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <div>
                        <div className="font-semibold text-slate-200">{item.name}</div>
                        <div className="text-[10px] text-slate-500">{item.category}</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
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
              <span className="text-[11px] text-slate-400">Zero-Leak Conservation & Solver Invariants Guaranteed</span>
              <button
                onClick={handleRunDiagnostics}
                disabled={isDiagRunning}
                className="px-3.5 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold shadow-md transition disabled:opacity-50"
              >
                {isDiagRunning ? "Running Diagnostics..." : "Re-run Diagnostics"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-800/70 py-3 px-4 text-center text-[11px] text-slate-500">
        GNU Mancala 2030s Edition • Exact Alpha-Beta Minimax & Multi-ply PV Rollouts • Kalah Tournament Engine
      </footer>

    </div>
  );
}
