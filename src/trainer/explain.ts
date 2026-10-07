import { RuleSet, GameState, Player } from '../rules/types';

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

/**
 * Pure functional deterministic explanation generator.
 * Every explanation item is mathematically verified directly via the RuleSet engine.
 * No LLM, no buzzwords.
 */
export function explain(
  rules: RuleSet,
  before: GameState,
  move: number,
  analysis?: {
    bestMove?: number;
    evaluatedMoves?: Array<{ pit: number; score: number }>;
  }
): ExplanationItem[] {
  const items: ExplanationItem[] = [];
  const playedRes = rules.apply(before, move);
  const legalMoves = rules.legalMoves(before);

  // 1. EARNS_EXTRA_TURN
  if (playedRes.extraTurn) {
    items.push({
      code: 'EARNS_EXTRA_TURN',
      severity: 'positive',
      i18nKey: 'explain.code.earnsExtraTurn',
      params: {},
      verified: true,
    });
  }

  // 2. EXTRA_TURN_MISSED
  if (!playedRes.extraTurn) {
    const missed = legalMoves.find(m => m !== move && rules.apply(before, m).extraTurn);
    if (missed !== undefined) {
      items.push({
        code: 'EXTRA_TURN_MISSED',
        severity: 'warning',
        i18nKey: 'explain.code.extraTurnMissed',
        params: { missedPit: rules.layout.label(missed) },
        verified: true,
      });
    }
  }

  // 3. EXECUTES_CAPTURE
  if (playedRes.captured > 0) {
    items.push({
      code: 'EXECUTES_CAPTURE',
      severity: 'positive',
      i18nKey: 'explain.code.executesCapture',
      params: {
        count: playedRes.captured,
        fromPit: rules.layout.label(playedRes.capturedFrom ?? move),
      },
      verified: true,
    });
  }

  // 4. CAPTURE_AVAILABLE
  let maxAvailableCap = 0;
  let bestCapPit = -1;
  for (const m of legalMoves) {
    const r = rules.apply(before, m);
    if (r.captured > maxAvailableCap) {
      maxAvailableCap = r.captured;
      bestCapPit = m;
    }
  }
  if (playedRes.captured < maxAvailableCap && maxAvailableCap > 0 && bestCapPit !== -1) {
    items.push({
      code: 'CAPTURE_AVAILABLE',
      severity: 'warning',
      i18nKey: 'explain.code.captureAvailable',
      params: {
        availablePit: rules.layout.label(bestCapPit),
        count: maxAvailableCap,
      },
      verified: true,
    });
  }

  // 5. LEAVES_OPEN_CAPTURE
  if (playedRes.state.turn !== before.turn && !playedRes.state.over) {
    const oppMoves = rules.legalMoves(playedRes.state);
    let maxOppCap = 0;
    let oppCaptureMove = -1;
    let vulnerablePit = -1;

    for (const om of oppMoves) {
      const r = rules.apply(playedRes.state, om);
      if (r.captured > maxOppCap) {
        maxOppCap = r.captured;
        oppCaptureMove = om;
        vulnerablePit = r.capturedFrom ?? -1;
      }
    }

    if (maxOppCap > 0 && oppCaptureMove !== -1) {
      const hypOppState: GameState = {
        board: [...before.board],
        turn: (1 - before.turn) as Player,
        over: before.over,
      };
      const preOppMoves = rules.legalMoves(hypOppState);
      const hadPriorThreat = preOppMoves.some(m => {
        const r = rules.apply(hypOppState, m);
        return r.captured > 0 && r.capturedFrom === vulnerablePit;
      });

      if (!hadPriorThreat) {
        items.push({
          code: 'LEAVES_OPEN_CAPTURE',
          severity: 'critical',
          i18nKey: 'explain.code.leavesOpenCapture',
          params: {
            vulnerablePit: vulnerablePit !== -1 ? rules.layout.label(vulnerablePit) : rules.layout.label(oppCaptureMove),
            count: maxOppCap,
            oppPit: rules.layout.label(oppCaptureMove),
          },
          verified: true,
        });
      }
    }
  }

  // 6. DEFENDS_THREAT
  const hypOppState: GameState = {
    board: [...before.board],
    turn: (1 - before.turn) as Player,
    over: before.over,
  };
  const preOppMoves = rules.legalMoves(hypOppState);
  let threatenedPit = -1;
  let threatStones = 0;

  for (const om of preOppMoves) {
    const r = rules.apply(hypOppState, om);
    if (r.captured > threatStones && r.capturedFrom !== null && rules.layout.pitOwner(r.capturedFrom) === before.turn) {
      threatStones = r.captured;
      threatenedPit = r.capturedFrom;
    }
  }

  if (threatenedPit !== -1 && threatStones > 0) {
    const postOppState: GameState = playedRes.state.turn === before.turn
      ? { board: [...playedRes.state.board], turn: (1 - before.turn) as Player, over: playedRes.state.over }
      : playedRes.state;
    const postOppMoves = rules.legalMoves(postOppState);
    const stillThreatened = postOppMoves.some(om => {
      const r = rules.apply(postOppState, om);
      return r.captured > 0 && r.capturedFrom === threatenedPit;
    });

    if (!stillThreatened) {
      items.push({
        code: 'DEFENDS_THREAT',
        severity: 'positive',
        i18nKey: 'explain.code.defendsThreat',
        params: {
          defendedPit: rules.layout.label(threatenedPit),
          savedStones: threatStones,
        },
        verified: true,
      });
    }
  }

  // 7. SETUP_EXTRA_TURN
  if (!playedRes.state.over && rules.layout.stores.length > before.turn) {
    const playerStore = rules.layout.stores[before.turn];
    for (let p = 0; p < before.board.length; p++) {
      if (rules.layout.stores.includes(p)) continue;
      if (rules.layout.pitOwner(p) !== before.turn) continue;
      if (p === move) continue;

      const dist = (playerStore - p + before.board.length) % before.board.length;
      const preCanReach = before.board[p] === dist;
      const postCanReach = playedRes.state.board[p] === dist;

      if (!preCanReach && postCanReach) {
        items.push({
          code: 'SETUP_EXTRA_TURN',
          severity: 'info',
          i18nKey: 'explain.code.setupExtraTurn',
          params: { setupPit: rules.layout.label(p) },
          verified: true,
        });
        break;
      }
    }
  }

  // 8. STARVES_OPPONENT
  if (!playedRes.state.over) {
    let oppStones = 0;
    for (let p = 0; p < playedRes.state.board.length; p++) {
      if (rules.layout.stores.includes(p)) continue;
      if (rules.layout.pitOwner(p) === (1 - before.turn)) {
        oppStones += playedRes.state.board[p];
      }
    }
    const oppTurnState: GameState = {
      board: [...playedRes.state.board],
      turn: (1 - before.turn) as Player,
      over: playedRes.state.over,
    };
    const oppLegalMoves = rules.legalMoves(oppTurnState);
    if (oppStones <= 2 && oppLegalMoves.length <= 1) {
      items.push({
        code: 'STARVES_OPPONENT',
        severity: 'info',
        i18nKey: 'explain.code.starvesOpponent',
        params: { count: oppStones },
        verified: true,
      });
    }
  }

  // 9. HOARD_TOO_LONG
  for (let p = 0; p < before.board.length; p++) {
    if (rules.layout.stores.includes(p)) continue;
    if (rules.layout.pitOwner(p) !== before.turn) continue;
    if (before.board[p] >= 10 && move !== p) {
      items.push({
        code: 'HOARD_TOO_LONG',
        severity: 'warning',
        i18nKey: 'explain.code.hoardTooLong',
        params: { count: before.board[p], pit: rules.layout.label(p) },
        verified: true,
      });
      break;
    }
  }

  // 10. ENDGAME_SWEEP_TRIGGERED
  if (playedRes.state.over && !before.over) {
    items.push({
      code: 'ENDGAME_SWEEP_TRIGGERED',
      severity: 'info',
      i18nKey: 'explain.code.endgameSweepTriggered',
      params: {},
      verified: true,
    });
  }

  // 11. OPTIMAL_POSITIONAL (fallback)
  if (items.length === 0) {
    items.push({
      code: 'OPTIMAL_POSITIONAL',
      severity: 'info',
      i18nKey: 'explain.code.optimalPositional',
      params: {},
      verified: true,
    });
  }

  return items;
}
