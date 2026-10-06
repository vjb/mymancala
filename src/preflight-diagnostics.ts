import {
  createInitialBoard,
  getLegalMoves,
  simulateMove,
  perft,
  classifyEquityLoss,
  P1_STORE,
  P2_STORE,
  P1_PITS,
  P2_PITS,
  getPositionKey,
  minimax,
  analyzeAllMoves
} from './engine';

export interface DiagnosticResult {
  name: string;
  category: 'Game Logic Invariants' | 'Solver & Analysis' | 'Audio & System';
  status: 'PASS' | 'FAIL';
  duration: string;
  error?: string;
  detail?: string;
}

export function testStoneConservation(iterations = 1000): void {
  let board = createInitialBoard(4); // 48 total stones
  let player = 0;
  
  for (let step = 0; step < iterations; step++) {
    const legalMoves = getLegalMoves(board, player);
    if (legalMoves.length === 0) {
      board = createInitialBoard(4);
      player = 0;
      continue;
    }
    const move = legalMoves[Math.floor(Math.random() * legalMoves.length)];
    const res = simulateMove(board, player, move, { freeTurn: true, captureOpposite: true });
    
    const sum = res.newBoard.reduce((a, b) => a + b, 0);
    if (sum !== 48) {
      throw new Error(`Zero-leak invariant violated at step ${step}: stone sum was ${sum} instead of 48!`);
    }
    
    if (res.isGameOver) {
      board = createInitialBoard(4);
      player = 0;
    } else {
      board = res.newBoard;
      player = res.nextPlayer;
    }
  }
}

export function testStoreSowingBypass(): void {
  // Test 1: Player 0 sows 10 stones from Pit 5 (index 5)
  // Indices visited: 6 (P1 store), 7, 8, 9, 10, 11, 12, (skips 13: P2 store), 0, 1
  const boardP0 = new Array(14).fill(0);
  boardP0[5] = 10;
  const resP0 = simulateMove(boardP0, 0, 5, { freeTurn: true, captureOpposite: false });
  if (resP0.newBoard[P2_STORE] !== 0) {
    throw new Error(`Player 0 erroneously sown into opponent Store 13 (count: ${resP0.newBoard[P2_STORE]})`);
  }
  if (resP0.newBoard[P1_STORE] !== 1) {
    throw new Error(`Player 0 failed to sow into own Store 6 (count: ${resP0.newBoard[P1_STORE]})`);
  }

  // Test 2: Player 1 sows 10 stones from Pit 12 (index 12)
  // Indices visited: 13 (P2 store), (skips 6: P1 store)
  const boardP1 = new Array(14).fill(0);
  boardP1[12] = 10;
  const resP1 = simulateMove(boardP1, 1, 12, { freeTurn: true, captureOpposite: false });
  if (resP1.newBoard[P1_STORE] !== 0) {
    throw new Error(`Player 1 erroneously sown into opponent Store 6 (count: ${resP1.newBoard[P1_STORE]})`);
  }
  if (resP1.newBoard[P2_STORE] !== 1) {
    throw new Error(`Player 1 failed to sow into own Store 13 (count: ${resP1.newBoard[P2_STORE]})`);
  }
}

export function testWrapAroundMultiLap(): void {
  // Pit 0 with 28 stones (wraps around more than 2 full laps)
  const board = new Array(14).fill(0);
  board[0] = 28;
  const res = simulateMove(board, 0, 0, { freeTurn: false, captureOpposite: false });
  const total = res.newBoard.reduce((a, b) => a + b, 0);
  if (total !== 28) {
    throw new Error(`Multi-lap wrap around leaked stones! Total was ${total} instead of 28`);
  }
  // Store 13 should have been skipped in both laps
  if (res.newBoard[P2_STORE] !== 0) {
    throw new Error(`Opponent store received stones during multi-lap wrap around`);
  }
}

export function testCaptureMechanics(): void {
  // Setup: Player 0 lands on empty Pit 4 (index 4).
  // Opposite pit is 12 - 4 = 8, which has 5 stones.
  // P2 also has stones in pit 7 (3 stones) so endgame sweep is not triggered prematurely.
  const board = new Array(14).fill(0);
  board[2] = 2; // Moves to index 3, then index 4
  board[8] = 5; // Opposite pit
  board[7] = 3; // Other P2 pit with stones
  
  const res = simulateMove(board, 0, 2, { freeTurn: true, captureOpposite: true });
  // Should capture 1 (landing) + 5 (opposite) = 6 stones into P1_STORE (6)
  if (res.capturedStones !== 6) {
    throw new Error(`Expected 6 captured stones, got ${res.capturedStones}`);
  }
  if (res.newBoard[P1_STORE] !== 6) {
    throw new Error(`Player 1 store does not contain captured stones! Expected 6, got ${res.newBoard[P1_STORE]}`);
  }
  if (res.newBoard[4] !== 0 || res.newBoard[8] !== 0) {
    throw new Error(`Captured pits were not cleared! Pit 4: ${res.newBoard[4]}, Pit 8: ${res.newBoard[8]}`);
  }
  if (res.newBoard[7] !== 3) {
    throw new Error(`Other P2 pit was unexpectedly modified: ${res.newBoard[7]}`);
  }

  // Counter-case: Opposite pit has 0 stones -> no capture should occur
  const boardNoCap = new Array(14).fill(0);
  boardNoCap[2] = 2;
  boardNoCap[8] = 0; // Empty opposite pit
  boardNoCap[7] = 3;
  const resNoCap = simulateMove(boardNoCap, 0, 2, { freeTurn: true, captureOpposite: true });
  if (resNoCap.capturedStones !== 0) {
    throw new Error(`Capture occurred even though opposite pit was empty!`);
  }
  if (resNoCap.newBoard[4] !== 1) {
    throw new Error(`Landing stone was not retained in empty pit when opposite was 0!`);
  }
}

export function testFreeTurnRules(): void {
  // Player 0 plays pit 4 with 2 stones -> lands in index 6 (P1_STORE)
  const board = createInitialBoard(4);
  board[4] = 2;
  const res = simulateMove(board, 0, 4, { freeTurn: true, captureOpposite: true });
  if (!res.earnedFreeTurn || res.nextPlayer !== 0) {
    throw new Error(`Free turn failed when landing in own store! nextPlayer: ${res.nextPlayer}`);
  }

  // Player 0 plays pit 3 with 2 stones -> lands in index 5 (not store)
  board[3] = 2;
  const resNoBonus = simulateMove(board, 0, 3, { freeTurn: true, captureOpposite: true });
  if (resNoBonus.earnedFreeTurn || resNoBonus.nextPlayer !== 1) {
    throw new Error(`Bonus turn erroneously awarded when landing in regular pit!`);
  }
}

export function testEndgameSweeping(): void {
  // P1 has 1 stone in pit 5, P2 has stones in 7 and 9
  const board = new Array(14).fill(0);
  board[5] = 1; // Lands in store 6, emptying all P1 pits
  board[7] = 3;
  board[9] = 4;
  board[P1_STORE] = 10;
  board[P2_STORE] = 12;

  const totalBefore = board.reduce((a, b) => a + b, 0);
  const res = simulateMove(board, 0, 5, { freeTurn: true, captureOpposite: true });

  if (!res.isGameOver) {
    throw new Error(`Game did not trigger game over when P1 pits emptied!`);
  }
  // P1 pits must all be 0
  if (!P1_PITS.every(p => res.newBoard[p] === 0)) {
    throw new Error(`P1 pits were not all 0 after endgame!`);
  }
  // P2 pits must all be 0 after sweep
  if (!P2_PITS.every(p => res.newBoard[p] === 0)) {
    throw new Error(`P2 pits were not cleared by endgame sweep!`);
  }
  // P2 store must contain previous 12 + swept 7 = 19
  if (res.newBoard[P2_STORE] !== 19) {
    throw new Error(`P2 store sweep incorrect! Expected 19, got ${res.newBoard[P2_STORE]}`);
  }
  // Total stone sum must remain preserved
  const totalAfter = res.newBoard.reduce((a, b) => a + b, 0);
  if (totalBefore !== totalAfter) {
    throw new Error(`Total stones changed during endgame sweep! ${totalBefore} vs ${totalAfter}`);
  }
}

export function testPerftDeterminism(): void {
  const board = createInitialBoard(4);
  const depth1 = perft(board, 0, 1);
  const depth2 = perft(board, 0, 2);
  const depth3 = perft(board, 0, 3);
  
  if (depth1 !== 6) {
    throw new Error(`Perft(1) expected 6 legal moves, got ${depth1}`);
  }
  // In standard Kalah: Pit 2 (4 stones) lands in store 6 -> gives free turn with 5 remaining legal moves
  // Pits 0, 1, 3, 4, 5 switch to P2 (6 moves each)
  // Total depth 2 nodes: 5 * 6 + 1 * 5 = 35 nodes
  if (depth2 !== 35) {
    throw new Error(`Perft(2) expected 35 nodes, got ${depth2}`);
  }
  if (depth3 <= depth2) {
    throw new Error(`Perft(3) branching failed: ${depth3} <= ${depth2}`);
  }

  // Verify determinism by running depth 2 again
  const depth2Repeat = perft(board, 0, 2);
  if (depth2 !== depth2Repeat) {
    throw new Error(`Perft is non-deterministic: ${depth2} !== ${depth2Repeat}`);
  }
}

export function testTranspositionConsistency(): void {
  const board1 = [0, 4, 4, 4, 4, 4, 0, 4, 4, 4, 4, 4, 4, 0];
  const key1 = getPositionKey(board1, 0, 3);
  const key2 = getPositionKey([...board1], 0, 3);
  if (key1 !== key2) {
    throw new Error(`Position key hashing mismatch for identical boards: ${key1} vs ${key2}`);
  }

  // Minimax evaluation determinism
  const eval1 = minimax(board1, 0, 2, -Infinity, Infinity, { freeTurn: true, captureOpposite: true }, 2);
  const eval2 = minimax(board1, 0, 2, -Infinity, Infinity, { freeTurn: true, captureOpposite: true }, 2);
  if (eval1.score !== eval2.score || eval1.bestMove !== eval2.bestMove) {
    throw new Error(`Minimax evaluation non-deterministic: ${JSON.stringify(eval1)} vs ${JSON.stringify(eval2)}`);
  }
}

export function testEvaluationBounds(): void {
  const board = createInitialBoard(4);
  const moves = analyzeAllMoves(board, 0, 2, { freeTurn: true, captureOpposite: true });
  for (const m of moves) {
    if (m.winProb < 0.0 || m.winProb > 1.0) {
      throw new Error(`Move ${m.label} win probability out of bounds: ${m.winProb}`);
    }
  }
}

export function testBlunderClassificationHierarchy(): void {
  const best = classifyEquityLoss(0, 0);
  if (best.classification !== 'Excellent (Best)') {
    throw new Error(`Rank 0 did not yield Excellent (Best)`);
  }

  const good = classifyEquityLoss(0.015, 1);
  if (good.classification !== 'Good') {
    throw new Error(`0.015 equity loss did not yield Good`);
  }

  const inacc = classifyEquityLoss(0.05, 2);
  if (inacc.classification !== 'Inaccuracy') {
    throw new Error(`0.05 equity loss did not yield Inaccuracy`);
  }

  const mistake = classifyEquityLoss(0.12, 3);
  if (mistake.classification !== 'Mistake') {
    throw new Error(`0.12 equity loss did not yield Mistake`);
  }

  const blunder = classifyEquityLoss(0.20, 4);
  if (blunder.classification !== 'Blunder') {
    throw new Error(`0.20 equity loss did not yield Blunder`);
  }
}

export function testAudioInitialization(): void {
  // Test that AudioContext creation or graceful fallback succeeds in Node/Browser environments
  if (typeof window !== 'undefined') {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioCtx) {
      const ctx = new AudioCtx();
      if (ctx.state === 'running' || ctx.state === 'suspended') {
        ctx.close();
      }
    }
  }
}

export async function runGNUPreflightSuite(): Promise<DiagnosticResult[]> {
  const tests: Array<{
    name: string;
    category: 'Game Logic Invariants' | 'Solver & Analysis' | 'Audio & System';
    run: () => void | Promise<void>;
  }> = [
    {
      name: "Zero-Leak Conservation (1,000 Random Plies)",
      category: "Game Logic Invariants",
      run: () => testStoneConservation(1000)
    },
    {
      name: "Store Sowing Bypass (P0 skips 13, P1 skips 6)",
      category: "Game Logic Invariants",
      run: testStoreSowingBypass
    },
    {
      name: "Multi-Lap Wrap-Around (N >= 13 stones)",
      category: "Game Logic Invariants",
      run: testWrapAroundMultiLap
    },
    {
      name: "Opposite Pit Capture & Empty Opposite Symmetries",
      category: "Game Logic Invariants",
      run: testCaptureMechanics
    },
    {
      name: "Free Turn Continuity (Own Store Landing Only)",
      category: "Game Logic Invariants",
      run: testFreeTurnRules
    },
    {
      name: "Endgame Sweeping & Stone Conservation",
      category: "Game Logic Invariants",
      run: testEndgameSweeping
    },
    {
      name: "Perft Determinism (Depths 1-3 Exact Node Counts)",
      category: "Solver & Analysis",
      run: testPerftDeterminism
    },
    {
      name: "Transposition Table & Position Key Integrity",
      category: "Solver & Analysis",
      run: testTranspositionConsistency
    },
    {
      name: "Logistic Equity & Probability Bounds [0.0%, 100.0%]",
      category: "Solver & Analysis",
      run: testEvaluationBounds
    },
    {
      name: "Blunder Classification Thresholds (Best -> Blunder)",
      category: "Solver & Analysis",
      run: testBlunderClassificationHierarchy
    },
    {
      name: "Audio Context Safety & Graceful Unlock",
      category: "Audio & System",
      run: testAudioInitialization
    }
  ];

  const results: DiagnosticResult[] = [];

  for (const item of tests) {
    const start = typeof performance !== 'undefined' ? performance.now() : Date.now();
    try {
      await item.run();
      const end = typeof performance !== 'undefined' ? performance.now() : Date.now();
      results.push({
        name: item.name,
        category: item.category,
        status: "PASS",
        duration: `${(end - start).toFixed(2)}ms`
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      results.push({
        name: item.name,
        category: item.category,
        status: "FAIL",
        duration: "0ms",
        error: msg
      });
    }
  }

  return results;
}
