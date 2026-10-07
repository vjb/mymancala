import { encodeReplayHash } from '../share/codec';

export const ALLOWED_EMOJIS = ['👋', '👏', '🤔', '😮', '🤝', '🔥'] as const;
export type PresetEmoji = typeof ALLOWED_EMOJIS[number];

export type NetMessage =
  | { type: 'hello'; v: 'v1'; rulesId: string; seat: 0 | 1 }
  | { type: 'move'; n: number; pit: number }
  | { type: 'emoji'; emoji: PresetEmoji }
  | { type: 'resign'; player: 0 | 1 }
  | { type: 'rematch'; player: 0 | 1 }
  | { type: 'ping'; t: number }
  | { type: 'pong'; t: number };

/**
 * Validates and serializes a protocol message to JSON string.
 */
export function serializeNetMessage(msg: NetMessage): string {
  if (msg.type === 'emoji' && !ALLOWED_EMOJIS.includes(msg.emoji)) {
    throw new Error(`Forbidden emoji: only preset kid-safe emojis are permitted.`);
  }
  return JSON.stringify(msg);
}

/**
 * Parses and validates an incoming network message safely without throwing.
 */
export function parseNetMessage(raw: unknown): NetMessage | null {
  try {
    if (typeof raw !== 'string') return null;
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object' || !data.type) return null;

    switch (data.type) {
      case 'hello':
        if (data.v === 'v1' && typeof data.rulesId === 'string' && (data.seat === 0 || data.seat === 1)) {
          return { type: 'hello', v: 'v1', rulesId: data.rulesId, seat: data.seat };
        }
        return null;

      case 'move':
        if (typeof data.n === 'number' && typeof data.pit === 'number' && data.pit >= 0 && data.pit <= 15) {
          return { type: 'move', n: data.n, pit: data.pit };
        }
        return null;

      case 'emoji':
        if (ALLOWED_EMOJIS.includes(data.emoji)) {
          return { type: 'emoji', emoji: data.emoji };
        }
        return null;

      case 'resign':
        if (data.player === 0 || data.player === 1) {
          return { type: 'resign', player: data.player };
        }
        return null;

      case 'rematch':
        if (data.player === 0 || data.player === 1) {
          return { type: 'rematch', player: data.player };
        }
        return null;

      case 'ping':
        if (typeof data.t === 'number') {
          return { type: 'ping', t: data.t };
        }
        return null;

      case 'pong':
        if (typeof data.t === 'number') {
          return { type: 'pong', t: data.t };
        }
        return null;

      default:
        return null;
    }
  } catch {
    return null;
  }
}

/**
 * Generates a random 128-bit room identifier for friend matches.
 */
export function generateRoomId(): string {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  }
  // Fallback random hex
  let hex = '';
  for (let i = 0; i < 32; i++) {
    hex += Math.floor(Math.random() * 16).toString(16);
  }
  return hex;
}

/**
 * Asynchronous pass-by-link helper:
 * Creates an immutable URL hash encoding the current match moves so players can take turns over any chat or messaging app.
 */
export function createPassByLinkUrl(moves: number[], rulesId: string = 'kalah'): string {
  return encodeReplayHash({
    version: 'v1',
    rulesId,
    moves,
  });
}
