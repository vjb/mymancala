# Specification Mining Report: Technical Contracts & Verification Architecture

**Agent**: `survey_contracts_spec_miner_2`  
**Working Directory**: `c:\Users\vjbel\hacks\mymancala\.agents\teamwork\survey_contracts_spec_miner_2`  
**Parent Orchestrator ID**: `85856d3d-5ca8-4fac-8578-3161a39fe3a5`  
**Date**: 2026-10-07T01:18:00Z  

---

## 1. Observation

### Source Documents Inspected
- `docs/plan/README.md` (Master index, 10 global rules, locked decisions, 28+ preserved `data-testid`s)
- `docs/plan/phase-0-foundation.md` (RuleSet interface, App.tsx decomposition layout, search worker protocol, autosave format, Playwright config)
- `docs/plan/phase-1-lenses-and-access.md` (7 lenses, 4 presets, highlight visual language, Axe-core audit, WCAG AA/AAA, RTL logical utilities, i18n catalogs)
- `docs/plan/phase-2-trainer.md` (Exact endgame solver algorithm, `exact`/`estimate` labelling, move classification, mistake log with Leitner spaced repetition, local rating ladder)
- `docs/plan/phase-3-habit-loop.md` (Daily puzzle deterministic UTC seeding, forgiving streaks, URL hash replay codec fuzzer, on-device canvas share cards, PWA/Workbox)
- `docs/plan/phase-4-reach.md` (Variant registry, Oware Abapa rules, Sow & Score intro variant, Congkak/Bao beta rules, friend play relay protocol)
- `docs/plan/appendix-rules-and-sources.md` (Rules definitions, verification standards, academic references)
- `docs/plan/appendix-ux-and-safety.md` (UX principles, 5-item tray lock, design tokens, kid-safety, a11y checklist, performance budget)

### Codebase Baseline Inspected & Executed
- `package.json`: Vite + React 18 + TypeScript 5.6.3 + Tailwind 3.4.17 + Vitest 2.1.8.
- Test suite execution (`npm test`): 5 test suites passed (`bots.test.ts`, `lenses.test.ts`, `engine.test.ts`, `tactics.test.ts`, `search.test.ts`), 27 unit tests green in 1.65s.
- Typecheck execution (`npx tsc --noEmit`): Clean exit (code 0), zero type errors.
- Existing codebase structure: Monolithic `src/App.tsx` (~2,600 lines, 131 KB), pure lenses module `src/lenses.ts`, Kalah-only engine in `src/engine.ts`, bot personas in `src/bots.ts`, tactics generator in `src/tactics.ts`, themes in `src/theme.ts`.
- `data-testid` grep audit: Confirmed active testids in `src/App.tsx` matching `README.md`: `reset-game-btn`, `eval-gauge`, `turn-indicator`, `total-stones`, `ribbon-hints-btn`, `store-13`, `store-6`, `pit-N`, `pit-count-N`, `tutor-modal`, `tutor-reconsider`, `tutor-play-best`, `tutor-confirm`, `analysis-review-btn`, `eval-row-0`, `eval-row-worst`, `eval-play-pit-N`, `preset-ID`, `lens-ID`, `mode-ID`, `ai-duel-toggle`, `bottom-board-btn`, `bottom-analysis-btn`, `tutor-toggle`, `bottom-rules-btn`, `bottom-settings-btn`.

---

## 2. Features Discovered

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| 1 | RuleSet Contract | Headless `RuleSet` Interface | Abstract generic contract decoupling board geometry and sowing rules from UI and minimax | `GameState`, move pit index | `MoveResult` `{state, captured, extraTurn, path}` | Disallows illegal pit selections; invariants throw on stone loss | `phase-0-foundation.md:6-25` |
| 2 | RuleSet Geometry | Board Geometry Encapsulation | Removes hardcoded literals `13`, `6`, and `12 - i` from UI/engine into `src/rules/kalah.ts` | Pit index `i` | `{rows, cols, stores, pitOwner(i), label(i)}` | Invalid index out of bounds | `phase-0-foundation.md:23,32` |
| 3 | RuleSet Variants | Kalah Implementation | Standard 14-pit board with stores at 6/13, 4 stones/pit, options for free turns and captures | `RulesConfig {freeTurn, captureOpposite}` | `RuleSet` instance | Invariant check throws if stone sum != 48 | `phase-0-foundation.md:27`, `engine.ts:84-180` |
| 4 | RuleSet Variants | Oware (Abapa) Variant | 12 pits, 4 stones/pit, lap wrap skips origin, backwards capture of 2-3 stones, starvation feeding rule | 12-pit `GameState`, move index | `MoveResult` with captures / termination | Grand slam / feeding violation rejects illegal move | `phase-4-reach.md:10-14`, `appendix-rules-and-sources.md:8-14` |
| 5 | RuleSet Variants | Sow & Score (Intro) | Teaching variant for age 6+, simple sowing, no captures, score on store landing, fully solvable | Move index | `MoveResult` | Disallows empty pit move | `phase-4-reach.md:15-18` |
| 6 | RuleSet Variants | Congkak & Bao (Beta) | Complex Southeast African / Asian variants marked beta with search-only grading | `GameState` | `MoveResult` | Flagged off via `features.bao = false` if unverified | `phase-4-reach.md:19-22` |
| 7 | Web Worker | Search Worker Module | Off-thread minimax search using Vite module worker `new URL(..., import.meta.url)` | `SearchRequest {id, rules, state, depth}` | `AnalysisResult {id, score, winProb, pv, evaluatedMoves}` | Drops stale responses where response ID != current ID | `phase-0-foundation.md:54-64` |
| 8 | Web Worker | Search Client & Cancellation | Async client managing request sequence, cancellation, and main-thread fallback | `searchClient.analyze(req)` / `cancel(id)` | Promise resolving to `AnalysisResult` | Falls back to synchronous engine if Worker API missing | `phase-0-foundation.md:57-62` |
| 9 | Web Worker | TT Worker Isolation | Transposition table capped at 250k entries lives in worker; cleared on rules change | State hash key | Cached `TTEntry` with bounds | Clears all entries when capacity exceeded | `phase-0-foundation.md:62`, `engine.ts:215-220` |
| 10 | Exact Solver | Full-Depth Endgame Solver | Alpha-beta solver with TT computing true terminal stone margin when stones <= 14 | `rules, state, budgetNodes (300k)` | `{value, best: number[], exact: true}` or `null` | Returns `null` if 300k node budget exhausted | `phase-2-trainer.md:5-11` |
| 11 | Exact Solver | Solver 500-Position Benchmark | Validation test comparing exact solver output against brute-force reference minimax | 500 randomized small-stone positions | Assert `solver.value === refMinimax.value` | Fails test suite if any evaluation disagrees | `phase-2-trainer.md:9` |
| 12 | Trainer UX | `exact` vs `estimate` Labelling | Transparent evaluation tags; exact shows 0/50/100% win chance; estimate shows "+N stones" | `Evaluation` object | Formatted UI label & badge | Sigmoid probability prohibited on exact positions | `phase-2-trainer.md:12-19` |
| 13 | Trainer Analysis | Move Classification | Grades moves into 5 tiers based on stone loss: best (<=0), good (<=1), inaccuracy (<=2), mistake (<=4), blunder (>4) | `lossStones` | `MoveGrade` | Compares only equal evaluation kinds | `phase-2-trainer.md:21-28` |
| 14 | Trainer Drills | Mistake Log & Spaced Repetition | Logs up to 200 mistakes in `mancala_mistakes_v1`; serves Leitner box drills (1, 3, 7 days) | Played game mistakes | Structured drill card with deterministic reason | Oldest discarded when count > 200 | `phase-2-trainer.md:29-33` |
| 15 | Trainer Explanations | Deterministic Explanations | Pure function producing typed tactical reasons (`EXTRA_TURN_MISSED`, `CAPTURE_AVAILABLE`, etc.) | `rules, before, move, analysis` | `ExplanationItem[]` with i18n keys | Must be verified by engine simulation; no LLMs | `phase-2-trainer.md:35-37`, `tactics.ts:30-198` |
| 16 | Rating System | Local Rating Ladder | Elo-like rating (K=32 early, 16 late) against calibrated bot personas; stored in `mancala_rating_v1` | Match result vs bot ID | Updated rating number & level title | Never uploads rating; local only | `phase-2-trainer.md:38-42` |
| 17 | Storage | Autosave & Resume (`mancala_game_v1`) | Serializes move history log; replays from `initial()` on launch to prevent rule drift corruption | Move history array, rulesId, mode | Reconstituted `GameState` | Gracefully discards corrupt save without throwing | `phase-0-foundation.md:65-69` |
| 18 | Share Codec | Replay URL Codec | Bit-packs pit moves (4 bits/move) into URL hash `#/r/<v1>.<rulesId>.<base64url>.<flags>` | Move sequence, rules, flags | Encoded URL hash string | Invalid hash returns null and friendly error | `phase-3-habit-loop.md:18-23` |
| 19 | Share Codec | Codec Fuzzer Test | Fuzz suite testing lossless round-trip across 1,000 randomized game states | 1,000 randomized move sequences | `decode(encode(s)) === s` | Test fails on any serialization divergence | `phase-3-habit-loop.md:22` |
| 20 | Habit Loop | Deterministic Daily Puzzle | Bundles 365+ puzzles in `data.json`; selects by UTC day index `floor(utcMidnight / 86400000)` | UTC date timestamp | Single daily puzzle verified by exact solver | All bundled puzzles verified in CI | `phase-3-habit-loop.md:5-11` |
| 21 | Habit Loop | Forgiving Streaks & Badges | Tracks consecutive days played in `mancala_progress_v1`; auto-applies 1 weekly freeze; gentle badges | Game / puzzle completion events | Streak counter & unlocked badges | Missed days show "Welcome back!", no red shame copy | `phase-3-habit-loop.md:12-17` |
| 22 | Share UX | On-Device Canvas Share Cards | Generates PNG result card using HTML `<canvas>` via `navigator.share({files})` with download fallback | Game result, board art | Image blob / file | Strictly zero tracking, names, avatars, or location | `phase-3-habit-loop.md:20-22` |
| 23 | Platform | Offline PWA & Workbox SW | Installable PWA with precached assets, relative base `./`, prompt-on-update | Asset bundle | Offline-ready service worker | Gracefully operates when offline | `phase-3-habit-loop.md:24-30` |
| 24 | Multiplayer | Friend Play Ephemeral Relay | 128-bit room link over zero-storage WebSocket relay (`relay/`) or async replay link fallback | JSON protocol messages | Synchronized game state | Illegal moves rejected; desync offers replay resume | `phase-4-reach.md:23-31` |
| 25 | Lens System | 7 Lenses Architecture | Granular opt-in switches for every analytical metric (advantage, best moves, coach, etc.) | `LensId` toggle | Filtered UI rendering | Persisted in `mancala_lenses_v1` with migration | `phase-1-lenses-and-access.md:6-10`, `lenses.ts:7-35` |
| 26 | Lens Presets | 4 Presets (JustPlay/Hints/Coach/Full) | Standard bundles of lenses; Just Play renders ONLY board, turn indicator, and tray | `PresetId` | Configured `LensState` | Analysis tab with all lenses off shows friendly empty state | `phase-1-lenses-and-access.md:9-10`, `lenses.ts:46-75` |
| 27 | Board Visuals | Highlight System & Precedence | Strict single-highlight rule with precedence: `preview` > `best` > `lastMove` > `playable` | Pit state, hover/touch, active lens | Single `HighlightKind` per pit | Conflicting highlights suppressed | `phase-1-lenses-and-access.md:12-27` |
| 28 | Accessibility | Axe-Core Automated Audit | Automated accessibility gate asserting zero critical/serious violations | Page HTML / DOM | Axe violation report | CI fails if violations found | `phase-1-lenses-and-access.md:41`, `appendix-ux-and-safety.md:36` |
| 29 | Accessibility | WCAG AA / AAA Compliance | 4.5:1 text contrast for standard skins; 7:1 (AAA) on high-contrast skin; font floor >= 12px | Skin theme / `--font-scale` | Compliant DOM styles | Color-blind safe pebbles; non-color indicators | `appendix-ux-and-safety.md:30-43`, `theme.ts:51-168` |
| 30 | Accessibility | Screen Reader & ARIA Live Regions | Pits as buttons with detailed labels; `aria-live="polite"` announces opponent moves | Focus / game moves | Screen reader audio announcements | Focus returned upon closing modals | `phase-1-lenses-and-access.md:39` |
| 31 | Accessibility | Keyboard Navigation | Arrow key navigation between pits, Enter to play, `?` for rules, Esc to close modals | Keydown events | Focus shifts / actions | Modal traps focus while open | `phase-1-lenses-and-access.md:39` |
| 32 | Accessibility | Web Speech Read-Aloud | Feature-detected `speechSynthesis` reading rules, tutorial, and coach advice | Text content, locale | Audio speech output | Silent fallback if API unsupported or disabled | `phase-1-lenses-and-access.md:40` |
| 33 | Internationalization | Typed i18n Catalogs (en, ar, es) | Typed catalogs where `ar` and `es` implement `typeof en`; missing keys fail TypeScript | Translation key + params | Localized string | Missing key causes compile-time error | `phase-1-lenses-and-access.md:43-49` |
| 34 | Internationalization | RTL Layout Architecture | Sets `<html dir="rtl">` with logical Tailwind classes (`ms-`, `pe-`); board is NOT mirrored | Locale `'ar'` | RTL layout structure | Board maintains physical orientation constant | `phase-1-lenses-and-access.md:47` |
| 35 | Testing | Playwright 4-Viewport E2E Suite | Cross-device automated testing on 360x740, 393x852, 768x1024, 1280x800 viewports | Web server URL | Browser automation test runs | Fails if layout clips or crashes | `phase-0-foundation.md:73-77` |
| 36 | Testing | Zero Horizontal Scroll Gate | Invariant assertion `document.documentElement.scrollWidth <= innerWidth` across all tabs/modals | Viewport width (360px), en/ar/es | Boolean assertion | Fails build if horizontal scrollbar appears | `phase-0-foundation.md:75`, `README.md:72` |
| 37 | Testing | 5-Item Bottom Tray Architecture | Strict UI layout constraint: tray holds exactly Board, Analysis, Coach, Rules, Settings | Bottom navigation DOM | 5 fixed nav buttons | Rules button must NEVER exist in top bar | `appendix-ux-and-safety.md:13-14` |

---

## 3. Edge Cases

| # | Feature | Input / Scenario | Observed / Specified Behavior |
|---|---------|------------------|-------------------------------|
| 1 | RuleSet Sowing | Sowing with >= 13 stones in Kalah | Pit wraps around board > 1 full lap; opponent store is skipped on EVERY lap; total stone count strictly conserved (`preflight-diagnostics.ts:80-93`). |
| 2 | RuleSet Oware Lap | Move with >= 12 stones in Oware | Sowing must skip the starting pit from which stones were lifted; skips origin pit throughout multi-lap distribution (`appendix-rules-and-sources.md:9`). |
| 3 | RuleSet Oware Starvation | Opponent has 0 stones on their side | Player must legally choose a move that sows stones into opponent pits (feeding rule). If no such move exists, game ends immediately (`appendix-rules-and-sources.md:11`). |
| 4 | RuleSet Oware Grand Slam | Move captures all stones on opponent side | All opponent pits would be emptied; rule must either disallow move, capture nothing, or trigger special end condition per documented Abapa standard (`appendix-rules-and-sources.md:11`). |
| 5 | Exact Solver Budget | Endgame position with high branching > 300,000 nodes | Solver budget check triggers, aborts search cleanly, and returns `null`; engine falls back to heuristic search estimate with "estimate" badge (`phase-2-trainer.md:7-8`). |
| 6 | Exact Evaluation Display | Exact solved terminal or forced win | Win probability must show strictly `0%`, `50%`, or `100%`; logistic sigmoid function `1/(1+exp(-score*0.022))` is bypassed completely (`phase-2-trainer.md:16-18`). |
| 7 | Web Worker Cancellation | User quickly taps pit while engine search is active | Client issues `cancel(id)` and assigns new request ID; stale worker responses are dropped immediately; UI latency remains < 100 ms (`phase-0-foundation.md:57-63`). |
| 8 | Web Worker Transposition Table | Player switches variant (e.g., Kalah to Oware) | Transposition table is cleared immediately in worker memory to prevent cross-variant hash collisions (`phase-0-foundation.md:62`). |
| 9 | Autosave Corruption | `localStorage` contains truncated or malformed JSON | `JSON.parse` or move sequence validation fails; error caught silently, invalid save discarded, clean `initial()` game started (`phase-0-foundation.md:66`). |
| 10 | Replay Codec Decoding | User opens URL with malformed hash or invalid characters | `decode()` handles invalid base64 and out-of-range pit numbers without throwing; returns friendly error modal with "Play new game" option (`phase-3-habit-loop.md:19`). |
| 11 | Daily Puzzle Timezones | Player crosses UTC midnight or switches timezone | Puzzle ID is keyed strictly to UTC day `floor(Date.now() / 86400000)`; stays identical globally regardless of local device timezone (`phase-3-habit-loop.md:8`). |
| 12 | Streak Preservation | Player misses a calendar day due to travel or illness | Forgiving streak automatically applies 1 free weekly freeze; player streak is preserved; UI copy displays "Welcome back!" without red penalty badges (`phase-3-habit-loop.md:13-14`). |
| 13 | Highlight Precedence | Pit is simultaneously playable, the best move, and hovered | Precedence rule `preview > best > lastMove > playable` resolves conflict; pit renders ONLY the `preview` outline and path dots (`phase-1-lenses-and-access.md:22`). |
| 14 | Touch vs Click Previews | Quick finger tap on mobile pit | Tap < 350 ms executes the move immediately; long-press >= 350 ms shows preview; preview clears on finger release, scroll, or cancel (`phase-1-lenses-and-access.md:23`). |
| 15 | RTL Board Orientation | Arabic locale (`ar`) activated | `<html dir="rtl">` mirrors navigation, ribbons, settings, and modal drawers; the Mancala board pits and stores DO NOT mirror (physical layout remains constant) (`phase-1-lenses-and-access.md:47`). |
| 16 | Font Scaling Floor | Accessibility set to scale XL (200% zoom) on 360 px screen | `--font-scale` enlarges typography; text floor enforces minimum 12 px at scale M; zero horizontal scrolling; controls wrap cleanly without clipping (`phase-1-lenses-and-access.md:34`, `appendix-ux-and-safety.md:31`). |
| 17 | Network Relay Failure | Player creates friend room but WebSocket relay is down | App detects connection timeout or unset `VITE_RELAY_URL`; gracefully falls back to "Play by passing a link" asynchronous URL sharing (`phase-4-reach.md:27-29`). |

---

## 4. Deep Technical Contracts Breakdown

### 4.1 RuleSet Interface Contract
```ts
export type Player = 0 | 1;

export interface Board {
  pits: number[]; // flat array, layout defined by the RuleSet
}

export interface GameState {
  board: number[];
  turn: Player;
  over: boolean;
  extra?: unknown;
}

export interface MoveResult {
  state: GameState;
  captured: number;
  extraTurn: boolean;
  path: number[];
}

export interface RuleSet {
  id: string;                         // 'kalah' | 'oware' | 'sow-and-score' | 'congkak' | 'bao'
  name: string;                       // display name (i18n key)
  initial(): GameState;
  legalMoves(s: GameState): number[]; // valid pit indices
  apply(s: GameState, move: number): MoveResult; // pure functional transition
  isTerminal(s: GameState): boolean;
  score(s: GameState): [number, number];     // banked stones [P0, P1]
  key(s: GameState): string;                 // TT key including variant options
  layout: {
    rows: number;
    cols: number;
    stores: number[];
    pitOwner(i: number): Player;
    label(i: number): string;
  };
}
```
- **Immutability Contract**: `apply(s, move)` never modifies `s.board` in-place; always allocates a new array.
- **Invariant**: Conservation of stones:
  $$\sum_{i} \text{board}_{\text{initial}}[i] = \sum_{i} \text{board}_{\text{final}}[i]$$
- **Board Decoupling**: No literal `13`, `6`, or `12 - i` permitted outside `src/rules/kalah.ts`.

### 4.2 Web Worker Communication Protocol
- **Worker Instantiation**: Module worker syntax:
  ```ts
  const worker = new Worker(new URL('./search.worker.ts', import.meta.url), { type: 'module' });
  ```
- **Request/Response Protocol**:
  ```ts
  // Outgoing to Worker
  interface SearchRequest {
    id: number;
    rules: string;
    state: GameState;
    depth: number;
  }

  // Incoming from Worker
  interface AnalysisResult {
    id: number;
    score: number;
    winProb: number;
    pv: number[]; // Full principal variation
    evaluatedMoves: EvaluatedMove[];
    depth: number;
    exact?: boolean;
  }
  ```
- **Concurrency & Stale Result Rejection**:
  - Incremental request ID counter.
  - Handler discards results when `res.id !== currentRequestId`.
  - Calling `searchClient.cancel(id)` posts `{ type: 'cancel', id }` to terminate current search tree.
- **Main-Thread Fallback**:
  - If `typeof Worker === 'undefined'`, synchronously invoke engine search on main thread.
- **Transposition Table Lifecycle**:
  - Lives in worker heap memory.
  - Cleared on rules change or when entries >= `TT_MAX_ENTRIES` (250,000).

### 4.3 Exact Endgame Solver Specification
- **Method Signature**:
  ```ts
  function solveExact(
    rules: RuleSet,
    s: GameState,
    budgetNodes: number = 300_000
  ): { value: number; best: number[]; exact: true } | null;
  ```
- **Activation Threshold**: Stones remaining on board $\le 14$ stones.
- **Algorithm**:
  - Full-depth minimax with alpha-beta pruning.
  - State memoization via `rules.key(s)`.
  - Node counter checked at each recursion: if `nodesCount > budgetNodes`, return `null`.
- **500 Benchmark Positions Cross-Check**:
  - Seeded playout generator produces 500 distinct endgame configurations ($\le 14$ stones).
  - Test compares `solveExact(rules, pos, Infinity).value` against reference brute-force minimax without caching or pruning (`referenceMinimax(pos)`).
  - Assertion: $\forall i \in [1, 500], \text{solveExact}(p_i) \equiv \text{referenceMinimax}(p_i)$.

### 4.4 Replay Codec & Storage Contracts
- **LocalStorage Schema (`mancala_game_v1`)**:
  ```ts
  interface StoredGameV1 {
    rulesId: string;
    options: Record<string, unknown>;
    history: number[]; // pit move indices from initial()
    mode: 'pve' | 'ai_vs_ai' | 'pvp' | 'sandbox';
    botLevel: string;
    savedAt: number; // Unix timestamp ms
  }
  ```
  - Replays sequentially from `RuleSet.initial()` on startup.
  - Corrupt or illegal moves are caught by `try/catch` and discarded cleanly.
- **Replay URL Codec**:
  - Format: `#/r/<version>.<rulesId>.<encodedMoves>.<flags>`
  - Pit indices packed at 4 bits per move (range 0–15).
  - Base64URL encoding (URL-safe characters `-` and `_`).
  - Round-trip fuzzer test: 1,000 random valid games pass `decode(encode(game)) == game`.

### 4.5 Accessibility & UX Contracts
- **Axe Audit Gate**: Zero critical or serious accessibility violations across all tabs and modals via `@axe-core/playwright`.
- **WCAG Standards**:
  - AA contrast (4.5:1 text, 3:1 UI) on Walnut, Clay, Slate.
  - AAA contrast (7:1 text) on High Contrast skin.
  - Text floor $\ge 12\text{ px}$ at scale M.
- **7 Lenses & 4 Presets**:
  - Lenses: `advantageBar`, `errorRate`, `bestMoveMarks`, `winPercent`, `mainLine`, `coach`, `explanations`.
  - `justPlay`: All 7 lenses OFF. Visual screen contains strictly: Board, Turn Indicator, Tray.
  - `hints`: Only `bestMoveMarks` ON.
  - `coach`: `coach`, `explanations`, `advantageBar` ON.
  - `full`: All 7 lenses ON.
- **Highlight Precedence**:
  $$\text{preview} > \text{best} > \text{lastMove} > \text{playable}$$
  - Exactly one highlight class applied to any given pit.
- **RTL Behavior**:
  - `<html dir="rtl" lang="ar">`.
  - Board orientation is physically immutable (pits do NOT mirror left-to-right).
  - Only navigation chrome, cards, and modal sheets mirror.

### 4.6 E2E Testing Architecture Requirements
- **Playwright 4 Viewports**:
  1. `360x740` (Mobile Small)
  2. `393x852` (Mobile Modern)
  3. `768x1024` (Tablet Portrait)
  4. `1280x800` (Desktop / Tablet Landscape)
- **Zero Horizontal Scroll Assertion**:
  ```ts
  const hasNoHScroll = await page.evaluate(
    () => document.documentElement.scrollWidth <= window.innerWidth
  );
  expect(hasNoHScroll).toBe(true);
  ```
  Executed on every screen, modal, and drawer at 360 px width across English (`en`), Arabic (`ar`), and Spanish (`es`).
- **5-Item Tray**:
  - Exactly 5 navigation items: Board, Analysis, Coach, Rules, Settings.
  - Rules button accessible ONLY in bottom tray.
- **Preserved data-testid Contracts**:
  - Grep test ensures all 28 preserved testids remain in DOM.
- **Offline PWA**:
  - Workbox asset caching.
  - Playwright `context.setOffline(true)` verifies complete gameplay offline without network errors.

---

## 5. Logic Chain

1. **RuleSet Interface Isolation**:
   - *Observation*: `src/engine.ts` currently hardcodes 14 pits, store indices 6 and 13, and opposite pit formula `12 - i` throughout move simulation and evaluation.
   - *Logic*: Introducing variant rules (Oware 12 pits, Sow & Score) would require branching on every board access unless encapsulated behind a polymorphic `RuleSet` interface.
   - *Requirement*: Isolate board topology into `src/rules/types.ts` and `src/rules/kalah.ts`.

2. **Web Worker Offloading**:
   - *Observation*: Minimax search at depth $\ge 6$ blocks JavaScript execution on the main thread for hundreds of milliseconds, violating the < 100 ms interaction latency SLA.
   - *Logic*: Moving search into a dedicated Vite Web Worker frees the main thread for 60fps animations and immediate touch response.
   - *Requirement*: Protocol must support request cancellation (`cancel(id)`) and latest-request-wins to drop outdated calculations when players move quickly.

3. **Endgame Truth Guarantee**:
   - *Observation*: Mid-game search uses an empirical evaluation function and sigmoid probability curve, which can display misleading percentages (e.g. 63% on a solved win).
   - *Logic*: Small-stone endgames ($\le 14$ stones) have a sufficiently constrained state space that full-depth minimax can solve the exact final score difference within a 300k node budget.
   - *Requirement*: Evaluations must be explicitly tagged as `exact` or `estimate`, with exact positions locked to 0%, 50%, or 100% win probability and cross-checked against 500 benchmark positions.

4. **Storage Corruption Protection**:
   - *Observation*: Saving raw board state snapshots leads to corrupted games if rule engine logic or board representations change between releases.
   - *Logic*: Storing only initial parameters and an ordered sequence of move pit indices guarantees reproducible replay from `initial()`.
   - *Requirement*: `mancala_game_v1` and the replay URL codec must serialize move history and validate moves upon playback, failing gracefully on invalid data.

5. **Accessibility & Responsive Soundness**:
   - *Observation*: Mobile devices with 360 px viewport width frequently experience horizontal layout overflow from tables or long badges.
   - *Logic*: Enforcing automated Playwright assertions across 4 distinct viewports, coupled with Axe-core accessibility auditing, prevents regressions before deployment.
   - *Requirement*: Strictly enforce zero horizontal scroll, 5-item tray lock, WCAG AA/AAA contrast, and logical RTL styling without physical board flipping.

---

## 6. Caveats

1. **Oware Grand Slam Ambiguity**: Historical sources differ on whether capturing all remaining stones on the opponent's side is permitted, illegal, or forfeits captures. The specification explicitly dictates choosing one documented rule set (Abapa) and logging any unverified rules in `docs/plan/OPEN-QUESTIONS.md`.
2. **Serverless WebSocket Relay**: Phase 4's optional friend-play relay requires Cloudflare Workers or equivalent infrastructure. If `VITE_RELAY_URL` is omitted, the client must seamlessly fall back to asynchronous URL replay passing.
3. **PWA Service Worker in Development**: Service worker precaching must only activate in production builds to prevent stale module caching during Vite development cycles.
4. **Speech Synthesis Platform Support**: Web Speech API is known to vary significantly between mobile Safari, Chrome, and Android webviews; read-aloud functionality must feature-detect and remain opt-in with a visual speaker toggle.

---

## 7. Conclusion

The architectural blueprints in `docs/plan/` specify a cohesive, robust, and verifiable technical contract across all phases. The foundation rests on a headless `RuleSet` interface, non-blocking Web Worker search, an exact endgame solver validated against 500 reference positions, replay codecs fuzzed across 1,000 states, and strict mobile/accessibility guardrails verified by Playwright and Axe-core.

All 37 discovered features and 17 edge cases have been cataloged with precise types, schemas, and test criteria ready for immediate phased implementation.

---

## 8. Verification Method

To independently verify the baseline and enforce these technical contracts:

1. **Logic Test Verification**:
   ```bash
   npm test
   ```
   *Expected*: All 5 test suites pass cleanly (27 unit tests).

2. **TypeScript Compilation Check**:
   ```bash
   npx tsc --noEmit
   ```
   *Expected*: Zero errors, clean exit code 0.

3. **Playwright E2E & No-Horizontal-Scroll Verification** (upon Phase 0 setup):
   ```bash
   npm run test:e2e
   ```
   *Verification Points*:
   - Assert `scrollWidth <= innerWidth` across `360x740`, `393x852`, `768x1024`, and `1280x800`.
   - Verify zero Axe-core critical/serious violations.
   - Verify bottom tray maintains exactly 5 items and Rules is housed only in the tray.

4. **Solver & Codec Verification**:
   - Run endgame cross-check test asserting exact match on 500 positions against reference minimax.
   - Run replay codec fuzzer asserting 1,000 randomized state round-trips.
