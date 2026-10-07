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

/**
 * Pure move classification based on stone equity loss.
 */
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

export type EvaluationKind = 'exact' | 'estimate';

export interface PositionEvaluation {
  readonly value: number; // In stones from perspective of current turn
  readonly kind: EvaluationKind;
  readonly depth?: number;
}

/**
 * Computes stone equity loss between best and played move.
 */
export function computeLossStones(
  bestEval: PositionEvaluation,
  playedEval: PositionEvaluation,
  equalDepthFallback?: () => { bestScore: number; playedScore: number }
): number {
  if (bestEval.kind === playedEval.kind) {
    return Math.max(0, Number((bestEval.value - playedEval.value).toFixed(2)));
  }
  // Mixed evaluation kinds: evaluate both at equal search depth if fallback provided
  if (equalDepthFallback) {
    const fallback = equalDepthFallback();
    return Math.max(0, Number((fallback.bestScore - fallback.playedScore).toFixed(2)));
  }
  return Math.max(0, Number((bestEval.value - playedEval.value).toFixed(2)));
}

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

/**
 * Computes calm error rate statistics: "Mistakes per 100 moves"
 */
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

/**
 * Accessible UI badge tokens for move grades.
 */
export function getGradeBadgeTokens(grade: MoveGrade): {
  readonly bg: string;
  readonly border: string;
  readonly text: string;
} {
  switch (grade) {
    case 'best':
      return { bg: 'bg-emerald-500/20', border: 'border-emerald-500/40', text: 'text-emerald-400' };
    case 'good':
      return { bg: 'bg-teal-500/20', border: 'border-teal-500/40', text: 'text-teal-300' };
    case 'inaccuracy':
      return { bg: 'bg-amber-500/20', border: 'border-amber-500/40', text: 'text-amber-300' };
    case 'mistake':
      return { bg: 'bg-orange-500/20', border: 'border-orange-500/40', text: 'text-orange-300' };
    case 'blunder':
      return { bg: 'bg-rose-500/20', border: 'border-rose-500/40', text: 'text-rose-400' };
  }
}
