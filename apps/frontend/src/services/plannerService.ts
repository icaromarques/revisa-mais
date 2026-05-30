import { apiClient } from '@/lib/api';

export const plannerService = {
  // O backend deve expor uma rota para forçar ou rodar a geração do planner (heurística ou via IA)
  async generateHeuristicSchedule(userId: string) {
    const response = await apiClient.post('/schedule/generate-planner');
    return response.data.eventsCreated || 0;
  }
};
