// TODO: Backend api endpoints need to be implemented for this to work.
import { apiClient } from '@/lib/api';
import { 
  AppNotification, 
  NotificationCategory, 
  NotificationPriority, 
  NotificationStatus, 
  NotificationType,
  NotificationAction
} from '@/types/notifications';
import { format, isSameDay, isBefore, addDays, startOfDay, parseISO, isAfter } from 'date-fns';

class NotificationService {
  private checkedToday = false;

  async syncNotificationsFromModules(userId: string) {
      try {
          await apiClient.post('/usuarios/notificacoes/sync');
      } catch(e) {
          console.error("Failed to sync notifications", e);
      }
  }

  async markAsRead(notificationId: string) {
    try {
        await apiClient.patch(`/usuarios/notificacoes/${notificationId}/read`);
    } catch(e) {
        console.error("Failed to mark notification as read", e);
        throw e;
    }
  }

  async markAllAsRead(userId: string) {
    try {
        await apiClient.patch('/usuarios/notificacoes/read-all');
    } catch(e) {
        console.error("Failed to mark all notifications as read", e);
        throw e;
    }
  }

  async updateStatus(notificationId: string, status: NotificationStatus) {
    try {
        await apiClient.patch(`/usuarios/notificacoes/${notificationId}/status`, { status });
    } catch(e) {
        console.error("Failed to update notification status", e);
        throw e;
    }
  }

  async removeOldNotifications(userId: string) {
      try {
          await apiClient.delete('/usuarios/notificacoes/old');
      } catch(e) {
          console.error("Failed to remove old notifications", e);
      }
  }

  subscribeToNotifications(userId: string, callback: (notifications: AppNotification[]) => void) {
      let isSubscribed = true;
      const fetchNotifs = async () => {
          try {
              const { data } = await apiClient.get('/usuarios/notificacoes');
              if (isSubscribed) {
                  callback(data);
              }
          } catch(e) {
              console.error("Failed to fetch notifications", e);
          }
      }
      
      fetchNotifs();
      const interval = setInterval(fetchNotifs, 60000);
      
      return () => {
          isSubscribed = false;
          clearInterval(interval);
      }
  }
}

export const notificationService = new NotificationService();
