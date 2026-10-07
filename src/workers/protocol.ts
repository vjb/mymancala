import { GameState } from '../rules/types';
import { EvaluatedMove, RulesConfig } from '../engine';

export type { EvaluatedMove, RulesConfig };

export interface SearchRequest {
  id: number;
  rules: string;
  rulesOptions?: RulesConfig;
  state: GameState;
  depth: number;
}

export type EvaluationKind = 'exact' | 'estimate';

export interface Evaluation {
  value: number;
  kind: EvaluationKind;
  depth?: number;
  winPct?: number;
  nodes?: number;
}

export interface AnalysisResult {
  id: number;
  score: number;
  winProb: number;
  pv: number[];
  evaluatedMoves: EvaluatedMove[];
  depth: number;
  exact?: boolean;
  evaluation?: Evaluation;
}

export interface CancelRequest {
  id: number;
}

export type WorkerInMessage =
  | { type: 'ANALYZE'; payload: SearchRequest }
  | { type: 'CANCEL'; payload: CancelRequest }
  | { type: 'CLEAR_CACHE' };

export type WorkerOutMessage =
  | { type: 'ANALYSIS_RESULT'; payload: AnalysisResult }
  | { type: 'CANCELLED'; payload: { id: number } }
  | { type: 'ERROR'; payload: { id: number; error: string } };
