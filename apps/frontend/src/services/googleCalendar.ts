import { apiClient } from '@/lib/api';

const GOOGLE_CALENDAR_API = 'https://www.googleapis.com/calendar/v3';

// Dummy methods to avoid compilation errors until fully removed from components
export const googleCalendarService = {
  checkGoogleIntegration: async (userId: string) => {
     try {
       const { data } = await apiClient.get('/integrations/google/status');
       return data.hasIntegration;
     } catch(e) {
       return false;
     }
  },
  
  createEvent: async (userId: string, eventData: any) => {
      // should now be done via backend post to events
      return null;
  },

  updateEvent: async (userId: string, eventId: string, eventData: any) => {
      return null;
  },

  deleteEvent: async (userId: string, eventId: string) => {
      return null;
  },
  
  getConnectionStatus: async (userId?: string) => {
      return {
          status: 'disconnected',
          canSync: false,
          canReconnect: false,
          message: 'Migrado para o backend.'
      }
  },

  disconnect: async (userId: string) => {
      await apiClient.delete('/integrations/google/disconnect');
  }
};
