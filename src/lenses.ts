/**
 * Lens system: every piece of "trainer" information is a named lens that can be
 * switched on or off individually. Presets are just bundles of lenses.
 * Nothing in here knows about React, so it is easy to test and reuse.
 */

export type LensId =
  | 'advantageBar'   // live stone-advantage gauge
  | 'errorRate'      // running performance rating / blunder counts
  | 'bestMoveMarks'  // star / rank marks on the pits
  | 'winPercent'     // win % and equity columns in the analysis
  | 'mainLine'       // principal variation (the expected sequence)
  | 'coach'          // warn before mistakes and blunders
  | 'explanations';  // plain-language "why" breakdowns

export type LensState = Record<LensId, boolean>;

export type PresetId = 'justPlay' | 'hints' | 'coach' | 'full';

export interface LensInfo {
  id: LensId;
  label: string;
  description: string;
}

export const LENSES: LensInfo[] = [
  { id: 'advantageBar', label: 'Advantage bar', description: 'Shows who is ahead, in stones.' },
  { id: 'bestMoveMarks', label: 'Best-move marks', description: 'Marks the strongest pits on the board.' },
  { id: 'coach', label: 'Coach warnings', description: 'Speaks up before a mistake, so you can take it back.' },
  { id: 'explanations', label: 'Explanations', description: 'Explains in words why a move is good or bad.' },
  { id: 'errorRate', label: 'Accuracy tracker', description: 'Keeps a running score of how accurately you play.' },
  { id: 'winPercent', label: 'Win chances', description: 'Shows win % and the cost of each move in the analysis.' },
  { id: 'mainLine', label: 'Expected sequence', description: 'Shows the likely next few moves for both sides.' }
];

const OFF: LensState = {
  advantageBar: false,
  errorRate: false,
  bestMoveMarks: false,
  winPercent: false,
  mainLine: false,
  coach: false,
  explanations: false
};

export const PRESETS: Record<PresetId, { label: string; description: string; lenses: LensState }> = {
  justPlay: {
    label: 'Just Play',
    description: 'Only the board. No numbers, no coaching.',
    lenses: { ...OFF }
  },
  hints: {
    label: 'Hints',
    description: 'The board plus best-move marks.',
    lenses: { ...OFF, bestMoveMarks: true }
  },
  coach: {
    label: 'Coach',
    description: 'A friendly coach who warns you and explains.',
    lenses: { ...OFF, coach: true, explanations: true, advantageBar: true }
  },
  full: {
    label: 'Full Analysis',
    description: 'Everything the engine knows.',
    lenses: {
      advantageBar: true,
      errorRate: true,
      bestMoveMarks: true,
      winPercent: true,
      mainLine: true,
      coach: true,
      explanations: true
    }
  }
};

export const DEFAULT_PRESET: PresetId = 'coach';
export const PRESET_ORDER: PresetId[] = ['justPlay', 'hints', 'coach', 'full'];

export function applyPreset(id: PresetId): LensState {
  return { ...PRESETS[id].lenses };
}

/** Which preset exactly matches this state, or 'custom' if none does. */
export function detectPreset(state: LensState): PresetId | 'custom' {
  for (const id of PRESET_ORDER) {
    const p = PRESETS[id].lenses;
    if ((Object.keys(p) as LensId[]).every(k => p[k] === state[k])) return id;
  }
  return 'custom';
}

export function toggleLens(state: LensState, id: LensId, value?: boolean): LensState {
  return { ...state, [id]: value ?? !state[id] };
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

function sanitize(raw: unknown): LensState | null {
  if (!raw || typeof raw !== 'object') return null;
  const out = { ...OFF };
  for (const k of Object.keys(OFF) as LensId[]) {
    const v = (raw as Record<string, unknown>)[k];
    if (typeof v === 'boolean') out[k] = v;
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
      if (parsed) return parsed;
    }
    const oldCoach = storage.getItem('mancala_tutor_mode');
    const oldHints = storage.getItem('mancala_show_hints');
    if (oldCoach !== null || oldHints !== null) {
      const base = applyPreset('coach');
      return {
        ...base,
        coach: oldCoach !== null ? oldCoach === 'true' : base.coach,
        explanations: oldCoach !== null ? oldCoach === 'true' : base.explanations,
        bestMoveMarks: oldHints !== null ? oldHints === 'true' : base.bestMoveMarks
      };
    }
  } catch {
    /* fall through to default */
  }
  return applyPreset(DEFAULT_PRESET);
}

export function saveLenses(state: LensState, storage: StorageLike | null = safeStorage()): void {
  if (!storage) return;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore quota / privacy-mode errors */
  }
}
