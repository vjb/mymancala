import { Badge } from './types';

export const BADGES: Badge[] = [
  {
    id: 'first_win',
    name: 'First Victory',
    description: 'Win your first game of Mancala.',
    icon: 'Trophy',
    category: 'milestone',
    check: (p, e) => p.stats.gamesWon >= 1 || e?.type === 'game_won',
  },
  {
    id: 'first_capture',
    name: 'First Ambush',
    description: 'Execute a cross-board capture.',
    icon: 'Swords',
    category: 'milestone',
    check: (p, e) => p.stats.capturesMade >= 1 || e?.type === 'capture_made',
  },
  {
    id: 'streak_3',
    name: 'Habit Forming',
    description: 'Maintain a 3-day play streak.',
    icon: 'Flame',
    category: 'streak',
    check: (p) => p.streak >= 3 || p.bestStreak >= 3,
  },
  {
    id: 'streak_7',
    name: 'Master of Rhythm',
    description: 'Maintain a 7-day play streak.',
    icon: 'Sparkles',
    category: 'streak',
    check: (p) => p.streak >= 7 || p.bestStreak >= 7,
  },
  {
    id: 'puzzles_10',
    name: 'Tactical Prodigy',
    description: 'Solve 10 daily puzzles.',
    icon: 'Brain',
    category: 'puzzle',
    check: (p) => p.stats.puzzlesSolved >= 10,
  },
  {
    id: 'flawless_win',
    name: 'Flawless Mind',
    description: 'Win a match without committing any mistakes.',
    icon: 'ShieldCheck',
    category: 'mastery',
    check: (p, e) => p.stats.flawlessWins >= 1 || (e?.type === 'game_won' && !!e.flawless),
  },
  {
    id: 'learned_tutorial',
    name: 'The Scholar',
    description: 'Complete the interactive tutorial.',
    icon: 'GraduationCap',
    category: 'milestone',
    check: (p, e) => p.stats.tutorialCompleted || e?.type === 'tutorial_completed',
  },
  {
    id: 'world_explorer',
    name: 'World Explorer',
    description: 'Play a game in all three rule variants.',
    icon: 'Compass',
    category: 'mastery',
    check: (p) => {
      const vars = new Set(p.stats.variantsPlayed);
      return vars.has('kalah') && vars.has('oware') && vars.has('sow-and-score');
    },
  },
];

export function getBadgeById(id: string): Badge | undefined {
  return BADGES.find(b => b.id === id);
}
