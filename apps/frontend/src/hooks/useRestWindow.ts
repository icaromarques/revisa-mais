import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
// TODO: Backend api endpoints need to be implemented for this to work.
import { apiClient } from '@/lib/api';

export function useRestWindow() {
  const { user } = useAuth();
  const [restWindow, setRestWindow] = useState({ active: true, start: "00:00", end: "07:00", allowManual: true });

  useEffect(() => {
    if (!user) return;
    
    let isMounted = true;
    const fetchSettings = async () => {
       try {
          const { data } = await apiClient.get('/usuarios/perfil');
          if (isMounted && data?.settings?.restWindow) {
             setRestWindow(data.settings.restWindow);
          }
       } catch(e) {
          console.error("Failed to fetch user settings for rest window", e);
       }
    };
    
    fetchSettings();
    // Setting up polling as we don't have onSnapshot anymore
    const interval = setInterval(fetchSettings, 60000); 

    return () => {
        isMounted = false;
        clearInterval(interval);
    };
  }, [user]);

  const isInRestWindow = (timeStr: string) => {
    if (!restWindow.active) return false;
    if (!timeStr) return false;
    const [h, m] = timeStr.split(':').map(Number);
    const timeMins = h * 60 + m;
    
    const [sh, sm] = restWindow.start.split(':').map(Number);
    const startMins = sh * 60 + sm;
    
    const [eh, em] = restWindow.end.split(':').map(Number);
    const endMins = eh * 60 + em;

    if (startMins < endMins) {
      return timeMins >= startMins && timeMins <= endMins;
    } else {
      return timeMins >= startMins || timeMins <= endMins;
    }
  };

  return { restWindow, isInRestWindow };
}
