import { apiClient } from '@/lib/api';

const GOOGLE_CALENDAR_API = 'https://www.googleapis.com/calendar/v3';

export type GCalDiagnosticResult = {
  ok: boolean;
  message?: string;
};

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

  isConnected: async (userId: string) => {
    return googleCalendarService.checkGoogleIntegration(userId);
  },
  
  createEvent: async (userId: string, eventData: any) => {
      return null;
  },

  updateEvent: async (userId: string, eventId: string, eventData: any) => {
      return null;
  },

  deleteEvent: async (userId: string, eventId: string) => {
      return null;
  },
  
  getConnectionStatus: async (userId?: string) => {
      if (!userId) {
        return {
            status: 'disconnected',
            canSync: false,
            canReconnect: false,
            message: 'Migrado para o backend.'
        };
      }
      const connected = await googleCalendarService.checkGoogleIntegration(userId);
      return {
          status: connected ? 'connected' : 'disconnected',
          canSync: connected,
          canReconnect: !connected,
          message: connected ? 'Google Calendar conectado.' : 'Google Calendar desconectado.'
      };
  },

  diagnosticConnect: async (_userId: string): Promise<GCalDiagnosticResult> => {
    return { ok: false, message: 'Conecte via OAuth no backend.' };
  },

  disconnect: async (userId: string) => {
      await apiClient.delete('/integrations/google/disconnect');
  }
};
