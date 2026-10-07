# DISPATCH — m0_iter2_worker_1

## Task Assignment
- Milestone: M0 (Phase 0 Foundation - Iteration 2)
- Role: teamwork_preview_worker
- Working Directory: c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m0_iter2_worker_1
- Parent Conversation ID: 85856d3d-5ca8-4fac-8578-3161a39fe3a5
- Input Specifications:
  - c:\Users\vjbel\hacks\mymancala\.agents\teamwork\ORIGINAL_REQUEST.md
  - c:\Users\vjbel\hacks\mymancala\PROJECT.md
  - c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m0_iter2_explorer_1\handoff.md
  - c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m0_iter2_explorer_2\handoff.md
  - c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m0_iter2_explorer_3\handoff.md

## MANDATORY INTEGRITY WARNING
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Objective
Implement all remediations formulated by the three Iteration 2 Explorers:
1. Storage Corruption Defense:
   - In `src/lib/storage.ts`: update `loadGameSession()` to validate `parsed.options && typeof parsed.options.stonesPerPit === 'number'`.
   - In `src/game/useGame.ts`: in `handleResumeSavedGame`, provide fallback default options (`stonesPerPit: 4, freeTurn: true, captureOpposite: true`), restore `rules: savedGamePrompt.options` and `stonesConfig` in `RESTORE_SAVED_GAME` payload, and pass `options` to `replayGameFromHistory`.
   - In `e2e/storage-stress.spec.ts` & `src/lib/storage-corruption.test.ts`: verify clean fallback without uncaught exceptions.
2. Worker Custom Rules & Auto-Cancellation:
   - In `src/workers/protocol.ts`: add `rulesOptions?: RulesConfig` to `SearchRequest`.
   - In `src/rules/index.ts`: update `getRuleSet(id, options)` to pass options to `createKalahRuleSet`.
   - In `src/workers/search.worker.ts`: update TT cache key with rulesOptions and delegate to `getRuleSet(req.rules, req.rulesOptions)`.
   - In `src/workers/searchClient.ts`: auto-cancel previous in-flight request before posting new one (with opt-out flag for storm tests).
   - In `src/game/useGame.ts`: pass `rulesOptions: state.rules` to `searchClient.analyze` and add `state.rules` to `useEffect` deps.
3. PVSheet Polymorphic Layout:
   - In `src/components/panels/PVSheet.tsx`, `PVDisplay.tsx`, `AnalysisPanel.tsx`, `App.tsx`: pass `ruleSet` or `layout` so step labels and pit ownership use `layout.label(pit)` and `layout.pitOwner(pit)` with fallback to `kalahRuleSet.layout`.
4. Verification:
   - Run `npx tsc --noEmit`
   - Run `npm test`
   - Run `npm run build`
   - Run `npm run test:e2e`
   - Verify line count of `src/App.tsx` remains strictly < 300 lines.
   - Update `docs/plan/PROGRESS.md`.

Write your handoff report to `c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m0_iter2_worker_1\handoff.md`.
Notify parent via send_message.
