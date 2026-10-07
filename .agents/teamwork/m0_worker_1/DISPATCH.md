# DISPATCH — m0_worker_1

## Task Assignment
- Milestone: M0 (Phase 0 Foundation)
- Role: teamwork_preview_worker
- Working Directory: c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m0_worker_1
- Parent Conversation ID: 85856d3d-5ca8-4fac-8578-3161a39fe3a5
- Input Specifications:
  - c:\Users\vjbel\hacks\mymancala\.agents\teamwork\ORIGINAL_REQUEST.md
  - c:\Users\vjbel\hacks\mymancala\PROJECT.md
  - c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m0_explorer_1\handoff.md
  - c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m0_explorer_2\handoff.md
  - c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m0_explorer_3\handoff.md

## MANDATORY INTEGRITY WARNING
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Objective
Implement Milestone M0 (Phase 0 Foundation) per the comprehensive designs in `m0_explorer_1`, `m0_explorer_2`, and `m0_explorer_3`:
1. RuleSet & Kalah Geometry (`src/rules/types.ts`, `src/rules/kalah.ts`, `src/rules/index.ts`, `src/rules/kalah.test.ts`, adapt `src/engine.ts`).
2. Web Worker Search Protocol & Client (`src/workers/protocol.ts`, `src/workers/search.worker.ts`, `src/workers/searchClient.ts`).
3. Replay Autosave (`mancala_game_v1`) & Persistent State (`src/lib/storage.ts`).
4. Monolith Decomposition of `src/App.tsx` down to < 300 lines with pure `src/game/gameReducer.ts`, `src/game/useGame.ts`, and extracted components under `src/components/` while strictly preserving all 35+ `data-testid` attributes.
5. Responsive Principal Variation (`src/components/panels/PVDisplay.tsx`, `PVSheet.tsx`).
6. Playwright Setup: install `@playwright/test`, add `playwright.config.ts`, `e2e/no-hscroll.spec.ts`, `e2e/tray.spec.ts`.
7. Verification: Run `npx tsc --noEmit`, `npm test`, `npm run build`, and `npx playwright test`. Ensure all tests pass.
8. Maintain progress log in `docs/plan/PROGRESS.md`.

Write your handoff report to `c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m0_worker_1\handoff.md`.
Notify parent via send_message.

## 2026-10-07T02:00:17Z
**Context**: Milestone M0 Foundation implementation
**Content**: Liveness check: What is your current status? Which steps are completed, and are you currently running verification commands or tests?
**Action**: Please report current progress and update progress.md.
