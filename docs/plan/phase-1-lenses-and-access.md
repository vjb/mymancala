# Phase 1: Calm UI, accessibility, languages, onboarding

Prereq: Phase 0 done. See [README.md](README.md) and [appendix-ux-and-safety.md](appendix-ux-and-safety.md).
**Goal:** one board that is calm for a 6-year-old, readable for a 100-year-old, fully usable in en/ar/es, and stats never in your face.

## 1.1 Finish lens gating
- Gate `ribbon-hints-btn` behind lens `bestMoveMarks`.
- Speed row (Slow/Normal/Fast/Instant): move into Settings (not on the main screen). Default Slow for new installs. "Instant" only affects animation, never the bot thinking pause floor of 0.6 s.
- Analysis tab with all lenses off: show a friendly empty state ("Stats are hidden. Turn on a stat view in Settings") with a one-tap button that applies the `coach` preset.
- Test: in `justPlay` preset the only visible UI is board, turn indicator, tray (e2e).

## 1.2 Highlight visual language (fixes the confusing highlights)
Problem: preview outline, landing glow, "Landing: Pit N", and last-move `LAST`/`+N` badges are all shown at once; touch previews stick.
Rules (implement as a single `src/components/board/highlights.ts` that returns one `HighlightKind` per pit):
| Kind | Look | When |
|---|---|---|
| `playable` | soft gold ring | only the pits you can legally tap, only on your turn |
| `preview` | thick outline + stone path dots | while pressing/hovering ONE pit |
| `landing` | green pulse on final pit only | only during preview |
| `lastMove` | faint dashed ring + small "from" mark | fades after 2.5 s or on next tap; never together with `preview` |
| `best` | star badge | only if lens `bestMoveMarks` on |
- Precedence: `preview` > `best` > `lastMove` > `playable`. Only one kind per pit.
- Touch: preview on long-press (350 ms) only; a normal tap plays. Preview clears on release/cancel/scroll/blur.
- Beginner option "Tap twice to move" (Settings, default on for the kids preset): first tap previews, second tap confirms.
- Add a "?" legend popover (reachable from Rules) showing each kind.
- Tests: unit test on `highlights.ts` precedence; e2e that preview clears after touchend.

## 1.3 Plain language and glossary
- Replace jargon in all strings (equity, PV, PR, plies, free turn, etc.) with plain words ("Best line", "Mistakes per 100 moves", "Go again"). Terms kept for experts live behind lens `explanations` with a tap-to-define glossary (`src/i18n/glossary.ts`).
- Win percentage stays truthful: show "estimate" tag unless exact (see phase 2). Prefer "+2 stones ahead" framing in the default coach.

## 1.4 Accessibility settings
Settings > Comfort (persist in `mancala_a11y_v1`):
- **Text size**: S/M/L/XL via CSS variable `--font-scale` (root `font-size`). Hard floor: no text < 12 px at scale M.
- **High contrast** theme (7:1 text), **colour-blind-safe**: pebbles differ by shape/pattern, not only colour; players distinguished by side and an icon.
- **Reduce motion**: honour `prefers-reduced-motion` and a manual toggle; replaces sowing animation with a fast fade and step count.
- **Big mode**: tap targets >= 56 px, one-handed layout (controls in bottom 60% of screen), forgiving taps (expanded hit area, ignore accidental double tap within 250 ms).
- **Sound/haptics** toggles remain; add volume.
- **Screen reader and keyboard**: pits are `button`s with `aria-label` like "Your pit 3, 5 stones, legal move"; live region (`aria-live="polite"`) announces moves ("Computer played pit 4, captured 3"). Arrow keys move focus, Enter plays, `?` opens rules, Esc closes modals; visible focus ring; focus trap + return in modals.
- **Read-aloud**: `src/lib/speech.ts` wraps `speechSynthesis` (feature-detect, language-matched voice, off by default, a speaker button on Rules/Tutorial/coach messages).
- Tests: axe-core check via `@axe-core/playwright` on main screens (no serious violations); keyboard-only e2e that plays a move.

## 1.5 i18n (en, ar, es) and RTL
- Hand-rolled typed catalogs: `src/i18n/en.ts` is the source of truth (`export const en = {...} as const`), `ar.ts` and `es.ts` typed as `typeof en` so missing keys fail `tsc`.
- `t(key, params)` and `useT()`; plural handling via `Intl.PluralRules`; numbers via `Intl.NumberFormat`.
- Language picker in Settings, default from `navigator.language`, key `mancala_lang_v1`.
- RTL: set `<html dir>` and `lang`. Use Tailwind logical utilities (`ms-`, `me-`, `ps-`, `pe-`, `text-start`). **The board is NOT mirrored** (pit numbering and physical orientation stay constant; mirror only chrome/text). Document this decision in the code.
- Every user-visible string moves into catalogs (grep guard test: no raw English JSX text outside catalogs, allowlist for dev-only diagnostics).
- Arabic and Spanish translations: write them carefully, flag `// REVIEW-NATIVE` for a native speaker pass; do not block on that.
- Test: Playwright in `ar` locale at 360 px has no horizontal scroll and `dir="rtl"`.

## 1.6 Guided interactive tutorial
- `src/tutorial/steps.ts`: 8–10 steps on a scripted mini-board: pick a pit, watch sowing, land in your store (go again), capture, game end, how to win. Each step: instruction text, highlighted pits, allowed move(s), success check, optional read-aloud.
- Pre-reader friendly: big pictures/animation first, text second.
- Shown on first launch (skippable), re-openable from Rules.
- Tests: tutorial state machine unit tests; e2e completes tutorial.

## 1.7 Presets for audiences
Add a first-run "Who's playing?" picker (changes only defaults, easily changeable): **Kid** (big mode, Just Play, tap-twice, read-aloud on, easy bot), **Everyone** (Coach preset), **Learner/Expert** (Full preset). No age is asked or stored.

## Definition of done (phase 1)
All three languages complete, axe clean, no horizontal scroll at 360 px in en/ar/es, text size XL still usable, tutorial completes, highlight precedence tested, commit `feat: phase 1 calm UI, a11y, i18n`.
