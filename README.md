# GNU Mancala (2030s Edition)

> A state-of-the-art Mancala (Kalah) tournament board and real-time analytical evaluation engine inspired by **GNU Backgammon** and **eXtreme Gammon (XG)**.

---

## 🌟 Key Features

- **Minimax & Alpha-Beta Transposition Search Engine**: Real-time evaluation calculating multi-ply lookahead (PV sequences), exact win probability %, stone equity margins, and PR (Performance Rating blunder classifications: *Best*, *Inaccuracy*, *Mistake*, *Blunder*).
- **GNU-style Evaluation Meter & Candidate Move Table**: Live win probability gauge with center-divider visual equity bar, ranking every legal pit move with equity differentials, PV traces, and error classifications.
- **Dynamic Board with Holographic Hover Previews**: Visualizes the path trajectory, free turn indicators (landing in store), and opposite pit captures in real-time before clicking.
- **Interactive Tutor Mode**: Flags suboptimal moves in real time before execution, offering pedagogical advice and confirmation if a move sacrifices critical equity.
- **Multiple Game Modes**:
  - **vs GNU Engine (PvE)**: Play as South (P1) or North (P2) against an engine with search depth from 1 to 8 plies.
  - **AI vs AI Duel**: Automated self-play spectator mode with real-time duel speed controls.
  - **Pass & Play (PvP)**: Local 2-player mode.
  - **Position Sandbox**: Custom board editor allowing incremental stone adjustments on any pit or store.
- **Synthesized Web Audio Engine**: Procedural stone sowing clicks (with dynamic pitch offset based on pit stone count), capture chords, bonus turn chimes, and victory arpeggios via the Web Audio API without external media files.
- **Flexible Ruleset & Customization**: Configure starting stones (3, 4, 5, or 6 per pit), toggle bonus free turn on store finish, and toggle opposite pit captures.
- **GNU Backgammon Performance Rating (PR)**: Tracks total equity loss across turns and calculates cumulative session PR and blunder counts.

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- `npm`

### Installation

```bash
# Clone the repository
git clone https://github.com/vjb/mymancala.git
cd mymancala

# Install dependencies
npm install
```

### Running Locally

```bash
# Start Vite development server
npm run dev
```

Visit `http://localhost:5173` in your browser.

### Building for Production

```bash
npm run build
```

The production bundle will be generated in `dist/`.

---

## 📜 Mancala / Kalah Rules Implemented

1. **Board Layout**: Two rows of 6 pits each, plus a store (Kalah) on each end.
   - **Player 1 (South)**: Pits 1–6 (indices 0–5) and Right Store (index 6).
   - **Player 2 (North)**: Pits 1–6 (indices 12 down to 7) and Left Store (index 13).
2. **Sowing**: Stones are picked up from a pit and dropped one-by-one counter-clockwise into subsequent pits and the player's own store (skipping the opponent's store).
3. **Free Turn**: If the last stone lands in the current player's store, that player gets an immediate bonus turn.
4. **Capture**: If the last stone lands in an empty pit belonging to the player and the directly opposite pit has stones, both the landing stone and the opponent's stones are captured and placed in the player's store.
5. **Game End**: When all pits on either side are empty, all remaining stones on the board are swept into their respective player's store. The player with the most stones wins!

---

## 📄 License

MIT
