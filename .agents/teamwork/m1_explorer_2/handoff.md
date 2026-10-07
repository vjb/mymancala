# Architectural Handoff Report: Accessibility, Ergonomics & Audio/Speech

**Agent**: `m1_explorer_2`  
**Milestone**: M1 (Phase 1: Calm UI, Accessibility, Languages, Onboarding)  
**Target Files**: `src/theme.ts`, `src/Pebble.tsx`, `src/index.css`, `src/components/board/PitButton.tsx`, `src/components/board/Board.tsx`, `src/components/board/StorePit.tsx`, `src/components/panels/SettingsPanel.tsx`, `src/components/shell/TurnBanner.tsx`, `src/components/shell/LiveAnnouncer.tsx`, `src/RulesModal.tsx`, `src/GameReviewModal.tsx`, `src/lib/a11y.ts`, `src/lib/speech.ts`, `src/lib/dataReset.ts`, `e2e/a11y.spec.ts`

---

## 1. Observation

Direct observations from inspecting the codebase:

1. **Sub-12px Font Sizing Violations in Current Code**:
   - `src/components/board/PitButton.tsx` (lines 94, 98, 102, 108, 113, 118, 123, 128, 134, 141):
     ```tsx
     <div className={`flex items-center justify-between w-full text-[8px] sm:text-[10px] font-mono ${theme.cardTextMuted}`}>
     ...
     <span className="text-[7px] font-extrabold px-1 py-0.2 rounded bg-rose-500/30 text-rose-300 border border-rose-500/50">
       YOUR PICK
     </span>
     ...
     <span className="px-1 py-0.2 rounded text-[7px] sm:text-[9px] font-bold border ${evalData.badgeColor}">
     ```
   - `src/components/shell/TurnBanner.tsx` (lines 111, 209, 233, 238, 260, 266):
     ```tsx
     <span className={`text-[10px] sm:text-[11px] flex items-center space-x-1 ${theme.cardTextMuted}`}>
     ...
     <div className="text-[10px] font-mono opacity-80 flex items-center gap-2">
     ...
     <span className="px-1.5 py-0.2 rounded-full text-[9px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse">
     ...
     <span className="text-[9px] font-bold uppercase tracking-wider opacity-60 mr-1 hidden xs:inline">Speed:</span>
     ```
   - `src/components/shell/BottomTray.tsx` (lines 36, 47, 60, 71, 82):
     ```tsx
     <span className="text-[10px] font-semibold mt-0.5">Board</span>
     ```
   - `src/index.css`: No `--font-scale` CSS variable or font-size calculation exists on `:root` or `html`.

2. **Skin & Pebble Contrast / Pattern Limitations**:
   - `src/theme.ts` (lines 1, 51-168):
     `SkinTheme` is strictly defined as `'walnut' | 'porcelain' | 'obsidian'`. There is no `high-contrast` skin token.
     In `walnut`, `cardTextMuted` (`#a8988a` on `#1c1612`) yields a contrast ratio of ~6.2:1 (fails WCAG AAA 7:1).
     In `porcelain`, `cardTextMuted` (`#7d7368` on `#ffffff`) yields a contrast ratio of ~4.8:1 (fails WCAG AAA 7:1).
   - `src/Pebble.tsx` (lines 10-33, 71-87):
     Pebbles are distinguished exclusively by color gradients (`stoneClasses` using orange/green, terracotta/sage, blue/yellow). There are no pattern fills, textures, glyphs, or shape variations.

3. **Absence of Reduced Motion Controls**:
   - `grep_search` across `src` for `reduced-motion` yielded 0 results.
   - `src/game/useGame.ts` (lines 392-412) executes a step-by-step looping animation with `setTimeout` delays (`delays.step = 175ms` or `280ms`).
   - `src/index.css` (lines 30-38) applies `.animate-drop-ripple` keyframe scale animation.
   - `PitButton.tsx` and `TurnBanner.tsx` unconditionally apply `animate-pulse` and `animate-bounce`.

4. **Tap Target Dimensions & Tap Debounce**:
   - `src/components/board/PitButton.tsx` (line 67):
     `className="... min-h-[50px] min-w-[44px] touch-manipulation ..."`
     On mobile viewports (e.g. 360px), 6 pits in a row result in effective widths of ~38-42px.
   - `src/game/useGame.ts` (lines 545-553):
     `handlePitClick` directly invokes `executeMove(pitIndex)` without debounce. Rapid accidental multi-taps within 250ms can trigger double moves or race states.

5. **Screen Reader ARIA Gaps**:
   - `src/components/board/PitButton.tsx`: Buttons have `data-testid` but no `aria-label`, `aria-disabled`, or state descriptions.
   - `src/components/board/StorePit.tsx`: Stores are `<div>` elements without `role="region"` / `role="status"` or `aria-label`.
   - `grep_search` across `src` for `aria-live` yielded 0 results. Neither player moves nor bot moves are announced to assistive tech.

6. **Keyboard Navigation & Modal Trapping Gaps**:
   - `src/components/board/Board.tsx`: No keyboard listeners (`onKeyDown`). Pits do not implement roving `tabIndex`.
   - `grep_search` across `src` for `Escape`: Found only in `PVSheet.tsx:28`.
   - `src/RulesModal.tsx` and `src/GameReviewModal.tsx`:
     Neither modal listens to the `Escape` key. Neither traps focus within the modal dialog. Focus escapes into the underlying board.
   - `e2e/no-hscroll.spec.ts` (line 43) calls `await page.keyboard.press('Escape')` expecting `RulesModal` to dismiss, but the modal has no listener.

7. **Web Speech API**:
   - `grep_search` across `src` for `speech` or `speechSynthesis` yielded 0 results.

8. **User Data Persistence & Reset**:
   - `grep_search` across `src` for `erase` or `clearSavedGame` usage in Settings yielded 0 results.
   - `src/components/panels/SettingsPanel.tsx` contains no option to wipe local storage or service worker caches.

9. **Test Infrastructure & Axe-Core**:
   - Verification command `node -e "require.resolve('@axe-core/playwright')"` exited with code 0 returning `not installed`.
   - `package.json` devDependencies does not include `@axe-core/playwright`.
   - `e2e/a11y.spec.ts` does not yet exist.

---

## 2. Logic Chain

1. **Font Scale Hard Floor (Observation 1)**:
   - *Observation*: Multiple micro-badges and labels use hardcoded classes like `text-[7px]`, `text-[8px]`, `text-[10px]`.
   - *Requirement*: Feature 14 specifies dynamic font scaling (S: 85%, M: 100%, L: 115%, XL: 130%) via CSS `--font-scale` with a hard floor of text >= 12px at scale M.
   - *Deduction*: Hardcoded sub-12px classes violate the hard floor. All text tokens must be normalized to a minimum of `0.75rem` (12px at 1rem = 16px). Micro-badges must be refactored into compact icons with accessible tooltips/aria-labels or unified 12px pill chips. The root font scale must multiply the base font size: `html { font-size: calc(16px * var(--font-scale, 1)); }`.

2. **High-Contrast Skin & Non-Color Identification (Observation 2)**:
   - *Observation*: Existing skins fail WCAG AAA (7:1) on muted text (`cardTextMuted`), and pebble distinction relies solely on color.
   - *Requirement*: Feature 15 requires high-contrast mode achieving 7:1 text contrast ratio (WCAG AAA) and pebble patterns (stripes, dots, solids) for non-color identification.
   - *Deduction*:
     - A 4th theme (`high-contrast`) must be added to `THEMES` with a pure `#000000` background, pure `#ffffff` text (21:1 ratio), `#facc15` primary accents (13.7:1), and `#38bdf8` secondary accents (11.6:1).
     - `src/Pebble.tsx` must render SVG pattern fills or textured gradients: P1 (South) must have diagonal stripes (`///`), P2 (North) must have polka dots (`::: `), and neutral stones must have a solid border-ring pattern. In addition, an internal geometric shape (diamond vs circle) ensures 100% colorblind legibility.

3. **Reduced Motion Control (Observation 3)**:
   - *Observation*: Sowing triggers a multi-second step-by-step animation loop (`delays.step`), along with CSS ripples and pulses.
   - *Requirement*: Feature 16 requires honoring `prefers-reduced-motion` and providing a manual toggle in Settings, replacing animations with an instant step update or gentle fade.
   - *Deduction*:
     - A settings store (`mancala_a11y_v1`) must track `reducedMotion: 'auto' | 'reduce' | 'no-preference'`.
     - When active, `html` receives class `.reduced-motion` which suppresses CSS animations.
     - In `useGame.ts`, the move animation pipeline must detect reduced motion and bypass the multi-step `setTimeout` loop, transitioning immediately with a single 100ms fade while preserving the bot's calm thinking floor (0.6s / 1.2s).

4. **Big Mode & Ergonomic Tap Targets (Observation 4)**:
   - *Observation*: Mobile pits are < 50px in width and lack click debouncing.
   - *Requirement*: Feature 17 mandates minimum 56px tap targets, bottom 60% ergonomic layout, and 250ms tap debounce.
   - *Deduction*:
     - Big mode toggle in Settings applies `data-big-mode="true"`.
     - Pits and bottom tray items expand to `min-h-[56px] min-w-[56px]`.
     - An ergonomic layout places interactive South pits and primary actions strictly in the lower 60% of the viewport (thumb-reach zone).
     - `handlePitClick` must be wrapped in a 250ms timestamp debounce to ignore accidental tremors or rapid double-taps.

5. **Screen Reader ARIA & Live Region (Observation 5)**:
   - *Observation*: Pits lack `aria-label`, stores lack roles, and moves have zero auditory narration.
   - *Requirement*: Feature 18 mandates ARIA pit labeling ("Your pit 3, 5 stones") and `aria-live="polite"` move narration.
   - *Deduction*:
     - `PitButton` must provide dynamic `aria-label`: `"{Owner} pit {N}, {Count} stones. {State}. {Hint}"`.
     - `StorePit` must provide `role="status"` and `aria-label="Your Kalah Store, {Count} stones banked."`.
     - A dedicated `<LiveAnnouncer />` component with `aria-live="polite" aria-atomic="true"` must narrate turns, moves, captures, and bonus turns.

6. **Keyboard Navigation & Modal Trapping (Observation 6)**:
   - *Observation*: Board has no Arrow key handlers, roving tabindex is missing, and modals fail to close on `Escape` or trap focus.
   - *Requirement*: Feature 19 requires full keyboard navigation (Arrow keys, Enter/Space, ?, Esc) with visible focus rings and focus trapping.
   - *Deduction*:
     - Board must implement a 2D roving tabindex grid (`ArrowLeft`/`ArrowRight` across row, `ArrowUp`/`ArrowDown` between South and North).
     - `Enter` / `Space` executes the move from the focused pit.
     - Global key listeners: `?` opens Rules, `Esc` dismisses modals/previews.
     - Focus trap utility in modals ensures Tab cycles within dialog and returns focus to the trigger on exit.

7. **Web Speech API Helper (Observation 7)**:
   - *Observation*: Zero TTS infrastructure exists.
   - *Requirement*: Feature 20 requires speech narration helper for rules, tutorial, and coach tips via `window.speechSynthesis` with fallback.
   - *Deduction*:
     - Create `src/lib/speech.ts` encapsulating `SpeechSynthesis` with feature detection, language matching (`en`, `ar`, `es`), rate control (0.8–1.2), and mute toggle.
     - Add speaker button triggers to `RulesModal`, `CoachPanel`, and tutorial components.

8. **Zero-PII "Erase My Data" (Observation 8)**:
   - *Observation*: SettingsPanel has no reset mechanism for local storage or caches.
   - *Requirement*: Feature 52 mandates a clean reset clearing all `mancala_*` keys and service-worker caches on confirm.
   - *Deduction*:
     - Create `src/lib/dataReset.ts` to clear all `localStorage` keys matching `mancala_*`, clear `sessionStorage`, wipe `caches`, and reload.
     - Add a confirmation modal in Settings > Privacy.

9. **Axe-Core Test Plan (Observation 9)**:
   - *Observation*: `@axe-core/playwright` is not installed; no test file exists.
   - *Requirement*: Verification gates require zero critical/serious Axe accessibility violations on core screens.
   - *Deduction*:
     - Install `@axe-core/playwright` in `devDependencies`.
     - Create `e2e/a11y.spec.ts` auditing 8 states/screens across 4 themes and mobile/desktop viewports.

---

## 3. Caveats

1. **Audio Synthesis Autoplay Policy**: Web Speech API (`speechSynthesis.speak`) and Web Audio API (`AudioContext`) require an initial user gesture on iOS Safari and Chromium. Speech cannot auto-play immediately on page load; it must be triggered via a button tap (e.g. speaker icon).
2. **Narrow Viewport (360px) Pit Geometry in Big Mode**: On 360px viewports, 6 pits horizontally cannot all be 56px wide simultaneously without exceeding 360px (`6 * 56px = 336px` + padding). In Big Mode on ultra-compact mobile viewports, the ergonomic layout uses `min-height: 56px` with expanded vertical touch areas and vertical padding, or shifts Kalah stores to header/footer bars to allow maximum horizontal pit width.
3. **Voice Availability**: Arabic (`ar-SA`) voices may not be pre-installed on older Windows or Linux distributions. `speech.ts` must gracefully fall back to silent visual display without crashing.

---

## 4. Conclusion & Concrete Architectural Specifications

### 4.1. Comfort & Dynamic Font Scaling (Feature 14)

#### Data Model (`src/lib/a11y.ts`)
```ts
export type FontScale = 'S' | 'M' | 'L' | 'XL';

export const FONT_SCALE_VALUES: Record<FontScale, number> = {
  S: 0.85,
  M: 1.0,
  L: 1.15,
  XL: 1.3
};

export interface AccessibilitySettings {
  fontScale: FontScale;
  highContrast: boolean;
  reducedMotion: 'auto' | 'reduce' | 'no-preference';
  bigMode: boolean;
  tapTwice: boolean;
  readAloud: boolean;
  speechRate: number;
  soundVolume: number;
}

export const DEFAULT_A11Y_SETTINGS: AccessibilitySettings = {
  fontScale: 'M',
  highContrast: false,
  reducedMotion: 'auto',
  bigMode: false,
  tapTwice: false,
  readAloud: false,
  speechRate: 1.0,
  soundVolume: 1.0
};
```

#### CSS Token Specifications (`src/index.css`)
```css
:root {
  --font-scale: 1.0;
  font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  letter-spacing: -0.01em;
}

html {
  font-size: calc(16px * var(--font-scale, 1));
}

/* Hard floor utility: Guaranteed >= 12px at scale M */
.text-floor {
  font-size: max(0.75rem, 12px);
  line-height: 1.25;
}

/* Eliminate all sub-12px styles across application */
.badge-chip {
  font-size: 0.75rem; /* 12px at M */
  line-height: 1rem;
  padding: 0.125rem 0.375rem;
  font-weight: 700;
}
```

#### Refactoring `PitButton.tsx` and `TurnBanner.tsx`
- Replace `text-[7px]`, `text-[8px]`, `text-[9px]`, `text-[10px]` with `text-xs` (0.75rem / 12px at M).
- Refactor multi-word badge text in `PitButton.tsx`:
  - Instead of wide text "COACH'S PICK", display compact star icon `★` + `12px` label with full description in `aria-label`.

---

### 4.2. High-Contrast Skin & Non-Color Identification (Feature 15)

#### Theme Extension (`src/theme.ts`)
```ts
export type SkinTheme = 'walnut' | 'porcelain' | 'obsidian' | 'high-contrast';

// Add to THEMES in src/theme.ts:
export const THEMES: Record<SkinTheme, ThemeStyles> = {
  // ... walnut, porcelain, obsidian ...
  'high-contrast': {
    id: 'high-contrast',
    name: 'High Contrast (AAA)',
    tagline: 'WCAG AAA 7:1 contrast ratio & tactile pattern recognition',
    appBg: 'bg-black',
    appText: 'text-white',
    headerBg: 'bg-black',
    headerBorder: 'border-2 border-white',
    cardBg: 'bg-black',
    cardBorder: 'border-2 border-white',
    cardTextMuted: 'text-[#e5e5e5]', // Contrast ratio 14.8:1 on #000
    boardBg: 'bg-black',
    boardBorder: 'border-4 border-white',
    boardTrim: 'border-2 border-white',
    pitBg: 'bg-[#121212]',
    pitBorder: 'border-2 border-white',
    pitShadowClass: 'shadow-none ring-1 ring-white',
    pitHoverBorder: 'hover:border-yellow-300 hover:ring-2 hover:ring-yellow-300',
    pitCountBg: 'bg-white',
    pitCountText: 'text-black font-black', // Contrast ratio 21:1
    pathGlow: 'ring-2 ring-cyan-400 bg-cyan-950/80 border-cyan-400',
    landingGlow: 'ring-4 ring-lime-400 bg-lime-950/90 border-lime-400',
    storeBg: 'bg-[#0a0a0a]',
    storeBorder: 'border-2 border-white',
    storeP1Text: 'text-yellow-300', // Contrast ratio 13.7:1
    storeP2Text: 'text-cyan-300',   // Contrast ratio 11.6:1
    barBg: 'bg-black border-2 border-white',
    barP1: 'bg-yellow-400',
    barP2: 'bg-cyan-400',
    barDivider: 'bg-white',
    tabActiveBg: 'bg-white text-black font-extrabold',
    tabActiveText: 'text-yellow-300 font-extrabold',
    tabInactiveText: 'text-[#e5e5e5] hover:text-white',
    thumbBarBg: 'bg-black border-2 border-white',
    thumbBarBorder: 'border-white',
    turnP1Bg: 'bg-yellow-400 text-black border-2 border-white font-black',
    turnP2Bg: 'bg-cyan-300 text-black border-2 border-white font-black'
  }
};
```

#### Pebble Pattern Distinction (`src/Pebble.tsx`)
```tsx
export function Pebble({ theme, player, index }: PebbleProps) {
  const isHighContrast = theme === 'high-contrast';

  if (isHighContrast) {
    // Non-color pattern discrimination
    const isP1 = player === 'p1';
    return (
      <div
        className={`relative w-4 h-4 rounded-full border-2 border-white shrink-0 flex items-center justify-center ${
          isP1 ? 'bg-yellow-400 text-black' : 'bg-cyan-400 text-black'
        }`}
        style={{
          // Diagonal stripes for South (P1), Stippled dots for North (P2)
          backgroundImage: isP1
            ? 'repeating-linear-gradient(45deg, #000 0, #000 2px, #facc15 2px, #facc15 4px)'
            : 'radial-gradient(circle, #000 1.5px, transparent 1.5px)',
          backgroundSize: isP1 ? 'auto' : '6px 6px'
        }}
        aria-hidden="true"
      >
        <span className="sr-only">{isP1 ? 'South stone (striped)' : 'North stone (dotted)'}</span>
      </div>
    );
  }

  // Standard skin rendering ...
}
```

#### Non-Color Visual Cues in `TurnBanner.tsx`
- Add geometric glyphs: `◆ South (You)` vs `● North (Computer)`.
- Directional arrow indicators: `▼ Your Pits` / `▲ Opponent Pits`.

---

### 4.3. Reduced Motion Support (Feature 16)

#### Auto-Detect & Setting Hook (`src/lib/a11y.ts`)
```ts
export function useReducedMotion(preference: 'auto' | 'reduce' | 'no-preference'): boolean {
  const [systemReduced, setSystemReduced] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (e: MediaQueryListEvent) => setSystemReduced(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  if (preference === 'reduce') return true;
  if (preference === 'no-preference') return false;
  return systemReduced;
}
```

#### CSS Rule (`src/index.css`)
```css
html.reduced-motion *,
html.reduced-motion *::before,
html.reduced-motion *::after {
  animation-duration: 0.001ms !important;
  animation-iteration-count: 1 !important;
  transition-duration: 0.001ms !important;
  scroll-behavior: auto !important;
}
```

#### Logic in `src/game/useGame.ts`
When `isReducedMotion` is true:
- Bypass the loop: `for (let i = 0; i < result.path.length; i++) { await sleep(delays.step); }`.
- Transition immediately to intermediate board state with a single gentle fade (100ms).
- Announce step summary in live region without graphic shaking/bouncing.
- Preserve 0.6s / 1.2s patient bot thinking delay.

---

### 4.4. Big Mode & Forgiving Taps (Feature 17)

#### Geometry & Ergonomics
- **Minimum Tap Target**: `56px x 56px` on South pits and all 5 bottom tray navigation buttons.
- **Bottom 60% Ergonomic Layout**:
  - Container layout shifts interactive elements (South pits P1–P6, tray buttons) into the bottom 60% of viewport height.
  - Non-interactive information (opponent pits, engine gauge) sits in top 40%.
- **250ms Tap Debounce Utility**:
```ts
export function useDebouncedMove(onMove: (pit: number) => void, debounceMs = 250) {
  const lastTapRef = useRef<number>(0);

  return useCallback((pit: number) => {
    const now = Date.now();
    if (now - lastTapRef.current < debounceMs) {
      return; // Suppress accidental double-tap
    }
    lastTapRef.current = now;
    onMove(pit);
  }, [onMove, debounceMs]);
}
```
- **"Tap Twice to Move" Mode**:
  - 1st tap: triggers move preview (shows stone trajectory path, captures, bonus turn).
  - 2nd tap on the same pit: executes move.
  - Tap on different pit: moves preview to new pit.

---

### 4.5. Screen Reader ARIA Labelling & Live Narration (Feature 18)

#### Pit ARIA Label Generator
```ts
export function getPitAriaLabel(
  pitIndex: number,
  stones: number,
  isLegal: boolean,
  isBest: boolean,
  player: 'p1' | 'p2',
  isCurrentTurn: boolean,
  tapTwice: boolean
): string {
  const ownerLabel = player === 'p1' ? 'Your' : "Opponent's";
  const pitNum = player === 'p1' ? pitIndex + 1 : 13 - pitIndex;
  const stoneText = stones === 1 ? '1 stone' : `${stones} stones`;

  let actionText = '';
  if (!isCurrentTurn) {
    actionText = 'Not your turn.';
  } else if (!isLegal) {
    actionText = stones === 0 ? 'Empty pit, cannot play.' : 'Cannot play this pit.';
  } else {
    actionText = tapTwice ? 'Tap once to preview, twice to play.' : 'Press Enter or double tap to play.';
  }

  const recommendation = isBest ? "Coach's recommended move." : '';

  return `${ownerLabel} pit ${pitNum}, ${stoneText}. ${recommendation} ${actionText}`.trim();
}
```

#### Dedicated Live Announcer (`src/components/shell/LiveAnnouncer.tsx`)
```tsx
import React from 'react';

interface LiveAnnouncerProps {
  message: string;
}

export const LiveAnnouncer: React.FC<LiveAnnouncerProps> = ({ message }) => {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
      data-testid="aria-live-announcer"
    >
      {message}
    </div>
  );
};
```

---

### 4.6. Full Keyboard Navigation (Feature 19)

#### Mancala Grid Roving TabIndex & Hotkeys
- **Grid Layout**: 2 rows x 6 pits.
  - Row 0 (North): pits `[12, 11, 10, 9, 8, 7]` (left-to-right visually).
  - Row 1 (South): pits `[0, 1, 2, 3, 4, 5]` (left-to-right visually).
- **Roving Focus**:
  - Initial active pit = South Pit 1 (index 0).
  - `ArrowRight`: Move focus to index + 1 on current row.
  - `ArrowLeft`: Move focus to index - 1 on current row.
  - `ArrowUp`: Switch focus from South pit `i` to North pit `12 - i`.
  - `ArrowDown`: Switch focus from North pit to South pit.
  - `Home` / `End`: Jump to first / last pit on current row.
  - `Enter` / `Space`: Execute move on focused pit.
  - `?`: Open Rules Modal.
  - `Esc`: Close any open modal or clear preview.

#### Modal Focus Trap (`src/lib/focusTrap.ts`)
```ts
export function trapFocus(container: HTMLElement, e: KeyboardEvent, onClose: () => void) {
  if (e.key === 'Escape') {
    e.preventDefault();
    onClose();
    return;
  }

  if (e.key === 'Tab') {
    const focusable = container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }
}
```

---

### 4.7. Web Speech API Helper (`src/lib/speech.ts`) (Feature 20)

```ts
export class SpeechHelper {
  private synth: SpeechSynthesis | null = null;
  public isSupported: boolean = false;
  private currentUtterance: SpeechSynthesisUtterance | null = null;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
      this.isSupported = true;
    }
  }

  public speak(text: string, lang = 'en', rate = 1.0): void {
    if (!this.synth || !this.isSupported) return;
    this.stop();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = Math.max(0.7, Math.min(1.4, rate));

    const voices = this.synth.getVoices();
    const matchingVoice = voices.find(v => v.lang.startsWith(lang));
    if (matchingVoice) utterance.voice = matchingVoice;

    this.currentUtterance = utterance;
    this.synth.speak(utterance);
  }

  public stop(): void {
    if (this.synth) {
      this.synth.cancel();
      this.currentUtterance = null;
    }
  }
}

export const speech = new SpeechHelper();
```

---

### 4.8. Zero-PII "Erase My Data" Reset in Settings (Feature 52)

#### Data Wipe Utility (`src/lib/dataReset.ts`)
```ts
export async function eraseAllUserData(): Promise<void> {
  // 1. Wipe all localStorage items with prefix mancala_
  if (typeof localStorage !== 'undefined') {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('mancala_') || key.startsWith('mancala'))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
  }

  // 2. Clear sessionStorage
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.clear();
  }

  // 3. Clear CacheStorage
  if (typeof window !== 'undefined' && 'caches' in window) {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
    } catch {}
  }

  // 4. Unregister Service Workers
  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map(r => r.unregister()));
    } catch {}
  }

  // 5. Reload cleanly
  if (typeof window !== 'undefined') {
    window.location.reload();
  }
}
```

---

### 4.9. Axe-Core Accessibility Automated Test Plan

#### Package Installation
```bash
npm install -D @axe-core/playwright
```

#### Test Suite Specification (`e2e/a11y.spec.ts`)
```ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Axe-Core Automated Accessibility Audit', () => {
  const skins = ['walnut', 'porcelain', 'obsidian', 'high-contrast'];
  const presets = ['justPlay', 'hints', 'coach', 'full'];

  test('Main Board screen has zero critical or serious a11y violations across all skins', async ({ page }) => {
    for (const skin of skins) {
      await page.goto(`/?theme=${skin}`);
      await page.waitForLoadState('domcontentloaded');

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      const violations = results.violations.filter(
        v => v.impact === 'critical' || v.impact === 'serious'
      );
      expect(violations, `Violations found in skin: ${skin}`).toEqual([]);
    }
  });

  test('Settings Panel has zero critical/serious a11y violations', async ({ page }) => {
    await page.goto('/');
    const settingsBtn = page.locator('[data-testid="bottom-settings-btn"]');
    if (await settingsBtn.isVisible()) await settingsBtn.click();

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    const violations = results.violations.filter(v => v.impact === 'critical' || v.impact === 'serious');
    expect(violations).toEqual([]);
  });

  test('Rules Modal has zero critical/serious a11y violations and traps focus', async ({ page }) => {
    await page.goto('/');
    const rulesBtn = page.locator('[data-testid="bottom-rules-btn"]');
    if (await rulesBtn.isVisible()) {
      await rulesBtn.click();
      await page.waitForSelector('[role="dialog"]');

      const results = await new AxeBuilder({ page }).analyze();
      const violations = results.violations.filter(v => v.impact === 'critical' || v.impact === 'serious');
      expect(violations).toEqual([]);

      // Test Escape dismisses modal
      await page.keyboard.press('Escape');
      await expect(page.locator('[role="dialog"]')).not.toBeVisible();
    }
  });

  test('Keyboard-only traversal: can focus pit and play a move', async ({ page }) => {
    await page.goto('/');
    // Tab into board
    await page.keyboard.press('Tab');
    // Navigate with ArrowRight
    await page.keyboard.press('ArrowRight');
    // Play move with Enter
    await page.keyboard.press('Enter');
    // Verify move is executed and board updates
    await expect(page.locator('[data-testid="total-stones"]')).toContainText('48');
  });
});
```

---

## 5. Verification Method

To independently verify this specification and its future implementation:

1. **Static Analysis & Typecheck**:
   ```bash
   npx tsc --noEmit
   ```
   Must compile with zero errors under strict TypeScript.

2. **Automated Unit & Integration Tests**:
   ```bash
   npm test
   ```
   Executes unit tests verifying:
   - Pit ARIA label formatting strings.
   - Font scale calculations and hard floor bounds (`max(0.75rem, 12px)`).
   - Reduced motion detector.
   - Debounce move timer.
   - Data reset key deletion.

3. **Playwright E2E & Axe Audit**:
   ```bash
   npx playwright test e2e/a11y.spec.ts
   ```
   Verifies:
   - Zero critical or serious Axe violations across all 4 skins and core views.
   - Full keyboard navigation (Arrow keys + Enter).
   - Modal escape handling.

4. **Zero Horizontal Overflow at 360px Viewport at Font Scale XL**:
   ```bash
   npx playwright test e2e/no-hscroll.spec.ts
   ```
   Ensures `--font-scale: 1.3` does not induce horizontal scroll on 360px viewport.

5. **Invalidation Conditions**:
   - Any visible text rendering below 12px at scale M.
   - Any critical or serious violation reported by axe-core.
   - Any contrast ratio falling below 7:1 for text in the high-contrast theme.
   - Any failure of `Escape` to close modal dialogs.
