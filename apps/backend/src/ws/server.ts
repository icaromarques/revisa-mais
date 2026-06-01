import type { Server } from 'http';
import jwt from 'jsonwebtoken';
import { parse as parseCookie } from 'cookie';
import { WebSocketServer, WebSocket } from 'ws';
import { wsHub } from './hub';
import type { WsClientMessage, WsServerMessage } from './types';

const WS_PATH = '/ws';
const PING_INTERVAL_MS = 30_000;

interface WsAuthPayload {
  id: string;
  email?: string;
  purpose?: string;
}

function verifyWsToken(token: string): WsAuthPayload | null {
  try {
    const secret = process.env.JWT_SECRET || 'fallback_secret';
    const decoded = jwt.verify(token, secret) as WsAuthPayload;
    if (!decoded?.id) return null;
    if (decoded.purpose && decoded.purpose !== 'ws') return null;
    return decoded;
  } catch {
    return null;
  }
}

function extractToken(req: { url?: string; headers: { cookie?: string } }): string | null {
  if (req.url) {
    try {
      const url = new URL(req.url, 'http://localhost');
      const queryToken = url.searchParams.get('token');
      if (queryToken) return queryToken;
    } catch {
      // ignore malformed URL
    }
  }

  const cookies = parseCookie(req.headers.cookie || '');
  return cookies.session || null;
}

function sendJson(socket: WebSocket, message: WsServerMessage): void {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(message));
  }
}

function handleConnection(ws: WebSocket, auth: WsAuthPayload): void {
  const userId = auth.id;
  wsHub.add(userId, ws);

  sendJson(ws, {
    type: 'connected',
    payload: { userId },
    ts: Date.now()
  });

  const pingTimer = setInterval(() => {
    sendJson(ws, { type: 'ping', ts: Date.now() });
  }, PING_INTERVAL_MS);

  ws.on('message', (raw) => {
    try {
      const message = JSON.parse(raw.toString()) as WsClientMessage;
      if (message.type === 'pong') {
        // keepalive ack
      }
    } catch {
      // ignore invalid client messages
    }
  });

  ws.on('close', () => {
    clearInterval(pingTimer);
    wsHub.remove(userId, ws);
  });

  ws.on('error', () => {
    clearInterval(pingTimer);
    wsHub.remove(userId, ws);
  });
}

export function attachWebSocketServer(httpServer: Server): WebSocketServer {
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on('upgrade', (req, socket, head) => {
    if (!req.url?.startsWith(WS_PATH)) {
      return;
    }

    const token = extractToken(req);
    if (!token) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    const auth = verifyWsToken(token);
    if (!auth) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    wss.handleUpgrade(req, socket, head, (ws) => {
      handleConnection(ws, auth);
    });
  });

  console.log(`[WS] WebSocket server attached at path ${WS_PATH}`);
  return wss;
}
