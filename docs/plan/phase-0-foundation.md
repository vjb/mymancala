# Phase 0: Foundation (refactor, no visible change)

Read [README.md](README.md) first (global rules, preserved `data-testid`s).
**Goal:** make the codebase reusable and safe to extend. The app looks and behaves identically at the end. Every step ends with `npx tsc --noEmit`, `npm test`, `npm run build` green and a commit.

## 0.1 Headless RuleSet interface
**Files:** new `src/rules/types.ts`, `src/rules/kalah.ts`, `src/rules/index.ts`; adapt `src/engine.ts`.

```ts
export type Player = 0 | 1;
export interface Board { pits: number[]; }           // flat array, layout defined by the RuleSet
export interface GameState { board: number[]; turn: Player; over: boolean; extra?: unknown; }
export interface MoveResult { state: GameState; captured: number; extraTurn: boolean; path: number[]; }
export interface RuleSet {
  id: string;                         // 'kalah' | 'oware' | 'sow-and-score' ...
  name: string;                       // display name (i18n key)
  initial(): GameState;
  legalMoves(s: GameState): number[]; // pit indices
  apply(s: GameState, move: number): MoveResult;
  isTerminal(s: GameState): boolean;
  score(s: GameState): [number, number];     // final or current banked stones
  key(s: GameState): string;                 // TT key, includes variant options
  layout: { rows: number; cols: number; stores: number[]; pitOwner(i: number): Player; label(i: number): string };
}
```
Steps:
1. Create types and a `kalahRules(options: RulesConfig): RuleSet` that wraps the **existing** sowing/capture/free-turn logic. Do not rewrite logic; move it.
2. Keep `engine.ts` exports (`minimax`, `getPositionKey`, etc.) working by delegating; update callers last.
3. Make `minimax` take a `RuleSet` (generic). Remove hard-coded 6/13/`12-i`.
4. Tests: `src/rules/kalah.test.ts` runs 2,000 seeded random games old-engine vs new RuleSet and asserts identical boards after every move. Keep `search.test.ts` passing.

**Done when:** no file outside `src/rules/kalah.ts` contains the literals `13` or `12 - ` as board geometry.

## 0.2 Split `App.tsx` (~2.6k lines)
**Target layout:**
```
src/game/useGame.ts        // state machine hook: moves, undo, turn flow, bot scheduling
src/game/gameReducer.ts    // pure reducer + tests
src/components/board/{Board,Pit,Store,Pebble}.tsx
src/components/panels/{AdvantageCard,AnalysisPanel,SettingsPanel,CoachBanner,HistoryList}.tsx
src/components/shell/{BottomTray,TopBar,Ribbon}.tsx
src/components/modals/{RulesModal,GameReviewModal,TutorModal}.tsx
src/App.tsx                // composition only, < 300 lines
```
Steps (one commit each, run the app after each):
1. Extract pure helpers and constants.
2. Extract `gameReducer` with actions `MOVE`, `UNDO`, `RESET`, `SET_MODE`. Add reducer unit tests.
3. Extract `useGame` (timers, bot turn delay: **1.2 s normal / 1.6 s slow**, unchanged).
4. Extract components bottom-up (Pit → Board → panels → tray).
5. Props down, no global state library. Shared prefs use a tiny `usePersistentState(key, default, version)` hook in `src/lib/storage.ts` (try/catch around `localStorage`, versioned keys).

**Done when:** `App.tsx` < 300 lines, every preserved `data-testid` still present (grep check in a test), visual check at 393x852 matches before.

## 0.3 Search in a Web Worker
**Files:** new `src/workers/search.worker.ts`, `src/workers/searchClient.ts`.
```ts
searchClient.analyze(req: {rules: string; state: GameState; depth: number; id: number}): Promise<AnalysisResult>
searchClient.cancel(id: number): void
```
- Vite: `new Worker(new URL('./search.worker.ts', import.meta.url), {type:'module'})`.
- Latest-request-wins: stale results are dropped by `id`. Provide a main-thread fallback if `Worker` is unavailable.
- Transposition table lives inside the worker and is cleared when rules change.
- Tests: client unit test with a fake worker; Playwright test that tapping a pit stays responsive (< 100 ms to first paint) during deep analysis.

## 0.4 Autosave and resume
- Key `mancala_game_v1`: `{rulesId, options, history: moves[], mode, botLevel, savedAt}`. Replay moves from `initial()` on load (no board snapshots, so rule fixes can't corrupt saves). Validate and discard on any error.
- On launch with a saved unfinished game: show a small "Continue game / New game" prompt.
- Test: play 5 moves, reload, board equal.

## 0.5 Longer principal variation (C7)
- Store full PV in the analysis result; UI truncates by available width and shows "…" with a tap-to-expand sheet (no horizontal scroll).

## 0.6 Playwright + mobile guardrails
- `npm i -D @playwright/test`; `playwright.config.ts` with projects at 360x740, 393x852, 768x1024, 1280x800; `webServer` runs `npm run dev`.
- Tests in `e2e/`: `no-hscroll.spec.ts` (assert `document.documentElement.scrollWidth <= innerWidth` on every tab and in Settings, Rules, Review), `play-a-move.spec.ts`, `resume.spec.ts`, `tray.spec.ts` (exactly 5 tray items).
- Add scripts: `test:e2e`, `typecheck`.

## Definition of done (phase 0)
`tsc` clean, vitest + playwright green, build ok, no visual diff in Just Play/Coach/Full presets, `App.tsx` < 300 lines, commit message `refactor: phase 0 foundation`.
