/** Server → client WebSocket event types. Extend this union for new real-time features. */
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

export interface WsClientMessage {
  type: WsClientEventType;
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
