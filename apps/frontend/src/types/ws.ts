/** Server → client WebSocket event types (mirror of backend ws/types.ts). */
export type WsServerEventType =
  | 'connected'
  | 'ping'
  | 'calendar.updated'
  | 'notification.created'
  | 'notification.updated';

export type WsClientEventType = 'pong';

export interface WsServerMessage<T = unknown> {
  type: WsServerEventType;
  payload?: T;
  ts: number;
}

export interface CalendarUpdatedPayload {
  source: 'webhook' | 'sync' | 'manual' | 'evento';
  googleCalendarId?: string;
  imported?: number;
}

export interface NotificationEventPayload {
  notificationId?: string;
  action?: 'created' | 'updated' | 'deleted';
  notification?: Record<string, unknown>;
}
