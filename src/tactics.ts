import {
  P1_STORE,
  P2_STORE,
  P1_PITS,
  P2_PITS,
  simulateMove,
  getLegalMoves,
  RulesConfig,
  EvaluatedMove
} from './engine';

export interface TacticalExplanation {
  summary: string;
  consequence: string;
  threat: string | null;
  opponentThreatPit: number | null;
  vulnerablePit: number | null;
  recommendationComparison: string;
  badge: 'Free Turn Loss' | 'Conceded Capture' | 'Heavy Feeding' | 'Starvation' | 'Tempo Forfeited' | 'Best Move' | 'Tactical Mistake';
}

export function getPitLabel(pitIndex: number): string {
  if (pitIndex === P1_STORE) return 'South Store (P1)';
  if (pitIndex === P2_STORE) return 'North Store (P2)';
  if (pitIndex >= 0 && pitIndex <= 5) return `South Pit ${pitIndex + 1}`;
  if (pitIndex >= 7 && pitIndex <= 12) return `North Pit ${13 - pitIndex}`;
  return `Pit ${pitIndex}`;
}

export function generateTacticalExplanation(
  board: number[],
  player: number,
  move: EvaluatedMove,
  bestMove: EvaluatedMove,
  rules: RulesConfig = { freeTurn: true, captureOpposite: true }
): TacticalExplanation {
  const isP1 = player === 0;
  const oppName = isP1 ? 'North (Computer)' : 'South';
  const playerStore = isP1 ? P1_STORE : P2_STORE;
  const oppPits = isP1 ? P2_PITS : P1_PITS;
  const playerPits = isP1 ? P1_PITS : P2_PITS;

  const sim = simulateMove(board, player, move.pit, rules);
  const legalMoves = getLegalMoves(board, player);

  // Check if player had an available free turn move from the initial position
  const availableFreeTurn = legalMoves.find(p => {
    const s = simulateMove(board, player, p, rules);
    return s.earnedFreeTurn;
  });

  // Check if player had an available capture from the initial position
  const availableCapture = legalMoves.find(p => {
    const s = simulateMove(board, player, p, rules);
    return s.capturedStones > 0;
  });

  // Case 1: This is the Best Move
  if (move.rank === 1 || move.pit === bestMove.pit) {
    if (sim.earnedFreeTurn) {
      return {
        summary: 'Best Move: Scores +1 in your store and secures an immediate Free Turn.',
        consequence: `Lands your final stone in ${getPitLabel(playerStore)}, adding 1 point and letting you retain full tempo.`,
        threat: null,
        opponentThreatPit: null,
        vulnerablePit: null,
        recommendationComparison: 'Optimal tempo: allows you to chain an extra move without giving the opponent a turn.',
        badge: 'Best Move'
      };
    }

    if (sim.capturedStones > 0) {
      return {
        summary: `Best Move: Captures ${sim.capturedStones} stones from ${getPitLabel(sim.capturedFromPit!)}.`,
        consequence: `Lands in an empty pit on your side to sweep ${sim.capturedStones} stones into your store.`,
        threat: null,
        opponentThreatPit: null,
        vulnerablePit: null,
        recommendationComparison: 'Substantial material swing: extracts opponent stones and banks them safely.',
        badge: 'Best Move'
      };
    }

    return {
      summary: `Best Move: Engine's highest equity line (${(move.winProb * 100).toFixed(1)}% win chance).`,
      consequence: 'Safely redistributes stones along your side while restricting high-value counter-attacks.',
      threat: null,
      opponentThreatPit: null,
      vulnerablePit: null,
      recommendationComparison: 'Maximizes your long-term position and limits opponent tactical opportunities.',
      badge: 'Best Move'
    };
  }

  // --- Sub-optimal Moves: Diagnose Why ---
  let consequence = '';
  let threat: string | null = null;
  let opponentThreatPit: number | null = null;
  let vulnerablePit: number | null = null;
  let badge: TacticalExplanation['badge'] = 'Tactical Mistake';

  // 1. Diagnose Consequence
  const forfeitedFreeTurn = availableFreeTurn !== undefined && !sim.earnedFreeTurn;
  const missedCapture = availableCapture !== undefined && sim.capturedStones === 0;

  if (forfeitedFreeTurn) {
    consequence = `Forfeits a guaranteed Free Turn in your store (which was available by playing ${getPitLabel(availableFreeTurn)}).`;
    badge = 'Free Turn Loss';
  } else if (missedCapture) {
    const missedSim = simulateMove(board, player, availableCapture, rules);
    consequence = `Misses an available capture of ${missedSim.capturedStones} stones from ${getPitLabel(missedSim.capturedFromPit!)}.`;
    badge = 'Conceded Capture';
  } else if (sim.capturedStones > 0) {
    consequence = `Captures ${sim.capturedStones} stones from ${getPitLabel(sim.capturedFromPit!)}, but leaves your remaining layout tactically compromised.`;
  } else {
    // Check stone feeding across the board
    const stonesFed = sim.path.filter(p => (oppPits as readonly number[]).includes(p)).length;
    if (stonesFed >= 3) {
      consequence = `Feeds ${stonesFed} stones across the board directly into ${oppName}'s side, arming their pits while emptying your front line.`;
      badge = 'Heavy Feeding';
    } else {
      consequence = `Empties ${getPitLabel(move.pit)} without scoring in your store or creating an immediate threat.`;
    }
  }

  // 2. Diagnose Opponent Threat (Counter-play)
  if (sim.nextPlayer !== player) {
    const oppPlayer = 1 - player;
    // Determine opponent's top counter-move using PV from minimax or searching top legal reply
    let oppMove = move.pv && move.pv.length > 1 ? move.pv[1] : null;
    const oppLegal = getLegalMoves(sim.newBoard, oppPlayer);

    if (oppMove === null || !oppLegal.includes(oppMove)) {
      oppMove = oppLegal.length > 0 ? oppLegal[0] : null;
    }

    if (oppMove !== null) {
      opponentThreatPit = oppMove;
      const oppSim = simulateMove(sim.newBoard, oppPlayer, oppMove, rules);

      if (oppSim.capturedStones > 0) {
        threat = `Allows ${oppName} to counter with ${getPitLabel(oppMove)}, capturing ${oppSim.capturedStones} stones from your ${getPitLabel(oppSim.capturedFromPit!)}!`;
        vulnerablePit = oppSim.capturedFromPit;
        badge = 'Conceded Capture';
      } else if (oppSim.earnedFreeTurn) {
        threat = `Allows ${oppName} to play ${getPitLabel(oppMove)} straight into their store for a Free Turn, seizing total initiative.`;
        if (badge === 'Tactical Mistake') badge = 'Tempo Forfeited';
      } else {
        threat = `${oppName} can counter with ${getPitLabel(oppMove)}, controlling the board and advancing their lead.`;
      }
    }
  }

  // Check endgame starvation
  const playerStonesLeft = playerPits.reduce((acc, p) => acc + sim.newBoard[p], 0);
  const oppStonesLeft = oppPits.reduce((acc, p) => acc + sim.newBoard[p], 0);
  if (playerStonesLeft <= 2 && oppStonesLeft >= 8 && badge !== 'Conceded Capture') {
    consequence += ` Leaves your side with only ${playerStonesLeft} active stones, risking an endgame sweep.`;
    badge = 'Starvation';
  }

  // 3. Build Recommendation Comparison
  let recommendationComparison = '';
  const bestSim = simulateMove(board, player, bestMove.pit, rules);
  if (bestSim.earnedFreeTurn) {
    recommendationComparison = `Recommended ${getPitLabel(bestMove.pit)} scores +1 into your store and earns a Free Turn.`;
  } else if (bestSim.capturedStones > 0) {
    recommendationComparison = `Recommended ${getPitLabel(bestMove.pit)} captures ${bestSim.capturedStones} stones from ${getPitLabel(bestSim.capturedFromPit!)}.`;
  } else {
    recommendationComparison = `Recommended ${getPitLabel(bestMove.pit)} preserves a ${(bestMove.winProb * 100).toFixed(1)}% win chance without conceding counter-threats.`;
  }

  // 4. Build 1-line Summary
  let summary = '';
  if (forfeitedFreeTurn && vulnerablePit !== null) {
    summary = `Forfeits bonus turn & leaves ${getPitLabel(vulnerablePit)} open to capture`;
  } else if (vulnerablePit !== null) {
    summary = `Allows ${oppName} to capture your ${getPitLabel(vulnerablePit)}`;
  } else if (forfeitedFreeTurn) {
    summary = `Forfeits a guaranteed Free Turn in your store`;
  } else if (threat && threat.includes('Free Turn')) {
    summary = `Allows ${oppName} to earn a Free Turn & seize initiative`;
  } else if (badge === 'Heavy Feeding') {
    summary = `Feeds valuable stones directly into ${oppName}'s scoring bins`;
  } else {
    summary = `Sacrifices ${(move.equityLoss * 100).toFixed(1)}% win equity compared to ${getPitLabel(bestMove.pit)}`;
  }

  return {
    summary,
    consequence,
    threat,
    opponentThreatPit,
    vulnerablePit,
    recommendationComparison,
    badge
  };
}
