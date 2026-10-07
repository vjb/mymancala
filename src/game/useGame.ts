import { useState, useEffect, useMemo, useCallback, useRef, useReducer } from 'react';
import { GameStateRecord, GameAction, GameMode, SowSpeed, CoachSensitivity, TutorWarning, AnimatingState } from './gameTypes';
import { gameReducer, createInitialGameState } from './gameReducer';
import { P1_STORE, P2_STORE, P1_PITS, P2_PITS, simulateMove, RulesConfig, MoveSimulationResult, EvaluatedMove, analyzeAllMoves } from '../engine';
import { kalahRuleSet, createKalahRuleSet } from '../rules';
import { searchClient } from '../workers/searchClient';
import { saveGameSession, loadGameSession, clearSavedGame, replayGameFromHistory, SavedGameV1 } from '../lib/storage';
import { generateTacticalExplanation } from '../tactics';
import { sounds } from '../sound';
import { haptics } from '../haptics';
import { BOT_PERSONAS, DEFAULT_BOT_ID, getBotReaction, BotReactionEvent } from '../bots';
import { LensState } from '../lenses';

interface UseGameOptions {
  lenses: LensState;
  onGameOver?: () => void;
  isReducedMotion?: boolean;
}

export function useGame({ lenses, onGameOver, isReducedMotion = false }: UseGameOptions) {
  const [state, dispatch] = useReducer(gameReducer, undefined, () => {
    const initial = createInitialGameState(4);
    try {
      const savedDepth = localStorage.getItem('mancala_search_depth');
      if (savedDepth) {
        const d = parseInt(savedDepth, 10);
        if (!isNaN(d) && d >= 1 && d <= 10) initial.searchDepth = d;
      }
      const savedBot = localStorage.getItem('mancala_bot_id');
      if (savedBot && savedBot in BOT_PERSONAS) {
        initial.selectedBotId = savedBot;
        const bot = BOT_PERSONAS[savedBot];
        if (bot) initial.searchDepth = bot.depth;
      }
      const savedSpeed = localStorage.getItem('mancala_sow_speed') as SowSpeed;
      if (savedSpeed && ['slow', 'normal', 'fast', 'instant'].includes(savedSpeed)) {
        initial.sowSpeed = savedSpeed;
      }
      const savedSens = localStorage.getItem('mancala_coach_sensitivity') as CoachSensitivity;
      if (savedSens && ['all', 'blunders_only'].includes(savedSens)) {
        initial.coachSensitivity = savedSens;
      }
    } catch {}
    return initial;
  });

  // Autosave & Resume state
  const [savedGamePrompt, setSavedGamePrompt] = useState<SavedGameV1 | null>(null);

  useEffect(() => {
    const saved = loadGameSession();
    if (saved && saved.history.length > 0) {
      const options = saved.options ?? {
        stonesPerPit: 4,
        freeTurn: true,
        captureOpposite: true
      };
      const stonesPerPit = typeof options.stonesPerPit === 'number' && options.stonesPerPit > 0
        ? options.stonesPerPit
        : 4;
      const ruleSet = createKalahRuleSet({ ...options, stonesPerPit });
      const replay = replayGameFromHistory(ruleSet, saved.history);
      if (replay.valid && !replay.state.over) {
        setSavedGamePrompt(saved);
      } else {
        clearSavedGame();
      }
    }
  }, []);

  const handleResumeSavedGame = () => {
    if (!savedGamePrompt) return;
    const options = savedGamePrompt.options ?? {
      stonesPerPit: 4,
      freeTurn: true,
      captureOpposite: true
    };
    const stonesPerPit = typeof options.stonesPerPit === 'number' && options.stonesPerPit > 0
      ? options.stonesPerPit
      : 4;
    const rulesConfig: RulesConfig = {
      freeTurn: options.freeTurn !== false,
      captureOpposite: options.captureOpposite !== false
    };
    const ruleSet = createKalahRuleSet({ ...rulesConfig, stonesPerPit });
    const replay = replayGameFromHistory(ruleSet, savedGamePrompt.history);
    if (replay.valid) {
      let replayedState = createInitialGameState(stonesPerPit);
      let currentBoard = [...replayedState.board];
      let currentPlayer = replayedState.currentPlayer;
      let isGameOver = false;
      let winner: number | null = null;
      const historyItems: typeof state.moveHistory = [];

      for (const pit of savedGamePrompt.history) {
        const sim = simulateMove(currentBoard, currentPlayer, pit, rulesConfig);
        historyItems.push({
          player: currentPlayer,
          pit,
          freeTurn: sim.earnedFreeTurn,
          captures: sim.capturedStones
        });
        currentBoard = sim.newBoard;
        currentPlayer = sim.nextPlayer;
        isGameOver = sim.isGameOver;
        winner = sim.winner;
      }

      dispatch({
        type: 'RESTORE_SAVED_GAME',
        payload: {
          board: currentBoard,
          currentPlayer,
          isGameOver,
          winner,
          moveHistory: historyItems,
          lastMovedPit: savedGamePrompt.history[savedGamePrompt.history.length - 1],
          gameMode: savedGamePrompt.mode,
          humanPlayer: savedGamePrompt.humanPlayer ?? 0,
          selectedBotId: savedGamePrompt.botLevel ?? DEFAULT_BOT_ID,
          stonesConfig: stonesPerPit,
          rules: rulesConfig
        }
      });
    }
    setSavedGamePrompt(null);
  };

  const handleDismissSavedGame = () => {
    clearSavedGame();
    setSavedGamePrompt(null);
  };

  // Sync settings to localStorage
  useEffect(() => {
    try { localStorage.setItem('mancala_search_depth', String(state.searchDepth)); } catch {}
  }, [state.searchDepth]);
  useEffect(() => {
    try { localStorage.setItem('mancala_bot_id', state.selectedBotId); } catch {}
  }, [state.selectedBotId]);
  useEffect(() => {
    try { localStorage.setItem('mancala_sow_speed', state.sowSpeed); } catch {}
  }, [state.sowSpeed]);
  useEffect(() => {
    try { localStorage.setItem('mancala_coach_sensitivity', state.coachSensitivity); } catch {}
  }, [state.coachSensitivity]);

  // Persist game state on moves
  useEffect(() => {
    if (state.moveHistory.length > 0 && !state.isGameOver) {
      const history = state.moveHistory.map(m => m.pit);
      saveGameSession({
        version: 1,
        rulesId: 'kalah',
        options: {
          stonesPerPit: state.stonesConfig,
          freeTurn: state.rules.freeTurn,
          captureOpposite: state.rules.captureOpposite
        },
        history,
        mode: state.gameMode,
        botLevel: state.selectedBotId,
        humanPlayer: state.humanPlayer,
        savedAt: Date.now()
      });
    } else if (state.isGameOver) {
      clearSavedGame();
    }
  }, [state.moveHistory, state.isGameOver, state.stonesConfig, state.rules, state.gameMode, state.selectedBotId, state.humanPlayer]);

  // Animation & visual board state
  const [animatingState, setAnimatingState] = useState<AnimatingState | null>(null);
  const [visualBoard, setVisualBoard] = useState<number[] | null>(null);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [hoveredPit, setHoveredPit] = useState<number | null>(null);
  const [analysisResults, setAnalysisResults] = useState<EvaluatedMove[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [tutorWarning, setTutorWarning] = useState<TutorWarning | null>(null);
  const [showCoachDetails, setShowCoachDetails] = useState(false);
  const [botDialogue, setBotDialogue] = useState<{ text: string; id: number } | null>(null);

  const activeAnimationId = useRef(0);
  const isMoveLocked = useRef(false);
  const lastPitClickTimeRef = useRef(0);

  const getSpeedDelays = (speed: SowSpeed) => {
    switch (speed) {
      case 'slow':
        return { lift: 550, step: 340, capture: 650, freeTurn: 550, thinking: 1600 };
      case 'fast':
        return { lift: 180, step: 100, capture: 280, freeTurn: 220, thinking: 400 };
      case 'instant':
        return { lift: 0, step: 0, capture: 0, freeTurn: 0, thinking: 20 };
      case 'normal':
      default:
        return { lift: 400, step: 240, capture: 500, freeTurn: 400, thinking: 1200 };
    }
  };

  const triggerBotDialogue = useCallback((event: BotReactionEvent, customText?: string) => {
    if (state.gameMode !== 'pve') return;
    const text = customText || getBotReaction(state.selectedBotId, event);
    const id = Date.now();
    setBotDialogue({ text, id });
    const timer = setTimeout(() => {
      setBotDialogue(prev => (prev?.id === id ? null : prev));
    }, 4500);
    return () => clearTimeout(timer);
  }, [state.selectedBotId, state.gameMode]);

  // Asynchronous Search via Web Worker Client
  useEffect(() => {
    if (state.isGameOver) {
      setAnalysisResults([]);
      return;
    }

    let isSubscribed = true;
    setIsAnalyzing(true);

    const promise = searchClient.analyze({
      rules: 'kalah',
      rulesOptions: state.rules,
      state: {
        board: state.board,
        turn: state.currentPlayer as 0 | 1,
        over: state.isGameOver
      },
      depth: state.searchDepth
    });
    const reqId = searchClient.getCurrentRequestId();

    promise.then(res => {
      if (isSubscribed) {
        setAnalysisResults(res.evaluatedMoves);
        setIsAnalyzing(false);
      }
    }).catch(err => {
      console.warn('Worker search error:', err);
      if (isSubscribed) setIsAnalyzing(false);
    });

    return () => {
      isSubscribed = false;
      searchClient.cancel(reqId);
    };
  }, [state.board, state.currentPlayer, state.isGameOver, state.searchDepth, state.rules]);

  // Move execution pipeline
  const executeMove = useCallback(async (pitIndex: number, force = false) => {
    if (state.isGameOver) return;
    if (isMoveLocked.current && !force) return;
    isMoveLocked.current = true;

    try {
      const legalPits = state.currentPlayer === 0 ? P1_PITS : P2_PITS;
      if (!(legalPits as readonly number[]).includes(pitIndex) || state.board[pitIndex] === 0) {
        isMoveLocked.current = false;
        return;
      }

      // Coach/Tutor warning interception
      const isCoachActive = Boolean(lenses.explanations || lenses.coach);
      if (!force && isCoachActive && state.gameMode === 'pve' && state.currentPlayer === state.humanPlayer) {
        const moveEval = analysisResults.find(m => m.pit === pitIndex);
        const shouldWarn = state.coachSensitivity === 'blunders_only'
          ? moveEval?.classification === 'Blunder'
          : (moveEval?.classification === 'Mistake' || moveEval?.classification === 'Blunder');

        if (moveEval && shouldWarn && analysisResults[0]) {
          const explanation = generateTacticalExplanation(
            state.board,
            state.currentPlayer,
            moveEval,
            analysisResults[0],
            state.rules
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

      // Record evaluation PR stats
      const currentBoard = [...state.board];
      const player = state.currentPlayer;
      const initialStones = currentBoard[pitIndex];
      const result = simulateMove(currentBoard, player, pitIndex, state.rules);

      let chosenEval = analysisResults.find(m => m.pit === pitIndex);
      let bestMovePit = analysisResults[0]?.pit;
      if (!chosenEval) {
        const fastEvals = analyzeAllMoves(currentBoard, player, Math.min(2, state.searchDepth), state.rules);
        chosenEval = fastEvals.find(m => m.pit === pitIndex) || fastEvals[0];
        if (bestMovePit === undefined && fastEvals[0]) {
          bestMovePit = fastEvals[0].pit;
        }
      }

      if (chosenEval) {
        const activeBot = BOT_PERSONAS[state.selectedBotId];
        dispatch({
          type: 'RECORD_MOVE_EVALUATION',
          payload: {
            chosenEval,
            player,
            pitIndex,
            capturedStones: result.capturedStones,
            earnedFreeTurn: result.earnedFreeTurn,
            activeBotName: activeBot?.name,
            boardBeforeMove: currentBoard,
            bestPit: bestMovePit ?? pitIndex
          }
        });
      }

      const isInstant = state.sowSpeed === 'instant' || isReducedMotion;

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
          if (onGameOver) onGameOver();
        } else if (player === 1 && result.capturedStones === 0 && !result.earnedFreeTurn) {
          triggerBotDialogue('bot_move');
        }

        dispatch({
          type: 'APPLY_MOVE',
          payload: {
            newBoard: result.newBoard,
            nextPlayer: result.nextPlayer,
            isGameOver: result.isGameOver,
            winner: result.winner,
            earnedFreeTurn: result.earnedFreeTurn,
            capturedStones: result.capturedStones,
            pitIndex,
            initialStones,
            lastLanding: result.lastLanding,
            capturedFromPit: result.capturedFromPit
          }
        });

        isMoveLocked.current = false;
        setTutorWarning(null);
        return;
      }

      // Animated Sowing Pipeline
      const animId = ++activeAnimationId.current;
      const delays = getSpeedDelays(state.sowSpeed);

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
        if (onGameOver) onGameOver();
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

      // Phase 4: Finalize game state
      dispatch({
        type: 'APPLY_MOVE',
        payload: {
          newBoard: result.newBoard,
          nextPlayer: result.nextPlayer,
          isGameOver: result.isGameOver,
          winner: result.winner,
          earnedFreeTurn: result.earnedFreeTurn,
          capturedStones: result.capturedStones,
          pitIndex,
          initialStones,
          lastLanding: result.lastLanding,
          capturedFromPit: result.capturedFromPit
        }
      });
    } catch (err) {
      console.error('Move execution error:', err);
      isMoveLocked.current = false;
      setAnimatingState(null);
      setVisualBoard(null);
    }
  }, [
    state.isGameOver,
    state.currentPlayer,
    state.board,
    state.gameMode,
    state.humanPlayer,
    state.coachSensitivity,
    state.rules,
    state.selectedBotId,
    state.sowSpeed,
    lenses.coach,
    lenses.explanations,
    analysisResults,
    triggerBotDialogue,
    onGameOver,
    isReducedMotion
  ]);

  // AI bot turn automation with deliberate thinking pause
  useEffect(() => {
    if (state.isGameOver) {
      setIsAiThinking(false);
      return;
    }

    const isEngineTurn = 
      (state.gameMode === 'ai_vs_ai' && state.isAiRunning) || 
      (state.gameMode === 'pve' && state.currentPlayer !== state.humanPlayer);

    if (isEngineTurn && analysisResults.length > 0 && !isAnalyzing && !animatingState && !isMoveLocked.current) {
      setIsAiThinking(true);
      const delays = getSpeedDelays(state.sowSpeed);
      const thinkDelay = state.sowSpeed === 'instant' || isReducedMotion
        ? 20 
        : (state.gameMode === 'ai_vs_ai' ? state.aiSpeedMs : delays.thinking);

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
    state.currentPlayer,
    state.isGameOver,
    state.gameMode,
    state.humanPlayer,
    state.isAiRunning,
    state.aiSpeedMs,
    state.sowSpeed,
    analysisResults,
    isAnalyzing,
    animatingState,
    executeMove,
    isReducedMotion
  ]);

  // 250ms tap debounce on pit clicks
  const handlePitClick = (pitIndex: number) => {
    const now = Date.now();
    if (now - lastPitClickTimeRef.current < 250) return;
    lastPitClickTimeRef.current = now;

    if (animatingState || state.isGameOver) return;
    if (state.gameMode === 'pve' && state.currentPlayer !== state.humanPlayer) return;
    if (state.gameMode === 'ai_vs_ai') return;
    executeMove(pitIndex);
  };

  const handleResetGame = () => {
    activeAnimationId.current++;
    setAnimatingState(null);
    setVisualBoard(null);
    setIsAiThinking(false);
    isMoveLocked.current = false;
    searchClient.clearCache();
    clearSavedGame();
    dispatch({ type: 'RESET_GAME' });
    setTutorWarning(null);
    triggerBotDialogue('start');
  };

  const handleUndoMove = () => {
    if (state.moveHistory.length === 0 || state.isGameOver || animatingState || isAiThinking) return;
    haptics.tap();
    sounds.playSow(0);
    activeAnimationId.current++;
    setAnimatingState(null);
    setVisualBoard(null);
    setTutorWarning(null);
    setShowCoachDetails(false);

    if (state.gameMode === 'pve') {
      const lastMove = state.moveHistory[state.moveHistory.length - 1];
      if (lastMove && lastMove.player !== state.humanPlayer && state.moveHistory.length >= 2) {
        dispatch({ type: 'UNDO_MOVE' });
        dispatch({ type: 'UNDO_MOVE' });
      } else {
        dispatch({ type: 'UNDO_MOVE' });
      }
    } else {
      dispatch({ type: 'UNDO_MOVE' });
    }
  };

  const handleTutorReconsider = () => {
    setTutorWarning(null);
    setShowCoachDetails(false);
  };

  const handleTutorPlayBest = () => {
    if (tutorWarning) {
      const bestPit = tutorWarning.bestMove.pit;
      setTutorWarning(null);
      setShowCoachDetails(false);
      executeMove(bestPit, true);
    }
  };

  const handleTutorConfirmAnyway = () => {
    if (tutorWarning) {
      const pickedPit = tutorWarning.pit;
      setTutorWarning(null);
      setShowCoachDetails(false);
      executeMove(pickedPit, true);
    }
  };

  const handleSandboxPitAdjust = (pitIndex: number, delta: number) => {
    if (animatingState) return;
    dispatch({ type: 'ADJUST_SANDBOX_PIT', payload: { pitIndex, delta } });
  };

  const displayBoard = visualBoard ?? state.board;

  const hoverPreview: MoveSimulationResult | null = useMemo(() => {
    if (!lenses.landingPreview || animatingState || hoveredPit === null || displayBoard[hoveredPit] === 0) return null;
    const isP1 = state.currentPlayer === 0;
    const legalPits = isP1 ? P1_PITS : P2_PITS;
    if (!(legalPits as readonly number[]).includes(hoveredPit)) return null;

    return simulateMove(state.board, state.currentPlayer, hoveredPit, state.rules);
  }, [lenses.landingPreview, animatingState, hoveredPit, displayBoard, state.board, state.currentPlayer, state.rules]);

  const totalBoardStones = useMemo(() => {
    if (visualBoard && animatingState) {
      return visualBoard.reduce((a, b) => a + b, 0) + animatingState.stonesInHand;
    }
    return state.board.reduce((a, b) => a + b, 0);
  }, [state.board, visualBoard, animatingState]);

  const currentStoneAdvantage = useMemo(() => {
    if (state.isGameOver) {
      return state.board[P1_STORE] - state.board[P2_STORE];
    }
    if (!analysisResults || analysisResults.length === 0) return 0;
    const top = analysisResults[0];
    const rawP1Score = state.currentPlayer === 0 ? top.score : -top.score;
    if (top.exact) {
      // Exact solver: score is ALREADY true stone margin from perspective of current player!
      return rawP1Score;
    }
    const stones = rawP1Score / 3.5;
    return Math.round(stones * 10) / 10;
  }, [state.isGameOver, state.board, state.currentPlayer, analysisResults]);

  const isExactAnalysis = useMemo(() => {
    return analysisResults.length > 0 && Boolean(analysisResults[0]?.exact);
  }, [analysisResults]);

  const p1BarRatio = useMemo(() => {
    const clamped = Math.max(-10, Math.min(10, currentStoneAdvantage));
    return 0.5 + (clamped / 20);
  }, [currentStoneAdvantage]);

  const hasEarnedFreeTurn = Boolean(state.lastMoveSummary?.freeTurn && !state.isGameOver);

  return {
    state,
    visualBoard,
    displayBoard,
    animatingState,
    isAiThinking,
    isMoveLocked,
    analysisResults,
    isAnalyzing,
    tutorWarning,
    showCoachDetails,
    setShowCoachDetails,
    hoverPreview,
    hoveredPit,
    setHoveredPit,
    currentStoneAdvantage,
    isExactAnalysis,
    p1BarRatio,
    totalBoardStones,
    hasEarnedFreeTurn,
    botDialogue,
    setBotDialogue,
    executeMove,
    handlePitClick,
    handleResetGame,
    handleUndoMove,
    handleTutorReconsider,
    handleTutorPlayBest,
    handleTutorConfirmAnyway,
    handleSandboxPitAdjust,
    handleSetGameMode: (mode: GameMode) => dispatch({ type: 'SET_GAME_MODE', payload: mode }),
    handleSetHumanPlayer: (player: number) => dispatch({ type: 'SET_HUMAN_PLAYER', payload: player }),
    handleSetBot: (botId: string) => {
      haptics.tap();
      dispatch({ type: 'SET_BOT_ID', payload: botId });
      const bot = BOT_PERSONAS[botId];
      if (bot) dispatch({ type: 'SET_SEARCH_DEPTH', payload: bot.depth });
      const quote = getBotReaction(botId, 'start');
      triggerBotDialogue('start', quote);
    },
    handleSetSearchDepth: (depth: number) => dispatch({ type: 'SET_SEARCH_DEPTH', payload: depth }),
    handleSetRules: (rules: Partial<RulesConfig>) => dispatch({ type: 'SET_RULES', payload: rules }),
    handleSetSowSpeed: (speed: SowSpeed) => dispatch({ type: 'SET_SOW_SPEED', payload: speed }),
    handleSetCoachSensitivity: (sens: CoachSensitivity) => dispatch({ type: 'SET_COACH_SENSITIVITY', payload: sens }),
    handleSetAiRunning: (running: boolean) => dispatch({ type: 'SET_AI_RUNNING', payload: running }),
    savedGamePrompt,
    handleResumeSavedGame,
    handleDismissSavedGame
  };
}
