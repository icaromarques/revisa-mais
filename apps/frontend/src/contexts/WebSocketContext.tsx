import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode
} from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api';
import { getWebSocketUrl } from '@/lib/wsUrl';
import type { WsServerEventType, WsServerMessage } from '@/types/ws';

type WsListener = (payload: unknown) => void;

interface WebSocketContextValue {
  connected: boolean;
  subscribe: (eventType: WsServerEventType | '*', listener: WsListener) => () => void;
}

const WebSocketContext = createContext<WebSocketContextValue | null>(null);

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const listenersRef = useRef(new Map<string, Set<WsListener>>());
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tokenRefreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dispatch = useCallback((type: string, payload?: unknown) => {
    listenersRef.current.get(type)?.forEach((listener) => listener(payload));
    listenersRef.current.get('*')?.forEach((listener) => listener({ type, payload }));
  }, []);

  const subscribe = useCallback(
    (eventType: WsServerEventType | '*', listener: WsListener) => {
      if (!listenersRef.current.has(eventType)) {
        listenersRef.current.set(eventType, new Set());
      }
      listenersRef.current.get(eventType)!.add(listener);
      return () => {
        listenersRef.current.get(eventType)?.delete(listener);
      };
    },
    []
  );

  useEffect(() => {
    if (!user) {
      wsRef.current?.close();
      wsRef.current = null;
      setConnected(false);
      return;
    }

    let cancelled = false;

    const clearTimers = () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      if (tokenRefreshTimerRef.current) {
        clearTimeout(tokenRefreshTimerRef.current);
        tokenRefreshTimerRef.current = null;
      }
    };

    const scheduleReconnect = (delayMs: number) => {
      if (cancelled) return;
      clearTimers();
      reconnectTimerRef.current = setTimeout(() => {
        void connect();
      }, delayMs);
    };

    const connect = async () => {
      if (cancelled) return;

      try {
        const { data } = await apiClient.get<{ token: string; expiresIn: number }>(
          '/auth/ws-token'
        );
        if (cancelled) return;

        const ws = new WebSocket(getWebSocketUrl(data.token));
        wsRef.current = ws;

        ws.onopen = () => {
          if (!cancelled) setConnected(true);
          const refreshMs = Math.max(30, (data.expiresIn - 30)) * 1000;
          tokenRefreshTimerRef.current = setTimeout(() => {
            ws.close(4000, 'token refresh');
          }, refreshMs);
        };

        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data as string) as WsServerMessage;
            if (message.type === 'ping') {
              if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'pong' }));
              }
              return;
            }
            if (message.type === 'connected') return;
            dispatch(message.type, message.payload);
          } catch {
            // ignore malformed messages
          }
        };

        ws.onclose = () => {
          setConnected(false);
          wsRef.current = null;
          if (!cancelled) scheduleReconnect(3000);
        };

        ws.onerror = () => {
          ws.close();
        };
      } catch {
        if (!cancelled) scheduleReconnect(5000);
      }
    };

    void connect();

    return () => {
      cancelled = true;
      clearTimers();
      wsRef.current?.close();
      wsRef.current = null;
      setConnected(false);
    };
  }, [user?.id, dispatch]);

  return (
    <WebSocketContext.Provider value={{ connected, subscribe }}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocket(): WebSocketContextValue {
  const ctx = useContext(WebSocketContext);
  if (!ctx) {
    throw new Error('useWebSocket must be used within WebSocketProvider');
  }
  return ctx;
}
