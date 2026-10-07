import { SearchRequest, AnalysisResult, WorkerInMessage, WorkerOutMessage } from './protocol';
import { analyzeAllMoves, EvaluatedMove } from '../engine';
import { getRuleSet } from '../rules';
import { countPlayableStones, solveExact, getTerminalScore } from '../solver/endgame';

export interface AnalyzeOptions {
  autoCancel?: boolean;
}

export class SearchClient {
  private worker: Worker | null = null;
  private currentRequestId = 0;
  private activeRequestId: number | null = null;
  private pendingPromises = new Map<number, {
    resolve: (val: AnalysisResult) => void;
    reject: (err: any) => void;
  }>();
  private cancelledIds = new Set<number>();

  constructor() {
    this.initWorker();
  }

  private initWorker() {
    if (typeof Worker !== 'undefined') {
      try {
        this.worker = new Worker(
          new URL('./search.worker.ts', import.meta.url),
          { type: 'module' }
        );
        this.worker.onmessage = this.handleMessage.bind(this);
        this.worker.onerror = this.handleError.bind(this);
      } catch (e) {
        console.warn('Worker initialization failed, using main-thread fallback:', e);
        this.worker = null;
      }
    }
  }

  private handleMessage(event: MessageEvent<WorkerOutMessage>) {
    const msg = event.data;
    if (msg.type === 'ANALYSIS_RESULT') {
      const res = msg.payload;
      if (this.activeRequestId === res.id) {
        this.activeRequestId = null;
      }
      if (this.cancelledIds.has(res.id)) {
        this.cancelledIds.delete(res.id);
        this.pendingPromises.delete(res.id);
        return;
      }
      // Latest-request-wins resolution
      const deferred = this.pendingPromises.get(res.id);
      if (deferred) {
        deferred.resolve(res);
        this.pendingPromises.delete(res.id);
      }
    } else if (msg.type === 'CANCELLED') {
      if (this.activeRequestId === msg.payload.id) {
        this.activeRequestId = null;
      }
      this.pendingPromises.delete(msg.payload.id);
      this.cancelledIds.delete(msg.payload.id);
    } else if (msg.type === 'ERROR') {
      if (this.activeRequestId === msg.payload.id) {
        this.activeRequestId = null;
      }
      const deferred = this.pendingPromises.get(msg.payload.id);
      if (deferred) {
        deferred.reject(new Error(msg.payload.error));
        this.pendingPromises.delete(msg.payload.id);
      }
    }
  }

  private handleError(e: ErrorEvent) {
    console.error('Web Worker error:', e);
    for (const [, deferred] of this.pendingPromises.entries()) {
      deferred.reject(new Error(`Worker error: ${e.message}`));
    }
    this.pendingPromises.clear();
    this.activeRequestId = null;
    this.worker?.terminate();
    this.initWorker();
  }

  public analyze(
    req: Omit<SearchRequest, 'id'>,
    options?: AnalyzeOptions
  ): Promise<AnalysisResult> {
    const shouldAutoCancel = options?.autoCancel ?? true;
    if (shouldAutoCancel && this.activeRequestId !== null && this.pendingPromises.has(this.activeRequestId)) {
      this.cancel(this.activeRequestId);
    }

    const id = ++this.currentRequestId;
    this.activeRequestId = id;
    const fullReq: SearchRequest = { ...req, id };

    // Fallback if Worker is not supported in the execution environment (e.g. Node/Vitest)
    if (!this.worker) {
      return new Promise<AnalysisResult>((resolve, reject) => {
        this.pendingPromises.set(id, { resolve, reject });
        queueMicrotask(() => {
          if (this.cancelledIds.has(id)) {
            this.cancelledIds.delete(id);
            this.pendingPromises.delete(id);
            if (this.activeRequestId === id) {
              this.activeRequestId = null;
            }
            return;
          }
          const ruleSet = getRuleSet(req.rules, req.rulesOptions);
          const unbanked = countPlayableStones(ruleSet, req.state);

          if (unbanked <= 14) {
            const exactSol = solveExact(ruleSet, req.state, 300_000);
            if (exactSol) {
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
              this.pendingPromises.delete(id);
              if (this.activeRequestId === id) {
                this.activeRequestId = null;
              }
              resolve({
                id,
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
              });
              return;
            }
          }

          const moves = analyzeAllMoves(
            req.state.board,
            req.state.turn,
            req.depth,
            ruleSet
          );
          const bestMove = moves[0];
          this.pendingPromises.delete(id);
          if (this.activeRequestId === id) {
            this.activeRequestId = null;
          }
          resolve({
            id,
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
          });
        });
      });
    }

    return new Promise<AnalysisResult>((resolve, reject) => {
      this.pendingPromises.set(id, { resolve, reject });
      const msg: WorkerInMessage = { type: 'ANALYZE', payload: fullReq };
      this.worker!.postMessage(msg);
    });
  }

  public getCurrentRequestId(): number {
    return this.currentRequestId;
  }

  public cancel(id: number): void {
    if (this.activeRequestId === id) {
      this.activeRequestId = null;
    }
    this.cancelledIds.add(id);
    this.pendingPromises.delete(id);
    if (this.worker) {
      const msg: WorkerInMessage = { type: 'CANCEL', payload: { id } };
      this.worker.postMessage(msg);
    }
  }

  public clearCache(): void {
    if (this.worker) {
      this.worker.postMessage({ type: 'CLEAR_CACHE' } as WorkerInMessage);
    }
  }

  public terminate(): void {
    this.worker?.terminate();
    this.worker = null;
    this.activeRequestId = null;
    this.pendingPromises.clear();
    this.cancelledIds.clear();
  }
}

export const searchClient = new SearchClient();
