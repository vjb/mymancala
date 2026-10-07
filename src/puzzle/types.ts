export type PuzzleTheme = 'capture' | 'go-again chain' | 'starve';
export type PuzzleDifficulty = 'easy' | 'medium' | 'hard';

export interface Puzzle {
  id: string;
  rulesId: string;
  board: number[];           // 14-element board array [P0 pits (0..5), P0 store (6), P1 pits (7..12), P1 store (13)]
  turn: 0 | 1;               // Player whose turn it is
  solution: number[];        // Winning sequence of pits (or best move)
  theme: PuzzleTheme;
  difficulty: PuzzleDifficulty;
  title: string;
  hint: {
    theme: string;
    pit: number;
  };
}

export interface PuzzleAttemptResult {
  solved: boolean;
  tries: number;
  message: string;
}
