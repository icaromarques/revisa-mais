import { apiClient } from '@/lib/api';
import { EventoAcademico } from '@/types/calendar';

export const calendarService = {
  // Fetches events via REST; real-time updates via WebSocket (calendar.updated).
  async fetchUserEvents(userId: string): Promise<EventoAcademico[]> {
    const { data } = await apiClient.get('/eventos');
    return data;
  },

  async createEvent(event: Omit<EventoAcademico, 'id' | 'created_at' | 'updated_at'>): Promise<string> {
    const { data } = await apiClient.post('/eventos', event);
    return data.id;
  },

  async updateEvent(id: string, event: Partial<EventoAcademico>) {
    await apiClient.patch(`/eventos/${id}`, event);
  },

  // Sincronização Google Calendar Server-Side (Webhooks cuidam do background)
  async syncLocalEventToGoogle(eventId: string, userId: string) {
    // O backend pode ter uma rota /api/eventos/:id/sync ou o webhook já resolveu
    await apiClient.post(`/eventos/${eventId}/sync-google`);
  },

  async deleteEvent(id: string, options?: { deleteGoogle?: boolean }) {
    await apiClient.delete(`/eventos/${id}`, { data: { deleteGoogle: options?.deleteGoogle } });
  },

  async retrySyncEvent(id: string) {
    await apiClient.post(`/eventos/${id}/sync-google`);
  },

  async syncGoogleRange(userId: string, timeMin: Date, timeMax: Date) {
    await apiClient.post('/eventos/sync-range', { timeMin, timeMax });
  }
};
