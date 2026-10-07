# BRIEFING — 2026-10-07T05:45:00Z

## Mission
Investigate and design Mistake Log persistence (mancala_mistakes_v1), Leitner spaced-repetition drills, upgraded Game Review modal, and App.tsx line count guard for Phase 2 Trainer.

## 🔒 My Identity
- Archetype: explorer
- Roles: investigation, synthesis
- Working directory: c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m2_explorer_3
- Original parent: 85856d3d-5ca8-4fac-8578-3161a39fe3a5
- Milestone: phase-2-trainer

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- Accessible strictly from Coach tab (NEVER a 6th tray item!)
- Keep src/App.tsx strictly < 300 lines (currently at 285 lines)
- Storage key: mancala_mistakes_v1 capped at 200 items, newest first
- Simple Leitner boxes: Box 1 (1 day), Box 2 (3 days), Box 3 (7 days)

## Current Parent
- Conversation ID: 85856d3d-5ca8-4fac-8578-3161a39fe3a5
- Updated: 2026-10-07T05:40:11Z

## Investigation State
- **Explored paths**:
  - `src/App.tsx` (285 lines, verified line count and modal cluster)
  - `src/GameReviewModal.tsx` & `src/game/reviewHelper.ts` (current review state and grading)
  - `src/components/panels/CoachPanel.tsx` (current coach warning layout)
  - `src/components/shell/BottomTray.tsx` (verified exactly 5 items, coach button testids)
  - `src/components/board/Board.tsx` (reusable board rendering for drills)
  - `src/game/useGame.ts` & `src/game/gameTypes.ts` (move execution, tutor interception, game moves history)
  - `src/tactics.ts` (deterministic tactical explanations engine)
  - `src/rules/kalah.ts` & `src/rules/types.ts` (board geometry and RuleSet contract)
  - `src/workers/searchClient.ts` & `src/workers/protocol.ts` (async search and cancellation)
  - `.agents/teamwork/m2_explorer_1/DISPATCH.md` & `m2_explorer_2/DISPATCH.md` (peer explorer boundaries)
- **Key findings**:
  - `mancala_mistakes_v1` requires `{ id, rulesId, position: number[], turn, played, best, loss, grade, at, box, nextReviewAt, solved, explanationCode }` schema.
  - Leitner box intervals: Box 1 = 1d (86.4M ms), Box 2 = 3d (259.2M ms), Box 3 = 7d (604.8M ms).
  - 200-item cap must evict oldest items while de-duplicating identical positions.
  - Drill Trainer must NOT add a 6th tray item; it is housed in Coach tab (`mobileTab === 'coach'`).
  - Game Review Modal needs async worker review with progress bar and cancellation, top 3 swing moments, and "Practice these" trigger.
  - App.tsx is at 285 lines; extracting `AppModals.tsx` drops line count to ~245 lines, easily passing the < 300 line gate.
- **Unexplored areas**: none (all assigned scope explored and synthesized).

## Key Decisions Made
- `position` in mistake schema will store the 14-element board array `number[]` plus `turn: 0 | 1` so drills render instantaneously without replaying full game moves.
- Deduplication rule: If the user plays the same mistake from the same position, update the record and demote to Box 1 at head of queue.
- Coach view architecture: Bottom tray retains exactly 5 items (`data-testid="tutor-toggle"` opens/toggles Coach view), housing Tutor settings, Leitner deck stats, and DrillView.
- App decomposition: Extract modal group into `src/components/shell/AppModals.tsx` to guard `< 300` lines in `App.tsx`.

## Artifact Index
- handoff.md — Comprehensive architectural specification and handoff report.
