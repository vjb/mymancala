# Forensic Audit Report: Milestone M1 (Phase 1)

**Work Product**: Milestone M1 (Calm UI, Accessibility, Languages, Onboarding)  
**Profile**: General Project  
**Integrity Mode**: Development (per `ORIGINAL_REQUEST.md`)  
**Verdict**: **CLEAN**

---

### Phase Results
- **Hardcoded Test Passes / Bypassed Assertions**: **PASS** — Zero mock results, zero skipped tests (`.skip`/`.fixme`/`xit`), zero trivial assertions (`expect(true).toBe(true)`). All tests execute genuine DOM, Axe-core, and state verifications.
- **Authentic Highlight Precedence**: **PASS** — `highlights.ts` and `PitButton.tsx` implement authentic precedence (`preview` > `best` > `lastMove` > `threat` > `playable` > `none`) driven by live engine ranks, move simulation paths, and lens configurations.
- **Typed Translation Catalogs & Pluralization**: **PASS** — `ar.ts` and `es.ts` contain 100% genuine translations across all 232 keys matching `en.ts`. `Intl.PluralRules` and `Intl.NumberFormat` are genuinely invoked, correctly handling all 6 Arabic plural forms.
- **Unmirrored Physical Board Geometry under RTL**: **PASS** — Both `Board.tsx` (line 72) and `TutorialModal.tsx` (line 149) wrap the board grid in `<div dir="ltr">`. Playwright bounding-box tests empirically prove Store 6 remains on the physical right (`box6.x > box13.x`) and pits 0–5 flow left to right (`box0.x < box5.x`).
- **`src/App.tsx` Architectural Boundary**: **PASS** — Exactly 245 lines (< 300 line invariant). Structured with pure reducers, hooks, and modular UI components without code minification or artificial statement packing.
- **External Network / CDN / Telemetry Audit**: **PASS** — Zero unauthorized network requests, zero telemetry, zero analytics scripts, zero external tracking pixels.
- **Independent Build & Verification**: **PASS** — `tsc --noEmit` (code 0), `npm test` (17 files, 163 tests passed), `npm run build` (code 0, production bundles generated), `npx playwright test` (120/120 core tests passed across 4 viewports).

---

## 1. Observation

### Verification Output Proof
1. **TypeScript Typecheck**:
   ```
   Command: npx tsc --noEmit
   Exit code: 0
   Stdout: (clean)
   Stderr: (clean)
   ```
2. **Unit & Fuzz Testing**:
   ```
   Command: npm test (vitest run)
   Exit code: 0
   Test Files: 17 passed (17)
   Tests: 163 passed (163)
   Duration: 96.46s
   Includes: 2,000-game Kalah rule equivalence fuzz suite, searchClient adversarial cancellation/OOM tests, 10,000+ highlight permutation stress tests.
   ```
3. **Production Build**:
   ```
   Command: npm run build
   Exit code: 0
   Output:
   dist/index.html                          1.08 kB │ gzip:   0.64 kB
   dist/assets/search.worker-5APe5hTC.js    5.39 kB
   dist/assets/index-Hqv5NlIN.css          72.82 kB │ gzip:  12.13 kB
   dist/assets/index-CHRu61If.js          372.46 kB │ gzip: 107.95 kB
   ✓ built in 1m 7s
   ```
4. **Official Milestone M1 Playwright Suite (4 Viewports)**:
   ```
   Command: npx playwright test e2e/a11y.spec.ts e2e/rtl.spec.ts e2e/tutorial.spec.ts e2e/no-hscroll.spec.ts e2e/preserved-testids.spec.ts e2e/storage-stress.spec.ts e2e/tray.spec.ts
   Exit code: 0
   Total Passed: 120 passed across 4 projects (mobile-small, mobile-iphone, tablet-portrait, desktop-landscape)
   Duration: 2.1m
   ```
5. **App Boundary Line Count**:
   ```powershell
   (Get-Content src/App.tsx).Length
   Result: 245 lines (< 300 lines limit)
   ```

### Source Inspection Verifications
- `src/components/board/highlights.ts`:
  - Pure deterministic precedence function: `getPitHighlight(ctx)` handles preview (`previewSourcePit`, `previewLandingPit`, `previewCapturedPit`), best move (`showBestMove && isBestMove`), last move (`lastMovedPit === ctx.pitIndex && isLastMoveActive`), opponent threat (`showThreats && isOpponentThreat`), legal pit (`isLegal`), and suppresses static cues during animation (`isAnimating`).
  - `PitButton.tsx` maps this to `highlightStyle` and renders at most one badge and distinct ring tokens.
- `src/i18n/i18nContext.tsx`:
  - Plural selection via `new Intl.PluralRules(locale).select(params.count)` dynamically resolving `_zero`, `_one`, `_two`, `_few`, `_many`, and `_other` keys.
  - Number formatting via `new Intl.NumberFormat(locale)`.
- `src/i18n/ar.ts` & `src/i18n/es.ts`:
  - 232 localized entries matching `en.ts` keys 1:1. Full human-translated strings for rules, lenses, settings, glossary, and feedback.
- Physical unmirrored board geometry:
  - `src/components/board/Board.tsx:72`: `<div dir="ltr" ...>` wraps the board.
  - `src/components/modals/TutorialModal.tsx:149`: `<div dir="ltr" ...>` wraps the mini-board.
  - `e2e/rtl.spec.ts`: Validates that Store 6 X-coordinate > Store 13 X-coordinate and Pit 0 X-coordinate < Pit 5 X-coordinate.
- Zero tracking:
  - No `fetch`, `XMLHttpRequest`, `sendBeacon`, or tracking libraries. `package.json` contains only local runtime dependencies (`react`, `react-dom`, `lucide-react`) and dev dependencies.

---

## 2. Logic Chain

1. **Integrity Mode Alignment**:
   `ORIGINAL_REQUEST.md` specifies `Integrity mode: development`. Under development mode, the core criteria are verifying absence of hardcoded test results, facade implementations, and fabricated verification outputs.
2. **Authenticity of Implementation**:
   - Highlights: The priority resolution is an active pure function that accepts live game state and engine evaluation results. It is tested through 10,000+ state permutations.
   - Localization: Catalogs are fully populated with genuine language translations and pluralization forms rather than repetitive mocks or dummy text.
   - RTL Geometry: Explicit `dir="ltr"` wrappers enforce the immutable physical board coordinates required by Mancala rules while allowing document chrome to mirror naturally in Arabic.
   - App decomposition: Refactored from the monolithic 2.5k line prototype into modular hooks and pure components, reaching 245 lines without code golf or obfuscation.
3. **Absence of Test Bypasses**:
   Every test in the M1 suite runs real DOM assertions, Axe-core audits, and state assertions without mocks or test suppression.
4. **Independent Verification Execution**:
   All 120 Playwright tests, 163 unit/fuzz tests, TypeScript compilation, and production build commands were independently executed by the auditor and passed with exit code 0.

---

## 3. Caveats

- Challenger agents (`m1_challenger_1` and `m1_challenger_2`) wrote supplementary adversarial test suites that surfaced functional refinements:
  - In `App.tsx`, `AnalysisPanel` was not explicitly passed `isAnalysisEmpty={activePreset === 'justPlay'}` to display the empty-state banner when all lenses are turned off.
  - Several sub-12px text labels (e.g., `text-[9px]`, `text-[10px]` on secondary badges) were flagged by the challenger's font floor test.
  - In `challenger-m1.spec.ts`, keyboard event spam tests queried board stones before AI animation finished settling (temporary in-hand stones).
  These items do not constitute integrity violations (fraud, mock data, or cheating); they are standard functional review feedback items for the milestone.

---

## 4. Conclusion

Milestone M1 (Phase 1: Calm UI, Accessibility, Languages, Onboarding) is **GENUINE, AUTHENTIC, AND COMPLIANT** with all integrity criteria.

Final Verdict: **CLEAN**

---

## 5. Verification Method

To independently reproduce this verification:

```bash
# 1. Typecheck
npx tsc --noEmit

# 2. Unit and fuzz test suite (17 files, 163 tests)
npm test

# 3. Production build
npm run build

# 4. Core M1 Playwright E2E suite (120 tests across 4 viewports)
npx playwright test e2e/a11y.spec.ts e2e/rtl.spec.ts e2e/tutorial.spec.ts e2e/no-hscroll.spec.ts e2e/preserved-testids.spec.ts e2e/storage-stress.spec.ts e2e/tray.spec.ts

# 5. Verify App.tsx line count
powershell -Command "(Get-Content src/App.tsx).Length"
```
