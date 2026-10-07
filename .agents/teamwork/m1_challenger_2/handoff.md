# Adversarial Challenge Handoff Report: Milestone M1

**Verdict**: **REJECT**

---

## 1. Observation

### Test Execution Commands & Results
- **TypeScript Verification**: `npx tsc --noEmit` exited `0` (clean compile).
- **Vitest Unit/Fuzz Suite**: `npm test` executed 16 test files (152 tests); all 152 passed with 0 failures in 72s.
- **Empirical Challenge Test Suite**: `npx playwright test e2e/challenger-m1.spec.ts` was executed across all 4 target viewport projects (`mobile-small` 360x740, `mobile-iphone` 393x852, `tablet-portrait` 768x1024, `desktop-landscape` 1280x800).
  - Out of 48 total tests in the challenge matrix, **44 passed** and **4 failed**.

### Passing Invariants (Empirically Confirmed)
1. **Arabic RTL Directionality & Physical Board Orientation**:
   - `html[dir="rtl"]` and `html[lang="ar"]` confirmed on 4/4 viewports.
   - Zero horizontal scroll (`document.documentElement.scrollWidth <= window.innerWidth`) at 360px mobile viewport across Main Board, Analysis tab, Settings tab, Rules modal, Tutorial modal, and Diagnostics modal.
   - Physical board invariants strictly preserved: South pits (0..5) remain on the bottom (`pit0.y > pit12.y`), ordered left-to-right (`pit0.x < pit5.x`), Store 6 (P1) is on the physical right (`store6.x > store13.x`, `store6.x > pit5.x`), and Store 13 (P2) is on the physical left (`store13.x < store6.x`, `store13.x < pit0.x`).
2. **Keyboard Traversal Bounds**:
   - 50 rapid key navigation events (`ArrowRight`, `ArrowLeft`, `ArrowUp`, `ArrowDown`) successfully maintained focused pit indices strictly between `0` and `12`, with zero out-of-bounds focus or unhandled errors.
3. **Rapid Click Debounce Guard**:
   - Rapid click barrages fired within <250ms (5 clicks in <20ms) on playable pit 2 were cleanly intercepted by `lastPitClickTimeRef.current < 250` debounce guard; zero state desync, and stone conservation strictly remained at 48 stones.
4. **Zero-PII Storage Purge ("Erase My Data")**:
   - Triggering "Erase My Data" via `eraseAllUserData(true)` completely wiped all `mancala_*` keys (`mancala_game_v1`, `mancala_rating_v1`, `mancala_mistakes_v1`, `mancala_progress_v1`, `mancala_dummy_custom_key`) while keeping unrelated non-mancala keys intact.

---

### Failure Findings (Verbatim Errors & Root Causes)

#### Defect 1: Hard Font Floor Invariant (>= 12px at scale M) Violated (Severity: HIGH)
- **Requirement**: `ORIGINAL_REQUEST.md:48` ("Minimum font floor >= 12 px"), `PROJECT.md:31` ("hard floor >= 12 px at scale M"), `DISPATCH.md:18` ("font size floor >= 12px at scale M").
- **Observation**:
  Failed across all 4 viewports in `e2e/challenger-m1.spec.ts:108`:
  ```json
  Found text elements below 12px font floor: [
    { "text": "Coach", "fontSize": 9, "tag": "SPAN" },
    { "text": "Live Advantage (Stones)", "fontSize": 11, "tag": "SPAN" },
    { "text": "Focus", "fontSize": 11, "tag": "SPAN" },
    { "text": "Computer (Engine)", "fontSize": 10, "tag": "SPAN" },
    { "text": "South:", "fontSize": 10, "tag": "SPAN" },
    { "text": "±0.0", "fontSize": 10, "tag": "SPAN" },
    { "text": "Even Match", "fontSize": 9, "tag": "SPAN" },
    { "text": "North:", "fontSize": 10, "tag": "SPAN" },
    { "text": "±0.0", "fontSize": 10, "tag": "SPAN" },
    { "text": "PR:", "fontSize": 9, "tag": "SPAN" },
    { "text": "0.00", "fontSize": 9, "tag": "SPAN" },
    { "text": "blunders)", "fontSize": 9, "tag": "SPAN" },
    { "text": "South (P1)", "fontSize": 10, "tag": "SPAN" },
    { "text": "Board", "fontSize": 10, "tag": "SPAN" },
    { "text": "Analysis", "fontSize": 10, "tag": "SPAN" },
    { "text": "Coach On", "fontSize": 10, "tag": "SPAN" },
    { "text": "Rules", "fontSize": 10, "tag": "SPAN" },
    { "text": "Settings", "fontSize": 10, "tag": "SPAN" }
  ]
  ```
- **Code Root Cause**:
  Multiple components bypassed the `.text-floor` rule (`max(0.75rem, 12px)`) by using hardcoded arbitrary Tailwind classes:
  - `src/components/shell/BottomTray.tsx:36,47,60,71,82`: `className="text-[10px] font-semibold mt-0.5"`
  - `src/components/shell/EvalGauge.tsx:59`: `className="text-[11px] font-bold tracking-tight opacity-75"`
  - `src/components/shell/EvalGauge.tsx:63`: `className="text-[9px] font-bold ..."`
  - `src/components/shell/EvalGauge.tsx:71`: `className="... text-[11px] font-semibold ..."`
  - `src/components/shell/EvalGauge.tsx:92`: `className="text-[10px] font-semibold ..."`
  - `src/components/modals/TutorialModal.tsx:159,208`: `className="text-[9px] ..."`
  - `src/components/panels/PVDisplay.tsx:42`: `className="... text-[9px] ..."`

---

#### Defect 2: Axe Serious Violation in Porcelain Skin on Desktop (Severity: HIGH)
- **Requirement**: `ORIGINAL_REQUEST.md:75` ("Axe accessibility audit reports zero critical/serious violations on core screens"), `DISPATCH.md:17` ("Assert zero critical and zero serious violations").
- **Observation**:
  On `desktop-landscape` (1280x800) where `AnalysisPanel` is visible on initial load:
  ```json
  {
    "id": "color-contrast",
    "impact": "serious",
    "message": "Element has insufficient color contrast of 2.33 (foreground color: #10b981, background color: #fef4e6, font size: 9.0pt (12px), font weight: normal). Expected contrast ratio of 4.5:1",
    "html": "<span class=\"text-emerald-500 font-semibold\">0.000</span>",
    "target": ["td:nth-child(4) > .text-emerald-500.font-semibold"]
  },
  {
    "id": "color-contrast",
    "impact": "serious",
    "message": "Element has insufficient color contrast of 2.51 (foreground color: #10b981, background color: #fffefe, font size: 9.0pt (12px), font weight: bold). Expected contrast ratio of 4.5:1",
    "html": "<span class=\"text-emerald-500 font-bold mr-1.5\">[Free Turn]</span>",
    "target": [".mr-1\\.5"]
  }
  ```
- **Code Root Cause**:
  `src/components/panels/AnalysisPanel.tsx` hardcodes `text-emerald-500` (`#10b981`) inside evaluation rows. In the `porcelain` skin (which has a cream/white background `#f7f4ee` and card `#ffffff`), `#10b981` achieves only 2.33:1 to 2.51:1 contrast ratio, failing WCAG AA minimum threshold (4.5:1).

---

#### Defect 3: Modal Keyboard Navigation Incomplete in DiagnosticsModal (Severity: MEDIUM)
- **Requirement**: `PROJECT.md:36` ("Esc to close modals"), `ORIGINAL_REQUEST.md:49` ("Keyboard navigation (arrows/Enter/Esc)").
- **Observation**:
  `src/components/modals/DiagnosticsModal.tsx` lacks `trapFocus` and does not attach a `keydown` listener for the `Escape` key, unlike `RulesModal.tsx`, `TutorialModal.tsx`, and `HighlightLegendModal.tsx`. Pressing `Escape` leaves the modal stuck open, intercepting all pointer events.

---

## 2. Logic Chain
1. In `m1_worker_1/handoff.md`, the worker claimed: "Comfort & Typography Settings: hard floor >= 12 px at scale M" and "zero critical or serious axe violations on walnut, porcelain, obsidian, and high-contrast skins".
2. In `e2e/challenger-m1.spec.ts`, testing visible text computed font sizes at scale M revealed 25 elements rendered at `9px`, `10px`, and `11px` due to hardcoded Tailwind `text-[9px]`, `text-[10px]`, `text-[11px]` in `EvalGauge.tsx` and `BottomTray.tsx`.
3. In `e2e/challenger-m1.spec.ts`, running Axe against `porcelain` skin on `desktop-landscape` (where `AnalysisPanel` is visible) surfaced a **serious** WCAG AA color contrast violation: `text-emerald-500` on porcelain background produces 2.33:1 contrast against a 4.5:1 requirement.
4. In `src/components/modals/DiagnosticsModal.tsx`, inspecting and testing modal key events confirmed that `Escape` key dismissal is completely omitted, trapping keyboard-only users.
5. Because these defects violate explicit acceptance criteria in `ORIGINAL_REQUEST.md` (R3, Acceptance Criteria: font floor >= 12px, zero serious axe violations) and `DISPATCH.md`, M1 cannot be approved in its current state.

---

## 3. Caveats
- No implementation code was modified by this agent, strictly honoring the review-only role constraint.
- The test harness `e2e/challenger-m1.spec.ts` was added to `e2e/` (project test directory, outside `.agents/teamwork/`).
- The 4-viewport matrix for Arabic RTL layout, physical board orientation, and Zero-PII storage purge was verified and passed completely.

---

## 4. Conclusion
Milestone M1 (Phase 1) is **REJECTED**.

While Arabic RTL layout, physical board geometry invariants, debounce guard, and Zero-PII data purge are solid and verified, M1 fails two mandatory contractual accessibility gates:
1. **Hard font floor >= 12px** is violated across core components (`EvalGauge.tsx`, `BottomTray.tsx`) with 9px, 10px, and 11px text.
2. **Axe Serious Violation** on `porcelain` skin in `AnalysisPanel.tsx` (`text-emerald-500` contrast is 2.33:1 vs required 4.5:1).
3. **Diagnostics modal** lacks `Escape` key dismissal.

The worker must address these 3 specific issues before M1 can be accepted.

---

## 5. Verification Method
To independently verify this verdict:
```powershell
# Run the empirical challenger test suite across all 4 viewports
npx playwright test e2e/challenger-m1.spec.ts
```
Expected output:
- `Hard font floor >= 12px at scale M across visible text` fails with 25 element violations (9px, 10px, 11px).
- `Axe check on porcelain skin` fails with serious contrast violation on desktop-landscape when `AnalysisPanel` is visible.
- RTL layout, debounce guard, and Erase My Data pass.
