# Phase 2: The trainer (trustworthy analysis, mistakes, drills, rating)

Prereq: phases 0–1. See [README.md](README.md). Everything here is behind lenses and off by default in Just Play.

## 2.1 Exact endgame solver
**Files:** `src/solver/endgame.ts`, `src/solver/endgame.test.ts`.
- `solveExact(rules: RuleSet, s: GameState, budgetNodes: number): {value: number; best: number[]; exact: true} | null` using full-depth alpha-beta with TT and memo by `rules.key`. Value = final stone differential under the active rules. Return `null` if budget is exceeded.
- Run in the worker. Budget by device: start 300k nodes; trigger when stones on board <= ~14 (tune so p95 < 300 ms on a mid phone).
- Cross-check test: for 500 random small positions compare against an independent plain minimax with no pruning/TT (reuse approach in `search.test.ts`). They must match exactly.
- Also test known-terminal and forced-sequence positions.

## 2.2 `exact` vs `estimate` labelling
```ts
export type Evaluation = { value: number; kind: 'exact' | 'estimate'; depth?: number; winPct?: number };
```
- Exact: value is true final margin with best play; win% shown as 0/50/100 only (win/draw/loss) — never a fake 63%.
- Estimate: search value; display as stone advantage ("about +2 stones"), with a small "estimate" tag. Win % only when lens `winPercent` is on, and labelled "rough chance".
- Remove or relabel the logistic `1/(1+exp(-score*0.022))` as a clearly-rough indicator; add a unit test that exact endings never show non-trivial percentages.

## 2.3 Mistake classification
`src/trainer/classify.ts`:
```ts
type MoveGrade = 'best' | 'good' | 'inaccuracy' | 'mistake' | 'blunder';
classify(lossStones: number): MoveGrade   // thresholds in one config object, e.g. <=0 best, <=1 good, <=2 inaccuracy, <=4 mistake, else blunder
```
- Loss = best eval − eval after played move (same evaluation kind only; mixed kinds compared by search at equal depth).
- Error rate metric = average loss per move; shown as "Mistakes per 100 moves" (lens `errorRate`).

## 2.4 Mistake log and drills from your own games
- Store: `mancala_mistakes_v1` (cap 200, newest first): `{id, rulesId, position: moves[], played, best, loss, grade, at, solved: number}`.
- **Drills screen** (new tray-reachable via Coach tab, no 6th tray item): "Practice your mistakes": show position, user picks a move, reveal best + a one-line deterministic reason. Spaced repetition: simple Leitner boxes (1, 3, 7 days).
- Tests: Leitner scheduling unit tests; log cap.

## 2.5 Richer deterministic explanations
`src/trainer/explain.ts`: pure function `explain(rules, before, move, analysis): ExplanationItem[]` with typed reason codes (`EXTRA_TURN_MISSED`, `CAPTURE_AVAILABLE`, `LEAVES_OPEN_CAPTURE`, `STARVES_OPPONENT`, `HOARD_TOO_LONG`, ...). Each code has an i18n template (en/ar/es). Reasons are verified by actually applying the rule engine (e.g. `CAPTURE_AVAILABLE` is true only if a legal move captures). No LLM, no "AI" wording.
- Tests: for each code, a fixture position that triggers it and one that must not.

## 2.6 Local rating ladder
- Elo-like rating vs bot levels (`src/trainer/rating.ts`): each bot level has fixed nominal rating (e.g. 800–2000); result updates your rating with K=32 early, 16 later. Display as a friendly "Level" with a title, rating number only under lens `full`.
- Store `mancala_rating_v1`. Show a gentle trend, no leaderboard.
- Bot levels must be calibrated by a script `scripts/bot-tournament.ts` (round robin 200 games per pair, seeded); commit the results table to `docs/plan/bot-calibration.md`.

## 2.7 Review upgrade
- Game Review shows per-move grades, biggest swings (top 3), and "Practice these" button feeding 2.4. Uses worker, cancellable, progress bar.

## Definition of done (phase 2)
Solver matches reference, labels correct everywhere, drills work offline, all new strings in en/ar/es, tests green, commit `feat: phase 2 trainer`.
