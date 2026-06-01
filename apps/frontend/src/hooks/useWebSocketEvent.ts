import { useEffect, useRef } from 'react';
import { useWebSocket } from '@/contexts/WebSocketContext';
import type { WsServerEventType } from '@/types/ws';

/** Subscribe to a specific WebSocket event type; handler runs when the server pushes. */
export function useWebSocketEvent<T = unknown>(
  eventType: WsServerEventType,
  handler: (payload: T | undefined) => void,
  enabled = true
): void {
  const { subscribe } = useWebSocket();
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!enabled) return;
    return subscribe(eventType, (payload) => {
      handlerRef.current(payload as T | undefined);
    });
  }, [subscribe, eventType, enabled]);
}
