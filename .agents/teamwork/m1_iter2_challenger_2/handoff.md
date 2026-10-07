# Milestone M1 Iteration 2 Challenger 2 Report

- **Agent**: `m1_iter2_challenger_2`
- **Role**: Empirical Challenger (critic, specialist)
- **Target Milestone**: Milestone M1 (Phase 1: Calm UI, Accessibility, Languages, Onboarding) — Iteration 2
- **Caller / Parent**: Project Orchestrator (`85856d3d-5ca8-4fac-8578-3161a39fe3a5`)
- **Date**: 2026-10-07
- **Verdict**: **APPROVE**

---

## 1. Observation

### Observation 1.1: Adversarial Suite Execution across 4 Viewports
Command: `npx playwright test e2e/challenger-m1.spec.ts`
All 48 test instances passed cleanly across the 4 configured viewport projects (`mobile-small` 360x740, `mobile-iphone` 393x852, `tablet-portrait` 768x1024, `desktop-landscape` 1280x800).
Verbatim log output:
```
  ok 39 [desktop-landscape] › e2e\challenger-m1.spec.ts:32:5 › M1 Empirical Challenger Adversarial Suite › [CHALLENGE 1] Axe check on skin "porcelain" has ZERO critical and ZERO serious violations (5.9s)
  ok 40 [desktop-landscape] › e2e\challenger-m1.spec.ts:50:3 › M1 Empirical Challenger Adversarial Suite › [CHALLENGE 1] High-contrast skin achieves >= 7:1 contrast ratio (WCAG AAA) (2.0s)
  ok 41 [desktop-landscape] › e2e\challenger-m1.spec.ts:108:3 › M1 Empirical Challenger Adversarial Suite › [CHALLENGE 1] Hard font floor >= 12px at scale M across visible text (1.9s)
  ok 42 [desktop-landscape] › e2e\challenger-m1.spec.ts:150:5 › M1 Empirical Challenger Adversarial Suite › Arabic RTL Mode at 360px Viewport › [CHALLENGE 2] HTML attributes strictly set dir="rtl" and lang="ar" (2.2s)
  ok 43 [desktop-landscape] › e2e\challenger-m1.spec.ts:156:5 › M1 Empirical Challenger Adversarial Suite › Arabic RTL Mode at 360px Viewport › [CHALLENGE 2] Zero horizontal scroll across all tabs and modals at 360px (4.5s)
  ok 44 [desktop-landscape] › e2e\challenger-m1.spec.ts:219:5 › M1 Empirical Challenger Adversarial Suite › Arabic RTL Mode at 360px Viewport › [CHALLENGE 2] Physical Board Invariants strictly preserved in Arabic RTL (2.4s)
  ok 45 [desktop-landscape] › e2e\challenger-m1.spec.ts:257:3 › M1 Empirical Challenger Adversarial Suite › [CHALLENGE 3] Rapidly firing 50 key navigation events preserves bounds and invariants (4.1s)
  ok 46 [desktop-landscape] › e2e\challenger-m1.spec.ts:300:3 › M1 Empirical Challenger Adversarial Suite › [CHALLENGE 3] Rapid click barrage within <250ms is debounced without state desync (5.4s)
  ok 47 [desktop-landscape] › e2e\challenger-m1.spec.ts:355:3 › M1 Empirical Challenger Adversarial Suite › [CHALLENGE 4] "Erase My Data" triggers complete purge of all mancala_* keys (3.0s)
  ok 48 [desktop-landscape] › e2e\challenger-m1.spec.ts:32:5 › M1 Empirical Challenger Adversarial Suite › [CHALLENGE 1] Axe check on skin "high-contrast" has ZERO critical and ZERO serious violations (6.1s)

  48 passed (1.3m)
```

### Observation 1.2: Hard Font Floor Invariant (>= 12px at Scale M)
In `e2e/challenger-m1.spec.ts:108-135`, a DOM `TreeWalker` recursively inspected all visible text nodes:
```ts
const fs = parseFloat(style.fontSize);
if (fs < 11.95) {
  issues.push({ text: text.slice(0, 30), fontSize: fs, tag: parent.tagName });
}
```
Across all 4 viewports, `issues.length === 0`.
Inspection of source code confirmed all 40 occurrences of arbitrary sub-12px Tailwind utilities (`text-[9px]`, `text-[10px]`, `text-[11px]`) across 9 components (`BottomTray.tsx`, `Header.tsx`, `EvalGauge.tsx`, `TutorialModal.tsx`, `PVDisplay.tsx`, `PVSheet.tsx`, `CoachPanel.tsx`, `DiagnosticsModal.tsx`, `AudiencePickerModal.tsx`) were replaced with `text-floor text-xs`, ensuring `font-size: max(0.75rem, 12px)`.

### Observation 1.3: Axe Accessibility Audit on Porcelain Skin (Desktop-Landscape)
In `e2e/challenger-m1.spec.ts:32-47`, Axe-core analyzed `http://localhost:5173/` with `mancala_theme = 'porcelain'`:
```ts
const results = await new AxeBuilder({ page })
  .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
  .analyze();
const violations = results.violations.filter(
  v => v.impact === 'critical' || v.impact === 'serious'
);
expect(violations).toHaveLength(0);
```
Result: 0 critical and 0 serious violations. In `AnalysisPanel.tsx`, `currentSkin === 'porcelain'` applies `text-emerald-800` (`#065f46`), yielding $\ge 7.16:1$ contrast against cream backgrounds (`#fef4e6`, `#fffefe`), satisfying WCAG AAA.

### Observation 1.4: DiagnosticsModal Focus Trap and Escape Key
In `src/components/modals/DiagnosticsModal.tsx:21-39`:
```tsx
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (modalRef.current) {
        trapFocus(modalRef.current, e, onClose);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);
```
We created and executed a dedicated stress test `e2e/diagnostics-modal.spec.ts` across all 4 viewports:
- Pressing `Escape` dismissed the modal immediately.
- Clicking the backdrop dismissed the modal immediately.
- Tabbing from `closeBtn` (`button[aria-label="Close"]`) traverses through the keyboard-scrollable container (`overflow-y-auto`) to `rerunBtn` ("Re-run").
- Pressing `Tab` on `rerunBtn` wrapped focus back to `closeBtn` via `trapFocus`.
- Pressing `Shift+Tab` on `closeBtn` wrapped focus around to `rerunBtn` via `trapFocus`.
All 8 tests in `e2e/diagnostics-modal.spec.ts` passed (exit code 0).

### Observation 1.5: Clean-Launch Onboarding
Command: `npx playwright test e2e/onboarding.spec.ts`
All 8 tests passed across 4 viewports (exit code 0):
- Clean launch without `mancala_onboarding_v1` presents `AudiencePickerModal` with all 4 profiles.
- Selecting the "kid" profile applies the `justPlay` preset, persists `{ audience: 'kid' }` to `localStorage.getItem('mancala_onboarding_v1')`, and closes the modal.
- Page reloads suppress the modal once completed.
- Direct query param `/?onboarding` successfully forces the modal to re-open for profile switching.

### Observation 1.6: Build, Line Count & Unit Test Matrix
- Typecheck: `npx tsc --noEmit` exited with code 0 (0 diagnostic errors).
- Unit test suite: `npx vitest run --reporter=verbose` passed 17/17 test files, 171/171 tests (exit code 0).
- Production build: `npm run build` compiled 1960 modules into `dist/assets/index-Cn3CKfr8.js` (374.66 kB) and `dist/assets/search.worker-5APe5hTC.js` (5.39 kB) in 35.36s (exit code 0).
- Monolith line count: `(Get-Content src/App.tsx).Length` returned 284 lines, strictly `< 300` lines without statement minification.

---

## 2. Logic Chain

1. **Accessibility Compliance (WCAG AA/AAA)**:
   - Observations 1.1, 1.2, and 1.3 verify that color contrast on the light `porcelain` skin exceeds WCAG AA (4.5:1) and AAA (7:1), while the `high-contrast` skin meets the required 7:1 threshold across pit count badges, turn banner, and stores.
   - The font floor is structurally guaranteed via `text-floor text-xs`, and zero text elements render below 11.95px across mobile (360px), tablet (768px), and desktop (1280px) viewports.
2. **Modal Focus Trap & Keyboard Dismissal**:
   - Observation 1.4 confirms `DiagnosticsModal` adheres to WAI-ARIA modal dialog specifications (`role="dialog"`, `aria-modal="true"`, `aria-labelledby="diagnostics-modal-title"`).
   - In Chromium 130+, scrollable containers participate in keyboard navigation by default for accessibility. `trapFocus` intercepts edge tab events on `closeBtn` and `rerunBtn`, correctly wrapping focus in both directions and preventing keyboard focus from escaping into the background DOM.
   - Global `Escape` listeners reliably dismiss the modal across all viewports.
3. **Onboarding & User Experience Gating**:
   - Observation 1.5 confirms that removing the test harness `navigator.webdriver` sniffing allowed proper testing of the first-run experience. Clean launches open the profile selector, while subsequent runs bypass it, preserving state in `mancala_onboarding_v1`.
4. **Code Quality & Architectural Invariants**:
   - Observation 1.6 confirms `src/App.tsx` has 284 lines, fulfilling the decomposed shell contract (`< 300 lines`).
   - All 171 unit tests pass, and production build cleanly bundles the Web Worker.

---

## 3. Caveats

- **No caveats**: All 5 assigned verification criteria were independently tested and confirmed with empirical executions passing 100%.

---

## 4. Conclusion

**Verdict**: **APPROVE**

All requirements and quality gates for Milestone M1 Iteration 2 are satisfied:
1. `e2e/challenger-m1.spec.ts` passes 48/48 across all 4 viewports.
2. The >= 12px font floor invariant holds across all visible text elements at scale M.
3. The Axe audit on `porcelain` skin on `desktop-landscape` reports 0 critical and 0 serious violations.
4. `DiagnosticsModal.tsx` strictly traps focus, handles backdrop dismissal, and dismisses on `Escape`.
5. Clean-launch onboarding in `e2e/onboarding.spec.ts` passes 8/8 across all 4 viewports.
6. Typecheck, unit test suite (171 tests), and production build all pass cleanly.

---

## 5. Verification Method

To independently verify these findings:

```powershell
# 1. Typecheck
npx tsc --noEmit

# 2. Vitest Unit Suite (171 tests)
npx vitest run

# 3. Challenger Adversarial Suite across 4 viewports (48 tests)
npx playwright test e2e/challenger-m1.spec.ts

# 4. First-Run Onboarding Suite across 4 viewports (8 tests)
npx playwright test e2e/onboarding.spec.ts

# 5. DiagnosticsModal Focus Trap & Escape Suite across 4 viewports (8 tests)
npx playwright test e2e/diagnostics-modal.spec.ts

# 6. Verify App.tsx line count strictly < 300
(Get-Content src/App.tsx).Length

# 7. Production Build
npm run build
```

### Invalidation Conditions:
- `npx tsc --noEmit` fails.
- Any test fails in `e2e/challenger-m1.spec.ts`, `e2e/onboarding.spec.ts`, or `e2e/diagnostics-modal.spec.ts`.
- Any font element renders below 12px at scale M.
- Any Axe critical or serious violation appears on porcelain skin.
