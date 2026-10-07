# BRIEFING — 2026-10-07T02:56:30Z

## Mission
Investigate and architect the Highlight Visual Language, 7 Lenses & 4 Presets, and Plain Language & Glossary for Milestone 1.

## 🔒 My Identity
- Archetype: explorer
- Roles: teamwork_preview_explorer, highlights_and_lenses_architect
- Working directory: c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m1_explorer_1
- Original parent: 85856d3d-5ca8-4fac-8578-3161a39fe3a5
- Milestone: M1 (Phase 1: Calm UI, Accessibility, Languages, Onboarding)

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- Strict single active highlight per pit: preview > best > lastMove > playable
- 7 Lenses architecture & 4 user presets (Just Play pure board behavior, Gentle Coach, Tactician, Deep Analysis)
- Plain language & glossary (no engine jargon, calm terms, interactive glossary popover)

## Current Parent
- Conversation ID: 85856d3d-5ca8-4fac-8578-3161a39fe3a5
- Updated: not yet

## Investigation State
- **Explored paths**:
  - `docs/plan/phase-1-lenses-and-access.md`
  - `docs/plan/appendix-ux-and-safety.md`
  - `PROJECT.md`
  - `src/lenses.ts`, `src/lenses.test.ts`
  - `src/components/board/Board.tsx`
  - `src/components/board/PitButton.tsx`
  - `src/components/panels/AnalysisPanel.tsx`
  - `src/components/panels/CoachPanel.tsx`
  - `src/components/panels/SettingsPanel.tsx`
  - `src/components/shell/TurnBanner.tsx`
  - `src/components/shell/EvalGauge.tsx`
  - `src/components/shell/BottomTray.tsx`
  - `src/game/gameTypes.ts`, `src/game/gameReducer.ts`
  - `src/tactics.ts`, `src/RulesModal.tsx`
  - `e2e/preserved-testids.spec.ts`, `src/preserved-testids.test.ts`
- **Key findings**:
  1. PitButton currently stacks multiple badges (`YOUR PICK`, `COACH'S PICK`, `THREAT`, `VULN`, `LAST`, `PICK`, `DROP`, `CAPT`, `#1 BEST`) and evaluates multiple conflicting ring styles in a giant nested ternary.
  2. Touch events stick because hover triggers aren't cancelled on touch release or scroll.
  3. Lenses in `lenses.ts` had temporary keys (`winPercent`, `coach`), whereas DISPATCH specifies the 7 clean lenses: `evalBar`, `bestMoveHighlight`, `threatPits`, `landingPreview`, `principalVariation`, `explanations`, `errorRate`. Aliasing ensures all existing data-testid tests pass while cleanly implementing the new lenses.
  4. Presets map directly: `justPlay` (all OFF), `coach` ("Gentle Coach" - evalBar, landingPreview, explanations), `hints` ("Tactician" - bestMoveHighlight, threatPits, principalVariation), `full` ("Deep Analysis" - all 7 ON).
  5. AnalysisPanel currently always renders calculating tables in Just Play mode; needs a calm empty state with a 1-tap "Enable Coach Mode" button.
  6. Current UI contains heavy engine jargon ("plies", "equity loss", "PR", "minimax rollout", "conceded major win equity") that must be replaced by calm terms ("looking ahead N moves", "stone advantage", "mistakes per 100 moves", "tactical threat", "position balance").
  7. Glossary specification needed in `src/i18n/glossary.ts` with tap-to-define popover.
- **Unexplored areas**: None within M1 scope.

## Key Decisions Made
- Architected `src/components/board/highlights.ts` with pure `getPitHighlight()` returning single `HighlightKind`.
- Architected touch preview with 350ms long-press, instant clear on touchend/touchcancel/touchmove, and "Tap twice to move" setting.
- Preserved existing data-testid attributes via lens/preset backward-compatible aliasing.
- Specified plain language catalog and interactive glossary popover behind `explanations` lens.

## Artifact Index
- `c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m1_explorer_1\DISPATCH.md` — Task assignment and message log
- `c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m1_explorer_1\BRIEFING.md` — Situational awareness and working memory
- `c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m1_explorer_1\progress.md` — Liveness heartbeat
- `c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m1_explorer_1\handoff.md` — Complete 5-component architectural handoff report
