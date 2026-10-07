# Handoff Report: Phase 2 Trainer (Mistake Classification, Explanations & Rating)

**Agent**: `m2_explorer_2`  
**Date**: 2026-10-07  
**Working Directory**: `c:\Users\vjbel\hacks\mymancala\.agents\teamwork\m2_explorer_2`  
**Parent Agent**: Project Orchestrator (`85856d3d-5ca8-4fac-8578-3161a39fe3a5`)  

---

## 1. Observation

### 1.1 Existing Codebase & Architecture
- **Monolith / Engine Status**:
  - `src/rules/types.ts:31-41`: Defines headless `RuleSet` with `id`, `name`, `initial()`, `legalMoves(s)`, `apply(s, move): MoveResult`, `isTerminal(s)`, `score(s)`, `key(s)`, and `layout: BoardLayout`.
  - `src/rules/kalah.ts:96-175`: Pure implementation of `apply()`. Returns `MoveResult` containing `{ state, captured, extraTurn, path, capturedFrom, lastLanding }`.
  - `src/engine.ts:269-299`: Contains legacy `classifyEquityLoss(equityLoss, rank)` which relies on win probability deltas (`equityLoss < 0.025`, `0.075`, `0.15`) and string titles (`'Excellent (Best)' | 'Good' | 'Inaccuracy' | 'Mistake' | 'Blunder'`). This deviates from the Phase 2 stone-equity loss model.
  - `src/tactics.ts:14-22, 28-196`: `generateTacticalExplanation()` is hardcoded in English, tightly coupled to Kalah pit numbers (`oppName = isP1 ? 'North (Computer)' : 'South'`), and lacks i18n support.
  - `src/game/reviewHelper.ts:17-18`: Ad-hoc rating formula `Math.round(800 + (p1Acc / 100) * 850 + (activeBot.depth * 40))` and grade counts including `'Brilliant'` (`reviewHelper.ts:20`) which violates the locked 5-tier classification specification.
  - `src/bots.ts:29-261`: 4 bot personas defined: `pip` (depth 2), `gary` (depth 4), `pebble` (depth 6), `kalah` (depth 8).
  - `src/lenses.ts:8-15, 82-86`: Canonical lens `'errorRate'` is present in `CANONICAL_KEYS` and gated under `full` preset.
  - `src/i18n/types.ts:5-8`: Enforces `TranslationCatalog = Record<TranslationKey, string>` where `TranslationKey = keyof typeof en`. Any key added to `en.ts` MUST exist in `ar.ts` and `es.ts`.
  - `package.json:28-31`: `typescript ^5.6.3`, `vitest ^2.1.8`, `node v24.15.0`, `tsx v4.21.0`.

### 1.2 Test Baseline
- Running `npm test -- --run` passes 17 test files and 171 tests in 17.3s.
- `npx tsx --version` executes cleanly (`tsx v4.21.0`), confirming TypeScript CLI execution is ready for scripts.

---

## 2. Logic Chain

1. **Move Classification Shift (Probability Delta → Stone Equity Loss)**:
   - *Observation*: `src/engine.ts:269` grades moves on `equityLoss = bestWinProb - m.winProb` (a non-linear sigmoid conversion).
   - *Constraint*: `docs/plan/phase-2-trainer.md:20-28` mandates move loss based on net stone differential: `Loss = best eval − eval after played move`.
   - *Deduction*: Move classification must be extracted to `src/trainer/classify.ts`, using `type MoveGrade = 'best' | 'good' | 'inaccuracy' | 'mistake' | 'blunder'`. The thresholds must live in a single config object (`bestMax: 0`, `goodMax: 1`, `inaccuracyMax: 2`, `mistakeMax: 4`, else blunder).
   - *Handling Evaluation Kinds*: When comparing moves, both evaluations must be of the same kind (`'exact'` vs `'estimate'`). If mixed, they must be compared using search at equal depth to preserve metric integrity.

2. **Error Rate Tracking ("Mistakes per 100 moves")**:
   - *Observation*: `src/lenses.ts:14` defines canonical lens `'errorRate'`, and `src/i18n/glossary.ts:58-64` defines `'mistakesPer100'` as average stones lost per 100 moves.
   - *Deduction*: Error rate metric is $\text{averageLossPerMove} \times 100 = \frac{100 \sum \text{lossStones}_i}{N}$. It must be gated strictly behind `lens.errorRate` and rendered calmly without shame.

3. **Deterministic Explanations (Replacing Ad-Hoc English Tactics)**:
   - *Observation*: `src/tactics.ts` relies on string concatenation without internationalization and does not support headless variants.
   - *Constraint*: `docs/plan/phase-2-trainer.md:34-37` requires a pure function `explain(rules, before, move, analysis): ExplanationItem[]` with typed reason codes verified directly through the `RuleSet` engine (no LLM, no AI buzzwords).
   - *Deduction*: Move `src/tactics.ts` logic into `src/trainer/explain.ts`. Introduce 10 engine-verified reason codes (`EARNS_EXTRA_TURN`, `EXTRA_TURN_MISSED`, `EXECUTES_CAPTURE`, `CAPTURE_AVAILABLE`, `LEAVES_OPEN_CAPTURE`, `DEFENDS_THREAT`, `SETUP_EXTRA_TURN`, `STARVES_OPPONENT`, `HOARD_TOO_LONG`, `ENDGAME_SWEEP_TRIGGERED`).
   - *i18n Parity*: All reason codes must have message templates in `en.ts`, `ar.ts`, and `es.ts` matching `TranslationCatalog`.

4. **Local Rating Ladder & Calibration Tournament**:
   - *Observation*: Current Elo in `reviewHelper.ts` is an ungrounded linear formula; `mancala_rating_v1` does not exist yet.
   - *Constraint*: `docs/plan/phase-2-trainer.md:38-42` specifies an Elo ladder against calibrated bot personas with $K=32$ early ($<30$ games) and $K=16$ late. Friendly Level titles must be shown, with the raw rating number visible ONLY under the `full` lens.
   - *Calibration*: `scripts/bot-tournament.ts` must run 200 games per pair across the 4 bots (`pip`, `gary`, `pebble`, `kalah`) with deterministic seeds, computing relative Elo ratings and generating `docs/plan/bot-calibration.md`.

---

## 3. Caveats

- **Scope Boundary**: As an Explorer agent, this report provides read-only analysis and full architectural specifications. Implementation must be carried out by the designated implementer.
- **Engine Score Units**: In `src/engine.ts:197`, heuristic evaluations weight store differential by $3.5\times$ and pit counts by $0.6\times$. For heuristic evaluations, stone equity loss is converted via $\text{score} / 3.5$. For exact endgame solver evaluations, values are already in net integer stone differential.
- **Variant Portability**: While `RuleSet` is polymorphic, certain reason codes (like `SETUP_EXTRA_TURN`) are specific to sowing games with store goals (like Kalah). The specification abstracts layout queries (`rules.layout.stores`, `rules.layout.pitOwner`) so non-applicable rules return empty reason lists without runtime errors.

---

## 4. Conclusion & Concrete Specifications

### Specification 1: Mistake Classification (`src/trainer/classify.ts`)

#### 1.1 Types and Threshold Configuration
```ts
export type MoveGrade = 'best' | 'good' | 'inaccuracy' | 'mistake' | 'blunder';

export interface ClassificationThresholds {
  readonly bestMax: number;       // <= 0.0 stones
  readonly goodMax: number;       // <= 1.0 stones
  readonly inaccuracyMax: number; // <= 2.0 stones
  readonly mistakeMax: number;    // <= 4.0 stones
}

export const DEFAULT_CLASSIFICATION_THRESHOLDS: ClassificationThresholds = {
  bestMax: 0.0,
  goodMax: 1.0,
  inaccuracyMax: 2.0,
  mistakeMax: 4.0,
};
```

#### 1.2 Pure Classification Function
```ts
export function classify(
  lossStones: number,
  thresholds: ClassificationThresholds = DEFAULT_CLASSIFICATION_THRESHOLDS
): MoveGrade {
  const EPSILON = 1e-4;
  const loss = Math.max(0, lossStones);

  if (loss <= thresholds.bestMax + EPSILON) return 'best';
  if (loss <= thresholds.goodMax + EPSILON) return 'good';
  if (loss <= thresholds.inaccuracyMax + EPSILON) return 'inaccuracy';
  if (loss <= thresholds.mistakeMax + EPSILON) return 'mistake';
  return 'blunder';
}
```

#### 1.3 Move Loss Computation
```ts
export type EvaluationKind = 'exact' | 'estimate';

export interface PositionEvaluation {
  readonly value: number; // In stones from perspective of current turn
  readonly kind: EvaluationKind;
  readonly depth?: number;
}

export function computeLossStones(
  bestEval: PositionEvaluation,
  playedEval: PositionEvaluation,
  equalDepthFallback?: () => { bestScore: number; playedScore: number }
): number {
  if (bestEval.kind === playedEval.kind) {
    return Math.max(0, Number((bestEval.value - playedEval.value).toFixed(2)));
  }
  // Mixed evaluation kinds: evaluate both at equal search depth
  if (equalDepthFallback) {
    const fallback = equalDepthFallback();
    return Math.max(0, Number((fallback.bestScore - fallback.playedScore).toFixed(2)));
  }
  return Math.max(0, Number((bestEval.value - playedEval.value).toFixed(2)));
}
```

#### 1.4 Running Error Rate Tracking ("Mistakes per 100 moves")
```ts
export interface MoveRecord {
  readonly moveNumber: number;
  readonly player: 0 | 1;
  readonly playedPit: number;
  readonly bestPit: number;
  readonly lossStones: number;
  readonly grade: MoveGrade;
  readonly evalKind: EvaluationKind;
}

export interface ErrorRateSummary {
  readonly totalMoves: number;
  readonly totalLossStones: number;
  readonly averageLossPerMove: number;
  readonly mistakesPer100Moves: number; // averageLossPerMove * 100
  readonly counts: Record<MoveGrade, number>;
  readonly accuracyScore: number;       // 0–100 calm rating
}

export function computeErrorRate(history: readonly MoveRecord[]): ErrorRateSummary {
  const counts: Record<MoveGrade, number> = {
    best: 0,
    good: 0,
    inaccuracy: 0,
    mistake: 0,
    blunder: 0,
  };

  if (history.length === 0) {
    return {
      totalMoves: 0,
      totalLossStones: 0,
      averageLossPerMove: 0,
      mistakesPer100Moves: 0,
      counts,
      accuracyScore: 100,
    };
  }

  let totalLoss = 0;
  for (const move of history) {
    totalLoss += move.lossStones;
    counts[move.grade]++;
  }

  const averageLoss = totalLoss / history.length;
  const mistakesPer100 = averageLoss * 100;
  const accuracyScore = Math.max(10, Math.min(100, Math.round(100 - averageLoss * 28)));

  return {
    totalMoves: history.length,
    totalLossStones: Number(totalLoss.toFixed(2)),
    averageLossPerMove: Number(averageLoss.toFixed(3)),
    mistakesPer100Moves: Number(mistakesPer100.toFixed(1)),
    counts,
    accuracyScore,
  };
}
```

#### 1.5 Lens Gating & Visual Styling
- **Lens Rule**: Only displayed when `lens.errorRate === true`.
- **Badge Styling Tokens** (AAA/AA accessible):
  - `best`: `bg-emerald-500/20 text-emerald-800 dark:text-emerald-200 border-emerald-500/40`
  - `good`: `bg-teal-500/20 text-teal-800 dark:text-teal-200 border-teal-500/40`
  - `inaccuracy`: `bg-amber-500/20 text-amber-800 dark:text-amber-200 border-amber-500/40`
  - `mistake`: `bg-orange-500/20 text-orange-800 dark:text-orange-200 border-orange-500/40`
  - `blunder`: `bg-rose-500/20 text-rose-800 dark:text-rose-200 border-rose-500/40`

---

### Specification 2: Deterministic Explanations (`src/trainer/explain.ts`)

#### 2.1 Interface & Types
```ts
export type ReasonCode =
  | 'EARNS_EXTRA_TURN'
  | 'EXTRA_TURN_MISSED'
  | 'EXECUTES_CAPTURE'
  | 'CAPTURE_AVAILABLE'
  | 'LEAVES_OPEN_CAPTURE'
  | 'DEFENDS_THREAT'
  | 'SETUP_EXTRA_TURN'
  | 'STARVES_OPPONENT'
  | 'HOARD_TOO_LONG'
  | 'ENDGAME_SWEEP_TRIGGERED'
  | 'OPTIMAL_POSITIONAL';

export type ExplanationSeverity = 'positive' | 'info' | 'warning' | 'critical';

export interface ExplanationItem {
  readonly code: ReasonCode;
  readonly severity: ExplanationSeverity;
  readonly i18nKey: string;
  readonly params: Record<string, string | number>;
  readonly verified: true;
}
```

#### 2.2 Pure Explanation Function Contract
```ts
export function explain(
  rules: RuleSet,
  before: GameState,
  move: number,
  analysis?: {
    bestMove?: number;
    evaluatedMoves?: Array<{ pit: number; score: number }>;
  }
): ExplanationItem[];
```

#### 2.3 Formal Engine Verification Criteria
1. **`EARNS_EXTRA_TURN`**:
   `rules.apply(before, move).extraTurn === true`
2. **`EXTRA_TURN_MISSED`**:
   `!rules.apply(before, move).extraTurn` AND `rules.legalMoves(before).some(m => rules.apply(before, m).extraTurn)`
3. **`EXECUTES_CAPTURE`**:
   `rules.apply(before, move).captured > 0`
4. **`CAPTURE_AVAILABLE`**:
   `rules.apply(before, move).captured < Math.max(...rules.legalMoves(before).map(m => rules.apply(before, m).captured))`
5. **`LEAVES_OPEN_CAPTURE`**:
   Let `res = rules.apply(before, move)`. If `res.state.turn !== before.turn` and `!res.state.over`, check if opponent has legal move $om$ where `rules.apply(res.state, om).captured > 0` and this capture was not available before.
6. **`DEFENDS_THREAT`**:
   In `before`, opponent hypothetically threatened a capture against pit $P$. After `move`, opponent can no longer capture pit $P$.
7. **`SETUP_EXTRA_TURN`**:
   In `res.state`, player has a pit $p \neq move$ whose seeds land exactly in their store, which was not the case in `before`.
8. **`STARVES_OPPONENT`**:
   In `res.state`, total stones in opponent pits $\le 2$ with $\le 1$ legal move.
9. **`HOARD_TOO_LONG`**:
   Player pit had $\ge 10$ stones; failing to move it allowed opponent to capture or threaten it.
10. **`ENDGAME_SWEEP_TRIGGERED`**:
    `res.state.over === true` when `before.over === false`.
11. **`OPTIMAL_POSITIONAL`**:
    Default fallback for best moves when no tactical trigger fired.

#### 2.4 i18n Catalog Entries (100% Parity across EN, AR, ES)

| Key | English (`en.ts`) | Arabic (`ar.ts`) | Spanish (`es.ts`) |
|---|---|---|---|
| `explain.code.earnsExtraTurn` | Lands in your store, earning an immediate bonus turn. | تهبط في مستودعك، مما يمنحك دوراً إضافياً فورياً. | Cae en tu almacén, otorgándote un turno extra inmediato. |
| `explain.code.extraTurnMissed` | Missed an extra turn! Playing {missedPit} would have let you go again. | فاتك دور إضافي! كان اللعب من {missedPit} سيتيح لك اللعب مجدداً. | ¡Perdiste un turno extra! Jugar {missedPit} te habría permitido repetir. |
| `explain.code.executesCapture` | Captures {count} stones from {fromPit} into your store. | تأسر {count} أحجار من {fromPit} إلى مستودعك. | Captura {count} piedras de {fromPit} hacia tu almacén. |
| `explain.code.captureAvailable` | Missed capture! Playing {availablePit} would have captured {count} stones. | فاتك أسر متاح! كان اللعب من {availablePit} سيأسر {count} أحجار. | ¡Captura disponible! Jugar {availablePit} habría capturado {count} piedras. |
| `explain.code.leavesOpenCapture` | Leaves {vulnerablePit} vulnerable to a {count}-stone capture from opponent {oppPit}. | تترك {vulnerablePit} عرضة لأسر {count} أحجار من حفرة الخصم {oppPit}. | Deja {vulnerablePit} vulnerable a una captura de {count} piedras desde {oppPit}. |
| `explain.code.defendsThreat` | Defends {defendedPit}, preventing a {savedStones}-stone capture. | تحمي {defendedPit}، مانعة أسر {savedStones} أحجار. | Defiende {defendedPit}, evitando una captura de {savedStones} piedras. |
| `explain.code.setupExtraTurn` | Sets up a future bonus turn in {setupPit}. | تجهّز لدور إضافي مستقبلي في {setupPit}. | Prepara un futuro turno extra en {setupPit}. |
| `explain.code.starvesOpponent` | Starves opponent of stones, leaving them with only {count} active pebbles. | تضيّق على الخصم، تاركة له {count} حصى نشطة فقط. | Deja al oponente casi sin piedras, con solo {count} activas. |
| `explain.code.hoardTooLong` | Hoarding {count} stones in {pit} makes it a dangerous target for capture. | تجميع {count} أحجار في {pit} يجعلها هدفاً خطراً للأسر. | Acumular {count} piedras en {pit} la convierte en un blanco fácil de captura. |
| `explain.code.endgameSweepTriggered` | Clears the row and triggers the final endgame sweep. | تفرغ الصف وتطلق كنس نهاية اللعبة الأخير. | Vacía la fila y activa el barrido final de la partida. |
| `explain.code.optimalPositional` | Safe stone distribution to control board tempo. | توزيع آمن للحصى للتحكم في إيقاع اللوحة. | Distribución segura de piedras para controlar el ritmo. |

#### 2.5 Unit Test Fixture Specifications (Triggering vs Non-Triggering)

| Reason Code | Triggering Fixture State & Move | Non-Triggering Fixture State & Move |
|---|---|---|
| `EXTRA_TURN_MISSED` | `board[2] = 4` (lands in store 6), `board[0] = 2`. South plays `0`. | `board = [1,1,1,1,1,1, 0, ...]`. No pit reaches store 6. South plays `0`. |
| `CAPTURE_AVAILABLE` | `board[0] = 1`, `board[1] = 0`, `board[11] = 4`. Pit 0 captures Pit 11. South plays `2` instead. | `board = [4,4,4,4,4,4, 0, ...]`. Initial board: no capture available. South plays `2`. |
| `LEAVES_OPEN_CAPTURE` | South plays `3` into empty pit `4`. North pit `8` can now land in empty `8` opposite `4` and capture. | South plays `0`, landing pebbles only in occupied pits. North has zero captures. |
| `DEFENDS_THREAT` | North threatens capture on South pit `3`. South plays pit `3` (emptying it). | South plays pit `0` while no North threat existed against any pit. |
| `SETUP_EXTRA_TURN` | South plays pit `1`, dropping 1 stone into pit `3`, bringing pit `3` to exactly 3 stones (distance to store 6). | South plays pit `5`, dropping into store 6, no other pit altered to match distance. |
| `STARVES_OPPONENT` | Board has North pits with `[0,0,0,0,1,0]`. South plays pit `4`, giving North zero stones. | Both sides have $\ge 15$ stones distributed across pits. |
| `HOARD_TOO_LONG` | South pit `1` has 12 stones. North threatens opposite pit. South plays pit `5`. | South highest pit has 4 stones. |

---

### Specification 3: Local Rating Ladder (`src/trainer/rating.ts` & `scripts/bot-tournament.ts`)

#### 3.1 Calibrated Nominal Bot Ratings
| Bot Persona | ID | Search Depth | Nominal Elo Rating | Persona Role |
|---|---|---|---|---|
| Speedy Pip | `pip` | 2 | **900** | Rookie / Fast moves |
| Greedy Gary | `gary` | 4 | **1250** | Intermediate / Hoarder |
| Prof. Pebble | `pebble` | 6 | **1600** | Advanced / Calculator |
| Grandmaster Kalah | `kalah` | 8 | **1950** | Master / Endgame oracle |

#### 3.2 Elo Update Algorithm
- **User Default**: 1000
- **Expected Score**:
  $$E_{user} = \frac{1}{1 + 10^{(R_{bot} - R_{user}) / 400}}$$
- **Actual Score $S$**: Win = 1.0, Draw = 0.5, Loss = 0.0
- **K-Factor**:
  - Provisional ($N < 30$ games): $K = 32$
  - Established ($N \ge 30$ games): $K = 16$
- **Rating Delta**:
  $$\Delta R = \text{round}(K \cdot (S - E_{user}))$$
  $$R_{new} = \max(100, R_{user} + \Delta R)$$
- **Scope**: ONLY PvE rated games (`gameMode === 'pve'`) update rating.

#### 3.3 Friendly Level Titles & Lens Gating
| Rating Range | Level ID | English Title | Arabic Title | Spanish Title | Icon |
|---|---|---|---|---|---|
| 0 – 899 | `novice` | Novice | مبتدئ | Principiante | 🌱 |
| 900 – 1149 | `apprentice` | Apprentice | متدرّب | Aprendiz | 🌿 |
| 1150 – 1399 | `tactician` | Tactician | تكتيكي | Táctico | ⚔️ |
| 1400 – 1649 | `strategist` | Strategist | استراتيجي | Estratega | 🧠 |
| 1650 – 1899 | `master` | Master | أستاذ | Maestro | 🦉 |
| 1900+ | `grandmaster` | Grandmaster | أستاذ كبير | Gran Maestro | 👑 |

- **Lens Policy**:
  - In `justPlay`, `hints`, and `coach`: The numeric Elo (e.g. `1248`) is strictly **hidden**. The user sees only the Level Title (e.g. "Tactician ⚔️") and gentle trend ("Rising").
  - In `full` lens (Deep Analysis): The exact rating number is displayed ("Rating: 1248 ± 32 • Games: 14").

#### 3.4 Persistence Schema (`mancala_rating_v1`)
```ts
export const STORAGE_KEY_RATING = 'mancala_rating_v1';

export interface RatingGameRecord {
  readonly id: string;
  readonly timestamp: number;
  readonly botId: string;
  readonly botRating: number;
  readonly result: 'win' | 'loss' | 'draw';
  readonly userScore: number;
  readonly botScore: number;
  readonly delta: number;
  readonly newRating: number;
}

export interface RatingStateV1 {
  readonly version: 1;
  readonly rating: number;        // default: 1000
  readonly gamesPlayed: number;   // default: 0
  readonly wins: number;
  readonly draws: number;
  readonly losses: number;
  readonly peakRating: number;
  readonly history: readonly RatingGameRecord[]; // FIFO capped at 50 games
}
```

#### 3.5 Bot Calibration Tournament Script (`scripts/bot-tournament.ts`)
- **Execution**: `npx tsx scripts/bot-tournament.ts`
- **Methodology**:
  - Round-robin tournament among the 4 bots: $\binom{4}{2} = 6$ pairings.
  - 200 games per pair:
    - 100 games: Bot A as South (P1), Bot B as North (P2)
    - 100 games: Bot B as South (P1), Bot A as North (P2)
  - Total games: 1,200 simulated matches using headless `kalahRuleSet`.
  - Deterministic pseudo-random seed variation on first 2 moves (to prevent deterministic loops).
  - Calculates win rates, average stone margin, and first-player advantage.
  - Writes markdown output directly to `docs/plan/bot-calibration.md`.

---

## 5. Verification Method

### 5.1 Automated Command Checks
1. **Typecheck & Lints**:
   ```bash
   npx tsc --noEmit
   ```
2. **Unit Tests Execution**:
   ```bash
   npm test -- --run
   ```
3. **Tournament Execution**:
   ```bash
   npx tsx scripts/bot-tournament.ts
   ```

### 5.2 Verification Criteria
1. `src/trainer/classify.ts`:
   - Unit tests verify all 5 grades (`best`, `good`, `inaccuracy`, `mistake`, `blunder`) at boundaries (0.0, 1.0, 2.0, 4.0, 4.1).
   - "Mistakes per 100 moves" is verified against a 10-move deterministic test game.
2. `src/trainer/explain.ts`:
   - Unit tests verify all 10 reason codes with paired triggering and non-triggering fixtures.
   - `src/i18n/i18n.test.ts` passes with 100% key parity across `en.ts`, `ar.ts`, and `es.ts`.
3. `src/trainer/rating.ts`:
   - Unit tests verify Elo delta calculation for win/draw/loss with $K=32$ ($N<30$) and $K=16$ ($N\ge 30$).
   - Level title lookup matches correct tiers.
   - Storage corruption recovery restores default profile.
4. `scripts/bot-tournament.ts`:
   - Generates `docs/plan/bot-calibration.md` with complete matrix tables.

### 5.3 Invalidation Conditions
- Any reason code using non-deterministic heuristics or non-engine heuristics.
- Any discrepancy in i18n keys between `en.ts`, `ar.ts`, and `es.ts`.
- Exposing the numerical rating value when lens is not `full`.
