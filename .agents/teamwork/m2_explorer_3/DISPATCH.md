# Task Assignment: M2 Explorer 3 (Mistake Log, Leitner Drills & Review Upgrade)

## Objective
Analyze and provide concrete architectural specifications for:
1. **Mistake Log Persistence (`src/trainer/mistakes.ts`)**:
   - Storage key: `mancala_mistakes_v1` (capped at 200 items, newest first).
   - Schema: `{ id: string; rulesId: string; position: number[]; played: number; best: number; loss: number; grade: MoveGrade; at: number; box: number; nextReviewAt: number; solved: number; explanationCode?: string; }`.
   - Logging triggers: record non-best moves (or moves graded inaccuracy/mistake/blunder) made by human players.
2. **Leitner Spaced-Repetition Drill Trainer (`src/components/panels/DrillView.tsx` / `CoachPanel.tsx`)**:
   - Accessible strictly from Coach tab (NEVER a 6th tray item!).
   - Spaced repetition: simple Leitner boxes (Box 1: 1 day, Box 2: 3 days, Box 3: 7 days).
   - Interactive drill mode: presents board at mistake position, user picks a move on the drill board, verifies if chosen move matches best, reveals best move + deterministic explanation, advances/resets Leitner box.
   - Unit tests: Leitner scheduling, intervals, cap at 200 items.
3. **Upgraded Game Review Modal (`src/components/modals/GameReviewModal.tsx`)**:
   - Per-move grades, top 3 swing moments ("turning points"), accuracy score.
   - "Practice these" button feeding game mistakes into the mistake log and launching drill mode.
   - Worker-based asynchronous game review with cancellation and progress bar.
4. **App.tsx Line Count Guard**:
   - Keep `src/App.tsx` strictly `< 300 lines` (currently at 284 lines). Decompose review and drill triggers cleanly.

## Input Artifacts
- `c:\Users\vjbel\hacks\mymancala\.agents\teamwork\ORIGINAL_REQUEST.md`
- `c:\Users\vjbel\hacks\mymancala\docs\plan\phase-2-trainer.md`
- `c:\Users\vjbel\hacks\mymancala\src\components\panels\CoachPanel.tsx`
- `c:\Users\vjbel\hacks\mymancala\src\components\modals\GameReviewModal.tsx`
- `c:\Users\vjbel\hacks\mymancala\src\App.tsx`
- `c:\Users\vjbel\hacks\mymancala\src\game\useGame.ts`

## Deliverables
Write your comprehensive architectural report to `c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m2_explorer_3\handoff.md`.
Notify parent via `send_message`.

## 2026-10-07T05:40:11Z
You are m2_explorer_3.
Your working directory is c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m2_explorer_3.
Your caller/parent is the Project Orchestrator (ID: 85856d3d-5ca8-4fac-8578-3161a39fe3a5).
Analyze and provide concrete specifications for:
1. Mistake Log Persistence (src/trainer/mistakes.ts)
2. Leitner Spaced-Repetition Drill Trainer (src/components/panels/DrillView.tsx / CoachPanel.tsx)
3. Upgraded Game Review
4. App.tsx Line Count Guard
