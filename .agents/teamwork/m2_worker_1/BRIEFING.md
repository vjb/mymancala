# BRIEFING — 2026-10-07T05:50:00Z

## Mission
Implement Milestone M2 (Phase 2: The Trainer & Exact Endgame Solver): exact endgame solver with 500-pos benchmark, truthful eval, move classification & error rate tracking, deterministic explanations in en/ar/es, rating ladder & bot tournament calibration, mistake log persistence (200-cap Leitner), interactive drills in Coach tab, upgraded game review, AppModals extraction ensuring App.tsx < 300 lines, and E2E trainer tests.

## 🔒 My Identity
- Archetype: implementer / qa / specialist
- Roles: implementer, qa, specialist
- Working directory: c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m2_worker_1
- Original parent: 85856d3d-5ca8-4fac-8578-3161a39fe3a5
- Milestone: M2 (Phase 2: The Trainer & Exact Endgame Solver)

## 🔒 Key Constraints
- 5-Item Bottom Tray invariant: exactly 5 buttons (`Board`, `Analysis`, `Coach`, `Rules`, `Settings`), drills in Coach tab, NEVER 6 buttons.
- App.tsx line count strictly < 300 lines (extract modals to AppModals.tsx).
- Truthful evaluation: exact positions show 0%, 50%, or 100% win rate only, "about +X stones" for estimate, bypass /3.5 in useGame when exact.
- 500-Position benchmark: src/solver/endgame.test.ts compares solveExact against independent unpruned reference minimax across 500 deterministic positions (<=14 active stones) with 0 mismatches.
- Deterministic explanations: pure functional explain(rules, before, move, analysis) with 10 engine-verified reason codes, 100% key parity across en.ts, ar.ts, es.ts.
- Mistake log cap: mancala_mistakes_v1 capped at 200 items (newest first).
- Zero external network calls, tracking pixels, or remote CDNs.
- Integrity: DO NOT CHEAT. All implementations genuine.

## Current Parent
- Conversation ID: 85856d3d-5ca8-4fac-8578-3161a39fe3a5
- Updated: 2026-10-07T05:50:00Z

## Task Summary
- **What to build**: Exact Endgame Solver (`src/solver/endgame.ts`, `src/solver/endgame.test.ts`), Truthful evaluation in `EvalGauge.tsx`, `AnalysisPanel.tsx`, `useGame.ts`, Move classification in `src/trainer/classify.ts`, Deterministic explanations in `src/trainer/explain.ts` & i18n in `en.ts`, `ar.ts`, `es.ts`, Elo rating in `src/trainer/rating.ts` & bot calibration in `scripts/bot-tournament.ts` -> `docs/plan/bot-calibration.md`, Mistake log & Leitner in `src/trainer/mistakes.ts`, `src/trainer/mistakes.test.ts`, Drills in `src/components/panels/DrillView.tsx` & Coach tab (`CoachPanel.tsx` / `CoachView.tsx`), `src/components/shell/AppModals.tsx` to keep `App.tsx` < 300 lines, upgraded `src/components/modals/GameReviewModal.tsx`, E2E tests `e2e/trainer.spec.ts`.
- **Success criteria**: `npx tsc --noEmit` clean, `npm test` passing with 500-pos benchmark, `npm run build` clean, `npx playwright test` clean, `App.tsx` < 300 lines, `PROGRESS.md` updated.
- **Interface contracts**: PROJECT.md, docs/plan/phase-2-trainer.md, Explorer handoffs 1, 2, 3.

## Change Tracker
- **Files modified**:
  - `src/solver/endgame.ts` (new): Negamax alpha-beta solver with TT, cached by rules.key(s).
  - `src/solver/endgame.test.ts` (new): 500-pos cross check vs unpruned reference minimax.
  - `src/workers/protocol.ts`, `search.worker.ts`, `searchClient.ts`: Integrated solveExact, truthful win prob.
  - `src/components/shell/EvalGauge.tsx`: Exact/Estimate badge, integer lead label, WCAG contrast.
  - `src/components/panels/AnalysisPanel.tsx`: Exact badge, integer win %, Moves vs Drills tabs.
  - `src/game/useGame.ts`: Bypass /3.5 for exact positions, isExactAnalysis export.
  - `src/trainer/classify.ts`, `classify.test.ts` (new): 5-tier classification & error rate.
  - `src/trainer/explain.ts`, `explain.test.ts` (new): 10 reason codes deterministic explanation.
  - `src/i18n/translations/en.ts`, `ar.ts`, `es.ts`: 100% key parity for explanations & ratings.
  - `src/trainer/rating.ts`, `rating.test.ts` (new): Elo rating ladder, level titles, gated numeric display.
  - `scripts/bot-tournament.ts` (new), `docs/plan/bot-calibration.md`: 1,200 match calibration report.
  - `src/trainer/mistakes.ts`, `mistakes.test.ts` (new): 200-cap Leitner mistake log.
  - `src/components/panels/DrillView.tsx` (new): Spaced repetition drill view with board.
  - `src/components/shell/AppModals.tsx` (new): Extracted modal container keeping App.tsx < 300 lines.
  - `src/App.tsx`: Decomposed to 278 lines.
  - `src/GameReviewModal.tsx`, `reviewHelper.ts`: Top 3 swing moments, "Practice these" button.
  - `e2e/trainer.spec.ts` (new): 16 Playwright E2E tests across 4 viewports.
  - `docs/plan/PROGRESS.md`: Phase 2 marked COMPLETED with detailed report.
- **Build status**: All passing (tsc clean, vitest 22/22 files 208/208 tests, vite build clean, playwright clean)
- **Pending issues**: None

## Quality Status
- **Build/test result**: Pass (tsc 0 errors, 208 vitest tests, 16 playwright trainer tests, 4 axe porcelain tests)
- **Lint status**: 0 errors
- **Tests added/modified**: +5 new test suites (endgame, classify, explain, rating, mistakes) + e2e/trainer.spec.ts

## Loaded Skills
- None explicitly assigned.

## Key Decisions Made
- Follow explorer handoff blueprints closely:
  1. `src/solver/endgame.ts` using negamax alpha-beta with TT, cached by `rules.key(s)`.
  2. `src/solver/endgame.test.ts` with unpruned reference minimax and 500-position seeded RNG test.
  3. `src/trainer/classify.ts` with 5 tiers (best, good, inaccuracy, mistake, blunder) based on stone equity loss.
  4. `src/trainer/explain.ts` with 10 reason codes and 100% key parity across `en.ts`, `ar.ts`, `es.ts`.
  5. `src/trainer/rating.ts` with `mancala_rating_v1`, K=32/K=16, level titles, gated numeric Elo.
  6. `src/trainer/mistakes.ts` with 200 cap, Leitner intervals (1d, 3d, 7d).
  7. `src/components/panels/DrillView.tsx` integrated in Coach panel, preserving 5-item tray.
  8. Extract `AppModals.tsx` to keep `App.tsx` well under 300 lines.
  9. Run bot tournament script to generate `docs/plan/bot-calibration.md`.

## Artifact Index
- `.agents/teamwork/m2_worker_1/DISPATCH.md` — Assignment
- `.agents/teamwork/m2_worker_1/BRIEFING.md` — Persistent state
- `.agents/teamwork/m2_worker_1/progress.md` — Liveness heartbeat
- `.agents/teamwork/m2_worker_1/handoff.md` — Final handoff
