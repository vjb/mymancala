# DISPATCH: m1_explorer_3 (i18n, RTL & Tutorial Architect)

## Task Assignment
- **Agent**: `m1_explorer_3`
- **Role**: `teamwork_preview_explorer`
- **Working Directory**: `c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m1_explorer_3`
- **Parent Conversation ID**: `85856d3d-5ca8-4fac-8578-3161a39fe3a5`
- **Milestone**: M1 (Phase 1: Calm UI, Accessibility, Languages, Onboarding)

## Inputs to Read:
1. `c:\Users\vjbel\hacks\mymancala\.agents\teamwork\ORIGINAL_REQUEST.md` (authoritative user request)
2. `c:\Users\vjbel\hacks\mymancala\PROJECT.md` (Features 21, 22, 23, 24)
3. `c:\Users\vjbel\hacks\mymancala\docs\plan\phase-1-lenses-and-access.md`
4. `c:\Users\vjbel\hacks\mymancala\src\rules\types.ts` & `src\rules\kalah.ts`
5. `c:\Users\vjbel\hacks\mymancala\src\components\shell\BottomTray.tsx`
6. `c:\Users\vjbel\hacks\mymancala\src\components\shell\Header.tsx`
7. `c:\Users\vjbel\hacks\mymancala\src\components\panels\SettingsPanel.tsx`

## Investigation Scope:
Analyze the concrete architecture and implementation plan for:
1. **Typed Localization Catalogs (Feature 21)**:
   - Hand-rolled typed i18n system without heavyweight external libraries.
   - Base catalog: `src/i18n/translations/en.ts`.
   - Localized catalogs: `ar.ts` (Arabic) and `es.ts` (Spanish).
   - Strict typing: `ar.ts` and `es.ts` must satisfy `typeof en` (or `Record<keyof typeof en, string>`), enforced by `npx tsc --noEmit`.
   - Pluralization helper and interpolation (e.g. `{count} stones`, `{n} moves`).
   - React hook or context: `useTranslation()` / `t(key, params)`.
2. **RTL Directionality & Unmirrored Physical Board Layout (Feature 22)**:
   - When Arabic is active: document element sets `dir="rtl"` and `lang="ar"`.
   - Modals, settings, tray, headers mirror direction naturally with CSS logical properties or standard RTL flex/grid.
   - **CRITICAL CONSTRAINT**: Mancala physical board geometry MUST NOT flip horizontally under RTL! Player 1's pits remain 0..5 along the bottom (sowing counter-clockwise toward Player 1 store on the right; Player 2 store on the left). Pits and stores must retain their physical layout under RTL.
3. **Guided Interactive Mini-Tutorial (Feature 23)**:
   - 8–10 step scripted tutorial modal/overlay operating on a mini-board (e.g. 2x3 or 2x4 pits).
   - Scripted lessons:
     1. Introduction & objective (accumulate stones in your store).
     2. How sowing works (take all stones from a pit, drop one in each pit CCW).
     3. Scoring (stones in your store stay there).
     4. Skipping opponent's store.
     5. Extra turn rule (landing in your store grants a free turn).
     6. Capture rule (landing in an empty pit on your side captures opposite stones).
     7. Game over sweep (when one side is empty, other side captures remaining).
     8. Congratulations & ready to play!
   - Step forward / backward navigation, restart step, and "Skip tutorial" button.
4. **First-Run Audience Picker (Feature 24)**:
   - Triggered on first launch (persisted in `mancala_onboarding_v1`):
     - "Kid Mode": Sets Gentle Coach preset, Big Mode, audio enabled.
     - "Casual": Sets Just Play preset, calm visuals.
     - "Learner / Club Player": Sets Tactician preset.
     - "Analyst": Sets Deep Analysis preset.
   - Non-locking: Can be changed anytime in Settings.

## Output Requirements:
Write your detailed architectural specification, file modification list, catalog structure, and tutorial script to:
`c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m1_explorer_3\handoff.md`

Send a message to your parent (`85856d3d-5ca8-4fac-8578-3161a39fe3a5`) with the handoff report path when finished.


## 2026-10-07T02:51:23Z
Received task assignment from Project Orchestrator (ID: 85856d3d-5ca8-4fac-8578-3161a39fe3a5).
Beginning architecture analysis of i18n, RTL, interactive tutorial, and audience picker.
