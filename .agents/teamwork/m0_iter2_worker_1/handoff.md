# Handoff Report: Milestone M0 Iteration 2 Remediations

**Author**: `m0_iter2_worker_1` (Roles: implementer, qa, specialist)  
**Parent Orchestrator ID**: `85856d3d-5ca8-4fac-8578-3161a39fe3a5`  
**Milestone**: M0 (Phase 0 Foundation - Iteration 2)  
**Working Directory**: `c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m0_iter2_worker_1`  
**Handoff Type**: Hard (Task Complete)  

---

## 1. Observation

### 1.1 Storage Corruption Defense
- In `src/lib/storage.ts`: Lines 62–73 were modified to validate `parsed.options && typeof parsed.options.stonesPerPit === 'number' && parsed.options.stonesPerPit > 0`. Incomplete save sessions lacking `options` are cleanly rejected (`loadGameSession() === null`) and purged from `localStorage`.
- In `src/game/useGame.ts`:
  - Lines 49–65 (`useEffect` mount check): Added fallback options (`stonesPerPit: 4, freeTurn: true, captureOpposite: true`) and instantiated `createKalahRuleSet({ ...options, stonesPerPit })` for `replayGameFromHistory`.
  - Lines 67–118 (`handleResumeSavedGame`): Provided fallback defaults, constructed custom `ruleSet` via `createKalahRuleSet`, passed `rulesConfig` to `simulateMove`, and populated `RESTORE_SAVED_GAME` payload with `stonesConfig: stonesPerPit` and `rules: rulesConfig`.
- In `src/lib/storage-corruption.test.ts`: Lines 167–193 updated to verify that missing options or non-numerical `stonesPerPit` return `null` and clear storage.
- In `e2e/storage-stress.spec.ts`: Lines 79–108 converted from a TypeError reproducer into a regression assertion verifying zero uncaught page errors, no resume prompt, storage cleared, and interactive initial board.

### 1.2 Worker Custom Rules & Auto-Cancellation
- In `src/workers/protocol.ts`: Lines 1–12 added `rulesOptions?: RulesConfig` to `SearchRequest` and re-exported `RulesConfig`.
- In `src/rules/index.ts`: Lines 11–18 updated `getRuleSet(id: string, options?: KalahOptions): RuleSet` to instantiate custom Kalah rules via `createKalahRuleSet(options)` when `id === 'kalah' && options`.
- In `src/workers/search.worker.ts`: Lines 5–45 added `getRulesCacheKey`, keyed `activeRulesKey` on `(rules, rulesOptions)` for cache invalidation, and passed `req.rulesOptions` to `getRuleSet`.
- In `src/workers/searchClient.ts`: Added `activeRequestId`, default `autoCancel: true` tracking in `analyze(req, options?: { autoCancel?: boolean })`, passed `req.rulesOptions` in main-thread fallback, and reset `activeRequestId` on completion/cancel/error.
- In `src/game/useGame.ts`: Lines 220–245 passed `rulesOptions: state.rules` to `searchClient.analyze`, cancelled pending search requests via `searchClient.cancel(reqId)` on effect cleanup, and added `state.rules` to the effect dependency array.
- In `src/workers/searchClient.test.ts`: Added unit tests for sequential auto-cancellation and search under custom `rulesOptions`.
- In `src/workers/searchClient.adversarial.test.ts`: Passed `{ autoCancel: false }` to concurrent multi-query storm tests (tests 1, 2, 3) to declare concurrent parallel execution.

### 1.3 PVSheet Polymorphic Layout Decoupling
- In `src/components/panels/PVSheet.tsx`: Imported `BoardLayout` and `kalahRuleSet`, added `layout?: BoardLayout` to `PVSheetProps` (defaulting to `kalahRuleSet.layout`), formatted steps using `activeLayout.label(p)`, and rendered pit ownership using `activeLayout.pitOwner(pit) === 0 ? 'Player 1' : 'Player 2'`.
- In `src/components/panels/PVDisplay.tsx`: Accepted `layout?: BoardLayout` prop, formatted compact preview moves using `activeLayout.label(p)`, and forwarded `layout={activeLayout}` to `PVSheet`.
- In `src/components/panels/AnalysisPanel.tsx`: Accepted `layout?: BoardLayout` prop and forwarded `layout={layout}` to all 3 `<PVDisplay />` instances.
- In `src/App.tsx`: Passed `layout={kalahRuleSet.layout}` to `<AnalysisPanel />`. Total line count of `App.tsx` measured at **281 lines** (strictly meeting `< 300` requirement).

### 1.4 Verification Outputs
- **TypeScript (`npx tsc --noEmit`)**: Exited code 0, 0 diagnostics/errors.
- **Vitest Unit & Fuzz Suite (`npm test`)**: 13 test files passed, 136 passed (100%) in 19.79s.
- **Production Build (`npm run build`)**: Exited code 0. Chunks produced:
  - `dist/assets/search.worker-5APe5hTC.js` (5.39 kB)
  - `dist/assets/index-QuC7T7aZ.js` (300.03 kB)
  - `dist/assets/index-BV7hXbPo.css` (63.56 kB)
- **Playwright Cross-Viewport E2E Suite (`npm run test:e2e`)**: 64 passed (100%) in 56.5s across all 4 responsive viewports (`mobile-small`, `mobile-iphone`, `tablet-portrait`, `desktop-landscape`).
- **`App.tsx` Line Count**: 281 lines (< 300).
- **Progress Documentation**: `docs/plan/PROGRESS.md` updated with full Iteration 2 section.

---

## 2. Logic Chain

1. **Storage Integrity Defense**:
   - `loadGameSession()` now enforces complete schema conformity before returning. If `options` or `stonesPerPit` is missing/non-positive, it returns `null` and purges corrupted data from `localStorage`.
   - In `useGame.ts`, fallback defaults guarantee that even if an abnormal session state is encountered, zero uncaught `TypeError`s can occur. Restoring `rules` and `stonesConfig` in `RESTORE_SAVED_GAME` payload ensures resumed sessions reflect the exact rules and stone counts of the saved game.
   - E2E tests across all 4 devices verify that corrupted saves no longer crash the UI or throw errors.

2. **Search Worker Correctness**:
   - By propagating `rulesOptions` across `SearchRequest`, `searchClient`, `search.worker`, and `getRuleSet`, the engine evaluates moves accurately according to player rules (e.g. `freeTurn: false` produces scores reflecting no bonus turns).
   - Invalidation of the worker transposition table on rules changes prevents stale evaluations across rule toggles.
   - Auto-cancellation on rapid moves avoids wasted CPU cycles evaluating obsolete board states. The `{ autoCancel: false }` flag maintains backwards-compatibility for concurrent stress testing.

3. **Layout Polymorphism**:
   - Decoupling `PVSheet` and `PVDisplay` from hardcoded pit offsets (`P${p + 1}`) and index boundaries (`pit < 6`) allows polymorphic evaluation for standard Kalah, 4-pit Kalah, and future variants (Oware, Sow & Score) using `layout.label(pit)` and `layout.pitOwner(pit)`.
   - Defaulting `layout` to `kalahRuleSet.layout` when omitted preserves backwards-compatibility for existing tests and unparameterized callers.

---

## 3. Caveats

- In `PVSheet.tsx`, player strings are currently English literals `'Player 1'` and `'Player 2'`. In Phase 1 (`phase-1-lenses-and-access.md`), these will be integrated with typed i18n catalogs (`en`, `ar`, `es`). The abstraction `activeLayout.pitOwner(pit) === 0` directly supports passing the player index to the translation formatter.
- Stores are not legal move selections in Mancala; however, `kalahRuleSet.layout.label(store)` formats stores safely if ever passed.
- No other caveats.

---

## 4. Conclusion

All three remediation areas specified in the dispatch and formulated by Explorers 1, 2, and 3 have been fully implemented, integrated, and verified:
1. Storage corruption fallback defenses operate cleanly without uncaught exceptions.
2. Web Worker search supports custom rules, invalidates TT cache on rule changes, and auto-cancels obsolete requests on rapid moves.
3. PVSheet and PVDisplay utilize polymorphic `BoardLayout` methods for labels and ownership.
4. All gates (`tsc`, Vitest, Vite build, Playwright E2E) pass 100%. `App.tsx` is 281 lines (< 300). `docs/plan/PROGRESS.md` is updated.

---

## 5. Verification Method

To independently reproduce verification:

1. **TypeScript Typecheck**:
   ```powershell
   npx tsc --noEmit
   ```
   *Expected*: Exit code 0, 0 errors.

2. **Unit, Fuzz & Adversarial Tests**:
   ```powershell
   npm test
   ```
   *Expected*: 13 test files passed, 136/136 tests passed.

3. **Production Build**:
   ```powershell
   npm run build
   ```
   *Expected*: Clean exit code 0, worker and client bundles emitted to `dist/`.

4. **Playwright E2E Cross-Viewport Suite**:
   ```powershell
   npm run test:e2e
   ```
   *Expected*: 64/64 passed across `mobile-small`, `mobile-iphone`, `tablet-portrait`, and `desktop-landscape`.

5. **`App.tsx` Line Count Guardrail**:
   ```powershell
   (Get-Content src/App.tsx).Length
   ```
   *Expected*: 281 (strictly < 300 lines).
