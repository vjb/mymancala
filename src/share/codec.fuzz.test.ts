import { describe, it, expect } from 'vitest';
import { encodeReplayHash, decodeReplayHash, ReplayPayload } from './codec';

describe('Replay URL Codec & 1,000-State Fuzzer Suite', () => {
  it('encodes and decodes an empty moves game lossless', () => {
    const payload: ReplayPayload = {
      version: 'v1',
      rulesId: 'kalah',
      moves: [],
    };
    const hash = encodeReplayHash(payload);
    expect(hash).toContain('#/r/v1.kalah..0');

    const decoded = decodeReplayHash(hash);
    expect(decoded.ok).toBe(true);
    if (decoded.ok) {
      expect(decoded.replay.moves).toEqual([]);
      expect(decoded.replay.rulesId).toBe('kalah');
      expect(decoded.replay.version).toBe('v1');
    }
  });

  it('encodes and decodes odd-length and even-length move sequences losslessly', () => {
    const oddMoves = [0, 5, 2];
    const hashOdd = encodeReplayHash({ version: 'v1', rulesId: 'kalah', moves: oddMoves });
    const decOdd = decodeReplayHash(hashOdd);
    expect(decOdd.ok).toBe(true);
    if (decOdd.ok) {
      expect(decOdd.replay.moves).toEqual(oddMoves);
    }

    const evenMoves = [1, 3, 4, 2];
    const hashEven = encodeReplayHash({ version: 'v1', rulesId: 'kalah', moves: evenMoves });
    const decEven = decodeReplayHash(hashEven);
    expect(decEven.ok).toBe(true);
    if (decEven.ok) {
      expect(decEven.replay.moves).toEqual(evenMoves);
    }
  });

  it('Replay URL codec fuzzer verifies lossless round-trip on 1,000 randomized game states per ORIGINAL_REQUEST.md:77', () => {
    // Deterministic LCG PRNG for repeatable test run
    let seed = 42;
    const rng = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };

    const rulesPool = ['kalah', 'oware', 'sow-and-score'];

    for (let i = 0; i < 1000; i++) {
      const rulesId = rulesPool[Math.floor(rng() * rulesPool.length)];
      // Random length between 1 and 120 moves
      const moveCount = 1 + Math.floor(rng() * 120);
      const moves: number[] = [];
      for (let m = 0; m < moveCount; m++) {
        // Pit moves 0..5 (valid pit indices)
        moves.push(Math.floor(rng() * 6));
      }

      const original: ReplayPayload = {
        version: 'v1',
        rulesId,
        moves,
      };

      const hash = encodeReplayHash(original);
      const decoded = decodeReplayHash(hash);

      expect(decoded.ok).toBe(true);
      if (decoded.ok) {
        expect(decoded.replay.version).toBe('v1');
        expect(decoded.replay.rulesId).toBe(rulesId);
        expect(decoded.replay.moves).toEqual(moves);
        expect(decoded.replay.moves.length).toBe(moves.length);
      }
    }
  });

  it('never throws on malformed, truncated, or adversarial inputs', () => {
    const maliciousInputs = [
      '',
      '   ',
      null,
      undefined,
      12345,
      {},
      [],
      '#/r/',
      '#/r/v2.kalah.abc.10',             // Unsupported version
      '#/r/v1',                          // Missing parts
      '#/r/v1.kalah',                    // Missing parts
      '#/r/v1.kalah.abc',                // Missing flags
      '#/r/v1.kalah.???invalid???.10',   // Corrupted base64
      '#/r/v1.kalah.ARk.FFFF',           // Huge move count mismatch
      '#/r/v1.kalah.ARk.-5',             // Negative count
      '#/r/v1.kalah.ARk.NaN',            // NaN count
      'javascript:alert(1)',
      'https://mancala.local/foo/bar',
    ];

    for (const input of maliciousInputs) {
      expect(() => {
        const res = decodeReplayHash(input);
        expect(res.ok).toBe(false);
        if (res.ok === false) {
          expect(res.error).toBeDefined();
          expect(typeof res.error).toBe('string');
        }
      }).not.toThrow();
    }
  });
});
