import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { userPreferencesService } from '@/services/userPreferencesService';
import { UserPreferences, DEFAULT_PREFERENCES } from '@/types/preferences';
import { collection, onSnapshot, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export function usePreferences() {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES as UserPreferences);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const docRef = doc(db, 'preferencias_usuario', user.uid);
    const unsubscribe = onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        userPreferencesService.getPreferences(user.uid).then(prefs => {
          setPreferences(prefs);
          setLoading(false);
        });
      } else {
        setPreferences(DEFAULT_PREFERENCES as UserPreferences);
        setLoading(false);
      }
    }, (err) => {
      console.error("Error reading preferences:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  return { preferences, loading };
}
