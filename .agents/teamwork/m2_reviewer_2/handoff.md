# Review & Adversarial Challenge Report — Milestone M2 (Phase 2: Trainer, Rating & Drills)

**Reviewer**: `m2_reviewer_2`  
**Roles**: Reviewer & Adversarial Critic  
**Working Directory**: `c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m2_reviewer_2`  
**Verdict**: **APPROVE**  

---

## 1. Observation

Direct, independent command executions and code inspections conducted during this review:

1. **TypeScript Typecheck**:
   - Command: `npx tsc --noEmit`
   - Result: Exited with code 0 (0 diagnostic errors).
2. **Vitest Unit & Fuzz Suite**:
   - Command: `npm test -- --run`
   - Result: 22 test files passed (208 / 208 tests passed in 53.0s).
   - Key test suites verified:
     - `src/solver/endgame.test.ts` (6 tests, 7,250ms): 500 random endgame positions generated via seeded PRNG cross-checked against independent pure unpruned minimax recursion (`referenceMinimax`) with **0 score mismatches**.
     - `src/trainer/classify.test.ts` (6 tests, 11ms): 5 MoveGrade tiers (`best`, `good`, `inaccuracy`, `mistake`, `blunder`), threshold boundaries, `computeLossStones`, and `computeErrorRate`.
     - `src/trainer/explain.test.ts` (11 tests, 15ms): 10 deterministic engine reason codes verified on concrete Mancala board states.
     - `src/i18n/i18n.test.ts` (11 tests, 272ms): Exact 1:1 key parity verified across `src/i18n/translations/en.ts`, `ar.ts`, and `es.ts` (all non-empty strings, including `explain.code.*` and `rating.level.*`).
     - `src/trainer/rating.test.ts` (8 tests, 15ms): Provisional $K=32$ (< 30 games) / standard $K=16$, expected scores, rating delta, rank level titles, and `full` lens gating.
     - `src/trainer/mistakes.test.ts` (6 tests, 236ms): 200-cap FIFO array eviction, position deduplication, Leitner box intervals (1d, 3d, 7d), and box promotion/demotion logic.
3. **Production Build**:
   - Command: `npm run build`
   - Result: Exited with code 0 in 42.46s:
     - `dist/index.html` (1.08 kB)
     - `dist/assets/search.worker-DFL8eZpZ.js` (8.95 kB)
     - `dist/assets/index-BfZeswel.css` (74.46 kB)
     - `dist/assets/index-D_SW-fXL.js` (397.10 kB)
4. **Playwright E2E Suite**:
   - Command: `npx playwright test e2e/trainer.spec.ts`
   - Result: 16 passed in 1.1m across all 4 responsive viewports (`mobile-small`, `mobile-iphone`, `tablet-portrait`, `desktop-landscape`):
     - `Bottom tray maintains strictly 5 buttons on mobile (zero 6th button)`: PASS across all viewports.
     - `Interactive Drills view is reachable via Analysis panel`: PASS across all viewports.
     - `Evaluation gauge renders truthfulness indicators`: PASS across all viewports.
     - `Game Review modal displays 5-tier classification`: PASS across all viewports.
5. **App Monolith Boundary**:
   - Inspected `src/App.tsx`: exactly 279 lines (strictly `< 300` lines limit, 21 lines below limit).
6. **Bottom Navigation Tray Invariant**:
   - Inspected `src/components/shell/BottomTray.tsx:28-84`: exactly 5 navigation buttons (`bottom-board-btn`, `bottom-analysis-btn`, `tutor-toggle`, `bottom-rules-btn`, `bottom-settings-btn`). Rules button is housed exclusively on the bottom tray.
7. **Bot Calibration Tournament**:
   - Inspected `scripts/bot-tournament.ts` and `docs/plan/bot-calibration.md`: 1,200 matches (6 pairs × 200 games) completed in 239s. Win rates exhibit strictly monotonic strength separation:
     - Pip (Depth 2): 900 Elo, 16.4% score (90W / 493L / 17D)
     - Gary (Depth 4): 1250 Elo, 38.7% score (224W / 360L / 16D) — Gary beats Pip 78.3%
     - Pebble (Depth 6): 1600 Elo, 66.6% score (393W / 194L / 13D) — Pebble beats Gary 68.0%
     - Kalah (Depth 8): 1950 Elo, 78.3% score (463W / 123L / 14D) — Kalah beats Pebble 52.5%

---

## 2. Logic Chain

1. *Move Classification & Explanations*:
   - `src/trainer/classify.ts:20-32` implements `classify()` with thresholds: $\le 0.0 \to \text{best}$, $\le 1.0 \to \text{good}$, $\le 2.0 \to \text{inaccuracy}$, $\le 4.0 \to \text{mistake}$, $> 4.0 \to \text{blunder}$.
   - `src/trainer/classify.ts:83-121` calculates `computeErrorRate()` deriving `mistakesPer100Moves` ($\text{averageLoss} \times 100$) and `accuracyScore` (10–100 floor).
   - `src/trainer/explain.ts:31-282` evaluates board transitions via `rules.apply()`, identifying 10 engine reason codes (`EARNS_EXTRA_TURN`, `EXTRA_TURN_MISSED`, `EXECUTES_CAPTURE`, `CAPTURE_AVAILABLE`, `LEAVES_OPEN_CAPTURE`, `DEFENDS_THREAT`, `SETUP_EXTRA_TURN`, `STARVES_OPPONENT`, `HOARD_TOO_LONG`, `ENDGAME_SWEEP_TRIGGERED`) plus `OPTIMAL_POSITIONAL` fallback.
   - 100% key parity across `en.ts`, `ar.ts`, and `es.ts` is verified by `src/i18n/i18n.test.ts:9-16`.

2. *Rating & Calibration*:
   - `src/trainer/rating.ts:62-87` implements standard Elo math $E = 1 / (1 + 10^{(R_{\text{opp}} - R_{\text{player}})/400})$ with provisional $K=32$ for games $<30$ and $K=16$ afterwards, persisted to `mancala_rating_v1`.
   - Rating display is gated: `formatRating(rating, title, isFullLens)` exposes numeric Elo strictly when `isFullLens` is true, otherwise presenting rank level titles (`Novice`, `Apprentice`, `Tactician`, `Strategist`, `Master`, `Grandmaster`).
   - `scripts/bot-tournament.ts` executes a genuine 1,200 match simulation, verifying strictly monotonic depth separation $D_2 < D_4 < D_6 < D_8$, documented in `docs/plan/bot-calibration.md`.

3. *Mistakes & Drills*:
   - `src/trainer/mistakes.ts:92-150` handles `recordMistake()` with deduplication on `(position, turn, played)` and caps the log at 200 items using newest-first FIFO slicing (`slice(0, MAX_MISTAKES)`).
   - Leitner box intervals: Box 1 (1 day), Box 2 (3 days), Box 3 (7 days). Correct answers advance Box $1 \to 2 \to 3$; incorrect answers reset to Box 1.
   - `src/components/panels/DrillView.tsx:19-264` renders flashcard drills with an interactive `<Board />`, Leitner box badge, immediate feedback, and tactical explanations.
   - `src/components/panels/AnalysisPanel.tsx:164-190` provides a tab switcher (`data-testid="tab-moves"` / `data-testid="tab-drills"`) allowing instant access to drills.
   - `src/GameReviewModal.tsx:280-318` identifies the top 3 swing moments with stone equity losses and features a "Practice these" button (`data-testid="practice-swings-btn"`) that automatically writes the swing positions into `mancala_mistakes_v1` and opens the drill view.

4. *Invariants & Monolith Protection*:
   - `src/App.tsx` remains strictly decoupled at 279 lines (< 300 lines) by extracting modal orchestration to `src/components/shell/AppModals.tsx`.
   - `BottomTray.tsx` strictly maintains 5 items, preventing any 6th button across all viewports as verified by Playwright.

---

## 3. Adversarial Challenges & Integrity Audit

### Integrity Audit
- **Hardcoded test outputs**: NONE. `src/solver/endgame.test.ts` dynamically generates 500 random positions with a seeded PRNG and computes real reference minimax values on the fly.
- **Dummy/facade implementations**: NONE. All rating calculations, Leitner scheduling, mistake FIFO eviction, and explanation code logic are fully functional algorithms.
- **Shortcuts / External API reliance**: NONE. Entirely on-device, local-first TypeScript architecture with zero external network dependencies.
- **Fabricated verification logs**: NONE. All test commands (`tsc`, `vitest`, `build`, `playwright`) were re-run independently with zero errors.

### Stress Test Findings & Mitigations

| Challenge / Stress Scenario | Potential Failure Mode | Implementation Defense | Status |
|---|---|---|---|
| **Empty History Error Rate** | Division by zero in `computeErrorRate([])` | `classify.ts:92-101` guards empty history, returning 0 losses and 100 accuracy score. | PASS |
| **Corrupted `localStorage`** | App crash on malformed JSON for rating or mistake log | `loadRatingProfile()` and `loadMistakes()` wrap JSON parsing in try/catch and validate record schemas. | PASS |
| **Mistake Log Saturation** | Memory leak or unbounded array growth past 200 items | `slice(0, MAX_MISTAKES)` strictly maintains array bounds $\le 200$ newest-first. | PASS |
| **Negative Elo Score** | Repeated losses driving rating below zero | `Math.max(100, ...)` enforces a hard rating floor of 100. | PASS |
| **Tournament Combinatorial Blowup** | Minimax depth 8 with recurring free-turn extensions freezing the tournament harness | `botSearch` in `scripts/bot-tournament.ts` bounds bonus-turn extensions to 1 and delegates to `solveExact` for $\le 14$ active stones. | PASS |
| **Mobile Tray Overflow** | Adding Coach or Drill buttons creating a 6th button on mobile | Bottom tray strictly holds 5 items; Drills are housed inside the Analysis panel tab switcher. | PASS |

---

## 4. Caveats

1. **LocalStorage Client-Side Boundary**: `mancala_rating_v1` and `mancala_mistakes_v1` exist exclusively in client browser storage. If a user clears site data or uses private browsing, these records reset to defaults.
2. **Bot Depth Horizon in Tournament Harness**: Depth 8 bot search in `scripts/bot-tournament.ts` clamps recursive free-turn extensions to 1 to ensure 1,200 games complete deterministically in < 4 minutes; this is tournament-specific and does not impair full engine lookahead in production play.

---

## 5. Conclusion

Milestone M2 (Phase 2: The Trainer, Rating & Drills) satisfies all requirements, interface contracts, and architectural constraints:
- Move classification (5 tiers), error rate tracking, and 10 deterministic explanation codes with 100% i18n parity in `en.ts`, `ar.ts`, and `es.ts`.
- Local Elo rating ladder (`mancala_rating_v1`, $K=32/16$, level titles, `full` lens gating) backed by a 1,200-game calibrated bot tournament proving monotonic strength separation.
- Spaced-repetition mistake drills (200-cap FIFO in `mancala_mistakes_v1`, Leitner box intervals 1d/3d/7d, interactive `DrillView.tsx`, top 3 swing moments with `data-testid="practice-swings-btn"`).
- Exact 5-item bottom tray invariant preserved.
- `src/App.tsx` strictly < 300 lines (279 lines).
- 100% build and automated test suites pass cleanly (`tsc`, 208 Vitest unit/fuzz tests, 16 Playwright E2E tests).

**Final Verdict**: **APPROVE**

---

## 6. Verification Method

To independently reproduce this verification:
1. `npx tsc --noEmit` -> Expect 0 diagnostic errors.
2. `npm test -- --run` -> Expect 22 test files, 208 tests passed.
3. `npm run build` -> Expect successful Vite production build.
4. `npx playwright test e2e/trainer.spec.ts` -> Expect 16 tests passed across 4 viewports.
5. `powershell -Command "(Get-Content src/App.tsx).Length"` -> Expect `< 300` (actual: 279).
