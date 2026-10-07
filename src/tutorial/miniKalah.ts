/**
 * src/tutorial/miniKalah.ts
 * 2x3 Mini-Kalah engine for the 8-step interactive tutorial.
 * Perfectly sized for 360px mobile viewports (8 pits total: 6 pits + 2 stores).
 */

export const MINI_TOTAL_PITS = 8;
export const MINI_P1_PITS = [0, 1, 2] as const;
export const MINI_P1_STORE = 3;
export const MINI_P2_PITS = [4, 5, 6] as const;
export const MINI_P2_STORE = 7;

export function miniOppositePit(pit: number): number {
  return 6 - pit; // opposite of 0 is 6; opposite of 1 is 5; opposite of 2 is 4
}

export interface MiniBoardState {
  board: number[]; // 8 elements
  turn: 0 | 1;
  over: boolean;
}

export interface MiniMoveResult {
  state: MiniBoardState;
  earnedFreeTurn: boolean;
  capturedStones: number;
  lastLanding: number;
}

export function applyMiniMove(s: MiniBoardState, pit: number): MiniMoveResult {
  const board = [...s.board];
  let stones = board[pit];
  board[pit] = 0;

  let current = pit;
  while (stones > 0) {
    current = (current + 1) % MINI_TOTAL_PITS;
    // Skip opponent's store (if P1 moving, skip store 7; if P2 moving, skip store 3)
    if (s.turn === 0 && current === MINI_P2_STORE) continue;
    if (s.turn === 1 && current === MINI_P1_STORE) continue;

    board[current]++;
    stones--;
  }

  const lastLanding = current;
  let earnedFreeTurn = false;
  let capturedStones = 0;

  // Free turn if landed in own store
  if (s.turn === 0 && lastLanding === MINI_P1_STORE) {
    earnedFreeTurn = true;
  }

  // Opposite capture if landed in empty pit on own side
  if (
    s.turn === 0 &&
    (MINI_P1_PITS as readonly number[]).includes(lastLanding) &&
    board[lastLanding] === 1
  ) {
    const opp = miniOppositePit(lastLanding);
    if (board[opp] > 0) {
      capturedStones = board[opp] + 1;
      board[opp] = 0;
      board[lastLanding] = 0;
      board[MINI_P1_STORE] += capturedStones;
    }
  }

  // Terminal check
  const p1Empty = MINI_P1_PITS.every(p => board[p] === 0);
  const p2Empty = MINI_P2_PITS.every(p => board[p] === 0);
  let isOver = false;

  if (p1Empty || p2Empty) {
    isOver = true;
    for (const p of MINI_P1_PITS) {
      board[MINI_P1_STORE] += board[p];
      board[p] = 0;
    }
    for (const p of MINI_P2_PITS) {
      board[MINI_P2_STORE] += board[p];
      board[p] = 0;
    }
  }

  return {
    state: {
      board,
      turn: earnedFreeTurn && !isOver ? 0 : 1,
      over: isOver
    },
    earnedFreeTurn,
    capturedStones,
    lastLanding
  };
}

export interface TutorialStepConfig {
  step: number;
  titleKey: string;
  descKey: string;
  actionKey: string;
  successKey?: string;
  initialBoard: number[];
  allowedMovePit: number | null; // null if informative step (Next enabled immediately)
  expectedOutcome?: {
    freeTurn?: boolean;
    capture?: boolean;
    over?: boolean;
  };
}

export const TUTORIAL_STEPS: TutorialStepConfig[] = [
  {
    step: 1,
    titleKey: 'tutorial.step1.title',
    descKey: 'tutorial.step1.desc',
    actionKey: 'tutorial.step1.action',
    initialBoard: [2, 2, 2, 0, 2, 2, 2, 0],
    allowedMovePit: null
  },
  {
    step: 2,
    titleKey: 'tutorial.step2.title',
    descKey: 'tutorial.step2.desc',
    actionKey: 'tutorial.step2.action',
    successKey: 'tutorial.step2.success',
    initialBoard: [0, 3, 0, 0, 2, 2, 2, 0],
    allowedMovePit: 1
  },
  {
    step: 3,
    titleKey: 'tutorial.step3.title',
    descKey: 'tutorial.step3.desc',
    actionKey: 'tutorial.step3.action',
    initialBoard: [0, 0, 1, 1, 3, 2, 2, 0],
    allowedMovePit: null
  },
  {
    step: 4,
    titleKey: 'tutorial.step4.title',
    descKey: 'tutorial.step4.desc',
    actionKey: 'tutorial.step4.action',
    successKey: 'tutorial.step4.success',
    initialBoard: [0, 0, 5, 1, 0, 0, 0, 0],
    allowedMovePit: 2
  },
  {
    step: 5,
    titleKey: 'tutorial.step5.title',
    descKey: 'tutorial.step5.desc',
    actionKey: 'tutorial.step5.action',
    successKey: 'tutorial.step5.success',
    initialBoard: [2, 0, 1, 2, 2, 2, 2, 0],
    allowedMovePit: 2,
    expectedOutcome: { freeTurn: true }
  },
  {
    step: 6,
    titleKey: 'tutorial.step6.title',
    descKey: 'tutorial.step6.desc',
    actionKey: 'tutorial.step6.action',
    successKey: 'tutorial.step6.success',
    initialBoard: [1, 0, 0, 3, 2, 4, 1, 0],
    allowedMovePit: 0,
    expectedOutcome: { capture: true }
  },
  {
    step: 7,
    titleKey: 'tutorial.step7.title',
    descKey: 'tutorial.step7.desc',
    actionKey: 'tutorial.step7.action',
    successKey: 'tutorial.step7.success',
    initialBoard: [0, 0, 1, 8, 2, 1, 1, 3],
    allowedMovePit: 2,
    expectedOutcome: { over: true }
  },
  {
    step: 8,
    titleKey: 'tutorial.step8.title',
    descKey: 'tutorial.step8.desc',
    actionKey: 'tutorial.step8.action',
    initialBoard: [0, 0, 0, 9, 0, 0, 0, 7],
    allowedMovePit: null
  }
];
