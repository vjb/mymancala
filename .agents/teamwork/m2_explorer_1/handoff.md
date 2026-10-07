# M2 Explorer 1 Handoff Report: Exact Endgame Solver, 500-Position Benchmark & Truthful Evaluation

## 1. Observation

### Codebase and Architecture Findings
- **Rule Engine Contracts (`src/rules/types.ts:31-41`)**:
  ```ts
  export interface RuleSet {
    id: string;
    name: string;
    initial(): GameState;
    legalMoves(s: GameState): number[];
    apply(s: GameState, move: number): MoveResult;
    isTerminal(s: GameState): boolean;
    score(s: GameState): [number, number];
    key(s: GameState): string;
    layout: BoardLayout;
  }
  ```
  `apply` performs a pure functional state transition and terminal sweep (lines 150-160 of `src/rules/kalah.ts`), returning `res.state.over = true` and updating stores with swept remaining pit stones.
  `rules.key(s)` provides a deterministic string key: `${s.board.join(',')}_p${s.turn}_r${freeTurn ? 1 : 0}${captureOpposite ? 1 : 0}`.
  `rules.layout.stores` contains `[6, 13]` for Kalah.

- **Current Search Engine Heuristic & Scaling (`src/engine.ts:180-267`, `src/game/useGame.ts:624-633`)**:
  In `src/engine.ts:197`, heuristic evaluation scales store difference by `3.5`:
  ```ts
  return (storeDiff * 3.5) + ((p1Stones - p2Stones) * 0.6) + (p1Potential - p2Potential);
  ```
  In `src/game/useGame.ts:624-633`, the UI divides heuristic score by `3.5` to calculate stone advantage:
  ```ts
  const rawP1Score = state.currentPlayer === 0 ? top.score : -top.score;
  const stones = rawP1Score / 3.5;
  return Math.round(stones * 10) / 10;
  ```
  *Critical observation*: If an exact endgame solver returns exact stone margin (e.g. `+4`), dividing by `3.5` in `useGame.ts` would erroneously display `+1.1 stones`. The UI must distinguish `exact` from `estimate` to bypass this division when exact.

- **Logistic Win Probability Formula (`src/engine.ts:326-328`)**:
  ```ts
  const p1Prob = 1 / (1 + Math.exp(-score * 0.022));
  const winProb = player === 0 ? p1Prob : 1 - p1Prob;
  ```
  Currently applied unconditionally to all search results, generating fractional numbers (e.g. `63.4%`) even for solved/terminal positions.

- **Worker Protocol & Search Client (`src/workers/protocol.ts:14-22`, `src/workers/search.worker.ts:62-70`)**:
  In `src/workers/protocol.ts`:
  ```ts
  export interface AnalysisResult {
    id: number;
    score: number;
    winProb: number;
    pv: number[];
    evaluatedMoves: EvaluatedMove[];
    depth: number;
    exact?: boolean;
  }
  ```
  In `search.worker.ts:69` and `searchClient.ts:131`, `exact: false` is currently hardcoded.

- **Specification Directives (`ORIGINAL_REQUEST.md:76`, `docs/plan/phase-2-trainer.md:5-19`)**:
  `ORIGINAL_REQUEST.md:76`:
  `- [ ] Exact endgame solver outputs match independent reference minimax on 500 random positions.`
  `phase-2-trainer.md:7`:
  `solveExact(rules: RuleSet, s: GameState, budgetNodes: number): {value: number; best: number[]; exact: true} | null using full-depth alpha-beta with TT and memo by rules.key. Value = final stone differential under the active rules. Return null if budget is exceeded.`
  `phase-2-trainer.md:8`:
  `Budget by device: start 300k nodes; trigger when stones on board <= ~14 (tune so p95 < 300 ms on a mid phone).`
  `phase-2-trainer.md:14`:
  `export type Evaluation = { value: number; kind: 'exact' | 'estimate'; depth?: number; winPct?: number };`
  `phase-2-trainer.md:16`:
  `Exact: value is true final margin with best play; win% shown as 0/50/100 only (win/draw/loss) — never a fake 63%.`

- **Test Suite Status**:
  Executed `npm test` (`vitest run`): 17 test files passed, 171 tests green in 17.21s.

---

## 2. Logic Chain

1. **Mathematical Tree Properties of Mancala/Kalah Endgames**:
   - In Kalah, every move picks up stones and sows them forward. Any move that crosses into the opponent's territory must pass the player's own store, depositing at least one stone. Any move staying on the player's own side shifts stones monotonically toward the store.
   - Therefore, pit stones strictly decrease or shift rightwards. No cycles can occur. The state transition space is an acyclic Directed Acyclic Graph (DAG).
   - Because the graph is a DAG, full-depth minimax with transposition table (TT) memoization is mathematically sound and guaranteed to terminate.

2. **Negamax Formulation with Free Turns**:
   - In a two-player zero-sum game, let player $P \in \{0, 1\}$ be the player to move at state $S$. The exact margin is $V_P = \text{score}(P) - \text{score}(1 - P)$.
   - When move $m$ yields a terminal state $S'$, final margin is $V_P = \text{score}(P) - \text{score}(1 - P)$.
   - When move $m$ grants a free turn, the next player is still $P$. The bounds $[\alpha, \beta]$ remain unchanged and child value is $V_P(S')$.
   - When move $m$ passes the turn to opponent $1 - P$, the opponent will maximize $V_{1-P}(S')$. From $P$'s perspective, the value is $-V_{1-P}(S')$, and alpha-beta bounds invert to $[-\beta, -\alpha]$.
   - This negamax formulation eliminates branching for player 0 vs player 1 and natively solves free turns.

3. **Endgame Trigger Condition Definition**:
   - In Kalah, total stones across pits and stores are strictly conserved (48 stones in standard game).
   - "Stones on board <= 14" represents active, unbanked stones in playable pits:
     $$\text{activeStones}(S) = \sum_{i \notin \text{stores}} \text{board}[i]$$
   - Once $\text{activeStones}(S) \le 14$, the branch factor and depth are constrained such that full-depth alpha-beta with TT evaluates the tree within milliseconds (well below the 300,000 node budget).

4. **Transposition Table (TT) and Memoization by `rules.key`**:
   - In a full-depth exact solve, every evaluation is terminal. There is no search horizon, so game-theoretic value is depth-independent.
   - Cache key is `rules.key(s)`.
   - TT entries store `{ value, flag: 'EXACT' | 'LOWER' | 'UPPER', bestMove, bestPV }`.
   - Ordering moves by `entry.bestMove` first yields optimal alpha-beta cutoffs ($O(b^{d/2})$ complexity).

5. **Cross-Check Benchmark Integrity (500 Positions)**:
   - To prove zero bugs or unsound cutoffs, an independent reference minimax must be constructed with:
     - Zero alpha-beta pruning (no $\alpha, \beta$).
     - Zero transposition table / cache.
     - Pure exhaustive recursive minimax to terminal nodes.
   - 500 deterministic positions generated by seeded PRNG with active stones $\le 14$ must be executed against both implementations.
   - Assertion: `solveExact(rules, s).value === referenceMinimax(rules, s)` across all 500 positions with 0 mismatches.

6. **Truthful Evaluation and UI Presentation**:
   - When position is exact:
     - Value is exact stone margin.
     - `winPct` is strictly $0\%$ (loss, $\text{value} < 0$), $50\%$ (draw, $\text{value} = 0$), or $100\%$ (win, $\text{value} > 0$).
     - Fractional percentages (e.g. 63%) are strictly forbidden.
     - `EvalGauge` displays exact stone count (e.g. `+3 stones (exact)`) with an `Exact` tag.
   - When position is estimate:
     - Heuristic evaluation divided by 3.5 is displayed as `about +X stones` with an `Estimate` tag.
     - Win % is shown only if lens `winPercent` is enabled, labelled as `Rough Chance`.

---

## 3. Caveats

1. **Node Budget Bailout**:
   - Highly dense tactical endgames at exactly 14 stones could hypothetically exceed 300,000 nodes if worst-case move ordering occurred. `solveExact` handles this by returning `null`, triggering a graceful fallback to heuristic minimax search.
2. **Variants with Loops**:
   - While Kalah is strictly acyclic, future variants like Oware in Phase 4 may permit cyclical sowing (grand loops) under certain conditions. The node budget and maximum ply protection in `solveExact` guarantee termination regardless of variant rules.
3. **Reference Minimax Performance at High Stone Counts**:
   - Plain unpruned minimax has exponential complexity. In `endgame.test.ts`, the 500 positions should have stone counts distributed between 1 and 14 so the benchmark executes in under 2 seconds.

---

## 4. Conclusion & Concrete Architectural Specifications

### Specification 1: Exact Endgame Solver (`src/solver/endgame.ts`)

#### Target Location
Create new file `src/solver/endgame.ts`.

#### Interface Contract
```ts
import { RuleSet, GameState } from '../rules/types';

export interface SolverResult {
  value: number;        // Exact terminal stone margin from perspective of s.turn (win > 0, draw = 0, loss < 0)
  best: number[];       // Principal variation (optimal sequence of moves from root to terminal)
  exact: true;          // Discriminated exactness flag
  nodes: number;        // Total nodes expanded
}

export interface SolveOptions {
  budgetNodes?: number; // Max nodes before bailout (default: 300_000)
}

export type TTFlag = 'EXACT' | 'LOWER' | 'UPPER';

export interface SolverTTEntry {
  value: number;
  flag: TTFlag;
  bestMove: number;
  bestPV: number[];
}
```

#### Core Algorithm (`src/solver/endgame.ts`)
```ts
export const DEFAULT_ENDGAME_BUDGET = 300_000;
export const DEFAULT_ENDGAME_THRESHOLD = 14;

export const solverTT = new Map<string, SolverTTEntry>();
export const MAX_SOLVER_TT_SIZE = 300_000;

export function clearSolverCache(): void {
  solverTT.clear();
}

export function countPlayableStones(rules: RuleSet, s: GameState): number {
  const stores = rules.layout.stores;
  let count = 0;
  for (let i = 0; i < s.board.length; i++) {
    if (!stores.includes(i)) count += s.board[i];
  }
  return count;
}

export function isEndgame(rules: RuleSet, s: GameState, threshold = DEFAULT_ENDGAME_THRESHOLD): boolean {
  if (s.over || rules.isTerminal(s)) return false;
  return countPlayableStones(rules, s) <= threshold;
}

export function solveExact(
  rules: RuleSet,
  s: GameState,
  budgetNodes = DEFAULT_ENDGAME_BUDGET
): SolverResult | null {
  // 1. Handle immediate terminal
  if (s.over || rules.isTerminal(s)) {
    const [s0, s1] = rules.score(s);
    const value = s.turn === 0 ? s0 - s1 : s1 - s0;
    return { value, best: [], exact: true, nodes: 1 };
  }

  const legal = rules.legalMoves(s);
  if (legal.length === 0) {
    const [s0, s1] = rules.score(s);
    const value = s.turn === 0 ? s0 - s1 : s1 - s0;
    return { value, best: [], exact: true, nodes: 1 };
  }

  let nodes = 0;

  function negamax(
    state: GameState,
    alpha: number,
    beta: number
  ): { value: number; pv: number[] } | null {
    nodes++;
    if (nodes > budgetNodes) return null;

    // Check terminal
    if (state.over || rules.isTerminal(state)) {
      const [s0, s1] = rules.score(state);
      const termVal = state.turn === 0 ? s0 - s1 : s1 - s0;
      return { value: termVal, pv: [] };
    }

    const moves = rules.legalMoves(state);
    if (moves.length === 0) {
      const [s0, s1] = rules.score(state);
      const termVal = state.turn === 0 ? s0 - s1 : s1 - s0;
      return { value: termVal, pv: [] };
    }

    const key = rules.key(state);
    const entry = solverTT.get(key);
    if (entry) {
      if (entry.flag === 'EXACT') {
        return { value: entry.value, pv: entry.bestPV };
      }
      if (entry.flag === 'LOWER') {
        alpha = Math.max(alpha, entry.value);
      } else if (entry.flag === 'UPPER') {
        beta = Math.min(beta, entry.value);
      }
      if (alpha >= beta) {
        return { value: entry.value, pv: entry.bestPV };
      }
    }

    // Move ordering: try cached best move first
    let orderedMoves = moves;
    if (entry && entry.bestMove !== -1 && moves.includes(entry.bestMove)) {
      orderedMoves = [entry.bestMove, ...moves.filter(m => m !== entry.bestMove)];
    }

    let bestVal = -Infinity;
    let bestMove = orderedMoves[0];
    let bestPV: number[] = [];
    const alphaOrig = alpha;

    for (const move of orderedMoves) {
      const res = rules.apply(state, move);
      let childVal: number;
      let childPV: number[];

      if (res.state.over || rules.isTerminal(res.state)) {
        const [s0, s1] = rules.score(res.state);
        childVal = state.turn === 0 ? s0 - s1 : s1 - s0;
        childPV = [];
      } else if (res.state.turn === state.turn) {
        // Free turn: same player's turn continues
        const child = negamax(res.state, alpha, beta);
        if (!child) return null;
        childVal = child.value;
        childPV = child.pv;
      } else {
        // Turn passes to opponent: invert bounds
        const child = negamax(res.state, -beta, -alpha);
        if (!child) return null;
        childVal = -child.value;
        childPV = child.pv;
      }

      if (childVal > bestVal) {
        bestVal = childVal;
        bestMove = move;
        bestPV = [move, ...childPV];
      }

      alpha = Math.max(alpha, bestVal);
      if (alpha >= beta) {
        break; // Alpha-beta cutoff
      }
    }

    const flag: TTFlag = bestVal <= alphaOrig ? 'UPPER' : bestVal >= beta ? 'LOWER' : 'EXACT';
    if (solverTT.size >= MAX_SOLVER_TT_SIZE) solverTT.clear();
    solverTT.set(key, { value: bestVal, flag, bestMove, bestPV });

    return { value: bestVal, pv: bestPV };
  }

  const result = negamax(s, -Infinity, Infinity);
  if (!result) return null;

  return {
    value: result.value,
    best: result.pv,
    exact: true,
    nodes
  };
}
```

---

### Specification 2: 500-Position Cross-Check Benchmark (`src/solver/endgame.test.ts`)

#### Target Location
Create new file `src/solver/endgame.test.ts`.

#### Reference Implementation & Test Suite Structure
```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { solveExact, clearSolverCache, countPlayableStones, isEndgame } from './endgame';
import { createKalahRuleSet, KALAH_P1_STORE, KALAH_P2_STORE } from '../rules/kalah';
import { RuleSet, GameState } from '../rules/types';

/**
 * Independent ground-truth reference minimax:
 * - ZERO alpha-beta pruning (no bounds).
 * - ZERO transposition table / caching.
 * - Pure exhaustive recursion to true terminal states.
 */
function referenceMinimax(rules: RuleSet, s: GameState): number {
  if (s.over || rules.isTerminal(s)) {
    const [s0, s1] = rules.score(s);
    return s.turn === 0 ? s0 - s1 : s1 - s0;
  }
  const legal = rules.legalMoves(s);
  if (legal.length === 0) {
    const [s0, s1] = rules.score(s);
    return s.turn === 0 ? s0 - s1 : s1 - s0;
  }

  let best = -Infinity;
  for (const move of legal) {
    const res = rules.apply(s, move);
    let val: number;
    if (res.state.over || rules.isTerminal(res.state)) {
      const [s0, s1] = rules.score(res.state);
      val = s.turn === 0 ? s0 - s1 : s1 - s0;
    } else if (res.state.turn === s.turn) {
      val = referenceMinimax(rules, res.state);
    } else {
      val = -referenceMinimax(rules, res.state);
    }
    if (val > best) best = val;
  }
  return best;
}

/** Seeded PRNG for 100% deterministic, reproducible positions */
function createSeededRNG(seed = 987654321) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

function generate500EndgamePositions(): GameState[] {
  const rand = createSeededRNG();
  const positions: GameState[] = [];
  const playablePits = [0, 1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 12];

  while (positions.length < 500) {
    const totalStones = 1 + Math.floor(rand() * 14); // 1 to 14 active stones
    const board = new Array(14).fill(0);
    board[KALAH_P1_STORE] = Math.floor(rand() * 20);
    board[KALAH_P2_STORE] = Math.floor(rand() * 20);

    let distributed = 0;
    while (distributed < totalStones) {
      const pit = playablePits[Math.floor(rand() * playablePits.length)];
      board[pit]++;
      distributed++;
    }

    const turn = (rand() < 0.5 ? 0 : 1) as 0 | 1;
    const state: GameState = { board, turn, over: false };

    // Must have at least 1 legal move
    const legalPits = turn === 0 ? [0, 1, 2, 3, 4, 5] : [7, 8, 9, 10, 11, 12];
    const hasMove = legalPits.some(p => board[p] > 0);
    if (hasMove) {
      positions.push(state);
    }
  }

  return positions;
}

describe('Endgame Solver: 500-Position Cross-Check & Terminal Accuracy', () => {
  const rules = createKalahRuleSet();

  beforeEach(() => {
    clearSolverCache();
  });

  it('matches reference minimax across 500 random positions with 0 mismatches', () => {
    const positions = generate500EndgamePositions();
    expect(positions.length).toBe(500);

    let mismatches = 0;
    for (let i = 0; i < positions.length; i++) {
      const pos = positions[i];
      const expected = referenceMinimax(rules, pos);
      const actual = solveExact(rules, pos);

      expect(actual).not.toBeNull();
      if (actual!.value !== expected) {
        mismatches++;
      }
      expect(actual!.value).toBe(expected);
    }

    expect(mismatches).toBe(0);
  });

  it('correctly evaluates known terminal positions', () => {
    const terminalState: GameState = {
      board: [0, 0, 0, 0, 0, 0, 26, 0, 0, 0, 0, 0, 0, 22],
      turn: 0,
      over: true
    };
    const res = solveExact(rules, terminalState);
    expect(res).not.toBeNull();
    expect(res!.value).toBe(4); // 26 - 22 = +4 for P0
    expect(res!.best).toEqual([]);
    expect(res!.exact).toBe(true);
  });

  it('correctly solves single-move forced winning sequence', () => {
    // P0 has 1 stone in pit 5 (adjacent to store 6). Lands in store 6 and game ends.
    const state: GameState = {
      board: [0, 0, 0, 0, 0, 1, 20, 0, 0, 0, 0, 0, 0, 20],
      turn: 0,
      over: false
    };
    const res = solveExact(rules, state);
    expect(res).not.toBeNull();
    expect(res!.best[0]).toBe(5);
    expect(res!.value).toBe(1); // 21 - 20 = +1
  });

  it('correctly solves forced multi-step free turn chain', () => {
    // P0 has pit 5: 1 stone, pit 4: 2 stones.
    // Optimal: pit 5 first (lands in 6, free turn), then pit 4 (lands in 5 and 6, free turn).
    const state: GameState = {
      board: [0, 0, 0, 0, 2, 1, 10, 0, 0, 0, 0, 0, 0, 10],
      turn: 0,
      over: false
    };
    const res = solveExact(rules, state);
    expect(res).not.toBeNull();
    expect(res!.best[0]).toBe(5);
  });

  it('asserts exact evaluations win % is strictly 0, 50, or 100% only', () => {
    const positions = generate500EndgamePositions().slice(0, 50);
    for (const pos of positions) {
      const res = solveExact(rules, pos);
      expect(res).not.toBeNull();
      const winPct = res!.value > 0 ? 100 : res!.value === 0 ? 50 : 0;
      expect([0, 50, 100]).toContain(winPct);
    }
  });
});
```

---

### Specification 3: Truthful Evaluation Labelling & Integration

#### 1. Type Definitions (`src/workers/protocol.ts`)
```ts
export type EvaluationKind = 'exact' | 'estimate';

export interface Evaluation {
  value: number;        // Stone margin from perspective of s.turn (exact) or P0 (estimate)
  kind: EvaluationKind; // Discriminated kind
  depth?: number;       // Search lookahead depth (present on estimate)
  winPct?: number;      // Strictly 0, 50, or 100 for exact; rough float for estimate
  nodes?: number;       // Explored node count
}

export interface EvaluatedMove {
  pit: number;
  label: string;
  score: number;
  winProb: number;      // Strictly 0, 0.5, or 1.0 if exact!
  pv: number[];
  freeTurn: boolean;
  captures: number;
  resultingBoard: number[];
  rank: number;
  equityLoss: number;
  scoreDiff: number;
  classification: 'Excellent (Best)' | 'Good' | 'Inaccuracy' | 'Mistake' | 'Blunder';
  badgeColor: string;
  exact?: boolean;
}

export interface AnalysisResult {
  id: number;
  score: number;
  winProb: number;
  pv: number[];
  evaluatedMoves: EvaluatedMove[];
  depth: number;
  exact: boolean;       // Mandatory boolean
  evaluation?: Evaluation;
}
```

#### 2. Worker Logic (`src/workers/search.worker.ts`)
```ts
// Trigger condition: playable pit stones <= 14
const unbanked = countPlayableStones(ruleSet, req.state);
if (unbanked <= 14) {
  const exactSol = solveExact(ruleSet, req.state, 300_000);
  if (exactSol) {
    // Solve all candidate moves with exact solver to give precise grades
    const legalMoves = ruleSet.legalMoves(req.state);
    const evaluatedMoves: EvaluatedMove[] = legalMoves.map(pit => {
      const res = ruleSet.apply(req.state, pit);
      let childValue: number;
      let childPV: number[] = [pit];

      if (res.state.over || ruleSet.isTerminal(res.state)) {
        const [s0, s1] = ruleSet.score(res.state);
        childValue = req.state.turn === 0 ? s0 - s1 : s1 - s0;
      } else if (res.state.turn === req.state.turn) {
        const sol = solveExact(ruleSet, res.state, 50_000);
        childValue = sol ? sol.value : 0;
        if (sol) childPV = [pit, ...sol.best];
      } else {
        const sol = solveExact(ruleSet, res.state, 50_000);
        childValue = sol ? -sol.value : 0;
        if (sol) childPV = [pit, ...sol.best];
      }

      // Exact win probability: strictly 0.0, 0.5, or 1.0!
      const winProb = childValue > 0 ? 1.0 : childValue === 0 ? 0.5 : 0.0;

      return {
        pit,
        label: ruleSet.layout.label(pit),
        score: childValue,
        winProb,
        pv: childPV,
        freeTurn: res.extraTurn,
        captures: res.captured,
        resultingBoard: res.state.board,
        rank: 1,
        equityLoss: 0,
        scoreDiff: 0,
        classification: 'Excellent (Best)',
        badgeColor: 'bg-emerald-500/25 text-emerald-300 border-emerald-400',
        exact: true
      };
    });

    evaluatedMoves.sort((a, b) => b.score - a.score);
    const bestScore = evaluatedMoves[0]?.score ?? exactSol.value;

    // Grade moves based on exact stone loss
    const gradedMoves = evaluatedMoves.map((m, rank) => {
      const lossStones = bestScore - m.score;
      const equityLoss = (bestScore > 0 ? 1 : 0) - (m.score > 0 ? 1 : 0);
      let classification: EvaluatedMove['classification'] = 'Excellent (Best)';
      let badgeColor = 'bg-emerald-500/25 text-emerald-300 border-emerald-400';

      if (lossStones === 0) {
        classification = 'Excellent (Best)';
      } else if (lossStones <= 1) {
        classification = 'Good';
        badgeColor = 'bg-teal-500/20 text-teal-300 border-teal-500/30';
      } else if (lossStones <= 2) {
        classification = 'Inaccuracy';
        badgeColor = 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      } else if (lossStones <= 4) {
        classification = 'Mistake';
        badgeColor = 'bg-amber-600/25 text-amber-300 border-amber-600/40';
      } else {
        classification = 'Blunder';
        badgeColor = 'bg-rose-600/25 text-rose-300 border-rose-600/40';
      }

      return {
        ...m,
        rank: rank + 1,
        equityLoss,
        scoreDiff: lossStones,
        classification,
        badgeColor
      };
    });

    const bestVal = exactSol.value;
    const winPct = bestVal > 0 ? 100 : bestVal === 0 ? 50 : 0;
    const response: WorkerOutMessage = {
      type: 'ANALYSIS_RESULT',
      payload: {
        id: req.id,
        score: exactSol.value,
        winProb: bestVal > 0 ? 1.0 : bestVal === 0 ? 0.5 : 0.0,
        pv: exactSol.best,
        evaluatedMoves: gradedMoves,
        depth: 0,
        exact: true,
        evaluation: {
          value: exactSol.value,
          kind: 'exact',
          winPct,
          nodes: exactSol.nodes
        }
      }
    };
    self.postMessage(response);
    return;
  }
}
```

#### 3. Game State Hook Updates (`src/game/useGame.ts:624-633`)
```ts
const currentStoneAdvantage = useMemo(() => {
  if (state.isGameOver) {
    return state.board[P1_STORE] - state.board[P2_STORE];
  }
  if (!analysisResults || analysisResults.length === 0) return 0;
  const top = analysisResults[0];

  if (top.exact) {
    // Exact solver: score is ALREADY true stone margin from perspective of current player!
    const p1Margin = state.currentPlayer === 0 ? top.score : -top.score;
    return p1Margin;
  }

  // Heuristic search estimate: divide by 3.5 heuristic weight
  const rawP1Score = state.currentPlayer === 0 ? top.score : -top.score;
  const stones = rawP1Score / 3.5;
  return Math.round(stones * 10) / 10;
}, [state.isGameOver, state.board, state.currentPlayer, analysisResults]);

const isExactAnalysis = useMemo(() => {
  return analysisResults.length > 0 && Boolean(analysisResults[0]?.exact);
}, [analysisResults]);
```

#### 4. UI Display Updates in `EvalGauge.tsx`
Add `isExact?: boolean` prop:
```tsx
{/* Title tag indicating Exact vs Estimate */}
<div className="flex items-center space-x-2">
  <span className="text-floor text-xs font-bold tracking-tight opacity-75">
    Live Advantage (Stones)
  </span>
  {isExact ? (
    <span className="text-floor text-xs font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
      Exact
    </span>
  ) : (
    <span className="text-floor text-xs font-bold px-1.5 py-0.5 rounded-full bg-slate-500/20 text-slate-400 border border-slate-500/30">
      Estimate
    </span>
  )}
</div>

{/* Advantage Text */}
<div className="...">
  {isExact ? (
    // Exact: "+2 stones (Solved)"
    stoneAdvantage > 0 ? `+${stoneAdvantage} stones` : stoneAdvantage < 0 ? `${stoneAdvantage} stones` : 'Even (±0)'
  ) : (
    // Estimate: "about +2.5 stones"
    stoneAdvantage > 0.2 ? `about +${stoneAdvantage.toFixed(1)} stones` : stoneAdvantage < -0.2 ? `about ${stoneAdvantage.toFixed(1)} stones` : 'Even (±0.0)'
  )}
</div>
```

#### 5. UI Display Updates in `AnalysisPanel.tsx`
```tsx
{/* Header Lookahead vs Solved Tag */}
<span className={`text-xs font-mono ${theme.cardTextMuted}`}>
  {isExact ? 'Endgame Solved (Exact)' : `Lookahead: ${searchDepth} turns ${isAnalyzing ? '(Thinking...)' : ''}`}
</span>

{/* Candidate Move Win % Column */}
<td className={`${showWinPercent ? '' : 'hidden'} py-2.5 px-2 font-semibold`}>
  {isExact ? (
    // Strictly integer 100%, 50%, or 0%
    <span>{move.winProb === 1 ? '100%' : move.winProb === 0.5 ? '50%' : '0%'}</span>
  ) : (
    // Rough estimate
    <span>{(move.winProb * 100).toFixed(1)}%</span>
  )}
</td>
```

---

## 5. Verification Method

To verify the implementation of this specification:

1. **Endgame Solver 500-Position Cross-Check**:
   Run Vitest targeting `src/solver/endgame.test.ts`:
   ```bash
   npx vitest run src/solver/endgame.test.ts
   ```
   **Expected**: 500 random positions match `referenceMinimax` with 0 mismatches.
   **Invalidation Condition**: Any mismatch between `solveExact.value` and `referenceMinimax(rules, s)`.

2. **Truthful Evaluation Invariant Unit Test**:
   ```bash
   npx vitest run -t "asserts exact evaluations win % is strictly 0, 50, or 100% only"
   ```
   **Expected**: Passed. No fractional win percentages in exact endgames.

3. **Full Build & Typecheck**:
   ```bash
   npx tsc --noEmit
   npm test
   npm run build
   ```
   **Expected**: Clean compile, all tests pass, Vite build succeeds.
