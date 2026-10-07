import { RuleSet, GameState } from '../rules/types';

export interface SolverResult {
  value: number;        // Exact terminal stone margin from perspective of s.turn (win > 0, draw = 0, loss < 0)
  best: number[];       // Principal variation (optimal sequence of moves from root to terminal)
  exact: true;          // Discriminated exactness flag
  nodes: number;        // Total nodes expanded
}

export interface SolveOptions {
  budgetNodes?: number; // Max nodes before bailout (default: 300_000)
}

export type TTFlag = 'EXACT' | 'LOWER' | 'UPPER';

export interface SolverTTEntry {
  value: number;
  flag: TTFlag;
  bestMove: number;
  bestPV: number[];
}

export const DEFAULT_ENDGAME_BUDGET = 300_000;
export const DEFAULT_ENDGAME_THRESHOLD = 14;

export const solverTT = new Map<string, SolverTTEntry>();
export const MAX_SOLVER_TT_SIZE = 300_000;

export function clearSolverCache(): void {
  solverTT.clear();
}

/**
 * Counts total unbanked / playable stones across all non-store pits.
 */
export function countPlayableStones(rules: RuleSet, s: GameState): number {
  const stores = rules.layout.stores;
  let count = 0;
  for (let i = 0; i < s.board.length; i++) {
    if (!stores.includes(i)) count += s.board[i];
  }
  return count;
}

/**
 * Returns whether state qualifies for exact endgame solve (playable stones <= threshold).
 */
export function isEndgame(rules: RuleSet, s: GameState, threshold = DEFAULT_ENDGAME_THRESHOLD): boolean {
  if (s.over || rules.isTerminal(s)) return false;
  return countPlayableStones(rules, s) <= threshold;
}

/**
 * Computes terminal margin from perspective of s.turn, sweeping any remaining pit stones if not yet swept.
 */
export function getTerminalScore(rules: RuleSet, s: GameState): number {
  if (s.over) {
    const [s0, s1] = rules.score(s);
    return s.turn === 0 ? s0 - s1 : s1 - s0;
  }
  let s0 = s.board[rules.layout.stores[0]];
  let s1 = s.board[rules.layout.stores[1]];
  for (let i = 0; i < s.board.length; i++) {
    if (rules.layout.stores.includes(i)) continue;
    if (rules.layout.pitOwner(i) === 0) s0 += s.board[i];
    else s1 += s.board[i];
  }
  return s.turn === 0 ? s0 - s1 : s1 - s0;
}

/**
 * Exact endgame solver using full-depth Negamax alpha-beta with Transposition Table memoization.
 * Memoized by rules.key(s).
 * Returns exact margin from perspective of s.turn, or null if budget is exceeded.
 */
export function solveExact(
  rules: RuleSet,
  s: GameState,
  budgetNodes = DEFAULT_ENDGAME_BUDGET
): SolverResult | null {
  // 1. Handle immediate terminal
  if (s.over || rules.isTerminal(s)) {
    const value = getTerminalScore(rules, s);
    return { value, best: [], exact: true, nodes: 1 };
  }

  const legal = rules.legalMoves(s);
  if (legal.length === 0) {
    const value = getTerminalScore(rules, s);
    return { value, best: [], exact: true, nodes: 1 };
  }

  let nodes = 0;

  function negamax(
    state: GameState,
    alpha: number,
    beta: number
  ): { value: number; pv: number[] } | null {
    nodes++;
    if (nodes > budgetNodes) return null;

    if (state.over || rules.isTerminal(state)) {
      const value = getTerminalScore(rules, state);
      return { value, pv: [] };
    }

    const moves = rules.legalMoves(state);
    if (moves.length === 0) {
      const value = getTerminalScore(rules, state);
      return { value, pv: [] };
    }

    const key = rules.key(state);
    const entry = solverTT.get(key);
    if (entry) {
      if (entry.flag === 'EXACT') {
        return { value: entry.value, pv: entry.bestPV };
      }
      if (entry.flag === 'LOWER') {
        alpha = Math.max(alpha, entry.value);
      } else if (entry.flag === 'UPPER') {
        beta = Math.min(beta, entry.value);
      }
      if (alpha >= beta) {
        return { value: entry.value, pv: entry.bestPV };
      }
    }

    // Move ordering: try cached best move first
    let orderedMoves = moves;
    if (entry && entry.bestMove !== -1 && moves.includes(entry.bestMove)) {
      orderedMoves = [entry.bestMove, ...moves.filter(m => m !== entry.bestMove)];
    }

    let bestVal = -Infinity;
    let bestMove = orderedMoves[0];
    let bestPV: number[] = [];
    const alphaOrig = alpha;

    for (const move of orderedMoves) {
      const res = rules.apply(state, move);
      let childVal: number;
      let childPV: number[];

      if (res.state.over || rules.isTerminal(res.state)) {
        // Evaluate terminal state from perspective of state.turn
        const terminalScoreForNext = getTerminalScore(rules, res.state);
        childVal = res.state.turn === state.turn ? terminalScoreForNext : -terminalScoreForNext;
        childPV = [];
      } else if (res.state.turn === state.turn) {
        // Free turn: same player's turn continues
        const child = negamax(res.state, alpha, beta);
        if (!child) return null;
        childVal = child.value;
        childPV = child.pv;
      } else {
        // Turn passes to opponent: invert alpha-beta bounds
        const child = negamax(res.state, -beta, -alpha);
        if (!child) return null;
        childVal = -child.value;
        childPV = child.pv;
      }

      if (childVal > bestVal) {
        bestVal = childVal;
        bestMove = move;
        bestPV = [move, ...childPV];
      }

      alpha = Math.max(alpha, bestVal);
      if (alpha >= beta) {
        break; // Alpha-beta cutoff
      }
    }

    const flag: TTFlag = bestVal <= alphaOrig ? 'UPPER' : bestVal >= beta ? 'LOWER' : 'EXACT';
    if (solverTT.size >= MAX_SOLVER_TT_SIZE) solverTT.clear();
    solverTT.set(key, { value: bestVal, flag, bestMove, bestPV });

    return { value: bestVal, pv: bestPV };
  }

  const result = negamax(s, -Infinity, Infinity);
  if (!result) return null;

  return {
    value: result.value,
    best: result.pv,
    exact: true,
    nodes
  };
}
