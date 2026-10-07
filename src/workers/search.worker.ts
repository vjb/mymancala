import { WorkerInMessage, WorkerOutMessage, AnalysisResult } from './protocol';
import { analyzeAllMoves, transpositionTable, EvaluatedMove } from '../engine';
import { getRuleSet } from '../rules';
import { countPlayableStones, solveExact, getTerminalScore } from '../solver/endgame';

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
      const unbanked = countPlayableStones(ruleSet, req.state);

      if (unbanked <= 14) {
        const exactSol = solveExact(ruleSet, req.state, 300_000);
        if (exactSol) {
          if (cancelledIds.has(req.id)) {
            cancelledIds.delete(req.id);
            self.postMessage({ type: 'CANCELLED', payload: { id: req.id } } as WorkerOutMessage);
            return;
          }

          const legalMoves = ruleSet.legalMoves(req.state);
          const evaluatedMoves: EvaluatedMove[] = legalMoves.map(pit => {
            const res = ruleSet.apply(req.state, pit);
            let childValue: number;
            let childPV: number[] = [pit];

            if (res.state.over || ruleSet.isTerminal(res.state)) {
              const termScore = getTerminalScore(ruleSet, res.state);
              childValue = res.state.turn === req.state.turn ? termScore : -termScore;
            } else if (res.state.turn === req.state.turn) {
              const sol = solveExact(ruleSet, res.state, 50_000);
              childValue = sol ? sol.value : 0;
              if (sol) childPV = [pit, ...sol.best];
            } else {
              const sol = solveExact(ruleSet, res.state, 50_000);
              childValue = sol ? -sol.value : 0;
              if (sol) childPV = [pit, ...sol.best];
            }

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
          const result: AnalysisResult = {
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
          };

          const response: WorkerOutMessage = {
            type: 'ANALYSIS_RESULT',
            payload: result
          };
          self.postMessage(response);
          return;
        }
      }

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
        exact: false,
        evaluation: {
          value: bestMove ? (req.state.turn === 0 ? bestMove.score : -bestMove.score) / 3.5 : 0,
          kind: 'estimate',
          depth: req.depth
        }
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
