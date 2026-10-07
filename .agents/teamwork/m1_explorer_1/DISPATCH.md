# DISPATCH: m1_explorer_1 (Highlights & Lenses Architect)

## Task Assignment
- **Agent**: `m1_explorer_1`
- **Role**: `teamwork_preview_explorer`
- **Working Directory**: `c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m1_explorer_1`
- **Parent Conversation ID**: `85856d3d-5ca8-4fac-8578-3161a39fe3a5`
- **Milestone**: M1 (Phase 1: Calm UI, Accessibility, Languages, Onboarding)

## Inputs to Read:
1. `c:\Users\vjbel\hacks\mymancala\.agents\teamwork\ORIGINAL_REQUEST.md` (authoritative user request)
2. `c:\Users\vjbel\hacks\mymancala\PROJECT.md` (Features 1, 2, 13)
3. `c:\Users\vjbel\hacks\mymancala\docs\plan\phase-1-lenses-and-access.md`
4. `c:\Users\vjbel\hacks\mymancala\src\lenses.ts`
5. `c:\Users\vjbel\hacks\mymancala\src\components\board\Board.tsx`
6. `c:\Users\vjbel\hacks\mymancala\src\components\board\PitButton.tsx`
7. `c:\Users\vjbel\hacks\mymancala\src\components\panels\AnalysisPanel.tsx`
8. `c:\Users\vjbel\hacks\mymancala\src\game\gameTypes.ts` & `src\game\gameReducer.ts`

## Investigation Scope:
Analyze the concrete architecture and implementation plan for:
1. **Highlight Visual Language & Strict Precedence**:
   - Strict single active highlight per pit: `preview` > `best` > `lastMove` > `playable`.
   - 350ms touch preview / hover showing simulated pebble drops in destination pits and highlight of captured opposite pits.
   - Highlight legend popover accessible from board settings.
2. **7 Lenses & 4 Presets**:
   - 7 independent lenses: `evalBar`, `bestMoveHighlight`, `threatPits`, `landingPreview`, `principalVariation`, `explanations`, `errorRate`.
   - 4 user presets:
     - `Just Play`: All lenses OFF. Pure board, turn indicator, bottom tray. Zero analysis UI. Analysis tab displays calm empty state.
     - `Gentle Coach`: `evalBar` (lead/behind, no numbers), `landingPreview`, `explanations` on blunder.
     - `Tactician`: `bestMoveHighlight`, `threatPits`, `principalVariation` (up to 3 ply).
     - `Deep Analysis`: All 7 lenses ON.
3. **Plain Language & Glossary**:
   - Replace jargon ("evaluation", "centipawns", "minimax", "alpha-beta") with calm words: "Position balance", "Expected lead", "Tactical threat".
   - Interactive glossary popup behind `explanations` lens.

## Output Requirements:
Write your detailed architectural specification, file modification list, type contracts, and component designs to:
`c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m1_explorer_1\handoff.md`

Send a message to your parent (`85856d3d-5ca8-4fac-8578-3161a39fe3a5`) with the handoff report path when finished.


## 2026-10-07T02:51:23Z
Received invocation from parent orchestrator 85856d3d-5ca8-4fac-8578-3161a39fe3a5:
"You are m1_explorer_1.
Your working directory is c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m1_explorer_1.
Your caller/parent is the Project Orchestrator (ID: 85856d3d-5ca8-4fac-8578-3161a39fe3a5).
MANDATORY FIRST STEP: Read the original user request at: c:\Users\vjbel\hacks\mymancala\.agents\teamwork\ORIGINAL_REQUEST.md
Also read PROJECT.md, docs/plan/phase-1-lenses-and-access.md, etc."
