/**
 * Zero-storage Ephemeral WebSocket Relay for Mancala Friend Play.
 * Compatible with Cloudflare Workers / Node / Edge runtimes.
 * Stores NO user data, logs NO move content, rooms expire after 30 minutes of inactivity.
 */

export interface RelayRoom {
  id: string;
  clients: Set<any>;
  lastActive: number;
}

export const ROOM_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes

export class EphemeralRelayHub {
  private rooms = new Map<string, RelayRoom>();

  getOrCreateRoom(roomId: string): RelayRoom {
    this.cleanExpiredRooms();
    let room = this.rooms.get(roomId);
    if (!room) {
      room = {
        id: roomId,
        clients: new Set(),
        lastActive: Date.now(),
      };
      this.rooms.set(roomId, room);
    }
    room.lastActive = Date.now();
    return room;
  }

  joinRoom(roomId: string, clientSocket: any): boolean {
    const room = this.getOrCreateRoom(roomId);
    if (room.clients.size >= 2) {
      return false; // Room full (max 2 players)
    }
    room.clients.add(clientSocket);
    room.lastActive = Date.now();
    return true;
  }

  leaveRoom(roomId: string, clientSocket: any): void {
    const room = this.rooms.get(roomId);
    if (room) {
      room.clients.delete(clientSocket);
      if (room.clients.size === 0) {
        this.rooms.delete(roomId);
      }
    }
  }

  forwardMessage(roomId: string, senderSocket: any, message: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;
    room.lastActive = Date.now();

    for (const client of room.clients) {
      if (client !== senderSocket && client.send) {
        client.send(message);
      }
    }
  }

  cleanExpiredRooms(now: number = Date.now()): number {
    let purged = 0;
    for (const [id, room] of this.rooms.entries()) {
      if (now - room.lastActive > ROOM_EXPIRY_MS) {
        this.rooms.delete(id);
        purged++;
      }
    }
    return purged;
  }

  getRoomCount(): number {
    return this.rooms.size;
  }
}
