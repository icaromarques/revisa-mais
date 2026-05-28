import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

export function useRestWindow() {
  const { user } = useAuth();
  const [restWindow, setRestWindow] = useState({ active: true, start: "00:00", end: "07:00", allowManual: true });

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, 'users', user.uid), (docS) => {
      if (docS.exists()) {
        const data = docS.data();
        if (data.settings?.restWindow) {
          setRestWindow(data.settings.restWindow);
        }
      }
    });
    return () => unsub();
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
