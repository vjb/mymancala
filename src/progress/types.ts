export interface GameProgressEvent {
  type: 'game_won' | 'game_played' | 'capture_made' | 'puzzle_solved' | 'tutorial_completed' | 'variant_played';
  flawless?: boolean;
  captures?: number;
  variantId?: string;
}

export interface ProgressState {
  streak: number;
  bestStreak: number;
  lastDay: number;          // UTC day index of last activity
  lastFreezeWeek: number;   // Epoch week index of last auto-applied freeze
  badges: string[];         // Unlocked badge IDs
  stats: {
    puzzlesSolved: number;
    gamesWon: number;
    gamesPlayed: number;
    capturesMade: number;
    flawlessWins: number;
    tutorialCompleted: boolean;
    variantsPlayed: string[];
  };
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'milestone' | 'streak' | 'puzzle' | 'mastery';
  check: (progress: ProgressState, event?: GameProgressEvent) => boolean;
}
