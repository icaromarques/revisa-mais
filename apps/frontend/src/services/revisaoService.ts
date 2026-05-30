import { apiClient } from '@/lib/api';

export const revisaoService = {
  async createRevisao(data: any) {
    const response = await apiClient.post('/revisoes', data);
    return response.data.id;
  },

  async updateRevisao(id: string, data: any) {
    // Backend se responsabilizará por atualizar evento se houver alteração de data (trigger)
    await apiClient.patch(`/revisoes/${id}/status`, { status: data.status });
  },

  async deleteRevisao(id: string, userId: string) {
    await apiClient.delete(`/revisoes/${id}`);
  }
};
