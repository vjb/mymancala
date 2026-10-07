# Original User Request

## 2026-10-07T01:10:17Z

Implement a modern "2030s GNU Backgammon for Mancala" web application based on the blueprint in docs/plan/. Deliver a calm, tactile, viral, accessible trainer and game for ages 6–100 with zero tracking, no accounts, and truth-first statistics.

Working directory: c:\Users\vjbel\hacks\mymancala
Integrity mode: development

Reference documents in repository:
- docs/plan/README.md (master index, locked decisions, 10 global rules, preserved data-testid list)
- docs/plan/phase-0-foundation.md (RuleSet interface, App.tsx split, search worker, autosave, Playwright)
- docs/plan/phase-1-lenses-and-access.md (lenses, highlight system, a11y, en/ar/es i18n, RTL, tutorial)
- docs/plan/phase-2-trainer.md (exact solver, estimate labels, mistakes, drills, rating)
- docs/plan/phase-3-habit-loop.md (daily puzzle, streaks/badges, replay links, result cards, PWA)
- docs/plan/phase-4-reach.md (variants, friend play relay, cultural stories)
- docs/plan/appendix-rules-and-sources.md (rule verification guidelines)
- docs/plan/appendix-ux-and-safety.md (UX tokens, accessibility checklist, kid-safety)

---

## Execution Phasing

1. Phase 0 (Foundation - Serial Lead Agent): Refactor App.tsx and core engine into a headless RuleSet architecture, move search to Web Worker, add autosave, and set up Playwright mobile guardrails.
2. Phase 1 (Calm UI, Accessibility, Languages, Onboarding): Split into parallel tracks for highlights + lenses, accessibility + audio, typed i18n (en/ar/es) + RTL, and interactive tutorial.
3. Phase 2 (Trainer): Implement exact endgame solver and move classifier, followed by mistake drills, deterministic explanations, and rating ladder.
4. Phase 3 (Habit Loop & PWA): Daily puzzles (date-seeded), forgiving streaks & badges, on-device canvas share cards & replay URL codec, and offline PWA service worker.
5. Phase 4 (Reach): Oware & Sow-and-Score variants, friend-by-link relay protocol, and cited cultural stories (unverified rules/claims remain flagged in docs/plan/OPEN-QUESTIONS.md).

---

## Requirements

### R1. Architecture & Performance Guardrails
- Abstract board and mechanics behind a generic RuleSet interface; isolate variant logic.
- Decompose src/App.tsx from ~2.6k lines to < 300 lines using pure reducers and composable components.
- Run engine evaluation in a cancellable Web Worker with main-thread fallback.
- Auto-save game state to localStorage (mancala_game_v1) via move replay logs.
- Never block UI interactions; initial interactive latency < 100 ms on mobile.

### R2. Calm, Truthful & Layered UX
- Strictly enforce the 7 lenses and 4 presets (justPlay, hints, coach, full). In justPlay, only board, turn indicator, and tray are visible.
- Establish clean highlight visual language: playable, preview, landing, lastMove, and best. Strictly one highlight kind per pit with precedence.
- Truth-first evaluation: label metrics as exact (solved endgames) or estimate (search heuristic). Frame evaluations in stone advantage ("+2 stones ahead") rather than misleading percentage swings.
- Computer pacing must feel human and patient: default ~1.2 s pause per move (1.6 s on slow).

### R3. Accessibility & Internationalization
- Comply with WCAG AA (AAA on high-contrast skin). Minimum font floor >= 12 px.
- Keyboard navigation (arrows/Enter/Esc), screen reader ARIA live region move announcements, and optional Web Speech API read-aloud.
- Full typed localization catalogs for English (en), Arabic (ar), and Spanish (es).
- RTL support (dir="rtl") with logical layout utilities while preserving physical board orientation (pits do not mirror).

### R4. Trainer & Offline Habit Loop
- Exact endgame solver matching independent brute-force minimax cross-checks.
- Automated move grading (best, good, inaccuracy, mistake, blunder) and mistake drill trainer with Leitner spaced repetition.
- Daily date-seeded puzzle verified by solver with 0 network calls.
- Encoded URL hash replay links and on-device <canvas> share card generation with no user data or tracker leakage.
- Offline PWA installability with Workbox asset caching.

### R5. Variants & Privacy
- Ship Kalah, Oware (Abapa), and Sow & Score fully. Congkak and Bao ship as beta search-only if verified.
- Ephemeral friend-play by link over zero-storage serverless WebSocket relay with asynchronous replay link fallback. No text chat or usernames.
- Cultural stories grounded in verifiable academic/historical sources.

---

## Acceptance Criteria

### Automated Build & Test Gates
- [ ] npx tsc --noEmit, npm test, and npm run build pass cleanly on every phase.
- [ ] Playwright e2e test suite passes across viewports (360x740, 393x852, 768x1024, 1280x800).
- [ ] Zero horizontal scrolling (document.documentElement.scrollWidth <= innerWidth) on all tabs and modals at 360 px width across English, Arabic, and Spanish.
- [ ] All preserved data-testid attributes listed in docs/plan/README.md remain functional.
- [ ] Bottom navigation tray strictly maintains exactly 5 fixed items with Rules housed exclusively in the tray.
- [ ] Axe accessibility audit reports zero critical/serious violations on core screens.
- [ ] Exact endgame solver outputs match independent reference minimax on 500 random positions.
- [ ] Replay URL codec fuzzer verifies lossless round-trip on 1,000 randomized game states.
- [ ] Progress log maintained in docs/plan/PROGRESS.md.


## Follow-up — 2026-10-07T07:39:06-04:00

Is the app up and ready
