import * as fs from 'fs';
import * as path from 'path';
import { kalahRuleSet } from '../src/rules/kalah';
import { findUniqueBestPuzzle } from '../src/puzzle/generate';
import { Puzzle } from '../src/puzzle/types';

function createRandomEndgameBoard(rng: () => number): number[] {
  // 14 pits: 0..5 (P0), 6 (P0 store), 7..12 (P1), 13 (P1 store)
  const board = new Array(14).fill(0);
  const totalStones = 48;
  const playableCount = 4 + Math.floor(rng() * 9); // 4 to 12 unbanked stones
  const bankedCount = totalStones - playableCount;
  
  // Distribute banked stones roughly equally
  const p0Banked = Math.floor(bankedCount / 2) + Math.floor((rng() - 0.5) * 6);
  board[6] = Math.max(0, Math.min(bankedCount, p0Banked));
  board[13] = bankedCount - board[6];

  // Distribute playable stones among pits (P0 pits 0..5, P1 pits 7..12)
  const playablePits = [0, 1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 12];
  
  // Ensure P0 has at least 1 stone and P1 has at least 1 stone
  const p0Pit = Math.floor(rng() * 6);
  const p1Pit = 7 + Math.floor(rng() * 6);
  board[p0Pit] = 1;
  board[p1Pit] = 1;

  let remaining = playableCount - 2;
  while (remaining > 0) {
    const pit = playablePits[Math.floor(rng() * playablePits.length)];
    if (board[pit] < 6) {
      board[pit]++;
      remaining--;
    }
  }

  return board;
}

// Simple seeded PRNG (LCG)
function makeRng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

async function main() {
  console.log('Generating 366 offline Mancala puzzles verified by exact solver...');
  const puzzles: Puzzle[] = [];
  const seenKeys = new Set<string>();
  const rng = makeRng(20261007);

  let attempts = 0;
  while (puzzles.length < 366 && attempts < 10000) {
    attempts++;
    const board = createRandomEndgameBoard(rng);
    const turn = 0; // P0 puzzle

    const puzzle = findUniqueBestPuzzle(kalahRuleSet, board, turn, 2);
    if (puzzle) {
      const key = puzzle.board.join(',');
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        puzzle.id = `daily-puzzle-${puzzles.length + 1}`;
        puzzles.push(puzzle);
        if (puzzles.length % 50 === 0) {
          console.log(`Generated ${puzzles.length}/366 puzzles (attempts: ${attempts})...`);
        }
      }
    }
  }

  console.log(`Successfully generated ${puzzles.length} verified puzzles in ${attempts} attempts!`);
  const outPath = path.resolve(process.cwd(), 'src/puzzle/data.json');
  fs.writeFileSync(outPath, JSON.stringify(puzzles, null, 2), 'utf-8');
  console.log(`Saved dataset to ${outPath}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
