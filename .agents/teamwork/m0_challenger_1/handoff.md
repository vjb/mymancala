# Adversarial Challenge Report: Milestone M0 (Phase 0 Foundation)

**Final Verdict**: **APPROVE**

---

## 1. Observation

1. **RuleSet Equivalence Fuzz Tests in `src/rules/kalah.test.ts`**:
   - In `src/rules/kalah.test.ts`, 2,000 randomized games were tested comparing `simulateMove(board, player, move, config)` vs `ruleSet.apply(state, move)`.
   - Inspection of `src/engine.ts` (lines 110–111) revealed:
     ```ts
     export function simulateMove(
       board: number[],
       player: number,
       pit: number,
       rules: RulesConfig | RuleSet = { freeTurn: true, captureOpposite: true }
     ): MoveSimulationResult {
       const rs = resolveRuleSet(rules);
       const res = rs.apply({ board, turn: player as Player, over: false }, pit);
     ```
     `simulateMove` delegates directly to `rs.apply`. While this proved that `simulateMove` wrapper behavior matches `rs.apply` without throwing runtime errors across 2,000 games, it was tautological regarding legacy mathematical parity.

2. **Empirical Multi-Lap Sowing & High Stone Counts (>14, >28, >48, up to 1,000)**:
   - Authored adversarial test harness `src/rules/kalah.adversarial.test.ts` implementing a closed-form mathematical distribution oracle for 14, 15, 26, 27, 28, 39, 40, 48, 52, 53, 100, 250, 500, and 1,000 stones.
   - Verified that across all lap counts and stone counts:
     - Opponent store never receives stones (`res.state.board[opponentStore] === 0`).
     - Sowing path length strictly equals the stone count (`res.path.length === stones`).
     - Opponent store is never present in `res.path`.
     - 26 stones (2 full laps of 13 active pits) seeds exactly 2 stones in each pit and player store, 0 in opponent store.

3. **Empirical Empty-Opposite Landing Captures**:
   - Verified exact capture mechanics:
     - Landing in empty pit on own side with opponent opposite pit having stones: captures both landing stone (1) and opposite stones into own store.
     - Landing in empty pit on own side when opposite pit is empty: zero stones captured (`res.captured === 0`, `res.capturedFrom === null`), landing stone remains in pit.
     - Landing in an already occupied pit (stones >= 1): zero stones captured, stones increment normally.
     - Landing in an empty pit on opponent side: zero stones captured, stone remains in opponent pit.
     - Full-lap 13-stone cycle returning to originating pit: originating pit was emptied at start (0), receives 1 stone on 13th drop, opposite pit received 1 stone on 12th drop -> capture triggers correctly (`captured === 2`).

4. **Simultaneous Endgame Sweep & Free-Turn Edge Cases**:
   - Verified edge cases:
     - Player 0 plays last stone into own store (pit 6): earns `extraTurn: true`, but empties Player 0's pits. `isGameOver` becomes `true`, remaining Player 2 stones are swept into Player 2 store, `res.state.over === true`, and `kalahRuleSet.legalMoves` returns `[]`. No extra turn can be taken.
     - Capture that clears own side: triggers endgame sweep of opponent stones, game over is `true`.
     - Capture that clears opponent side: triggers endgame sweep of player's remaining stones, game over is `true`.

5. **Invariant: Total Stone Conservation**:
   - Tested 5,000 randomized and high-stone-count (up to 500 stones/pit) transitions in `src/rules/kalah.adversarial.test.ts`.
   - Result: 0 stone leaks. In all 5,000 transitions, `finalSum === initialSum` held strictly.

6. **Web Worker SearchClient Concurrent Query & Cancellation Stress**:
   - Authored `src/workers/searchClient.adversarial.test.ts`:
     - 10 rapid concurrent queries issued with sequential monotonically increasing request IDs.
     - Queries 0–8 rapidly cancelled; query 9 (the 10th) resolved cleanly with valid `AnalysisResult` (depth 2, 6 evaluated moves).
     - Rapid storm of 25 concurrent queries with interleaved cancellations resolved cleanly with zero unhandled rejections and zero state corruption.
     - Simulated Web Worker environment verified asynchronous event dispatching, delayed responses, and cancellation synchronization.
     - Simulated worker crash/error cleanly rejected pending promises with `Worker error: OOM simulated` without leaving hanging promises.

7. **Test Suite & Build Results**:
   - `npm test`: 13 test files passed, 133 tests passed cleanly (41.38s).
   - `npx tsc --noEmit`: Exited 0 with no diagnostic errors.
   - `npm run build`: Bundled cleanly with Vite (worker chunk: `dist/assets/search.worker-DF_8oAVQ.js`).
   - `npx playwright test e2e/no-hscroll.spec.ts e2e/tray.spec.ts`: 20 tests passed across 4 mobile/desktop viewports (25.8s).
   - `src/App.tsx` line count: 279 lines (strictly `< 300` lines).

---

## 2. Logic Chain

1. **Sowing Mechanics**: In Kalah with 14 pits, Player 0 skips pit 13 (opponent store) and Player 1 skips pit 6 (opponent store). Therefore, one complete lap traverses exactly 13 pits. For any stone count $S$, the number of full laps is $\lfloor S / 13 \rfloor$, with $S \pmod{13}$ remaining stones. The tests verified that `apply()` in `kalah.ts` matches this closed-form mathematical distribution without leaking stones into the opponent store, even with up to 1,000 stones.
2. **Capture Mechanics**: Kalah opposite-pit captures require that the final stone lands in an empty pit belonging to the active player, and the opposite pit contains $\ge 1$ stone. The empirical tests proved that all non-qualifying cases (opposite empty, landing pit pre-occupied, landing on opponent side) correctly yield 0 captures, and simultaneous sweeps are triggered when a capture empties either side.
3. **Endgame Sweep Precedence**: When a move satisfies both the free-turn condition (landing in store) and the game-over condition (clearing all pits on that side), `isGameOver` takes precedence: `nextPlayer` is set, `over` is set to `true`, and `legalMoves` returns empty. The player cannot move again after clearing their board.
4. **Worker Cancellation Safety**: `SearchClient` manages request IDs using monotonic integers and keeps pending promises in a map. When `cancel(id)` is called, the request ID is added to `cancelledIds` and deleted from `pendingPromises`. A cancelled promise remains unfulfilled rather than rejecting, preventing unhandled promise rejections in UI callers that do not attach rejection handlers. When a worker error occurs, all pending promises are properly rejected.

---

## 3. Caveats

- In pure Node.js environments without a browser `Worker` global, `SearchClient` executes using `queueMicrotask` fallback. Web Worker message passing was stress-tested using both simulated mock workers in Vitest and production bundling in Vite.
- Parallel E2E work in `e2e/preserved-testids.spec.ts` and `e2e/storage-stress.spec.ts` was noted as in-progress by the E2E track; the core M0 guardrails (`no-hscroll.spec.ts` and `tray.spec.ts`) pass 100% (20/20).

---

## 4. Conclusion

**Verdict: APPROVE**

Milestone M0 implementation is empirically sound, resilient to extreme inputs, handles multi-lap sowing without stone leakage, correctly implements capture rules and endgame sweep precedence, preserves the stone conservation invariant across all state transitions, and gracefully handles rapid concurrent search query cancellations without state corruption or unhandled rejections.

---

## 5. Verification Method

To independently verify the adversarial findings:

1. **Adversarial Stress Test Suites**:
   ```bash
   npx vitest run src/rules/kalah.adversarial.test.ts src/workers/searchClient.adversarial.test.ts
   ```
   (Must pass 43 tests testing extreme stone counts, multi-lap sowing, empty captures, sweeps, 5,000 invariant checks, and cancellation storms).

2. **Full Unit & Integration Suite**:
   ```bash
   npm test
   ```
   (Must pass all 13 test files and 133 tests).

3. **Type Checking & Production Build**:
   ```bash
   npx tsc --noEmit
   npm run build
   ```
   (Must exit 0 and produce dist artifacts).

4. **Core Mobile E2E Guardrails**:
   ```bash
   npx playwright test e2e/no-hscroll.spec.ts e2e/tray.spec.ts
   ```
   (Must pass 20 tests across 4 viewports).
