import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AppNotification } from '@/types/notifications';
import { notificationService } from '@/services/notificationService';

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    // Run system sync
    notificationService.syncNotificationsFromModules(user.uid);

    // Subscribe to live updates
    const unsubscribe = notificationService.subscribeToUnread(user.uid, (data) => {
      setNotifications(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const markAsRead = (id: string) => notificationService.markAsRead(id);
  const markAllAsRead = () => user && notificationService.markAllAsRead(user.uid);
  const removeNotification = (id: string) => notificationService.deleteNotification(id);
  const archiveNotification = (id: string) => notificationService.archiveNotification(id);

  return {
    notifications,
    unreadCount: notifications.filter(n => n.status === 'nao_lida').length,
    loading,
    markAsRead,
    markAllAsRead,
    removeNotification,
    archiveNotification
  };
}
