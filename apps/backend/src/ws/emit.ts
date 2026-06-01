import { wsHub } from './hub';
import type { CalendarUpdatedPayload, NotificationEventPayload } from './types';

export function emitCalendarUpdated(
  userId: string,
  payload: CalendarUpdatedPayload
): void {
  wsHub.publish(userId, 'calendar.updated', payload);
}

export function emitNotificationCreated(
  userId: string,
  payload: NotificationEventPayload = { action: 'created' }
): void {
  wsHub.publish(userId, 'notification.created', payload);
}

export function emitNotificationUpdated(
  userId: string,
  payload: NotificationEventPayload = { action: 'updated' }
): void {
  wsHub.publish(userId, 'notification.updated', payload);
}
