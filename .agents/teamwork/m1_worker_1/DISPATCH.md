# DISPATCH: m1_worker_1 (M1 Implementation Worker)

## Task Assignment
- **Agent**: `m1_worker_1`
- **Role**: `teamwork_preview_worker`
- **Working Directory**: `c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m1_worker_1`
- **Parent Conversation ID**: `85856d3d-5ca8-4fac-8578-3161a39fe3a5`
- **Milestone**: M1 (Phase 1: Calm UI, Accessibility, Languages, Onboarding)

## Mandatory Inputs to Read:
1. `c:\Users\vjbel\hacks\mymancala\.agents\teamwork\ORIGINAL_REQUEST.md` (authoritative user request)
2. `c:\Users\vjbel\hacks\mymancala\PROJECT.md`
3. Explorer Handoff Reports:
   - `c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m1_explorer_1\handoff.md` (Highlights, 7 Lenses, Presets, Plain Language & Glossary)
   - `c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m1_explorer_2\handoff.md` (Font scale, High contrast skin, Pebble patterns, Reduced motion, Big mode, ARIA/Live announcer, Keyboard nav, Speech API, Erase Data, Axe-core audit)
   - `c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m1_explorer_3\handoff.md` (Typed i18n catalogs en/ar/es, RTL unmirrored board, 8-step mini-board tutorial, Audience picker)

## MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Detailed Implementation Plan:

### Track 1: Highlights & 7 Lenses Architecture (Explorer 1)
1. Create `src/components/board/highlights.ts`:
   - Pure highlight precedence: `preview` > `best` > `lastMove` > `threat` > `playable` > `none`.
   - Single active role per pit.
2. Refactor `src/components/board/PitButton.tsx`:
   - Consume `highlights.ts`. Exactly one highlight kind/badge at a time.
   - Implement 350ms touch preview: long-press shows trajectory, cancels on touch release, touch cancel, or scroll (`delta > 10px`).
   - Add support for "Tap twice to move" mode.
3. Update `src/lenses.ts`:
   - Support canonical 7 lenses: `evalBar`, `bestMoveHighlight`, `threatPits`, `landingPreview`, `principalVariation`, `explanations`, `errorRate`.
   - Maintain backward-compatible aliases: `advantageBar` <=> `evalBar`, `bestMoveMarks` <=> `bestMoveHighlight`, `mainLine` <=> `principalVariation`, `coach` <=> `explanations`.
   - Presets: `justPlay` (all 7 OFF), `coach` (Gentle Coach), `hints` (Tactician), `full` (Deep Analysis).
4. Relocate speed row from `src/components/shell/TurnBanner.tsx` into `src/components/panels/SettingsPanel.tsx`. Gate `ribbon-hints-btn` behind `bestMoveMarks` / `bestMoveHighlight`.
5. Update `src/components/panels/AnalysisPanel.tsx`:
   - When all lenses are off (in `justPlay`), display a calm empty state card with a 1-tap "Turn on Gentle Coach" button (`data-testid="enable-coach-btn"`).
6. Create `src/i18n/glossary.ts` and interactive glossary popover behind the `explanations` lens.
7. Create `src/components/modals/HighlightLegendModal.tsx` accessible from Settings and Rules.

### Track 2: Accessibility, Ergonomics & Audio/Speech (Explorer 2)
1. In `src/index.css`: Add `--font-scale` CSS variable on `:root` and font scaling classes (`font-scale-s`, `font-scale-m`, `font-scale-l`, `font-scale-xl`). Hard floor >= 12px at scale M.
2. In `src/theme.ts`: Add `high-contrast` skin token achieving 7:1 text contrast ratio (WCAG AAA) with high-contrast text and borders.
3. In `src/Pebble.tsx`: In high-contrast skin, render pebbles with distinct patterns (stripes for P1, polka dots for P2, solid rings for neutral) so pebbles are identifiable without relying on color.
4. Create `src/lib/a11y.ts`: 2D arrow key navigation on pits, focus trapping for modals, and 250ms tap debounce.
5. Create `src/lib/speech.ts`: Web Speech API helper (`window.speechSynthesis`) for rules, tutorial, and coach tips with voice matching, rate adjuster, mute toggle, and graceful fallback.
6. Create `src/lib/dataReset.ts`: Zero-PII "Erase My Data" helper wiping all `mancala_*` localStorage keys and reloading.
7. Create `src/components/shell/LiveAnnouncer.tsx`: Accessible `aria-live="polite"` live region narrating moves, captures, extra turns, and game end.
8. In `src/components/panels/SettingsPanel.tsx`: Add font scaling selector (S/M/L/XL), skin selector including `high-contrast`, reduced motion toggle, Big Mode toggle (>= 56px tap targets), speech narration toggles, and "Erase My Data" button.
9. In `src/components/board/Board.tsx` & `PitButton.tsx`: Support Big Mode (>= 56px min dimensions), arrow keys, and accessible `aria-label`s.

### Track 3: i18n, RTL & Tutorial (Explorer 3)
1. Create typed translation catalogs:
   - `src/i18n/types.ts`: `TranslationKey`, `Locale` (`'en' | 'ar' | 'es'`), `Translations`.
   - `src/i18n/translations/en.ts`: English master catalog.
   - `src/i18n/translations/ar.ts`: Arabic catalog conforming strictly to `Record<keyof typeof en, string>`.
   - `src/i18n/translations/es.ts`: Spanish catalog conforming strictly to `Record<keyof typeof en, string>`.
   - `src/i18n/index.ts`: Native `Intl.PluralRules` pluralization (handling all 6 Arabic plural forms) and interpolation.
   - `src/i18n/useTranslation.ts`: React hook with persistence in `mancala_locale_v1`.
2. RTL & Physical Board Layout:
   - When Arabic is selected: Set `<html dir="rtl" lang="ar">`. Chrome and modals mirror direction naturally.
   - In `src/components/board/Board.tsx`: Explicitly wrap the board container in `<div dir="ltr">` so physical board geometry NEVER mirrors! South pits (0..5) remain bottom left-to-right, Store 6 on right, Store 13 on left.
3. Create `src/components/modals/TutorialModal.tsx`:
   - 8-step interactive tutorial on a 2x3 mini-board (8 pits total: 6 pits + 2 stores) to prevent mobile modal overflow at 360px.
   - Scripted steps: 1. Objective, 2. Sowing, 3. Scoring permanence, 4. Opponent store skipping, 5. Free turn bonus, 6. Capture rule, 7. Sweep rule, 8. Victory.
   - Next/Back controls, step indicator, and "Skip" button.
4. Create `src/components/modals/AudiencePickerModal.tsx`:
   - First-run dialog ("Kid", "Casual", "Learner", "Analyst") configuring lenses, Big Mode, and audio. Persisted in `mancala_onboarding_v1`.
5. Integrate with `src/App.tsx`:
   - Keep `src/App.tsx` strictly `< 300 lines`! Import extracted modals cleanly.

### Track 4: Verification & Tests
1. Install `@axe-core/playwright` or equivalent for accessibility testing if needed, or implement Playwright WCAG/axe assertions.
2. Create unit tests:
   - `src/components/board/highlights.test.ts`
   - `src/i18n/i18n.test.ts` (catalog parity, pluralization, locale switching)
   - `src/lib/a11y.test.ts`
3. Create Playwright E2E tests:
   - `e2e/a11y.spec.ts`: WCAG/Axe audit across viewports and high-contrast skin, zero critical/serious violations.
   - `e2e/rtl.spec.ts`: Arabic RTL mode at 360px, assert zero horizontal scroll (`scrollWidth <= innerWidth`) and verify store-6 is to the right of store-13.
   - `e2e/tutorial.spec.ts`: Interactive tutorial walkthrough at 360px with zero horizontal scroll.
4. Run verification:
   - `npx tsc --noEmit` (clean exit code 0)
   - `npm test` (all unit and fuzz tests pass)
   - `npm run build` (clean production build)
   - `npm run test:e2e` (all Playwright tests pass across 4 viewports)
   - Check line count of `src/App.tsx` (< 300 lines)
5. Update `docs/plan/PROGRESS.md` with detailed Phase 1 completion notes.

Write your complete handoff report to:
`c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m1_worker_1\handoff.md`

Send a message to your parent (`85856d3d-5ca8-4fac-8578-3161a39fe3a5`) when finished.


## 2026-10-07T02:59:28Z
You are m1_worker_1.
Your working directory is c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m1_worker_1.
Your caller/parent is the Project Orchestrator (ID: 85856d3d-5ca8-4fac-8578-3161a39fe3a5).

MANDATORY FIRST STEP: Read the original user request at:
c:\Users\vjbel\hacks\mymancala\.agents\teamwork\ORIGINAL_REQUEST.md
Also read PROJECT.md at:
c:\Users\vjbel\hacks\mymancala\PROJECT.md
And your task assignment at:
c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m1_worker_1\DISPATCH.md

Read the three Explorer handoff reports:
- c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m1_explorer_1\handoff.md
- c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m1_explorer_2\handoff.md
- c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m1_explorer_3\handoff.md
