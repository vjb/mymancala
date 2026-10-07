# Task Assignment: M1 Iteration 2 Remediation Worker

## Objective
Implement all remediations for Milestone M1 (Phase 1 Calm UI, Accessibility, Languages, Onboarding) across the codebase based on the 3 Explorer reports:
1. `c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m1_iter2_explorer_1\handoff.md`
   - Artifacts: `proposed_App.tsx`, `proposed_useUserSettings.ts`, `proposed_useGame.patch`, `proposed_storage_state.json`
2. `c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m1_iter2_explorer_2\handoff.md`
3. `c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m1_iter2_explorer_3\handoff.md`

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Concrete Implementation Steps

### 1. App Architecture, Empty State & Canonical Lenses
- Create `src/game/useUserSettings.ts` based on `proposed_useUserSettings.ts` (encapsulating theme, fontScale, reducedMotion, sound, haptics, bigMode, tapTwice, speech).
- Update `src/App.tsx` based on `proposed_App.tsx`:
  - Calculate `isAnalysisEmpty`: `activePreset === 'justPlay' || (!lenses.advantageBar && !lenses.bestMoveMarks && !lenses.threatPits && !lenses.landingPreview && !lenses.coach && !lenses.explanations && !lenses.errorRate && !lenses.winPercent && !lenses.mainLine)`.
  - Pass `isAnalysisEmpty={isAnalysisEmpty}`, `onApplyPreset={(p) => setLenses(applyPreset(p))}`, and `onNavigateTab={(tab) => setMobileTab(tab)}` to `<AnalysisPanel />`.
  - Remove `navigator.webdriver` check from `App.tsx:98` (use clean localStorage checks).
  - Ensure `src/App.tsx` remains strictly `< 300 lines` (target: 284 lines) with clean, readable React formatting.
- In `src/game/useGame.ts`:
  - Gate `hoverPreview` calculation by `lenses.landingPreview`: `if (!lenses.landingPreview || animatingState || hoveredPit === null || displayBoard[hoveredPit] === 0) return null;`
- In `playwright.config.ts`:
  - Configure `storageState: './e2e/.storage-state.json'` and create `e2e/.storage-state.json` (from `proposed_storage_state.json`) so automated test suites can bypass first-run onboarding cleanly without relying on production webdriver sniffing. Add/verify `e2e/onboarding.spec.ts` for clean-launch testing.

### 2. A11y, Contrast, Font Floor & Touch Ergonomics
- In `src/components/panels/AnalysisPanel.tsx`:
  - Replace `text-emerald-500` with skin-aware class: `currentSkin === 'porcelain' ? 'text-emerald-800' : 'text-emerald-500'` (or `text-emerald-900`) for `0.000`, `[Free Turn]` badges, and session accuracy banners to achieve >= 7:1 contrast on porcelain skin (WCAG AAA).
- In `src/components/shell/BottomTray.tsx`, `EvalGauge.tsx`, `Header.tsx`, `TutorialModal.tsx`, `PVDisplay.tsx`, `PVSheet.tsx`, `CoachPanel.tsx`, `DiagnosticsModal.tsx`:
  - Replace all arbitrary Tailwind classes (`text-[9px]`, `text-[10px]`, `text-[11px]`) with `text-floor text-xs` (`max(0.75rem, 12px)`), guaranteeing that computed font sizes across all visible text elements are strictly >= 12px at scale M.
- In `src/components/board/PitButton.tsx`:
  - Add `useEffect` cleanup hook on unmount for `longPressTimerRef`.
  - In `handleTouchEnd`, add `e.preventDefault()` on normal taps before `onClick()` to prevent duplicate synthetic click events on touch devices.
- In `src/components/modals/DiagnosticsModal.tsx`:
  - Add `Escape` key listener to close modal, add focus trap via `trapFocus`, and set `role="dialog"`, `aria-modal="true"`.

### 3. i18n Catalogs, Arabic Plurals & Test Alignment
- In `src/components/shell/TurnBanner.tsx:86`:
  - Replace hardcoded `'Stones: ' + totalStones` with `{t('board.stones', { count: totalStones })}`.
- In `src/i18n/translations/en.ts`, `ar.ts`, `es.ts`:
  - Add key `'board.stones'` (`'{count} stones'`, `'{count} حجر'`, `'{count} piedras'`) ensuring 100% key parity across all 3 catalogs.
- In `src/components/board/StorePit.tsx` and `src/lib/a11y.ts`:
  - Update stone count strings to use `t('board.stones', ...)` with fallback.
- In `src/i18n/i18n.test.ts`:
  - Add comprehensive unit tests validating all 6 Arabic plural forms (zero, one, two, few, many, other) with test counts (0, 1, 2, 3..10, 11..99, 100+).
- Align E2E suites:
  - Run `npx playwright test e2e/m1_adversarial_stress.spec.ts`
  - Run `npx playwright test e2e/challenger-m1.spec.ts`
  - Run full matrix: `npx playwright test`

### 4. Verification Deliverables
- `npx tsc --noEmit`: Exit code 0, 0 diagnostic errors.
- `npm test`: All unit/fuzz tests pass (including 2,000-game Kalah fuzz, Arabic plural matrix, highlight precedence).
- `npm run build`: Clean production build with search.worker chunk.
- `npx playwright test`: 100% pass across all 4 viewports (`mobile-small`, `mobile-iphone`, `tablet-portrait`, `desktop-landscape`).
- `(Get-Content src/App.tsx).Length`: Strictly `< 300` lines.
- Update `docs/plan/PROGRESS.md`.

Write your full handoff report to `c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m1_iter2_worker_1\handoff.md`.
Notify your parent (ID: 85856d3d-5ca8-4fac-8578-3161a39fe3a5) via send_message when done.
