# Handoff Report — Milestone M2 Adversarial Challenge

**Verdict**: **APPROVE**

## 1. Observation
- **Original 500-Position Solver Benchmark Execution**:
  Command: `npm test -- --run src/solver/endgame.test.ts`
  Result: 6/6 tests passed in 6.99s, including:
  `✓ Endgame Solver: 500-Position Cross-Check & Terminal Accuracy > matches reference minimax across 500 random positions with 0 mismatches (6919ms)` (`ORIGINAL_REQUEST.md:76`).
- **Edge Position Stress Harness Execution**:
  Test suite: `src/solver/endgame.adversarial.test.ts`
  Command: `npm test -- --run src/solver/endgame.adversarial.test.ts`
  Result: 6/6 tests passed in 233ms:
  - 0 active stones edge test: Handles both `over: true` and `over: false` states with 0 unbanked stones, immediately evaluating exact terminal margin without looping or error.
  - Single active stone test: Tested across all 12 playable pits for both Player 0 and Player 1 (24 configurations). 100% match against unpruned reference minimax with winProb $\in \{0.0, 0.5, 1.0\}$.
  - Terminal sweep sequences: Tested starvation where Player 0 or Player 1 has 0 stones on their side with non-zero stones on opponent's side, and where a move empties the moving player's side. 100% match against reference minimax terminal evaluation.
  - Multi-turn free-turn chains: Evaluated 3-chain consecutive free-turn sequences for Player 0 (pits 5, 4, 3) and Player 1 (pits 12, 11, 10). Verified `solveExact` returns exact margin identical to unpruned reference minimax, and generated Principal Variation (`sol.best`) executes legal moves leading to terminal state matching `sol.value`.
  - 100 random complex endgames (2–10 active stones): Verified integer terminal lead and strictly $\{0\%, 50\%, 100\%\}$ win probabilities.
- **Truthful Evaluation Invariants**:
  Test suite: `src/game/truthful-eval.adversarial.test.ts`
  Command: `npm test -- --run src/game/truthful-eval.adversarial.test.ts`
  Result: 5/5 tests passed in 13ms:
  - In `src/game/useGame.ts` lines 630-637:
    ```ts
    const rawP1Score = state.currentPlayer === 0 ? top.score : -top.score;
    if (top.exact) {
      // Exact solver: score is ALREADY true stone margin from perspective of current player!
      return rawP1Score;
    }
    const stones = rawP1Score / 3.5;
    return Math.round(stones * 10) / 10;
    ```
    Verified exact score bypasses `/ 3.5` division and outputs true integer stone lead, while heuristic score divides by 3.5.
  - In `src/components/panels/AnalysisPanel.tsx` lines 279-282 and lines 419-422:
    ```tsx
    {isExact
      ? (move.winProb === 1 ? '100%' : move.winProb === 0.5 ? '50%' : '0%')
      : `${(move.winProb * 100).toFixed(1)}%`}
    ```
    Verified exact positions strictly display `0%`, `50%`, or `100%`, never misleading fractional percentages like `63%`.
- **Full Vitest Suite Execution**:
  Command: `npm test -- --run`
  Result: 24 test files passed (219 / 219 tests passed in 45.61s).
- **TypeScript Typecheck**:
  Command: `npx tsc --noEmit`
  Result: Code 0 (0 diagnostic errors).
- **Production Asset Build**:
  Command: `npm run build`
  Result: Code 0, built cleanly in 30.46s (`dist/index.html`, `dist/assets/search.worker-DFL8eZpZ.js`, `dist/assets/index-D_SW-fXL.js`, `dist/assets/index-BfZeswel.css`).
- **Playwright Responsive E2E Tests**:
  Command: `npx playwright test e2e/trainer.spec.ts`
  Result: 16 passed in 23.2s across all 4 target viewports (`mobile-small`, `mobile-iphone`, `tablet-portrait`, `desktop-landscape`).
- **Monolith Boundary Invariant**:
  Command: `powershell -Command "(Get-Content src/App.tsx).Length"`
  Result: 278 lines (strictly $< 300$ lines limit).

## 2. Logic Chain
1. *Solver Soundness & Verification*: The 500-position cross-check in `src/solver/endgame.test.ts` executes Negamax with Alpha-Beta and Transposition Table memoization against a completely unpruned, cacheless reference minimax. All 500 positions matched with 0 discrepancies.
2. *Edge-Case Robustness*: The empirical stress harness in `src/solver/endgame.adversarial.test.ts` targeted extreme boundaries:
   - 0 active playable stones: Solver identifies immediate terminal state and evaluates net store difference without node budget exhaustion or invalid lookups.
   - 1 active stone: Solver correctly computes sweep or single-move mechanics across all 12 playable pits for both players.
   - Terminal sweeps: When one player is starved, remaining stones are swept to the respective stores according to Kalah rules, matching reference minimax.
   - Consecutive free-turn chains: Solver identifies optimal sequences and outputs a full principal variation that steps through legal chained moves to terminal state.
3. *Truthful Evaluation Guarantees*:
   - Worker and Client (`src/workers/search.worker.ts`, `src/workers/searchClient.ts`) set `exact: true` and map terminal lead directly to `winProb` $\in \{0.0, 0.5, 1.0\}$ and `winPct` $\in \{0, 50, 100\}$.
   - In `src/game/useGame.ts`, exact evaluations bypass the `/3.5` store division so that displayed stone leads represent authentic integer stone margins.
   - In `src/components/shell/EvalGauge.tsx` and `src/components/panels/AnalysisPanel.tsx`, UI components render the "Exact" badge and integer margins, completely suppressing fractional percentage noise for solved positions.
4. *Non-Regression & Build Safety*: With the addition of the new adversarial test suites, all 24 Vitest test suites (219 tests), TypeScript typechecking, Vite production build, and 4-viewport Playwright E2E tests pass with zero failures. `src/App.tsx` remains strictly within its 300-line budget at 278 lines.

## 3. Caveats
- No caveats. The exact endgame solver is bounded to $\le 14$ playable stones with a 300,000 node budget; in all benchmarked positions, solutions were found within budget and matched reference minimax.

## 4. Conclusion
Milestone M2 is empirically verified and resilient to adversarial stress testing. All requirements from `ORIGINAL_REQUEST.md`, `PROJECT.md`, and the challenge dispatch are fully met.
**Verdict**: **APPROVE**.

## 5. Verification Method
To independently replicate these findings:
1. Run full Vitest suite (including original benchmark and new adversarial tests):
   `npm test -- --run`
   Expected: 24 passed test files, 219 passed tests.
2. Run endgame solver adversarial stress suite specifically:
   `npm test -- --run src/solver/endgame.adversarial.test.ts`
   Expected: 6 passed tests.
3. Run truthful evaluation unit test suite:
   `npm test -- --run src/game/truthful-eval.adversarial.test.ts`
   Expected: 5 passed tests.
4. Verify TypeScript type safety:
   `npx tsc --noEmit`
   Expected: Exit code 0.
5. Verify production build:
   `npm run build`
   Expected: Exit code 0.
6. Verify responsive Playwright E2E suite:
   `npx playwright test e2e/trainer.spec.ts`
   Expected: 16 passed tests across 4 viewports.
7. Verify App.tsx line count:
   `powershell -Command "(Get-Content src/App.tsx).Length"`
   Expected: 278 lines (< 300).
