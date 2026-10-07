export * from './types';
export * from './kalah';
export * from './oware';
export * from './sow-and-score';
export * from './congkak';
export * from './bao';

import { RuleSet } from './types';
import { kalahRuleSet, createKalahRuleSet, KalahOptions } from './kalah';
import { owareRuleSet } from './oware';
import { sowAndScoreRuleSet } from './sow-and-score';
import { congkakRuleSet } from './congkak';
import { baoRuleSet } from './bao';

export interface VariantInfo {
  id: string;
  name: string;
  description: string;
  isBeta: boolean;
  analysisGrade: 'exact-endgame+search' | 'search-only';
}

export const VARIANT_METADATA: Record<string, VariantInfo> = {
  kalah: {
    id: 'kalah',
    name: 'Kalah',
    description: 'Classic western Mancala with free turns and opposite pit captures',
    isBeta: false,
    analysisGrade: 'exact-endgame+search',
  },
  oware: {
    id: 'oware',
    name: 'Oware (Abapa)',
    description: 'Traditional West African strategy game with 2-3 backwards chain captures',
    isBeta: false,
    analysisGrade: 'exact-endgame+search',
  },
  'sow-and-score': {
    id: 'sow-and-score',
    name: 'Sow & Score',
    description: 'Gentle teaching version for ages 6+ with pure sowing and store bank scoring',
    isBeta: false,
    analysisGrade: 'exact-endgame+search',
  },
  congkak: {
    id: 'congkak',
    name: 'Congkak / Dakon',
    description: 'Southeast Asian 7-pit continuous sowing game (rules vary by region)',
    isBeta: true,
    analysisGrade: 'search-only',
  },
  bao: {
    id: 'bao',
    name: 'Bao la Kiswahili',
    description: 'East African tactical masterwork with front row captures (rules vary by region)',
    isBeta: true,
    analysisGrade: 'search-only',
  },
};

export const RULESET_REGISTRY: Record<string, () => RuleSet> = {
  kalah: () => kalahRuleSet,
  oware: () => owareRuleSet,
  'sow-and-score': () => sowAndScoreRuleSet,
  congkak: () => congkakRuleSet,
  bao: () => baoRuleSet,
};

export function getRuleSet(id: string, options?: KalahOptions): RuleSet {
  if (id === 'kalah' && options) {
    return createKalahRuleSet(options);
  }
  const factory = RULESET_REGISTRY[id];
  if (!factory) {
    return kalahRuleSet;
  }
  return factory();
}
