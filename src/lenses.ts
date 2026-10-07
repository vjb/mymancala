/**
 * Lens system: every piece of "trainer" information is a named lens that can be
 * switched on or off individually. Presets are just bundles of lenses.
 * Pure TypeScript, zero React dependency.
 */

export type CanonicalLensId =
  | 'evalBar'              // live position balance gauge
  | 'bestMoveHighlight'    // star badge on recommended best pit
  | 'threatPits'           // highlighting opponent tactical threats
  | 'landingPreview'       // pebble drop trajectory, landing glow, capture pulse
  | 'principalVariation'   // expected continuation line (up to 3 ply)
  | 'explanations'         // plain-language reasons & interactive glossary
  | 'errorRate';           // accuracy tracking as mistakes per 100 moves

// Backward-compatible alias type for test suites and legacy components
export type LegacyLensId = 'advantageBar' | 'bestMoveMarks' | 'winPercent' | 'mainLine' | 'coach';
export type LensId = CanonicalLensId | LegacyLensId;

export interface LensState {
  evalBar: boolean;
  bestMoveHighlight: boolean;
  threatPits: boolean;
  landingPreview: boolean;
  principalVariation: boolean;
  explanations: boolean;
  errorRate: boolean;

  // Legacy aliases
  advantageBar?: boolean;
  bestMoveMarks?: boolean;
  mainLine?: boolean;
  coach?: boolean;
  winPercent?: boolean;
}

export type PresetId = 'justPlay' | 'hints' | 'coach' | 'full';

export interface LensInfo {
  id: CanonicalLensId;
  legacyId?: LegacyLensId;
  label: string;
  description: string;
}

export const LENSES: LensInfo[] = [
  {
    id: 'evalBar',
    legacyId: 'advantageBar',
    label: 'Position Balance Bar',
    description: 'Shows who has the advantage in stones.'
  },
  {
    id: 'bestMoveHighlight',
    legacyId: 'bestMoveMarks',
    label: 'Best Move Star',
    description: 'Marks the strongest pit recommendation with a star.'
  },
  {
    id: 'threatPits',
    label: 'Tactical Threat Warnings',
    description: 'Marks opponent pits that threaten captures or bonus turns.'
  },
  {
    id: 'landingPreview',
    label: 'Sowing Path Preview',
    description: 'Previews pebble landing pits and captures when touching a pit.'
  },
  {
    id: 'principalVariation',
    legacyId: 'mainLine',
    label: 'Expected Move Sequence',
    description: 'Shows the predicted sequence of moves for both sides.'
  },
  {
    id: 'explanations',
    legacyId: 'coach',
    label: 'Move Explanations & Glossary',
    description: 'Explains in plain words why moves are good, with tap-to-define terms.'
  },
  {
    id: 'errorRate',
    label: 'Accuracy Tracker',
    description: 'Tracks mistakes per 100 moves without intimidating scores.'
  }
];

const CANONICAL_KEYS: CanonicalLensId[] = [
  'evalBar',
  'bestMoveHighlight',
  'threatPits',
  'landingPreview',
  'principalVariation',
  'explanations',
  'errorRate'
];

export const LEGACY_ALIAS_MAP: Record<string, CanonicalLensId> = {
  advantageBar: 'evalBar',
  bestMoveMarks: 'bestMoveHighlight',
  mainLine: 'principalVariation',
  coach: 'explanations',
  winPercent: 'evalBar'
};

export function attachLegacyAliases(state: Record<CanonicalLensId, boolean>): LensState {
  const target = { ...state } as LensState;
  Object.defineProperties(target, {
    advantageBar: {
      get() { return this.evalBar; },
      set(v: boolean) { this.evalBar = Boolean(v); },
      configurable: true,
      enumerable: false
    },
    bestMoveMarks: {
      get() { return this.bestMoveHighlight; },
      set(v: boolean) { this.bestMoveHighlight = Boolean(v); },
      configurable: true,
      enumerable: false
    },
    mainLine: {
      get() { return this.principalVariation; },
      set(v: boolean) { this.principalVariation = Boolean(v); },
      configurable: true,
      enumerable: false
    },
    coach: {
      get() { return this.explanations; },
      set(v: boolean) { this.explanations = Boolean(v); },
      configurable: true,
      enumerable: false
    },
    winPercent: {
      get() { return this.evalBar; },
      set(v: boolean) { this.evalBar = Boolean(v); },
      configurable: true,
      enumerable: false
    }
  });
  return target;
}

const OFF: Record<CanonicalLensId, boolean> = {
  evalBar: false,
  bestMoveHighlight: false,
  threatPits: false,
  landingPreview: false,
  principalVariation: false,
  explanations: false,
  errorRate: false
};

export const PRESETS: Record<PresetId, { label: string; description: string; lenses: Record<CanonicalLensId, boolean> }> = {
  justPlay: {
    label: 'Just Play',
    description: 'Pure board. No numbers, no hints, zero distractions.',
    lenses: { ...OFF }
  },
  coach: {
    label: 'Gentle Coach',
    description: 'Calm balance bar, trajectory preview, and friendly blunder warnings.',
    lenses: {
      ...OFF,
      evalBar: true,
      landingPreview: true,
      explanations: true
    }
  },
  hints: {
    label: 'Tactician',
    description: 'Best move stars, threat warnings, and short lookahead lines.',
    lenses: {
      ...OFF,
      bestMoveHighlight: true,
      threatPits: true,
      principalVariation: true
    }
  },
  full: {
    label: 'Deep Analysis',
    description: 'Full engine transparency with all 7 analytical lenses active.',
    lenses: {
      evalBar: true,
      bestMoveHighlight: true,
      threatPits: true,
      landingPreview: true,
      principalVariation: true,
      explanations: true,
      errorRate: true
    }
  }
};

export const DEFAULT_PRESET: PresetId = 'coach';
export const PRESET_ORDER: PresetId[] = ['justPlay', 'hints', 'coach', 'full'];

export function applyPreset(id: PresetId): LensState {
  return attachLegacyAliases({ ...PRESETS[id].lenses });
}

/** Which preset exactly matches this state, or 'custom' if none does. */
export function detectPreset(state: LensState): PresetId | 'custom' {
  for (const id of PRESET_ORDER) {
    const p = PRESETS[id].lenses;
    if (CANONICAL_KEYS.every(k => p[k] === state[k])) return id;
  }
  return 'custom';
}

export function toggleLens(state: LensState, id: LensId, value?: boolean): LensState {
  const canonicalId = LEGACY_ALIAS_MAP[id] || (id as CanonicalLensId);
  const currentVal = Boolean(state[canonicalId]);
  const nextVal = value ?? !currentVal;
  const raw: Record<CanonicalLensId, boolean> = {
    evalBar: state.evalBar,
    bestMoveHighlight: state.bestMoveHighlight,
    threatPits: state.threatPits,
    landingPreview: state.landingPreview,
    principalVariation: state.principalVariation,
    explanations: state.explanations,
    errorRate: state.errorRate,
    [canonicalId]: nextVal
  };
  return attachLegacyAliases(raw);
}

const STORAGE_KEY = 'mancala_lenses_v1';

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

function safeStorage(): StorageLike | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

function sanitize(raw: unknown): Record<CanonicalLensId, boolean> | null {
  if (!raw || typeof raw !== 'object') return null;
  const out = { ...OFF };
  const obj = raw as Record<string, unknown>;
  for (const k of CANONICAL_KEYS) {
    if (typeof obj[k] === 'boolean') {
      out[k] = obj[k] as boolean;
    }
  }
  // Check if legacy keys are present in saved JSON
  for (const [legacyKey, canonicalKey] of Object.entries(LEGACY_ALIAS_MAP)) {
    if (typeof obj[legacyKey] === 'boolean' && typeof obj[canonicalKey] !== 'boolean') {
      out[canonicalKey] = obj[legacyKey] as boolean;
    }
  }
  return out;
}

/**
 * Load saved lenses. If none are saved yet, migrate the two older standalone
 * settings (hints and coach) so returning players keep their choices.
 */
export function loadLenses(storage: StorageLike | null = safeStorage()): LensState {
  if (!storage) return applyPreset(DEFAULT_PRESET);
  try {
    const saved = storage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = sanitize(JSON.parse(saved));
      if (parsed) return attachLegacyAliases(parsed);
    }
    const oldCoach = storage.getItem('mancala_tutor_mode');
    const oldHints = storage.getItem('mancala_show_hints');
    if (oldCoach !== null || oldHints !== null) {
      const base = PRESETS.coach.lenses;
      const migrated: Record<CanonicalLensId, boolean> = {
        ...base,
        explanations: oldCoach !== null ? oldCoach === 'true' : base.explanations,
        bestMoveHighlight: oldHints !== null ? oldHints === 'true' : base.bestMoveHighlight
      };
      return attachLegacyAliases(migrated);
    }
  } catch {
    /* fall through to default */
  }
  return applyPreset(DEFAULT_PRESET);
}

export function saveLenses(state: LensState, storage: StorageLike | null = safeStorage()): void {
  if (!storage) return;
  try {
    const toSave: Record<CanonicalLensId, boolean> = {
      evalBar: state.evalBar,
      bestMoveHighlight: state.bestMoveHighlight,
      threatPits: state.threatPits,
      landingPreview: state.landingPreview,
      principalVariation: state.principalVariation,
      explanations: state.explanations,
      errorRate: state.errorRate
    };
    storage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch {
    /* ignore quota / privacy-mode errors */
  }
}
