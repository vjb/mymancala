import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  Play, Pause, RotateCcw, Award, Settings, BarChart3, 
  Sparkles, Volume2, VolumeX, Eye, EyeOff,
  ArrowRight, AlertTriangle, Zap, CheckCircle2, ShieldCheck, X,
  ShieldAlert, HelpCircle, LayoutGrid, Bot, User, ChevronDown, ChevronUp,
  Trophy, Smartphone, MessageSquare, BookOpen
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
import { generateTacticalExplanation, TacticalExplanation, getPitLabel } from './tactics';
import { runGNUPreflightSuite, DiagnosticResult } from './preflight-diagnostics';
import { sounds } from './sound';
import { SkinTheme, THEMES } from './theme';
import { PebbleCluster } from './Pebble';
import { haptics } from './haptics';
import { BOT_PERSONAS, DEFAULT_BOT_ID, getBotReaction, BotReactionEvent } from './bots';
import { GameReviewModal, GameReviewData, MoveRecord } from './GameReviewModal';
import { RulesModal } from './RulesModal';

export default function App() {
  const [stonesConfig, setStonesConfig] = useState(4);
  const [rules, setRules] = useState<RulesConfig>({ freeTurn: true, captureOpposite: true });
  const [gameState, setGameState] = useState<GameState>(() => createInitialState(4));
  const [searchDepth, setSearchDepth] = useState(() => {
    try {
      const saved = localStorage.getItem('mancala_search_depth');
      const val = saved ? parseInt(saved, 10) : 5;
      return !isNaN(val) && val >= 1 && val <= 10 ? val : 5;
    } catch {
      return 5;
    }
  });
  useEffect(() => {
    try { localStorage.setItem('mancala_search_depth', String(searchDepth)); } catch {}
  }, [searchDepth]);
  
  // Theme / Skin State with localStorage persistence
  const [currentSkin, setCurrentSkin] = useState<SkinTheme>(() => {
    try {
      const saved = localStorage.getItem('mancala_theme') as SkinTheme;
      return saved && saved in THEMES ? saved : 'walnut';
    } catch {
      return 'walnut';
    }
  });
  useEffect(() => {
    try { localStorage.setItem('mancala_theme', currentSkin); } catch {}
  }, [currentSkin]);

  const theme = THEMES[currentSkin];

  // Game modes: 'pve', 'pvp', 'ai_vs_ai', 'sandbox'
  const [gameMode, setGameMode] = useState<string>('pve');
  const [humanPlayer, setHumanPlayer] = useState<number>(0); // 0 = P1 (South), 1 = P2 (North)

  // Bot Personas State with localStorage persistence
  const [selectedBotId, setSelectedBotId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('mancala_bot_id');
      return saved && saved in BOT_PERSONAS ? saved : DEFAULT_BOT_ID;
    } catch {
      return DEFAULT_BOT_ID;
    }
  });
  useEffect(() => {
    try { localStorage.setItem('mancala_bot_id', selectedBotId); } catch {}
  }, [selectedBotId]);

  const activeBot = BOT_PERSONAS[selectedBotId] || BOT_PERSONAS[DEFAULT_BOT_ID];

  // Bot Speech Bubble State
  const [botDialogue, setBotDialogue] = useState<{ text: string; id: number } | null>(null);

  // Haptics State
  const [hapticsEnabled, setHapticsEnabled] = useState(() => haptics.enabled);
  const handleToggleHaptics = (enabled: boolean) => {
    haptics.setEnabled(enabled);
    setHapticsEnabled(enabled);
    if (enabled) haptics.tap();
  };

  // Game Review Modal State & Move Tracking
  const [gameReviewOpen, setGameReviewOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [gameMovesHistory, setGameMovesHistory] = useState<MoveRecord[]>([]);
  const [lastDecisiveTurn, setLastDecisiveTurn] = useState<{
    turnNumber: number;
    player: number;
    description: string;
  } | null>(null);

  const triggerBotDialogue = useCallback((event: BotReactionEvent, customText?: string) => {
    if (gameMode !== 'pve') return;
    const text = customText || getBotReaction(selectedBotId, event);
    const id = Date.now();
    setBotDialogue({ text, id });
    const timer = setTimeout(() => {
      setBotDialogue(prev => (prev?.id === id ? null : prev));
    }, 4500);
    return () => clearTimeout(timer);
  }, [selectedBotId, gameMode]);

  const handleSelectBot = (botId: string) => {
    haptics.tap();
    setSelectedBotId(botId);
    const bot = BOT_PERSONAS[botId];
    if (bot) {
      setSearchDepth(bot.depth);
      const startQuote = getBotReaction(botId, 'start');
      triggerBotDialogue('start', startQuote);
    }
  };
  
  // Coach & Evaluation Visibility Controls (Decoupled & Persisted!)
  const [tutorMode, setTutorMode] = useState(() => {
    try {
      const saved = localStorage.getItem('mancala_tutor_mode');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });
  useEffect(() => {
    try { localStorage.setItem('mancala_tutor_mode', String(tutorMode)); } catch {}
  }, [tutorMode]);

  const [showMoveHints, setShowMoveHints] = useState(() => {
    try {
      const saved = localStorage.getItem('mancala_show_hints');
      return saved !== null ? saved === 'true' : false;
    } catch {
      return false;
    }
  });
  useEffect(() => {
    try { localStorage.setItem('mancala_show_hints', String(showMoveHints)); } catch {}
  }, [showMoveHints]);

  const [evalBarCollapsed, setEvalBarCollapsed] = useState(false);
  const [coachSensitivity, setCoachSensitivity] = useState<'all' | 'blunders_only'>(() => {
    try {
      const saved = localStorage.getItem('mancala_coach_sensitivity');
      return saved === 'blunders_only' ? 'blunders_only' : 'all';
    } catch {
      return 'all';
    }
  });
  useEffect(() => {
    try { localStorage.setItem('mancala_coach_sensitivity', coachSensitivity); } catch {}
  }, [coachSensitivity]);

  const [isAiRunning, setIsAiRunning] = useState(false);
  const [aiSpeedMs, setAiSpeedMs] = useState(600);
  const [sowSpeed, setSowSpeed] = useState<'slow' | 'normal' | 'fast' | 'instant'>(() => {
    try {
      const saved = localStorage.getItem('mancala_sow_speed') as any;
      return (saved === 'slow' || saved === 'normal' || saved === 'fast' || saved === 'instant') ? saved : 'normal';
    } catch {
      return 'normal';
    }
  });
  useEffect(() => {
    try { localStorage.setItem('mancala_sow_speed', sowSpeed); } catch {}
  }, [sowSpeed]);
  const instantSpeed = sowSpeed === 'instant';

  // Sowing Animation & Move Tracking State
  const [animatingState, setAnimatingState] = useState<{
    sourcePit: number;
    currentPit: number | null;
    player: number;
    stonesInHand: number;
    initialStones: number;
    phase: 'lift' | 'sow' | 'capture' | 'free_turn' | 'complete';
    capturedPit: number | null;
    capturedStones: number;
    earnedFreeTurn: boolean;
  } | null>(null);
  const [visualBoard, setVisualBoard] = useState<number[] | null>(null);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [lastMoveSummary, setLastMoveSummary] = useState<{
    player: number;
    pit: number;
    initialStones: number;
    lastLanding: number;
    captured: number;
    capturedPit: number | null;
    freeTurn: boolean;
    isGameOver: boolean;
    winner: number | null;
  } | null>(null);
  const activeAnimationId = useRef(0);

  // Red Team Accessibility & Layout Features
  const [colorblindSafe, setColorblindSafe] = useState(() => {
    try {
      const saved = localStorage.getItem('mancala_colorblind_safe');
      return saved !== null ? saved === 'true' : false;
    } catch {
      return false;
    }
  });
  useEffect(() => {
    try { localStorage.setItem('mancala_colorblind_safe', String(colorblindSafe)); } catch {}
  }, [colorblindSafe]);
  const [mobileTab, setMobileTab] = useState<'board' | 'analysis' | 'settings'>('board');

  // Input debouncing & concurrency mutex lock
  const isMoveLocked = useRef(false);

  // Animation timing profiles - tuned for relaxed, comprehensible pacing
  const getSpeedDelays = (speed: 'slow' | 'normal' | 'fast' | 'instant') => {
    switch (speed) {
      case 'slow':
        // Extra gentle pacing for older players and complete beginners
        return { lift: 550, step: 340, capture: 650, freeTurn: 550, thinking: 1600 };
      case 'fast':
        return { lift: 180, step: 100, capture: 280, freeTurn: 220, thinking: 400 };
      case 'instant':
        return { lift: 0, step: 0, capture: 0, freeTurn: 0, thinking: 20 };
      case 'normal':
      default:
        // Relaxed, easy-to-follow default (1.2s thinking pause + deliberate 240ms drops)
        return { lift: 400, step: 240, capture: 500, freeTurn: 400, thinking: 1200 };
    }
  };

  const getPitDisplayName = (pitIndex: number): string => {
    if (pitIndex === P1_STORE) return 'South Store (P1)';
    if (pitIndex === P2_STORE) return 'North Store (P2)';
    if (pitIndex >= 0 && pitIndex <= 5) return `South Pit ${pitIndex + 1}`;
    if (pitIndex >= 7 && pitIndex <= 12) return `North Pit ${13 - pitIndex}`;
    return `Pit ${pitIndex}`;
  };

  // Analysis state
  const [analysisResults, setAnalysisResults] = useState<EvaluatedMove[]>([]);
  const [hoveredPit, setHoveredPit] = useState<number | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [tutorWarning, setTutorWarning] = useState<{
    pit: number;
    eval: EvaluatedMove;
    bestMove: EvaluatedMove;
    explanation: TacticalExplanation;
  } | null>(null);
  const [showCoachDetails, setShowCoachDetails] = useState(false);
  const [expandedAnalysisPit, setExpandedAnalysisPit] = useState<number | null>(null);

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

  const [soundEnabled, setSoundEnabled] = useState(() => {
    try {
      const saved = localStorage.getItem('mancala_sound_enabled');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });
  useEffect(() => {
    sounds.muted = !soundEnabled;
    try { localStorage.setItem('mancala_sound_enabled', String(soundEnabled)); } catch {}
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

  const executeMove = useCallback(async (pitIndex: number, force = false) => {
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
        const shouldWarn = coachSensitivity === 'blunders_only'
          ? moveEval?.classification === 'Blunder'
          : (moveEval?.classification === 'Mistake' || moveEval?.classification === 'Blunder');

        if (moveEval && shouldWarn && analysisResults[0]) {
          const explanation = generateTacticalExplanation(
            gameState.board,
            gameState.currentPlayer,
            moveEval,
            analysisResults[0],
            rules
          );
          setTutorWarning({
            pit: pitIndex,
            eval: moveEval,
            bestMove: analysisResults[0],
            explanation
          });
          setShowCoachDetails(false);
          haptics.blunder();
          triggerBotDialogue('player_blunder');
          isMoveLocked.current = false;
          return;
        }
      }

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

      const currentBoard = [...gameState.board];
      const player = gameState.currentPlayer;
      const initialStones = currentBoard[pitIndex];
      const result = simulateMove(currentBoard, player, pitIndex, rules);

      // Track move for Chess.com-style Game Review
      if (chosenEval) {
        const isBrilliant = chosenEval.equityLoss <= 0.02 && (chosenEval.captures >= 6 || (chosenEval.freeTurn && chosenEval.winProb >= 0.70));
        const classification: 'Brilliant' | 'Best' | 'Good' | 'Inaccuracy' | 'Mistake' | 'Blunder' = 
          isBrilliant ? 'Brilliant' : (chosenEval.classification === 'Excellent (Best)' ? 'Best' : chosenEval.classification);
        setGameMovesHistory(prev => [
          ...prev,
          {
            player,
            pit: pitIndex,
            freeTurn: result.earnedFreeTurn,
            captures: result.capturedStones,
            classification,
            equityLoss: chosenEval.equityLoss
          }
        ]);

        if (result.capturedStones >= 6) {
          setLastDecisiveTurn({
            turnNumber: gameState.moveHistory.length + 1,
            player,
            description: `${player === 0 ? 'South' : (gameMode === 'pve' ? activeBot.name : 'North')} executed a massive ${result.capturedStones}-pebble capture!`
          });
        } else if (chosenEval.classification === 'Blunder' && !lastDecisiveTurn) {
          setLastDecisiveTurn({
            turnNumber: gameState.moveHistory.length + 1,
            player,
            description: `Critical blunder by ${player === 0 ? 'South' : 'North'} conceded major win equity.`
          });
        }
      }

      const isInstant = sowSpeed === 'instant';

      if (isInstant) {
        sounds.playSow(initialStones);
        haptics.sowStep();

        if (result.capturedStones > 0) {
          sounds.playCapture();
          haptics.capture();
          if (player === 0) triggerBotDialogue('player_capture');
          else triggerBotDialogue('bot_capture');
        }

        if (result.earnedFreeTurn && !result.isGameOver) {
          sounds.playFreeTurn();
          haptics.freeTurn();
          if (player === 0) triggerBotDialogue('player_free_turn');
          else triggerBotDialogue('bot_free_turn');
        }

        if (result.isGameOver) {
          sounds.playGameOver();
          if (result.winner === 0) {
            haptics.victory();
            triggerBotDialogue('bot_loss');
          } else if (result.winner === 1) {
            triggerBotDialogue('bot_win');
          }
          setTimeout(() => setGameReviewOpen(true), 800);
        } else if (player === 1 && result.capturedStones === 0 && !result.earnedFreeTurn) {
          triggerBotDialogue('bot_move');
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

        setLastMoveSummary({
          player,
          pit: pitIndex,
          initialStones,
          lastLanding: result.lastLanding,
          captured: result.capturedStones,
          capturedPit: result.capturedFromPit,
          freeTurn: result.earnedFreeTurn,
          isGameOver: result.isGameOver,
          winner: result.winner
        });

        isMoveLocked.current = false;
        setTutorWarning(null);
        return;
      }

      // ANIMATED SOWING PIPELINE
      const animId = ++activeAnimationId.current;
      const delays = getSpeedDelays(sowSpeed);

      // Phase 1: Lift stones into hand
      haptics.tap();
      const intermediate = [...currentBoard];
      intermediate[pitIndex] = 0;
      setVisualBoard([...intermediate]);
      setAnimatingState({
        sourcePit: pitIndex,
        currentPit: pitIndex,
        player,
        stonesInHand: initialStones,
        initialStones,
        phase: 'lift',
        capturedPit: result.capturedFromPit,
        capturedStones: result.capturedStones,
        earnedFreeTurn: result.earnedFreeTurn
      });
      sounds.playSow(0);

      await new Promise(r => setTimeout(r, delays.lift));
      if (activeAnimationId.current !== animId) return;

      // Phase 2: Sowing stones step-by-step
      for (let i = 0; i < result.path.length; i++) {
        const target = result.path[i];
        intermediate[target]++;
        setVisualBoard([...intermediate]);
        setAnimatingState({
          sourcePit: pitIndex,
          currentPit: target,
          player,
          stonesInHand: initialStones - (i + 1),
          initialStones,
          phase: 'sow',
          capturedPit: result.capturedFromPit,
          capturedStones: result.capturedStones,
          earnedFreeTurn: result.earnedFreeTurn
        });
        sounds.playSow(i + 1);
        haptics.sowStep();

        await new Promise(r => setTimeout(r, delays.step));
        if (activeAnimationId.current !== animId) return;
      }

      // Phase 3: Resolution (Capture or Free Turn)
      if (result.capturedStones > 0) {
        setAnimatingState(prev => prev ? { ...prev, phase: 'capture', currentPit: result.lastLanding } : null);
        sounds.playCapture();
        haptics.capture();
        if (player === 0) triggerBotDialogue('player_capture');
        else triggerBotDialogue('bot_capture');

        await new Promise(r => setTimeout(r, delays.capture));
        if (activeAnimationId.current !== animId) return;

        intermediate[result.capturedFromPit!] = 0;
        intermediate[result.lastLanding] = 0;
        intermediate[player === 0 ? P1_STORE : P2_STORE] += result.capturedStones;
        setVisualBoard([...intermediate]);
        await new Promise(r => setTimeout(r, Math.round(delays.capture * 0.6)));
        if (activeAnimationId.current !== animId) return;
      } else if (result.earnedFreeTurn && !result.isGameOver) {
        setAnimatingState(prev => prev ? { ...prev, phase: 'free_turn', currentPit: player === 0 ? P1_STORE : P2_STORE } : null);
        sounds.playFreeTurn();
        haptics.freeTurn();
        if (player === 0) triggerBotDialogue('player_free_turn');
        else triggerBotDialogue('bot_free_turn');

        await new Promise(r => setTimeout(r, delays.freeTurn));
        if (activeAnimationId.current !== animId) return;
      }

      if (result.isGameOver) {
        sounds.playGameOver();
        if (result.winner === 0) {
          haptics.victory();
          triggerBotDialogue('bot_loss');
        } else if (result.winner === 1) {
          triggerBotDialogue('bot_win');
        }
        setTimeout(() => setGameReviewOpen(true), 800);
      } else if (player === 1 && result.capturedStones === 0 && !result.earnedFreeTurn) {
        triggerBotDialogue('bot_move');
      }

      if (result.earnedFreeTurn) {
        await new Promise(r => setTimeout(r, 220));
      }
      if (activeAnimationId.current !== animId) return;

      isMoveLocked.current = false;
      setVisualBoard(null);
      setAnimatingState(null);
      setTutorWarning(null);

      // Phase 4: Finalize game state cleanly
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

      setLastMoveSummary({
        player,
        pit: pitIndex,
        initialStones,
        lastLanding: result.lastLanding,
        captured: result.capturedStones,
        capturedPit: result.capturedFromPit,
        freeTurn: result.earnedFreeTurn,
        isGameOver: result.isGameOver,
        winner: result.winner
      });

    } catch (err) {
      console.error('Move execution error:', err);
      isMoveLocked.current = false;
      setAnimatingState(null);
      setVisualBoard(null);
    }
  }, [
    gameState.board,
    gameState.currentPlayer,
    gameState.isGameOver,
    tutorMode,
    coachSensitivity,
    gameMode,
    humanPlayer,
    analysisResults,
    rules,
    sowSpeed
  ]);

  // AI turn automation with deliberate thinking pause
  useEffect(() => {
    if (gameState.isGameOver) {
      setIsAiRunning(false);
      setIsAiThinking(false);
      return;
    }

    const isEngineTurn = 
      (gameMode === 'ai_vs_ai' && isAiRunning) || 
      (gameMode === 'pve' && gameState.currentPlayer !== humanPlayer);

    if (isEngineTurn && analysisResults.length > 0 && !isAnalyzing && !animatingState && !isMoveLocked.current) {
      setIsAiThinking(true);
      const delays = getSpeedDelays(sowSpeed);
      const thinkDelay = sowSpeed === 'instant' 
        ? 20 
        : (gameMode === 'ai_vs_ai' ? aiSpeedMs : delays.thinking);

      const timer = setTimeout(() => {
        setIsAiThinking(false);
        const topMove = analysisResults[0];
        if (topMove && !isMoveLocked.current) {
          executeMove(topMove.pit, true);
        }
      }, thinkDelay);

      return () => {
        clearTimeout(timer);
        setIsAiThinking(false);
      };
    }
  }, [
    gameState.currentPlayer, 
    gameState.isGameOver, 
    gameMode, 
    humanPlayer, 
    isAiRunning, 
    analysisResults, 
    isAnalyzing, 
    animatingState, 
    executeMove, 
    aiSpeedMs, 
    sowSpeed
  ]);

  const handleResetGame = () => {
    activeAnimationId.current++;
    setAnimatingState(null);
    setVisualBoard(null);
    setLastMoveSummary(null);
    setIsAiThinking(false);
    isMoveLocked.current = false;
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
    setGameMovesHistory([]);
    setLastDecisiveTurn(null);
    setGameReviewOpen(false);
    triggerBotDialogue('start');
  };

  const gameReviewData: GameReviewData = useMemo(() => {
    const p1Moves = gameMovesHistory.filter(m => m.player === 0);
    const p2Moves = gameMovesHistory.filter(m => m.player === 1);

    const calcAcc = (moves: MoveRecord[]) => {
      if (moves.length === 0) return 100;
      const totalLoss = moves.reduce((sum, m) => sum + (m.equityLoss || 0), 0);
      const avgLoss = totalLoss / moves.length;
      return Math.max(20, Math.min(100, Math.round(100 - avgLoss * 160)));
    };

    const p1Acc = calcAcc(p1Moves);
    const p2Acc = calcAcc(p2Moves);

    const bot = BOT_PERSONAS[selectedBotId] || BOT_PERSONAS[DEFAULT_BOT_ID];
    const p1Elo = Math.round(800 + (p1Acc / 100) * 850 + (bot.depth * 40));
    const p2Elo = Math.round(800 + (p2Acc / 100) * 850 + (bot.depth * 40));

    const countGrades = (moves: MoveRecord[]) => ({
      brilliant: moves.filter(m => m.classification === 'Brilliant').length,
      best: moves.filter(m => m.classification === 'Best').length,
      good: moves.filter(m => m.classification === 'Good').length,
      inaccuracy: moves.filter(m => m.classification === 'Inaccuracy').length,
      mistake: moves.filter(m => m.classification === 'Mistake').length,
      blunder: moves.filter(m => m.classification === 'Blunder').length,
    });

    return {
      winner: gameState.winner,
      p1Score: gameState.board[P1_STORE],
      p2Score: gameState.board[P2_STORE],
      p1Accuracy: p1Acc,
      p2Accuracy: p2Acc,
      p1Elo,
      p2Elo,
      p1Counts: countGrades(p1Moves),
      p2Counts: countGrades(p2Moves),
      totalMoves: gameMovesHistory.length,
      turningPoint: lastDecisiveTurn || undefined,
      bot: gameMode === 'pve' ? bot : undefined
    };
  }, [gameMovesHistory, gameState.winner, gameState.board, selectedBotId, gameMode, lastDecisiveTurn]);

  const handleSandboxPitAdjust = (pitIndex: number, delta: number) => {
    if (animatingState) return;
    setGameState(prev => {
      const newBoard = [...prev.board];
      newBoard[pitIndex] = Math.max(0, (newBoard[pitIndex] || 0) + delta);
      return { ...prev, board: newBoard };
    });
  };

  const displayBoard = visualBoard ?? gameState.board;

  const hoverPreview = useMemo(() => {
    if (animatingState || hoveredPit === null || displayBoard[hoveredPit] === 0) return null;
    const isP1 = gameState.currentPlayer === 0;
    const legalPits = isP1 ? P1_PITS : P2_PITS;
    if (!(legalPits as readonly number[]).includes(hoveredPit)) return null;

    const sim = simulateMove(gameState.board, gameState.currentPlayer, hoveredPit, rules);
    return sim;
  }, [animatingState, hoveredPit, displayBoard, gameState.board, gameState.currentPlayer, rules]);

  // Total stone sum for Zero-Leak DOM assertion (preserves exact 48 stones even mid-sowing)
  const totalBoardStones = useMemo(() => {
    if (visualBoard && animatingState) {
      return visualBoard.reduce((a, b) => a + b, 0) + animatingState.stonesInHand;
    }
    return gameState.board.reduce((a, b) => a + b, 0);
  }, [gameState.board, visualBoard, animatingState]);


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

  // Grounded Stone Advantage calculation (Player 1 / South perspective)
  // Positive = South advantage (+X.X stones), Negative = North advantage (+X.X stones)
  const currentStoneAdvantage = useMemo(() => {
    if (gameState.isGameOver) {
      return gameState.board[P1_STORE] - gameState.board[P2_STORE];
    }
    if (!analysisResults || analysisResults.length === 0) return 0;
    const top = analysisResults[0];
    const rawP1Score = gameState.currentPlayer === 0 ? top.score : -top.score;
    const stones = rawP1Score / 3.5;
    return Math.round(stones * 10) / 10;
  }, [gameState.isGameOver, gameState.board, gameState.currentPlayer, analysisResults]);

  // Balance bar fill percentage based on stone advantage (clamped between -10 and +10 stones)
  const p1BarRatio = useMemo(() => {
    const clamped = Math.max(-10, Math.min(10, currentStoneAdvantage));
    return 0.5 + (clamped / 20);
  }, [currentStoneAdvantage]);

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
    <div className={`flex flex-col min-h-screen ${theme.appBg} ${theme.appText} transition-colors duration-300 overflow-x-hidden w-full`}>
      
      {/* Refined Header - Strict Mobile Zero-Overflow */}
      <header className={`border-b ${theme.headerBorder} ${theme.headerBg} backdrop-blur-md sticky top-0 z-40 px-3 sm:px-6 py-2 transition-colors w-full overflow-hidden`}>
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-2">
          
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
                <span className={`text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded-full border ${
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

          {/* Theme Switcher, Rules & Fast Reset */}
          <div className="flex items-center space-x-1.5 shrink-0">
            
            {/* Skin Selector Pill */}
            <div className={`flex items-center rounded-xl p-0.5 border text-xs ${
              currentSkin === 'porcelain' ? 'bg-[#ede5d8] border-[#dbd0c0]' : 'bg-black/30 border-white/10'
            }`}>
              <button
                onClick={() => setCurrentSkin('walnut')}
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
                onClick={() => setCurrentSkin('porcelain')}
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
                onClick={() => setCurrentSkin('obsidian')}
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

            {/* Quick Reset Button */}
            <button
              onClick={handleResetGame}
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

      {/* Main Content Area - pb-20 guarantees clearance above sticky bottom bar */}
      <main className="max-w-5xl mx-auto w-full p-2.5 sm:p-5 pb-24 lg:pb-8 flex-1 flex flex-col gap-3 sm:gap-4 overflow-x-hidden">
        
        {/* Live Stone Advantage & Focus / Zen Mode Card */}
        <section 
          data-testid="eval-gauge"
          className={`${theme.cardBg} border ${theme.cardBorder} rounded-2xl sm:rounded-3xl p-2.5 sm:p-4 shadow-lg backdrop-blur-md transition-colors`}
        >
          {/* Header Row: Title & Collapse Button */}
          <div className="flex items-center justify-between pb-1.5 mb-1 border-b border-white/5">
            <div className="flex items-center space-x-2">
              <span className="text-[11px] font-bold tracking-tight opacity-75">
                Live Advantage (Stones)
              </span>
              {showMoveHints && (
                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  Hints Visible
                </span>
              )}
            </div>

            <button
              onClick={() => setEvalBarCollapsed(!evalBarCollapsed)}
              className={`flex items-center space-x-1 text-[11px] font-semibold px-2 py-0.5 rounded-lg transition ${theme.cardTextMuted} hover:opacity-100`}
              title={evalBarCollapsed ? "Expand advantage gauge" : "Collapse advantage gauge (Focus mode)"}
            >
              <span>{evalBarCollapsed ? "Show Bar" : "Focus"}</span>
              {evalBarCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
            </button>
          </div>

          {!evalBarCollapsed ? (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-6 pt-1">
              
              {/* Player 2 (North / Top) */}
              <div className="flex items-center justify-between sm:justify-start space-x-2.5 w-full sm:w-auto">
                <div className="flex items-center space-x-2">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center border text-base ${
                    gameState.currentPlayer === 1 && !gameState.isGameOver
                      ? 'ring-2 ring-emerald-500/60 bg-emerald-500/20 border-emerald-500 text-emerald-300'
                      : 'bg-black/10 border-white/10 opacity-70'
                  }`}>
                    <Bot className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div>
                    <div className={`text-[10px] font-semibold flex items-center gap-1 ${theme.cardTextMuted}`}>
                      <span>{gameMode === 'pve' ? 'Computer (Engine)' : 'North (P2)'}</span>
                      {gameMode === 'pve' && (
                        <span className="text-[8px] px-1.5 py-0.2 rounded-full bg-black/20 font-bold">
                          Depth {searchDepth}
                        </span>
                      )}
                    </div>
                    <div className={`text-xs sm:text-sm font-extrabold tracking-tight ${
                      currentStoneAdvantage < -0.2 ? 'text-emerald-400' : currentStoneAdvantage > 0.2 ? theme.cardTextMuted : ''
                    }`}>
                      {currentStoneAdvantage < -0.2 
                        ? `+${Math.abs(currentStoneAdvantage).toFixed(1)} stones` 
                        : currentStoneAdvantage > 0.2 
                        ? `-${currentStoneAdvantage.toFixed(1)}` 
                        : 'Even (±0.0)'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Broadcast-Style Smooth Balance Bar */}
              <div className="w-full flex-1 max-w-lg mx-auto flex flex-col gap-1">
                <div className="flex justify-between text-[10px] font-semibold">
                  <span className={currentSkin === 'porcelain' ? 'text-[#b85038]' : 'text-amber-400'}>
                    South: {Math.abs(currentStoneAdvantage) < 0.25 ? '±0.0' : currentStoneAdvantage > 0 ? `+${currentStoneAdvantage.toFixed(1)}` : currentStoneAdvantage.toFixed(1)}
                  </span>
                  <span className={`text-[9px] font-mono ${theme.cardTextMuted}`}>
                    {Math.abs(currentStoneAdvantage) < 0.25 ? 'Even Match' : currentStoneAdvantage > 0 ? 'South Ahead' : 'Computer Ahead'}
                  </span>
                  <span className={currentSkin === 'porcelain' ? 'text-[#3b6654]' : 'text-emerald-400'}>
                    North: {Math.abs(currentStoneAdvantage) < 0.25 ? '±0.0' : currentStoneAdvantage < 0 ? `+${Math.abs(currentStoneAdvantage).toFixed(1)}` : `-${currentStoneAdvantage.toFixed(1)}`}
                  </span>
                </div>

                <div className={`h-2.5 sm:h-3 rounded-full border ${theme.barBg} overflow-hidden flex shadow-inner relative`}>
                  <div 
                    className={`h-full transition-all duration-500 ease-out ${
                      colorblindSafe 
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-500' 
                        : theme.barP1
                    }`}
                    style={{ width: `${p1BarRatio * 100}%` }}
                  />
                  <div 
                    className={`h-full transition-all duration-500 ease-out ${
                      colorblindSafe 
                        ? 'bg-gradient-to-l from-orange-500 to-amber-500' 
                        : theme.barP2
                    }`}
                    style={{ width: `${(1 - p1BarRatio) * 100}%` }}
                  />
                  <div className={`absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-0.5 ${theme.barDivider}`} />
                </div>

                <div className={`flex justify-between text-[9px] font-mono ${theme.cardTextMuted}`}>
                  <span>PR: {calcPR(matchStats.p1TotalLoss, matchStats.p1Moves)} ({matchStats.p1Blunders} blunders)</span>
                  <span>PR: {calcPR(matchStats.p2TotalLoss, matchStats.p2Moves)} ({matchStats.p2Blunders} blunders)</span>
                </div>
              </div>

              {/* Player 1 (South / Bottom) */}
              <div className="flex items-center justify-between sm:justify-end space-x-2.5 w-full sm:w-auto">
                <div className="text-left sm:text-right">
                  <div className={`text-[10px] font-semibold flex items-center justify-start sm:justify-end gap-1 ${theme.cardTextMuted}`}>
                    {gameMode === 'pve' && humanPlayer === 0 && <span className="text-[8px] px-1 py-0.1 rounded-full bg-black/20 font-bold">You</span>}
                    <span>South (P1)</span>
                  </div>
                  <div className={`text-xs sm:text-sm font-extrabold tracking-tight ${
                    currentStoneAdvantage > 0.25 ? 'text-amber-400' : currentStoneAdvantage < -0.25 ? theme.cardTextMuted : ''
                  }`}>
                    {currentStoneAdvantage > 0.25 
                      ? `+${currentStoneAdvantage.toFixed(1)} stones` 
                      : currentStoneAdvantage < -0.25 
                      ? `${currentStoneAdvantage.toFixed(1)}` 
                      : 'Even (±0.0)'}
                  </div>
                </div>
                <div className={`w-7 h-7 rounded-xl flex items-center justify-center border ${
                  gameState.currentPlayer === 0 && !gameState.isGameOver
                    ? 'ring-2 ring-amber-500/60 bg-amber-500/20 border-amber-500 text-amber-300'
                    : 'bg-black/10 border-white/10 opacity-70'
                }`}>
                  <User className="w-3.5 h-3.5" />
                </div>
              </div>

            </div>
          ) : (
            /* Collapsed Zen Mode Ribbon */
            <div className="flex items-center justify-between text-xs py-0.5">
              <span className={currentSkin === 'porcelain' ? 'text-[#b85038] font-bold' : 'text-amber-400 font-bold'}>
                South: {Math.abs(currentStoneAdvantage) < 0.25 ? 'Even (±0.0)' : currentStoneAdvantage > 0 ? `+${currentStoneAdvantage.toFixed(1)}` : currentStoneAdvantage.toFixed(1)}
              </span>
              <span className={`text-[10px] font-mono ${theme.cardTextMuted}`}>
                PR: {calcPR(matchStats.p1TotalLoss, matchStats.p1Moves)}
              </span>
              <span className={currentSkin === 'porcelain' ? 'text-[#3b6654] font-bold' : 'text-emerald-400 font-bold'}>
                North: {Math.abs(currentStoneAdvantage) < 0.25 ? 'Even (±0.0)' : currentStoneAdvantage < 0 ? `+${Math.abs(currentStoneAdvantage).toFixed(1)}` : `-${currentStoneAdvantage.toFixed(1)}`}
              </span>
            </div>
          )}
        </section>

        {/* Board View Tab */}
        <section className={`${mobileTab !== 'board' ? 'hidden lg:block' : ''}`}>

          {/* Status Ribbon: Turn, Conservation Invariant, Trajectory Preview */}
          <div className="mb-2 sm:mb-2.5 flex flex-wrap items-center justify-between gap-1.5 px-1">
            <div className="flex items-center flex-wrap gap-1.5">
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

              {/* Quick 1-Tap Move Hints Toggle */}
              <button
                onClick={() => {
                  haptics.tap();
                  setShowMoveHints(!showMoveHints);
                }}
                data-testid="ribbon-hints-btn"
                title={showMoveHints ? "Move hints are visible on board pits" : "Move hints hidden"}
                className={`px-2.5 py-1 rounded-full text-xs font-semibold border flex items-center gap-1 transition ${
                  showMoveHints 
                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 font-bold' 
                    : `${theme.cardTextMuted} border-white/10 hover:border-white/20`
                }`}
              >
                {showMoveHints ? <Eye className="w-3.5 h-3.5 text-amber-400" /> : <EyeOff className="w-3.5 h-3.5" />}
                <span>{showMoveHints ? "Hints On" : "Hints"}</span>
              </button>

              {gameState.moveHistory.length > 0 && gameState.moveHistory[gameState.moveHistory.length - 1].freeTurn && (
                <span className="flex items-center space-x-1 text-xs font-bold text-emerald-400 bg-emerald-950/70 border border-emerald-600/50 px-2.5 py-1 rounded-full animate-bounce">
                  <Zap className="w-3 h-3 text-emerald-300" />
                  <span>Free Turn!</span>
                </span>
              )}

              {hoverPreview && (
                <span className={`text-[10px] sm:text-[11px] flex items-center space-x-1 ${theme.cardTextMuted}`}>
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
              <div className="flex items-center gap-2 flex-wrap">
                <div 
                  data-testid="game-over-banner"
                  className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-500 text-slate-950 text-xs font-extrabold shadow-md animate-pulse"
                >
                  <Award className="w-3.5 h-3.5" />
                  <span>
                    {gameState.winner === -1 
                      ? "Game Ended in a Draw!" 
                      : `${gameState.winner === 0 ? 'South (You)' : (gameMode === 'pve' ? activeBot.name : 'North')} Wins (${gameState.board[P1_STORE]} - ${gameState.board[P2_STORE]})!`}
                  </span>
                </div>
                <button
                  data-testid="game-over-review-btn"
                  onClick={() => {
                    haptics.tap();
                    setGameReviewOpen(true);
                  }}
                  className="flex items-center space-x-1 px-3 py-1 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md transition active:scale-95"
                >
                  <Trophy className="w-3.5 h-3.5" />
                  <span>Review Match 🏆</span>
                </button>
              </div>
            )}
          </div>

          {/* Move Announcement & Live Action Banner */}
          <div className={`mb-2.5 p-2.5 sm:p-3 rounded-2xl border transition-all duration-300 flex flex-col sm:flex-row items-center justify-between gap-2 shadow-sm ${
            animatingState
              ? animatingState.phase === 'capture'
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                : animatingState.phase === 'free_turn'
                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                : currentSkin === 'porcelain'
                ? 'bg-[#ede5d8] border-[#dbd0c0] text-[#2c2723]'
                : 'bg-white/10 border-white/20 text-white'
              : isAiThinking
              ? currentSkin === 'porcelain'
                ? 'bg-sky-100 border-sky-300 text-sky-900'
                : 'bg-sky-500/15 border-sky-500/30 text-sky-200'
              : lastMoveSummary
              ? currentSkin === 'porcelain'
                ? 'bg-[#f4efe6] border-[#e2d9cb] text-[#2c2723]'
                : 'bg-black/30 border-white/10 text-slate-200'
              : currentSkin === 'porcelain'
              ? 'bg-[#f4efe6] border-[#e2d9cb] text-[#7d7368]'
              : 'bg-black/20 border-white/5 text-slate-400'
          }`}>
            {/* Left: Move Description / Animation Live Feed */}
            <div className="flex items-center space-x-2.5 w-full sm:w-auto">
              <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 border ${
                animatingState
                  ? animatingState.player === 0
                    ? 'bg-amber-500/20 border-amber-500 text-amber-300 animate-pulse'
                    : 'bg-emerald-500/20 border-emerald-500 text-emerald-300 animate-pulse'
                  : isAiThinking
                  ? 'bg-sky-500/20 border-sky-500 text-sky-300 animate-pulse'
                  : lastMoveSummary
                  ? lastMoveSummary.player === 0
                    ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                    : 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                  : 'bg-black/10 border-white/10 opacity-70'
              }`}>
                {isAiThinking ? (
                  <Bot className="w-3.5 h-3.5 animate-bounce" />
                ) : animatingState ? (
                  animatingState.player === 0 ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />
                ) : lastMoveSummary ? (
                  lastMoveSummary.player === 0 ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                {animatingState ? (
                  <div className="flex flex-col">
                    <div className="text-xs font-bold flex items-center gap-1.5 flex-wrap">
                      <span className={animatingState.player === 0 ? 'text-amber-400' : 'text-emerald-400'}>
                        {animatingState.player === 0 ? (gameMode === 'pve' && humanPlayer === 0 ? 'You' : 'South') : (gameMode === 'pve' && humanPlayer === 0 ? 'Computer' : 'North')}
                      </span>
                      <span className="font-normal opacity-90">
                        {animatingState.phase === 'lift' && `picked up ${animatingState.initialStones} stones from ${getPitDisplayName(animatingState.sourcePit)}`}
                        {animatingState.phase === 'sow' && `sowing → ${getPitDisplayName(animatingState.currentPit!)}`}
                        {animatingState.phase === 'capture' && `captured ${animatingState.capturedStones} stones!`}
                        {animatingState.phase === 'free_turn' && `landed in store — bonus turn!`}
                      </span>
                    </div>
                    <div className="text-[10px] font-mono opacity-80 flex items-center gap-2">
                      <span className="font-bold text-amber-300">In Hand: {animatingState.stonesInHand}</span>
                      {animatingState.phase === 'sow' && (
                        <span className="animate-pulse opacity-75">● Sowing around board...</span>
                      )}
                    </div>
                  </div>
                ) : isAiThinking ? (
                  <div className="flex flex-col">
                    <div className="text-xs font-bold flex items-center gap-1.5">
                      <span>Computer is calculating...</span>
                      <span className="text-[10px] font-mono opacity-70">(Depth {searchDepth})</span>
                    </div>
                    <div className="text-[10px] opacity-70">Evaluating optimal pit and rollout minimax...</div>
                  </div>
                ) : lastMoveSummary ? (
                  <div className="flex flex-col">
                    <div className="text-xs font-bold flex items-center gap-1.5 flex-wrap">
                      <span className={lastMoveSummary.player === 0 ? 'text-amber-400 font-extrabold' : 'text-emerald-400 font-extrabold'}>
                        {lastMoveSummary.player === 0 ? (gameMode === 'pve' && humanPlayer === 0 ? 'You' : 'South') : (gameMode === 'pve' && humanPlayer === 0 ? 'Computer' : 'North')}
                      </span>
                      <span>played {getPitDisplayName(lastMoveSummary.pit)}</span>
                      <span className="text-[10px] font-mono font-normal opacity-80">({lastMoveSummary.initialStones} stones)</span>
                      {lastMoveSummary.freeTurn && (
                        <span className="px-1.5 py-0.2 rounded-full text-[9px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse">
                          ⚡ Free Turn
                        </span>
                      )}
                      {lastMoveSummary.captured > 0 && (
                        <span className="px-1.5 py-0.2 rounded-full text-[9px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                          💥 +{lastMoveSummary.captured} Captured
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] opacity-70 truncate">
                      Last landed in {getPitDisplayName(lastMoveSummary.lastLanding)}
                      {gameState.isGameOver ? ' • Game ended' : ` • ${gameState.currentPlayer === 0 ? (gameMode === 'pve' && humanPlayer === 0 ? 'Your' : "South's") : (gameMode === 'pve' && humanPlayer === 0 ? "Computer's" : "North's")} turn`}
                    </div>
                  </div>
                ) : (
                  <div className="text-xs font-medium opacity-80">
                    {gameMode === 'pve' && gameState.currentPlayer === humanPlayer
                      ? "Your turn — pick a pit from your side (South P1–P6)"
                      : "Game started — pick a pit to begin"}
                  </div>
                )}
              </div>
            </div>

            {/* Right: Quick Sowing Speed Selector */}
            <div className="flex items-center space-x-1 shrink-0 self-end sm:self-center">
              <span className="text-[9px] font-bold uppercase tracking-wider opacity-60 mr-1 hidden xs:inline">Speed:</span>
              {(['slow', 'normal', 'fast', 'instant'] as const).map(speed => (
                <button
                  key={speed}
                  onClick={() => setSowSpeed(speed)}
                  title={`${speed.charAt(0).toUpperCase() + speed.slice(1)} sowing speed`}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-bold capitalize transition ${
                    sowSpeed === speed
                      ? currentSkin === 'porcelain'
                        ? 'bg-[#2c2723] text-white shadow-xs'
                        : 'bg-white/20 text-white border border-white/30 shadow-xs'
                      : currentSkin === 'porcelain'
                      ? 'text-[#7d7368] hover:text-[#2c2723]'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {speed}
                </button>
              ))}
            </div>
          </div>

          {/* Carved Physical Board Frame */}
          <div className={`relative ${theme.boardBg} border-2 ${theme.boardBorder} rounded-2xl sm:rounded-3xl p-1.5 sm:p-4 shadow-2xl transition-colors duration-300`}>
            
            {/* Inlay Trim */}
            <div className={`absolute inset-1 sm:inset-2 border ${theme.boardTrim} rounded-xl sm:rounded-2xl pointer-events-none`} />

            <div className="relative flex items-center justify-between gap-1.5 sm:gap-3">
              
              {/* Left Store: Player 2 (North) */}
              <div 
                data-testid="store-13"
                title="Player 2 Kalah Store"
                className={`w-11 sm:w-24 h-56 sm:h-80 rounded-2xl sm:rounded-3xl border flex flex-col items-center justify-between p-1 sm:p-3 select-none shrink-0 transition-all duration-200 ${theme.storeBg} ${theme.storeBorder} ${theme.pitShadowClass} ${
                  animatingState?.currentPit === P2_STORE && animatingState.phase === 'sow'
                    ? 'ring-2 ring-emerald-400 bg-emerald-950/70 scale-[1.03] shadow-[0_0_24px_rgba(52,211,153,0.7)] animate-drop-ripple'
                    : animatingState?.phase === 'capture' && animatingState.player === 1
                    ? 'ring-2 ring-amber-400 bg-amber-950/70 scale-[1.03] shadow-[0_0_24px_rgba(251,191,36,0.7)] animate-pulse'
                    : hoverPreview?.lastLanding === P2_STORE 
                    ? theme.landingGlow 
                    : hoverPreview?.path?.includes(P2_STORE)
                      ? theme.pathGlow
                      : ''
                }`}
              >
                <div className={`text-[9px] sm:text-xs font-bold uppercase tracking-wider ${theme.storeP2Text}`}>
                  P2
                </div>

                <div className="flex-1 flex items-center justify-center w-full px-0.5">
                  <PebbleCluster count={displayBoard[P2_STORE]} theme={currentSkin} player="p2" maxVisible={14} />
                </div>

                <div className={`text-base sm:text-2xl font-black font-mono ${theme.storeP2Text}`}>
                  {displayBoard[P2_STORE]}
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
                    const stones = displayBoard[pitIndex];
                    const isLegal = gameState.currentPlayer === 1 && stones > 0 && !gameState.isGameOver && !animatingState && !isMoveLocked.current;
                    const evalData = analysisResults.find(m => m.pit === pitIndex);

                    const isSource = animatingState?.sourcePit === pitIndex;
                    const isCurrentlySown = animatingState?.currentPit === pitIndex && animatingState.phase === 'sow';
                    const isCaptured = animatingState?.capturedPit === pitIndex;
                    const isLastMoveSource = !animatingState && gameState.lastMovedPit === pitIndex;

                    const isHighlightedPath = !animatingState && hoverPreview?.path?.includes(pitIndex);
                    const isLanding = !animatingState && hoverPreview?.lastLanding === pitIndex;

                    const isTutorChosen = tutorWarning?.pit === pitIndex;
                    const isTutorBest = tutorWarning?.bestMove.pit === pitIndex;
                    const isTutorThreat = tutorWarning?.explanation.opponentThreatPit === pitIndex;
                    const isTutorVulnerable = tutorWarning?.explanation.vulnerablePit === pitIndex;

                    return (
                      <button
                        key={pitIndex}
                        data-testid={`pit-${pitIndex}`}
                        onClick={() => {
                          if (gameMode === 'sandbox') handleSandboxPitAdjust(pitIndex, 1);
                          else if (isLegal) executeMove(pitIndex);
                        }}
                        onMouseEnter={() => !animatingState && setHoveredPit(pitIndex)}
                        onMouseLeave={() => setHoveredPit(null)}
                        className={`relative flex flex-col items-center justify-between p-1 sm:p-2 rounded-xl sm:rounded-2xl transition-all duration-150 select-none min-h-[50px] min-w-[44px] touch-manipulation border ${theme.pitBg} ${theme.pitBorder} ${theme.pitShadowClass} ${
                          isLegal ? `cursor-pointer ${theme.pitHoverBorder} hover:scale-[1.02] active:scale-95` : 'cursor-default opacity-85'
                        } ${
                          isTutorChosen
                            ? 'ring-2 ring-rose-500 bg-rose-500/20 shadow-[0_0_18px_rgba(244,63,94,0.5)]'
                            : isTutorBest
                              ? 'ring-2 ring-emerald-400 bg-emerald-500/20 shadow-[0_0_20px_rgba(52,211,153,0.6)] animate-pulse'
                              : isTutorThreat
                                ? 'ring-2 ring-dashed ring-amber-400 bg-amber-500/15 shadow-[0_0_16px_rgba(251,191,36,0.4)]'
                                : isTutorVulnerable
                                  ? 'ring-2 ring-dotted ring-rose-400 bg-rose-500/15 shadow-[0_0_14px_rgba(244,63,94,0.3)]'
                                  : isSource 
                                    ? 'ring-2 ring-amber-400 bg-amber-500/20 shadow-[0_0_18px_rgba(251,191,36,0.5)]'
                                    : isCurrentlySown 
                                      ? 'ring-2 ring-emerald-400 bg-emerald-500/20 scale-[1.04] shadow-[0_0_22px_rgba(52,211,153,0.6)] animate-drop-ripple'
                                      : isCaptured 
                                        ? 'ring-2 ring-rose-500 bg-rose-950/40 shadow-[0_0_20px_rgba(244,63,94,0.6)] animate-pulse'
                                        : isLastMoveSource 
                                          ? 'ring-1 ring-white/30 border-white/40'
                                          : isLanding 
                                            ? theme.landingGlow 
                                            : isHighlightedPath 
                                              ? theme.pathGlow 
                                              : ''
                        } h-24 sm:h-36`}
                      >
                        {/* Pit Label & State Badges */}
                        <div className={`flex items-center justify-between w-full text-[8px] sm:text-[10px] font-mono ${theme.cardTextMuted}`}>
                          <div className="flex items-center space-x-1 flex-wrap">
                            <span>P{13 - pitIndex}</span>
                            {isTutorChosen && (
                              <span className="text-[7px] font-extrabold px-1 py-0.2 rounded bg-rose-500/30 text-rose-300 border border-rose-500/50">
                                YOUR PICK
                              </span>
                            )}
                            {isTutorBest && (
                              <span className="text-[7px] font-extrabold px-1 py-0.2 rounded bg-emerald-500/30 text-emerald-300 border border-emerald-500/50 animate-pulse">
                                COACH'S PICK
                              </span>
                            )}
                            {isTutorThreat && (
                              <span className="text-[7px] font-extrabold px-1 py-0.2 rounded bg-amber-500/30 text-amber-300 border border-dashed border-amber-500/50">
                                THREAT
                              </span>
                            )}
                            {isTutorVulnerable && (
                              <span className="text-[7px] font-extrabold px-1 py-0.2 rounded bg-rose-500/30 text-rose-300 border border-dotted border-rose-500/50">
                                VULN
                              </span>
                            )}
                            {isLastMoveSource && !tutorWarning && (
                              <span className="text-[7px] font-extrabold px-1 py-0.2 rounded bg-white/20 text-white" title="Last move played">
                                LAST
                              </span>
                            )}
                            {isSource && (
                              <span className="text-[7px] font-extrabold px-1 py-0.2 rounded bg-amber-500/30 text-amber-300 border border-amber-500/50">
                                PICK
                              </span>
                            )}
                            {isCurrentlySown && (
                              <span className="text-[7px] font-extrabold px-1 py-0.2 rounded bg-emerald-500/30 text-emerald-300 border border-emerald-500/50 animate-bounce">
                                DROP
                              </span>
                            )}
                            {isCaptured && (
                              <span className="text-[7px] font-extrabold px-1 py-0.2 rounded bg-rose-500/30 text-rose-300 border border-rose-500/50">
                                CAPT
                              </span>
                            )}
                          </div>

                          {/* ONLY RENDER EVAL BADGE IF SHOWMOVEHINTS IS TRUE */}
                          {showMoveHints && evalData && (
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
                    const stones = displayBoard[pitIndex];
                    const isLegal = gameState.currentPlayer === 0 && stones > 0 && !gameState.isGameOver && !animatingState && !isMoveLocked.current;
                    const evalData = analysisResults.find(m => m.pit === pitIndex);

                    const isSource = animatingState?.sourcePit === pitIndex;
                    const isCurrentlySown = animatingState?.currentPit === pitIndex && animatingState.phase === 'sow';
                    const isCaptured = animatingState?.capturedPit === pitIndex;
                    const isLastMoveSource = !animatingState && gameState.lastMovedPit === pitIndex;

                    const isHighlightedPath = !animatingState && hoverPreview?.path?.includes(pitIndex);
                    const isLanding = !animatingState && hoverPreview?.lastLanding === pitIndex;

                    const isTutorChosen = tutorWarning?.pit === pitIndex;
                    const isTutorBest = tutorWarning?.bestMove.pit === pitIndex;
                    const isTutorThreat = tutorWarning?.explanation.opponentThreatPit === pitIndex;
                    const isTutorVulnerable = tutorWarning?.explanation.vulnerablePit === pitIndex;

                    return (
                      <button
                        key={pitIndex}
                        data-testid={`pit-${pitIndex}`}
                        onClick={() => {
                          if (gameMode === 'sandbox') handleSandboxPitAdjust(pitIndex, 1);
                          else if (isLegal) executeMove(pitIndex);
                        }}
                        onMouseEnter={() => !animatingState && setHoveredPit(pitIndex)}
                        onMouseLeave={() => setHoveredPit(null)}
                        className={`relative flex flex-col items-center justify-between p-1 sm:p-2 rounded-xl sm:rounded-2xl transition-all duration-150 select-none min-h-[50px] min-w-[44px] touch-manipulation border ${theme.pitBg} ${theme.pitBorder} ${theme.pitShadowClass} ${
                          isLegal ? `cursor-pointer ${theme.pitHoverBorder} hover:scale-[1.02] active:scale-95` : 'cursor-default opacity-85'
                        } ${
                          isTutorChosen
                            ? 'ring-2 ring-rose-500 bg-rose-500/20 shadow-[0_0_18px_rgba(244,63,94,0.5)]'
                            : isTutorBest
                              ? 'ring-2 ring-emerald-400 bg-emerald-500/20 shadow-[0_0_20px_rgba(52,211,153,0.6)] animate-pulse'
                              : isTutorThreat
                                ? 'ring-2 ring-dashed ring-amber-400 bg-amber-500/15 shadow-[0_0_16px_rgba(251,191,36,0.4)]'
                                : isTutorVulnerable
                                  ? 'ring-2 ring-dotted ring-rose-400 bg-rose-500/15 shadow-[0_0_14px_rgba(244,63,94,0.3)]'
                                  : isSource 
                                    ? 'ring-2 ring-amber-400 bg-amber-500/20 shadow-[0_0_18px_rgba(251,191,36,0.5)]'
                                    : isCurrentlySown 
                                      ? 'ring-2 ring-emerald-400 bg-emerald-500/20 scale-[1.04] shadow-[0_0_22px_rgba(52,211,153,0.6)] animate-drop-ripple'
                                      : isCaptured 
                                        ? 'ring-2 ring-rose-500 bg-rose-950/40 shadow-[0_0_20px_rgba(244,63,94,0.6)] animate-pulse'
                                        : isLastMoveSource 
                                          ? 'ring-1 ring-white/30 border-white/40'
                                          : isLanding 
                                            ? theme.landingGlow 
                                            : isHighlightedPath 
                                              ? theme.pathGlow 
                                              : ''
                        } h-24 sm:h-36`}
                      >
                        <div className={`flex items-center justify-between w-full text-[8px] sm:text-[10px] font-mono ${theme.cardTextMuted}`}>
                          <div className="flex items-center space-x-1 flex-wrap">
                            <span>P{pitIndex + 1}</span>
                            {isTutorChosen && (
                              <span className="text-[7px] font-extrabold px-1 py-0.2 rounded bg-rose-500/30 text-rose-300 border border-rose-500/50">
                                YOUR PICK
                              </span>
                            )}
                            {isTutorBest && (
                              <span className="text-[7px] font-extrabold px-1 py-0.2 rounded bg-emerald-500/30 text-emerald-300 border border-emerald-500/50 animate-pulse">
                                COACH'S PICK
                              </span>
                            )}
                            {isTutorThreat && (
                              <span className="text-[7px] font-extrabold px-1 py-0.2 rounded bg-amber-500/30 text-amber-300 border border-dashed border-amber-500/50">
                                THREAT
                              </span>
                            )}
                            {isTutorVulnerable && (
                              <span className="text-[7px] font-extrabold px-1 py-0.2 rounded bg-rose-500/30 text-rose-300 border border-dotted border-rose-500/50">
                                VULN
                              </span>
                            )}
                            {isLastMoveSource && !tutorWarning && (
                              <span className="text-[7px] font-extrabold px-1 py-0.2 rounded bg-white/20 text-white" title="Last move played">
                                LAST
                              </span>
                            )}
                            {isSource && (
                              <span className="text-[7px] font-extrabold px-1 py-0.2 rounded bg-amber-500/30 text-amber-300 border border-amber-500/50">
                                PICK
                              </span>
                            )}
                            {isCurrentlySown && (
                              <span className="text-[7px] font-extrabold px-1 py-0.2 rounded bg-emerald-500/30 text-emerald-300 border border-emerald-500/50 animate-bounce">
                                DROP
                              </span>
                            )}
                            {isCaptured && (
                              <span className="text-[7px] font-extrabold px-1 py-0.2 rounded bg-rose-500/30 text-rose-300 border border-rose-500/50">
                                CAPT
                              </span>
                            )}
                          </div>

                          {/* ONLY RENDER EVAL BADGE IF SHOWMOVEHINTS IS TRUE */}
                          {showMoveHints && evalData && (
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
                className={`w-11 sm:w-24 h-56 sm:h-80 rounded-2xl sm:rounded-3xl border flex flex-col items-center justify-between p-1 sm:p-3 select-none shrink-0 transition-all duration-200 ${theme.storeBg} ${theme.storeBorder} ${theme.pitShadowClass} ${
                  animatingState?.currentPit === P1_STORE && animatingState.phase === 'sow'
                    ? 'ring-2 ring-amber-400 bg-amber-950/70 scale-[1.03] shadow-[0_0_24px_rgba(251,191,36,0.7)] animate-drop-ripple'
                    : animatingState?.phase === 'capture' && animatingState.player === 0
                    ? 'ring-2 ring-amber-400 bg-amber-950/70 scale-[1.03] shadow-[0_0_24px_rgba(251,191,36,0.7)] animate-pulse'
                    : hoverPreview?.lastLanding === P1_STORE 
                    ? theme.landingGlow 
                    : hoverPreview?.path?.includes(P1_STORE)
                      ? theme.pathGlow
                      : ''
                }`}
              >
                <div className={`text-[9px] sm:text-xs font-bold uppercase tracking-wider ${theme.storeP1Text}`}>
                  P1
                </div>

                <div className="flex-1 flex items-center justify-center w-full px-0.5">
                  <PebbleCluster count={displayBoard[P1_STORE]} theme={currentSkin} player="p1" maxVisible={14} />
                </div>

                <div className={`text-base sm:text-2xl font-black font-mono ${theme.storeP1Text}`}>
                  {displayBoard[P1_STORE]}
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

        {/* Coach Suggestion Card (Tutor Mode Warning Interception) */}
        {/* Coach Suggestion Card (Tutor Mode Warning Interception) */}
        {tutorWarning && (
          <div 
            data-testid="tutor-modal"
            className={`p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border-2 flex flex-col gap-3.5 shadow-2xl backdrop-blur-md animate-in fade-in duration-200 transition-all ${
              currentSkin === 'porcelain'
                ? 'bg-[#fff5ea] border-[#f0c08a] text-[#5c3a1a]'
                : tutorWarning.eval.classification === 'Blunder'
                  ? 'bg-rose-950/90 border-rose-500/70 text-rose-100 shadow-[0_0_30px_rgba(244,63,94,0.25)]'
                  : 'bg-amber-950/90 border-amber-500/70 text-amber-100 shadow-[0_0_30px_rgba(251,191,36,0.25)]'
            }`}
          >
            {/* Header row: Coach Badge, Warning Type, & Actions */}
            <div className="flex items-center justify-between gap-2.5 flex-wrap">
              <div className="flex items-center space-x-2.5">
                <div className={`p-2 rounded-xl ${
                  tutorWarning.eval.classification === 'Blunder'
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                }`}>
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm font-extrabold tracking-wide uppercase">
                      Coach Advisory
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border flex items-center gap-1 ${
                      tutorWarning.eval.classification === 'Blunder'
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                        : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    }`}>
                      {tutorWarning.eval.classification === 'Blunder' ? (
                        <ShieldAlert className="w-3 h-3" />
                      ) : (
                        <AlertTriangle className="w-3 h-3" />
                      )}
                      <span>{tutorWarning.eval.classification} Alert</span>
                    </span>
                  </div>
                  <div className="text-[11px] opacity-80 font-mono mt-0.5">
                    Sacrifices <strong className="underline font-bold text-rose-300">{(tutorWarning.eval.equityLoss * 100).toFixed(1)}%</strong> win equity compared to <strong>{tutorWarning.bestMove.label}</strong>
                  </div>
                </div>
              </div>

              {/* Action Buttons for Mobile/Desktop */}
              <div className="flex items-center gap-2 ml-auto shrink-0 w-full sm:w-auto justify-end pt-1 sm:pt-0">
                <button
                  data-testid="tutor-reconsider"
                  onClick={() => setTutorWarning(null)}
                  className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-xl text-xs font-semibold transition border ${
                    currentSkin === 'porcelain'
                      ? 'bg-[#ded5c6] text-[#342e29] border-[#cfc4b4] hover:bg-[#cfc4b4]'
                      : 'bg-white/10 text-slate-200 border-white/15 hover:bg-white/20'
                  }`}
                >
                  Take Back
                </button>
                <button
                  data-testid="tutor-play-best"
                  onClick={() => executeMove(tutorWarning.bestMove.pit, true)}
                  className="flex-1 sm:flex-none px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md transition flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Play {tutorWarning.bestMove.label}</span>
                </button>
                <button
                  data-testid="tutor-confirm"
                  onClick={() => executeMove(tutorWarning.pit, true)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium opacity-80 hover:opacity-100 transition border ${
                    currentSkin === 'porcelain'
                      ? 'border-[#d0b898] text-[#704d2a] hover:bg-amber-100/50'
                      : 'border-white/20 text-slate-300 hover:bg-white/5'
                  }`}
                  title="Ignore Coach and play your pick"
                >
                  Confirm Anyway
                </button>
              </div>
            </div>

            {/* Natural Language Summary Banner */}
            <div className={`p-2.5 sm:p-3 rounded-xl border text-xs sm:text-[13px] leading-relaxed flex items-start gap-2.5 ${
              currentSkin === 'porcelain'
                ? 'bg-white/70 border-[#f0c08a]/60 text-[#4c3116]'
                : 'bg-black/30 border-white/10 text-slate-100'
            }`}>
              <Bot className="w-4 h-4 mt-0.5 text-amber-400 shrink-0" />
              <div className="flex-1">
                <span className="font-semibold">{tutorWarning.explanation.summary}</span>
              </div>
            </div>

            {/* "Why?" Toggle Button */}
            <div className="flex items-center justify-between border-t border-white/10 pt-2">
              <button
                type="button"
                onClick={() => setShowCoachDetails(prev => !prev)}
                className={`text-xs font-bold flex items-center gap-1.5 py-1 px-2.5 rounded-lg transition ${
                  currentSkin === 'porcelain'
                    ? 'hover:bg-amber-200/50 text-[#5c3a1a]'
                    : 'hover:bg-white/10 text-amber-300'
                }`}
              >
                <span>{showCoachDetails ? "Hide Tactical Breakdown" : "Why is this a bad move? (Tactical Breakdown)"}</span>
                {showCoachDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              <span className="text-[10px] opacity-70 font-mono hidden sm:inline">
                Highlighted pits on board reveal opponent threats
              </span>
            </div>

            {/* Expandable Tactical Breakdown Card */}
            {showCoachDetails && (
              <div className={`grid grid-cols-1 md:grid-cols-3 gap-2.5 sm:gap-3 p-3 rounded-xl border animate-in fade-in duration-150 ${
                currentSkin === 'porcelain'
                  ? 'bg-[#faf2e6] border-[#e8d2b8]'
                  : 'bg-black/40 border-white/10'
              }`}>
                {/* 1. Consequence */}
                <div className="flex flex-col gap-1 p-2 rounded-lg bg-rose-500/10 border border-rose-500/20">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-rose-400 uppercase tracking-wide">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>1. Immediate Consequence</span>
                  </div>
                  <p className="text-[11px] sm:text-xs leading-relaxed opacity-90">
                    {tutorWarning.explanation.consequence}
                  </p>
                </div>

                {/* 2. Opponent Threat */}
                <div className="flex flex-col gap-1 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-400 uppercase tracking-wide">
                    <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                    <span>2. Opponent Response</span>
                  </div>
                  <p className="text-[11px] sm:text-xs leading-relaxed opacity-90">
                    {tutorWarning.explanation.threat || "No immediate opponent capture, but concedes valuable tempo or defense."}
                  </p>
                </div>

                {/* 3. Coach's Alternative */}
                <div className="flex flex-col gap-1 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-400 uppercase tracking-wide">
                    <Sparkles className="w-3.5 h-3.5 shrink-0" />
                    <span>3. Better Line: {tutorWarning.bestMove.label}</span>
                  </div>
                  <p className="text-[11px] sm:text-xs leading-relaxed opacity-90">
                    {tutorWarning.explanation.recommendationComparison}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Bottom Section: Analysis Table & Settings */}
        <div className={`grid grid-cols-1 lg:grid-cols-3 gap-3.5 sm:gap-5 ${mobileTab === 'board' ? 'hidden lg:grid' : ''}`}>
          
          {/* Candidate Analysis Table & Mobile Cards */}
          <div className={`lg:col-span-2 ${theme.cardBg} border ${theme.cardBorder} rounded-2xl sm:rounded-3xl p-3 sm:p-5 flex flex-col shadow-lg overflow-hidden sm:overflow-visible ${mobileTab === 'settings' ? 'hidden lg:flex' : ''}`}>
            
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
              <div className="flex items-center gap-2">
                <div className={`text-[10px] ${theme.cardTextMuted}`}>
                  Blunders: P1({matchStats.p1Blunders}) / P2({matchStats.p2Blunders})
                </div>
                {(gameState.isGameOver || gameMovesHistory.length >= 2) && (
                  <button
                    onClick={() => {
                      haptics.tap();
                      setGameReviewOpen(true);
                    }}
                    data-testid="analysis-review-btn"
                    className={`px-2 py-0.5 rounded-lg border text-[10px] font-bold transition flex items-center gap-1 ${
                      currentSkin === 'porcelain'
                        ? 'bg-amber-600/10 text-amber-800 border-amber-700/30 hover:bg-amber-600/20'
                        : 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                    }`}
                  >
                    <Trophy className="w-3 h-3 text-amber-400" />
                    <span>Review Game</span>
                  </button>
                )}
              </div>
            </div>

            {/* Mobile Responsive Cards (100% width, ZERO horizontal scroll) */}
            <div className="sm:hidden flex flex-col gap-2 mt-2 w-full">
              {analysisResults.length === 0 ? (
                <div className={`py-6 text-center text-xs ${theme.cardTextMuted}`}>
                  {gameState.isGameOver ? "Match completed. No moves available." : "Calculating optimal lines..."}
                </div>
              ) : (
                analysisResults.map((move, idx) => {
                  const isExpanded = expandedAnalysisPit === move.pit;
                  const explanation = isExpanded && analysisResults[0]
                    ? generateTacticalExplanation(gameState.board, gameState.currentPlayer, move, analysisResults[0], rules)
                    : null;

                  return (
                    <div 
                      key={move.pit}
                      data-testid={idx === 0 ? "eval-row-0" : idx === analysisResults.length - 1 ? "eval-row-worst" : undefined}
                      className={`rounded-xl border p-2.5 flex flex-col gap-2 transition w-full select-none ${
                        move.rank === 1 
                          ? 'bg-amber-500/10 border-amber-500/30' 
                          : isExpanded 
                            ? 'bg-white/10 border-white/20' 
                            : 'bg-black/20 border-white/5'
                      }`}
                    >
                      {/* Main Row: Rank, Pit Name, Win %, Equity Diff, Grade & Play Button */}
                      <div className="flex items-center justify-between gap-1 w-full">
                        <div 
                          className="flex items-center space-x-1.5 flex-1 min-w-0 cursor-pointer"
                          onClick={() => setExpandedAnalysisPit(prev => prev === move.pit ? null : move.pit)}
                        >
                          <span className="font-bold text-xs opacity-75 font-mono">#{move.rank}</span>
                          <span className="font-bold text-xs truncate">{move.label}</span>
                          <span className="text-[10px] text-amber-400 shrink-0">
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5 inline" /> : <ChevronDown className="w-3.5 h-3.5 inline" />}
                          </span>
                        </div>

                        <div className="flex items-center space-x-1.5 shrink-0">
                          <span className="text-xs font-bold font-mono">
                            {(move.winProb * 100).toFixed(1)}%
                          </span>
                          <span className={`text-[10px] font-mono ${move.equityLoss === 0 ? 'text-emerald-500 font-semibold' : 'text-rose-400'}`}>
                            {move.equityLoss === 0 ? '0.0%' : `-${(move.equityLoss * 100).toFixed(1)}%`}
                          </span>
                          <div>
                            {renderGradeBadge(move.classification, move.badgeColor)}
                          </div>
                          <button
                            data-testid={`eval-play-pit-${move.pit}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              executeMove(move.pit, true);
                            }}
                            disabled={gameState.isGameOver}
                            className={`px-3 py-1 rounded-lg text-xs font-bold border shadow-xs transition active:scale-95 ${
                              currentSkin === 'porcelain'
                                ? 'bg-amber-600 hover:bg-amber-500 text-white border-amber-700'
                                : 'bg-amber-600 hover:bg-amber-500 text-white border-amber-500'
                            }`}
                          >
                            Play
                          </button>
                        </div>
                      </div>

                      {/* Sub-row: Bonus badges & PV */}
                      <div 
                        className="flex items-center justify-between text-[10px] font-mono opacity-80 cursor-pointer"
                        onClick={() => setExpandedAnalysisPit(prev => prev === move.pit ? null : move.pit)}
                      >
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {move.freeTurn && <span className="text-emerald-500 font-bold">[Free Turn]</span>}
                          {move.captures > 0 && <span className="text-amber-500 font-bold">[+{move.captures} Cap]</span>}
                          <span className="opacity-60">{move.pv.map(p => `P${p+1}`).join(' → ')}</span>
                        </div>
                        <span className={`text-[9px] underline opacity-75 shrink-0 ${
                          currentSkin === 'porcelain' ? 'text-amber-800' : 'text-amber-300'
                        }`}>
                          {isExpanded ? "Hide Details" : "Details"}
                        </span>
                      </div>

                      {/* Expanded Tactical Accordion Card */}
                      {isExpanded && explanation && (
                        <div className={`mt-1 p-2.5 rounded-lg border text-xs flex flex-col gap-2 ${
                          currentSkin === 'porcelain' 
                            ? 'bg-[#faf2e6] border-[#e8d2b8] text-[#2c2723]' 
                            : 'bg-black/40 border-white/10 text-slate-100'
                        }`}>
                          <div className={`flex items-center gap-1.5 font-bold ${
                            currentSkin === 'porcelain' ? 'text-amber-900' : 'text-amber-400'
                          }`}>
                            <Bot className="w-4 h-4 shrink-0" />
                            <span>Tactical Breakdown for {move.label} ({move.classification}):</span>
                          </div>
                          <p className="leading-relaxed opacity-95 text-xs">
                            {explanation.summary}
                          </p>
                          <div className="grid grid-cols-1 gap-1.5">
                            <div className="p-2 rounded bg-rose-500/10 border border-rose-500/20">
                              <div className="text-[10px] font-bold text-rose-400 uppercase">Immediate Effect</div>
                              <div className="text-xs opacity-90 mt-0.5">{explanation.consequence}</div>
                            </div>
                            <div className="p-2 rounded bg-amber-500/10 border border-amber-500/20">
                              <div className="text-[10px] font-bold text-amber-400 uppercase">Opponent Response</div>
                              <div className="text-xs opacity-90 mt-0.5">{explanation.threat || "No immediate opponent threat; general positional shift."}</div>
                            </div>
                            {move.rank > 1 && (
                              <div className="p-2 rounded bg-emerald-500/10 border border-emerald-500/20">
                                <div className="text-[10px] font-bold text-emerald-400 uppercase">Why {analysisResults[0]?.label || "Best Move"} is better</div>
                                <div className="text-xs opacity-90 mt-0.5">{explanation.recommendationComparison}</div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Desktop Candidates Table (Hidden on Mobile) */}
            <div className="hidden sm:block overflow-x-auto mt-2">
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
                    analysisResults.map((move, idx) => {
                      const isExpanded = expandedAnalysisPit === move.pit;
                      const explanation = isExpanded && analysisResults[0]
                        ? generateTacticalExplanation(gameState.board, gameState.currentPlayer, move, analysisResults[0], rules)
                        : null;

                      return (
                        <React.Fragment key={move.pit}>
                          <tr 
                            data-testid={idx === 0 ? "eval-row-0" : idx === analysisResults.length - 1 ? "eval-row-worst" : undefined}
                            onClick={() => setExpandedAnalysisPit(prev => prev === move.pit ? null : move.pit)}
                            className={`hover:bg-white/5 transition cursor-pointer select-none ${
                              move.rank === 1 ? 'bg-amber-500/10' : ''
                            } ${isExpanded ? 'bg-white/10' : ''}`}
                            title="Click to view tactical breakdown"
                          >
                            <td className="py-2.5 px-2 font-bold opacity-80">
                              #{move.rank}
                            </td>
                            <td className="py-2.5 px-2 font-bold">
                              <div className="flex items-center gap-1.5">
                                <span>{move.label}</span>
                                <span className="text-[10px] opacity-70">
                                  {isExpanded ? <ChevronUp className="w-3 h-3 inline text-amber-400" /> : <ChevronDown className="w-3 h-3 inline text-slate-400" />}
                                </span>
                              </div>
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
                            <td className="py-2.5 px-2 text-right" onClick={(e) => e.stopPropagation()}>
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

                          {/* Tactical Explanation Accordion Row */}
                          {isExpanded && explanation && (
                            <tr className={currentSkin === 'porcelain' ? 'bg-[#faf2e6]/90' : 'bg-black/30'}>
                              <td colSpan={7} className="p-3 sm:p-4">
                                <div className="flex flex-col gap-2.5 text-xs">
                                  <div className={`flex items-center gap-2 font-bold ${
                                    currentSkin === 'porcelain' ? 'text-amber-900' : 'text-amber-400'
                                  }`}>
                                    <Bot className="w-4 h-4" />
                                    <span>Tactical Breakdown for {move.label} ({move.classification}):</span>
                                  </div>
                                  <p className="leading-relaxed font-sans text-xs sm:text-[13px] opacity-95">
                                    {explanation.summary}
                                  </p>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1 font-sans">
                                    <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20">
                                      <div className="text-[10px] font-bold text-rose-400 uppercase">Immediate Effect</div>
                                      <div className="text-xs opacity-90 mt-0.5">{explanation.consequence}</div>
                                    </div>
                                    <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                                      <div className="text-[10px] font-bold text-amber-400 uppercase">Opponent Response</div>
                                      <div className="text-xs opacity-90 mt-0.5">{explanation.threat || "No immediate opponent threat; general positional shift."}</div>
                                    </div>
                                  </div>
                                  {move.rank > 1 && (
                                    <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 font-sans">
                                      <div className="text-[10px] font-bold text-emerald-400 uppercase">Why {analysisResults[0]?.label || "Best Move"} is better</div>
                                      <div className="text-xs opacity-90 mt-0.5">{explanation.recommendationComparison}</div>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
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

            {/* Move Hints & Coach Controls */}
            <div className={`flex flex-col gap-2 p-3 rounded-xl border ${
              currentSkin === 'porcelain' ? 'bg-[#ede5d8] border-[#dbd0c0]' : 'bg-black/30 border-white/5'
            }`}>
              <span className="text-xs font-bold">Coach & Hint Controls</span>
              
              <label className="flex items-center justify-between text-xs cursor-pointer">
                <span>Show Move Hints on Board (★ / #)</span>
                <input 
                  type="checkbox" 
                  checked={showMoveHints}
                  onChange={(e) => setShowMoveHints(e.target.checked)}
                  className="rounded accent-amber-500 w-4 h-4 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between text-xs cursor-pointer">
                <span>Coach Mode (Intervene on Errors)</span>
                <input 
                  type="checkbox" 
                  checked={tutorMode}
                  onChange={(e) => setTutorMode(e.target.checked)}
                  className="rounded accent-emerald-500 w-4 h-4 cursor-pointer"
                />
              </label>

              {tutorMode && (
                <div className="flex items-center justify-between text-[11px] pt-1 border-t border-white/5">
                  <span className={theme.cardTextMuted}>Coach Sensitivity:</span>
                  <select 
                    value={coachSensitivity}
                    onChange={(e) => setCoachSensitivity(e.target.value as 'all' | 'blunders_only')}
                    className={`rounded-lg px-2 py-0.5 text-xs font-semibold border ${
                      currentSkin === 'porcelain'
                        ? 'bg-white text-[#2c2723] border-[#cdc3b2]'
                        : 'bg-slate-900 text-slate-200 border-white/10'
                    }`}
                  >
                    <option value="all">Mistakes & Blunders</option>
                    <option value="blunders_only">Blunders Only</option>
                  </select>
                </div>
              )}
            </div>

            {/* Sound & Appearance */}
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold">Game Audio:</span>
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`flex items-center space-x-1.5 px-3 py-1 rounded-xl border text-xs font-semibold transition ${
                  soundEnabled
                    ? 'bg-emerald-600/20 text-emerald-400 border-emerald-500/30'
                    : `${theme.cardTextMuted} border-white/10`
                }`}
              >
                {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                <span>{soundEnabled ? "Sound On" : "Muted"}</span>
              </button>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold">Colorblind Palette:</span>
              <button
                onClick={() => setColorblindSafe(!colorblindSafe)}
                className={`px-3 py-1 rounded-xl border text-xs font-semibold transition ${
                  colorblindSafe
                    ? 'bg-fuchsia-600/20 text-fuchsia-300 border-fuchsia-500/40'
                    : `${theme.cardTextMuted} border-white/10`
                }`}
              >
                {colorblindSafe ? "High-Contrast Safe" : "Default Colors"}
              </button>
            </div>

            {/* Phone Haptics (Vibration) */}
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center space-x-1.5">
                <Smartphone className="w-3.5 h-3.5 opacity-70" />
                <span className="font-semibold">Phone Haptics (Vibration):</span>
              </div>
              <button
                onClick={() => handleToggleHaptics(!hapticsEnabled)}
                className={`px-3 py-1 rounded-xl border text-xs font-semibold transition ${
                  hapticsEnabled
                    ? 'bg-amber-600/20 text-amber-400 border-amber-500/30'
                    : `${theme.cardTextMuted} border-white/10`
                }`}
              >
                {hapticsEnabled ? "Vibration On" : "Vibration Off"}
              </button>
            </div>

            {/* Game Mode */}
            <div className="flex flex-col gap-1.5 pt-2 border-t border-white/5">
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

            {/* Rules Modifiers */}
            <div className={`flex flex-col gap-2 pt-2 border-t ${theme.cardBorder}`}>
              <div className="flex items-center justify-between text-[11px] font-semibold">
                <span>Sowing Animation Speed:</span>
                <select
                  value={sowSpeed}
                  onChange={(e) => setSowSpeed(e.target.value as 'slow' | 'normal' | 'fast' | 'instant')}
                  className={`rounded-lg px-2 py-0.5 text-xs font-semibold border ${
                    currentSkin === 'porcelain'
                      ? 'bg-white text-[#2c2723] border-[#cdc3b2]'
                      : 'bg-slate-900 text-slate-200 border-white/10'
                  }`}
                >
                  <option value="slow">Slow (Study Moves / 280ms)</option>
                  <option value="normal">Normal (Smooth / 175ms)</option>
                  <option value="fast">Fast (85ms)</option>
                  <option value="instant">Instant (0ms)</option>
                </select>
              </div>

              <label className="flex items-center justify-between text-[11px] font-semibold cursor-pointer">
                <span>Instant Sowing Animations</span>
                <input 
                  type="checkbox" 
                  checked={sowSpeed === 'instant'}
                  onChange={(e) => setSowSpeed(e.target.checked ? 'instant' : 'normal')}
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
                <span>Run Pre-Flight Invariant Tests</span>
              </button>
            </div>

          </div>

        </div>

      </main>

      {/* Permanently Docked Sticky Bottom Navigation Bar (5 Fixed Items) */}
      <nav 
        className={`fixed bottom-0 left-0 right-0 z-50 backdrop-blur-xl border-t py-1 px-2 flex lg:hidden items-center justify-between shadow-2xl transition-colors ${theme.thumbBarBg} ${theme.thumbBarBorder}`}
        style={{ paddingBottom: 'max(0.6rem, env(safe-area-inset-bottom))' }}
      >
        <button
          onClick={() => {
            haptics.tap();
            setMobileTab('board');
          }}
          data-testid="bottom-board-btn"
          className={`flex flex-col items-center justify-center flex-1 py-1.5 px-1 rounded-xl transition active:scale-95 ${
            mobileTab === 'board' ? theme.tabActiveText : theme.cardTextMuted
          }`}
        >
          <LayoutGrid className="w-5 h-5" />
          <span className="text-[10px] font-semibold mt-0.5">Board</span>
        </button>

        <button
          onClick={() => {
            haptics.tap();
            setMobileTab('analysis');
          }}
          data-testid="bottom-analysis-btn"
          className={`flex flex-col items-center justify-center flex-1 py-1.5 px-1 rounded-xl transition active:scale-95 ${
            mobileTab === 'analysis' ? theme.tabActiveText : theme.cardTextMuted
          }`}
        >
          <BarChart3 className="w-5 h-5" />
          <span className="text-[10px] font-semibold mt-0.5">Analysis</span>
        </button>

        {/* 1-Tap Toggle for Coach Mode */}
        <button
          onClick={() => {
            haptics.tap();
            setTutorMode(!tutorMode);
          }}
          data-testid="tutor-toggle"
          title={tutorMode ? "Coach mode active (will intervene on blunders)" : "Coach mode off"}
          className={`flex flex-col items-center justify-center flex-1 py-1.5 px-1 rounded-xl transition active:scale-95 ${
            tutorMode ? 'text-emerald-400 font-bold' : theme.cardTextMuted
          }`}
        >
          <Sparkles className="w-5 h-5" />
          <span className="text-[10px] font-semibold mt-0.5">{tutorMode ? "Coach On" : "Coach Off"}</span>
        </button>

        {/* Rules Button in Mobile Nav (Kept on tray only per user request) */}
        <button
          onClick={() => {
            haptics.tap();
            setRulesOpen(true);
          }}
          data-testid="bottom-rules-btn"
          title="How to Play Mancala (Quick Guide)"
          className={`flex flex-col items-center justify-center flex-1 py-1.5 px-1 rounded-xl transition active:scale-95 ${theme.cardTextMuted} hover:text-white`}
        >
          <BookOpen className="w-5 h-5 text-amber-400" />
          <span className="text-[10px] font-semibold mt-0.5">Rules</span>
        </button>

        <button
          onClick={() => {
            haptics.tap();
            setMobileTab('settings');
          }}
          data-testid="bottom-settings-btn"
          className={`flex flex-col items-center justify-center flex-1 py-1.5 px-1 rounded-xl transition active:scale-95 ${
            mobileTab === 'settings' ? theme.tabActiveText : theme.cardTextMuted
          }`}
        >
          <Settings className="w-5 h-5" />
          <span className="text-[10px] font-semibold mt-0.5">Settings</span>
        </button>
      </nav>

      {/* Visual Rules & How to Play Modal */}
      <RulesModal
        isOpen={rulesOpen}
        onClose={() => setRulesOpen(false)}
        currentSkin={currentSkin}
      />

      {/* Post-Match Game Review Modal */}
      <GameReviewModal
        isOpen={gameReviewOpen}
        onClose={() => setGameReviewOpen(false)}
        onRematch={() => {
          setGameReviewOpen(false);
          handleResetGame();
        }}
        reviewData={gameReviewData}
        colorblindSafe={colorblindSafe}
      />

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
