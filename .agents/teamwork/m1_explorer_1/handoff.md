# Handoff Report: Milestone 1 — Highlights, 7 Lenses & Plain Language Architecture

**Agent**: `m1_explorer_1` (Highlights & Lenses Architect)  
**Date**: 2026-10-07  
**Milestone**: M1 (Phase 1: Calm UI, Accessibility, Languages, Onboarding)  
**Target Path**: `c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m1_explorer_1\handoff.md`  

---

## 1. Observation

Direct code and environment observations:

1. **Conflicting Highlights & Badge Stacking in `src/components/board/PitButton.tsx`**:
   - Lines 69–91 evaluate a complex nested ternary expression trying to choose between ten styling states simultaneously:
     ```tsx
     isTutorChosen ? '...' : isTutorBest ? '...' : isTutorThreat ? '...' : isTutorVulnerable ? '...' : isSource ? '...' : isCurrentlySown ? '...' : isCaptured ? '...' : isLastMoveSource ? '...' : isLanding ? theme.landingGlow : isHighlightedPath ? theme.pathGlow : ''
     ```
   - Lines 97–146 render up to six competing badges at once inside a single pit header (`YOUR PICK`, `COACH'S PICK`, `THREAT`, `VULN`, `LAST`, `PICK`, `DROP`, `CAPT`, `#1 BEST`), cluttering the board and creating sensory overload.
   - Lines 65–66 attach `onMouseEnter` and `onMouseLeave` handlers, which on touch devices trigger sticky previews that do not clear upon finger release (`touchend`), scrolling (`touchmove`), or document blur.

2. **Speed Row on Active Game Screen in `src/components/shell/TurnBanner.tsx`**:
   - Lines 259–280 render a persistent sowing speed selector (`slow`, `normal`, `fast`, `instant`) on the main gameplay ribbon:
     ```tsx
     <div className="flex items-center space-x-1 shrink-0 self-end sm:self-center">
       <span className="text-[9px] font-bold uppercase tracking-wider opacity-60 mr-1 hidden xs:inline">Speed:</span>
       {(['slow', 'normal', 'fast', 'instant'] as const).map(speed => (
         <button key={speed} onClick={() => onSetSowSpeed(speed)}>...</button>
       ))}
     </div>
     ```
   - This violates `docs/plan/phase-1-lenses-and-access.md` section 1.1: *"Speed row (Slow/Normal/Fast/Instant): move into Settings (not on the main screen)."*

3. **Hint Ribbon Button Ungated in `src/components/shell/TurnBanner.tsx`**:
   - Lines 89–101 unconditionally render `data-testid="ribbon-hints-btn"`, even when best move marks are disabled or when running in the `justPlay` preset.
   - Violates `docs/plan/phase-1-lenses-and-access.md` section 1.1: *"Gate `ribbon-hints-btn` behind lens `bestMoveMarks`."*

4. **Lack of Empty State in `src/components/panels/AnalysisPanel.tsx`**:
   - Lines 92–386 always render the full candidate move evaluation table, search depth lookahead counter, and session rating banner, even when in the `justPlay` preset where all analysis lenses are toggled off.
   - Violates `phase-1-lenses-and-access.md` section 1.1: *"Analysis tab with all lenses off: show a friendly empty state ('Stats are hidden. Turn on a stat view in Settings') with a one-tap button that applies the coach preset."*

5. **Existing Lenses Schema in `src/lenses.ts` & Preserved Test IDs in `e2e/preserved-testids.spec.ts`**:
   - `src/lenses.ts` lines 7–15 define:
     ```ts
     export type LensId = 'advantageBar' | 'errorRate' | 'bestMoveMarks' | 'winPercent' | 'mainLine' | 'coach' | 'explanations';
     ```
   - `e2e/preserved-testids.spec.ts` lines 67–85 assert the presence of test IDs: `preset-justPlay`, `preset-hints`, `preset-coach`, `preset-full`, and `lens-advantageBar`, `lens-bestMoveMarks`, `lens-coach`, `lens-explanations`, `lens-errorRate`, `lens-winPercent`, `lens-mainLine`.
   - The DISPATCH specifies 7 refined independent lenses: `evalBar`, `bestMoveHighlight`, `threatPits`, `landingPreview`, `principalVariation`, `explanations`, `errorRate`, and 4 presets: `Just Play`, `Gentle Coach`, `Tactician`, `Deep Analysis`.

6. **Excessive Engine Jargon in Player-Facing Strings**:
   - `src/components/panels/AnalysisPanel.tsx`:
     - Line 101: `"Lookahead: {searchDepth} plies"`
     - Line 111: `"Session Rating: P1: {calcPR(...)}"`
     - Line 266: `"Equity Diff"`
     - Line 269: `"Bonus / PV Lookahead"`
   - `src/components/panels/CoachPanel.tsx`:
     - Line 67: `"Sacrifices win equity compared to..."`
   - `src/components/shell/EvalGauge.tsx`:
     - Line 148: `"PR: {calcPR(...)}"`
   - `src/components/shell/TurnBanner.tsx`:
     - Line 222: `"Evaluating optimal pit and rollout minimax..."`
   - `src/App.tsx`:
     - Line 277: `"Minimax PV Rollouts"`
   - No interactive glossary currently exists (`src/i18n/glossary.ts` is absent).

7. **Test Suite Baseline**:
   - `npm test` (`vitest run`): 13 test files passed, 107 tests passing cleanly.
   - `npm run typecheck` (`tsc --noEmit`): Exits 0 with zero TypeScript diagnostic errors.

---

## 2. Logic Chain

1. **Highlight Visual Integrity (Precedence & Touch Safety)**:
   - *From Observation 1*: The root cause of visual confusion is that `PitButton.tsx` evaluates multiple highlight conditions independently, rendering conflicting rings and badges simultaneously.
   - *Reasoning*: A deterministic state machine is required where a pit evaluates its role through a strict priority hierarchy:
     $$\text{preview} > \text{best} > \text{lastMove} > \text{threat} > \text{playable} > \text{none}$$
   - When a preview is active (via hover or touch long-press), only pits involved in that preview receive preview-related roles (`preview` for source, `landing` for destination, `captured` for opposite pit, path dots for trajectory). All other pits fall back to their passive roles, but secondary previews never compete.
   - For touch screens, handling `onTouchStart` with a 350 ms timer prevents accidental sticky previews. Normal taps (< 350 ms) play immediately; holding (>= 350 ms) shows the trajectory; releasing (`onTouchEnd`), cancelling (`onTouchCancel`), or scrolling (`touchmove` delta > 10px) immediately clears the preview. For users preferring confirmation, a "Tap twice to move" setting allows a 1st tap to preview and a 2nd tap on the same pit to execute.

2. **Lens Architecture & Preset Gating**:
   - *From Observation 5*: Preserving test IDs (`preset-justPlay`, `preset-hints`, `preset-coach`, `preset-full`, and `lens-advantageBar` etc.) is mandatory per `PROJECT.md`.
   - *Reasoning*: We can define the 7 canonical lenses as specified in DISPATCH:
     1. `evalBar` (live position balance gauge)
     2. `bestMoveHighlight` (star badge on best pit)
     3. `threatPits` (dashed warning on opponent threat pits)
     4. `landingPreview` (tactile trajectory preview on hover/touch)
     5. `principalVariation` (expected sequence display)
     6. `explanations` (calm verbal reasoning and glossary)
     7. `errorRate` (mistakes per 100 moves tracker)
   - To maintain 100% backward compatibility with `e2e/preserved-testids.spec.ts`, `lenses.ts` must provide bidirectional aliases and include backward-compatible data attributes:
     - `advantageBar` $\equiv$ `evalBar`
     - `bestMoveMarks` $\equiv$ `bestMoveHighlight`
     - `mainLine` $\equiv$ `principalVariation`
     - Presets:
       - `justPlay` ("Just Play"): all 7 lenses `false`.
       - `coach` ("Gentle Coach"): `evalBar: true`, `landingPreview: true`, `explanations: true`.
       - `hints` ("Tactician"): `bestMoveHighlight: true`, `threatPits: true`, `principalVariation: true`.
       - `full` ("Deep Analysis"): all 7 lenses `true`.

3. **Calm Just Play Experience & Analysis Empty State**:
   - *From Observations 2, 3, 4*: Currently, `TurnBanner` displays speed controls and hints buttons regardless of preset, and `AnalysisPanel` always displays engine calculation tables.
   - *Reasoning*: In `justPlay`:
     - `EvalGauge` is unmounted (`lenses.evalBar === false`).
     - `ribbon-hints-btn` is hidden (`lenses.bestMoveHighlight === false`).
     - Sowing speed controls are relocated exclusively to `SettingsPanel`.
     - The only elements rendered on the main screen are the Header, Turn Indicator (who's turn and stone count), the Board, and the 5-item Bottom Tray.
     - When navigating to the Analysis tab in `justPlay` (or whenever all analytical lenses are toggled off), `AnalysisPanel` must render a peaceful empty state card with an icon, explanatory copy, and a 1-tap "Enable Gentle Coach" button (`data-testid="enable-coach-btn"`) that immediately applies the `coach` preset.

4. **Calm Terminology & Interactive Glossary**:
   - *From Observation 6*: Engine terms ("plies", "equity loss", "PR", "minimax rollout", "conceded major win equity") intimidate casual and young players.
   - *Reasoning*: Creating `src/i18n/glossary.ts` provides a single authoritative source of truth mapping all tactical concepts to plain language (Grade 4 reading level).
   - In UI components, when `lenses.explanations` is active, tactical terms are rendered with an interactive `<GlossaryTrigger termId="...">` component that displays a calm popover explaining the concept with a concrete Mancala example.

---

## 3. Caveats

1. **Preserved Test IDs Are Non-Negotiable**:
   Any rename of lens IDs or preset IDs must strictly provide backward-compatible aliases or maintain dual test IDs (`data-testid="lens-evalBar lens-advantageBar"` or data attribute mappings) so that existing test suites (`preserved-testids.spec.ts`) continue to pass without regression.
2. **Phase Isolation**:
   Phase 1 focuses on UI, accessibility, lenses, and terminology. The Exact Endgame Solver (Alpha-Beta $\le 14$ stones) and automated Leitner mistake drills belong to Phase 2; Phase 1 components must provide clean type extension hooks for `exact` evaluation tags without prematurely implementing Phase 2 solver routines.
3. **No Source Code Modified in this Investigation**:
   In strict adherence to the Explorer role, no application source files have been edited. All code examples below are design specifications and proposed snippets for the implementing engineer.

---

## 4. Conclusion & Concrete Architectural Specifications

### Specification 1: Pure Highlight Module (`src/components/board/highlights.ts`)

A new pure TypeScript module calculating exactly one `HighlightKind` per pit:

```ts
/**
 * src/components/board/highlights.ts
 * Pure deterministic highlight assignment for Mancala pits.
 */

export type HighlightKind =
  | 'none'
  | 'playable'    // Soft gold ring: legal pit on current player's turn
  | 'preview'     // Thick gold glow: source pit of active touch/hover preview
  | 'landing'     // Soft emerald pulse: final landing pit during preview
  | 'captured'    // Crimson pulse: opponent pit captured during preview
  | 'best'        // Gold star badge + emerald ring: engine top pick (lens gated)
  | 'threat'      // Dashed amber ring: opponent pit holding tactical threat (lens gated)
  | 'lastMove';   // Faint dashed white ring: pit played on prior turn (fades in 2.5s)

export interface PitHighlightContext {
  pitIndex: number;
  currentPlayer: number; // 0 (South) or 1 (North)
  isLegal: boolean;
  isGameOver: boolean;
  isAnimating: boolean;

  // Active preview state
  previewSourcePit: number | null;
  previewLandingPit: number | null;
  previewCapturedPit: number | null;

  // Lens states
  showBestMove: boolean;     // lenses.bestMoveHighlight
  showThreats: boolean;      // lenses.threatPits

  // Engine evaluation data
  isBestMove: boolean;
  isOpponentThreat: boolean;

  // Last move tracking
  lastMovedPit: number | null;
  isLastMoveActive: boolean; // true if within 2500ms and not dismissed
}

/**
 * Strict precedence resolver:
 * preview/landing/captured > best > lastMove > threat > playable > none
 */
export function getPitHighlight(ctx: PitHighlightContext): HighlightKind {
  // If moving pebbles are currently animating, suppress static highlights
  if (ctx.isAnimating) return 'none';

  // 1. PREVIEW PRECEDENCE (Active hover or 350ms touch preview)
  if (ctx.previewSourcePit !== null) {
    if (ctx.pitIndex === ctx.previewSourcePit) return 'preview';
    if (ctx.pitIndex === ctx.previewLandingPit) return 'landing';
    if (ctx.pitIndex === ctx.previewCapturedPit) return 'captured';
    // Pits on path display simulated pebble increments, but pit border stays clean
    return 'none';
  }

  // 2. BEST MOVE PRECEDENCE
  if (ctx.showBestMove && ctx.isBestMove && !ctx.isGameOver) {
    return 'best';
  }

  // 3. LAST MOVE PRECEDENCE (prior move source, expires in 2.5s)
  if (ctx.lastMovedPit === ctx.pitIndex && ctx.isLastMoveActive && !ctx.isGameOver) {
    return 'lastMove';
  }

  // 4. THREAT PIT PRECEDENCE (opponent tactical threats)
  if (ctx.showThreats && ctx.isOpponentThreat && !ctx.isGameOver) {
    return 'threat';
  }

  // 5. PLAYABLE PRECEDENCE (current player's legal pits)
  if (ctx.isLegal && !ctx.isGameOver) {
    return 'playable';
  }

  return 'none';
}

/**
 * Returns Tailwind styling tokens for a given HighlightKind.
 */
export function getHighlightStyle(kind: HighlightKind, skin = 'walnut') {
  switch (kind) {
    case 'preview':
      return {
        ringClass: 'ring-2 ring-amber-400 bg-amber-500/20 shadow-[0_0_16px_rgba(251,191,36,0.5)]',
        badge: null
      };
    case 'landing':
      return {
        ringClass: 'ring-2 ring-emerald-400 bg-emerald-500/20 shadow-[0_0_18px_rgba(52,211,153,0.6)] animate-pulse',
        badge: { text: 'LAND', color: 'bg-emerald-500/30 text-emerald-300 border-emerald-500/50' }
      };
    case 'captured':
      return {
        ringClass: 'ring-2 ring-rose-500 bg-rose-950/40 shadow-[0_0_18px_rgba(244,63,94,0.6)] animate-pulse',
        badge: { text: 'CAPT', color: 'bg-rose-500/30 text-rose-300 border-rose-500/50' }
      };
    case 'best':
      return {
        ringClass: 'ring-1.5 ring-emerald-400/80 bg-emerald-500/10 shadow-[0_0_12px_rgba(52,211,153,0.3)]',
        badge: { text: '★', color: 'bg-emerald-500/30 text-emerald-300 border-emerald-500/50 font-bold' }
      };
    case 'lastMove':
      return {
        ringClass: 'ring-1 ring-dashed ring-white/30 border-white/30',
        badge: { text: 'LAST', color: 'bg-white/20 text-white border-white/30' }
      };
    case 'threat':
      return {
        ringClass: 'ring-1.5 ring-dashed ring-amber-500/70 bg-amber-500/10 shadow-[0_0_12px_rgba(245,158,11,0.25)]',
        badge: { text: 'THREAT', color: 'bg-amber-500/30 text-amber-300 border-amber-500/50' }
      };
    case 'playable':
      return {
        ringClass: 'ring-1 ring-amber-400/40 hover:ring-amber-400/80 hover:bg-amber-500/10',
        badge: null
      };
    case 'none':
    default:
      return {
        ringClass: '',
        badge: null
      };
  }
}
```

---

### Specification 2: Touch (350 ms Long-Press) & Double-Tap Interaction Design

```ts
/**
 * Hook or interaction logic inside PitButton / Board:
 */
export function usePitTouchInteraction({
  pitIndex,
  isLegal,
  onPlayMove,
  onStartPreview,
  onClearPreview,
  tapTwiceToMove = false,
  activePreviewPit
}: {
  pitIndex: number;
  isLegal: boolean;
  onPlayMove: (pit: number) => void;
  onStartPreview: (pit: number) => void;
  onClearPreview: () => void;
  tapTwiceToMove?: boolean;
  activePreviewPit: number | null;
}) {
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const didLongPressFireRef = useRef(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isLegal) return;
    const touch = e.touches[0];
    touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };
    didLongPressFireRef.current = false;

    // Start 350ms long-press timer
    longPressTimerRef.current = setTimeout(() => {
      didLongPressFireRef.current = true;
      haptics.tap();
      onStartPreview(pitIndex);
    }, 350);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartPosRef.current) return;
    const touch = e.touches[0];
    const dx = Math.abs(touch.clientX - touchStartPosRef.current.x);
    const dy = Math.abs(touch.clientY - touchStartPosRef.current.y);
    // If finger moves more than 10px, cancel long-press so user can scroll smoothly
    if (dx > 10 || dy > 10) {
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
      if (didLongPressFireRef.current) onClearPreview();
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);

    if (didLongPressFireRef.current) {
      // Long press preview ends on release
      e.preventDefault();
      onClearPreview();
      return;
    }

    if (!isLegal) return;

    if (tapTwiceToMove) {
      e.preventDefault();
      if (activePreviewPit === pitIndex) {
        // Second tap executes
        onClearPreview();
        onPlayMove(pitIndex);
      } else {
        // First tap previews
        onStartPreview(pitIndex);
      }
    } else {
      // Normal quick tap executes directly
      onClearPreview();
      onPlayMove(pitIndex);
    }
  };

  const handleTouchCancel = () => {
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    onClearPreview();
  };

  return {
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleTouchCancel
  };
}
```

---

### Specification 3: 7 Lenses & 4 Presets Architecture (`src/lenses.ts`)

Update `src/lenses.ts` with canonical lenses, preset bundles, and dual-compatibility aliases:

```ts
/**
 * src/lenses.ts
 * 7 independent trainer lenses and 4 presets with 100% backward-compatible aliases.
 */

export type CanonicalLensId =
  | 'evalBar'              // Live position balance gauge
  | 'bestMoveHighlight'    // Star badge on top recommended pit
  | 'threatPits'           // Highlighting opponent tactical threats
  | 'landingPreview'       // Pebble drop trajectory, landing glow, capture pulse
  | 'principalVariation'   // Expected continuation line (up to 3 ply)
  | 'explanations'         // Plain-language reasons & interactive glossary
  | 'errorRate';           // Accuracy tracking as mistakes per 100 moves

// Backward-compatible alias type for test suites
export type LegacyLensId = 'advantageBar' | 'bestMoveMarks' | 'winPercent' | 'mainLine' | 'coach';
export type LensId = CanonicalLensId | LegacyLensId;

export type LensState = Record<CanonicalLensId, boolean>;

export type PresetId = 'justPlay' | 'coach' | 'hints' | 'full';

export interface LensInfo {
  id: CanonicalLensId;
  legacyId?: LegacyLensId;
  label: string;
  description: string;
}

export const LENSES: LensInfo[] = [
  {
    id: 'evalBar',
    legacyId: 'advantageBar',
    label: 'Position Balance Bar',
    description: 'Shows who has the advantage in stones.'
  },
  {
    id: 'bestMoveHighlight',
    legacyId: 'bestMoveMarks',
    label: 'Best Move Star',
    description: 'Marks the strongest pit recommendation with a star.'
  },
  {
    id: 'threatPits',
    label: 'Tactical Threat Warnings',
    description: 'Marks opponent pits that threaten captures or bonus turns.'
  },
  {
    id: 'landingPreview',
    label: 'Sowing Path Preview',
    description: 'Previews pebble landing pits and captures when touching a pit.'
  },
  {
    id: 'principalVariation',
    legacyId: 'mainLine',
    label: 'Expected Move Sequence',
    description: 'Shows the predicted sequence of moves for both sides.'
  },
  {
    id: 'explanations',
    label: 'Move Explanations & Glossary',
    description: 'Explains in plain words why moves are good, with tap-to-define terms.'
  },
  {
    id: 'errorRate',
    label: 'Accuracy Tracker',
    description: 'Tracks mistakes per 100 moves without intimidating scores.'
  }
];

const ALL_OFF: LensState = {
  evalBar: false,
  bestMoveHighlight: false,
  threatPits: false,
  landingPreview: false,
  principalVariation: false,
  explanations: false,
  errorRate: false
};

export const PRESETS: Record<PresetId, { label: string; description: string; lenses: LensState }> = {
  justPlay: {
    label: 'Just Play',
    description: 'Pure board. No numbers, no hints, zero distractions.',
    lenses: { ...ALL_OFF }
  },
  coach: {
    label: 'Gentle Coach',
    description: 'Calm balance bar, trajectory preview, and friendly blunder warnings.',
    lenses: {
      ...ALL_OFF,
      evalBar: true,
      landingPreview: true,
      explanations: true
    }
  },
  hints: {
    label: 'Tactician',
    description: 'Best move stars, threat warnings, and short lookahead lines.',
    lenses: {
      ...ALL_OFF,
      bestMoveHighlight: true,
      threatPits: true,
      principalVariation: true
    }
  },
  full: {
    label: 'Deep Analysis',
    description: 'Full engine transparency with all 7 analytical lenses active.',
    lenses: {
      evalBar: true,
      bestMoveHighlight: true,
      threatPits: true,
      landingPreview: true,
      principalVariation: true,
      explanations: true,
      errorRate: true
    }
  }
};
```

#### SettingsPanel & Preserved Test IDs Mapping:
In `src/components/panels/SettingsPanel.tsx`, each lens input renders both its canonical test ID and legacy test ID:
```tsx
{LENSES.map((lens) => (
  <label key={lens.id} className="...">
    <span>{lens.label}</span>
    <input
      type="checkbox"
      data-testid={`lens-${lens.id}`}
      {...(lens.legacyId ? { 'data-legacy-testid': `lens-${lens.legacyId}` } : {})}
      checked={lenses[lens.id]}
      onChange={(e) => onToggleLens(lens.id, e.target.checked)}
    />
  </label>
))}
```
And to ensure `e2e/preserved-testids.spec.ts` passes unconditionally, we map:
- `advantageBar` $\rightarrow$ `evalBar`
- `bestMoveMarks` $\rightarrow$ `bestMoveHighlight`
- `mainLine` $\rightarrow$ `principalVariation`
- `coach` $\rightarrow$ `explanations`
- `winPercent` $\rightarrow$ `evalBar`

---

### Specification 4: Analysis Panel Empty State in Just Play

When all analysis lenses are OFF (`!lenses.evalBar && !lenses.principalVariation && !lenses.errorRate && !lenses.explanations`) or preset is `justPlay`, `AnalysisPanel.tsx` renders:

```tsx
if (isAnalysisEmpty) {
  return (
    <div 
      data-testid="analysis-empty-state"
      className={`lg:col-span-2 ${theme.cardBg} border ${theme.cardBorder} rounded-2xl sm:rounded-3xl p-6 sm:p-10 flex flex-col items-center justify-center text-center shadow-lg ${mobileHidden ? 'hidden lg:flex' : ''}`}
    >
      <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-4">
        <Sparkles className="w-7 h-7" />
      </div>
      <h3 className="font-bold text-base sm:text-lg mb-2">Stats and Analysis are Hidden</h3>
      <p className={`text-xs sm:text-sm max-w-md ${theme.cardTextMuted} mb-6 leading-relaxed`}>
        You are in <strong>Just Play</strong> mode. Engine lookahead, move rankings, and ratings are turned off so you can enjoy the pure tactile board.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          data-testid="enable-coach-btn"
          onClick={() => onApplyPreset('coach')}
          className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-md transition active:scale-95 flex items-center gap-2"
        >
          <Sparkles className="w-4 h-4" />
          <span>Turn on Gentle Coach</span>
        </button>
        <button
          onClick={() => onNavigateTab('settings')}
          className={`px-4 py-2 rounded-xl border text-xs font-semibold transition ${theme.cardTextMuted} hover:text-white border-white/10 hover:border-white/20`}
        >
          Customize in Settings
        </button>
      </div>
    </div>
  );
}
```

---

### Specification 5: Plain Language Glossary (`src/i18n/glossary.ts`) & Popover

```ts
/**
 * src/i18n/glossary.ts
 * Plain-language strategic and tactical Mancala glossary definitions.
 */

export interface GlossaryEntry {
  id: string;
  term: string;
  calmAlternativeFor: string;
  definition: string;
  mancalaExample: string;
}

export const GLOSSARY: Record<string, GlossaryEntry> = {
  positionBalance: {
    id: 'positionBalance',
    term: 'Position balance',
    calmAlternativeFor: 'Evaluation / Centipawns',
    definition: 'A calm measure of which player controls more stones and future scoring opportunities.',
    mancalaExample: 'When both players have 24 stones in their stores and pits, the balance is even (±0.0).'
  },
  expectedLead: {
    id: 'expectedLead',
    term: 'Expected lead',
    calmAlternativeFor: 'Equity / Advantage',
    definition: 'The estimated difference in banked stones if both sides play thoughtful moves.',
    mancalaExample: '+2 stones ahead means you are on pace to finish with 2 more stones in your store.'
  },
  bestLine: {
    id: 'bestLine',
    term: 'Best line',
    calmAlternativeFor: 'Principal Variation / PV',
    definition: 'The predicted sequence of moves that both players are expected to make next.',
    mancalaExample: 'P3 → P1 → P5 shows a recommended first move and the anticipated responses.'
  },
  goAgain: {
    id: 'goAgain',
    term: 'Go again',
    calmAlternativeFor: 'Free Turn / Extra Turn',
    definition: 'An extra turn earned immediately when your last dropped pebble lands in your own store.',
    mancalaExample: 'Sowing from pit 3 with 3 pebbles lands right in your store, giving you a bonus turn.'
  },
  oppositeCapture: {
    id: 'oppositeCapture',
    term: 'Opposite capture',
    calmAlternativeFor: 'Capture / Material theft',
    definition: 'When your last pebble lands in an empty pit on your side, you take all pebbles in the pit directly across.',
    mancalaExample: 'Landing in empty Pit 2 captures all 7 pebbles sitting in opponent Pit 10.'
  },
  tacticalThreat: {
    id: 'tacticalThreat',
    term: 'Tactical threat',
    calmAlternativeFor: 'Threat / Blunder condition',
    definition: 'An opponent pit that can execute a big capture or chain multiple extra turns on their next turn.',
    mancalaExample: 'An opponent pit with 4 stones that will land in an empty pit across from your rich storehouse.'
  },
  mistakesPer100: {
    id: 'mistakesPer100',
    term: 'Mistakes per 100 moves',
    calmAlternativeFor: 'PR / Performance Rating',
    definition: 'An encouraging measure of how accurately you played over the entire match.',
    mancalaExample: 'Losing an average of less than 2 stones per 100 moves is master-level play!'
  },
  turnsAhead: {
    id: 'turnsAhead',
    term: 'Looking ahead',
    calmAlternativeFor: 'Plies / Search Depth',
    definition: 'How many turns into the future the computer calculates before choosing a move.',
    mancalaExample: 'Looking ahead 5 moves means evaluating your turn, their turn, your next turn, etc.'
  }
};
```

---

### Specification 6: Highlight Legend Popover (`src/components/board/HighlightLegendPopover.tsx`)

Reachable from:
1. `RulesModal.tsx` ("Board Highlights Guide")
2. `SettingsPanel.tsx` ("What do the highlights mean?")

Content table in popover:
- **Soft Gold Ring**: Playable pit on your turn.
- **Gold Star (★)**: Best move recommended by the engine.
- **Green Pulse Ring**: Final pit where your pebble lands.
- **Thick Gold Glow**: Sowing path preview while holding or hovering.
- **Crimson Pulse Ring**: Opponent pit being captured.
- **Dashed White Ring**: Pit played on the last move (fades after 2.5s).
- **Dashed Amber Ring**: Opponent pit posing an immediate tactical threat.

---

## 5. Verification Method

To verify the implementation of this specification once coded:

1. **Unit Test Suite for Highlights Precedence**:
   - Create `src/components/board/highlights.test.ts`:
     - Test 1: `preview` overrides `best`, `lastMove`, and `playable`.
     - Test 2: When no preview is active, `best` overrides `lastMove` and `playable`.
     - Test 3: `lastMove` overrides `playable` if within 2500ms; falls back to `playable` if expired.
     - Test 4: Exactly one `HighlightKind` is returned per pit.
   - Run: `npx vitest run src/components/board/highlights.test.ts`.

2. **Lens & Presets Unit Test Suite**:
   - Run: `npx vitest run src/lenses.test.ts`.
   - Verify `justPlay` has all 7 lenses set to `false`.
   - Verify `coach`, `hints`, `full` have their exact respective lens subsets.

3. **Typecheck & Preserved Test IDs Gate**:
   - Run: `npm run typecheck` (`tsc --noEmit`).
   - Run: `npx vitest run src/preserved-testids.test.ts`.
   - Verify all 35+ preserved test IDs exist in source files.

4. **Playwright E2E Verification**:
   - Run: `npx playwright test e2e/preserved-testids.spec.ts`.
   - Verify `preset-justPlay`, `preset-hints`, `preset-coach`, `preset-full` pass across all viewports.
   - Verify that switching to `justPlay` leaves only the board, turn indicator, and bottom tray visible, with the Analysis tab showing the calm empty state.
   - Test touch preview release: touching a pit and releasing cancels the preview immediately.

5. **Invalidation Conditions**:
   - Any scenario where two borders/rings render on the same pit.
   - Any scenario where touch preview remains stuck after finger release.
   - Any appearance of raw engine jargon ("centipawns", "minimax rollout", "plies") in default user-facing strings.
   - Any breakage of `e2e/preserved-testids.spec.ts`.
