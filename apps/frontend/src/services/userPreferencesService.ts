import { apiClient } from '@/lib/api';
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
      const { data } = await apiClient.get('/usuarios/preferencias');
      const prefs = this.mergeWithDefaults(data);
      
      this.cache[userId] = prefs;
      return prefs;
    } catch (e) {
      console.error("Error fetching preferences:", e);
      return this.mergeWithDefaults({});
    }
  }

  async savePreferences(userId: string, data: Partial<UserPreferences>): Promise<void> {
    try {
      const current = await this.getPreferences(userId);
      const merged = this.mergeWithDefaults({ ...current, ...data });

      await apiClient.put('/usuarios/preferencias', merged);

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
