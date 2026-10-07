import { RuleSet, GameState } from '../rules/types';
import { kalahRuleSet } from '../rules/kalah';
import { solveExact, getTerminalScore, countPlayableStones } from '../solver/endgame';
import { Puzzle, PuzzleTheme, PuzzleDifficulty } from './types';

export interface EvaluatedMove {
  move: number;
  score: number;
  extraTurn: boolean;
  captured: number;
  pv: number[];
}

export function evaluateMovesWithExactSolver(
  rules: RuleSet,
  s: GameState
): EvaluatedMove[] {
  const legal = rules.legalMoves(s);
  if (legal.length === 0) return [];

  const results: EvaluatedMove[] = [];

  for (const move of legal) {
    const res = rules.apply(s, move);
    let score: number;
    let pv: number[] = [move];

    if (res.state.over || rules.isTerminal(res.state)) {
      const term = getTerminalScore(rules, res.state);
      score = res.state.turn === s.turn ? term : -term;
    } else if (res.state.turn === s.turn) {
      // Extra turn
      const child = solveExact(rules, res.state, 50_000);
      if (!child) continue;
      score = child.value;
      pv = [move, ...child.best];
    } else {
      // Opponent turn
      const child = solveExact(rules, res.state, 50_000);
      if (!child) continue;
      score = -child.value;
      pv = [move, ...child.best];
    }

    results.push({
      move,
      score,
      extraTurn: res.extraTurn,
      captured: res.captured,
      pv,
    });
  }

  results.sort((a, b) => b.score - a.score);
  return results;
}

export function findUniqueBestPuzzle(
  rules: RuleSet,
  board: number[],
  turn: 0 | 1 = 0,
  minAdvantage = 2
): Puzzle | null {
  const state: GameState = { board: [...board], turn, over: false };
  const playable = countPlayableStones(rules, state);
  if (playable > 14 || playable < 3) return null;

  const evaluated = evaluateMovesWithExactSolver(rules, state);
  if (evaluated.length < 2) return null;

  const best = evaluated[0];
  const secondBest = evaluated[1];

  if (best.score - secondBest.score < minAdvantage) {
    return null;
  }

  // Determine theme
  let theme: PuzzleTheme = 'starve';
  if (best.extraTurn) {
    theme = 'go-again chain';
  } else if (best.captured > 0) {
    theme = 'capture';
  }

  // Determine difficulty
  let difficulty: PuzzleDifficulty = 'medium';
  if (playable <= 7 && (best.extraTurn || best.captured >= 2)) {
    difficulty = 'easy';
  } else if (playable >= 11 || best.pv.length >= 3) {
    difficulty = 'hard';
  }

  return {
    id: `puzzle-${board.slice(0, 14).join('-')}-${turn}`,
    rulesId: rules.id,
    board: [...board],
    turn,
    solution: best.pv.slice(0, Math.min(best.pv.length, 3)),
    theme,
    difficulty,
    title: theme === 'go-again chain' 
      ? 'Chaining Free Turns' 
      : theme === 'capture' 
        ? 'Decisive Ambush' 
        : 'Strategic Squeeze',
    hint: {
      theme: theme === 'go-again chain' 
        ? 'Look for a move that lands directly in your store.'
        : theme === 'capture'
          ? 'Find an empty pit on your side you can land in.'
          : 'Deprive your opponent of constructive moves.',
      pit: best.move,
    },
  };
}
