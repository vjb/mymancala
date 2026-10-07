# Project: 2030s GNU Backgammon for Mancala

## Architecture
- **Framework & Tooling**: React 18, TypeScript (strict types, ES2020), Vite 5, Tailwind CSS 3, Vitest, Playwright E2E.
- **Rule Engine**: Headless polymorphic `RuleSet` architecture in `src/rules/`. Complete encapsulation of board dimensions, stores, sowing direction, capture mechanics, and terminal evaluations. Board geometry literals (14, 13, 6, 12-i) strictly isolated in `src/rules/kalah.ts`.
- **UI & State Machine**: Monolith `src/App.tsx` decomposed into pure `gameReducer` (`src/game/`), custom hooks (`src/game/useGame.ts`), and modular presentational components (`src/components/board/`, `src/components/panels/`, `src/components/shell/`). Preserves all 35+ `data-testid` attributes.
- **Search & Offloading**: Web Worker architecture (`src/workers/search.worker.ts`, `src/workers/searchClient.ts`) communicating via structured message requests with request-ID cancellation and main-thread fallback.
- **Persistence & Share**: Local-first storage (`mancala_game_v1`, `mancala_mistakes_v1`, `mancala_progress_v1`, `mancala_rating_v1`) via move replay logs. Bit-packed URL hash replay codec (`#/r/<v1>.<rulesId>.<encodedMoves>.<flags>`). On-device `<canvas>` result card export with zero PII.
- **Accessibility & i18n**: WCAG AA/AAA compliance, minimum font floor >= 12px, full keyboard traversal, ARIA live region move narration, Web Speech API read-aloud. Typed translation catalogs (`en`, `ar`, `es`) with `<html dir="rtl">` logical layout while preserving physical board orientation.
- **Offline PWA**: Workbox service worker caching all static assets and operating 100% offline.
- **Variants & Networking**: Kalah, Oware (Abapa), Sow & Score (intro), Congkak/Dakon (beta), and Bao (beta). Ephemeral WebSocket relay with asynchronous URL-passing fallback. Strictly preset emoji reactions (zero free-text chat).

---

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Headless RuleSet Interface | Abstract generic contract decoupling board geometry and sowing rules | M0 | `phase-0-foundation.md:6-25` |
| 2 | Kalah RuleSet Implementation | 14-pit board, stores 6 & 13, opposite capture, free turns isolated in `kalah.ts` | M0 | `phase-0-foundation.md:26-33` |
| 3 | Monolith Decomposition | Decompose `src/App.tsx` (~2.5k lines) to < 300 lines using pure reducers and composable components | M0 | `phase-0-foundation.md:34-53` |
| 4 | Web Worker Engine Search | Minimax & TT offloaded to cancellable Web Worker with main-thread fallback | M0 | `phase-0-foundation.md:54-64` |
| 5 | Move Replay Autosave & Resume | Replay move list from `initial()` under `mancala_game_v1` on reload | M0 | `phase-0-foundation.md:65-69` |
| 6 | Expandable Principal Variation | Full PV search line with responsive truncation and tap-to-expand sheet | M0 | `phase-0-foundation.md:70-72` |
| 7 | Mobile Guardrail Playwright Suite | Automated cross-viewport E2E testing (4 viewports: 360x740, 393x852, 768x1024, 1280x800) | M-E2E | `phase-0-foundation.md:73-77` |
| 8 | Lens Gating & Empty States | Gate hints behind `bestMoveMarks`; show friendly empty state when analysis lenses off | M1 | `phase-1-lenses-and-access.md:6-11` |
| 9 | Bot Speed Control Relocation | Move speed controls into Settings; enforce 0.6 s minimum bot thinking floor | M1 | `phase-1-lenses-and-access.md:8` |
| 10 | Unified Highlight Language | Single highlight kind per pit with strict precedence (`preview` > `best` > `lastMove` > `playable`) | M1 | `phase-1-lenses-and-access.md:12-27` |
| 11 | Touch Preview & Double-Tap | Long-press (350 ms) preview; normal tap plays; optional "Tap twice to move" setting | M1 | `phase-1-lenses-and-access.md:22-26` |
| 12 | Highlight Legend Popover | Help popover reachable from Rules modal explaining all highlight kinds | M1 | `phase-1-lenses-and-access.md:25` |
| 13 | Plain Language & Glossary | Eliminate jargon; interactive glossary popup for terms behind `explanations` lens | M1 | `phase-1-lenses-and-access.md:28-31` |
| 14 | Comfort & Typography Settings | Dynamic font scaling (S/M/L/XL via CSS `--font-scale`); hard floor >= 12 px at scale M | M1 | `phase-1-lenses-and-access.md:32-34` |
| 15 | High-Contrast & Colorblind Skins | 7:1 text contrast ratio; pebbles distinguished by shape/pattern; non-color indicators | M1 | `phase-1-lenses-and-access.md:35` |
| 16 | Reduced Motion Support | Honor system `prefers-reduced-motion` and manual toggle; replace animations with fade | M1 | `phase-1-lenses-and-access.md:36` |
| 17 | Big Mode & Forgiving Taps | Minimum 56 px tap targets, one-handed bottom 60% layout, 250 ms debounce | M1 | `phase-1-lenses-and-access.md:37` |
| 18 | Screen Reader & ARIA Live | ARIA pit labeling ("Your pit 3, 5 stones") and `aria-live="polite"` move narration | M1 | `phase-1-lenses-and-access.md:39` |
| 19 | Full Keyboard Navigation | Focus traversal with arrow keys, Enter to play, `?` for rules, Esc to close modals | M1 | `phase-1-lenses-and-access.md:39` |
| 20 | Web Speech API Read-Aloud | Spoken narration of rules, tutorial, and coach tips via `speechSynthesis` | M1 | `phase-1-lenses-and-access.md:40` |
| 21 | Typed Catalogs (en, ar, es) | Strongly typed translation files (`ar.ts` and `es.ts` conform to `typeof en`) | M1 | `phase-1-lenses-and-access.md:43-46` |
| 22 | RTL Directionality & Unmirrored Board | Set `<html dir="rtl">` for Arabic; chrome mirrors while board geometry remains unmirrored | M1 | `phase-1-lenses-and-access.md:47-50` |
| 23 | Guided Interactive Mini-Tutorial | 8–10 step tutorial on a scripted mini-board covering sowing, extra turns, captures | M1 | `phase-1-lenses-and-access.md:52-57` |
| 24 | First-Run Audience Picker | First launch selector: "Kid", "Everyone", "Learner/Expert" configuring defaults | M1 | `phase-1-lenses-and-access.md:58-60` |
| 25 | Exact Endgame Solver | Alpha-beta solver with TT and 300k node budget when stones <= 14 | M2 | `phase-2-trainer.md:5-11` |
| 26 | Truthful Evaluation Labelling | Label all evaluations `exact` or `estimate`; exact shows stone lead and 0/50/100% win chance | M2 | `phase-2-trainer.md:12-19` |
| 27 | Move Loss Classification | Classify moves into best, good, inaccuracy, mistake, blunder based on stone equity loss | M2 | `phase-2-trainer.md:20-28` |
| 28 | Error Rate Tracking | Average stone loss per move displayed as "Mistakes per 100 moves" under `errorRate` lens | M2 | `phase-2-trainer.md:26-28` |
| 29 | Mistake Log Persistence | Persist up to 200 mistakes in `mancala_mistakes_v1` with position, played, best, and loss | M2 | `phase-2-trainer.md:29-30` |
| 30 | Leitner Spaced-Repetition Drills | Practice recorded mistakes on drill board; schedule reviews across 1, 3, 7 day boxes | M2 | `phase-2-trainer.md:31-33` |
| 31 | Deterministic Tactical Explanations | Engine-verified reason codes (`EXTRA_TURN_MISSED`, `CAPTURE_AVAILABLE`, etc.) in en/ar/es | M2 | `phase-2-trainer.md:34-37` |
| 32 | Local Elo Rating Ladder | Track player rating against calibrated bot personas; K=32 early, K=16 late in `mancala_rating_v1` | M2 | `phase-2-trainer.md:38-42` |
| 33 | Upgraded Game Review Modal | Full-game review showing move grades, top 3 swing moments, and "Practice these" trigger | M2 | `phase-2-trainer.md:43-45` |
| 34 | UTC Date-Seeded Daily Puzzle | Deterministic daily puzzle from 365+ bundled database; verified by exact solver in CI | M3 | `phase-3-habit-loop.md:5-11` |
| 35 | Forgiving Streaks & Auto-Freeze | Track daily play in `mancala_progress_v1`; 1 auto-freeze per week; no red shame copy | M3 | `phase-3-habit-loop.md:12-17` |
| 36 | Gentle Achievement Badges | Milestone achievements (first win, 3-day streak, 10 puzzles, tutorial complete) | M3 | `phase-3-habit-loop.md:14-16` |
| 37 | Packed URL Replay Codec | Lossless packing of game moves (4 bits/move) into URL hash `#/r/<v1>.<rules>.<b64>.<flags>` | M3 | `phase-3-habit-loop.md:18-20` |
| 38 | Read-Only Replay Viewer | Step through any shared game forward and backward; "Play from here" into sandbox | M3 | `phase-3-habit-loop.md:20` |
| 39 | Privacy-Safe Result Card Canvas | On-device `<canvas>` card rendering result, board, replay link; zero PII | M3 | `phase-3-habit-loop.md:21-23` |
| 40 | PWA Offline Service Worker | Offline asset caching via Workbox `generateSW`; install prompt after 1st game | M3 | `phase-3-habit-loop.md:24-30` |
| 41 | Cosmetic Skin Unlocks | Board materials, pebbles, sounds unlocked by badges/streaks; core skins remain free | M3 | `phase-3-habit-loop.md:31-33` |
| 42 | Variant Registry System | Central registry (`src/rules/index.ts`) providing rules lookup and variant selectors | M4 | `phase-4-reach.md:5-9` |
| 43 | Oware (Abapa) Implementation | 2x6 pits, 4 stones/pit, CCW sowing, skip origin on >=12 stones, capture 2-3, feed rule | M4 | `phase-4-reach.md:10-14` |
| 44 | Sow & Score Introductory Variant | Simple sowing without captures; stones landing in player store score; fully solvable | M4 | `phase-4-reach.md:15-18` |
| 45 | Congkak / Dakon (Beta) | Traditional Southeast Asian variant; labelled beta with regional notice; search-only | M4 | `phase-4-reach.md:19-22` |
| 46 | Bao la Kiswahili (Beta/Optional) | 4x32 board with nyumba; ships behind `features.bao = false` if unverified | M4 | `phase-4-reach.md:19-22` |
| 47 | Ephemeral WebSocket Relay | Zero-storage Cloudflare Worker / Durable Object relay forwarding opaque JSON | M4 | `phase-4-reach.md:23-26` |
| 48 | Live Friend Play Protocol | Typed peer protocol (`hello`, `move`, `resign`, `rematch`, `ping`); local validation | M4 | `phase-4-reach.md:26-31` |
| 49 | Asynchronous Pass-by-Link Fallback | Play by passing updated replay URL hash via external messaging apps (0 relay) | M4 | `phase-4-reach.md:27` |
| 50 | Fixed Emoji Reaction Tray | In-game non-verbal communication using fixed list of emoji; zero free-text chat | M4 | `phase-4-reach.md:28` |
| 51 | Cited Historical Stories | Short cultural and historical accounts in `src/stories/*.ts` backed by academic citations | M4 | `phase-4-reach.md:32-34` |
| 52 | Zero-PII "Erase My Data" Button | Complete local storage and service worker cache wipe reachable in Settings | M1 | `appendix-ux-and-safety.md:24` |
| 53 | 4-Tier E2E Test Suite | Tier 1 (Feature Coverage >= 5xN), Tier 2 (Boundary >= 5xN), Tier 3 (Cross-feature), Tier 4 (Real-world) | M-E2E | `ORIGINAL_REQUEST.md:71-77` |
| 54 | Endgame Solver 500-Pos Benchmark | Automated cross-check of exact endgame solver vs brute-force minimax across 500 random positions | M2 | `ORIGINAL_REQUEST.md:76` |
| 55 | Replay Codec 1,000-State Fuzzer | Automated fuzzer test suite testing lossless round-trip across 1,000 random games | M3 | `ORIGINAL_REQUEST.md:77` |
| 56 | Final E2E Test Pass & Hardening | Phase 1: 100% pass of Tiers 1-4; Phase 2: Adversarial coverage hardening (Tier 5) | M4 | Project Pattern |

---

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M-E2E | E2E Testing Track | Test infra, Playwright config, 4 viewports, no-hscroll assertions, 4-tier E2E tests, publishes `TEST_READY.md` | none | IN_PROGRESS |
| M0 | Phase 0: Foundation | RuleSet interface, Kalah encapsulation, App.tsx decomposition (<300 lines), Web Worker search, move replay autosave (`mancala_game_v1`), responsive PV | none | DONE |
| M1 | Phase 1: Calm UI, A11y & i18n | 7 lenses & 4 presets (Just Play pure board), highlight precedence, high-contrast skins, font scaling, keyboard/ARIA, Web Speech, en/ar/es i18n, RTL unmirrored board, interactive tutorial, erase my data | M0 | DONE |
| M2 | Phase 2: The Trainer | Exact endgame solver (alpha-beta <=14 stones, 300k budget), exact vs estimate labelling, move loss classification, mistake log, Leitner drills, deterministic explanations, local Elo rating | M0 | DONE |
| M3 | Phase 3: Habit Loop & PWA | Daily date-seeded puzzle, forgiving streaks & auto-freeze, achievement badges, packed replay URL codec & viewer, canvas share cards, offline PWA service worker | M1, M2 | DONE |
| M4 | Phase 4: Variants, Reach & Final Pass | Oware, Sow & Score, Congkak/Bao beta, friend relay & pass-by-link, cited stories, 100% E2E test pass (Tiers 1-4), adversarial hardening (Tier 5) | M1, M2, M3, M-E2E | DONE |

---

## Interface Contracts

### RuleSet (`src/rules/types.ts`)
```ts
export type Player = 0 | 1;

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

### Web Worker Engine Protocol (`src/workers/protocol.ts`)
```ts
export interface SearchRequest {
  id: number;
  rules: string;
  state: GameState;
  depth: number;
}

export interface EvaluatedMove {
  pit: number;
  score: number;
  pv: number[];
}

export interface AnalysisResult {
  id: number;
  score: number;
  winProb: number;
  pv: number[];
  evaluatedMoves: EvaluatedMove[];
  depth: number;
  exact?: boolean;
}
```

### Exact Endgame Solver (`src/engine/solver.ts`)
```ts
export interface SolverResult {
  value: number;       // Exact terminal margin from perspective of s.turn
  best: number[];      // Optimal move sequence / best moves
  exact: true;
}

export function solveExact(
  rules: RuleSet,
  s: GameState,
  budgetNodes?: number
): SolverResult | null;
```

### Replay Codec (`src/share/codec.ts`)
```ts
export interface ReplayPayload {
  version: 1;
  rulesId: string;
  history: number[];
  flags?: number;
}

export function encodeReplay(payload: ReplayPayload): string;
export function decodeReplay(hash: string): ReplayPayload | null;
```

---

## Code Layout
```
c:\Users\vjbel\hacks\mymancala\
├── docs/plan/                    # Specification blueprints & PROGRESS.md
├── e2e/                          # Playwright end-to-end tests
│   ├── a11y.spec.ts              # Axe-core accessibility audit
│   ├── no-hscroll.spec.ts        # Zero horizontal scroll across 4 viewports
│   ├── tray.spec.ts              # 5-item bottom tray lock
│   ├── tutorial.spec.ts          # Interactive onboarding flow
│   └── game.spec.ts              # Full gameplay & preset tests
├── src/
│   ├── components/
│   │   ├── board/                # Board, Pit, Store, Pebble, PebbleCluster
│   │   ├── panels/               # AnalysisPanel, CoachPanel, SettingsPanel
│   │   ├── modals/               # RulesModal, GameReviewModal, TutorialModal
│   │   └── shell/                # Header, TurnIndicator, BottomTray, NavItem
│   ├── game/
│   │   ├── gameReducer.ts        # Pure reducer (MOVE, UNDO, RESET, SET_MODE)
│   │   ├── gameTypes.ts          # UI state actions and state interfaces
│   │   └── useGame.ts            # Custom hook orchestrating gameReducer & searchClient
│   ├── engine/
│   │   ├── search.ts             # Minimax, alpha-beta, evaluation heuristics
│   │   ├── solver.ts             # Exact endgame solver (budgeted <=14 stones)
│   │   └── classification.ts     # Move loss grading (5 tiers)
│   ├── rules/
│   │   ├── types.ts              # RuleSet, GameState, MoveResult interfaces
│   │   ├── index.ts              # Variant registry
│   │   ├── kalah.ts              # Kalah RuleSet implementation & geometry
│   │   ├── oware.ts              # Oware (Abapa) RuleSet
│   │   └── sow-and-score.ts      # Sow & Score RuleSet
│   ├── workers/
│   │   ├── protocol.ts           # Worker message types
│   │   ├── search.worker.ts      # Web Worker execution entry point
│   │   └── searchClient.ts       # Async client with cancellation and fallback
│   ├── i18n/
│   │   ├── index.ts              # Typed translation loader & provider
│   │   ├── en.ts                 # Canonical English catalog
│   │   ├── ar.ts                 # Arabic catalog (implements typeof en)
│   │   ├── es.ts                 # Spanish catalog (implements typeof en)
│   │   └── glossary.ts           # Tactical glossary definitions
│   ├── share/
│   │   ├── codec.ts              # Bit-packed replay URL hash codec
│   │   └── card.ts               # On-device HTML5 canvas result card generator
│   ├── habit/
│   │   ├── puzzles.ts            # 365+ bundled daily puzzles with UTC lookup
│   │   ├── streaks.ts            # Forgiving streak & weekly freeze manager
│   │   └── badges.ts             # Offline achievement definitions & progress
│   ├── trainer/
│   │   ├── mistakes.ts           # Mistake logger (capped 200) & Leitner boxes
│   │   ├── rating.ts             # Local Elo rating ladder
│   │   └── explanations.ts       # Deterministic tactical reason codes
│   ├── App.tsx                   # Top-level shell (< 300 lines)
│   ├── main.tsx                  # React 18 DOM mount
│   ├── lenses.ts                 # 7 lenses and 4 presets definitions
│   ├── theme.ts                  # Theme tokens (Walnut, Clay, Slate, High Contrast)
│   └── sound.ts                  # Web Audio synthesizer
├── relay/                        # Ephemeral serverless WebSocket relay
└── playwright.config.ts          # Playwright 4-viewport test runner configuration
```
