import { describe, it, expect } from 'vitest';
import {
  serializeNetMessage,
  parseNetMessage,
  generateRoomId,
  createPassByLinkUrl,
  ALLOWED_EMOJIS,
  NetMessage,
} from './protocol';
import { EphemeralRelayHub, ROOM_EXPIRY_MS } from '../../relay/relay';

describe('Friend Play Protocol & Ephemeral Relay Suite', () => {
  it('serializes and parses valid protocol messages correctly', () => {
    const hello: NetMessage = { type: 'hello', v: 'v1', rulesId: 'oware', seat: 0 };
    const raw = serializeNetMessage(hello);
    const parsed = parseNetMessage(raw);
    expect(parsed).toEqual(hello);

    const move = { type: 'move' as const, n: 4, pit: 3 };
    const parsedMove = parseNetMessage(serializeNetMessage(move));
    expect(parsedMove).toEqual(move);

    const emoji = { type: 'emoji' as const, emoji: '🔥' as const };
    const parsedEmoji = parseNetMessage(serializeNetMessage(emoji));
    expect(parsedEmoji).toEqual(emoji);
  });

  it('strictly rejects non-preset emojis and unauthorized free text', () => {
    expect(() => {
      serializeNetMessage({ type: 'emoji', emoji: '😈' as any });
    }).toThrow(/Forbidden emoji/);

    const forgedJson = JSON.stringify({ type: 'emoji', emoji: 'unauthorized_string' });
    expect(parseNetMessage(forgedJson)).toBeNull();

    const textChatAttack = JSON.stringify({ type: 'chat', text: 'hello' });
    expect(parseNetMessage(textChatAttack)).toBeNull();
  });

  it('generates random 128-bit hexadecimal room IDs', () => {
    const id1 = generateRoomId();
    const id2 = generateRoomId();
    expect(id1).toHaveLength(32);
    expect(id2).toHaveLength(32);
    expect(id1).not.toBe(id2);
  });

  it('creates valid asynchronous pass-by-link URLs using replay codec', () => {
    const url = createPassByLinkUrl([0, 1, 2], 'oware');
    expect(url).toContain('#/r/v1.oware.');
  });

  it('relays messages between two sockets and isolates third parties', () => {
    const hub = new EphemeralRelayHub();
    const receivedA: string[] = [];
    const receivedB: string[] = [];

    const socketA = { send: (msg: string) => receivedA.push(msg) };
    const socketB = { send: (msg: string) => receivedB.push(msg) };
    const socketC = { send: () => {} };

    const roomId = 'test-room-123';
    expect(hub.joinRoom(roomId, socketA)).toBe(true);
    expect(hub.joinRoom(roomId, socketB)).toBe(true);
    // Max 2 players in room
    expect(hub.joinRoom(roomId, socketC)).toBe(false);

    // Socket A sends move
    hub.forwardMessage(roomId, socketA, '{"type":"move","n":1,"pit":4}');
    expect(receivedB).toHaveLength(1);
    expect(receivedB[0]).toBe('{"type":"move","n":1,"pit":4}');
    expect(receivedA).toHaveLength(0); // Sender doesn't receive echo
  });

  it('purges idle rooms after 30 minutes', () => {
    const hub = new EphemeralRelayHub();
    hub.getOrCreateRoom('idle-room');
    expect(hub.getRoomCount()).toBe(1);

    // Advance clock past 30 mins
    const now = Date.now() + ROOM_EXPIRY_MS + 1000;
    const purged = hub.cleanExpiredRooms(now);
    expect(purged).toBe(1);
    expect(hub.getRoomCount()).toBe(0);
  });
});
