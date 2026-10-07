# Specification Mining Handoff Report — Mancala Trainer Blueprint

## 1. Observation

### 1.1 Specification Source Documents
Direct observations were extracted from the authoritative blueprint documents in the repository:
- `c:\Users\vjbel\hacks\mymancala\.agents\teamwork\ORIGINAL_REQUEST.md` (Lines 1–79)
- `docs/plan/README.md` (Lines 1–78)
- `docs/plan/phase-0-foundation.md` (Lines 1–80)
- `docs/plan/phase-1-lenses-and-access.md` (Lines 1–63)
- `docs/plan/phase-2-trainer.md` (Lines 1–48)
- `docs/plan/phase-3-habit-loop.md` (Lines 1–36)
- `docs/plan/phase-4-reach.md` (Lines 1–37)
- `docs/plan/appendix-rules-and-sources.md` (Lines 1–36)
- `docs/plan/appendix-ux-and-safety.md` (Lines 1–48)
- Source code references: `src/App.tsx` (Lines 926–2588 for existing `data-testid` bindings) and `src/lenses.ts` (Lines 1–156 for lenses and presets).

---

### 1.2 The 10 Locked Global Rules (from `docs/plan/README.md:58-70`)
1. **Keep the app working at every commit.** Run `npm test`, `npx tsc --noEmit`, and `npm run build` before each commit. Commit per task or per small group of tasks, with a conventional message (`feat:`, `fix:`, `refactor:`, `test:`, `docs:`).
2. **Tests first for logic.** Anything in the engine, solver, rating, puzzles, serialization, or i18n gets unit tests before or alongside the code. For search/solver work, cross-check against a slow reference implementation (see `src/search.test.ts` for the pattern).
3. **Preserve these `data-testid`s** (existing tests and diagnostics rely on them): `pit-N`, `pit-count-N`, `store-6`, `total-stones`, `turn-indicator`, `eval-gauge`, `eval-row-0`, `eval-row-worst`, `eval-play-pit-N`, `tutor-toggle`, `tutor-reconsider`, `tutor-play-best`, `tutor-confirm`, `tutor-modal`, `reset-game-btn`, `bottom-rules-btn`, `bottom-board-btn`, `bottom-analysis-btn`, `bottom-settings-btn`, `ribbon-hints-btn`, `analysis-review-btn`, `mode-pve|ai_vs_ai|pvp|sandbox`, `ai-duel-toggle`, `open-diagnostics-btn`, `preset-<id>`, `lens-<id>`, `sandbox-plus-N`, `sandbox-minus-N`. Add new ones in the form `<area>-<thing>`.
4. **Do not break these behaviours:**
   - Zero horizontal scrolling on any screen at 360 px width.
   - The mobile bottom tray stays exactly five fixed items (`Board`, `Analysis`, `Coach`, `Rules`, `Settings`).
   - `Rules` is reachable only from the tray (not the top bar).
   - The computer pauses ~1.2 s before moving at default speed (~1.6 s on slow; minimum 0.6 s thinking floor even in instant mode).
5. **Never fabricate sources, history, or rules.** For cultural content and variant rules follow `appendix-rules-and-sources.md` and mark anything unverified clearly in code comments and in a `docs/plan/OPEN-QUESTIONS.md` file (create it if missing).
6. **No tracking, no analytics, no third-party network calls at runtime** (fonts, scripts, CDNs). Everything ships in the bundle. The relay in phase 4 is the only allowed network endpoint and is opt-in.
7. **Plain words by default.** User-facing strings must avoid jargon ("equity", "plies", "PR") unless inside the Full Analysis preset, and even then link to a glossary entry. All user-facing strings go through i18n from phase 1 onward.
8. **Accessibility is a requirement, not polish.** See `appendix-ux-and-safety.md` for the checklist; each phase doc lists which items it must satisfy.
9. **Document as you go.** Update `README.md` at the end of each phase (features, commands, layout). Keep this plan's checkboxes ticked in the phase docs.
10. **Handling ambiguity:** If a task is ambiguous or blocked, write the question in `docs/plan/OPEN-QUESTIONS.md`, choose the safest reversible option, and continue.

---

### 1.3 Locked Architectural Decisions (from `docs/plan/README.md:9-27`)
| Topic | Decision |
|---|---|
| **Identity** | Game first, trainer second. Depth is opt-in. |
| **Stats** | Presets (Just Play / Hints / Coach / Full Analysis) plus a switch per stat ("lenses"). Built in `src/lenses.ts`. |
| **Audience** | One board, layered experience: big friendly mode for kids/elders, full depth opt-in. |
| **Truth** | Exact solving for endgames (small stone counts <= ~14), deep search for middle game, every evaluation labelled `exact` or `estimate`. Never overclaim. Full-game solving is out of scope. |
| **Progress** | Local-first. No accounts. Export/import as a file or link. |
| **Variants** | Kalah, Oware, and an intro variant ("Sow & Score") ship fully. Congkak/Dakon and Bao ship as beta (playable, search-only grading, clearly labelled). |
| **Look** | Warm, tactile, timeless materials (Walnut, Clay, Slate + unlockables). Themes are data (`src/theme/tokens.ts`). |
| **Platform** | Installable PWA (offline, home-screen). Store wrappers only later. |
| **Accessibility** | Languages (English, Arabic with RTL, Spanish), text size / contrast / reduced motion, one-handed + forgiving taps, screen reader + keyboard, voice read-aloud. |
| **Business/Safety** | Free, no ads, no tracking, kid-safe by design. No free-text chat, ever. |
| **Coaching text** | Deterministic, generated from engine facts. No LLM. No "AI" branding. |
| **Viral** | Daily puzzle, friend-by-link, rating ladder (local), streaks + badges, drills from your own mistakes, cosmetic unlocks, cultural stories, privacy-safe result cards (image generated on device). |
| **Online** | Static PWA on a free static host. Replay/puzzle links encode data in the URL hash. Friend play uses one tiny optional serverless relay (no accounts, no stored personal data). That relay is the only server piece. |
| **Stack** | Keep Vite + React 18 + TypeScript + Tailwind. Add: Web Workers, hand-rolled typed i18n (no heavy library), `vite-plugin-pwa`, Vitest (logic), Playwright (phone-size end-to-end). No Next.js, no global state library. |

---

### 1.4 Preserved `data-testid` Inventory
Derived from `docs/plan/README.md:62` and verified against current code in `src/App.tsx`:

| `data-testid` Pattern | Target Component / UI Element | Existing / Required |
|---|---|---|
| `pit-N` | Board pit button for index N (0..13) | `App.tsx:1398, 1543` |
| `pit-count-N` | Pebble count badge for pit N | `App.tsx:1491, 1635` |
| `store-6` | Player 0 (South) Kalah store container | `App.tsx:1668` |
| `store-13` | Player 1 (North) Kalah store container | `App.tsx:1328` |
| `total-stones` | Header stone count indicator | `App.tsx:1107` |
| `turn-indicator` | Turn state banner ("Your Turn", "Bot Thinking") | `App.tsx:1097` |
| `eval-gauge` | Live advantage / evaluation gauge bar | `App.tsx:946` |
| `eval-row-0` | Best move row in the evaluation panel | `App.tsx:1950, 2088` |
| `eval-row-worst` | Worst move row in the evaluation panel | `App.tsx:1950, 2088` |
| `eval-play-pit-N` | "Play this" action button for pit N in eval row | `App.tsx:1983, 2129` |
| `tutor-toggle` | Coach toggle button in bottom tray | `App.tsx:2527` |
| `tutor-reconsider` | Coach modal "Think again" button | `App.tsx:1772` |
| `tutor-play-best` | Coach modal "Play best move" button | `App.tsx:1783` |
| `tutor-confirm` | Coach modal "Play anyway" button | `App.tsx:1791` |
| `tutor-modal` | Coach intervention dialog | `App.tsx:1726` |
| `reset-game-btn` | New game / reset button | `App.tsx:926` |
| `bottom-board-btn` | Bottom tray Board navigation item | `App.tsx:2498` |
| `bottom-analysis-btn`| Bottom tray Analysis navigation item | `App.tsx:2512` |
| `bottom-rules-btn` | Bottom tray Rules navigation item | `App.tsx:2543` |
| `bottom-settings-btn`| Bottom tray Settings navigation item | `App.tsx:2556` |
| `ribbon-hints-btn` | Fast ribbon hints toggle button | `App.tsx:1124` |
| `analysis-review-btn`| Trigger game review modal button | `App.tsx:1920` |
| `mode-pve` | Game mode selector: PvE | `App.tsx:2326` |
| `mode-ai_vs_ai` | Game mode selector: AI vs AI | `App.tsx:2326` |
| `mode-pvp` | Game mode selector: PvP (pass-and-play) | `App.tsx:2326` |
| `mode-sandbox` | Game mode selector: Sandbox board editor | `App.tsx:2326` |
| `ai-duel-toggle` | AI Duel toggle switch in settings | `App.tsx:2383` |
| `open-diagnostics-btn`| Diagnostics modal trigger | `App.tsx:2470` |
| `diagnostics-modal` | Diagnostics debug modal | `App.tsx:2588` |
| `game-over-banner` | Final game result announcement banner | `App.tsx:1158` |
| `game-over-review-btn`| Game over review trigger | `App.tsx:1169` |
| `preset-justPlay` | Lens preset button: Just Play | `App.tsx:2208` |
| `preset-hints` | Lens preset button: Hints | `App.tsx:2208` |
| `preset-coach` | Lens preset button: Coach | `App.tsx:2208` |
| `preset-full` | Lens preset button: Full Analysis | `App.tsx:2208` |
| `lens-advantageBar` | Individual lens toggle: Advantage bar | `App.tsx:2238` |
| `lens-errorRate` | Individual lens toggle: Accuracy tracker | `App.tsx:2238` |
| `lens-bestMoveMarks` | Individual lens toggle: Best-move marks | `App.tsx:2238` |
| `lens-winPercent` | Individual lens toggle: Win chances | `App.tsx:2238` |
| `lens-mainLine` | Individual lens toggle: Expected sequence | `App.tsx:2238` |
| `lens-coach` | Individual lens toggle: Coach warnings | `App.tsx:2238` |
| `lens-explanations` | Individual lens toggle: Explanations | `App.tsx:2238` |
| `sandbox-plus-N` | Sandbox stone increment button for pit N | `App.tsx:1507, 1651` |
| `sandbox-minus-N` | Sandbox stone decrement button for pit N | `App.tsx:1500, 1644` |

*Naming convention for all future testids:* strictly `<area>-<thing>` (e.g. `tutorial-step-next`, `share-card-btn`, `drill-answer-pit-N`).

---

### 1.5 Features Discovered Across All Phases

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| 1 | Architecture | Headless `RuleSet` Interface | Abstract generic rules interface defining board layout, legal moves, transitions, scores, and TT keys | `GameState`, move index | `MoveResult`, `[score0, score1]`, TT key string | Invalid move rejected with empty/no-op result | `phase-0-foundation.md:6-25` |
| 2 | Architecture | Kalah RuleSet Implementation | Encapsulate Kalah board logic (14 pits, stores 6 & 13, opposite `12 - i`, free turn on store landing, capture opposite) behind `RuleSet` | `RulesConfig` (`freeTurn`, `captureOpposite`, stones) | `RuleSet` instance | Invalid options fallback to standard Kalah defaults | `phase-0-foundation.md:26-33`, `appendix-rules-and-sources.md:5-7` |
| 3 | Architecture | Monolith Decomposition | Decompose `src/App.tsx` (~2.6k lines) to < 300 lines using pure reducers and composable component hierarchy | Reducer actions (`MOVE`, `UNDO`, `RESET`, `SET_MODE`), React props | Lean modular UI tree | State corruption avoided via reducer purity | `phase-0-foundation.md:34-53` |
| 4 | Architecture | Web Worker Engine Search | Move minimax search and transposition table to `search.worker.ts` with cancellable `searchClient` | `SearchRequest {rules, state, depth, id}` | `Promise<AnalysisResult>` | Drops stale request `id`; main-thread fallback if Worker API unsupported | `phase-0-foundation.md:54-64` |
| 5 | Architecture | Move Replay Autosave & Resume | Save game to `localStorage` key `mancala_game_v1` using move list; replay moves from `initial()` on reload | Move sequence, rule ID, bot level, timestamp | Restored `GameState` or resume prompt ("Continue / New game") | Corrupt saves discarded safely without crashing | `phase-0-foundation.md:65-69` |
| 6 | Architecture | Expandable Principal Variation (PV) | Store full PV line in search result; truncate with ellipsis and tap-to-expand sheet without horizontal scroll | PV move array | Truncated inline text + expanded modal/sheet | Clamped to screen width | `phase-0-foundation.md:70-72` |
| 7 | Testing | Mobile Guardrail Playwright Suite | Automated cross-viewport E2E testing (360x740, 393x852, 768x1024, 1280x800) asserting 0 horizontal scroll and strictly 5 tray items | Viewport sizes, page URLs | Pass/fail test assertions | Build failure on horizontal overflow or layout regressions | `phase-0-foundation.md:73-77` |
| 8 | Lenses & UI | Lens Gating & Empty States | Gate `ribbon-hints-btn` behind `bestMoveMarks`; show friendly empty state with one-tap coach preset in Analysis tab when lenses off | Lens state (`LensState`) | Filtered UI components or empty state prompt | Falls back to default preset (`coach`) | `phase-1-lenses-and-access.md:6-11`, `lenses.ts` |
| 9 | Lenses & UI | Bot Speed Control Relocation | Move speed controls (Slow/Normal/Fast/Instant) into Settings panel; enforce 0.6 s minimum bot thinking floor even on Instant | Selected speed tier | Animation speed setting, bot turn pause delay | Clamp delay >= 600 ms | `phase-1-lenses-and-access.md:8` |
| 10 | Interaction | Unified Highlight Language | Enforce single highlight kind per pit with strict precedence: `preview` > `best` > `lastMove` > `playable` | Pit index, hover/touch state, legal moves, lens state | Single `HighlightKind` visual styling | Conflicting highlights resolved by precedence | `phase-1-lenses-and-access.md:12-27` |
| 11 | Interaction | Touch Preview & Double-Tap | Long-press (350 ms) previews move; normal tap plays; optional "Tap twice to move" setting for beginner/kid mode | Touch start/end/move events, toggle setting | Visual preview or executed move | Clears preview on release, scroll, or blur | `phase-1-lenses-and-access.md:22-26` |
| 12 | Interaction | Highlight Legend Popover | Help popover reachable from Rules modal explaining the meaning of all 5 highlight kinds | Tap on "?" button | Visual modal/sheet describing rings, badges, pulses | Dismiss on outside tap or Esc | `phase-1-lenses-and-access.md:25` |
| 13 | Content & UX | Plain Language & Glossary | Eliminate jargon ("equity", "plies", "PR"); provide interactive glossary behind `explanations` lens | Tap on glossary terms | Plain English definitions popup (`src/i18n/glossary.ts`) | Missing key falls back to plain label | `phase-1-lenses-and-access.md:28-31` |
| 14 | Accessibility | Comfort & Typography Settings | Dynamic font scaling (S/M/L/XL via CSS `--font-scale`); hard floor >= 12 px at scale M | Selected text scale | Root font size variable, scaled rem layouts | Never scale below 12 px | `phase-1-lenses-and-access.md:32-34` |
| 15 | Accessibility | High-Contrast & Colorblind Skins | 7:1 text contrast ratio; pebbles distinguished by shape/pattern; players distinguished by side and icon | Selected theme token | Colorblind-safe tactile SVG/canvas assets | Defaults to WCAG AA standard skin | `phase-1-lenses-and-access.md:35` |
| 16 | Accessibility | Reduced Motion Support | Honor system `prefers-reduced-motion` and manual toggle; replace animations with fast fade and stone count | Media query or setting | Instant state update with gentle fade | Disable CSS transitions/animations | `phase-1-lenses-and-access.md:36` |
| 17 | Accessibility | Big Mode & Forgiving Taps | Minimum 56 px tap targets, one-handed bottom 60% layout, 250 ms debounce against accidental double taps | Touch taps, setting toggle | Responsive touch targets | Ignore duplicate taps within 250 ms | `phase-1-lenses-and-access.md:37` |
| 18 | Accessibility | Screen Reader & ARIA Live Regions | Full ARIA labeling on pits ("Your pit 3, 5 stones, legal move") and `aria-live="polite"` move announcements | Board state changes | Verbatim spoken text for assistive technology | Gracefully ignored if no screen reader | `phase-1-lenses-and-access.md:39` |
| 19 | Accessibility | Full Keyboard Navigation | Focus traversal with arrow keys, Enter to play, `?` for rules, Esc to close modals, focus trap & restoration | Keyboard keydown events | Focus shifts, modal closures, move triggers | Retain focus inside active modal | `phase-1-lenses-and-access.md:39` |
| 20 | Accessibility | Web Speech API Read-Aloud | Spoken narration of rules, tutorial steps, and coach tips using native `speechSynthesis` | Button tap, current text, active locale | Synthesized speech output | Feature check; silent fallback if unsupported | `phase-1-lenses-and-access.md:40` |
| 21 | Localization | Typed Catalogs (en, ar, es) | Strongly typed translation files where `ar.ts` and `es.ts` conform strictly to `typeof en` | Translation key, interpolation params | Localized string with correct plurals/numbers | Missing key fails `tsc --noEmit` build | `phase-1-lenses-and-access.md:43-46` |
| 22 | Localization | RTL Directionality & Unmirrored Board | Set `<html dir="rtl">` for Arabic; use logical CSS utilities; board pit layout remains unmirrored | Locale selection | Proper text alignment and layout mirroring | Physical board geometry remains constant | `phase-1-lenses-and-access.md:47-50` |
| 23 | Onboarding | Guided Interactive Mini-Tutorial | 8–10 step tutorial on a scripted mini-board covering sowing, extra turns, captures, and endgame | User moves, next/skip buttons | Step instructions, highlighted valid pits, animations | Disallow non-tutorial moves | `phase-1-lenses-and-access.md:52-57` |
| 24 | Onboarding | First-Run Audience Picker | First launch selector: "Kid", "Everyone", "Learner/Expert" configuring sensible initial defaults | User card selection | Updated localStorage preferences (no age stored) | Defaults to "Everyone" (Coach preset) | `phase-1-lenses-and-access.md:58-60` |
| 25 | Engine & Trainer | Exact Endgame Solver | Alpha-beta solver with transposition table and node budget (300k); triggers when stones <= ~14 | `RuleSet`, `GameState`, node budget | `{value: number, best: number[], exact: true}` or null | Returns null on budget exhaustion; falls back to search | `phase-2-trainer.md:5-11` |
| 26 | Engine & Trainer | Truthful Evaluation Labelling | Label all evaluations `exact` or `estimate`; exact displays true stone margin and 0/50/100% win chance | `Evaluation` object | Evaluator badge and formatted stone lead string | Never show fractional win% on exact endgame | `phase-2-trainer.md:12-19` |
| 27 | Engine & Trainer | Move Loss Classification | Classify moves into `best`, `good`, `inaccuracy`, `mistake`, `blunder` based on stone equity loss | Loss in stones (best eval - played eval) | `MoveGrade` enum string | Equal search depth used for both evals | `phase-2-trainer.md:20-28` |
| 28 | Engine & Trainer | Error Rate Tracking | Calculate average stone loss per move; display as "Mistakes per 100 moves" under lens `errorRate` | Cumulative game moves and losses | Formatted rate number | Exclude opening book/forced moves | `phase-2-trainer.md:26-28` |
| 29 | Engine & Trainer | Mistake Log Persistence | Persist up to 200 mistakes in `mancala_mistakes_v1` with position, played move, best move, and loss | Finished moves exceeding loss threshold | Local storage array (capped 200, FIFO) | Evict oldest mistake when capacity exceeded | `phase-2-trainer.md:29-30` |
| 30 | Engine & Trainer | Leitner Spaced-Repetition Drills | Practice recorded mistakes on an interactive drill board; schedule reviews across 1, 3, 7 day boxes | User drill move | Pass/fail outcome, updated Leitner box & due date | Handle invalid positions gracefully | `phase-2-trainer.md:31-33` |
| 31 | Engine & Trainer | Deterministic Tactical Explanations | Engine-verified reason codes (`EXTRA_TURN_MISSED`, `CAPTURE_AVAILABLE`, etc.) translated to en/ar/es | `RuleSet`, `GameState` before & after move | `ExplanationItem[]` with typed reason codes | No explanation emitted if engine checks fail | `phase-2-trainer.md:34-37` |
| 32 | Engine & Trainer | Local Elo Rating Ladder | Track player rating against calibrated bot personas; K=32 early, K=16 later; store in `mancala_rating_v1` | Match result (win/loss/draw), bot rating | Updated player rating, "Level" title | Rating number visible only under Full preset | `phase-2-trainer.md:38-42` |
| 33 | Engine & Trainer | Upgraded Game Review Modal | Full-game review showing move grades, top 3 swing moments, and "Practice these" drill trigger | Completed game move history | Interactive review graph & move timeline | Worker-based execution with progress reporting | `phase-2-trainer.md:43-45` |
| 34 | Habit Loop | UTC Date-Seeded Daily Puzzle | Deterministic daily puzzle served from 365+ bundled puzzle database; verified by exact solver in CI | UTC midnight timestamp | Daily puzzle setup, hint, unique winning solution | Unlimited attempts; gentle solve count | `phase-3-habit-loop.md:5-11` |
| 35 | Habit Loop | Forgiving Streaks & Auto-Freeze | Track consecutive daily play days; grant 1 auto-freeze per week; welcome back copy without red shaming | Daily puzzle/game completion timestamp | Active streak count, best streak, freeze status | Auto-consume freeze on missed day | `phase-3-habit-loop.md:12-17` |
| 36 | Habit Loop | Gentle Achievement Badges | Milestone achievements (first win, 3-day streak, 10 puzzles, tutorial complete) in `mancala_progress_v1` | Game and puzzle events | Unlocked badge icons and celebratory notification | No paywalls, lootboxes, or timers | `phase-3-habit-loop.md:14-16` |
| 37 | Habit Loop | Packed URL Replay Codec | Lossless packing of game moves (4 bits/move) and rules metadata into URL hash: `#/r/<v1>.<rules>.<b64>.<flags>` | Move history, ruleset ID, options | Shareable URL hash string | Malformed hash displays friendly error | `phase-3-habit-loop.md:18-20` |
| 38 | Habit Loop | Read-Only Replay Viewer | Step through any shared game forward and backward; button to "Play from here" into sandbox/casual | Replay URL hash | Board state at step N, move controls | Illegal move in sequence halts playback | `phase-3-habit-loop.md:20` |
| 39 | Habit Loop | Privacy-Safe Result Card Canvas | On-device `<canvas>` card rendering result, board illustration, and replay link; share via Web Share API | Game outcome, stats, theme | Exportable PNG file / download | No names, photos, or geo-location | `phase-3-habit-loop.md:21-23` |
| 40 | Habit Loop | PWA Offline Service Worker | Offline asset caching via Workbox `generateSW`; install prompt after 1st game; update ready toast | Network requests, service worker lifecycle | Cached offline application bundle | Silent fallback if offline without cache | `phase-3-habit-loop.md:24-30` |
| 41 | Habit Loop | Cosmetic Skin Unlocks | Unlockable board materials, pebbles, and sound packs tied to badges and streaks; core skins remain free | Unlocked badge IDs, streak level | Selectable theme choices in Settings | Purely aesthetic; never locks gameplay/analysis | `phase-3-habit-loop.md:31-33` |
| 42 | Variants | Variant Registry System | Central registry (`src/rules/index.ts`) providing rules lookup, rules descriptions, and variant selectors | Variant ID string, config options | `RuleSet` instance | Unknown ID falls back to standard Kalah | `phase-4-reach.md:5-9` |
| 43 | Variants | Oware (Abapa) Implementation | 2x6 pits, 4 stones/pit (48 total), CCW sowing, skip origin on >=12 stones, capture 2-3 backwards chain, feed rule | Game moves | Oware `MoveResult` and score updates | Grand slam / starvation rules strictly handled | `phase-4-reach.md:10-14`, `appendix-rules-and-sources.md:8-14` |
| 44 | Variants | Sow & Score Introductory Variant | Simple sowing without captures; stones landing in player's store score; fully solvable | Game moves | MoveResult and score updates | Simple terminal state when pits emptied | `phase-4-reach.md:15-18`, `appendix-rules-and-sources.md:15-17` |
| 45 | Variants | Congkak / Dakon (Beta) | Traditional Southeast Asian variant; labelled beta with regional variance notice; search-only grading | Game moves | Congkak `MoveResult` | Clear beta notice; search-only evaluation | `phase-4-reach.md:19-22`, `appendix-rules-and-sources.md:18-20` |
| 46 | Variants | Bao la Kiswahili (Beta/Optional) | 4x32 board with nyumba and complex sowing; ships behind feature flag if verified, else disabled | Game moves | Bao `MoveResult` | Disabled via `features.bao = false` if unverified | `phase-4-reach.md:19-22`, `appendix-rules-and-sources.md:21-23` |
| 47 | Multiplayer | Ephemeral Serverless WebSocket Relay | Zero-storage Cloudflare Worker / Durable Object relay forwarding opaque JSON between two sockets | Room ID (128-bit), socket messages | Relayed payload to opponent socket | Rooms expire after 30 min idle; no logs | `phase-4-reach.md:23-26` |
| 48 | Multiplayer | Live Friend Play Protocol | Typed peer messaging protocol (`hello`, `move`, `resign`, `rematch`, `ping`); local rules validation | Move sequence, peer packets | Synchronized game state | Desync prompts recovery via replay URL | `phase-4-reach.md:26-31` |
| 49 | Multiplayer | Asynchronous Pass-by-Link Fallback | Play by passing updated replay URL hash via external messaging apps; works without any relay server | Generated replay link per turn | Reconstituted board ready for next move | Invalid move URL rejected | `phase-4-reach.md:27` |
| 50 | Multiplayer | Fixed Emoji Reaction Tray | In-game non-verbal communication using fixed list of emoji; zero free-text chat | Selected emoji index | Rendered emoji animation on peer screen | Reject any non-whitelisted characters | `phase-4-reach.md:28`, `appendix-ux-and-safety.md:23` |
| 51 | Culture | Cited Historical Stories | Short cultural and historical accounts in `src/stories/*.ts` backed by academic citations | Story ID | Formatted localized reading view | Unverified historical claims strictly omitted | `phase-4-reach.md:32-34`, `appendix-rules-and-sources.md:24-36` |
| 52 | Privacy & Safety | Zero-PII "Erase My Data" Button | Complete local storage and service worker cache wipe reachable in Settings | User confirmation tap | Clean browser storage state | Confirmation dialog required before wipe | `appendix-ux-and-safety.md:24` |

---

### 1.6 Edge Cases Discovered

| # | Feature | Input | Observed Behavior |
|---|---------|-------|-------------------|
| 1 | RuleSet Sowing | Moving from a pit containing >= 12 stones in Oware | Sowing must skip the starting pit and continue counter-clockwise into subsequent pits. |
| 2 | Oware Endgame | Move would capture all remaining stones on opponent's side ("Grand Slam") | Rule varies across literature (capture none / illegal / allowed). Blueprint requires selecting one documented rule set (e.g. Abapa), documenting it, and adhering strictly to it. |
| 3 | Oware Starvation | Opponent side is empty, player has moves that can sow stones onto opponent side | Player is legally obliged to choose a move that feeds the opponent ("must-feed" rule). |
| 4 | Kalah Endgame | One player has no legal moves remaining | Sowing stops immediately; opposite player sweeps all remaining stones on their own side into their store. |
| 5 | Autosave Replay | `localStorage` contains a move sequence that is invalid or truncated | Catch error, discard corrupt save, initialize standard clean game state without throwing runtime error. |
| 6 | Exact Solver | Board has <= 14 stones, but search budget (300k nodes) is exceeded | `solveExact` returns `null`; engine falls back cleanly to deep alpha-beta heuristic search. |
| 7 | Evaluation Display | Position is fully solved by endgame solver | Display true stone differential and 0/50/100% win chance; never display fractional win percentages (e.g., 63.2%). |
| 8 | Highlight Precedence | Pit is both legally playable, indicated as best move, and hovered for touch preview | Highlight precedence strictly applies: `preview` overrides `best`, which overrides `playable`. Exactly one highlight kind rendered. |
| 9 | Touch Interaction | User touches a pit and drags finger off or scrolls screen | Preview outline and landing glow must clear immediately on `touchcancel`, `touchend`, `scroll`, or `blur`. |
| 10 | Daily Puzzle | Midnight rollover in different timezones | Date index is computed via `floor(utcMidnightMs / 86400000)` so all players worldwide receive the identical daily puzzle for that UTC date. |
| 11 | Streak Maintenance | Player misses a day due to travel or illness | System automatically applies one weekly "freeze" if available; welcome screen displays friendly "Welcome back!" without red shaming text. |
| 12 | URL Replay Codec | URL hash contains corrupted, truncated, or tampered base64 string | Decode function returns a typed error object; UI displays friendly error message without throwing uncaught exception. |
| 13 | Screen Reader ARIA | High-speed bot play or rapid consecutive moves | Live region (`aria-live="polite"`) queues announcements politely so speech synthesis does not stutter or overlap unintelligibly. |
| 14 | Responsive Layout | Viewport width is 360 px in Arabic (RTL) mode with XL font scale | Document scroll width must equal inner width (`document.documentElement.scrollWidth <= innerWidth`); text wraps cleanly without horizontal overflow. |
| 15 | Bot Speed "Instant" | User selects "Instant" speed in settings | Animation delay drops to zero, but bot thinking pause maintains a hard floor of 0.6 s so moves remain perceptible and calm. |
| 16 | Friend Relay Desync | Out-of-order move packet received or invalid move transmitted | Client rejects illegal packet and offers one-tap recovery by passing the latest encoded replay URL. |
| 17 | Relay Offline | `VITE_RELAY_URL` environment variable is undefined or relay unreachable | Live room UI is hidden or disabled; application seamlessly presents asynchronous "pass-by-link" replay sharing. |
| 18 | Data Erase Action | User clicks "Erase my data" in Settings | Triggers native confirmation; on confirm, purges all `mancala_*` localStorage keys and wipes Workbox Service Worker caches. |

---

### 1.7 Acceptance Criteria Across All Phases

#### Phase 0: Foundation
- [ ] `npx tsc --noEmit`, `npm test`, and `npm run build` pass cleanly before and after refactoring.
- [ ] `src/App.tsx` length reduced from ~2,600 lines to < 300 lines with zero global state library dependencies.
- [ ] No file outside `src/rules/kalah.ts` contains literals `13` or `12 - ` as board geometry.
- [ ] `src/rules/kalah.test.ts` runs 2,000 seeded random games comparing legacy engine vs new `RuleSet` with zero board divergence.
- [ ] Search moves entirely to Web Worker (`search.worker.ts`); initial interaction latency < 100 ms on mobile during search.
- [ ] Autosave under `mancala_game_v1` recovers exact state after 5 moves and browser reload.
- [ ] Playwright test suite passes at 360x740, 393x852, 768x1024, and 1280x800 verifying 0 horizontal scroll and strictly 5 tray items.

#### Phase 1: Calm UI, Accessibility, Languages, Onboarding
- [ ] In `justPlay` preset, only the board, turn indicator, and tray are visible.
- [ ] Ribbon hints button gated strictly behind `bestMoveMarks` lens.
- [ ] Bot speed control moved into Settings; minimum pause floor of 0.6 s enforced.
- [ ] Highlight precedence strictly follows `preview` > `best` > `lastMove` > `playable` (unit tested).
- [ ] Axe accessibility audit reports zero critical or serious violations on all main screens and modals.
- [ ] Full typed i18n catalogs for English (`en.ts`), Arabic (`ar.ts`), and Spanish (`es.ts`) with zero missing keys.
- [ ] RTL (`dir="rtl"`) renders cleanly in Arabic with unmirrored board geometry.
- [ ] Zero raw English JSX text guard test passes.
- [ ] Guided interactive tutorial (8–10 steps) completes from start to finish in Playwright.

#### Phase 2: The Trainer
- [ ] Exact endgame solver outputs match independent plain reference minimax across 500 random positions.
- [ ] Every evaluation is labeled either `exact` or `estimate`; exact endgames display 0/50/100% win chances only.
- [ ] Move loss classification categorizes moves into best, good, inaccuracy, mistake, blunder based on stone equity loss.
- [ ] Mistake log caps at 200 items in `mancala_mistakes_v1`.
- [ ] Leitner spaced-repetition drills (1, 3, 7 days) function completely offline.
- [ ] Deterministic tactical explanations generate verified reason codes without LLM or "AI" terminology.
- [ ] Local Elo rating ladder tracks progress against bot personas; calibration tournament committed to `docs/plan/bot-calibration.md`.
- [ ] Game Review modal displays per-move grades, top 3 swings, and worker progress bar.

#### Phase 3: Habit Loop & Sharing
- [ ] Daily puzzle is deterministic by UTC date; 365+ bundled puzzles re-verified by exact solver in CI (`puzzle.verify.test.ts`).
- [ ] Forgiving streak logic passes unit tests across midnight/DST/timezone transitions with 1 weekly auto-freeze.
- [ ] Replay URL codec fuzzer passes 1,000 randomized games with 100% lossless round-trip recovery.
- [ ] On-device `<canvas>` result card generates clean PNG with zero user tracking or PII.
- [ ] PWA service worker precaches all assets, operates offline, and satisfies Lighthouse PWA criteria.
- [ ] Cosmetic unlocks tied to badges and streaks without gating core rules or analytics.

#### Phase 4: Reach
- [ ] Kalah, Oware (Abapa), and Sow & Score fully implemented with comprehensive test suites.
- [ ] Oware handles CCW sowing, origin skip on >= 12 stones, 2-3 capture chains, and starvation feeding.
- [ ] Sow & Score clearly described as an introductory teaching game.
- [ ] Congkak/Dakon and Bao carry visible `beta` badges, regional variance notices, and search-only evaluations.
- [ ] Ephemeral friend play relay forwards JSON without logs or persistence; rooms expire after 30 min idle.
- [ ] Multiplayer protocol enforces rules locally, rejects invalid moves, and falls back to asynchronous replay links.
- [ ] In-game communication restricted strictly to fixed preset emoji (zero free-text chat).
- [ ] Cultural stories in `src/stories/*.ts` cite verifiable academic sources; unverified claims omitted.

---

## 2. Logic Chain

1. **Foundational Separation (Phase 0):** The existing codebase has Kalah rules, minimax search, and React UI coupled inside `src/engine.ts` and `src/App.tsx`. Implementing multiple variants, exact solvers, and background Web Workers without breaking existing tests requires establishing a headless `RuleSet` abstraction first (`src/rules/types.ts`). By wrapping Kalah into `src/rules/kalah.ts` and cross-testing 2,000 games against legacy `engine.ts`, functional equivalence is guaranteed before splitting the 2.6k-line `App.tsx`.
2. **Worker Isolation for Responsiveness:** Mancala engine evaluations and exact endgame solving can consume hundreds of thousands of nodes. Running this work on the browser main thread would violate the 100 ms interactive latency budget and degrade mobile frame rates. A dedicated Web Worker (`search.worker.ts`) with a cancellable client ensures UI responsiveness during deep searches.
3. **Layered Calm UX (Phase 1):** The user requirement demands an experience suitable for a 6-year-old up to a master. Hardcoding features into the main view creates visual clutter. Utilizing the already designed 7 lenses (`advantageBar`, `errorRate`, `bestMoveMarks`, `winPercent`, `mainLine`, `coach`, `explanations`) and 4 presets (`justPlay`, `hints`, `coach`, `full`) cleanly decouples analytical depth from casual play. In `justPlay`, the interface strips down to the board, turn indicator, and 5-item tray.
4. **Accessible Internationalization:** Accessibility and i18n are foundational requirements that cannot be retrofitted. Hand-rolled typed catalogs (`en.ts`, `ar.ts`, `es.ts`) ensure zero runtime weight while guaranteeing type safety at compile time. In RTL mode (Arabic), mirroring the board layout would violate the physical nature of Mancala (sowing direction and pit identity are physical constants); hence, chrome and text mirror while board geometry remains unmirrored.
5. **Truthful Evaluation and Training (Phase 2):** Statistical percentages can mislead players in finite deterministic games. Distinguishing between `exact` (solved endgames) and `estimate` (heuristic minimax) prevents overclaiming engine authority. Coupling move loss classification with Leitner spaced repetition allows players to train specifically on their own recorded mistakes offline.
6. **Viral Mechanics without Privacy Compromise (Phase 3):** Growth mechanics typically rely on cloud servers and user tracking. The blueprint proves that viral loops (daily date-seeded puzzles, replay URL hash codecs, and on-device canvas share cards) can function with zero backend infrastructure and zero PII.
7. **Variant Expansion and Safe Networking (Phase 4):** Expanding to Oware and Sow & Score validates the flexibility of the `RuleSet` architecture. Friend play uses a minimal zero-storage serverless WebSocket relay with an asynchronous link-passing fallback, enforcing a strictly fixed emoji set to eliminate moderation and child safety risks.

---

## 3. Caveats

1. **Oware Grand Slam and Cycle Rules:** While Oware (Abapa) is well documented, exact tournament handling of "Grand Slam" (capturing all opponent stones) and endless cycle resolution varies across sources (World Oware Society vs regional variations). The implementation must pick one cited rule set, document it in `appendix-rules-and-sources.md`, and log open variants in `docs/plan/OPEN-QUESTIONS.md`.
2. **Bao la Kiswahili Complexity:** Bao has intricate rules (four rows, nyumba, two distinct phases, kutakatia and kichwa rules). If academic sources and test fixtures are incomplete, Bao must remain disabled behind `features.bao = false` rather than shipping a buggy implementation.
3. **Congkak / Dakon Regional Variations:** Hole counts and store loops vary across Malaysia, Indonesia, and the Philippines. The implementation must label Congkak as `beta`, specify the exact board geometry chosen, and state clearly that rules vary by region.
4. **Relay Server Deployment:** The friend play relay (`relay/`) is designed for Cloudflare Workers / Durable Objects. In local development or static hosting where `VITE_RELAY_URL` is unset, the relay will be absent. The UI must cleanly handle this by hiding live rooms and defaulting to asynchronous replay link passing.

---

## 4. Conclusion

The blueprint in `docs/plan/` is exhaustive, rigorous, and architecturally coherent. It outlines a phased, test-driven path to refactor the monolithic starter into a production-grade, accessible, offline-first Mancala trainer. All 10 locked rules, 14 architectural decisions, 40+ preserved testids, 52 discovered features, and 18 edge cases are systematically accounted for. The implementation should proceed strictly in order from Phase 0 to Phase 4.

---

## 5. Verification Method

To independently verify the specification and test coverage across the repository:

1. **Type Checking:**
   ```bash
   npx tsc --noEmit
   ```
   *Expected outcome:* 0 TypeScript errors.

2. **Unit & Logic Tests:**
   ```bash
   npm test
   ```
   *Expected outcome:* All 27 existing tests in `search.test.ts`, `engine.test.ts`, `tactics.test.ts`, `bots.test.ts`, and `lenses.test.ts` pass cleanly.

3. **Production Build:**
   ```bash
   npm run build
   ```
   *Expected outcome:* Vite bundle builds successfully into `dist/`.

4. **Playwright E2E & Mobile Viewport Tests:**
   ```bash
   npm run test:e2e
   ```
   *Verification criteria:* Pass on 360x740, 393x852, 768x1024, 1280x800 viewports; `document.documentElement.scrollWidth <= innerWidth` across all tabs and modals; exactly 5 bottom tray buttons.

5. **Accessibility Verification:**
   ```bash
   npx playwright test e2e/a11y.spec.ts
   ```
   *Verification criteria:* Zero critical or serious Axe-core violations.

6. **Preserved TestIDs Grep Check:**
   Inspect that all 35+ preserved `data-testid` attributes listed in Section 1.4 remain present in the refactored JSX tree.

7. **Solver Cross-Check:**
   Execute endgame solver verification tests comparing alpha-beta results against brute-force reference minimax on 500 randomized small positions.

8. **Replay Codec Fuzz Check:**
   Execute `src/share/codec.test.ts` fuzzing 1,000 random games to ensure 100% lossless round-trip encoding and decoding.
