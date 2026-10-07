# Task Assignment: M2 Explorer 2 (Mistake Classification, Explanations & Rating)

## Objective
Analyze and provide concrete architectural specifications for:
1. **Mistake Classification (`src/trainer/classify.ts`)**:
   - `type MoveGrade = 'best' | 'good' | 'inaccuracy' | 'mistake' | 'blunder';`
   - `classify(lossStones: number): MoveGrade` with thresholds in one config object (e.g. <= 0 best, <= 1 good, <= 2 inaccuracy, <= 4 mistake, > 4 blunder).
   - Loss = best eval − eval after played move (same evaluation kind only; mixed kinds compared by search at equal depth).
   - Error rate metric: average loss per move, displayed as "Mistakes per 100 moves" (lens `errorRate`).
2. **Richer Deterministic Explanations (`src/trainer/explain.ts`)**:
   - Pure function: `explain(rules: RuleSet, before: GameState, move: number, analysis: SearchResult): ExplanationItem[]`.
   - Typed reason codes: `EXTRA_TURN_MISSED`, `CAPTURE_AVAILABLE`, `LEAVES_OPEN_CAPTURE`, `STARVES_OPPONENT`, `HOARD_TOO_LONG`, `SETUP_EXTRA_TURN`, etc.
   - Reasons verified by actually querying/applying the rule engine (e.g. `CAPTURE_AVAILABLE` is true only if a legal move captures). No LLM, no "AI" wording.
   - i18n template for each reason code across `en.ts`, `ar.ts`, and `es.ts`.
   - Tests: for each code, a fixture position that triggers it and one that must not.
3. **Local Rating Ladder (`src/trainer/rating.ts`)**:
   - Elo-like rating vs bot levels: each bot level has fixed nominal rating (800–2000).
   - Update user rating in `mancala_rating_v1`: K=32 early (first 30 games), K=16 later.
   - Display as a friendly "Level" with a title (e.g. "Novice", "Strategist", "Master"), rating number only shown under lens `full`.
   - Store gentle trend, zero online leaderboards.
   - Bot calibration script: `scripts/bot-tournament.ts` (round robin 200 games per pair, seeded) outputting `docs/plan/bot-calibration.md`.

## Input Artifacts
- `c:\Users\vjbel\hacks\mymancala\.agents\teamwork\ORIGINAL_REQUEST.md`
- `c:\Users\vjbel\hacks\mymancala\docs\plan\phase-2-trainer.md`
- `c:\Users\vjbel\hacks\mymancala\src\bots.ts`
- `c:\Users\vjbel\hacks\mymancala\src\tactics.ts`
- `c:\Users\vjbel\hacks\mymancala\src\i18n\glossary.ts`
- `c:\Users\vjbel\hacks\mymancala\src\i18n\translations\`

## Deliverables
Write your comprehensive architectural report to `c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m2_explorer_2\handoff.md`.
Notify parent via `send_message`.
