import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { AppNotification } from '@/types/notifications';
import { apiClient } from '@/lib/api';
import { useWebSocketEvent } from '@/hooks/useWebSocketEvent';

export function useNotifications() {
  const { user } = useAuth();
  const { connected: wsConnected } = useWebSocket();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const fetchRef = useRef<() => Promise<void>>(async () => {});

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await apiClient.get('/notificacoes');
      setNotifications(data);
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  fetchRef.current = fetchNotifications;

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    void fetchNotifications();

    // Fallback polling when WebSocket is disconnected
    const pollMs = wsConnected ? 5 * 60 * 1000 : 60 * 1000;
    const interval = setInterval(() => {
      void fetchRef.current();
    }, pollMs);

    return () => clearInterval(interval);
  }, [user, wsConnected, fetchNotifications]);

  useWebSocketEvent('notification.created', () => {
    void fetchRef.current();
  });

  useWebSocketEvent('notification.updated', () => {
    void fetchRef.current();
  });

  const markAsRead = async (id: string) => {
    await apiClient.patch(`/notificacoes/${id}/read`);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, status: 'lida' } : n)));
  };

  const markAllAsRead = async () => {
    await apiClient.post('/notificacoes/mark-all-read');
    setNotifications((prev) => prev.map((n) => ({ ...n, status: 'lida' })));
  };

  const removeNotification = async (id: string) => {
    await apiClient.delete(`/notificacoes/${id}`);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const archiveNotification = async (id: string) => {
    await apiClient.patch(`/notificacoes/${id}/archive`);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, status: 'arquivada' } : n)));
  };

  return {
    notifications,
    unreadCount: notifications.filter((n) => n.status === 'nao_lida').length,
    loading,
    markAsRead,
    markAllAsRead,
    removeNotification,
    archiveNotification
  };
}
