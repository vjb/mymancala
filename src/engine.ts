import {
  RuleSet,
  GameState as HeadlessGameState,
  Player,
  MoveResult
} from './rules/types';
import {
  kalahRuleSet,
  createKalahRuleSet,
  kalahRules,
  KALAH_TOTAL_PITS,
  KALAH_P1_STORE,
  KALAH_P2_STORE,
  KALAH_P1_PITS,
  KALAH_P2_PITS,
  KalahOptions
} from './rules/kalah';

// Legacy board constants delegated from kalah.ts (no literal 13 or 6 in this file!)
export const TOTAL_PITS = KALAH_TOTAL_PITS;
export const P1_STORE = KALAH_P1_STORE;
export const P2_STORE = KALAH_P2_STORE;
export const P1_PITS = KALAH_P1_PITS;
export const P2_PITS = KALAH_P2_PITS;

export interface RulesConfig {
  freeTurn: boolean;
  captureOpposite: boolean;
}

// Legacy UI GameState interface preserved for callers
export interface GameState {
  board: number[];
  currentPlayer: number; // 0: Player 1 (South), 1: Player 2 (North)
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
  pit?: number;
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
  classification: 'Excellent (Best)' | 'Good' | 'Inaccuracy' | 'Mistake' | 'Blunder';
  badgeColor: string;
  exact?: boolean;
}

function resolveRuleSet(rules?: RulesConfig | RuleSet): RuleSet {
  if (!rules) return kalahRuleSet;
  if ('apply' in rules && 'layout' in rules) return rules;
  return kalahRules(rules);
}

export function createInitialBoard(stonesPerPit = 4): number[] {
  return createKalahRuleSet({ stonesPerPit }).initial().board;
}

export function createInitialState(stonesPerPit = 4): GameState {
  return {
    board: createInitialBoard(stonesPerPit),
    currentPlayer: 0,
    isGameOver: false,
    winner: null,
    moveHistory: [],
    lastMovedPit: null
  };
}

export function getLegalMoves(board: number[], player: number, rules?: RulesConfig | RuleSet): number[] {
  const rs = resolveRuleSet(rules);
  return rs.legalMoves({
    board,
    turn: player as Player,
    over: false
  });
}

export function simulateMove(
  board: number[],
  player: number,
  pit: number,
  rules: RulesConfig | RuleSet = { freeTurn: true, captureOpposite: true }
): MoveSimulationResult {
  const rs = resolveRuleSet(rules);
  const res = rs.apply({ board, turn: player as Player, over: false }, pit);
  const [s0, s1] = rs.score(res.state);

  let winner: number | null = null;
  if (res.state.over) {
    if (s0 > s1) winner = 0;
    else if (s1 > s0) winner = 1;
    else winner = -1;
  }

  return {
    newBoard: res.state.board,
    nextPlayer: res.state.turn,
    isGameOver: res.state.over,
    winner,
    earnedFreeTurn: res.extraTurn,
    capturedStones: res.captured,
    capturedFromPit: res.capturedFrom ?? null,
    lastLanding: res.lastLanding ?? (res.path.length > 0 ? res.path[res.path.length - 1] : pit),
    path: res.path,
    pit
  };
}

export function perft(
  board: number[],
  player: number,
  depth: number,
  rules: RulesConfig | RuleSet = { freeTurn: true, captureOpposite: true }
): number {
  if (depth === 0) return 1;
  const legalMoves = getLegalMoves(board, player, rules);
  if (legalMoves.length === 0) return 1;

  let nodes = 0;
  for (const move of legalMoves) {
    const res = simulateMove(board, player, move, rules);
    if (res.isGameOver) {
      nodes += 1;
    } else {
      nodes += perft(res.newBoard, res.nextPlayer, depth - 1, rules);
    }
  }
  return nodes;
}

export type TTFlag = 'EXACT' | 'LOWER' | 'UPPER';

export interface TTEntry {
  score: number;
  bestMove: number;
  pv: number[];
  flag: TTFlag;
}

export const TT_MAX_ENTRIES = 250_000;
export const transpositionTable = new Map<string, TTEntry>();

export function getPositionKey(
  board: number[],
  player: number,
  depth: number,
  rules: RulesConfig | RuleSet = { freeTurn: true, captureOpposite: true }
): string {
  const rs = resolveRuleSet(rules);
  return `${board.join(',')}_p${player}_d${depth}_r${rs.key({ board, turn: player as Player, over: false })}`;
}

export function evaluatePosition(board: number[]): number {
  const storeDiff = board[P1_STORE] - board[P2_STORE];
  
  let p1Stones = 0;
  let p2Stones = 0;
  for (const p of P1_PITS) p1Stones += board[p];
  for (const p of P2_PITS) p2Stones += board[p];
  
  let p1Potential = 0;
  let p2Potential = 0;
  for (const p of P1_PITS) {
    if (board[p] > 0 && (p + board[p]) % TOTAL_PITS === P1_STORE) p1Potential += 2.2;
  }
  for (const p of P2_PITS) {
    if (board[p] > 0 && (p + board[p]) % TOTAL_PITS === P2_STORE) p2Potential += 2.2;
  }

  return (storeDiff * 3.5) + ((p1Stones - p2Stones) * 0.6) + (p1Potential - p2Potential);
}

export function minimax(
  board: number[],
  player: number,
  depth: number,
  alpha: number,
  beta: number,
  rules: RulesConfig | RuleSet,
  maxDepth: number
): { score: number; bestMove: number; pv: number[] } {
  const rs = resolveRuleSet(rules);
  const legalMoves = rs.legalMoves({ board, turn: player as Player, over: false });
  if (depth === 0 || legalMoves.length === 0) {
    return { score: evaluatePosition(board), bestMove: -1, pv: [] };
  }

  const hash = `${board.join(',')}_p${player}_d${depth}_r${rs.key({ board, turn: player as Player, over: false })}`;
  const alphaOrig = alpha;
  const betaOrig = beta;

  const cached = transpositionTable.get(hash);
  if (cached) {
    if (cached.flag === 'EXACT') {
      return { score: cached.score, bestMove: cached.bestMove, pv: cached.pv };
    }
    if (cached.flag === 'LOWER') alpha = Math.max(alpha, cached.score);
    else beta = Math.min(beta, cached.score);
    if (alpha >= beta) {
      return { score: cached.score, bestMove: cached.bestMove, pv: cached.pv };
    }
  }

  const isMax = player === 0;
  let best = isMax ? -Infinity : Infinity;
  let bestMove = legalMoves[0];
  let bestPV: number[] = [legalMoves[0]];

  const orderedMoves = legalMoves.slice();
  if (cached && cached.bestMove !== -1) {
    const idx = orderedMoves.indexOf(cached.bestMove);
    if (idx > 0) {
      orderedMoves.splice(idx, 1);
      orderedMoves.unshift(cached.bestMove);
    }
  }

  for (const move of orderedMoves) {
    const res = rs.apply({ board, turn: player as Player, over: false }, move);
    let value: number;
    let childPV: number[] = [];

    if (res.state.over) {
      const [s0, s1] = rs.score(res.state);
      value = (s0 - s1) * 100;
    } else {
      const nextDepth = res.state.turn === player ? depth : depth - 1;
      const result = minimax(res.state.board, res.state.turn, nextDepth, alpha, beta, rs, maxDepth);
      value = result.score;
      childPV = result.pv;
    }

    if (isMax ? value > best : value < best) {
      best = value;
      bestMove = move;
      bestPV = [move, ...childPV];
    }

    if (isMax) alpha = Math.max(alpha, best);
    else beta = Math.min(beta, best);
    if (beta <= alpha) break;
  }

  const flag: TTFlag = best <= alphaOrig ? 'UPPER' : best >= betaOrig ? 'LOWER' : 'EXACT';
  if (transpositionTable.size >= TT_MAX_ENTRIES) transpositionTable.clear();
  transpositionTable.set(hash, { score: best, bestMove, pv: bestPV, flag });

  return { score: best, bestMove, pv: bestPV };
}

export function classifyEquityLoss(equityLoss: number, rank: number): {
  classification: 'Excellent (Best)' | 'Good' | 'Inaccuracy' | 'Mistake' | 'Blunder';
  badgeColor: string;
} {
  if (rank === 0 || equityLoss === 0) {
    return {
      classification: 'Excellent (Best)',
      badgeColor: 'bg-emerald-500/25 text-emerald-300 border-emerald-400'
    };
  } else if (equityLoss < 0.025) {
    return {
      classification: 'Good',
      badgeColor: 'bg-teal-500/20 text-teal-300 border-teal-500/30'
    };
  } else if (equityLoss <= 0.075) {
    return {
      classification: 'Inaccuracy',
      badgeColor: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
    };
  } else if (equityLoss <= 0.15) {
    return {
      classification: 'Mistake',
      badgeColor: 'bg-amber-600/25 text-amber-300 border-amber-600/40'
    };
  } else {
    return {
      classification: 'Blunder',
      badgeColor: 'bg-rose-600/25 text-rose-300 border-rose-600/40'
    };
  }
}

export function analyzeAllMoves(
  board: number[],
  player: number,
  depth: number,
  rules: RulesConfig | RuleSet = { freeTurn: true, captureOpposite: true }
): EvaluatedMove[] {
  const rs = resolveRuleSet(rules);
  const legalMoves = rs.legalMoves({ board, turn: player as Player, over: false });
  if (legalMoves.length === 0) return [];

  const evaluatedMoves = legalMoves.map(pit => {
    const res = rs.apply({ board, turn: player as Player, over: false }, pit);
    let score: number;
    let pv: number[] = [pit];

    if (res.state.over) {
      const [s0, s1] = rs.score(res.state);
      score = (s0 - s1) * 100;
    } else {
      const nextDepth = res.state.turn === player ? depth : depth - 1;
      const mm = minimax(res.state.board, res.state.turn, Math.max(1, nextDepth), -Infinity, Infinity, rs, depth);
      score = mm.score;
      pv = [pit, ...(mm.pv || [])];
    }

    const p1Prob = 1 / (1 + Math.exp(-score * 0.022));
    const winProb = player === 0 ? p1Prob : 1 - p1Prob;

    return {
      pit,
      label: rs.layout.label(pit),
      score,
      winProb: Math.min(0.999, Math.max(0.001, winProb)),
      pv,
      freeTurn: res.extraTurn,
      captures: res.captured,
      resultingBoard: res.state.board
    };
  });

  evaluatedMoves.sort((a, b) => b.winProb - a.winProb);

  const bestWinProb = evaluatedMoves[0].winProb;
  const bestScore = evaluatedMoves[0].score;

  return evaluatedMoves.map((m, rank) => {
    const equityLoss = Math.max(0, bestWinProb - m.winProb);
    const scoreDiff = player === 0 ? bestScore - m.score : m.score - bestScore;
    const { classification, badgeColor } = classifyEquityLoss(equityLoss, rank);

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
