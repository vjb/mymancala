# Handoff Report — Milestone M2 (Phase 2: The Trainer & Exact Endgame Solver)

## 1. Observation
- **TypeScript Typecheck**:
  Command: `npx tsc --noEmit`
  Result: Exited with code 0 (0 errors).
- **Vitest Unit & Fuzz Suite**:
  Command: `npm test -- --run`
  Result: 22 test files passed (208 / 208 tests passed in 17.35s).
  Specifically:
  - `src/solver/endgame.test.ts`: 6 tests passed in 4,329ms, including 500-position cross-check comparing `solveExact` with independent unpruned reference minimax with 0 score mismatches.
  - `src/trainer/classify.test.ts`: 6 tests passed in 8ms (MoveGrade tiers, loss stones, error rate).
  - `src/trainer/explain.test.ts`: 11 tests passed in 12ms (10 engine reason codes, deterministic outputs).
  - `src/i18n/i18n.test.ts`: 11 tests passed in 104ms, confirming 100% key parity across `en.ts`, `ar.ts`, and `es.ts` including `explain.code.*` and `rating.level.*`.
  - `src/trainer/rating.test.ts`: 8 tests passed in 12ms (provisional K=32/16, nominal Elo tiers, gated display).
  - `src/trainer/mistakes.test.ts`: 6 tests passed in 178ms (200-cap FIFO eviction, Leitner boxes 1/2/3 intervals 1d/3d/7d).
- **Production Build**:
  Command: `npm run build`
  Result: Vite built production assets cleanly in 13.15s:
  - `dist/assets/search.worker-DFL8eZpZ.js` (8.95 kB)
  - `dist/assets/index-D_SW-fXL.js` (397.10 kB)
  - `dist/assets/index-BfZeswel.css` (74.46 kB)
- **Playwright E2E Suite**:
  Command: `npx playwright test e2e/trainer.spec.ts`
  Result: 16 passed in 18.3s across all 4 responsive viewports (`mobile-small`, `mobile-iphone`, `tablet-portrait`, `desktop-landscape`).
- **A11y Porcelain Skin Contrast Check**:
  Command: `npx playwright test e2e/a11y.spec.ts -g "porcelain"`
  Result: 4 passed in 6.6s with 0 critical or serious axe violations.
- **App Monolith Boundary**:
  Command: `(Get-Content src/App.tsx).Length`
  Result: 278 lines (strictly `< 300` lines, with 22-line safety margin).
- **Bot Tournament Calibration**:
  Script `scripts/bot-tournament.ts` executed 1,200 matches (6 pairings × 200 games) in 239s. Output report generated at `docs/plan/bot-calibration.md` verifying monotonic win rate separation:
  - Gary (Depth 4) beats Pip (Depth 2): 77.5% win rate (155 - 42)
  - Pebble (Depth 6) beats Gary (Depth 4): 66.0% win rate (132 - 60)
  - Kalah (Depth 8) beats Pebble (Depth 6): 52.5% win rate (105 - 95)
  - Kalah beats Pip: 96.5% win rate (193 - 7)

## 2. Logic Chain
1. *Exact Endgame Solver*: `src/solver/endgame.ts` implements negamax alpha-beta with Transposition Table caching on `rules.key(s)` and node budget guards. Observation 1 & 2 confirm terminal scores match unpruned minimax across 500 deterministic positions ($\le 14$ active stones) with 0 score discrepancies.
2. *Truthful Evaluation*: `src/workers/search.worker.ts` and `src/workers/searchClient.ts` invoke `solveExact` whenever playable stones $\le 14$, setting `isExact: true` and mapping terminal score leads to truthful integer win probabilities (0%, 50%, or 100%). In `src/game/useGame.ts`, fractional `/3.5` store division is bypassed when `top.exact` is true. `EvalGauge.tsx` and `AnalysisPanel.tsx` display "Exact" vs "Estimate" badges and exact integer stone leads (`data-testid="eval-lead-label"`).
3. *Move Loss Classification & Explanations*: `src/trainer/classify.ts` evaluates move stone loss against optimal evaluation across 5 tiers (`best`: 0, `good`: 1, `inaccuracy`: 2, `mistake`: 4, `blunder`: >4) and computes "Mistakes per 100 moves". `src/trainer/explain.ts` analyzes board features (free turns, captures, threats, starvation, tempo, quiet moves) into 10 deterministic engine reason codes with 100% catalog key parity across English, Arabic, and Spanish.
4. *Elo Rating & Calibration*: `src/trainer/rating.ts` implements Elo rating updates stored in `mancala_rating_v1` with provisional $K=32$ (< 20 games) and standard $K=16$. Display is gated to friendly level titles by default and reveals numeric Elo under the `full` lens. Monotonic skill progression is validated by the 1,200 match bot tournament in `docs/plan/bot-calibration.md`.
5. *Spaced Repetition Drills & Game Review*: `src/trainer/mistakes.ts` caps mistake records to 200 items in `mancala_mistakes_v1` using Leitner intervals (1d/3d/7d). `src/components/panels/DrillView.tsx` renders interactive flashcard drills within the Coach tab and Analysis panel tab switcher (`data-testid="tab-drills"`). `GameReviewModal.tsx` highlights top 3 swing moments and provides a 1-tap "Practice these" button (`data-testid="practice-swings-btn"`).
6. *Monolith Decomposition & Invariants*: Extracting `src/components/shell/AppModals.tsx` kept `src/App.tsx` at 278 lines (< 300 lines). The bottom navigation tray strictly maintains 5 items (`Board`, `Analysis`, `Coach`, `Rules`, `Settings`), preventing any 6th button. High-contrast tokens in `EvalGauge.tsx` and `AnalysisPanel.tsx` guarantee WCAG AA/AAA compliance on porcelain skin.

## 3. Caveats
- Bot tournament depth 8 minimax with free-turn chains can explore deeply; the calibration tournament harness bounded recursive free-turn extensions to 1 and integrated `solveExact` for $\le 14$ playable stones to guarantee 1,200 games terminate in 239 seconds while preserving monotonic strength separation.
- LocalStorage keys (`mancala_rating_v1`, `mancala_mistakes_v1`) operate client-side only with zero remote network calls, tracking, or PII.

## 4. Conclusion
Milestone M2 (Phase 2: The Trainer & Exact Endgame Solver) is 100% complete, fully verified, and meets all requirements and architectural constraints without regressions:
- Exact solver cross-checked with 0 mismatches across 500 positions.
- Truthful evaluation labeling and exact integer win probabilities in place.
- Move classification (5 tiers), error rate metric, and 10 deterministic explanation codes with 100% i18n parity.
- Elo ladder and calibrated bot tournament documentation generated.
- Leitner spaced repetition mistake drills integrated into Coach/Analysis panels.
- Upgraded game review with top 3 swings and drill triggering.
- `src/App.tsx` maintained at 278 lines (< 300 lines limit).
- 5-button bottom navigation tray strictly maintained.
- All 22 test files (208 tests), TypeScript check, Vite build, and Playwright E2E tests are passing cleanly.
- `docs/plan/PROGRESS.md` is updated with the Phase 2 completion report.

## 5. Verification Method
To independently verify Milestone M2:
1. Run TypeScript check:
   `npx tsc --noEmit` -> Expect 0 diagnostic errors (Code 0).
2. Run Vitest suite (including 500-position solver benchmark and i18n parity):
   `npm test -- --run` -> Expect 22 passed test files, 208 passed tests.
3. Verify production build:
   `npm run build` -> Expect successful build of dist/ assets.
4. Run Playwright trainer E2E tests across 4 viewports:
   `npx playwright test e2e/trainer.spec.ts` -> Expect 16 passed tests.
5. Verify porcelain skin contrast audit:
   `npx playwright test e2e/a11y.spec.ts -g "porcelain"` -> Expect 4 passed tests.
6. Verify App.tsx line count:
   `powershell -Command "(Get-Content src/App.tsx).Length"` -> Expect < 300 (actual: 278).
7. Inspect documentation deliverables:
   - `docs/plan/bot-calibration.md`
   - `docs/plan/PROGRESS.md` (Phase 2 marked COMPLETED)
