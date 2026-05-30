import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { UserPreferences, DEFAULT_PREFERENCES } from '@/types/preferences';
import { apiClient } from '@/lib/api';

export function usePreferences() {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES as UserPreferences);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);

    const fetchPreferences = async () => {
      try {
        const { data } = await apiClient.get('/usuarios/preferencias'); // Idealmente uma rota que retorne prefs
        if (isMounted) {
          setPreferences({ ...DEFAULT_PREFERENCES, ...data });
        }
      } catch (err) {
        console.error("Error reading preferences via API:", err);
        // Fallback to default
        if (isMounted) {
            setPreferences(DEFAULT_PREFERENCES as UserPreferences);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchPreferences();

    return () => {
      isMounted = false;
    };
  }, [user]);

  return { preferences, loading };
}
