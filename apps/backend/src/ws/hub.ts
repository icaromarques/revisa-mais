import type WebSocket from 'ws';
import type { WsServerEventType, WsServerMessage } from './types';

class WebSocketHub {
  private readonly clients = new Map<string, Set<WebSocket>>();

  add(userId: string, socket: WebSocket): void {
    if (!this.clients.has(userId)) {
      this.clients.set(userId, new Set());
    }
    this.clients.get(userId)!.add(socket);
  }

  remove(userId: string, socket: WebSocket): void {
    const set = this.clients.get(userId);
    if (!set) return;
    set.delete(socket);
    if (set.size === 0) {
      this.clients.delete(userId);
    }
  }

  publishToUser<T>(userId: string, message: WsServerMessage<T>): void {
    const set = this.clients.get(userId);
    if (!set?.size) return;

    const raw = JSON.stringify(message);
    for (const socket of set) {
      if (socket.readyState === socket.OPEN) {
        socket.send(raw);
      }
    }
  }

  publish<T>(userId: string, type: WsServerEventType, payload?: T): void {
    this.publishToUser(userId, { type, payload, ts: Date.now() });
  }

  getConnectionCount(userId?: string): number {
    if (userId) {
      return this.clients.get(userId)?.size ?? 0;
    }
    let total = 0;
    for (const set of this.clients.values()) {
      total += set.size;
    }
    return total;
  }
}

export const wsHub = new WebSocketHub();
