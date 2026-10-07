import { describe, it, expect } from 'vitest';
import { createInitialGameState, gameReducer } from './gameReducer';
import { P1_STORE, P2_STORE } from '../engine';

describe('gameReducer Unit Test Suite', () => {
  it('creates initial game state with 48 stones and clean defaults', () => {
    const state = createInitialGameState(4);
    const totalStones = state.board.reduce((a, b) => a + b, 0);
    expect(totalStones).toBe(48);
    expect(state.board[P1_STORE]).toBe(0);
    expect(state.board[P2_STORE]).toBe(0);
    expect(state.currentPlayer).toBe(0);
    expect(state.isGameOver).toBe(false);
    expect(state.winner).toBeNull();
    expect(state.moveHistory).toEqual([]);
    expect(state.gameMode).toBe('pve');
  });

  it('handles APPLY_MOVE action accurately', () => {
    const state = createInitialGameState(4);
    const newBoard = [...state.board];
    newBoard[0] = 0;
    newBoard[1] = 5;

    const nextState = gameReducer(state, {
      type: 'APPLY_MOVE',
      payload: {
        newBoard,
        nextPlayer: 1,
        isGameOver: false,
        winner: null,
        earnedFreeTurn: false,
        capturedStones: 0,
        pitIndex: 0,
        initialStones: 4,
        lastLanding: 4,
        capturedFromPit: null
      }
    });

    expect(nextState.board).toEqual(newBoard);
    expect(nextState.currentPlayer).toBe(1);
    expect(nextState.moveHistory.length).toBe(1);
    expect(nextState.moveHistory[0].pit).toBe(0);
    expect(nextState.lastMovedPit).toBe(0);
    expect(nextState.lastMoveSummary?.pit).toBe(0);
  });

  it('handles RECORD_MOVE_EVALUATION action and updates matchStats', () => {
    const state = createInitialGameState(4);
    const nextState = gameReducer(state, {
      type: 'RECORD_MOVE_EVALUATION',
      payload: {
        chosenEval: {
          pit: 0,
          label: 'Pit 1',
          score: 10,
          winProb: 0.55,
          pv: [0, 7],
          freeTurn: false,
          captures: 0,
          resultingBoard: state.board,
          rank: 1,
          equityLoss: 0,
          scoreDiff: 0,
          classification: 'Excellent (Best)',
          badgeColor: 'bg-emerald-500/25'
        },
        player: 0,
        pitIndex: 0,
        capturedStones: 0,
        earnedFreeTurn: false
      }
    });

    expect(nextState.matchStats.p1Moves).toBe(1);
    expect(nextState.matchStats.p1TotalLoss).toBe(0);
    expect(nextState.gameMovesHistory.length).toBe(1);
    expect(nextState.gameMovesHistory[0].classification).toBe('Best');
  });

  it('handles UNDO_MOVE by reconstructing past state', () => {
    const initial = createInitialGameState(4);
    // Move pit 2: in Kalah, 4 stones from pit 2 lands in store 6 -> earned free turn
    const moved = gameReducer(initial, {
      type: 'APPLY_MOVE',
      payload: {
        newBoard: [4, 4, 0, 5, 5, 5, 1, 4, 4, 4, 4, 4, 4, 0],
        nextPlayer: 0,
        isGameOver: false,
        winner: null,
        earnedFreeTurn: true,
        capturedStones: 0,
        pitIndex: 2,
        initialStones: 4,
        lastLanding: 6,
        capturedFromPit: null
      }
    });

    expect(moved.moveHistory.length).toBe(1);
    const undone = gameReducer(moved, { type: 'UNDO_MOVE' });
    expect(undone.moveHistory.length).toBe(0);
    expect(undone.board).toEqual(initial.board);
    expect(undone.currentPlayer).toBe(0);
  });

  it('handles RESET_GAME preserving user preferences', () => {
    const state = createInitialGameState(4);
    state.searchDepth = 7;
    state.gameMode = 'pvp';
    state.sowSpeed = 'fast';

    const reset = gameReducer(state, { type: 'RESET_GAME' });
    expect(reset.board.reduce((a, b) => a + b, 0)).toBe(48);
    expect(reset.searchDepth).toBe(7);
    expect(reset.gameMode).toBe('pvp');
    expect(reset.sowSpeed).toBe('fast');
  });

  it('handles ADJUST_SANDBOX_PIT and clamps to non-negative', () => {
    const state = createInitialGameState(4);
    const next1 = gameReducer(state, {
      type: 'ADJUST_SANDBOX_PIT',
      payload: { pitIndex: 0, delta: 3 }
    });
    expect(next1.board[0]).toBe(7);

    const next2 = gameReducer(next1, {
      type: 'ADJUST_SANDBOX_PIT',
      payload: { pitIndex: 0, delta: -10 }
    });
    expect(next2.board[0]).toBe(0);
  });

  it('handles RESTORE_SAVED_GAME properly', () => {
    const state = createInitialGameState(4);
    const restored = gameReducer(state, {
      type: 'RESTORE_SAVED_GAME',
      payload: {
        gameMode: 'pvp',
        board: [0, 0, 0, 0, 0, 0, 24, 0, 0, 0, 0, 0, 0, 24]
      }
    });
    expect(restored.gameMode).toBe('pvp');
    expect(restored.board[6]).toBe(24);
  });
});
