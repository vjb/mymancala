# Investigation & Remediation Report: Storage Corruption Fallback (Milestone M0 Iteration 2)

**Author**: `m0_iter2_explorer_1` (Roles: teamwork_preview_explorer, investigation)  
**Target Milestone**: M0 (Phase 0 Foundation - Iteration 2)  
**Parent Orchestrator ID**: `85856d3d-5ca8-4fac-8578-3161a39fe3a5`  
**Working Directory**: `c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m0_iter2_explorer_1`  
**Verdict**: **REMEDIATION SPECIFIED & READY FOR IMPLEMENTATION**  

---

## 1. Observation

### 1.1 Root Cause in `src/lib/storage.ts`
In `src/lib/storage.ts` lines 56–76:
```ts
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
```
- `SavedGameV1` interface (`storage.ts:6-19`) defines `options: { stonesPerPit: number; freeTurn: boolean; captureOpposite: boolean; }` as a mandatory property.
- `loadGameSession()` blindly performs `return parsed as SavedGameV1` without validating `parsed.options` or checking that `parsed.options.stonesPerPit` is a number.
- When `localStorage` contains a session object lacking `options` (e.g. `{"version": 1, "rulesId": "kalah", "history": [2]}`), `loadGameSession()` returns the object with `options: undefined`.

### 1.2 Uncaught Exception in `src/game/useGame.ts`
In `src/game/useGame.ts` lines 61–75:
```ts
  const handleResumeSavedGame = () => {
    if (!savedGamePrompt) return;
    const replay = replayGameFromHistory(kalahRuleSet, savedGamePrompt.history);
    if (replay.valid) {
      // Replay all moves to reconstruct the game state
      let replayedState = createInitialGameState(savedGamePrompt.options.stonesPerPit);
      let currentBoard = [...replayedState.board];
      let currentPlayer = replayedState.currentPlayer;
      let isGameOver = false;
      let winner: number | null = null;
      const historyItems: typeof state.moveHistory = [];

      for (const pit of savedGamePrompt.history) {
        const sim = simulateMove(currentBoard, currentPlayer, pit, savedGamePrompt.options);
```
- Line 66 directly evaluates `savedGamePrompt.options.stonesPerPit`. When `savedGamePrompt.options` is `undefined`, JavaScript immediately throws:
  ```
  TypeError: Cannot read properties of undefined (reading 'stonesPerPit')
  ```
- Additionally, lines 87–100 dispatch `RESTORE_SAVED_GAME` without restoring `rules` and `stonesConfig`:
  ```ts
      dispatch({
        type: 'RESTORE_SAVED_GAME',
        payload: {
          board: currentBoard,
          currentPlayer,
          isGameOver,
          winner,
          moveHistory: historyItems,
          lastMovedPit: savedGamePrompt.history[savedGamePrompt.history.length - 1],
          gameMode: savedGamePrompt.mode,
          humanPlayer: savedGamePrompt.humanPlayer ?? 0,
          selectedBotId: savedGamePrompt.botLevel ?? DEFAULT_BOT_ID
        }
      });
  ```
  This causes resumed games to silently inherit the current session's ambient `state.rules` and `state.stonesConfig` rather than the configuration active when the game was saved.
- Line 52 in `useEffect` and line 63 in `handleResumeSavedGame` pass static `kalahRuleSet` (configured for default 4 stones) to `replayGameFromHistory` rather than constructing a `RuleSet` using the saved session's `options`.

### 1.3 Vulnerability Reproduction in `e2e/storage-stress.spec.ts`
In `e2e/storage-stress.spec.ts` lines 79–106:
- The existing test `reproduces uncaught TypeError vulnerability when options is missing in savedGameV1` seeds `localStorage` with `{"version": 1, "rulesId": "kalah", "history": [2]}` (no `options`).
- Execution via `npx playwright test e2e/storage-stress.spec.ts -g "reproduces uncaught TypeError vulnerability"` confirmed that clicking "Continue Game" generates the verbatim error:
  `TypeError: Cannot read properties of undefined (reading 'stonesPerPit')` across all 4 responsive viewports (`mobile-small`, `mobile-iphone`, `tablet-portrait`, `desktop-landscape`).
- The test passed in Iteration 1 only because it explicitly asserted `expect(hasTypeError).toBe(true)` to document the crash.

### 1.4 Baseline Test Execution Status
- Vitest suite (`npx vitest run`): 13 test files passed, 133 tests passed (26.73s).
- Line 179 in `src/lib/storage-corruption.test.ts` currently asserts `expect(loaded).toBeDefined()`, documenting that incomplete saves without `options` were previously accepted by `loadGameSession()`.

---

## 2. Logic Chain

1. **Schema Non-Conformance as Corruption**:
   - `SavedGameV1` requires `options: { stonesPerPit: number; freeTurn: boolean; captureOpposite: boolean; }`.
   - Any JSON object in `localStorage` that lacks `options` or lacks a valid numerical `stonesPerPit` violates the storage contract.
   - Per `PROJECT.md:22` and Milestone M0 specifications, corrupted saves must be discarded cleanly to prevent broken state and crash loops.
   - Therefore, Tier 1 validation belongs in `src/lib/storage.ts`: `loadGameSession()` must explicitly verify `parsed.options && typeof parsed.options.stonesPerPit === 'number' && parsed.options.stonesPerPit > 0`. If this check fails, it must invoke `clearSavedGame()` and return `null`.

2. **Defense-in-Depth Fallback in UI Hook**:
   - Even with storage validation in place, UI event handlers must never assume properties are non-null.
   - In `src/game/useGame.ts`:
     - Both `useEffect` (verification on mount) and `handleResumeSavedGame` (user click handler) must define a safe fallback `options` object:
       ```ts
       const options = savedGamePrompt?.options ?? {
         stonesPerPit: 4,
         freeTurn: true,
         captureOpposite: true,
       };
       ```
     - `createKalahRuleSet({ stonesPerPit, freeTurn, captureOpposite })` must be instantiated to guarantee that `replayGameFromHistory` validates according to the session's specific stone configuration.
     - `RESTORE_SAVED_GAME` payload must explicitly include:
       ```ts
       stonesConfig: stonesPerPit,
       rules: {
         freeTurn: options.freeTurn !== false,
         captureOpposite: options.captureOpposite !== false
       }
       ```
     - This guarantees that even under abnormal execution paths, zero uncaught `TypeError`s can occur, and game rules/stone counts are fully preserved upon resumption.

3. **E2E Test Transition from Bug Reproduction to Guardrail Assertion**:
   - The test in `e2e/storage-stress.spec.ts` lines 79–106 must be updated from an adversarial defect reproducer (`expect(hasTypeError).toBe(true)`) into a regression guardrail.
   - When an incomplete save lacking `options` is loaded:
     - `loadGameSession()` rejects it and clears `localStorage`.
     - `expect(pageErrors).toHaveLength(0)` confirms zero uncaught exceptions.
     - The resume prompt is not rendered (`await expect(prompt).not.toBeVisible()`).
     - `mancala_game_v1` in `localStorage` is confirmed deleted (`expect(stored).toBeNull()`).
     - The board remains fully interactive in its clean initial state (`pit0` visible and enabled).

4. **Collateral Unit Test Realignment**:
   - In `src/lib/storage-corruption.test.ts`, the test `checks whether loadGameSession accepts payload without options` must be updated to assert `expect(loaded).toBeNull()` and `expect(localStorage.getItem(STORAGE_KEY_GAME)).toBeNull()`.

---

## 3. Caveats

- **Existing Stored Data Migration**: Users with hypothetical pre-existing stored sessions lacking `options` will have their sessions cleared on reload rather than restored with 4-stone defaults. Given that the app is in pre-release Phase 0 and all normal game saves written by `saveGameSession()` always include `options`, clearing incomplete legacy records is the correct, privacy-preserving, clean-slate behavior.
- **Variant Future-Proofing**: `useGame.ts` currently targets `kalah` (Phase 0). In Phase 4 (`phase-4-reach.md`), other variants (`oware`, `sow-and-score`) will be integrated via `RULESET_REGISTRY[saved.rulesId]`. The proposed fallback structure supports this cleanly.
- No other caveats.

---

## 4. Conclusion & Precise Code Proposals

### Proposal 1: `src/lib/storage.ts`

**Target File**: `c:\Users\vjbel\hacks\mymancala\src\lib\storage.ts`  
**Target Lines**: 62–75  
**Rationale**: Ensure `parsed.options` and positive numerical `stonesPerPit` exist before returning. Discard invalid objects via `clearSavedGame()` and return `null`.

```diff
--- a/src/lib/storage.ts
+++ b/src/lib/storage.ts
@@ -62,7 +62,10 @@ export function loadGameSession(): SavedGameV1 | null {
     if (
       parsed &&
       parsed.version === 1 &&
       typeof parsed.rulesId === 'string' &&
-      Array.isArray(parsed.history)
+      Array.isArray(parsed.history) &&
+      parsed.options &&
+      typeof parsed.options.stonesPerPit === 'number' &&
+      parsed.options.stonesPerPit > 0
     ) {
       return parsed as SavedGameV1;
     }
```

---

### Proposal 2: `src/game/useGame.ts`

**Target File**: `c:\Users\vjbel\hacks\mymancala\src\game\useGame.ts`  
**Target Lines**: 5, 49–103  
**Rationale**:
1. Import `createKalahRuleSet` from `../rules`.
2. In `useEffect` (lines 49–59), build `RuleSet` using `createKalahRuleSet(options)` with fallback defaults.
3. In `handleResumeSavedGame` (lines 61–103), add fallback `options`, validate `stonesPerPit`, pass `rulesConfig` to `simulateMove`, and include `stonesConfig` and `rules` in the `RESTORE_SAVED_GAME` payload.

```diff
--- a/src/game/useGame.ts
+++ b/src/game/useGame.ts
@@ -5,1 +5,1 @@
-import { kalahRuleSet } from '../rules';
+import { kalahRuleSet, createKalahRuleSet } from '../rules';
@@ -49,11 +49,20 @@ export function useGame({ lenses, onGameOver }: UseGameOptions) {
   useEffect(() => {
     const saved = loadGameSession();
     if (saved && saved.history.length > 0) {
-      const replay = replayGameFromHistory(kalahRuleSet, saved.history);
+      const options = saved.options ?? {
+        stonesPerPit: 4,
+        freeTurn: true,
+        captureOpposite: true
+      };
+      const stonesPerPit = typeof options.stonesPerPit === 'number' && options.stonesPerPit > 0
+        ? options.stonesPerPit
+        : 4;
+      const ruleSet = createKalahRuleSet({ ...options, stonesPerPit });
+      const replay = replayGameFromHistory(ruleSet, saved.history);
       if (replay.valid && !replay.state.over) {
         setSavedGamePrompt(saved);
       } else {
         clearSavedGame();
       }
     }
   }, []);
@@ -61,43 +70,57 @@ export function useGame({ lenses, onGameOver }: UseGameOptions) {
   const handleResumeSavedGame = () => {
     if (!savedGamePrompt) return;
-    const replay = replayGameFromHistory(kalahRuleSet, savedGamePrompt.history);
+    const options = savedGamePrompt.options ?? {
+      stonesPerPit: 4,
+      freeTurn: true,
+      captureOpposite: true
+    };
+    const stonesPerPit = typeof options.stonesPerPit === 'number' && options.stonesPerPit > 0
+      ? options.stonesPerPit
+      : 4;
+    const rulesConfig: RulesConfig = {
+      freeTurn: options.freeTurn !== false,
+      captureOpposite: options.captureOpposite !== false
+    };
+    const ruleSet = createKalahRuleSet({ ...rulesConfig, stonesPerPit });
+    const replay = replayGameFromHistory(ruleSet, savedGamePrompt.history);
     if (replay.valid) {
       // Replay all moves to reconstruct the game state
-      let replayedState = createInitialGameState(savedGamePrompt.options.stonesPerPit);
+      let replayedState = createInitialGameState(stonesPerPit);
       let currentBoard = [...replayedState.board];
       let currentPlayer = replayedState.currentPlayer;
       let isGameOver = false;
       let winner: number | null = null;
       const historyItems: typeof state.moveHistory = [];
 
       for (const pit of savedGamePrompt.history) {
-        const sim = simulateMove(currentBoard, currentPlayer, pit, savedGamePrompt.options);
+        const sim = simulateMove(currentBoard, currentPlayer, pit, rulesConfig);
         historyItems.push({
           player: currentPlayer,
           pit,
           freeTurn: sim.earnedFreeTurn,
           captures: sim.capturedStones
         });
         currentBoard = sim.newBoard;
         currentPlayer = sim.nextPlayer;
         isGameOver = sim.isGameOver;
         winner = sim.winner;
       }
 
       dispatch({
         type: 'RESTORE_SAVED_GAME',
         payload: {
           board: currentBoard,
           currentPlayer,
           isGameOver,
           winner,
           moveHistory: historyItems,
           lastMovedPit: savedGamePrompt.history[savedGamePrompt.history.length - 1],
           gameMode: savedGamePrompt.mode,
           humanPlayer: savedGamePrompt.humanPlayer ?? 0,
-          selectedBotId: savedGamePrompt.botLevel ?? DEFAULT_BOT_ID
+          selectedBotId: savedGamePrompt.botLevel ?? DEFAULT_BOT_ID,
+          stonesConfig: stonesPerPit,
+          rules: rulesConfig
         }
       });
     }
     setSavedGamePrompt(null);
   };
```

---

### Proposal 3: `e2e/storage-stress.spec.ts`

**Target File**: `c:\Users\vjbel\hacks\mymancala\e2e\storage-stress.spec.ts`  
**Target Lines**: 79–106  
**Rationale**: Convert test from reproducing the TypeError vulnerability into asserting clean fallback without uncaught exceptions.

```diff
--- a/e2e/storage-stress.spec.ts
+++ b/e2e/storage-stress.spec.ts
@@ -79,28 +79,29 @@ test.describe('Adversarial Storage Corruption & Resume E2E Harness', () => {
-  test('reproduces uncaught TypeError vulnerability when options is missing in savedGameV1', async ({ page }) => {
+  test('recovers cleanly without uncaught exceptions when options is missing in savedGameV1', async ({ page }) => {
     const pageErrors: Error[] = [];
     page.on('pageerror', (err) => pageErrors.push(err));
 
     await page.addInitScript(() => {
       localStorage.setItem('mancala_game_v1', JSON.stringify({
         version: 1,
         rulesId: 'kalah',
         history: [2], // legal move
         mode: 'pve',
         savedAt: Date.now()
       }));
     });
 
     await page.goto('/');
     await page.waitForLoadState('domcontentloaded');
 
-    const prompt = page.locator('text=You have an unfinished game in progress');
-    await expect(prompt).toBeVisible();
-
-    const continueBtn = page.locator('button:has-text("Continue Game")');
-    await continueBtn.click();
-    await page.waitForTimeout(500);
-
-    // Empirically confirms that missing options throws uncaught TypeError
-    const hasTypeError = pageErrors.some(e => e.message.includes("Cannot read properties of undefined (reading 'stonesPerPit')"));
-    expect(hasTypeError).toBe(true);
+    // Clean fallback: no uncaught errors should have fired
+    expect(pageErrors).toHaveLength(0);
+
+    // Corrupted save (missing required options schema) must not prompt to resume
+    const prompt = page.locator('text=You have an unfinished game in progress');
+    await expect(prompt).not.toBeVisible();
+
+    // Storage must be cleared
+    const stored = await page.evaluate(() => localStorage.getItem('mancala_game_v1'));
+    expect(stored).toBeNull();
+
+    // Board remains interactive in initial state
+    const pit0 = page.locator('[data-testid="pit-0"]');
+    await expect(pit0).toBeVisible();
+    await expect(pit0).toBeEnabled();
   });
```

---

### Proposal 4: `src/lib/storage-corruption.test.ts`

**Target File**: `c:\Users\vjbel\hacks\mymancala\src\lib\storage-corruption.test.ts`  
**Target Lines**: 167–181  
**Rationale**: Update unit test asserting that incomplete save without options is properly rejected (returned `null` and purged from `localStorage`), and add check for missing `stonesPerPit`.

```diff
--- a/src/lib/storage-corruption.test.ts
+++ b/src/lib/storage-corruption.test.ts
@@ -167,15 +167,26 @@ describe('Adversarial Storage Corruption & Fallback Suite', () => {
   describe('SavedGameV1 Schema Vulnerability: Missing or Null options', () => {
-    it('checks whether loadGameSession accepts payload without options', () => {
+    it('rejects payload without options and clears storage', () => {
       // A payload with valid version, rulesId, and history, but missing options
       const incompleteSave = {
         version: 1,
         rulesId: 'kalah',
         history: [0]
       };
       localStorage.setItem(STORAGE_KEY_GAME, JSON.stringify(incompleteSave));
       const loaded = loadGameSession();
-      // Notice: loaded is currently returned even though options is missing!
-      // This document's the behavior under test
-      expect(loaded).toBeDefined();
+      expect(loaded).toBeNull();
+      expect(localStorage.getItem(STORAGE_KEY_GAME)).toBeNull();
+    });
+
+    it('rejects payload where options.stonesPerPit is not a number', () => {
+      const badOptionsSave = {
+        version: 1,
+        rulesId: 'kalah',
+        options: { freeTurn: true, captureOpposite: true },
+        history: [0]
+      };
+      localStorage.setItem(STORAGE_KEY_GAME, JSON.stringify(badOptionsSave));
+      const loaded = loadGameSession();
+      expect(loaded).toBeNull();
+      expect(localStorage.getItem(STORAGE_KEY_GAME)).toBeNull();
     });
   });
```

---

## 5. Verification Method

Once the implementer applies the above changes, independent verification can be performed with the following commands:

1. **Storage Corruption Unit Test Suite**:
   ```bash
   npx vitest run src/lib/storage-corruption.test.ts
   ```
   *Expected*: All 13 tests pass (including rejection of payload without options and bad stonesPerPit).

2. **Storage Stress Playwright Suite Across All 4 Viewports**:
   ```bash
   npx playwright test e2e/storage-stress.spec.ts
   ```
   *Expected*: All 5 tests pass across 4 viewports (20 tests passed total), including clean fallback without exceptions when options is omitted.

3. **Full Vitest Suite & parities**:
   ```bash
   npm test
   ```
   *Expected*: 13 test files passed, 134 tests passed.

4. **TypeScript Compiler Check**:
   ```bash
   npx tsc --noEmit
   ```
   *Expected*: Clean exit code `0`.

5. **Production Build Check**:
   ```bash
   npm run build
   ```
   *Expected*: Clean exit code `0`. Worker and client bundles produced.

6. **Full Playwright Mobile & E2E Guardrail Suite**:
   ```bash
   npm run test:e2e
   ```
   *Expected*: All 64 tests passed across 4 viewports with zero horizontal scrolling and preserved testids.

**Invalidation Conditions**:
- If `loadGameSession()` still returns non-null when `options` is missing.
- If clicking "Continue Game" throws any uncaught exception.
- If `RESTORE_SAVED_GAME` fails to restore `rules` and `stonesConfig`.
