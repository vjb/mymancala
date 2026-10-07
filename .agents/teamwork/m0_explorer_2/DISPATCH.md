# DISPATCH — m0_explorer_2

## Task Assignment
- Milestone: M0 (Phase 0 Foundation)
- Role: teamwork_preview_explorer
- Focus: `src/App.tsx` monolith decomposition to < 300 lines, state management (`gameReducer`), component hierarchy, and preserved testids.
- Working Directory: c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m0_explorer_2
- Parent Conversation ID: 85856d3d-5ca8-4fac-8578-3161a39fe3a5
- Mandatory Inputs:
  - c:\Users\vjbel\hacks\mymancala\.agents\teamwork\ORIGINAL_REQUEST.md
  - c:\Users\vjbel\hacks\mymancala\PROJECT.md
  - docs/plan/phase-0-foundation.md
  - src/App.tsx
  - src/lenses.ts
  - src/theme.ts

## Objective
Analyze the exact technical decomposition of the 2,471-line `src/App.tsx`:
1. Design `src/game/gameTypes.ts`, `src/game/gameReducer.ts` (pure functional reducer handling `MOVE`, `UNDO`, `RESET`, `SET_MODE`, `SET_DEPTH`, etc.), and `src/game/useGame.ts`.
2. Map out extracted presentational subcomponents:
   - `src/components/board/Board.tsx`, `PitButton.tsx`, `StorePit.tsx`
   - `src/components/shell/Header.tsx`, `TurnBanner.tsx`, `BottomTray.tsx`, `EvalGauge.tsx`
   - `src/components/panels/AnalysisPanel.tsx`, `CoachPanel.tsx`, `SettingsPanel.tsx`, `PVSheet.tsx`
3. Explicitly verify how each of the 35+ preserved `data-testid` attributes (listed in `PROJECT.md` and `docs/plan/README.md`) will be retained with exact props and behavior.
4. Ensure target `src/App.tsx` is < 300 lines.

Write handoff report to `c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m0_explorer_2\handoff.md`.
Notify parent via send_message.

## 2026-10-07T01:22:40Z
[Message] sender=85856d3d-5ca8-4fac-8578-3161a39fe3a5
MANDATORY FIRST STEP: Read the original user request at:
c:\Users\vjbel\hacks\mymancala\.agents\teamwork\ORIGINAL_REQUEST.md
Also read PROJECT.md at:
c:\Users\vjbel\hacks\mymancala\PROJECT.md
And your task assignment at:
c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m0_explorer_2\DISPATCH.md

Inspect:
- docs/plan/phase-0-foundation.md
- src/App.tsx
- src/lenses.ts
- src/theme.ts

Analyze and provide concrete architectural plan for:
1. Decomposing src/App.tsx (2,471 lines) to < 300 lines.
2. State architecture: src/game/gameTypes.ts, src/game/gameReducer.ts, src/game/useGame.ts.
3. Component hierarchy: src/components/board/, src/components/panels/, src/components/shell/.
4. Comprehensive data-testid mapping verifying every preserved testid from README.md / PROJECT.md is intact.

Write your report to c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m0_explorer_2\handoff.md.
Send a message to your parent (ID: 85856d3d-5ca8-4fac-8578-3161a39fe3a5) when done.
