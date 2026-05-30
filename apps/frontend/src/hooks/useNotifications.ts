import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AppNotification } from '@/types/notifications';
import { notificationService } from '@/services/notificationService'; // Vamos refatorar esse arquivo também a seguir
import { apiClient } from '@/lib/api';

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

    let isMounted = true;

    const fetchNotifications = async () => {
      try {
        const { data } = await apiClient.get('/notificacoes');
        if (isMounted) {
            setNotifications(data);
        }
      } catch (err) {
        console.error("Failed to fetch notifications", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchNotifications();

    // Como removemos onSnapshot, deveríamos fazer um polling aqui provisoriamente
    // até termos websockets
    const interval = setInterval(fetchNotifications, 60000); // Poll a cada minuto

    return () => {
        isMounted = false;
        clearInterval(interval);
    };
  }, [user]);

  // Usaremos chamadas diretas ao serviço agora (que também deve ser refatorado)
  const markAsRead = async (id: string) => {
     await apiClient.patch(`/notificacoes/${id}/read`);
     setNotifications(prev => prev.map(n => n.id === id ? { ...n, status: 'lida' } : n));
  };
  
  const markAllAsRead = async () => {
     await apiClient.post('/notificacoes/mark-all-read');
     setNotifications(prev => prev.map(n => ({ ...n, status: 'lida' })));
  };
  
  const removeNotification = async (id: string) => {
     await apiClient.delete(`/notificacoes/${id}`);
     setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const archiveNotification = async (id: string) => {
     await apiClient.patch(`/notificacoes/${id}/archive`);
     setNotifications(prev => prev.map(n => n.id === id ? { ...n, status: 'arquivada' } : n));
  };

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
