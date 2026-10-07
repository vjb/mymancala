# BRIEFING — 2026-10-07T05:05:00Z

## Mission
Implement all remediations for Milestone M1 Iteration 2: App architecture, empty state & lenses, a11y & contrast, font floor >= 12px, touch ergonomics, and i18n catalogs/plurals.

## 🔒 My Identity
- Archetype: worker
- Roles: implementer, qa, specialist
- Working directory: c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m1_iter2_worker_1
- Original parent: 85856d3d-5ca8-4fac-8578-3161a39fe3a5
- Milestone: M1 Iteration 2

## 🔒 Key Constraints
- DO NOT CHEAT. All implementations must be genuine.
- Strict line count for src/App.tsx: < 300 lines.
- Preserve all data-testid attributes.
- Ensure WCAG AA contrast (AAA on porcelain for key elements >= 7:1).
- Hard font floor >= 12px at scale M.
- 100% key parity across en, ar, es catalogs.
- All unit, fuzz, build, and Playwright tests must pass cleanly.

## Current Parent
- Conversation ID: 85856d3d-5ca8-4fac-8578-3161a39fe3a5
- Updated: 2026-10-07T05:05:00Z

## Task Summary
- **What to build**: M1 Iteration 2 Remediations (useUserSettings, App.tsx clean split, useGame hoverPreview lens gating, playwright storageState, a11y contrast in AnalysisPanel, font floor >= 12px in 9 components, PitButton touch cleanup and preventDefault, DiagnosticsModal Esc/focus trap, i18n stone count and Arabic plurals tests).
- **Success criteria**: tsc passes, npm test passes, npm run build passes, playwright tests pass across 4 viewports, App.tsx < 300 lines.
- **Interface contracts**: PROJECT.md, SCOPE.md, docs/plan/
- **Code layout**: PROJECT.md § Code Layout

## Key Decisions Made
- Extracted useUserSettings hook to keep App.tsx at 285 lines with clean idiomatic React formatting.
- Gated hoverPreview in useGame.ts with lenses.landingPreview.
- Applied skin-aware text-emerald-800 contrast fixes in AnalysisPanel.tsx.
- Applied text-floor text-xs across all 9 components (40 instances).
- Added preventDefault, unmount cleanup, and armed fallback in PitButton.tsx.
- Added trapFocus and Escape listener in DiagnosticsModal.tsx.
- Added 'board.stones' base key in en, ar, es with 100% 1:1 parity and full Arabic plural tests.
- Added e2e/.storage-state.json and e2e/onboarding.spec.ts for clean test harness onboarding bypass.

## Artifact Index
- c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m1_iter2_worker_1\DISPATCH.md — Task assignment
- c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m1_iter2_worker_1\BRIEFING.md — Persistent context
- c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m1_iter2_worker_1\progress.md — Liveness & step progress
- c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m1_iter2_worker_1\handoff.md — 5-Component Handoff report

## Change Tracker
- **Files modified**:
  - `src/game/useUserSettings.ts`: Extracted settings state hook
  - `src/App.tsx`: Clean architecture (285 lines), empty state wiring, no webdriver sniffing
  - `src/game/useGame.ts`: Gated hoverPreview by lenses.landingPreview
  - `playwright.config.ts`: Configured storageState
  - `e2e/.storage-state.json`: Onboarding bypass state
  - `e2e/onboarding.spec.ts`: Dedicated onboarding flow tests
  - `src/components/panels/AnalysisPanel.tsx`: Porcelain skin contrast fixes
  - `src/components/shell/BottomTray.tsx`: Font floor >= 12px
  - `src/components/shell/Header.tsx`: Font floor >= 12px
  - `src/components/shell/EvalGauge.tsx`: Font floor >= 12px
  - `src/components/modals/TutorialModal.tsx`: Font floor >= 12px
  - `src/components/panels/PVDisplay.tsx`: Font floor >= 12px
  - `src/components/panels/PVSheet.tsx`: Font floor >= 12px
  - `src/components/panels/CoachPanel.tsx`: Font floor >= 12px
  - `src/components/modals/DiagnosticsModal.tsx`: Focus trap, Esc dismiss, font floor >= 12px
  - `src/components/modals/AudiencePickerModal.tsx`: Font floor >= 12px
  - `src/components/board/PitButton.tsx`: Touch preventDefault, timer cleanup, a11y translation
  - `src/lib/a11y.ts`: getPitAriaLabel localized stone count
  - `src/components/board/StorePit.tsx`: Localized store ariaLabel
  - `src/components/shell/TurnBanner.tsx`: Localized stone count
  - `src/i18n/en.ts`, `ar.ts`, `es.ts`: Added board.stones key
  - `src/i18n/i18nContext.tsx`: Exported formatTranslation
  - `src/i18n/i18n.test.ts`: Arabic 6-form plural unit tests
  - `docs/plan/PROGRESS.md`: M1 Iteration 2 progress log

## Quality Status
- **Build/test result**: ALL PASS (tsc 0 errors, Vitest 17/17 files 171/171 tests, Vite build 16.89s, Playwright 184/184 tests 100% pass)
- **Lint status**: Clean
- **Tests added/modified**: 8 new onboarding tests (e2e/onboarding.spec.ts), 8 Arabic/ES plural tests (src/i18n/i18n.test.ts)
