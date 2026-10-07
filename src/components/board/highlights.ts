/**
 * src/components/board/highlights.ts
 * Pure deterministic highlight assignment for Mancala pits.
 * Enforces strict precedence: preview > best > lastMove > threat > playable > none.
 * Single active role per pit.
 */

export type HighlightKind =
  | 'none'
  | 'playable'    // Soft gold ring: legal pit on current player's turn
  | 'preview'     // Thick gold glow: source pit of active touch/hover preview
  | 'landing'     // Soft emerald pulse: final landing pit during preview
  | 'captured'    // Crimson pulse: opponent pit captured during preview
  | 'best'        // Gold star badge + emerald ring: engine top pick (lens gated)
  | 'threat'      // Dashed amber ring: opponent pit holding tactical threat (lens gated)
  | 'lastMove';   // Faint dashed white ring: pit played on prior turn (fades in 2.5s)

export interface PitHighlightContext {
  pitIndex: number;
  currentPlayer: number; // 0 (South) or 1 (North)
  isLegal: boolean;
  isGameOver: boolean;
  isAnimating: boolean;

  // Active preview state
  previewSourcePit: number | null;
  previewLandingPit: number | null;
  previewCapturedPit: number | null;

  // Lens states
  showBestMove: boolean;     // lenses.bestMoveHighlight
  showThreats: boolean;      // lenses.threatPits

  // Engine evaluation data
  isBestMove: boolean;
  isOpponentThreat: boolean;

  // Last move tracking
  lastMovedPit: number | null;
  isLastMoveActive: boolean; // true if within 2500ms and not dismissed
}

/**
 * Strict precedence resolver:
 * preview/landing/captured > best > lastMove > threat > playable > none
 */
export function getPitHighlight(ctx: PitHighlightContext): HighlightKind {
  // If moving pebbles are currently animating, suppress static highlights
  if (ctx.isAnimating) return 'none';

  // 1. PREVIEW PRECEDENCE (Active hover or 350ms touch preview)
  if (ctx.previewSourcePit !== null) {
    if (ctx.pitIndex === ctx.previewSourcePit) return 'preview';
    if (ctx.pitIndex === ctx.previewLandingPit) return 'landing';
    if (ctx.pitIndex === ctx.previewCapturedPit) return 'captured';
    return 'none';
  }

  // 2. BEST MOVE PRECEDENCE
  if (ctx.showBestMove && ctx.isBestMove && !ctx.isGameOver) {
    return 'best';
  }

  // 3. LAST MOVE PRECEDENCE (prior move source, expires in 2.5s)
  if (ctx.lastMovedPit === ctx.pitIndex && ctx.isLastMoveActive && !ctx.isGameOver) {
    return 'lastMove';
  }

  // 4. THREAT PIT PRECEDENCE (opponent tactical threats)
  if (ctx.showThreats && ctx.isOpponentThreat && !ctx.isGameOver) {
    return 'threat';
  }

  // 5. PLAYABLE PRECEDENCE (current player's legal pits)
  if (ctx.isLegal && !ctx.isGameOver) {
    return 'playable';
  }

  return 'none';
}

export interface HighlightStyle {
  ringClass: string;
  badge: { text: string; color: string } | null;
}

/**
 * Returns Tailwind styling tokens for a given HighlightKind.
 */
export function getHighlightStyle(kind: HighlightKind, skin = 'walnut'): HighlightStyle {
  const isHighContrast = skin === 'high-contrast';

  if (isHighContrast) {
    switch (kind) {
      case 'preview':
        return {
          ringClass: 'ring-4 ring-yellow-400 bg-yellow-400/30',
          badge: null
        };
      case 'landing':
        return {
          ringClass: 'ring-4 ring-lime-400 bg-lime-400/30 animate-pulse',
          badge: { text: 'LAND', color: 'bg-black text-lime-300 border border-lime-400 font-extrabold' }
        };
      case 'captured':
        return {
          ringClass: 'ring-4 ring-rose-500 bg-rose-950/60 animate-pulse',
          badge: { text: 'CAPT', color: 'bg-black text-rose-300 border border-rose-500 font-extrabold' }
        };
      case 'best':
        return {
          ringClass: 'ring-4 ring-yellow-300 bg-yellow-400/20',
          badge: { text: '★ BEST', color: 'bg-black text-yellow-300 border border-yellow-300 font-black' }
        };
      case 'lastMove':
        return {
          ringClass: 'ring-2 ring-dashed ring-white',
          badge: { text: 'LAST', color: 'bg-black text-white border border-white font-bold' }
        };
      case 'threat':
        return {
          ringClass: 'ring-4 ring-dashed ring-yellow-400 bg-yellow-400/20',
          badge: { text: 'THREAT', color: 'bg-black text-yellow-300 border border-dashed border-yellow-400 font-bold' }
        };
      case 'playable':
        return {
          ringClass: 'ring-2 ring-yellow-400 hover:ring-4 hover:ring-yellow-300',
          badge: null
        };
      case 'none':
      default:
        return {
          ringClass: '',
          badge: null
        };
    }
  }

  switch (kind) {
    case 'preview':
      return {
        ringClass: 'ring-2 ring-amber-400 bg-amber-500/20 shadow-[0_0_16px_rgba(251,191,36,0.5)]',
        badge: null
      };
    case 'landing':
      return {
        ringClass: 'ring-2 ring-emerald-400 bg-emerald-500/20 shadow-[0_0_18px_rgba(52,211,153,0.6)] animate-pulse',
        badge: { text: 'LAND', color: 'bg-emerald-500/30 text-emerald-300 border-emerald-500/50' }
      };
    case 'captured':
      return {
        ringClass: 'ring-2 ring-rose-500 bg-rose-950/40 shadow-[0_0_18px_rgba(244,63,94,0.6)] animate-pulse',
        badge: { text: 'CAPT', color: 'bg-rose-500/30 text-rose-300 border-rose-500/50' }
      };
    case 'best':
      return {
        ringClass: 'ring-1.5 ring-emerald-400/80 bg-emerald-500/10 shadow-[0_0_12px_rgba(52,211,153,0.3)]',
        badge: { text: '★', color: 'bg-emerald-500/30 text-emerald-300 border-emerald-500/50 font-bold' }
      };
    case 'lastMove':
      return {
        ringClass: 'ring-1 ring-dashed ring-white/30 border-white/30',
        badge: { text: 'LAST', color: 'bg-white/20 text-white border-white/30' }
      };
    case 'threat':
      return {
        ringClass: 'ring-1.5 ring-dashed ring-amber-500/70 bg-amber-500/10 shadow-[0_0_12px_rgba(245,158,11,0.25)]',
        badge: { text: 'THREAT', color: 'bg-amber-500/30 text-amber-300 border-amber-500/50' }
      };
    case 'playable':
      return {
        ringClass: 'ring-1 ring-amber-400/40 hover:ring-amber-400/80 hover:bg-amber-500/10',
        badge: null
      };
    case 'none':
    default:
      return {
        ringClass: '',
        badge: null
      };
  }
}
