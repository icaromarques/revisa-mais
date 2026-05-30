// TODO: A refatoração completa deste serviço para usar apiClient foi adiada. 
// Atualmente ele ainda usa firebase/firestore diretamente.
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { UserPreferences, DEFAULT_PREFERENCES } from '@/types/preferences';

class UserPreferencesService {
  private cache: Record<string, UserPreferences> = {};

  private mergeWithDefaults(data: Partial<UserPreferences>): UserPreferences {
    return {
      ...DEFAULT_PREFERENCES,
      ...data,
      scheduling: {
        ...DEFAULT_PREFERENCES.scheduling,
        ...data.scheduling,
      },
      durations: {
        ...DEFAULT_PREFERENCES.durations,
        ...data.durations,
      },
      reviews: {
        ...DEFAULT_PREFERENCES.reviews,
        ...data.reviews,
      },
      recovery: {
        ...DEFAULT_PREFERENCES.recovery,
        ...data.recovery,
      },
      sessions: {
        ...DEFAULT_PREFERENCES.sessions,
        ...data.sessions,
      },
      notifications: {
        ...DEFAULT_PREFERENCES.notifications,
        ...data.notifications,
      },
      googleCalendar: {
        ...DEFAULT_PREFERENCES.googleCalendar,
        ...data.googleCalendar,
      }
    };
  }

  async getPreferences(userId: string): Promise<UserPreferences> {
    if (this.cache[userId]) {
      return this.cache[userId];
    }

    try {
      const docRef = doc(db, 'preferencias_usuario', userId);
      const snap = await getDoc(docRef);
      
      let prefs: UserPreferences;
      if (snap.exists()) {
        prefs = this.mergeWithDefaults(snap.data() as Partial<UserPreferences>);
      } else {
        prefs = this.mergeWithDefaults({});
      }
      
      this.cache[userId] = prefs;
      return prefs;
    } catch (e) {
      console.error("Error fetching preferences:", e);
      return this.mergeWithDefaults({});
    }
  }

  async savePreferences(userId: string, data: Partial<UserPreferences>): Promise<void> {
    try {
      const docRef = doc(db, 'preferencias_usuario', userId);
      const current = await this.getPreferences(userId);
      const merged = this.mergeWithDefaults({ ...current, ...data });

      await setDoc(docRef, {
        ...merged,
        user_id: userId,
        updated_at: new Date().toISOString()
      }, { merge: true });

      this.cache[userId] = merged;
    } catch (e) {
      console.error("Error saving preferences:", e);
      throw e;
    }
  }

  async updatePreferences<K extends keyof Omit<UserPreferences, 'user_id' | 'created_at'>>(
    userId: string, 
    section: K, 
    data: Partial<UserPreferences[K]>
  ): Promise<void> {
    try {
      const current = await this.getPreferences(userId);
      
      const updatedSection = {
        ...(current[section] as any),
        ...(data as any)
      };

      const updatedPrefs = {
        ...current,
        [section]: updatedSection
      };

      await this.savePreferences(userId, updatedPrefs);
    } catch (e) {
      console.error("Error updating preference section:", e);
      throw e;
    }
  }
}

export const userPreferencesService = new UserPreferencesService();
