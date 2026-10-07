# M1 Iteration 2 Explorer Report: A11y, Contrast, Font Floor & Touch Ergonomics

**Agent**: `m1_iter2_explorer_2`  
**Roles**: explorer, investigator, synthesizer  
**Target Milestone**: M1 (Phase 1: Calm UI, Accessibility, Languages, Onboarding)  
**Deliverable**: Concrete technical analysis and code specifications for M1 Iteration 2 fixes  

---

## 1. Observation

### Obs 1: WCAG AA Color Contrast Failure on Porcelain Skin in `AnalysisPanel.tsx`
- **Location**: `src/components/panels/AnalysisPanel.tsx`
  - Line 172: `<span className="font-bold text-emerald-500">P2: {calcPR(matchStats.p2TotalLoss, matchStats.p2Moves)}</span>` inside container with background `#ede5d8`.
  - Line 236: `<span className={`${showWinPercent ? '' : 'hidden'} text-xs font-mono ${move.equityLoss === 0 ? 'text-emerald-500 font-semibold' : (currentSkin === 'porcelain' ? 'text-rose-800' : 'text-rose-400')}`}>`
  - Line 265: `{move.freeTurn && <span className="text-emerald-500 font-bold">[Free Turn]</span>}`
  - Line 366: `{move.freeTurn && <span className="text-emerald-500 font-bold">[Free Turn]</span>}`
  - Line 375: `<span className={move.equityLoss === 0 ? 'text-emerald-500 font-semibold' : (currentSkin === 'porcelain' ? 'text-rose-800' : 'text-rose-400')}>`
  - Line 383: `{move.freeTurn && <span className="text-emerald-500 font-bold mr-1.5">[Free Turn]</span>}`
- **Verbatim Error Output** (from `e2e/a11y.spec.ts:8` and `e2e/challenger-m1.spec.ts:32` on `desktop-landscape`):
  ```
  Element has insufficient color contrast of 2.33 (foreground color: #10b981, background color: #fef4e6, font size: 9.0pt (12px), font weight: normal). Expected contrast ratio of 4.5:1
  html: <span class="text-emerald-500 font-semibold">0.000</span>
  target: ["td:nth-child(4) > .text-emerald-500.font-semibold"]

  Element has insufficient color contrast of 2.51 (foreground color: #10b981, background color: #fffefe, font size: 9.0pt (12px), font weight: bold). Expected contrast ratio of 4.5:1
  html: <span class="text-emerald-500 font-bold mr-1.5">[Free Turn]</span>
  target: [".mr-1\\.5"]
  ```
- **Luminance & Contrast Analysis**:
  - `#10b981` (`text-emerald-500`) relative luminance $L \approx 0.395$.
  - Light cream backgrounds on porcelain skin: `#fffefe` ($L \approx 0.999$) and `#fef4e6` ($L \approx 0.916$).
  - Measured contrast: $\frac{0.999 + 0.05}{0.395 + 0.05} = 2.36:1$ to $2.51:1$, failing WCAG AA (minimum $4.5:1$).
  - Proposed token `#065f46` (`text-emerald-800`) relative luminance $L \approx 0.085$:
    - Against `#fffefe`: $\frac{0.999 + 0.05}{0.085 + 0.05} = 7.77:1$ (exceeds WCAG AAA $7.0:1$).
    - Against `#fef4e6`: $\frac{0.916 + 0.05}{0.085 + 0.05} = 7.16:1$ (exceeds WCAG AAA $7.0:1$).
    - Against `#ede5d8` ($L \approx 0.776$): $\frac{0.776 + 0.05}{0.085 + 0.05} = 6.12:1$ (exceeds WCAG AA $4.5:1$).

---

### Obs 2: Hard Font Floor (< 12px) Arbitrary Tailwind Classes
- **Requirement**: `PROJECT.md:31` ("Comfort & Typography Settings: dynamic font scaling (S/M/L/XL via CSS `--font-scale`); hard floor >= 12 px at scale M"), `ORIGINAL_REQUEST.md:48` ("Minimum font floor >= 12 px").
- **Current CSS Implementation** in `src/index.css:49-52`:
  ```css
  .text-floor {
    font-size: max(0.75rem, 12px);
    line-height: 1.25;
  }
  ```
  At default scale M (`html { font-size: calc(16px * 1.0); }`), `0.75rem = 12px`. At scale S (`0.85`), `max(0.75rem, 12px)` enforces a hard lower bound of `12px`.
- **Verbatim Error Output** (from `e2e/challenger-m1.spec.ts:108` across all viewports):
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
- **Code Locations of Font Violations**:
  1. `src/components/shell/Header.tsx`:
     - Line 40: `text-[9px]` on "Coach" badge.
  2. `src/components/shell/BottomTray.tsx`:
     - Lines 36, 47, 60, 71, 82: `text-[10px]` on "Board", "Analysis", "Coach On/Off", "Rules", "Settings".
  3. `src/components/shell/EvalGauge.tsx`:
     - Line 59: `text-[11px]` on "Live Advantage (Stones)".
     - Line 63: `text-[9px]` on "Hints Visible".
     - Line 71: `text-[11px]` on "Focus" / "Show Bar".
     - Line 92: `text-[10px]` on "Computer (Engine)" / "North (P2)".
     - Line 115: `text-[10px]` on "South: ..." and "North: ...".
     - Line 119: `text-[9px]` on "Even Match" / "... Ahead".
     - Line 147: `text-[9px]` on "PR: ... blunders)".
     - Line 156: `text-[10px]` on "South (P1)".
     - Line 185: `text-[10px]` on collapsed focus ribbon "PR: ...".
  4. `src/components/modals/TutorialModal.tsx`:
     - Line 157: `text-[10px]` on "N-STORE".
     - Line 159: `text-[9px]` on "P2".
     - Line 171: `text-[10px]` on "P{pit-3}".
     - Line 193: `text-[10px]` on "Pit {pit+1}".
     - Line 206: `text-[10px]` on "YOURS".
     - Line 208: `text-[9px]` on "P1".
  5. `src/components/panels/PVDisplay.tsx`:
     - Line 31: `text-[10px]` on container "PV: ...".
     - Line 42: `text-[9px]` on badge "+{remainingCount}".
  6. `src/components/panels/PVSheet.tsx`:
     - Line 98: `text-[10px]` on step number.
     - Line 105: `text-[11px]` on "Player 1" / "Player 2".
  7. `src/components/panels/CoachPanel.tsx`:
     - Line 53: `text-[10px]` on alert pill.
     - Line 66: `text-[11px]` on equity sacrifice subtitle.
     - Line 135: `text-[10px]` on hint caption.
     - Lines 149, 153, 160, 164, 171, 175: `text-[11px]` on tactical breakdown headings and bodies.
  8. `src/components/modals/DiagnosticsModal.tsx`:
     - Lines 55, 59, 62: `text-[10px]` on category, PASS badge, and duration.
     - Line 70: `text-[11px]` on footer description.
  9. `src/components/modals/AudiencePickerModal.tsx`:
     - Line 138: `text-[10px]` on audience preset badges.

---

### Obs 3: `PitButton.tsx` Touch Ergonomics & Timer Cleanup
- **Location**: `src/components/board/PitButton.tsx:60-112`
- **Timer Cleanup**:
  - Line 60: `const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);`
  - In `handleTouchStart` (line 71), `setTimeout(..., 350)` is scheduled.
  - While timer cancellation exists in `handleTouchMove`, `handleTouchEnd`, and `handleTouchCancel`, there is **no `useEffect` cleanup on unmount**. If the component unmounts mid-timer (e.g. game reset, mode change, board transition), `onHover()` fires on an unmounted component.
- **Touch Event Duplicate Dispatch**:
  - In `handleTouchEnd` (lines 100-111):
    ```tsx
    if (tapTwice) {
      e.preventDefault();
      if (hoverPreview && hoverPreview.pit === pitIndex) {
        onLeave();
        onClick();
      } else {
        onHover();
      }
    } else {
      onLeave();
      onClick();
    }
    ```
  - When `tapTwice` is `false` (default mode), `handleTouchEnd` calls `onClick()`, but **does NOT call `e.preventDefault()`**.
  - On mobile browsers (Safari iOS and Chrome Android), failing to call `e.preventDefault()` in `touchend` causes the browser to synthesize mouse events (`mousemove` -> `mousedown` -> `mouseup` -> `click`) ~300ms later.
  - Because `PitButton` also has `onClick={onClick}`, this causes a duplicate synthetic `click` event to be dispatched. If state has mutated or a new pit element aligns under the tap position, the second synthetic click can trigger unintended moves or state desync.

---

### Obs 4: `DiagnosticsModal.tsx` Keyboard Navigation & Focus Trapping
- **Location**: `src/components/modals/DiagnosticsModal.tsx:18-82`
- **Defects Observed**:
  1. No `Escape` key event listener: pressing `Escape` does nothing, leaving keyboard users permanently trapped in the modal overlay.
  2. No focus trapping: pressing `Tab` cycles outside the modal into background elements.
  3. Missing standard dialog accessibility semantics: outer wrapper lacks `role="dialog"`, `aria-modal="true"`, and `aria-labelledby`.
  4. Backdrop clicks do not dismiss the modal (unlike `TutorialModal.tsx` and `HighlightLegendModal.tsx`).

---

## 2. Logic Chain

1. **Porcelain Contrast (Obs 1)**:
   - Axe-core tests evaluate WCAG 2.1 AA criterion 1.4.3 (Contrast Minimum), requiring normal text (<18pt or <14pt bold) to have $\ge 4.5:1$ contrast against its effective background.
   - On `walnut` and `obsidian` skins, backgrounds are dark (`#1f140e`, `#12131a`), making `#10b981` contrast $\ge 5.8:1$.
   - On `porcelain` skin, backgrounds are light cream (`#fef4e6`, `#fffefe`). `#10b981` yields only $2.33:1$ to $2.51:1$.
   - Replacing `#10b981` with `currentSkin === 'porcelain' ? 'text-emerald-800' : 'text-emerald-500'` for `0.000`, `[Free Turn]`, and session accuracy text changes foreground color on porcelain to `#065f46`, which has a luminance of $0.085$ and produces a contrast ratio of $\ge 7.16:1$, resolving all Axe violations with zero risk of regression on other skins.

2. **Font Floor $\ge 12$px at Scale M (Obs 2)**:
   - `e2e/challenger-m1.spec.ts` walks all visible DOM text nodes and asserts `parseFloat(window.getComputedStyle(element).fontSize) >= 11.95`.
   - Arbitrary classes `text-[9px]`, `text-[10px]`, and `text-[11px]` output static CSS `font-size: 9px;`, `10px;`, and `11px;`, which directly fail this assertion.
   - Replacing these arbitrary classes with `text-floor text-xs` causes them to use `font-size: max(0.75rem, 12px);`. At scale M (`1.0`), $0.75\text{rem} = 12\text{px}$, which passes the $\ge 11.95\text{px}$ floor assertion. Furthermore, at scale S (`0.85`), `max(0.75rem, 12px)` prevents the font size from dropping below 12px, ensuring persistent compliance.

3. **Touch Ergonomics & Unmount Cleanup (Obs 3)**:
   - Asynchronous timer `longPressTimerRef` must have an unmount cleanup effect:
     ```tsx
     useEffect(() => () => { if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current); }, []);
     ```
   - In `handleTouchEnd`, calling `e.preventDefault()` before `onClick()` suppresses W3C touch-to-mouse event emulation (synthetic click generation), preventing double execution on mobile devices while retaining standard mouse click functionality for desktop users via `onClick={onClick}`.

4. **DiagnosticsModal Accessibility (Obs 4)**:
   - `src/lib/a11y.ts` exports `trapFocus(container: HTMLElement, e: KeyboardEvent, onClose: () => void)`, which handles both `Escape` dismissal and cyclic Tab/Shift+Tab trapping.
   - Wiring `trapFocus` with `modalRef` in `DiagnosticsModal.tsx` brings it into 1:1 compliance with `RulesModal`, `HighlightLegendModal`, and `TutorialModal`.

---

## 3. Caveats

- **Scope Boundary**: This investigation is read-only. No changes were applied directly to production files.
- **Font Floor Scope**: The primary violations reported by `challenger-m1.spec.ts` were in `BottomTray.tsx`, `EvalGauge.tsx`, and `Header.tsx` on the default screen. However, to achieve complete system-wide compliance, this report specifies fixes across all 9 components that contained arbitrary sub-12px Tailwind classes (`Header`, `BottomTray`, `EvalGauge`, `TutorialModal`, `PVDisplay`, `PVSheet`, `CoachPanel`, `DiagnosticsModal`, `AudiencePickerModal`).
- **No Invalidation Conditions**: Replacing `text-emerald-500` with a skin-aware condition has zero side effects on existing test logic, gameplay state, or non-porcelain themes.

---

## 4. Conclusion & Concrete Code Specifications

The issues identified in M1 Iteration 1 are fully scoped and have deterministic, low-risk solutions. Below are the precise code specifications for the implementing agent.

---

### Specification 1: WCAG AA Contrast in `src/components/panels/AnalysisPanel.tsx`

#### Change 1.1: Session Accuracy Banner (Line 172)
```tsx
// BEFORE (line 172)
<span className="font-bold text-emerald-500">P2: {calcPR(matchStats.p2TotalLoss, matchStats.p2Moves)}</span>

// AFTER
<span className={`font-bold ${currentSkin === 'porcelain' ? 'text-emerald-800' : 'text-emerald-500'}`}>P2: {calcPR(matchStats.p2TotalLoss, matchStats.p2Moves)}</span>
```

#### Change 1.2: Mobile Card Equity Loss / Zero Loss (Line 236-238)
```tsx
// BEFORE (line 236-238)
<span className={`${showWinPercent ? '' : 'hidden'} text-xs font-mono ${move.equityLoss === 0 ? 'text-emerald-500 font-semibold' : (currentSkin === 'porcelain' ? 'text-rose-800' : 'text-rose-400')}`}>
  {move.equityLoss === 0 ? '0.0%' : `-${(move.equityLoss * 100).toFixed(1)}%`}
</span>

// AFTER
<span className={`${showWinPercent ? '' : 'hidden'} text-xs font-mono ${move.equityLoss === 0 ? (currentSkin === 'porcelain' ? 'text-emerald-800 font-semibold' : 'text-emerald-500 font-semibold') : (currentSkin === 'porcelain' ? 'text-rose-800' : 'text-rose-400')}`}>
  {move.equityLoss === 0 ? '0.0%' : `-${(move.equityLoss * 100).toFixed(1)}%`}
</span>
```

#### Change 1.3: Mobile Card [Free Turn] Badge (Line 265)
```tsx
// BEFORE (line 265)
{move.freeTurn && <span className="text-emerald-500 font-bold">[Free Turn]</span>}

// AFTER
{move.freeTurn && <span className={`${currentSkin === 'porcelain' ? 'text-emerald-800' : 'text-emerald-500'} font-bold`}>[Free Turn]</span>}
```

#### Change 1.4: Desktop Table Summary Row [Free Turn] Badge (Line 366)
```tsx
// BEFORE (line 366)
{move.freeTurn && <span className="text-emerald-500 font-bold">[Free Turn]</span>}

// AFTER
{move.freeTurn && <span className={`${currentSkin === 'porcelain' ? 'text-emerald-800' : 'text-emerald-500'} font-bold`}>[Free Turn]</span>}
```

#### Change 1.5: Desktop Table Equity Diff Column (Lines 375-377)
```tsx
// BEFORE (line 375-377)
<td className={`${showWinPercent ? '' : 'hidden'} py-2.5 px-2`}>
  <span className={move.equityLoss === 0 ? 'text-emerald-500 font-semibold' : (currentSkin === 'porcelain' ? 'text-rose-800' : 'text-rose-400')}>
    {move.equityLoss === 0 ? '0.000' : `-${(move.equityLoss * 100).toFixed(1)}%`}
  </span>
</td>

// AFTER
<td className={`${showWinPercent ? '' : 'hidden'} py-2.5 px-2`}>
  <span className={move.equityLoss === 0 ? (currentSkin === 'porcelain' ? 'text-emerald-800 font-semibold' : 'text-emerald-500 font-semibold') : (currentSkin === 'porcelain' ? 'text-rose-800' : 'text-rose-400')}>
    {move.equityLoss === 0 ? '0.000' : `-${(move.equityLoss * 100).toFixed(1)}%`}
  </span>
</td>
```

#### Change 1.6: Desktop Table Bonus Column [Free Turn] Badge (Line 383)
```tsx
// BEFORE (line 383)
<td className={`py-2.5 px-2 hidden sm:table-cell text-xs ${theme.cardTextMuted}`}>
  {move.freeTurn && <span className="text-emerald-500 font-bold mr-1.5">[Free Turn]</span>}
  {move.captures > 0 && <span className="text-amber-500 font-bold mr-1.5">[+{move.captures} Cap]</span>}
  {showMainLine && <PVDisplay pv={move.pv} moveLabel={move.label} themeSkin={currentSkin} layout={layout} />}
</td>

// AFTER
<td className={`py-2.5 px-2 hidden sm:table-cell text-xs ${theme.cardTextMuted}`}>
  {move.freeTurn && <span className={`${currentSkin === 'porcelain' ? 'text-emerald-800' : 'text-emerald-500'} font-bold mr-1.5`}>[Free Turn]</span>}
  {move.captures > 0 && <span className="text-amber-500 font-bold mr-1.5">[+{move.captures} Cap]</span>}
  {showMainLine && <PVDisplay pv={move.pv} moveLabel={move.label} themeSkin={currentSkin} layout={layout} />}
</td>
```

#### Change 1.7: Tactical Accordion Heading on Porcelain (Lines 304 & 430)
```tsx
// In mobile card explanation (line 304):
<div className={`text-xs font-bold uppercase ${currentSkin === 'porcelain' ? 'text-emerald-900' : 'text-emerald-400'}`}>Why {analysisResults[0]?.label || 'Best Move'} is better</div>

// In desktop table accordion explanation (line 430):
<div className={`text-xs font-bold uppercase ${currentSkin === 'porcelain' ? 'text-emerald-900' : 'text-emerald-400'}`}>Why {analysisResults[0]?.label || 'Best Move'} is better</div>
```

---

### Specification 2: Hard Font Floor $\ge 12$px at Scale M

#### 2.1 `src/components/shell/BottomTray.tsx`
Replace `text-[10px]` with `text-floor text-xs`:
```tsx
// Line 36
<span className="text-floor text-xs font-semibold mt-0.5">Board</span>

// Line 47
<span className="text-floor text-xs font-semibold mt-0.5">Analysis</span>

// Line 60
<span className="text-floor text-xs font-semibold mt-0.5">{tutorMode ? "Coach On" : "Coach Off"}</span>

// Line 71
<span className="text-floor text-xs font-semibold mt-0.5">Rules</span>

// Line 82
<span className="text-floor text-xs font-semibold mt-0.5">Settings</span>
```

#### 2.2 `src/components/shell/Header.tsx`
```tsx
// Line 40
<span className={`text-floor text-xs uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-full border ${
  currentSkin === 'porcelain'
    ? 'bg-[#eee7dc] text-[#5e5346] border-[#d8cfbe]'
    : currentSkin === 'walnut'
    ? 'bg-[#2a1a12] text-amber-300/90 border-[#4a2e1d]'
    : 'bg-[#151722] text-sky-300 border-[#2b3042]'
}`}>
  Coach
</span>
```

#### 2.3 `src/components/shell/EvalGauge.tsx`
```tsx
// Line 59
<span className="text-floor text-xs font-bold tracking-tight opacity-75">
  Live Advantage (Stones)
</span>

// Line 63
<span className="text-floor text-xs font-bold px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
  Hints Visible
</span>

// Line 71
className={`flex items-center space-x-1 text-floor text-xs font-semibold px-2 py-0.5 rounded-lg transition ${theme.cardTextMuted} hover:opacity-100`}

// Line 92
<div className={`text-floor text-xs font-semibold flex items-center gap-1 ${theme.cardTextMuted}`}>

// Line 115
<div className="flex justify-between text-floor text-xs font-semibold">

// Line 119
<span className={`text-floor text-xs font-mono ${theme.cardTextMuted}`}>

// Line 147
<div className={`${showErrorRate ? 'flex' : 'hidden'} justify-between text-floor text-xs font-mono ${theme.cardTextMuted}`}>

// Line 156
<div className={`text-floor text-xs font-semibold flex items-center justify-start sm:justify-end gap-1 ${theme.cardTextMuted}`}>

// Line 185
<span className={`text-floor text-xs font-mono ${theme.cardTextMuted}`}>
```

#### 2.4 `src/components/modals/TutorialModal.tsx`
```tsx
// Line 157
<span className="text-floor text-xs font-mono font-bold text-slate-400">N-STORE</span>

// Line 159
<span className="text-floor text-xs text-slate-500 font-mono">P2</span>

// Line 171
<span className="text-floor text-xs font-mono text-slate-400">P{pit - 3}</span>

// Line 193
<span className="text-floor text-xs font-mono font-bold text-amber-300">Pit {pit + 1}</span>

// Line 206
<span className="text-floor text-xs font-mono font-bold text-amber-400">YOURS</span>

// Line 208
<span className="text-floor text-xs text-amber-400/80 font-mono">P1</span>
```

#### 2.5 `src/components/panels/PVDisplay.tsx`
```tsx
// Line 31
className="inline-flex items-center gap-1 max-w-full font-mono text-floor text-xs cursor-pointer group"

// Line 42
<span className="shrink-0 px-1 py-0.5 rounded bg-amber-500/20 text-amber-300 text-floor text-xs font-semibold border border-amber-500/30">
  +{remainingCount}
</span>
```

#### 2.6 `src/components/panels/PVSheet.tsx`
```tsx
// Line 98
<span className="w-5 h-5 rounded-full bg-zinc-700/80 flex items-center justify-center text-floor text-xs text-zinc-300">
  {idx + 1}
</span>

// Line 105
<span className="text-floor text-xs text-zinc-400">
```

#### 2.7 `src/components/panels/CoachPanel.tsx`
```tsx
// Line 53
<span className={`text-floor text-xs px-2 py-0.5 rounded-full font-bold border flex items-center gap-1 ...`}>

// Line 66
<div className="text-floor text-xs opacity-80 font-mono mt-0.5">

// Line 135
<span className="text-floor text-xs opacity-70 font-mono hidden sm:inline">

// Lines 149, 153, 160, 164, 171, 175
// Replace text-[11px] with text-floor text-xs
```

#### 2.8 `src/components/modals/DiagnosticsModal.tsx`
```tsx
// Line 55
<div className="text-floor text-xs text-slate-500">{item.category}</div>

// Line 59
<span className="px-2 py-0.5 rounded text-floor text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">

// Line 62
<span className="text-floor text-xs text-slate-400">{item.duration}</span>

// Line 70
<span className="text-floor text-xs text-slate-400">Zero-Leak Conservation & Solver Invariants</span>
```

#### 2.9 `src/components/modals/AudiencePickerModal.tsx`
```tsx
// Line 138
<span className="text-floor text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-white/10 text-slate-300">
```

---

### Specification 3: `src/components/board/PitButton.tsx` Touch Ergonomics & Timer Cleanup

#### Change 3.1: Add `useEffect` Unmount Cleanup for `longPressTimerRef`
Ensure `useEffect` is imported from `'react'`:
```tsx
import React, { useRef, useEffect } from 'react';
```
Add timer unmount cleanup hook directly after ref declarations:
```tsx
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const didLongPressFireRef = useRef(false);

  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    };
  }, []);
```

#### Change 3.2: Add `e.preventDefault()` on Normal Taps in `handleTouchEnd`
In `handleTouchEnd`:
```tsx
// BEFORE (lines 108-111)
    } else {
      onLeave();
      onClick();
    }

// AFTER
    } else {
      e.preventDefault();
      onLeave();
      onClick();
    }
```
This guarantees mobile touch events do not emit duplicate synthetic click events, while standard desktop mouse interaction via `onClick={onClick}` is preserved.

---

### Specification 4: `src/components/modals/DiagnosticsModal.tsx` Keyboard Navigation

Replace `src/components/modals/DiagnosticsModal.tsx` with a focus-trapped, accessible implementation:
```tsx
import React, { useEffect, useRef } from 'react';
import { ShieldCheck, X, CheckCircle2 } from 'lucide-react';
import { DiagnosticResult } from '../../preflight-diagnostics';
import { trapFocus } from '../../lib/a11y';

interface DiagnosticsModalProps {
  results: DiagnosticResult[];
  isRunning: boolean;
  onRun: () => void;
  onClose: () => void;
}

export const DiagnosticsModal: React.FC<DiagnosticsModalProps> = ({
  results,
  isRunning,
  onRun,
  onClose
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (modalRef.current) {
        trapFocus(modalRef.current, e, onClose);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="diagnostics-modal-title"
      data-testid="diagnostics-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
        className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden text-slate-100"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h3 id="diagnostics-modal-title" className="font-bold text-sm sm:text-base">
              Pre-Flight Diagnostic Suite
            </h3>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 sm:p-5 overflow-y-auto flex flex-col gap-2.5 font-mono text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-slate-400">
            <span>Total Tests: {results.length}</span>
            <span className="text-emerald-400 font-bold">
              Passed: {results.filter(r => r.status === 'PASS').length} / {results.length}
            </span>
          </div>

          <div className="divide-y divide-slate-800/80">
            {results.map((item, i) => (
              <div key={i} className="py-2.5 flex items-center justify-between gap-2">
                <div className="flex items-center space-x-2 min-w-0">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div className="truncate">
                    <div className="font-semibold text-slate-200 truncate">{item.name}</div>
                    <div className="text-floor text-xs text-slate-500">{item.category}</div>
                  </div>
                </div>
                <div className="flex items-center space-x-2 shrink-0">
                  <span className="px-2 py-0.5 rounded text-floor text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {item.status}
                  </span>
                  <span className="text-floor text-xs text-slate-400">{item.duration}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="px-5 py-3.5 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <span className="text-floor text-xs text-slate-400">Zero-Leak Conservation & Solver Invariants</span>
          <button
            onClick={onRun}
            disabled={isRunning}
            className="px-3.5 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-semibold shadow-md transition disabled:opacity-50"
          >
            {isRunning ? "Running..." : "Re-run"}
          </button>
        </div>
      </div>
    </div>
  );
};
```

---

## 5. Verification Method

Once the implementer applies the specifications above, independently verify using the following commands:

1. **TypeScript Typecheck**:
   ```bash
   npx tsc --noEmit
   ```
   *Expected*: Exit code 0, 0 diagnostic errors.

2. **Unit & Fuzz Suite**:
   ```bash
   npm test
   ```
   *Expected*: All 16 test files pass (152 tests, 0 failures).

3. **Targeted Porcelain Skin Axe Audit**:
   ```bash
   npx playwright test e2e/a11y.spec.ts --project=desktop-landscape
   ```
   *Expected*: 0 critical, 0 serious Axe accessibility violations on `porcelain` skin (specifically verifying that the previous contrast failure at `0.000` and `[Free Turn]` is resolved).

4. **Empirical Challenger Suite Across All 4 Viewports**:
   ```bash
   npx playwright test e2e/challenger-m1.spec.ts
   ```
   *Expected*: 48/48 tests pass cleanly across `mobile-small`, `mobile-iphone`, `tablet-portrait`, and `desktop-landscape`:
   - `Hard font floor >= 12px at scale M across visible text`: 0 violations.
   - `Axe check on skin "porcelain" has ZERO critical and ZERO serious violations`: passes.
   - Diagnostics modal dismisses on `Escape` key without remaining open.

5. **Full Playwright Regression Matrix**:
   ```bash
   npx playwright test
   ```
   *Expected*: 100% pass across all E2E test suites.
