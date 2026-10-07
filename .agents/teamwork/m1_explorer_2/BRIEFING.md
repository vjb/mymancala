# BRIEFING — 2026-10-07T02:52:00Z

## Mission
Investigate and architect concrete specifications for accessibility, ergonomics, audio/speech narration, font scaling, high-contrast skins, keyboard navigation, data wipe, and axe-core test plans for Mancala Milestone 1.

## 🔒 My Identity
- Archetype: explorer
- Roles: accessibility, ergonomics & audio/speech architect
- Working directory: c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m1_explorer_2
- Original parent: 85856d3d-5ca8-4fac-8578-3161a39fe3a5
- Milestone: M1 (Phase 1: Calm UI, Accessibility, Languages, Onboarding)

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- Strictly follow WCAG AA (and AAA on high-contrast skin)
- Maintain minimum font floor >= 12px at scale M
- Bottom navigation tray strictly maintains exactly 5 fixed items with Rules housed exclusively in the tray
- Preserved data-testid attributes must remain functional
- Zero-PII compliance

## Current Parent
- Conversation ID: 85856d3d-5ca8-4fac-8578-3161a39fe3a5
- Updated: not yet

## Investigation State
- **Explored paths**: ORIGINAL_REQUEST.md, PROJECT.md, docs/plan/phase-1-lenses-and-access.md, docs/plan/appendix-ux-and-safety.md, src/theme.ts, src/components/board/PitButton.tsx, src/components/panels/SettingsPanel.tsx, src/components/shell/TurnBanner.tsx, src/Pebble.tsx, src/RulesModal.tsx, src/lib/storage.ts, src/game/useGame.ts, e2e/no-hscroll.spec.ts, package.json
- **Key findings**:
  1. Font scaling: Multiple sub-12px styles exist (`text-[7px]`, `text-[8px]`, `text-[10px]`) in PitButton and TurnBanner violating hard floor >= 12px at scale M.
  2. High-contrast skin: Only walnut, porcelain, obsidian exist; neither achieves 7:1 AAA contrast across all muted/badge text. PebbleCluster relies solely on color gradients with no patterns or shapes.
  3. Reduced motion: No prefers-reduced-motion media query or manual toggle; sowing plays multi-second animation loop with dropRipple keyframes.
  4. Big mode: Pit buttons are ~38-44px on mobile; no 250ms tap debounce; no bottom 60% ergonomic layout.
  5. Screen reader: PitButton lacks `aria-label`; StorePit lacks roles/labels; no `aria-live` announcer for move narration.
  6. Keyboard nav: No arrow key navigation between pits, no roving tabindex, modals lack Escape key listeners and focus trapping.
  7. Web Speech API: Zero TTS implementation.
  8. Erase my data: Zero reset button or storage wiping utility in Settings.
  9. Axe-core: @axe-core/playwright is not installed; no a11y.spec.ts exists.
- **Unexplored areas**: None. Codebase fully mapped for M1 a11y scope.

## Key Decisions Made
- Architecture must introduce:
  - `src/theme/highContrast.ts` or extend `THEMES` in `src/theme.ts` with 7:1 AAA tokens.
  - Patterned pebble rendering in `src/Pebble.tsx` (stripes, dots, solids with distinct SVG badges).
  - CSS root variable `--font-scale` with `.text-floor` rule (`max(0.75rem, 12px)`).
  - `src/lib/a11y.ts` managing `mancala_a11y_v1` (fontScale, reducedMotion, bigMode, tapTwice, readAloud).
  - `src/lib/speech.ts` managing Web Speech API with fallback.
  - `src/lib/dataReset.ts` wiping all `mancala_*` keys and caches.
  - `src/components/shell/LiveAnnouncer.tsx` (`aria-live="polite"`).
  - `e2e/a11y.spec.ts` automated Axe-core test plan.

## Artifact Index
- handoff.md — Comprehensive 5-component architectural handoff report
- progress.md — Heartbeat and step progress
