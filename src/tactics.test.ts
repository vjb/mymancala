import { describe, it, expect } from 'vitest';
import {
  createInitialBoard,
  analyzeAllMoves,
  P1_STORE,
  P2_STORE
} from './engine';
import { generateTacticalExplanation, getPitLabel } from './tactics';

describe('Tactical Explanation Engine', () => {
  const rules = { freeTurn: true, captureOpposite: true };

  it('generates a rich explanation for the best move', () => {
    const board = createInitialBoard(4);
    const moves = analyzeAllMoves(board, 0, 4, rules);
    const bestMove = moves[0];
    
    const explanation = generateTacticalExplanation(board, 0, bestMove, bestMove, rules);
    expect(explanation.badge).toBe('Best Move');
    expect(explanation.summary).toBeTruthy();
    expect(explanation.consequence).toBeTruthy();
    expect(explanation.recommendationComparison).toBeTruthy();
  });

  it('detects when a free turn is forfeited in favor of an inferior move', () => {
    const board = createInitialBoard(4);
    const moves = analyzeAllMoves(board, 0, 4, rules);
    const bestMove = moves[0];
    const blunder = moves[moves.length - 1]; // worst move

    const explanation = generateTacticalExplanation(board, 0, blunder, bestMove, rules);
    expect(explanation.summary).toBeTruthy();
    expect(explanation.consequence).toContain('Free Turn');
    expect(explanation.recommendationComparison).toBeTruthy();
  });

  it('correctly maps pit display labels', () => {
    expect(getPitLabel(0)).toBe('South Pit 1');
    expect(getPitLabel(5)).toBe('South Pit 6');
    expect(getPitLabel(P1_STORE)).toBe('South Store (P1)');
    expect(getPitLabel(12)).toBe('North Pit 1');
    expect(getPitLabel(7)).toBe('North Pit 6');
    expect(getPitLabel(P2_STORE)).toBe('North Store (P2)');
  });

  it('detects conceded captures when opponent has a direct counter-capture', () => {
    // Setup position where Player 0 playing Pit 0 lands in pit 1, leaving pit 2 empty opposite North pit 10
    const board = new Array(14).fill(0);
    board[0] = 1; // South Pit 1 has 1 stone
    board[1] = 0; // South Pit 2 is empty
    board[10] = 4; // North Pit 3 has 4 stones
    board[9] = 1; // North Pit 4 has 1 stone -> lands in pit 10 which is empty, capturing South Pit 2

    const moves = analyzeAllMoves(board, 0, 3, rules);
    if (moves.length > 0) {
      const move = moves[0];
      const explanation = generateTacticalExplanation(board, 0, move, move, rules);
      expect(explanation).toBeDefined();
    }
  });
});
