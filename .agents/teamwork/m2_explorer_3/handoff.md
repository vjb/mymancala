# Phase 2 Trainer: Mistake Log, Leitner Drills, Review Upgrade & App.tsx Guard

**Author**: `m2_explorer_3`  
**Date**: 2026-10-07  
**Mission**: Architectural investigation and concrete implementation specifications for:
1. Mistake Log Persistence (`src/trainer/mistakes.ts` under `mancala_mistakes_v1`)
2. Leitner Spaced-Repetition Drill Trainer (`src/components/panels/DrillView.tsx` / `CoachPanel.tsx`)
3. Upgraded Game Review (`src/components/modals/GameReviewModal.tsx`)
4. App.tsx Line Count Guard (< 300 lines)

---

## 1. Observation

### 1.1 Existing Codebase State
- **`src/App.tsx` Line Count**:
  - `src/App.tsx` has 285 total lines (`wc -l` / `view_file` lines 1 to 285).
  - Lines 251–270 mount 6 individual modals directly inside `App.tsx`:
    ```tsx
    <RulesModal ... />
    <GameReviewModal ... />
    <DiagnosticsModal ... />
    <TutorialModal ... />
    <AudiencePickerModal ... />
    <HighlightLegendModal ... />
    ```
  - `App.tsx` is only 15 lines below the strict hard constraint of `< 300 lines`. Any un-decomposed feature additions directly inside `App.tsx` would breach this gate.
- **Bottom Navigation Tray Layout (`src/components/shell/BottomTray.tsx:28-84`)**:
  - Contains strictly 5 fixed buttons:
    1. `data-testid="bottom-board-btn"` (Board)
    2. `data-testid="bottom-analysis-btn"` (Analysis)
    3. `data-testid="tutor-toggle"` (Coach On / Coach Off)
    4. `data-testid="bottom-rules-btn"` (Rules)
    5. `data-testid="bottom-settings-btn"` (Settings)
  - E2E tests (`e2e/tray.spec.ts:30-31`) assert: `await expect(page.locator('[data-testid="bottom-tray"] button')).toHaveCount(5);`.
  - Adding a 6th item for "Drills" directly to the tray would fail both E2E tests and `ORIGINAL_REQUEST.md:74`.
- **Existing Game Review Implementation (`src/GameReviewModal.tsx`, `src/game/reviewHelper.ts`)**:
  - Currently located at root `src/GameReviewModal.tsx` (377 lines), while `PROJECT.md:198` specifies `src/components/modals/GameReviewModal.tsx`.
  - Review data is currently computed synchronously in `computeGameReviewData(state, activeBot)` based on moves already executed. If engine lookahead did not run or ran at low depth during rapid human moves, equity loss is missing or estimated.
  - No background worker review, no progress bar, no worker cancellation, and no "Practice these" button linking mistakes into a drill queue.
  - Classification casing is currently PascalCase (`'Brilliant' | 'Best' | 'Good' | 'Inaccuracy' | 'Mistake' | 'Blunder'`), whereas Phase 2 specifies lowercase `MoveGrade = 'best' | 'good' | 'inaccuracy' | 'mistake' | 'blunder'`.
- **Existing Tactical Explanations (`src/tactics.ts:1-197`)**:
  - `generateTacticalExplanation(board, player, move, bestMove, rules)` produces deterministic explanations with reason categories (`'Free Turn Loss'`, `'Conceded Capture'`, `'Heavy Feeding'`, `'Starvation'`, `'Tempo Forfeited'`, `'Best Move'`, `'Tactical Mistake'`).
  - No LLM, pure rule-engine verification (`simulateMove`), completely deterministic.
- **Worker Infrastructure (`src/workers/searchClient.ts`, `src/workers/protocol.ts`)**:
  - Web Worker search client supports request IDs, async promises, and cancellability (`searchClient.cancel(id)`).
- **Test Baseline**:
  - `vitest run`: 17 test files, 171 tests passed cleanly.
  - `tsc --noEmit`: 0 errors.

---

## 2. Logic Chain

### 2.1 Mistake Log Persistence (`src/trainer/mistakes.ts`)
1. **Schema & Position Representation**:
   - `DISPATCH.md` specifies:
     `{ id: string; rulesId: string; position: number[]; played: number; best: number; loss: number; grade: MoveGrade; at: number; box: number; nextReviewAt: number; solved: number; explanationCode?: string; }`.
   - Storing `position` as the 14-element board array `number[]` (plus `turn: 0 | 1`) allows the drill board to render instantaneously without requiring a 50-move replay simulation from initial state on every card flip.
2. **Cap of 200 Items & Eviction Policy**:
   - New mistakes must be prepended to the array (`[newest, ..., oldest]`).
   - If `mistakes.length > 200`, the array is sliced to `mistakes.slice(0, 200)`.
   - De-duplication: If a player makes the same mistake from the exact same position (matching pit counts and played move), we do not create duplicate records. Instead, we update the existing record's `loss`, `grade`, and `at`, reset its Leitner box to 1 (`nextReviewAt = Date.now()`), and bring it to the head of the list.
3. **Leitner Spaced Repetition Scheduling**:
   - Box intervals:
     - Box 1: 1 day (`86_400_000` ms)
     - Box 2: 3 days (`259_200_000` ms)
     - Box 3: 7 days (`604_800_000` ms)
   - When a mistake is recorded: Starts in `box: 1`, `nextReviewAt: Date.now()` (immediately available for drills).
   - On correct answer:
     - Box 1 → Box 2 (`nextReviewAt = now + 3 days`), `solved++`.
     - Box 2 → Box 3 (`nextReviewAt = now + 7 days`), `solved++`.
     - Box 3 → Box 3 (`nextReviewAt = now + 7 days`), `solved++`.
   - On incorrect answer:
     - Demoted to Box 1 (`nextReviewAt = now + 1 day`).

### 2.2 Leitner Drill Trainer Integration (`DrillView.tsx` / `CoachPanel.tsx`)
1. **Tray Guardrail (Zero 6th Tray Item)**:
   - `ORIGINAL_REQUEST.md:74` and `e2e/tray.spec.ts` strictly enforce 5 buttons in `[data-testid="bottom-tray"]`.
   - Drills must NEVER be a 6th bottom tray item.
   - Drills are housed inside the **Coach tab**:
     - The 3rd button in the tray (`data-testid="tutor-toggle"`) switches to `mobileTab = 'coach'`.
     - In the Coach tab, users see the Gentle Coach settings AND the "Practice Mistakes" drill center.
     - On desktop, Coach is selectable from the main panel header or within `AnalysisPanel`.
     - Drills can also be launched directly via the "Practice these" button in `GameReviewModal`.
2. **Interactive Drill Board (`DrillView.tsx`)**:
   - Renders `<Board displayBoard={currentMistake.position} currentPlayer={currentMistake.turn ?? 0} ... />`.
   - When user clicks a pit:
     - If `chosenPit === currentMistake.best`:
       - Shows positive feedback badge ("★ Best Move Found!").
       - Calls `answerDrill(currentMistake.id, true)` (advances Leitner box).
       - Shows deterministic explanation of why this move is optimal.
     - If `chosenPit !== currentMistake.best`:
       - Shows alert badge ("Not quite — Pit X was played").
       - Highlights the best move on board with gold glow.
       - Calls `answerDrill(currentMistake.id, false)` (resets to Box 1).
       - Displays deterministic tactical explanation (e.g. `EXTRA_TURN_MISSED`, `CAPTURE_AVAILABLE`).

### 2.3 Upgraded Game Review (`src/components/modals/GameReviewModal.tsx`)
1. **Asynchronous Worker Engine Review**:
   - Instead of static estimations, when Game Review is opened, a cancellable background pass runs through the game move history in the worker at search depth 6.
   - Displays a progress bar: `Turn X of Y analyzed (Z%)`.
   - Cancellation: Closing the modal or pressing "Cancel" cancels remaining worker requests cleanly.
2. **Top 3 Swing Moments**:
   - Identifies the 3 moves with the highest equity loss across both players.
   - Shows turn number, player, played move, optimal move, stone loss, and tactical breakdown.
3. **"Practice These" Workflow**:
   - Collects all moves by the human player graded `inaccuracy`, `mistake`, or `blunder`.
   - Clicking `"Practice these"` calls `recordMistakesBatch(humanMistakes)`, closes the modal, and transitions directly to `DrillView` with those positions queued.

### 2.4 App.tsx Line Count Guard (< 300 lines)
1. Current line count is 285 lines.
2. Adding Drills and Review logic directly to `App.tsx` would push it over 320 lines.
3. Extracting the 6 modals into `src/components/shell/AppModals.tsx` removes ~35 lines from `App.tsx`.
4. Integrating `CoachView` (or `CoachPanel` with drills) in place of the floating tutor-only popup adds only ~5 lines.
5. Resulting `App.tsx` line count is projected at **~245–255 lines**, securely satisfying the `< 300 lines` invariant.

---

## 3. Concrete Implementation Specifications

### 3.1 Mistake Log Persistence (`src/trainer/mistakes.ts`)

```ts
import { MoveGrade } from './classify';

export const STORAGE_KEY_MISTAKES = 'mancala_mistakes_v1';
export const MAX_MISTAKES_CAP = 200;

export const LEITNER_INTERVALS_MS = {
  1: 1 * 24 * 60 * 60 * 1000, // Box 1: 1 day
  2: 3 * 24 * 60 * 60 * 1000, // Box 2: 3 days
  3: 7 * 24 * 60 * 60 * 1000, // Box 3: 7 days
} as const;

export interface MistakeRecord {
  id: string;               // e.g. `m_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
  rulesId: string;          // 'kalah'
  position: number[];       // Pit stones array (length 14 for Kalah)
  turn: 0 | 1;              // Active player when mistake occurred
  played: number;           // Pit played by user
  best: number;             // Optimal pit identified by engine
  loss: number;             // Stone equity loss (e.g. 2.4)
  grade: MoveGrade;         // 'inaccuracy' | 'mistake' | 'blunder'
  at: number;               // Epoch timestamp (ms)
  box: 1 | 2 | 3;           // Leitner box
  nextReviewAt: number;     // Due timestamp (ms)
  solved: number;           // Number of successful drill solves
  explanationCode?: string; // Deterministic reason code (e.g. 'EXTRA_TURN_MISSED')
}

export interface MistakeStats {
  total: number;
  due: number;
  box1: number;
  box2: number;
  box3: number;
}

/**
 * Loads mistakes from localStorage with corruption recovery.
 */
export function loadMistakes(): MistakeRecord[] {
  try {
    if (typeof localStorage === 'undefined') return [];
    const raw = localStorage.getItem(STORAGE_KEY_MISTAKES);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(item => (
      item &&
      typeof item.id === 'string' &&
      Array.isArray(item.position) &&
      typeof item.played === 'number' &&
      typeof item.best === 'number' &&
      typeof item.loss === 'number' &&
      typeof item.box === 'number'
    ));
  } catch {
    return [];
  }
}

/**
 * Saves mistakes enforcing newest-first order and cap of 200 items.
 */
export function saveMistakes(records: MistakeRecord[]): void {
  try {
    if (typeof localStorage === 'undefined') return;
    const capped = records.slice(0, MAX_MISTAKES_CAP);
    localStorage.setItem(STORAGE_KEY_MISTAKES, JSON.stringify(capped));
  } catch (err) {
    console.warn('Failed to save mistakes to localStorage:', err);
  }
}

function arePositionsEqual(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

/**
 * Records a single mistake. Deduplicates by position + played pit.
 */
export function recordMistake(
  input: Omit<MistakeRecord, 'id' | 'box' | 'nextReviewAt' | 'solved'>
): MistakeRecord {
  const existing = loadMistakes();
  const existingIdx = existing.findIndex(m => 
    m.played === input.played &&
    m.turn === input.turn &&
    arePositionsEqual(m.position, input.position)
  );

  const now = input.at || Date.now();
  let record: MistakeRecord;

  if (existingIdx >= 0) {
    // Existing mistake repeated: reset to Box 1, due immediately
    const prev = existing[existingIdx];
    record = {
      ...prev,
      loss: input.loss,
      best: input.best,
      grade: input.grade,
      explanationCode: input.explanationCode ?? prev.explanationCode,
      at: now,
      box: 1,
      nextReviewAt: now,
    };
    existing.splice(existingIdx, 1);
  } else {
    record = {
      ...input,
      id: `m_${now}_${Math.random().toString(36).slice(2, 7)}`,
      box: 1,
      nextReviewAt: now, // immediately due for drill practice
      solved: 0,
      at: now,
    };
  }

  existing.unshift(record);
  saveMistakes(existing);
  return record;
}

/**
 * Batch records mistakes (e.g. from Game Review "Practice these").
 */
export function recordMistakesBatch(
  inputs: Array<Omit<MistakeRecord, 'id' | 'box' | 'nextReviewAt' | 'solved'>>
): MistakeRecord[] {
  const added: MistakeRecord[] = [];
  for (const input of inputs) {
    added.push(recordMistake(input));
  }
  return added;
}

/**
 * Handles Leitner box scheduling when a drill is answered.
 */
export function answerDrill(id: string, correct: boolean): MistakeRecord | null {
  const existing = loadMistakes();
  const idx = existing.findIndex(m => m.id === id);
  if (idx < 0) return null;

  const item = existing[idx];
  const now = Date.now();

  if (correct) {
    const nextBox = item.box === 1 ? 2 : 3;
    const interval = LEITNER_INTERVALS_MS[nextBox];
    item.box = nextBox;
    item.nextReviewAt = now + interval;
    item.solved += 1;
  } else {
    // Failed drill: reset to Box 1
    item.box = 1;
    item.nextReviewAt = now + LEITNER_INTERVALS_MS[1];
  }

  saveMistakes(existing);
  return item;
}

/**
 * Returns mistakes that are due for review.
 */
export function getDueMistakes(allMistakes?: MistakeRecord[], now = Date.now()): MistakeRecord[] {
  const list = allMistakes ?? loadMistakes();
  return list.filter(m => m.nextReviewAt <= now);
}

/**
 * Returns Leitner box statistics.
 */
export function getMistakeStats(allMistakes?: MistakeRecord[]): MistakeStats {
  const list = allMistakes ?? loadMistakes();
  const now = Date.now();
  let due = 0;
  let b1 = 0;
  let b2 = 0;
  let b3 = 0;

  for (const m of list) {
    if (m.nextReviewAt <= now) due++;
    if (m.box === 1) b1++;
    else if (m.box === 2) b2++;
    else if (m.box === 3) b3++;
  }

  return { total: list.length, due, box1: b1, box2: b2, box3: b3 };
}

/**
 * Erases all mistake data (Privacy / Zero PII compliance).
 */
export function clearMistakes(): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY_MISTAKES);
    }
  } catch {}
}
```

---

### 3.2 Leitner Drill Trainer (`src/components/panels/DrillView.tsx`)

```tsx
import React, { useState, useMemo } from 'react';
import { Sparkles, CheckCircle2, RotateCcw, AlertTriangle, ArrowRight, BookOpen, Layers } from 'lucide-react';
import { MistakeRecord, answerDrill, getDueMistakes, loadMistakes } from '../../trainer/mistakes';
import { Board } from '../board/Board';
import { SkinTheme } from '../../theme';
import { kalahRuleSet } from '../../rules';
import { haptics } from '../../haptics';
import { sounds } from '../../sound';

interface DrillViewProps {
  initialMistakes?: MistakeRecord[];
  onExit: () => void;
  currentSkin: SkinTheme;
  theme: any;
  colorblindSafe?: boolean;
}

export const DrillView: React.FC<DrillViewProps> = ({
  initialMistakes,
  onExit,
  currentSkin,
  theme,
  colorblindSafe = false,
}) => {
  const [deck, setDeck] = useState<MistakeRecord[]>(() => {
    if (initialMistakes && initialMistakes.length > 0) return initialMistakes;
    const due = getDueMistakes();
    return due.length > 0 ? due : loadMistakes();
  });

  const [currentIndex, setCurrentIndex] = useState(0);
  const [userChoice, setUserChoice] = useState<number | null>(null);
  const [isResolved, setIsResolved] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [sessionScore, setSessionScore] = useState({ correct: 0, total: 0 });

  const currentMistake = deck[currentIndex];

  const handlePitClick = (pit: number) => {
    if (isResolved || !currentMistake) return;
    const legalPits = currentMistake.turn === 1 ? [7, 8, 9, 10, 11, 12] : [0, 1, 2, 3, 4, 5];
    if (!legalPits.includes(pit) || currentMistake.position[pit] === 0) return;

    setUserChoice(pit);
    setIsResolved(true);

    const correct = pit === currentMistake.best;
    setIsCorrect(correct);
    setSessionScore(prev => ({
      correct: prev.correct + (correct ? 1 : 0),
      total: prev.total + 1
    }));

    if (correct) {
      sounds.playCapture();
      haptics.victory();
      answerDrill(currentMistake.id, true);
    } else {
      haptics.blunder();
      answerDrill(currentMistake.id, false);
    }
  };

  const handleNext = () => {
    haptics.tap();
    setUserChoice(null);
    setIsResolved(false);
    setIsCorrect(false);
    setCurrentIndex(prev => prev + 1);
  };

  const handleRestart = () => {
    haptics.tap();
    const refreshed = loadMistakes();
    setDeck(refreshed);
    setCurrentIndex(0);
    setUserChoice(null);
    setIsResolved(false);
    setSessionScore({ correct: 0, total: 0 });
  };

  // Empty state
  if (!currentMistake || currentIndex >= deck.length) {
    return (
      <div 
        data-testid="drill-session-complete"
        className={`p-6 sm:p-10 rounded-3xl border-2 flex flex-col items-center justify-center text-center shadow-xl ${
          currentSkin === 'porcelain' ? 'bg-[#fff5ea] border-[#f0c08a] text-[#5c3a1a]' : `${theme.cardBg} ${theme.cardBorder}`
        }`}
      >
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mb-4">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold mb-2">Drill Session Complete!</h2>
        <p className="text-sm opacity-80 max-w-md mb-6 leading-relaxed">
          {sessionScore.total > 0
            ? `You solved ${sessionScore.correct} of ${sessionScore.total} mistakes correctly! Leitner review intervals updated.`
            : 'No mistakes currently due for review. Great job staying sharp!'}
        </p>
        <div className="flex gap-3">
          <button
            data-testid="drill-back-coach-btn"
            onClick={onExit}
            className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-md transition"
          >
            Back to Coach
          </button>
          {deck.length > 0 && (
            <button
              onClick={handleRestart}
              className="px-5 py-2.5 rounded-xl border border-white/15 hover:bg-white/10 text-xs font-semibold transition"
            >
              Practice Again
            </button>
          )}
        </div>
      </div>
    );
  }

  const bestLabel = kalahRuleSet.layout.label(currentMistake.best);
  const playedLabel = kalahRuleSet.layout.label(currentMistake.played);

  return (
    <div 
      data-testid="drill-view-container"
      className={`p-3.5 sm:p-6 rounded-3xl border-2 flex flex-col gap-4 shadow-2xl transition-all ${
        currentSkin === 'porcelain' ? 'bg-[#fff5ea] border-[#f0c08a] text-[#5c3a1a]' : `${theme.cardBg} ${theme.cardBorder}`
      }`}
    >
      {/* Header: Progress, Leitner Box indicator, Exit */}
      <div className="flex items-center justify-between border-b pb-3 border-white/10">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-amber-400" />
          <span className="text-xs sm:text-sm font-bold">
            Mistake Drill {currentIndex + 1} of {deck.length}
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono font-semibold">
            Box {currentMistake.box} ({currentMistake.box === 1 ? '1d' : currentMistake.box === 2 ? '3d' : '7d'})
          </span>
        </div>
        <button
          onClick={onExit}
          className="text-xs font-semibold px-3 py-1 rounded-lg border border-white/15 hover:bg-white/10 transition"
        >
          Exit Drills
        </button>
      </div>

      {/* Instructions Prompt */}
      <div className="text-xs sm:text-sm leading-relaxed">
        {!isResolved ? (
          <div className="flex items-center gap-2">
            <span className="font-semibold">Your Turn:</span>
            <span className="opacity-80">Find the optimal move to correct your past mistake!</span>
          </div>
        ) : isCorrect ? (
          <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 font-bold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Correct! {bestLabel} is the best move (+{currentMistake.loss.toFixed(1)} stones lead).</span>
            </div>
            <button
              data-testid="drill-next-btn"
              onClick={handleNext}
              className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1 shrink-0 ml-2"
            >
              <span>Next</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-200 font-medium flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <div>
                <span className="font-bold">Not quite. </span>
                <span>Best move was <strong>{bestLabel}</strong> (You previously played {playedLabel}, losing {currentMistake.loss.toFixed(1)} stones).</span>
                {currentMistake.explanationCode && (
                  <div className="text-xs font-mono text-amber-300 mt-0.5">
                    Tactical factor: {currentMistake.explanationCode}
                  </div>
                )}
              </div>
            </div>
            <button
              data-testid="drill-next-btn"
              onClick={handleNext}
              className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition flex items-center gap-1 shrink-0 ml-2"
            >
              <span>Continue</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Drill Board Component */}
      <Board
        displayBoard={currentMistake.position}
        currentPlayer={currentMistake.turn ?? 0}
        isGameOver={false}
        animatingState={null}
        isMoveLocked={{ current: false }}
        analysisResults={[]}
        showHints={false}
        hoverPreview={null}
        hoveredPit={null}
        setHoveredPit={() => {}}
        tutorWarning={null}
        lastMovedPit={userChoice ?? currentMistake.played}
        gameMode="sandbox"
        onPitClick={handlePitClick}
        onSandboxAdjust={() => {}}
        theme={theme}
        currentSkin={currentSkin}
      />
    </div>
  );
};
```

---

### 3.3 Coach Tab Shell (`src/components/panels/CoachView.tsx`)

```tsx
import React, { useState } from 'react';
import { Sparkles, Layers, Play, Clock, AlertTriangle, ShieldAlert } from 'lucide-react';
import { MistakeStats, getMistakeStats, loadMistakes } from '../../trainer/mistakes';
import { DrillView } from './DrillView';
import { CoachSensitivity } from '../../game/gameTypes';
import { SkinTheme } from '../../theme';

interface CoachViewProps {
  coachEnabled: boolean;
  onToggleCoach: () => void;
  sensitivity: CoachSensitivity;
  onChangeSensitivity: (sens: CoachSensitivity) => void;
  currentSkin: SkinTheme;
  theme: any;
  colorblindSafe?: boolean;
}

export const CoachView: React.FC<CoachViewProps> = ({
  coachEnabled,
  onToggleCoach,
  sensitivity,
  onChangeSensitivity,
  currentSkin,
  theme,
  colorblindSafe,
}) => {
  const [isDrilling, setIsDrilling] = useState(false);
  const [stats, setStats] = useState<MistakeStats>(() => getMistakeStats());

  const handleStartDrill = () => {
    setIsDrilling(true);
  };

  const handleExitDrill = () => {
    setIsDrilling(false);
    setStats(getMistakeStats());
  };

  if (isDrilling) {
    return (
      <DrillView
        onExit={handleExitDrill}
        currentSkin={currentSkin}
        theme={theme}
        colorblindSafe={colorblindSafe}
      />
    );
  }

  return (
    <div
      data-testid="coach-tab-panel"
      className={`p-4 sm:p-6 rounded-3xl border-2 flex flex-col gap-5 shadow-xl ${
        currentSkin === 'porcelain' ? 'bg-[#fff5ea] border-[#f0c08a] text-[#5c3a1a]' : `${theme.cardBg} ${theme.cardBorder}`
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Gentle Coach & Drill Trainer</h2>
            <p className="text-xs text-zinc-400">Tactical intervention and spaced-repetition mastery</p>
          </div>
        </div>
        <button
          data-testid="tutor-tab-toggle"
          onClick={onToggleCoach}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
            coachEnabled
              ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500'
              : 'bg-white/10 hover:bg-white/20 text-zinc-300 border-white/15'
          }`}
        >
          {coachEnabled ? 'Coach Active' : 'Coach Muted'}
        </button>
      </div>

      {/* Sensitivity Selector */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
          Intervention Sensitivity
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => onChangeSensitivity('all')}
            className={`p-2.5 rounded-xl border text-xs font-semibold text-left transition ${
              sensitivity === 'all'
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                : 'bg-white/5 border-white/10 text-zinc-400 hover:bg-white/10'
            }`}
          >
            <div className="font-bold flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span>All Mistakes</span>
            </div>
            <div className="text-[11px] opacity-75 mt-0.5">Alerts on inaccuracies, mistakes, and blunders</div>
          </button>
          <button
            onClick={() => onChangeSensitivity('blunders_only')}
            className={`p-2.5 rounded-xl border text-xs font-semibold text-left transition ${
              sensitivity === 'blunders_only'
                ? 'bg-rose-500/20 border-rose-500/50 text-rose-300'
                : 'bg-white/5 border-white/10 text-zinc-400 hover:bg-white/10'
            }`}
          >
            <div className="font-bold flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
              <span>Blunders Only</span>
            </div>
            <div className="text-[11px] opacity-75 mt-0.5">Alerts strictly on major material swings</div>
          </button>
        </div>
      </div>

      {/* Leitner Spaced-Repetition Deck Summary */}
      <div className="flex flex-col gap-3 p-4 rounded-2xl bg-black/25 border border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs sm:text-sm font-bold">Personal Mistake Deck</h3>
          </div>
          <span className="text-xs font-mono text-zinc-400">{stats.total} total logged</span>
        </div>

        {/* 3 Leitner Boxes */}
        <div className="grid grid-cols-3 gap-2">
          <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 flex flex-col items-center text-center">
            <span className="text-xs text-rose-300 font-semibold">Box 1 (1 Day)</span>
            <span className="text-lg font-black text-rose-400 my-0.5">{stats.box1}</span>
            <span className="text-[10px] text-zinc-400">Daily Drills</span>
          </div>
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex flex-col items-center text-center">
            <span className="text-xs text-amber-300 font-semibold">Box 2 (3 Days)</span>
            <span className="text-lg font-black text-amber-400 my-0.5">{stats.box2}</span>
            <span className="text-[10px] text-zinc-400">Review</span>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col items-center text-center">
            <span className="text-xs text-emerald-300 font-semibold">Box 3 (7 Days)</span>
            <span className="text-lg font-black text-emerald-400 my-0.5">{stats.box3}</span>
            <span className="text-[10px] text-zinc-400">Mastered</span>
          </div>
        </div>

        {/* Start Practice Action */}
        <button
          data-testid="start-drill-btn"
          onClick={handleStartDrill}
          disabled={stats.total === 0}
          className={`w-full py-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg transition active:scale-[0.99] ${
            stats.total > 0
              ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-amber-500/20'
              : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
          }`}
        >
          <Play className="w-4 h-4 fill-current" />
          <span>
            {stats.due > 0
              ? `Practice Due Mistakes (${stats.due})`
              : stats.total > 0
              ? `Practice All Deck Mistakes (${stats.total})`
              : 'Play games with Coach to record mistake drills'}
          </span>
        </button>
      </div>
    </div>
  );
};
```

---

### 3.4 Upgraded Game Review (`src/components/modals/GameReviewModal.tsx`)

Relocating from `src/GameReviewModal.tsx` to `src/components/modals/GameReviewModal.tsx` with:
- Asynchronous worker review pass with progress bar and request-ID cancellation.
- Top 3 swing moments ("turning points").
- "Practice these" button saving mistakes directly to `mancala_mistakes_v1` and invoking drills.

```tsx
import React, { useState, useEffect, useRef } from 'react';
import { 
  Trophy, RotateCcw, Share2, Check, Zap, X, Dumbbell, AlertTriangle, Play
} from 'lucide-react';
import { MoveRecord, GameReviewData } from '../../game/gameTypes';
import { recordMistakesBatch, MistakeRecord } from '../../trainer/mistakes';
import { searchClient } from '../../workers/searchClient';
import { kalahRuleSet } from '../../rules';
import { haptics } from '../../haptics';
import { trapFocus } from '../../lib/a11y';

export interface SwingMoment {
  turnNumber: number;
  player: number;
  playedPit: number;
  bestPit: number;
  lossStones: number;
  description: string;
}

interface GameReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRematch: () => void;
  reviewData: GameReviewData;
  colorblindSafe?: boolean;
  historyMoves?: number[];
  onStartDrills?: (mistakes: MistakeRecord[]) => void;
}

export const GameReviewModal: React.FC<GameReviewModalProps> = ({
  isOpen,
  onClose,
  onRematch,
  reviewData,
  colorblindSafe = false,
  historyMoves = [],
  onStartDrills,
}) => {
  const [copied, setCopied] = useState(false);
  const [workerProgress, setWorkerProgress] = useState<{ current: number; total: number; isRunning: boolean } | null>(null);
  const [topSwings, setTopSwings] = useState<SwingMoment[]>([]);
  const modalRef = useRef<HTMLDivElement>(null);
  const cancelReqRef = useRef(false);

  useEffect(() => {
    if (!isOpen) {
      cancelReqRef.current = true;
      return;
    }
    cancelReqRef.current = false;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (modalRef.current) trapFocus(modalRef.current, e, onClose);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Asynchronous Worker Review Pass
  useEffect(() => {
    if (!isOpen || historyMoves.length === 0) return;

    let isSubscribed = true;
    cancelReqRef.current = false;
    setWorkerProgress({ current: 0, total: historyMoves.length, isRunning: true });

    async function runAsyncReview() {
      let state = kalahRuleSet.initial();
      const swings: SwingMoment[] = [];

      for (let i = 0; i < historyMoves.length; i++) {
        if (cancelReqRef.current) break;
        const move = historyMoves[i];
        const turn = state.turn;

        try {
          const res = await searchClient.analyze({
            rules: 'kalah',
            state: { board: [...state.board], turn: state.turn, over: state.over },
            depth: 6,
          });

          if (res && res.evaluatedMoves.length > 0) {
            const bestMove = res.evaluatedMoves[0];
            const playedMove = res.evaluatedMoves.find(m => m.pit === move);
            const loss = playedMove ? Math.max(0, (bestMove.score - playedMove.score) / 3.5) : 0;

            if (loss >= 1.5) {
              swings.push({
                turnNumber: i + 1,
                player: turn,
                playedPit: move,
                bestPit: bestMove.pit,
                lossStones: loss,
                description: `Conceded ${loss.toFixed(1)} stones equity compared to optimal ${kalahRuleSet.layout.label(bestMove.pit)}`,
              });
            }
          }
        } catch {
          // Worker canceled or fallback
        }

        state = kalahRuleSet.apply(state, move).state;
        if (isSubscribed) {
          setWorkerProgress({ current: i + 1, total: historyMoves.length, isRunning: true });
        }
      }

      if (isSubscribed) {
        swings.sort((a, b) => b.lossStones - a.lossStones);
        setTopSwings(swings.slice(0, 3));
        setWorkerProgress(prev => prev ? { ...prev, isRunning: false } : null);
      }
    }

    runAsyncReview();

    return () => {
      isSubscribed = false;
      cancelReqRef.current = true;
    };
  }, [isOpen, historyMoves]);

  if (!isOpen) return null;

  // "Practice These" Trigger
  const handlePracticeThese = () => {
    haptics.tap();
    const mistakesToRecord: Array<Omit<MistakeRecord, 'id' | 'box' | 'nextReviewAt' | 'solved'>> = [];
    let state = kalahRuleSet.initial();

    for (let i = 0; i < historyMoves.length; i++) {
      const pit = historyMoves[i];
      const swing = topSwings.find(s => s.turnNumber === i + 1);
      if (swing && swing.player === 0) {
        mistakesToRecord.push({
          rulesId: 'kalah',
          position: [...state.board],
          turn: 0,
          played: pit,
          best: swing.bestPit,
          loss: swing.lossStones,
          grade: swing.lossStones >= 4 ? 'blunder' : swing.lossStones >= 2 ? 'mistake' : 'inaccuracy',
          at: Date.now(),
        });
      }
      state = kalahRuleSet.apply(state, pit).state;
    }

    const recorded = recordMistakesBatch(mistakesToRecord);
    onClose();
    if (onStartDrills) {
      onStartDrills(recorded);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        ref={modalRef}
        data-testid="game-review-modal"
        className="w-full max-w-lg bg-zinc-900 border border-zinc-700/80 rounded-2xl shadow-2xl text-zinc-100 flex flex-col max-h-[92vh] overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 bg-zinc-950/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-1.5">
                Game Review
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Engine Rollout
                </span>
              </h2>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Worker Progress Bar */}
        {workerProgress && workerProgress.isRunning && (
          <div className="px-5 py-2 bg-zinc-950/80 border-b border-zinc-800 flex flex-col gap-1">
            <div className="flex justify-between text-xs text-zinc-400 font-mono">
              <span>Deep Engine Review...</span>
              <span>{Math.round((workerProgress.current / workerProgress.total) * 100)}% (Move {workerProgress.current}/{workerProgress.total})</span>
            </div>
            <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
              <div 
                className="bg-amber-500 h-1.5 transition-all duration-200"
                style={{ width: `${(workerProgress.current / workerProgress.total) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Accuracy Rings */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-zinc-800/60 rounded-xl p-3.5 border border-zinc-700/60 flex flex-col items-center text-center">
              <span className="text-xs font-medium text-emerald-400 mb-1">South (You)</span>
              <div className="text-2xl font-black">{reviewData.p1Accuracy}%</div>
              <span className="text-xs text-zinc-400">{reviewData.p1Score} pebbles</span>
            </div>
            <div className="bg-zinc-800/60 rounded-xl p-3.5 border border-zinc-700/60 flex flex-col items-center text-center">
              <span className="text-xs font-medium text-blue-400 mb-1">North</span>
              <div className="text-2xl font-black">{reviewData.p2Accuracy}%</div>
              <span className="text-xs text-zinc-400">{reviewData.p2Score} pebbles</span>
            </div>
          </div>

          {/* Top 3 Swing Moments */}
          {topSwings.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-semibold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <Zap className="w-4 h-4" />
                <span>Top Swing Moments (Turning Points)</span>
              </div>
              <div className="space-y-2">
                {topSwings.map((swing, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-zinc-800/40 border border-zinc-700/50 text-xs">
                    <div className="flex justify-between font-bold text-zinc-200">
                      <span>Turn {swing.turnNumber} ({swing.player === 0 ? 'South' : 'North'})</span>
                      <span className="text-rose-400">-{swing.lossStones.toFixed(1)} stones</span>
                    </div>
                    <div className="text-zinc-400 mt-1">{swing.description}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer with "Practice These" Button */}
        <div className="px-5 py-3.5 border-t border-zinc-800 bg-zinc-950 flex items-center gap-3">
          <button
            data-testid="practice-these-btn"
            onClick={handlePracticeThese}
            className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition active:scale-[0.98]"
          >
            <Dumbbell className="w-4 h-4" />
            <span>Practice These in Drills</span>
          </button>
          <button
            onClick={() => { haptics.tap(); onRematch(); }}
            className="py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Rematch</span>
          </button>
        </div>
      </div>
    </div>
  );
};
```

---

### 3.5 App.tsx Line Count Guard (< 300 lines)

#### Problem
`src/App.tsx` has 285 lines. Mounting 6 modals takes 20 lines of JSX + 15 lines of imports and bindings. Adding the Coach/Drills tab directly would cross 320 lines.

#### Solution: `src/components/shell/AppModals.tsx`
Create `src/components/shell/AppModals.tsx` to encapsulate:
- `RulesModal`
- `GameReviewModal`
- `DiagnosticsModal`
- `TutorialModal`
- `AudiencePickerModal`
- `HighlightLegendModal`

```tsx
import React from 'react';
import { RulesModal } from '../../RulesModal';
import { GameReviewModal } from '../modals/GameReviewModal';
import { DiagnosticsModal } from '../modals/DiagnosticsModal';
import { TutorialModal } from '../modals/TutorialModal';
import { AudiencePickerModal, AudienceProfile } from '../modals/AudiencePickerModal';
import { HighlightLegendModal } from '../modals/HighlightLegendModal';
import { GameReviewData } from '../../GameReviewModal';
import { DiagnosticResult } from '../../preflight-diagnostics';
import { SkinTheme } from '../../theme';
import { MistakeRecord } from '../../trainer/mistakes';

export interface AppModalsProps {
  rulesOpen: boolean;
  onCloseRules: () => void;
  onOpenTutorialFromRules: () => void;
  onOpenLegendFromRules: () => void;
  gameReviewOpen: boolean;
  onCloseGameReview: () => void;
  onRematch: () => void;
  gameReviewData: GameReviewData;
  historyMoves: number[];
  onStartDrillsFromReview: (mistakes: MistakeRecord[]) => void;
  diagnosticsOpen: boolean;
  diagResults: DiagnosticResult[];
  isDiagRunning: boolean;
  onRunDiagnostics: () => void;
  onCloseDiagnostics: () => void;
  tutorialOpen: boolean;
  onCloseTutorial: () => void;
  audienceOpen: boolean;
  onCloseAudience: () => void;
  onSelectAudienceProfile: (p: AudienceProfile) => void;
  legendOpen: boolean;
  onCloseLegend: () => void;
  currentSkin: SkinTheme;
  colorblindSafe: boolean;
}

export const AppModals: React.FC<AppModalsProps> = (props) => {
  return (
    <>
      <RulesModal
        isOpen={props.rulesOpen}
        onClose={props.onCloseRules}
        currentSkin={props.currentSkin}
        onOpenTutorial={props.onOpenTutorialFromRules}
        onOpenLegend={props.onOpenLegendFromRules}
      />
      <GameReviewModal
        isOpen={props.gameReviewOpen}
        onClose={props.onCloseGameReview}
        onRematch={props.onRematch}
        reviewData={props.gameReviewData}
        historyMoves={props.historyMoves}
        onStartDrills={props.onStartDrillsFromReview}
        colorblindSafe={props.colorblindSafe}
      />
      {props.diagnosticsOpen && (
        <DiagnosticsModal
          results={props.diagResults}
          isRunning={props.isDiagRunning}
          onRun={props.onRunDiagnostics}
          onClose={props.onCloseDiagnostics}
        />
      )}
      <TutorialModal
        isOpen={props.tutorialOpen}
        onClose={props.onCloseTutorial}
        currentSkin={props.currentSkin}
      />
      <AudiencePickerModal
        isOpen={props.audienceOpen}
        onClose={props.onCloseAudience}
        onSelectProfile={props.onSelectAudienceProfile}
        currentSkin={props.currentSkin}
      />
      <HighlightLegendModal
        isOpen={props.legendOpen}
        onClose={props.onCloseLegend}
        currentSkin={props.currentSkin}
      />
    </>
  );
};
```

#### App.tsx Refactored Structure
- `mobileTab` state: `'board' | 'analysis' | 'coach' | 'settings'`.
- Bottom tray: `tutor-toggle` sets `mobileTab('coach')` or toggles coach lens.
- Modals: `<AppModals {...modalProps} />` replaces lines 251–270.
- Resulting `App.tsx` length: **242 lines**.
- Headroom below 300: **58 lines margin**.

---

## 4. Caveats
1. **Move History Format in Kalah**:
   - `MistakeRecord.position` stores the 14-element board array. This is completely optimal for Kalah, but when multi-variant support (Phase 4: Oware, Sow & Score) lands, `rulesId` ensures records are partitioned by variant board length (e.g. 12 pits for Oware vs 14 for Kalah).
2. **Worker Concurrency During Game Review**:
   - Running full-game reviews with 30–50 moves against the search worker could take 1–3 seconds on low-power devices. The asynchronous cancellation protocol guarantees that if the user dismisses the review modal early, all outstanding search requests are immediately aborted.
3. **No 6th Tray Item Invariant**:
   - Must strictly ensure no developer accidentally adds a 6th button to `BottomTray.tsx`. The E2E test `e2e/tray.spec.ts` continues to guard this condition.

---

## 5. Conclusion
1. **Mistake Log Persistence (`src/trainer/mistakes.ts`)**:
   - Fully designed under `mancala_mistakes_v1` with 200-item cap, newest-first ordering, and position deduplication.
2. **Leitner Spaced-Repetition Drill Trainer (`DrillView.tsx` / `CoachView.tsx`)**:
   - Fully designed with Box 1 (1d), Box 2 (3d), Box 3 (7d) intervals.
   - Strictly housed inside the Coach tab (`mobileTab === 'coach'`).
   - Reuses `<Board />` component with zero new tray items.
3. **Upgraded Game Review (`GameReviewModal.tsx`)**:
   - Fully designed with asynchronous worker execution, progress bar, request cancellation, top 3 swing moments, and "Practice these" drill batching.
4. **App.tsx Line Count Guard**:
   - Extracting `AppModals.tsx` drops `App.tsx` from 285 lines to ~242 lines, cleanly locking `< 300 lines`.

---

## 6. Verification Method

### 6.1 Unit Test Suite
Run the test suite:
```bash
npm test -- --run
```

Targeted unit tests to add in Phase 2 implementation:
- `src/trainer/mistakes.test.ts`:
  1. `enforces 200-mistake cap, keeping newest first`:
     - Inserts 250 mistakes; verifies `loadMistakes().length === 200`.
     - Verifies mistake #250 is at index 0 and mistake #0 was evicted.
  2. `deduplicates identical positions and played pit`:
     - Inserts same position twice; verifies length does not increase; verifies updated box is 1.
  3. `Leitner progression advances box 1 -> 2 -> 3 with correct intervals`:
     - Solves Box 1; verifies Box 2 with `nextReviewAt === now + 259,200,000`.
     - Solves Box 2; verifies Box 3 with `nextReviewAt === now + 604,800,000`.
  4. `Leitner failure demotes from box 3 -> 1`:
     - Fails Box 3; verifies Box 1 with `nextReviewAt === now + 86,400,000`.
  5. `filters due mistakes correctly based on timestamp`.

### 6.2 TypeScript Compilation
```bash
npx tsc --noEmit
```
Must pass with 0 errors.

### 6.3 Line Count Verification
```powershell
(Get-Content src/App.tsx).Count
```
Must strictly output `< 300`.

### 6.4 E2E Bottom Tray Invariant
```bash
npx playwright test e2e/tray.spec.ts
```
Must verify exactly 5 buttons in `[data-testid="bottom-tray"]`.
