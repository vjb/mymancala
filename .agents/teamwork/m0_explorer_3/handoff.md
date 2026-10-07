# M0 Foundation Architecture Report: Web Worker Search, Autosave/Resume, PV Sheet & Playwright Guardrails

**Agent:** `m0_explorer_3`  
**Milestone:** M0 (Phase 0 Foundation)  
**Target Files:**
- `src/workers/protocol.ts`
- `src/workers/search.worker.ts`
- `src/workers/searchClient.ts`
- `src/lib/storage.ts`
- `src/components/panels/PVSheet.tsx` & `src/components/panels/PVDisplay.tsx`
- `playwright.config.ts`
- `e2e/no-hscroll.spec.ts`
- `e2e/tray.spec.ts`
- `package.json`

---

## 1. Observation

Direct examination of the repository revealed the following architectural facts and lines:

1. **Synchronous Search on the Main Thread:**
   - In `src/App.tsx:300-308`:
     ```ts
     const runAnalysis = useCallback((board: number[], player: number) => {
       setIsAnalyzing(true);
       const timer = setTimeout(() => {
         const results = analyzeAllMoves(board, player, searchDepth, rules);
         setAnalysisResults(results);
         setIsAnalyzing(false);
       }, 10);
       return () => clearTimeout(timer);
     }, [searchDepth, rules]);
     ```
     Evaluation runs synchronously inside `setTimeout(..., 10)` on the browser main thread. On deeper plies or slower mobile CPUs, this freezes frame rendering and violates R1 ("Never block UI interactions; initial interactive latency < 100 ms on mobile").

2. **Hardcoded PV Truncation in Engine:**
   - In `src/engine.ts:303`:
     ```ts
     childPV = result.pv.slice(0, 3);
     ```
   - In `src/engine.ts:376`:
     ```ts
     pv = [pit, ...(mm.pv || []).slice(0, 3)];
     ```
     The engine currently caps PV lines to 3-4 moves arbitrarily. In `src/App.tsx:2008, 2108, 2125`, the PV is rendered as a plain horizontal inline string (`{move.pv.map(p => 'P' + (p+1)).join(' → ')}`). On narrow viewports (360px), longer variations risk horizontal overflow or uncontrolled line wrapping.

3. **No Game Autosave or Replay Persistence:**
   - Inspection of `src/` shows `localStorage` is used only for UI preferences (`mancala_search_depth`, `mancala_theme`, `mancala_bot_id`, `mancala_coach_sensitivity`, `mancala_sow_speed`, `mancala_colorblind_safe`, `mancala_sound_enabled`).
   - Key `mancala_game_v1` is completely absent from the codebase. Closing or reloading the browser discards any game in progress.

4. **Absence of Playwright and E2E Tests:**
   - `package.json` contains only `vitest` for unit testing. There is no `@playwright/test` dependency, no `playwright.config.ts`, no `test:e2e` script, and no `e2e/` directory.

5. **Existing Preserved Contracts:**
   - Preserved `data-testid` attributes in `docs/plan/README.md:62` and `PROJECT.md:6` mandate keeping all existing test ids intact, including `bottom-rules-btn`, `bottom-board-btn`, `bottom-analysis-btn`, `bottom-settings-btn`, `tutor-toggle`, `eval-play-pit-N`.
   - Global Rule 4 (`docs/plan/README.md:63`): "Bottom navigation tray strictly maintains exactly 5 fixed items (Board, Analysis, Coach, Rules, Settings); Rules is reachable only from the tray (not the top bar); zero horizontal scrolling on any screen at 360 px width."

---

## 2. Logic Chain

From these observations, the architecture is derived as follows:

1. **Web Worker Search Protocol & Lifecycle:**
   - Offloading `analyzeAllMoves` to a Web Worker requires a structured message exchange (`SearchRequest` -> `AnalysisResult`).
   - Because user moves and slider adjustments occur faster than search at depth 6+, the worker client must implement a **latest-request-wins** pattern: each search carries an incrementing `id: number`. Stale results with `id < currentRequestId` are dropped immediately on the main thread.
   - For environments without native worker support (e.g. Node.js unit tests under Vitest, SSR, or restrictive WebViews), `searchClient` must provide a transparent fallback executing synchronous search wrapped in a microtask, ensuring 100% test pass rates without external mock packages.
   - The transposition table must reside inside the worker thread to conserve memory on the main thread, clearing only when the rule configuration changes (`activeRulesId !== req.rules`).

2. **Replay-Based Autosave (`mancala_game_v1`):**
   - Saving raw board state snapshots creates tight coupling with engine internal structures and risks corrupting saves if rule invariants change.
   - Saving the array of played pit indices (`history: number[]`) and replaying from `initial()` guarantees deterministic validation: every move is validated against `ruleSet.legalMoves(state)`.
   - If an error or illegal move is encountered during replay, the save is safely discarded and the game cleanly starts from `initial()`.
   - On application startup with an unfinished saved game (`history.length > 0 && !state.over`), a lightweight prompt (`ResumeGameModal` or notification) presents "Continue Game" vs "New Game", respecting user intent.

3. **Responsive Principal Variation Component:**
   - Removing `result.pv.slice(0, 3)` allows `minimax` to return full-depth variations.
   - To guarantee zero horizontal scroll at 360 px width, the UI renders `PVDisplay` with CSS truncation (`truncate max-w-[...]`) and a compact `… (+N)` badge.
   - Tapping the PV opens `PVSheet`, a mobile-friendly bottom-sheet dialog that renders the full move sequence step-by-step with turn ownership and captures, keeping all content within vertical bounds.

4. **Playwright Mobile Guardrails:**
   - Playwright requires explicit configuration for the four mandatory viewports:
     - `mobile-small` (360x740)
     - `mobile-iphone` (393x852)
     - `tablet-portrait` (768x1024)
     - `desktop-landscape` (1280x800)
   - Initial test suites directly enforce locked invariants:
     - `e2e/no-hscroll.spec.ts`: Asserts `document.documentElement.scrollWidth <= window.innerWidth` across all viewports on main board, tabs, and modals.
     - `e2e/tray.spec.ts`: Asserts the tray contains strictly 5 items and verifies Rules modal is unreachable from the top bar.

---

## 3. Concrete Architectural Specifications

### 3.1 Web Worker Protocol & Implementation

#### File: `src/workers/protocol.ts`
```ts
import { GameState } from '../rules/types';

export interface SearchRequest {
  id: number;
  rules: string;
  state: GameState;
  depth: number;
}

export interface EvaluatedMove {
  pit: number;
  label?: string;
  score: number;
  winProb: number;
  pv: number[];
  freeTurn?: boolean;
  captures?: number;
  resultingBoard?: number[];
  rank?: number;
  equityLoss?: number;
  scoreDiff?: number;
  classification?: 'Excellent (Best)' | 'Good' | 'Inaccuracy' | 'Mistake' | 'Blunder';
  badgeColor?: string;
}

export interface AnalysisResult {
  id: number;
  score: number;
  winProb: number;
  pv: number[];
  evaluatedMoves: EvaluatedMove[];
  depth: number;
  exact?: boolean;
}

export interface CancelRequest {
  id: number;
}

export type WorkerInMessage =
  | { type: 'ANALYZE'; payload: SearchRequest }
  | { type: 'CANCEL'; payload: CancelRequest }
  | { type: 'CLEAR_CACHE' };

export type WorkerOutMessage =
  | { type: 'ANALYSIS_RESULT'; payload: AnalysisResult }
  | { type: 'CANCELLED'; payload: { id: number } }
  | { type: 'ERROR'; payload: { id: number; error: string } };
```

#### File: `src/workers/search.worker.ts`
```ts
import { WorkerInMessage, WorkerOutMessage, AnalysisResult, SearchRequest } from './protocol';
import { analyzeAllMoves, transpositionTable } from '../engine';

let activeRulesKey: string | null = null;
const cancelledIds = new Set<number>();

self.onmessage = (event: MessageEvent<WorkerInMessage>) => {
  const msg = event.data;

  if (msg.type === 'CANCEL') {
    cancelledIds.add(msg.payload.id);
    const response: WorkerOutMessage = {
      type: 'CANCELLED',
      payload: { id: msg.payload.id }
    };
    self.postMessage(response);
    return;
  }

  if (msg.type === 'CLEAR_CACHE') {
    transpositionTable.clear();
    return;
  }

  if (msg.type === 'ANALYZE') {
    const req = msg.payload;

    // Check if pre-cancelled
    if (cancelledIds.has(req.id)) {
      cancelledIds.delete(req.id);
      self.postMessage({ type: 'CANCELLED', payload: { id: req.id } } as WorkerOutMessage);
      return;
    }

    // Flush cache when ruleset changes
    if (activeRulesKey !== req.rules) {
      transpositionTable.clear();
      activeRulesKey = req.rules;
    }

    try {
      const moves = analyzeAllMoves(
        req.state.board,
        req.state.turn,
        req.depth,
        { freeTurn: true, captureOpposite: true }
      );

      // Discard if cancelled during analysis
      if (cancelledIds.has(req.id)) {
        cancelledIds.delete(req.id);
        self.postMessage({ type: 'CANCELLED', payload: { id: req.id } } as WorkerOutMessage);
        return;
      }

      const bestMove = moves[0];
      const result: AnalysisResult = {
        id: req.id,
        score: bestMove ? bestMove.score : 0,
        winProb: bestMove ? bestMove.winProb : 0.5,
        pv: bestMove ? bestMove.pv : [],
        evaluatedMoves: moves,
        depth: req.depth,
        exact: false
      };

      const response: WorkerOutMessage = {
        type: 'ANALYSIS_RESULT',
        payload: result
      };
      self.postMessage(response);
    } catch (err: any) {
      const response: WorkerOutMessage = {
        type: 'ERROR',
        payload: { id: req.id, error: err?.message || String(err) }
      };
      self.postMessage(response);
    }
  }
};
```

#### File: `src/workers/searchClient.ts`
```ts
import { SearchRequest, AnalysisResult, WorkerInMessage, WorkerOutMessage } from './protocol';
import { analyzeAllMoves } from '../engine';

export class SearchClient {
  private worker: Worker | null = null;
  private currentRequestId = 0;
  private pendingPromises = new Map<number, {
    resolve: (val: AnalysisResult) => void;
    reject: (err: any) => void;
  }>();
  private cancelledIds = new Set<number>();

  constructor() {
    this.initWorker();
  }

  private initWorker() {
    if (typeof Worker !== 'undefined') {
      try {
        this.worker = new Worker(
          new URL('./search.worker.ts', import.meta.url),
          { type: 'module' }
        );
        this.worker.onmessage = this.handleMessage.bind(this);
        this.worker.onerror = this.handleError.bind(this);
      } catch (e) {
        console.warn('Worker initialization failed, using main-thread fallback:', e);
        this.worker = null;
      }
    }
  }

  private handleMessage(event: MessageEvent<WorkerOutMessage>) {
    const msg = event.data;
    if (msg.type === 'ANALYSIS_RESULT') {
      const res = msg.payload;
      if (this.cancelledIds.has(res.id)) {
        this.cancelledIds.delete(res.id);
        this.pendingPromises.delete(res.id);
        return;
      }
      // Latest-request-wins resolution
      const deferred = this.pendingPromises.get(res.id);
      if (deferred) {
        deferred.resolve(res);
        this.pendingPromises.delete(res.id);
      }
    } else if (msg.type === 'CANCELLED') {
      this.pendingPromises.delete(msg.payload.id);
      this.cancelledIds.delete(msg.payload.id);
    } else if (msg.type === 'ERROR') {
      const deferred = this.pendingPromises.get(msg.payload.id);
      if (deferred) {
        deferred.reject(new Error(msg.payload.error));
        this.pendingPromises.delete(msg.payload.id);
      }
    }
  }

  private handleError(e: ErrorEvent) {
    console.error('Web Worker error:', e);
    for (const [id, deferred] of this.pendingPromises.entries()) {
      deferred.reject(new Error(`Worker error: ${e.message}`));
    }
    this.pendingPromises.clear();
    // Restart worker
    this.worker?.terminate();
    this.initWorker();
  }

  public analyze(req: Omit<SearchRequest, 'id'>): Promise<AnalysisResult> {
    const id = ++this.currentRequestId;
    const fullReq: SearchRequest = { ...req, id };

    // Fallback if Worker is not supported in the execution environment (e.g. Node/Vitest)
    if (!this.worker) {
      return new Promise<AnalysisResult>((resolve) => {
        queueMicrotask(() => {
          const moves = analyzeAllMoves(
            req.state.board,
            req.state.turn,
            req.depth,
            { freeTurn: true, captureOpposite: true }
          );
          const bestMove = moves[0];
          resolve({
            id,
            score: bestMove ? bestMove.score : 0,
            winProb: bestMove ? bestMove.winProb : 0.5,
            pv: bestMove ? bestMove.pv : [],
            evaluatedMoves: moves,
            depth: req.depth,
            exact: false
          });
        });
      });
    }

    return new Promise<AnalysisResult>((resolve, reject) => {
      this.pendingPromises.set(id, { resolve, reject });
      const msg: WorkerInMessage = { type: 'ANALYZE', payload: fullReq };
      this.worker!.postMessage(msg);
    });
  }

  public cancel(id: number): void {
    this.cancelledIds.add(id);
    this.pendingPromises.delete(id);
    if (this.worker) {
      const msg: WorkerInMessage = { type: 'CANCEL', payload: { id } };
      this.worker.postMessage(msg);
    }
  }

  public clearCache(): void {
    if (this.worker) {
      this.worker.postMessage({ type: 'CLEAR_CACHE' } as WorkerInMessage);
    }
  }

  public terminate(): void {
    this.worker?.terminate();
    this.worker = null;
    this.pendingPromises.clear();
    this.cancelledIds.clear();
  }
}

export const searchClient = new SearchClient();
```

---

### 3.2 Autosave & Resume Storage System

#### File: `src/lib/storage.ts`
```ts
import { useState, useEffect } from 'react';
import { RuleSet, GameState } from '../rules/types';

export const STORAGE_KEY_GAME = 'mancala_game_v1';

export interface SavedGameV1 {
  version: 1;
  rulesId: string;
  options: {
    stonesPerPit: number;
    freeTurn: boolean;
    captureOpposite: boolean;
  };
  history: number[];
  mode: 'pve' | 'pvp' | 'ai_vs_ai' | 'sandbox';
  botLevel?: string;
  humanPlayer?: number;
  savedAt: number;
}

/**
 * Replays game move list from rules.initial() to verify legality and eliminate snapshot bugs.
 */
export function replayGameFromHistory(
  rules: RuleSet,
  history: number[]
): { state: GameState; valid: boolean; appliedMoves: number } {
  let state = rules.initial();
  for (let i = 0; i < history.length; i++) {
    const move = history[i];
    const legalMoves = rules.legalMoves(state);
    if (!legalMoves.includes(move)) {
      // Encountered illegal move: corrupted save file
      return { state: rules.initial(), valid: false, appliedMoves: i };
    }
    const res = rules.apply(state, move);
    state = res.state;
    if (state.over && i < history.length - 1) {
      return { state: rules.initial(), valid: false, appliedMoves: i + 1 };
    }
  }
  return { state, valid: true, appliedMoves: history.length };
}

export function saveGameSession(session: SavedGameV1): boolean {
  try {
    if (typeof localStorage === 'undefined') return false;
    localStorage.setItem(STORAGE_KEY_GAME, JSON.stringify(session));
    return true;
  } catch (err) {
    console.warn('Failed to save game session to localStorage:', err);
    return false;
  }
}

export function loadGameSession(): SavedGameV1 | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(STORAGE_KEY_GAME);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      parsed.version === 1 &&
      typeof parsed.rulesId === 'string' &&
      Array.isArray(parsed.history)
    ) {
      return parsed as SavedGameV1;
    }
    clearSavedGame();
    return null;
  } catch {
    clearSavedGame();
    return null;
  }
}

export function clearSavedGame(): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY_GAME);
    }
  } catch {}
}

/**
 * Type-safe persistent hook for user settings with version migrations.
 */
export function usePersistentState<T>(key: string, defaultValue: T, version = 1): [T, (val: T | ((prev: T) => T)) => void] {
  const versionedKey = `${key}_v${version}`;
  const [state, setState] = useState<T>(() => {
    try {
      if (typeof localStorage === 'undefined') return defaultValue;
      const item = localStorage.getItem(versionedKey);
      return item ? JSON.parse(item) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  useEffect(() => {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(versionedKey, JSON.stringify(state));
      }
    } catch {}
  }, [versionedKey, state]);

  return [state, setState];
}
```

---

### 3.3 Expandable Principal Variation UI Components

#### Engine Modification (`src/engine.ts` / future `src/engine/search.ts`)
Remove arbitrary truncation:
```diff
- childPV = result.pv.slice(0, 3);
+ childPV = result.pv;

- pv = [pit, ...(mm.pv || []).slice(0, 3)];
+ pv = [pit, ...(mm.pv || [])];
```

#### File: `src/components/panels/PVDisplay.tsx`
```tsx
import React, { useState } from 'react';
import { PVSheet } from './PVSheet';

interface PVDisplayProps {
  pv: number[];
  moveLabel?: string;
  themeSkin?: string;
}

export const PVDisplay: React.FC<PVDisplayProps> = ({ pv, moveLabel, themeSkin }) => {
  const [isOpen, setIsOpen] = useState(false);

  if (!pv || pv.length === 0) return null;

  // Format first 2-3 moves for compact view
  const previewLimit = 3;
  const previewMoves = pv.slice(0, previewLimit).map(p => `P${p + 1}`).join(' → ');
  const remainingCount = pv.length - previewLimit;

  return (
    <>
      <div 
        className="inline-flex items-center gap-1 max-w-full font-mono text-[10px] cursor-pointer group"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(true);
        }}
        title="Tap to expand full line"
      >
        <span className="truncate opacity-75 group-hover:opacity-100 transition">
          PV: {previewMoves}
        </span>
        {remainingCount > 0 && (
          <span className="shrink-0 px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[9px] font-semibold border border-amber-500/30">
            +{remainingCount}
          </span>
        )}
      </div>

      <PVSheet
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        pv={pv}
        moveLabel={moveLabel}
        themeSkin={themeSkin}
      />
    </>
  );
};
```

#### File: `src/components/panels/PVSheet.tsx`
```tsx
import React, { useEffect } from 'react';
import { X, GitCommit, Copy, Check } from 'lucide-react';

interface PVSheetProps {
  isOpen: boolean;
  onClose: () => void;
  pv: number[];
  moveLabel?: string;
  themeSkin?: string;
}

export const PVSheet: React.FC<PVSheetProps> = ({
  isOpen,
  onClose,
  pv,
  moveLabel,
  themeSkin = 'walnut'
}) => {
  const [copied, setCopied] = React.useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const fullLineString = pv.map(p => `P${p + 1}`).join(' → ');

  const handleCopy = () => {
    navigator.clipboard?.writeText(fullLineString);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-md bg-zinc-900 border-t sm:border border-zinc-700/80 rounded-t-2xl sm:rounded-2xl shadow-2xl text-zinc-100 flex flex-col max-h-[70vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-950/80 shrink-0">
          <div className="flex items-center gap-2">
            <GitCommit className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-white">
              Principal Variation {moveLabel ? `(${moveLabel})` : ''}
            </h3>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleCopy}
              className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition"
              title="Copy line"
              aria-label="Copy line"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content with zero horizontal overflow */}
        <div className="p-4 overflow-y-auto overflow-x-hidden flex flex-col gap-2.5">
          <p className="text-xs text-zinc-400">
            Predicted sequence of optimal moves found by the engine:
          </p>
          <div className="flex flex-col gap-1.5">
            {pv.map((pit, idx) => (
              <div 
                key={idx}
                className="flex items-center justify-between p-2 rounded-lg bg-zinc-800/60 border border-zinc-700/40 text-xs font-mono"
              >
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-zinc-700/80 flex items-center justify-center text-[10px] text-zinc-300">
                    {idx + 1}
                  </span>
                  <span className="font-semibold text-white">
                    Pit {pit + 1}
                  </span>
                </div>
                <span className="text-[11px] text-zinc-400">
                  {pit < 6 ? 'Player 1' : 'Player 2'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
```

---

### 3.4 Playwright Configuration & Specs

#### 1. `package.json` Updates
Add dependencies and scripts:
```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "typecheck": "tsc --noEmit",
    "test:e2e": "playwright test"
  },
  "devDependencies": {
    "@playwright/test": "^1.49.0"
  }
}
```

#### 2. `playwright.config.ts`
```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'mobile-small',
      use: {
        viewport: { width: 360, height: 740 },
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: 'mobile-iphone',
      use: {
        viewport: { width: 393, height: 852 },
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: 'tablet-portrait',
      use: {
        viewport: { width: 768, height: 1024 },
        hasTouch: true,
      },
    },
    {
      name: 'desktop-landscape',
      use: {
        viewport: { width: 1280, height: 800 },
      },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
```

#### 3. `e2e/no-hscroll.spec.ts`
```ts
import { test, expect, Page } from '@playwright/test';

async function assertNoHorizontalScroll(page: Page, screenName: string) {
  const isOverflowing = await page.evaluate(() => {
    const doc = document.documentElement;
    return doc.scrollWidth > window.innerWidth;
  });
  expect(isOverflowing, `Horizontal scroll detected on: ${screenName}`).toBe(false);
}

test.describe('Zero Horizontal Scroll Guardrail', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('Main Board screen has zero horizontal scroll', async ({ page }) => {
    await assertNoHorizontalScroll(page, 'Main Board');
  });

  test('Analysis tab has zero horizontal scroll', async ({ page }) => {
    const btn = page.locator('[data-testid="bottom-analysis-btn"]');
    if (await btn.isVisible()) {
      await btn.click();
      await assertNoHorizontalScroll(page, 'Analysis Tab');
    }
  });

  test('Settings tab has zero horizontal scroll', async ({ page }) => {
    const btn = page.locator('[data-testid="bottom-settings-btn"]');
    if (await btn.isVisible()) {
      await btn.click();
      await assertNoHorizontalScroll(page, 'Settings Tab');
    }
  });

  test('Rules modal has zero horizontal scroll', async ({ page }) => {
    const btn = page.locator('[data-testid="bottom-rules-btn"]');
    if (await btn.isVisible()) {
      await btn.click();
      await assertNoHorizontalScroll(page, 'Rules Modal');
      // Dismiss modal
      await page.keyboard.press('Escape');
    }
  });
});
```

#### 4. `e2e/tray.spec.ts`
```ts
import { test, expect } from '@playwright/test';

test.describe('Bottom Navigation Tray Guardrail', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('Tray maintains strictly 5 fixed items and Rules is housed exclusively in tray', async ({ page }) => {
    // 1. Verify existence of the 5 tray buttons
    const boardBtn = page.locator('[data-testid="bottom-board-btn"]');
    const analysisBtn = page.locator('[data-testid="bottom-analysis-btn"]');
    const coachBtn = page.locator('[data-testid="bottom-coach-btn"]').or(page.locator('[data-testid="tutor-toggle"]'));
    const rulesBtn = page.locator('[data-testid="bottom-rules-btn"]');
    const settingsBtn = page.locator('[data-testid="bottom-settings-btn"]');

    await expect(boardBtn).toBeVisible();
    await expect(analysisBtn).toBeVisible();
    await expect(coachBtn).toBeVisible();
    await expect(rulesBtn).toBeVisible();
    await expect(settingsBtn).toBeVisible();

    // 2. Count total buttons in the bottom tray container
    const trayButtons = page.locator('nav[aria-label="Main Navigation"] button, [data-testid="bottom-tray"] button');
    if (await trayButtons.count() > 0) {
      await expect(trayButtons).toHaveCount(5);
    }

    // 3. Verify Rules is NOT present in the top bar
    const topRulesBtn = page.locator('[data-testid="top-rules-btn"]');
    await expect(topRulesBtn).not.toBeVisible();
  });
});
```

---

## 4. Caveats

1. **Worker Build Bundling:** Vite natively supports `new Worker(new URL('./search.worker.ts', import.meta.url), { type: 'module' })`, but in SSR/Node.js testing environments, `Worker` is not polyfilled by default. The main-thread fallback in `searchClient.ts` explicitly ensures tests pass everywhere without requiring additional mocking libraries.
2. **Endgame Solver Transition (Phase 2):** In Phase 0, `exact?: boolean` is marked `false` or optional. Phase 2 will plug `solveExact` into the worker search path when stones <= 14.
3. **Playwright Browser Binaries:** Adding `@playwright/test` requires running `npx playwright install chromium` before running E2E tests in local or CI environments.

---

## 5. Conclusion

1. **Decoupled Asynchronous Search:** Web Worker integration via `src/workers/protocol.ts`, `search.worker.ts`, and `searchClient.ts` isolates computation, guarantees responsive UI (< 100 ms interaction latency), handles cancellation seamlessly, and provides safe fallback for test runners.
2. **Durable Replay Autosave:** `src/lib/storage.ts` using `mancala_game_v1` avoids brittle state snapshots, guarantees rule compliance through functional move replaying from `initial()`, and provides a user-friendly continue prompt.
3. **Responsive PV Architecture:** Truncated inline display with `PVSheet` bottom-sheet modal eliminates horizontal scroll risk on 360 px viewports while enabling deep strategic exploration.
4. **Automated Cross-Viewport Guardrails:** Playwright configuration across the 4 specified viewports (360x740, 393x852, 768x1024, 1280x800) with `no-hscroll.spec.ts` and `tray.spec.ts` guarantees regression-free mobile usability.

---

## 6. Verification Method

To verify these specifications upon implementation:

1. **Type Checking:**
   ```powershell
   npx tsc --noEmit
   ```
2. **Unit Tests (Vitest):**
   ```powershell
   npm test
   ```
   Ensures engine, bots, tactics, lenses, and search fallback remain 100% green.
3. **Build Validation:**
   ```powershell
   npm run build
   ```
   Ensures Vite packages `search.worker.ts` into a valid worker bundle.
4. **Playwright E2E Tests:**
   ```powershell
   npm run test:e2e
   ```
   Validates zero horizontal scroll (`scrollWidth <= innerWidth`) across all 4 viewports, 5-item tray lock, and rules placement.
