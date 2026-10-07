# BRIEFING — 2026-10-07T02:56:00Z

## Mission
Analyze and provide concrete specifications for i18n typed localization, RTL directionality with unmirrored board physics, interactive 8-10 step mini-board tutorial, and first-run audience picker for Mancala M1.

## 🔒 My Identity
- Archetype: explorer
- Roles: teamwork_preview_explorer, i18n_rtl_tutorial_architect
- Working directory: c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m1_explorer_3
- Original parent: 85856d3d-5ca8-4fac-8578-3161a39fe3a5
- Milestone: M1 (Phase 1: Calm UI, Accessibility, Languages, Onboarding)

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- Strictly read existing code and propose concrete specifications and code snippets for implementers
- Hand-rolled typed i18n (en, ar, es) satisfying `typeof en` at compile time
- RTL directionality mirrors UI chrome while physical Mancala board pits and stores remain strictly unmirrored (Player 1 pits 0..5 CCW toward right store)
- Guided interactive mini-tutorial (8-10 steps) with scripted mini-board states and step navigation
- First-run audience picker ("Kid", "Casual", "Learner/Expert", "Analyst") configuring initial presets non-destructively

## Current Parent
- Conversation ID: 85856d3d-5ca8-4fac-8578-3161a39fe3a5
- Updated: 2026-10-07T02:51:23Z

## Investigation State
- **Explored paths**:
  - `ORIGINAL_REQUEST.md`, `PROJECT.md`, `phase-1-lenses-and-access.md`
  - `src/rules/types.ts`, `src/rules/kalah.ts`
  - `src/components/shell/BottomTray.tsx`, `Header.tsx`, `TurnBanner.tsx`
  - `src/components/panels/SettingsPanel.tsx`, `CoachPanel.tsx`, `AnalysisPanel.tsx`
  - `src/components/board/Board.tsx`, `PitButton.tsx`, `StorePit.tsx`
  - `src/lenses.ts`, `src/bots.ts`, `src/tactics.ts`, `src/App.tsx`, `src/RulesModal.tsx`
  - `src/preserved-testids.test.ts`, `e2e/no-hscroll.spec.ts`
- **Key findings**:
  1. No existing i18n library is installed; hand-rolled typed solution using `Record<keyof typeof en, string>` guarantees compile-time completeness for `ar.ts` and `es.ts` without external dependencies.
  2. Native `Intl.PluralRules` and `Intl.NumberFormat` provide zero-dep pluralization supporting Arabic's 6 plural categories (zero, one, two, few, many, other) and number formatting.
  3. RTL directionality: Setting `<html dir="rtl" lang="ar">` mirrors chrome as desired, but CSS flex/grid would mirror the Mancala board unless the board container is explicitly isolated with `dir="ltr"`. With `dir="ltr"`, Store 2 remains left, Store 1 remains right, and CCW sowing flow remains authentic.
  4. 2x3 mini-board (8 pits total: 6 playable + 2 stores) allows full demonstration of sowing, scoring, store skipping, free turns, captures, and sweep endgame inside mobile modals (<360px) without horizontal scrolling.
  5. Audience picker configures presets non-destructively on first run (`mancala_onboarding_v1`) without requesting any personal age/info.
- **Unexplored areas**: None. Complete specification ready for handoff.

## Key Decisions Made
- Selected flat dot-notated translation keys (`Record<keyof typeof en, string>`) for zero-overhead compile-time validation under `tsc --noEmit`.
- Designed 2x3 mini-board with pure functional step reducer for the interactive tutorial.
- Board isolation achieved via explicit `<div dir="ltr">` wrapper on `Board.tsx` and tutorial mini-board.
- Audience picker provides 4 distinct profiles ("Kid", "Casual", "Learner", "Analyst") mapping directly to existing lenses, bot speed, audio, and Big Mode toggles.

## Artifact Index
- c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m1_explorer_3\handoff.md — Final 5-component handoff specification report
