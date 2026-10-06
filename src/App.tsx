import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Play, Pause, RotateCcw, Award, Settings, BarChart3, 
  Sparkles, Volume2, VolumeX, Cpu, Eye, 
  ArrowRight, AlertTriangle, Zap, Sliders
} from 'lucide-react';

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
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.18); // G5
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

export const TOTAL_PITS = 14;
export const P1_STORE = 6;
export const P2_STORE = 13;
export const P1_PITS = [0, 1, 2, 3, 4, 5];
export const P2_PITS = [7, 8, 9, 10, 11, 12];

export interface RulesConfig {
  freeTurn: boolean;
  captureOpposite: boolean;
}

export interface GameState {
  board: number[];
  currentPlayer: number; // 0: Player 1 (South / Bottom), 1: Player 2 (North / Top)
  isGameOver: boolean;
  winner: number | null; // 0: P1, 1: P2, -1: Draw
  moveHistory: Array<{
    player: number;
    pit: number;
    freeTurn: boolean;
    captures: number;
  }>;
  lastMovedPit: number | null;
}

export interface MoveSimulationResult {
  newBoard: number[];
  nextPlayer: number;
  isGameOver: boolean;
  winner: number | null;
  earnedFreeTurn: boolean;
  capturedStones: number;
  capturedFromPit: number | null;
  lastLanding: number;
  path: number[];
}

export interface EvaluatedMove {
  pit: number;
  label: string;
  score: number;
  winProb: number;
  pv: number[];
  freeTurn: boolean;
  captures: number;
  resultingBoard: number[];
  rank: number;
  equityLoss: number;
  scoreDiff: number;
  classification: string;
  badgeColor: string;
}

export function createInitialState(stonesPerPit = 4): GameState {
  const board = new Array(14).fill(stonesPerPit);
  board[P1_STORE] = 0;
  board[P2_STORE] = 0;
  return {
    board,
    currentPlayer: 0,
    isGameOver: false,
    winner: null,
    moveHistory: [],
    lastMovedPit: null
  };
}

export function getLegalMoves(board: number[], player: number): number[] {
  const pits = player === 0 ? P1_PITS : P2_PITS;
  const legal: number[] = [];
  for (let i = 0; i < pits.length; i++) {
    const pit = pits[i];
    if (board[pit] > 0) {
      legal.push(pit);
    }
  }
  return legal;
}

export function simulateMove(
  board: number[], 
  player: number, 
  pit: number, 
  rules: RulesConfig = { freeTurn: true, captureOpposite: true }
): MoveSimulationResult {
  const newBoard = [...board];
  let stones = newBoard[pit];
  newBoard[pit] = 0;

  const playerStore = player === 0 ? P1_STORE : P2_STORE;
  const opponentStore = player === 0 ? P2_STORE : P1_STORE;
  const playerPits = player === 0 ? P1_PITS : P2_PITS;

  let current = pit;
  const path: number[] = [];

  while (stones > 0) {
    current = (current + 1) % 14;
    // Skip opponent's store
    if (current === opponentStore) continue;

    newBoard[current]++;
    path.push(current);
    stones--;
  }

  const lastLanding = current;
  let earnedFreeTurn = false;
  let capturedStones = 0;
  let capturedFromPit: number | null = null;

  // Rule 1: Free Turn if last stone lands in current player's store
  if (rules.freeTurn && lastLanding === playerStore) {
    earnedFreeTurn = true;
  } 
  // Rule 2: Capture if last stone lands in own empty pit and opposite pit has stones
  else if (rules.captureOpposite && playerPits.includes(lastLanding) && newBoard[lastLanding] === 1) {
    const oppositePit = 12 - lastLanding;
    if (newBoard[oppositePit] > 0) {
      capturedStones = newBoard[oppositePit] + 1; // opposite + landing stone
      capturedFromPit = oppositePit;
      newBoard[oppositePit] = 0;
      newBoard[lastLanding] = 0;
      newBoard[playerStore] += capturedStones;
    }
  }

  // Check Game Termination: if either side's pits are empty
  const p1Empty = P1_PITS.every(p => newBoard[p] === 0);
  const p2Empty = P2_PITS.every(p => newBoard[p] === 0);

  let isGameOver = false;
  let winner: number | null = null;

  if (p1Empty || p2Empty) {
    isGameOver = true;
    // Sweep remaining stones into respective stores
    for (const p of P1_PITS) {
      newBoard[P1_STORE] += newBoard[p];
      newBoard[p] = 0;
    }
    for (const p of P2_PITS) {
      newBoard[P2_STORE] += newBoard[p];
      newBoard[p] = 0;
    }

    if (newBoard[P1_STORE] > newBoard[P2_STORE]) winner = 0;
    else if (newBoard[P2_STORE] > newBoard[P1_STORE]) winner = 1;
    else winner = -1; // Draw
  }

  const nextPlayer = earnedFreeTurn && !isGameOver ? player : 1 - player;

  return {
    newBoard,
    nextPlayer,
    isGameOver,
    winner,
    earnedFreeTurn,
    capturedStones,
    capturedFromPit,
    lastLanding,
    path
  };
}

const transpositionTable = new Map<string, { score: number; bestMove: number; pv: number[] }>();

export function evaluatePosition(board: number[]): number {
  // Primary: Store differential
  const storeDiff = board[P1_STORE] - board[P2_STORE];
  
  // Secondary: On-board stones distribution
  let p1Stones = 0;
  let p2Stones = 0;
  for (const p of P1_PITS) p1Stones += board[p];
  for (const p of P2_PITS) p2Stones += board[p];
  
  // Positional mobility / capture potential
  let p1Potential = 0;
  let p2Potential = 0;
  for (const p of P1_PITS) {
    if (board[p] > 0 && (p + board[p]) % 14 === P1_STORE) p1Potential += 2.2;
  }
  for (const p of P2_PITS) {
    if (board[p] > 0 && (p + board[p]) % 14 === P2_STORE) p2Potential += 2.2;
  }

  const rawScore = (storeDiff * 3.5) + ((p1Stones - p2Stones) * 0.6) + (p1Potential - p2Potential);
  return rawScore;
}

export function minimax(
  board: number[], 
  player: number, 
  depth: number, 
  alpha: number, 
  beta: number, 
  rules: RulesConfig, 
  maxDepth: number
): { score: number; bestMove: number; pv: number[] } {
  const hash = `${board.join(',')}_${player}_${depth}`;
  if (transpositionTable.has(hash)) {
    return transpositionTable.get(hash)!;
  }

  const legalMoves = getLegalMoves(board, player);
  if (depth === 0 || legalMoves.length === 0) {
    const evalScore = evaluatePosition(board);
    return { score: evalScore, bestMove: -1, pv: [] };
  }

  let bestMove = legalMoves[0];
  let bestPV: number[] = [];

  if (player === 0) { // Maximizing Player (Player 1)
    let maxEval = -Infinity;
    for (const move of legalMoves) {
      const res = simulateMove(board, player, move, rules);
      let evaluation: number;
      if (res.isGameOver) {
        evaluation = (res.newBoard[P1_STORE] - res.newBoard[P2_STORE]) * 100;
        if (evaluation > maxEval) {
          maxEval = evaluation;
          bestMove = move;
          bestPV = [move];
        }
      } else {
        const nextDepth = res.nextPlayer === player ? depth : depth - 1;
        const result = minimax(res.newBoard, res.nextPlayer, nextDepth, alpha, beta, rules, maxDepth);
        if (result.score > maxEval) {
          maxEval = result.score;
          bestMove = move;
          bestPV = [move, ...result.pv.slice(0, 3)];
        }
      }
      alpha = Math.max(alpha, maxEval);
      if (beta <= alpha) break;
    }
    const res = { score: maxEval, bestMove, pv: bestPV };
    transpositionTable.set(hash, res);
    return res;
  } else { // Minimizing Player (Player 2)
    let minEval = Infinity;
    for (const move of legalMoves) {
      const res = simulateMove(board, player, move, rules);
      let evaluation: number;
      if (res.isGameOver) {
        evaluation = (res.newBoard[P1_STORE] - res.newBoard[P2_STORE]) * 100;
        if (evaluation < minEval) {
          minEval = evaluation;
          bestMove = move;
          bestPV = [move];
        }
      } else {
        const nextDepth = res.nextPlayer === player ? depth : depth - 1;
        const result = minimax(res.newBoard, res.nextPlayer, nextDepth, alpha, beta, rules, maxDepth);
        if (result.score < minEval) {
          minEval = result.score;
          bestMove = move;
          bestPV = [move, ...result.pv.slice(0, 3)];
        }
      }
      beta = Math.min(beta, minEval);
      if (beta <= alpha) break;
    }
    const res = { score: minEval, bestMove, pv: bestPV };
    transpositionTable.set(hash, res);
    return res;
  }
}

export function analyzeAllMoves(
  board: number[], 
  player: number, 
  depth: number, 
  rules: RulesConfig
): EvaluatedMove[] {
  const legalMoves = getLegalMoves(board, player);
  if (legalMoves.length === 0) return [];

  const evaluatedMoves = legalMoves.map(pit => {
    const res = simulateMove(board, player, pit, rules);
    let score: number;
    let pv: number[] = [pit];

    if (res.isGameOver) {
      score = (res.newBoard[P1_STORE] - res.newBoard[P2_STORE]) * 100;
    } else {
      const nextDepth = res.nextPlayer === player ? depth : depth - 1;
      const mm = minimax(res.newBoard, res.nextPlayer, Math.max(1, nextDepth), -Infinity, Infinity, rules, depth);
      score = mm.score;
      pv = [pit, ...(mm.pv || []).slice(0, 3)];
    }

    // Win probability based on logistic sigmoid of score
    const p1Prob = 1 / (1 + Math.exp(-score * 0.12));
    const winProb = player === 0 ? p1Prob : 1 - p1Prob;

    return {
      pit,
      label: player === 0 ? `Pit ${pit + 1}` : `Pit ${13 - pit}`,
      score,
      winProb: Math.min(0.999, Math.max(0.001, winProb)),
      pv,
      freeTurn: res.earnedFreeTurn,
      captures: res.capturedStones,
      resultingBoard: res.newBoard
    };
  });

  // Sort descending by current player's win probability
  evaluatedMoves.sort((a, b) => b.winProb - a.winProb);

  const bestWinProb = evaluatedMoves[0].winProb;
  const bestScore = evaluatedMoves[0].score;

  return evaluatedMoves.map((m, rank) => {
    const equityLoss = Math.max(0, bestWinProb - m.winProb);
    const scoreDiff = player === 0 ? bestScore - m.score : m.score - bestScore;

    let classification = 'Best';
    let badgeColor = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';

    if (rank === 0) {
      classification = 'Excellent (Best)';
      badgeColor = 'bg-emerald-500/25 text-emerald-300 border-emerald-400';
    } else if (equityLoss < 0.025) {
      classification = 'Good';
      badgeColor = 'bg-teal-500/20 text-teal-300 border-teal-500/30';
    } else if (equityLoss < 0.075) {
      classification = 'Inaccuracy';
      badgeColor = 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
    } else if (equityLoss < 0.16) {
      classification = 'Mistake';
      badgeColor = 'bg-amber-600/25 text-amber-300 border-amber-600/40';
    } else {
      classification = 'Blunder';
      badgeColor = 'bg-rose-600/25 text-rose-300 border-rose-600/40';
    }

    return {
      ...m,
      rank: rank + 1,
      equityLoss,
      scoreDiff,
      classification,
      badgeColor
    };
  });
}

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
  const [aiSpeedMs, setAiSpeedMs] = useState(650);

  // Analysis state
  const [analysisResults, setAnalysisResults] = useState<EvaluatedMove[]>([]);
  const [hoveredPit, setHoveredPit] = useState<number | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [tutorWarning, setTutorWarning] = useState<{
    pit: number;
    eval: EvaluatedMove;
    bestMove: EvaluatedMove;
  } | null>(null);

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
    if (!legalPits.includes(pitIndex) || gameState.board[pitIndex] === 0) return;

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
    if (!legalPits.includes(hoveredPit)) return null;

    const sim = simulateMove(gameState.board, gameState.currentPlayer, hoveredPit, rules);
    return sim;
  }, [hoveredPit, gameState.board, gameState.currentPlayer, rules]);

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

  // GNU Backgammon Performance Rating (PR) calculation
  const calcPR = (loss: number, moves: number) => {
    if (moves === 0) return '0.00';
    const pr = ((loss * 100) / moves) * 3.5;
    return pr.toFixed(2);
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#0a0d14] text-slate-100 font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      
      {/* Top Header & Brand Bar */}
      <header className="border-b border-slate-800/80 bg-slate-900/70 backdrop-blur-md sticky top-0 z-40 px-4 py-3">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 via-indigo-600 to-fuchsia-600 p-[2px] shadow-lg shadow-cyan-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Cpu className="w-5 h-5 text-cyan-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="font-extrabold text-lg tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-sky-200 to-indigo-300">
                  GNU MANCALA
                </h1>
                <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-300">
                  2030s Neural Engine
                </span>
              </div>
              <p className="text-xs text-slate-400">GNU Backgammon & XG Tournament Mathematics for Kalah</p>
            </div>
          </div>

          {/* Quick Engine Actions */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? "Mute sounds" : "Enable audio"}
              className="p-2 rounded-lg bg-slate-800/70 border border-slate-700 hover:bg-slate-700/60 transition text-slate-300"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-cyan-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
            </button>

            <button
              onClick={() => setTutorMode(!tutorMode)}
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
              className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-700 text-xs font-medium text-slate-200 transition"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
              <span>New Match</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto w-full p-3 sm:p-5 flex-1 flex flex-col gap-5">
        
        {/* Top Evaluation & Equity Gauge (GNU/XG Style) */}
        <section className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 backdrop-blur-md shadow-xl relative overflow-hidden">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            
            {/* Player 2 (North) Meta */}
            <div className="flex items-center space-x-3 w-full sm:w-auto">
              <div className={`w-3.5 h-3.5 rounded-full ${gameState.currentPlayer === 1 && !gameState.isGameOver ? 'bg-amber-400 ring-4 ring-amber-400/20 animate-pulse' : 'bg-slate-600'}`} />
              <div>
                <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-1.5">
                  Player 2 (North)
                  {gameMode === 'pve' && humanPlayer === 0 && <span className="text-[10px] text-indigo-400 px-1.5 py-0.2 rounded bg-indigo-950/70 border border-indigo-700/30">GNU Engine</span>}
                  {gameMode === 'pve' && humanPlayer === 1 && <span className="text-[10px] text-emerald-400 px-1.5 py-0.2 rounded bg-emerald-950/70 border border-emerald-700/30">You</span>}
                </div>
                <div className="text-lg font-bold text-slate-200">
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
                {/* 50% Center Marker */}
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
                <div className="text-lg font-bold text-slate-200">
                  {(p1CurrentWinProb * 100).toFixed(1)}% <span className="text-xs text-slate-400 font-normal">Win Equity</span>
                </div>
              </div>
              <div className={`w-3.5 h-3.5 rounded-full ${gameState.currentPlayer === 0 && !gameState.isGameOver ? 'bg-cyan-400 ring-4 ring-cyan-400/20 animate-pulse' : 'bg-slate-600'}`} />
            </div>

          </div>
        </section>

        {/* Interactive Mancala Board & 2030s Tactile Board Interface */}
        <section className="bg-gradient-to-b from-[#141a29] to-[#0c101a] border border-slate-800 rounded-3xl p-4 sm:p-8 shadow-2xl relative">
          
          {/* Status Alert Banner / Free Turn Indicator */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 min-h-[32px]">
            <div className="flex items-center space-x-2">
              <span className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${
                gameState.currentPlayer === 0 
                  ? 'bg-cyan-950/90 text-cyan-300 border-cyan-600/40' 
                  : 'bg-amber-950/90 text-amber-300 border-amber-600/40'
              }`}>
                Turn: {gameState.currentPlayer === 0 ? "Player 1 (South)" : "Player 2 (North)"}
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
              <div className="flex items-center space-x-2 px-3 py-1 rounded-lg bg-indigo-900/60 border border-indigo-500/40 text-indigo-200 text-xs font-bold animate-pulse">
                <Award className="w-4 h-4 text-amber-400" />
                <span>
                  {gameState.winner === -1 
                    ? "Game Ended in a Draw!" 
                    : `Player ${gameState.winner! + 1} Wins (${gameState.board[P1_STORE]} - ${gameState.board[P2_STORE]})!`}
                </span>
              </div>
            )}
          </div>

          {/* The Obsidian & Wood Kalah Board */}
          <div className="relative bg-[#0d131f] border-2 border-slate-700/60 rounded-3xl p-3 sm:p-6 shadow-2xl overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-30 pointer-events-none" />

            <div className="relative grid grid-cols-12 gap-2 sm:gap-4 items-center">
              
              {/* Left Kalah Store: Player 2 (North) */}
              <div className="col-span-2 sm:col-span-2 h-64 sm:h-80 bg-slate-900/80 rounded-2xl sm:rounded-3xl border-2 border-amber-600/30 flex flex-col items-center justify-between p-2 sm:p-4 shadow-inner relative group">
                <div className="text-[10px] sm:text-xs font-mono font-bold uppercase text-amber-400/80 tracking-widest text-center">
                  P2 Kalah
                </div>
                <div className="flex flex-wrap items-center justify-center gap-1.5 max-h-48 overflow-y-auto p-1">
                  {Array.from({ length: Math.min(36, gameState.board[P2_STORE]) }).map((_, i) => (
                    <span 
                      key={i} 
                      className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-gradient-to-tr from-amber-600 to-amber-200 shadow-sm shadow-amber-400/30"
                    />
                  ))}
                </div>
                <div className="text-xl sm:text-3xl font-extrabold font-mono text-amber-300">
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
              <div className="col-span-8 sm:col-span-8 flex flex-col gap-3 sm:gap-6">
                
                {/* North Player Pits (Indices 12 down to 7 - counter-clockwise flow) */}
                <div className="grid grid-cols-6 gap-1.5 sm:gap-3">
                  {[12, 11, 10, 9, 8, 7].map((pitIndex) => {
                    const stones = gameState.board[pitIndex];
                    const isLegal = gameState.currentPlayer === 1 && stones > 0 && !gameState.isGameOver;
                    const evalData = analysisResults.find(m => m.pit === pitIndex);
                    const isHighlightedPath = hoverPreview?.path?.includes(pitIndex);
                    const isLanding = hoverPreview?.lastLanding === pitIndex;

                    return (
                      <div
                        key={pitIndex}
                        onClick={() => {
                          if (gameMode === 'sandbox') handleSandboxPitAdjust(pitIndex, 1);
                          else if (isLegal) executeMove(pitIndex);
                        }}
                        onMouseEnter={() => setHoveredPit(pitIndex)}
                        onMouseLeave={() => setHoveredPit(null)}
                        className={`relative flex flex-col items-center justify-between p-2 sm:p-3 rounded-xl sm:rounded-2xl transition-all duration-200 select-none ${
                          isLegal ? 'cursor-pointer hover:border-amber-400 hover:scale-105 active:scale-95' : 'cursor-default'
                        } ${
                          isLanding 
                            ? 'ring-2 ring-emerald-400 bg-emerald-950/40 border-emerald-500' 
                            : isHighlightedPath 
                              ? 'bg-slate-800/80 border-cyan-500/60' 
                              : 'bg-slate-900/90 border border-slate-800'
                        } h-28 sm:h-36`}
                      >
                        {/* Pit Index Label */}
                        <div className="flex items-center justify-between w-full text-[9px] sm:text-[10px] text-slate-500 font-mono">
                          <span>Pit {13 - pitIndex}</span>
                          {evalData && (
                            <span className={`px-1 py-0.2 rounded text-[9px] font-bold border ${evalData.badgeColor}`}>
                              {evalData.rank === 1 ? 'BEST' : `#${evalData.rank}`}
                            </span>
                          )}
                        </div>

                        {/* Pebble / Stone Visuals */}
                        <div className="flex flex-wrap items-center justify-center gap-1 my-auto max-h-16 overflow-hidden">
                          {Array.from({ length: Math.min(15, stones) }).map((_, i) => (
                            <div 
                              key={i} 
                              className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-gradient-to-tr from-amber-500 to-amber-200 shadow-xs shadow-amber-300/40"
                            />
                          ))}
                        </div>

                        {/* Count Badge */}
                        <div className="text-base sm:text-xl font-mono font-bold text-amber-200">
                          {stones}
                        </div>

                        {/* Sandbox adjustment buttons */}
                        {gameMode === 'sandbox' && (
                          <div className="absolute -top-2 flex gap-1 z-20">
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleSandboxPitAdjust(pitIndex, -1); }}
                              className="w-4 h-4 bg-rose-600 rounded text-xs flex items-center justify-center text-white"
                            >
                              -
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleSandboxPitAdjust(pitIndex, 1); }}
                              className="w-4 h-4 bg-emerald-600 rounded text-xs flex items-center justify-center text-white"
                            >
                              +
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* South Player Pits (Indices 0 to 5) */}
                <div className="grid grid-cols-6 gap-1.5 sm:gap-3">
                  {[0, 1, 2, 3, 4, 5].map((pitIndex) => {
                    const stones = gameState.board[pitIndex];
                    const isLegal = gameState.currentPlayer === 0 && stones > 0 && !gameState.isGameOver;
                    const evalData = analysisResults.find(m => m.pit === pitIndex);
                    const isHighlightedPath = hoverPreview?.path?.includes(pitIndex);
                    const isLanding = hoverPreview?.lastLanding === pitIndex;

                    return (
                      <div
                        key={pitIndex}
                        onClick={() => {
                          if (gameMode === 'sandbox') handleSandboxPitAdjust(pitIndex, 1);
                          else if (isLegal) executeMove(pitIndex);
                        }}
                        onMouseEnter={() => setHoveredPit(pitIndex)}
                        onMouseLeave={() => setHoveredPit(null)}
                        className={`relative flex flex-col items-center justify-between p-2 sm:p-3 rounded-xl sm:rounded-2xl transition-all duration-200 select-none ${
                          isLegal ? 'cursor-pointer hover:border-cyan-400 hover:scale-105 active:scale-95' : 'cursor-default'
                        } ${
                          isLanding 
                            ? 'ring-2 ring-emerald-400 bg-emerald-950/40 border-emerald-500' 
                            : isHighlightedPath 
                              ? 'bg-slate-800/80 border-cyan-500/60' 
                              : 'bg-slate-900/90 border border-slate-800'
                        } h-28 sm:h-36`}
                      >
                        {/* Pit Index Label */}
                        <div className="flex items-center justify-between w-full text-[9px] sm:text-[10px] text-slate-500 font-mono">
                          <span>Pit {pitIndex + 1}</span>
                          {evalData && (
                            <span className={`px-1 py-0.2 rounded text-[9px] font-bold border ${evalData.badgeColor}`}>
                              {evalData.rank === 1 ? 'BEST' : `#${evalData.rank}`}
                            </span>
                          )}
                        </div>

                        {/* Pebble / Stone Visuals */}
                        <div className="flex flex-wrap items-center justify-center gap-1 my-auto max-h-16 overflow-hidden">
                          {Array.from({ length: Math.min(15, stones) }).map((_, i) => (
                            <div 
                              key={i} 
                              className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-gradient-to-tr from-cyan-400 to-sky-200 shadow-xs shadow-cyan-300/40"
                            />
                          ))}
                        </div>

                        {/* Count Badge */}
                        <div className="text-base sm:text-xl font-mono font-bold text-cyan-200">
                          {stones}
                        </div>

                        {/* Sandbox adjustment buttons */}
                        {gameMode === 'sandbox' && (
                          <div className="absolute -bottom-2 flex gap-1 z-20">
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleSandboxPitAdjust(pitIndex, -1); }}
                              className="w-4 h-4 bg-rose-600 rounded text-xs flex items-center justify-center text-white"
                            >
                              -
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleSandboxPitAdjust(pitIndex, 1); }}
                              className="w-4 h-4 bg-emerald-600 rounded text-xs flex items-center justify-center text-white"
                            >
                              +
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

              </div>

              {/* Right Kalah Store: Player 1 (South) */}
              <div className="col-span-2 sm:col-span-2 h-64 sm:h-80 bg-slate-900/80 rounded-2xl sm:rounded-3xl border-2 border-cyan-600/30 flex flex-col items-center justify-between p-2 sm:p-4 shadow-inner relative group">
                <div className="text-[10px] sm:text-xs font-mono font-bold uppercase text-cyan-400/80 tracking-widest text-center">
                  P1 Kalah
                </div>
                <div className="flex flex-wrap items-center justify-center gap-1.5 max-h-48 overflow-y-auto p-1">
                  {Array.from({ length: Math.min(36, gameState.board[P1_STORE]) }).map((_, i) => (
                    <span 
                      key={i} 
                      className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-gradient-to-tr from-cyan-500 to-cyan-200 shadow-sm shadow-cyan-400/30"
                    />
                  ))}
                </div>
                <div className="text-xl sm:text-3xl font-extrabold font-mono text-cyan-300">
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
            <div className="mt-3 flex items-center justify-center gap-2 text-[10px] uppercase font-mono tracking-widest text-slate-500">
              <span>Counter-Clockwise Flow</span>
              <ArrowRight className="w-3 h-3 text-cyan-500" />
            </div>
          </div>
        </section>

        {/* Tutor Warning Dialog / Modal Overlay */}
        {tutorWarning && (
          <div className="p-4 bg-amber-950/70 border-2 border-amber-500/60 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-2xl backdrop-blur-md">
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
                onClick={() => setTutorWarning(null)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
              >
                Cancel Move
              </button>
              <button
                onClick={() => executeMove(tutorWarning.pit, true)}
                className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow-md"
              >
                Play Anyway
              </button>
            </div>
          </div>
        )}

        {/* Bottom Section: GNU Analysis Engine Table & Configuration Cockpit */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          
          {/* Engine Move Rankings Table (GNU/XG Style) */}
          <div className="lg:col-span-2 bg-slate-900/60 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col shadow-xl">
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
              <table className="w-full text-left text-xs">
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
                    analysisResults.map((move) => (
                      <tr 
                        key={move.pit} 
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
              
              {/* Starting Stones */}
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

              {/* Kalah Free Turn Rule */}
              <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer">
                <span>Store Finish = Bonus Turn</span>
                <input 
                  type="checkbox" 
                  checked={rules.freeTurn}
                  onChange={(e) => setRules({ ...rules, freeTurn: e.target.checked })}
                  className="rounded accent-cyan-500"
                />
              </label>

              {/* Opposite Pit Capture Rule */}
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

      {/* Footer */}
      <footer className="border-t border-slate-800/70 py-3 px-4 text-center text-[11px] text-slate-500">
        GNU Mancala 2030s Edition • Exact Alpha-Beta Minimax & Multi-ply PV Rollouts • Kalah Tournament Engine
      </footer>

    </div>
  );
}
