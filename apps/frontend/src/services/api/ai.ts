import { apiClient } from '@/lib/api';

export const aiApiService = {
  async generateSummary(text: string, context?: string) {
    const response = await apiClient.post('/ai/summary', { text, context });
    return response.data;
  }
};