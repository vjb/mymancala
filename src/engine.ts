export const TOTAL_PITS = 14;
export const P1_STORE = 6;
export const P2_STORE = 13;
export const P1_PITS = [0, 1, 2, 3, 4, 5] as const;
export const P2_PITS = [7, 8, 9, 10, 11, 12] as const;

export interface RulesConfig {
  freeTurn: boolean;
  captureOpposite: boolean;
}

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
}

export function createInitialBoard(stonesPerPit = 4): number[] {
  const board = new Array(14).fill(stonesPerPit);
  board[P1_STORE] = 0;
  board[P2_STORE] = 0;
  return board;
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
  const initialSum = board.reduce((a, b) => a + b, 0);
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
  else if (
    rules.captureOpposite && 
    (playerPits as readonly number[]).includes(lastLanding) && 
    newBoard[lastLanding] === 1
  ) {
    const oppositePit = 12 - lastLanding;
    if (newBoard[oppositePit] > 0) {
      capturedStones = newBoard[oppositePit] + 1; // opposite stones + landing stone
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

  // Invariant verification (Zero-Leak stone conservation)
  const finalSum = newBoard.reduce((a, b) => a + b, 0);
  if (finalSum !== initialSum) {
    throw new Error(`Stone conservation violated: started with ${initialSum}, ended with ${finalSum}`);
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

export function perft(
  board: number[],
  player: number,
  depth: number,
  rules: RulesConfig = { freeTurn: true, captureOpposite: true }
): number {
  if (depth === 0) return 1;
  const legalMoves = getLegalMoves(board, player);
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

export const transpositionTable = new Map<string, { score: number; bestMove: number; pv: number[] }>();

export function getPositionKey(board: number[], player: number, depth: number): string {
  return `${board.join(',')}_p${player}_d${depth}`;
}

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
  const hash = getPositionKey(board, player, depth);
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

    // Calibrated logistic sigmoid bounded win probability (~54%-56% at opening)
    const p1Prob = 1 / (1 + Math.exp(-score * 0.022));
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
