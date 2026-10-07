# Mancala Trainer — Implementation Plan (Master Index)

> **Audience: an implementing agent with no prior context.** Read this file fully, then execute the phase documents in order. Each phase is self-contained, lists exact files, interfaces, steps, acceptance criteria and tests, and ends with the app **working and committed**.

## 0. Product in one paragraph

A modern, "GNU Backgammon for Mancala" trainer that is **a fun game first and a trainer second**, for ages 6 to 100. Everything analytical (advantage, grades, win chances, explanations) is opt-in through **lenses** and **presets**. Grading must be **trustworthy**: each evaluation is labelled *exact* or *estimate*. It ships as an **installable, offline-capable PWA**, mobile-first, free, with **no ads, no tracking, no accounts**.

## 1. Locked decisions (do not re-litigate)

| Topic | Decision |
|---|---|
| Identity | Game first, trainer second. Depth is opt-in. |
| Stats | Presets (Just Play / Hints / Coach / Full Analysis) **plus** a switch per stat ("lenses"). **Already built** in `src/lenses.ts`. |
| Audience | One board, layered experience: big friendly mode for kids/elders, full depth opt-in. |
| Truth | Exact solving for **endgames** (small stone counts), deep search for the middle game, every evaluation labelled `exact` or `estimate`. Never overclaim. Full-game solving is **out of scope** (Oware's solution needs ~10^11-position databases; not viable on a phone). |
| Progress | Local-first. No accounts. Export/import as a file or link. |
| Variants | Kalah, Oware, and an intro variant ship **fully**. Congkak/Dakon and Bao ship as **beta** (playable, search-only grading, clearly labelled). |
| Look | Warm, tactile, timeless materials (Walnut, Clay, Slate + unlockables). Themes are data. |
| Platform | Installable PWA (offline, home-screen). Store wrappers only later. |
| Accessibility | Languages (**English, Arabic with RTL, Spanish**), text size / contrast / reduced motion, one-handed + forgiving taps, screen reader + keyboard, voice read-aloud. |
| Business/safety | Free, no ads, no tracking, kid-safe by design. No free-text chat, ever. |
| Coaching text | Deterministic, generated from engine facts. **No LLM. No "AI" branding.** |
| Viral | Daily puzzle, friend-by-link, rating ladder (local), streaks + badges, drills from your own mistakes, cosmetic unlocks, cultural stories, **privacy-safe result cards** (image generated on device). |
| Online | Static PWA on a free static host. Replay/puzzle links encode data **in the URL**. Friend play uses one tiny optional serverless relay (no accounts, no stored personal data). That relay is the **only** server piece. |
| Stack | Keep **Vite + React 18 + TypeScript + Tailwind**. Add: Web Workers, hand-rolled typed i18n (no heavy library), `vite-plugin-pwa`, Vitest (logic), Playwright (phone-size end-to-end). No Next.js, no global state library unless a phase doc says otherwise. |

## 2. Current state of the repo (starting point)

Commit `fe97667` on `main` (local; GitHub push may lag). Files in `src/`:

| File | State |
|---|---|
| `engine.ts` | Kalah-only rules (`simulateMove`, 14-pit board, stores at 6 and 13, opposite = `12 - i`), minimax with a **sound** bound-flagged, rules-keyed, size-capped transposition table, `analyzeAllMoves`, `classifyEquityLoss`. Heuristic evaluation (`evaluatePosition`). |
| `search.test.ts`, `engine.test.ts`, `tactics.test.ts`, `bots.test.ts`, `lenses.test.ts` | 27 tests passing. `search.test.ts` compares the search to a plain reference minimax. |
| `tactics.ts` | `generateTacticalExplanation` (deterministic text). |
| `bots.ts` | Personas with depth and banter. |
| `lenses.ts` | **Done.** Lens ids, presets, persistence (`mancala_lenses_v1`), migration from old keys. |
| `App.tsx` | **~2.6k-line monolith.** All state, animation, board, gauge, analysis, settings, mobile tray. Lenses are wired in. |
| `RulesModal.tsx`, `GameReviewModal.tsx`, `theme.ts`, `Pebble.tsx`, `sound.ts`, `haptics.ts`, `preflight-diagnostics.ts` | As named. |

Known issues the plan must fix are cataloged per phase. The red-team report is in the repo history of this conversation; its findings are folded into the phase docs.

## 3. Phase map

| Phase | Document | Outcome |
|---|---|---|
| 0 | [`phase-0-foundation.md`](./phase-0-foundation.md) | Split `App.tsx`; `RuleSet` interface; engine in a Web Worker; game autosave; CI-style checks. **Little visible change.** |
| 1 | [`phase-1-lenses-and-access.md`](./phase-1-lenses-and-access.md) | Finish lenses (the rest of the UI), true Just Play, highlight language, accessibility floor, i18n scaffolding (en/ar/es + RTL), guided tutorial. |
| 2 | [`phase-2-trainer.md`](./phase-2-trainer.md) | Exact endgame solver, `exact`/`estimate` labelling, mistake log, drills, local rating ladder, richer explanations. |
| 3 | [`phase-3-habit-loop.md`](./phase-3-habit-loop.md) | Daily puzzle, streaks and badges, result cards, PWA install/offline. |
| 4 | [`phase-4-reach.md`](./phase-4-reach.md) | Oware + intro variant (full), Congkak + Bao (beta), friend-by-link relay, cultural stories, cosmetic unlocks. |
| Appendix | [`appendix-rules-and-sources.md`](./appendix-rules-and-sources.md) | Rule definitions to verify, sources, naming cautions. |
| Appendix | [`appendix-ux-and-safety.md`](./appendix-ux-and-safety.md) | UX principles, kid-safety, content tone, accessibility checklist, design tokens. |

Phases are **strictly ordered**. Do not start phase N+1 until phase N's "Definition of done" is met.

## 4. Global rules for the implementing agent

1. **Keep the app working at every commit.** Run `npm test`, `npx tsc --noEmit`, and `npm run build` before each commit. Commit per task or per small group of tasks, with a conventional message (`feat:`, `fix:`, `refactor:`, `test:`, `docs:`).
2. **Tests first for logic.** Anything in the engine, solver, rating, puzzles, serialization, or i18n gets unit tests **before** or alongside the code. For search/solver work, cross-check against a slow reference implementation (see `src/search.test.ts` for the pattern).
3. **Preserve these `data-testid`s** (existing tests and diagnostics rely on them): `pit-N`, `pit-count-N`, `store-6`, `total-stones`, `turn-indicator`, `eval-gauge`, `eval-row-0`, `eval-row-worst`, `eval-play-pit-N`, `tutor-toggle`, `tutor-reconsider`, `tutor-play-best`, `tutor-confirm`, `tutor-modal`, `reset-game-btn`, `bottom-rules-btn`, `bottom-board-btn`, `bottom-analysis-btn`, `bottom-settings-btn`, `ribbon-hints-btn`, `analysis-review-btn`, `mode-pve|ai_vs_ai|pvp|sandbox`, `ai-duel-toggle`, `open-diagnostics-btn`, `preset-<id>`, `lens-<id>`, `sandbox-plus-N`, `sandbox-minus-N`. Add new ones in the form `<area>-<thing>`.
4. **Do not break these behaviours:** zero horizontal scrolling on any screen at 360 px width; the mobile bottom tray stays exactly five fixed items (Board, Analysis, Coach, Rules, Settings); Rules is reachable **only** from the tray (not the top bar); the computer pauses ~1.2 s before moving at default speed.
5. **Never fabricate sources, history, or rules.** For cultural content and variant rules follow `appendix-rules-and-sources.md` and mark anything unverified clearly in code comments and in a `docs/plan/OPEN-QUESTIONS.md` file (create it if missing).
6. **No tracking, no analytics, no third-party network calls at runtime** (fonts, scripts, CDNs). Everything ships in the bundle. The relay in phase 4 is the only allowed network endpoint and is opt-in.
7. **Plain words by default.** User-facing strings must avoid jargon ("equity", "plies", "PR") unless inside the Full Analysis preset, and even then link to a glossary entry. All user-facing strings go through i18n from phase 1 onward.
8. **Accessibility is a requirement, not polish.** See `appendix-ux-and-safety.md` for the checklist; each phase doc lists which items it must satisfy.
9. **Document as you go.** Update `README.md` at the end of each phase (features, commands, layout). Keep this plan's checkboxes ticked in the phase docs.
10. If a task is ambiguous or blocked, write the question in `docs/plan/OPEN-QUESTIONS.md`, choose the safest reversible option, and continue.

## 5. Definition of done (whole project)

- All five phase "Definition of done" lists are satisfied.
- `npm test`, `npx tsc --noEmit`, `npm run build`, and the Playwright suite all pass.
- Lighthouse (mobile): Performance >= 90, Accessibility >= 95, PWA installable, Best Practices >= 95.
- Manual pass at 360x740, 393x852, and 768x1024 in Walnut, Clay, Slate: no horizontal scroll, no clipped controls, all text >= 12 px for anything needed to play.
- README reflects reality.
