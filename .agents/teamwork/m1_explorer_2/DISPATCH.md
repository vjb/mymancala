# DISPATCH: m1_explorer_2 (Accessibility, Ergonomics & Audio/Speech Architect)

## Task Assignment
- **Agent**: `m1_explorer_2`
- **Role**: `teamwork_preview_explorer`
- **Working Directory**: `c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m1_explorer_2`
- **Parent Conversation ID**: `85856d3d-5ca8-4fac-8578-3161a39fe3a5`
- **Milestone**: M1 (Phase 1: Calm UI, Accessibility, Languages, Onboarding)

## Inputs to Read:
1. `c:\Users\vjbel\hacks\mymancala\.agents\teamwork\ORIGINAL_REQUEST.md` (authoritative user request)
2. `c:\Users\vjbel\hacks\mymancala\PROJECT.md` (Features 14, 15, 16, 17, 18, 19, 20, 52)
3. `c:\Users\vjbel\hacks\mymancala\docs\plan\phase-1-lenses-and-access.md`
4. `c:\Users\vjbel\hacks\mymancala\docs\plan\appendix-ux-and-safety.md`
5. `c:\Users\vjbel\hacks\mymancala\src\theme.ts`
6. `c:\Users\vjbel\hacks\mymancala\src\components\board\PitButton.tsx`
7. `c:\Users\vjbel\hacks\mymancala\src\components\panels\SettingsPanel.tsx`
8. `c:\Users\vjbel\hacks\mymancala\src\components\shell\TurnBanner.tsx`

## Investigation Scope:
Analyze the concrete architecture and implementation plan for:
1. **Comfort & Typography Settings (Feature 14)**:
   - Dynamic font scaling: S (85%), M (100%), L (115%), XL (130%) via CSS `--font-scale` or theme class.
   - Hard floor: Minimum readable text size >= 12 px at scale M.
2. **High-Contrast & Colorblind Skins (Feature 15)**:
   - High contrast mode achieving 7:1 text contrast ratio (WCAG AAA).
   - Pebble visual distinction by shape/pattern (solids, stripes, dots) rather than color alone.
   - Non-color visual cues for turns, active player, and pit states.
3. **Reduced Motion Support (Feature 16)**:
   - Auto-detection via `prefers-reduced-motion` media query + manual toggle in Settings.
   - Suppress pebble sowing animations, replacing them with instant step updates or gentle fades.
4. **Big Mode & Forgiving Taps (Feature 17)**:
   - Minimum 56 px tap targets for interactive pits and tray items.
   - 250 ms tap debounce preventing double-click misfires.
   - Bottom 60% one-handed ergonomic layout option.
5. **Screen Reader & ARIA Live (Feature 18)**:
   - Accessible names and roles on all pits: e.g. `aria-label="Your pit 3, 4 stones. Double tap to play."`
   - Hidden or polite live region (`aria-live="polite" aria-atomic="true"`) narrating moves and game events.
6. **Full Keyboard Navigation (Feature 19)**:
   - Arrow keys (Left/Right) navigate pits with clear focus ring.
   - Enter / Space sows from focused pit.
   - `?` opens Rules, `Esc` closes modals / sheets.
7. **Web Speech API Read-Aloud (Feature 20)**:
   - Audio narration helper for rules, tutorial steps, and coach tips via `window.speechSynthesis`.
   - Voice selector, mute/unmute control, speech rate adjuster, and graceful fallback when unsupported.
8. **Zero-PII "Erase My Data" Button (Feature 52)**:
   - In Settings: Clean reset clearing all `localStorage` keys, resetting state, and reloading.
9. **Automated Axe-core Audit Integration**:
   - Integration of `@axe-core/playwright` or `vitest-axe` to guarantee zero critical/serious violations.

## Output Requirements:
Write your detailed architectural specification, file modification list, CSS custom property designs, and testing plan to:
`c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m1_explorer_2\handoff.md`

Send a message to your parent (`85856d3d-5ca8-4fac-8578-3161a39fe3a5`) with the handoff report path when finished.


## 2026-10-07T02:51:23Z
You are m1_explorer_2.
Your working directory is c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m1_explorer_2.
Your caller/parent is the Project Orchestrator (ID: 85856d3d-5ca8-4fac-8578-3161a39fe3a5).

MANDATORY FIRST STEP: Read the original user request at:
c:\Users\vjbel\hacks\mymancala\.agents\teamwork\ORIGINAL_REQUEST.md
Also read PROJECT.md at:
c:\Users\vjbel\hacks\mymancala\PROJECT.md
And your task assignment at:
c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m1_explorer_2\DISPATCH.md

Inspect:
- docs/plan/phase-1-lenses-and-access.md
- docs/plan/appendix-ux-and-safety.md
- src/theme.ts
- src/components/board/PitButton.tsx
- src/components/panels/SettingsPanel.tsx
- src/components/shell/TurnBanner.tsx

Analyze and provide concrete specifications for:
1. Dynamic font scaling (S/M/L/XL via CSS --font-scale) with hard floor >= 12px at scale M.
2. High-contrast skin achieving 7:1 text contrast ratio (WCAG AAA) and pebble patterns (stripes, dots, solids) for non-color identification.
3. Reduced motion support with prefers-reduced-motion auto-detect and manual toggle.
4. Big mode with >= 56px tap targets, bottom 60% ergonomic layout, and 250ms tap debounce.
5. Screen reader ARIA pit labelling and aria-live polite move narration.
6. Full keyboard navigation (Arrow keys, Enter/Space, ?, Esc).
7. Web Speech API read-aloud helper with voice/mute controls and fallback.
8. Zero-PII "Erase My Data" reset in Settings.
9. Axe-core accessibility automated test plan.

Write your report to c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m1_explorer_2\handoff.md.
Send a message to your parent (ID: 85856d3d-5ca8-4fac-8578-3161a39fe3a5) when done.
