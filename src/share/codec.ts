export interface ReplayPayload {
  version: string;       // e.g. 'v1'
  rulesId: string;       // e.g. 'kalah', 'oware', 'sow-and-score'
  moves: number[];       // pit index sequence
  flags?: string;        // optional flags
}

export type DecodeResult =
  | { ok: true; replay: ReplayPayload }
  | { ok: false; error: string };

/**
 * Base64url encode a Uint8Array (Node and browser safe, no external dependencies).
 */
export function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  let base64 = '';
  if (typeof btoa !== 'undefined') {
    base64 = btoa(binary);
  } else if (typeof Buffer !== 'undefined') {
    base64 = Buffer.from(binary, 'binary').toString('base64');
  } else {
    // Fallback table-based encoder
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    for (let i = 0; i < bytes.length; i += 3) {
      const b0 = bytes[i];
      const b1 = i + 1 < bytes.length ? bytes[i + 1] : 0;
      const b2 = i + 2 < bytes.length ? bytes[i + 2] : 0;
      base64 += chars[b0 >> 2];
      base64 += chars[((b0 & 3) << 4) | (b1 >> 4)];
      base64 += i + 1 < bytes.length ? chars[((b1 & 15) << 2) | (b2 >> 6)] : '=';
      base64 += i + 2 < bytes.length ? chars[b2 & 63] : '=';
    }
  }
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Base64url decode into Uint8Array (Node and browser safe).
 */
export function base64UrlToBytes(str: string): Uint8Array {
  // Restore base64 standard padding and chars
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4 !== 0) {
    base64 += '=';
  }

  let binary: string;
  if (typeof atob !== 'undefined') {
    binary = atob(base64);
  } else if (typeof Buffer !== 'undefined') {
    binary = Buffer.from(base64, 'base64').toString('binary');
  } else {
    throw new Error('No base64 decoder available');
  }

  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Packs moves (0..15) into 4-bit nibbles.
 * Two moves per byte: high nibble = move 2*i, low nibble = move 2*i + 1.
 */
export function packMoves(moves: number[]): Uint8Array {
  const byteCount = Math.ceil(moves.length / 2);
  const bytes = new Uint8Array(byteCount);

  for (let i = 0; i < moves.length; i++) {
    const byteIndex = Math.floor(i / 2);
    const nibble = moves[i] & 0x0f;
    if (i % 2 === 0) {
      bytes[byteIndex] |= (nibble << 4);
    } else {
      bytes[byteIndex] |= nibble;
    }
  }

  return bytes;
}

/**
 * Unpacks moves from 4-bit nibbles given exact move count.
 */
export function unpackMoves(bytes: Uint8Array, count: number): number[] {
  const moves: number[] = [];
  for (let i = 0; i < count; i++) {
    const byteIndex = Math.floor(i / 2);
    if (byteIndex >= bytes.length) {
      throw new Error(`Corrupted move payload: expected ${count} moves, got ${bytes.length} bytes`);
    }
    const move = (i % 2 === 0)
      ? (bytes[byteIndex] >> 4) & 0x0f
      : bytes[byteIndex] & 0x0f;
    moves.push(move);
  }
  return moves;
}

/**
 * Encodes replay payload into URL hash string:
 * #/r/<v1>.<rulesId>.<base64url(moves packed 4 bits/move)>.<flags>
 */
export function encodeReplayHash(payload: ReplayPayload): string {
  const version = payload.version || 'v1';
  const rulesId = payload.rulesId || 'kalah';
  const moves = payload.moves || [];
  const packed = packMoves(moves);
  const b64 = bytesToBase64Url(packed);
  const countHex = moves.length.toString(16);
  const extraFlags = payload.flags ? `_${payload.flags}` : '';
  const flags = `${countHex}${extraFlags}`;

  return `#/r/${version}.${rulesId}.${b64}.${flags}`;
}

/**
 * Decodes replay from URL or hash string.
 * Strictly guarantees NEVER to throw — returns friendly error on corrupt/invalid input.
 */
export function decodeReplayHash(input: unknown): DecodeResult {
  try {
    if (typeof input !== 'string' || !input.trim()) {
      return { ok: false, error: 'Replay string is empty or missing.' };
    }

    let raw = input.trim();
    // Strip URL origin or leading hash
    const hashIdx = raw.indexOf('#/r/');
    if (hashIdx !== -1) {
      raw = raw.substring(hashIdx + 4);
    } else if (raw.startsWith('/r/')) {
      raw = raw.substring(3);
    } else if (raw.startsWith('#')) {
      raw = raw.substring(1);
    }

    const parts = raw.split('.');
    if (parts.length < 4) {
      return {
        ok: false,
        error: 'Malformed replay link: missing required components (version.rules.moves.flags).',
      };
    }

    const [version, rulesId, b64Moves, flags] = parts;

    if (version !== 'v1') {
      return {
        ok: false,
        error: `Unsupported replay version "${version}". Only v1 is supported.`,
      };
    }

    if (!rulesId || rulesId.length > 32) {
      return { ok: false, error: 'Invalid or missing rules identifier.' };
    }

    const [countHex, ...restFlags] = flags.split('_');
    const count = parseInt(countHex, 16);
    if (isNaN(count) || count < 0 || count > 2000) {
      return { ok: false, error: 'Invalid move count in replay metadata.' };
    }

    if (count === 0) {
      return {
        ok: true,
        replay: {
          version,
          rulesId,
          moves: [],
          flags: restFlags.join('_'),
        },
      };
    }

    const bytes = base64UrlToBytes(b64Moves);
    const expectedBytes = Math.ceil(count / 2);
    if (bytes.length < expectedBytes) {
      return {
        ok: false,
        error: 'Truncated replay payload: not enough bytes for recorded moves.',
      };
    }

    const moves = unpackMoves(bytes, count);

    return {
      ok: true,
      replay: {
        version,
        rulesId,
        moves,
        flags: restFlags.join('_'),
      },
    };
  } catch (err) {
    return {
      ok: false,
      error: `Failed to decode replay: ${err instanceof Error ? err.message : 'Unknown error'}`,
    };
  }
}
