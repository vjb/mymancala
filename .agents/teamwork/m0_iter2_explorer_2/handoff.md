# Architectural Analysis Report: Search Worker Custom Rules, Auto-Cancellation & Re-Analysis

**Investigator**: `m0_iter2_explorer_2` (Roles: teamwork_preview_explorer)  
**Target Focus**: Search worker custom rules support, auto-cancellation on rapid moves, and re-analysis on rules toggle.  
**Working Directory**: `c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m0_iter2_explorer_2`  
**Parent Orchestrator ID**: `85856d3d-5ca8-4fac-8578-3161a39fe3a5`  

---

## 1. Observation

### 1.1 Direct Code Inspection

1. **`src/workers/protocol.ts:6-11`**:
   `SearchRequest` only accepts `rules: string` without any rules configuration parameter:
   ```ts
   export interface SearchRequest {
     id: number;
     rules: string;
     state: GameState;
     depth: number;
   }
   ```
   No options (e.g. `rulesOptions` or `RulesConfig`) are exposed in the worker message contract.

2. **`src/workers/search.worker.ts:35-47`**:
   The worker cache key and rule set retrieval strictly use `req.rules`:
   ```ts
   if (activeRulesKey !== req.rules) {
     transpositionTable.clear();
     activeRulesKey = req.rules;
   }

   try {
     const ruleSet = getRuleSet(req.rules);
     const moves = analyzeAllMoves(
       req.state.board,
       req.state.turn,
       req.depth,
       ruleSet
     );
   ```
   `getRuleSet('kalah')` in `src/rules/index.ts:11-17` resolves to `kalahRuleSet`, which is instantiated with default options (`freeTurn: true, captureOpposite: true`). Any custom Kalah rule settings chosen by the player (e.g., in `SettingsPanel.tsx`) are completely ignored during worker search evaluation. Furthermore, toggling rules does not clear the worker's `transpositionTable`.

3. **`src/rules/index.ts:7-17`**:
   `getRuleSet` takes only an `id: string` parameter and returns `RuleSet`:
   ```ts
   export const RULESET_REGISTRY: Record<string, () => RuleSet> = {
     kalah: () => kalahRuleSet,
   };

   export function getRuleSet(id: string): RuleSet {
     const factory = RULESET_REGISTRY[id];
     if (!factory) {
       return kalahRuleSet;
     }
     return factory();
   }
   ```
   `createKalahRuleSet(options?: KalahOptions)` exists in `src/rules/kalah.ts:56-60`, but cannot be invoked through `getRuleSet`.

4. **`src/workers/searchClient.ts:71-109`**:
   `searchClient.analyze` issues sequential request IDs, but does NOT cancel previous in-flight requests:
   ```ts
   public analyze(req: Omit<SearchRequest, 'id'>): Promise<AnalysisResult> {
     const id = ++this.currentRequestId;
     const fullReq: SearchRequest = { ...req, id };
     ...
     return new Promise<AnalysisResult>((resolve, reject) => {
       this.pendingPromises.set(id, { resolve, reject });
       const msg: WorkerInMessage = { type: 'ANALYZE', payload: fullReq };
       this.worker!.postMessage(msg);
     });
   }
   ```
   If a user makes rapid moves (e.g. Move A then Move B within 200 ms), the worker will still spend CPU cycles evaluating Move A to completion before starting Move B, because Move A was never cancelled.

5. **`src/game/useGame.ts:187-217`**:
   In `useGame.ts`, the search `useEffect` hardcodes `rules: 'kalah'` without passing `state.rules`, and omits `state.rules` from its dependency array:
   ```ts
   // Asynchronous Search via Web Worker Client
   useEffect(() => {
     if (state.isGameOver) {
       setAnalysisResults([]);
       return;
     }

     let isSubscribed = true;
     setIsAnalyzing(true);

     searchClient.analyze({
       rules: 'kalah',
       state: {
         board: state.board,
         turn: state.currentPlayer as 0 | 1,
         over: state.isGameOver
       },
       depth: state.searchDepth
     }).then(res => {
       if (isSubscribed) {
         setAnalysisResults(res.evaluatedMoves);
         setIsAnalyzing(false);
       }
     }).catch(err => {
       console.warn('Worker search error:', err);
       if (isSubscribed) setIsAnalyzing(false);
     });

     return () => {
       isSubscribed = false;
     };
   }, [state.board, state.currentPlayer, state.isGameOver, state.searchDepth]);
   ```
   Additionally, the cleanup function only sets `isSubscribed = false` and does not call `searchClient.cancel(requestId)`.

6. **`src/workers/searchClient.adversarial.test.ts:52-76`**:
   Existing adversarial tests launch concurrent storms of 25 unawaited queries on a single client instance:
   ```ts
   for (let i = 0; i < 25; i++) {
     const promise = client.analyze({ rules: 'kalah', state, depth: 1 });
     const id = client.getCurrentRequestId();
     if (i % 2 === 0) client.cancel(id);
     else activePromises.push({ id, promise });
   }
   const resolvedResults = await Promise.all(activePromises.map(item => item.promise));
   ```
   If `analyze()` unconditionally auto-cancelled the previous request by default without an opt-out mechanism, every odd query would be cancelled by the subsequent even query, and `Promise.all` would hang indefinitely.

---

## 2. Logic Chain

1. **Custom Rules Propagation**:
   - `state.rules` (`{ freeTurn: boolean; captureOpposite: boolean }`) is modified when the user toggles rule checkboxes in Settings (`SettingsPanel.tsx:323-341` dispatching `SET_RULES`).
   - Adding `rulesOptions?: RulesConfig` to `SearchRequest` in `src/workers/protocol.ts` provides a strongly typed, structured cloneable channel for sending custom rules to the worker.
   - Updating `getRuleSet(id: string, options?: KalahOptions): RuleSet` in `src/rules/index.ts` allows both `search.worker.ts` and the main-thread fallback in `searchClient.ts` to instantiate `createKalahRuleSet(options)` when `id === 'kalah'`.
   - Modifying `search.worker.ts` to compute a composite cache key (e.g. `${req.rules}_ft${ft}_co${co}`) guarantees that the worker's `transpositionTable` is wiped when rules change, preventing stale heuristic scores.

2. **Re-Analysis Triggering**:
   - Adding `state.rules` to the dependency array in `src/game/useGame.ts:217` ensures React immediately triggers a new background search whenever rules are toggled.
   - Passing `rulesOptions: state.rules` in `searchClient.analyze` ensures the engine evaluates moves under the active variant rules (e.g. no extra turns if `freeTurn === false`).

3. **Auto-Cancellation Architecture & Rapid Moves**:
   - On rapid consecutive moves, the game board transitions to a new state while the previous search is still pending in the worker.
   - Two layers of cancellation are required:
     - **Layer 1 (React Lifecycle)**: `useEffect` cleanup in `useGame.ts` should capture `searchClient.getCurrentRequestId()` and call `searchClient.cancel(reqId)` on cleanup. This immediately issues a `CANCEL` message the instant React re-renders.
     - **Layer 2 (Client Level)**: `searchClient.analyze` should track `activeRequestId`. By default (`autoCancel: true`), if `activeRequestId` is pending, it automatically cancels the obsolete request before creating the new one.
   - **Critical Compatibility Requirement**: To avoid breaking concurrent stress tests in `searchClient.adversarial.test.ts`, `autoCancel` should be configurable (`options?: { autoCancel?: boolean } = { autoCancel: true }`). Callers that intentionally run multi-request storms can pass `{ autoCancel: false }`.

---

## 3. Concrete Implementation Proposals

### Proposal 1: `src/workers/protocol.ts`
Re-export `RulesConfig` from `../engine` and add `rulesOptions?: RulesConfig` to `SearchRequest`:

```ts
// src/workers/protocol.ts
import { GameState } from '../rules/types';
import { EvaluatedMove, RulesConfig } from '../engine';

export type { EvaluatedMove, RulesConfig };

export interface SearchRequest {
  id: number;
  rules: string;
  rulesOptions?: RulesConfig;
  state: GameState;
  depth: number;
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

---

### Proposal 2: `src/rules/index.ts`
Enable `getRuleSet` to instantiate custom `KalahOptions`:

```ts
// src/rules/index.ts
export * from './types';
export * from './kalah';

import { RuleSet } from './types';
import { kalahRuleSet, createKalahRuleSet, KalahOptions } from './kalah';

export const RULESET_REGISTRY: Record<string, () => RuleSet> = {
  kalah: () => kalahRuleSet,
};

export function getRuleSet(id: string, options?: KalahOptions): RuleSet {
  if (id === 'kalah' && options) {
    return createKalahRuleSet(options);
  }
  const factory = RULESET_REGISTRY[id];
  if (!factory) {
    return kalahRuleSet;
  }
  return factory();
}
```

---

### Proposal 3: `src/workers/search.worker.ts`
Incorporate `req.rulesOptions` into `activeRulesKey` cache clearing and pass options to `getRuleSet`:

```ts
// src/workers/search.worker.ts
import { WorkerInMessage, WorkerOutMessage, AnalysisResult } from './protocol';
import { analyzeAllMoves, transpositionTable } from '../engine';
import { getRuleSet } from '../rules';

function getRulesCacheKey(rules: string, options?: { freeTurn?: boolean; captureOpposite?: boolean }): string {
  if (!options) return rules;
  return `${rules}_ft${options.freeTurn !== false ? 1 : 0}_co${options.captureOpposite !== false ? 1 : 0}`;
}

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

    if (cancelledIds.has(req.id)) {
      cancelledIds.delete(req.id);
      self.postMessage({ type: 'CANCELLED', payload: { id: req.id } } as WorkerOutMessage);
      return;
    }

    const rulesKey = getRulesCacheKey(req.rules, req.rulesOptions);
    if (activeRulesKey !== rulesKey) {
      transpositionTable.clear();
      activeRulesKey = rulesKey;
    }

    try {
      const ruleSet = getRuleSet(req.rules, req.rulesOptions);
      const moves = analyzeAllMoves(
        req.state.board,
        req.state.turn,
        req.depth,
        ruleSet
      );

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

---

### Proposal 4: `src/workers/searchClient.ts`
Implement `activeRequestId` tracking, configurable `autoCancel` (default: `true`), and pass `req.rulesOptions` in main-thread fallback:

```ts
// src/workers/searchClient.ts
import { SearchRequest, AnalysisResult, WorkerInMessage, WorkerOutMessage } from './protocol';
import { analyzeAllMoves } from '../engine';
import { getRuleSet } from '../rules';

export interface AnalyzeOptions {
  autoCancel?: boolean;
}

export class SearchClient {
  private worker: Worker | null = null;
  private currentRequestId = 0;
  private activeRequestId: number | null = null;
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
      if (this.activeRequestId === res.id) {
        this.activeRequestId = null;
      }
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
      if (this.activeRequestId === msg.payload.id) {
        this.activeRequestId = null;
      }
      this.pendingPromises.delete(msg.payload.id);
      this.cancelledIds.delete(msg.payload.id);
    } else if (msg.type === 'ERROR') {
      if (this.activeRequestId === msg.payload.id) {
        this.activeRequestId = null;
      }
      const deferred = this.pendingPromises.get(msg.payload.id);
      if (deferred) {
        deferred.reject(new Error(msg.payload.error));
        this.pendingPromises.delete(msg.payload.id);
      }
    }
  }

  private handleError(e: ErrorEvent) {
    console.error('Web Worker error:', e);
    for (const [, deferred] of this.pendingPromises.entries()) {
      deferred.reject(new Error(`Worker error: ${e.message}`));
    }
    this.pendingPromises.clear();
    this.activeRequestId = null;
    this.worker?.terminate();
    this.initWorker();
  }

  public analyze(
    req: Omit<SearchRequest, 'id'>,
    options?: AnalyzeOptions
  ): Promise<AnalysisResult> {
    const shouldAutoCancel = options?.autoCancel ?? true;
    if (shouldAutoCancel && this.activeRequestId !== null && this.pendingPromises.has(this.activeRequestId)) {
      this.cancel(this.activeRequestId);
    }

    const id = ++this.currentRequestId;
    this.activeRequestId = id;
    const fullReq: SearchRequest = { ...req, id };

    // Fallback if Worker is not supported in the execution environment (e.g. Node/Vitest)
    if (!this.worker) {
      return new Promise<AnalysisResult>((resolve, reject) => {
        this.pendingPromises.set(id, { resolve, reject });
        queueMicrotask(() => {
          if (this.cancelledIds.has(id)) {
            this.cancelledIds.delete(id);
            this.pendingPromises.delete(id);
            if (this.activeRequestId === id) {
              this.activeRequestId = null;
            }
            return;
          }
          const ruleSet = getRuleSet(req.rules, req.rulesOptions);
          const moves = analyzeAllMoves(
            req.state.board,
            req.state.turn,
            req.depth,
            ruleSet
          );
          const bestMove = moves[0];
          this.pendingPromises.delete(id);
          if (this.activeRequestId === id) {
            this.activeRequestId = null;
          }
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

  public getCurrentRequestId(): number {
    return this.currentRequestId;
  }

  public cancel(id: number): void {
    if (this.activeRequestId === id) {
      this.activeRequestId = null;
    }
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
    this.activeRequestId = null;
    this.pendingPromises.clear();
    this.cancelledIds.clear();
  }
}

export const searchClient = new SearchClient();
```

---

### Proposal 5: `src/game/useGame.ts`
Pass `rulesOptions: state.rules`, cancel in-flight request on cleanup, and add `state.rules` to dependencies:

```tsx
// src/game/useGame.ts (lines 187-217 replacement)
  // Asynchronous Search via Web Worker Client
  useEffect(() => {
    if (state.isGameOver) {
      setAnalysisResults([]);
      return;
    }

    let isSubscribed = true;
    setIsAnalyzing(true);

    const promise = searchClient.analyze({
      rules: 'kalah',
      rulesOptions: state.rules,
      state: {
        board: state.board,
        turn: state.currentPlayer as 0 | 1,
        over: state.isGameOver
      },
      depth: state.searchDepth
    });
    const reqId = searchClient.getCurrentRequestId();

    promise.then(res => {
      if (isSubscribed) {
        setAnalysisResults(res.evaluatedMoves);
        setIsAnalyzing(false);
      }
    }).catch(err => {
      console.warn('Worker search error:', err);
      if (isSubscribed) setIsAnalyzing(false);
    });

    return () => {
      isSubscribed = false;
      searchClient.cancel(reqId);
    };
  }, [state.board, state.currentPlayer, state.isGameOver, state.searchDepth, state.rules]);
```

---

### Proposal 6: Test Suite Updates
In `src/workers/searchClient.adversarial.test.ts`:
Tests 2 and 3 that stress-test 25 and 10 simultaneous concurrent queries should pass `{ autoCancel: false }` to declare their intention to maintain concurrent parallel in-flight queries without auto-cancellation:
```ts
const promise = client.analyze({ rules: 'kalah', state, depth: 1 }, { autoCancel: false });
```
In `src/workers/searchClient.test.ts`:
Add a test verifying that `searchClient.analyze` automatically cancels previous pending requests when rapid queries occur:
```ts
it('automatically cancels previous pending request on rapid sequential analyze calls', async () => {
  const client = new SearchClient();
  const state = kalahRuleSet.initial();
  const p1 = client.analyze({ rules: 'kalah', state, depth: 4 });
  const id1 = client.getCurrentRequestId();
  const p2 = client.analyze({ rules: 'kalah', state, depth: 2 });
  const id2 = client.getCurrentRequestId();

  expect(id2).toBe(id1 + 1);
  const res2 = await p2;
  expect(res2.id).toBe(id2);
  client.terminate();
});
```

---

## 4. Caveats

1. **`stonesPerPit` in Saved Game**:
   `state.stonesConfig` (default 4) can also vary. While `RulesConfig` covers `freeTurn` and `captureOpposite`, `KalahOptions` also supports `stonesPerPit`. If desired, `rulesOptions` in `SearchRequest` can accept `KalahOptions` instead of strictly `RulesConfig`, allowing search under non-standard initial stone counts.
2. **Main-Thread Fallback vs Worker in Tests**:
   Vitest runs in a Node.js environment where `Worker` is undefined. The fallback microtask queue operates asynchronously. `pendingPromises.set` must be registered in the fallback branch so cancellation lookups behave identically to browser worker execution.

---

## 5. Conclusion

The architectural changes needed are localized, clean, and fully decoupled:
1. `src/workers/protocol.ts`: Extend `SearchRequest` with `rulesOptions?: RulesConfig`.
2. `src/rules/index.ts`: Parameterize `getRuleSet(id, options?: KalahOptions)`.
3. `src/workers/search.worker.ts`: Key TT cache on `(rules, rulesOptions)` and delegate `getRuleSet(req.rules, req.rulesOptions)`.
4. `src/workers/searchClient.ts`: Add `activeRequestId`, auto-cancel previous pending request by default, and provide `{ autoCancel: false }` opt-out for concurrent storm testing.
5. `src/game/useGame.ts`: Pass `rulesOptions: state.rules`, add `state.rules` to dependency array, and call `searchClient.cancel(reqId)` on effect cleanup.

These changes resolve Finding 1 and Finding 4 from `m0_reviewer_1` with zero breaking changes to existing architecture or game invariants.

---

## 6. Verification Method

Once implemented, the following commands verify correctness:
1. **TypeScript Typecheck**:
   ```powershell
   npx tsc --noEmit
   ```
   (Verify: Exits with code 0).
2. **Unit & Adversarial Tests**:
   ```powershell
   npm test
   ```
   (Verify: All 13 test files and all 133+ tests pass).
3. **Production Bundle Verification**:
   ```powershell
   npm run build
   ```
   (Verify: Builds worker bundle and client assets cleanly).
4. **E2E Playwright Suite**:
   ```powershell
   npm run test:e2e
   ```
   (Verify: All 20 tests pass across all 4 viewports).
5. **Interactive Verification of Custom Rules Search**:
   - Launch app (`npm run dev`), open Settings modal, toggle OFF "Store Finish = Bonus Turn".
   - Confirm analysis panel shows moves with `freeTurn: false` and re-evaluates stone advantage accordingly.
