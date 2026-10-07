# Mancala Coach

> A Mancala (Kalah) game with a built-in trainer, inspired by **GNU Backgammon**: play for fun, and switch on the analysis when you want to get better. Mobile-first, runs entirely in the browser, and needs no account.

---

## Features

- **Play first, learn if you want**: a clean board, with the coach and hints on toggles.
- **Search engine**: minimax with alpha-beta pruning and a transposition table. It ranks every legal move, grades each as *Excellent (Best)*, *Good*, *Inaccuracy*, *Mistake* or *Blunder*, and shows the main line.
- **Live Stone Advantage**: the position is shown as a stone lead (for example `South +2.0 stones`, or `Even`) instead of intimidating win percentages.
- **Coach mode**: warns before a mistake or blunder, with plain-language explanations (immediate effect, the opponent's reply, why another move is better). You can take back, play the best move, or confirm anyway.
- **Move hints and hover/touch previews**: toggleable best-move marks, and a preview of where a move will land, including free turns and captures.
- **Post-game review**: accuracy, an estimated rating, and move badges.
- **Opponents**: bot personas with different search depths and banter. The computer plays at a calm pace, adjustable in settings.
- **Game modes**: vs Engine, AI Duel, Pass & Play, and a Position Sandbox.
- **How to Play guide**: a quick visual rules guide from the bottom tray.
- **Mobile-first layout**: no horizontal scrolling, a fixed five-item bottom tray (Board, Analysis, Coach, Rules, Settings), and haptic feedback.
- **Themes**: Walnut, Clay and Slate. Your choice and settings are saved in the browser.
- **Synthesized audio** via the Web Audio API, with no media files.

---

## Getting Started

Prerequisites: [Node.js](https://nodejs.org/) v18+ and `npm`.

```bash
git clone https://github.com/vjb/mymancala.git
cd mymancala
npm install
npm run dev      # http://localhost:5173
```

Other commands:

```bash
npm test         # run the vitest suite
npm run build    # type-check and build to dist/
```

To try it on a phone on the same network, run the dev server and open `http://<your-computer-ip>:5173`.

---

## Project Layout

| Path | Purpose |
|---|---|
| `src/engine.ts` | Rules (`simulateMove`), search, move analysis and grading |
| `src/tactics.ts` | Plain-language tactical explanations |
| `src/bots.ts` | Bot personas and banter |
| `src/App.tsx` | Main UI and game state |
| `src/RulesModal.tsx`, `src/GameReviewModal.tsx` | Rules guide and post-game review |
| `src/theme.ts`, `src/Pebble.tsx` | Skins and pebble rendering |
| `src/sound.ts`, `src/haptics.ts` | Audio and vibration |
| `src/preflight-diagnostics.ts` | In-app invariant self-tests |

---

## Kalah Rules Implemented

1. **Board**: two rows of 6 pits plus a store (Kalah) at each end.
2. **Sowing**: pick up all stones from a pit and drop one into each following pit counter-clockwise, including your own store but skipping your opponent's.
3. **Free turn**: if your last stone lands in your store, you move again.
4. **Capture**: if your last stone lands in an empty pit on your side and the opposite pit has stones, you capture them plus your landing stone.
5. **Game end**: when one side is empty, the remaining stones go to their owner's store. Most stones wins.

---

## Roadmap

The next major phase aims to make this a full trainer for all ages:

- A toggleable "lens" system with presets (Just Play / Hints / Coach / Full Analysis).
- Engine correctness work and exact evaluation where feasible.
- A mistake log, drills from your own errors, and a local rating ladder.
- A daily puzzle, streaks and badges.
- More variants (Oware, Ayo, Bao, Congkak/Dakon), an installable offline app, translations, and accessibility features.

---

## License

MIT
