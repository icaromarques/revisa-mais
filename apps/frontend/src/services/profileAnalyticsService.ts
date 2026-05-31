// TODO: Backend api endpoints need to be implemented for this to work.
import { apiClient } from '@/lib/api';
import { parseValidDate } from '@/lib/utils';
import { endOfDay, startOfDay, getDay, isSameDay } from 'date-fns';

export interface ProfileAnalytics {
  totalSessoes: number;
  totalMinutos: number;
  revisoesConcluidas: number;
  questoesResolvidas: number;
  streakDias: number;
  mediaPorSessao: number;
  materiaMaisEstudada: string | null;
  melhorHorario: string | null;
  taxaRevisao: number | null;
  rotinaInsight: string | null;
}

export const profileAnalyticsService = {
  async compute(userId: string): Promise<ProfileAnalytics> {
    try {
      const { data } = await apiClient.get('/usuarios/perfil/analytics');
      return data;
    } catch(e) {
      console.error("Erro ao computar analytics do perfil", e);
      return {
          totalSessoes: 0,
          totalMinutos: 0,
          revisoesConcluidas: 0,
          questoesResolvidas: 0,
          streakDias: 0,
          mediaPorSessao: 0,
          materiaMaisEstudada: null,
          melhorHorario: null,
          taxaRevisao: null,
          rotinaInsight: null
      }
    }
  }
};
