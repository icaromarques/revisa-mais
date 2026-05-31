// TODO: Backend api endpoints need to be implemented for this to work.
import { apiClient } from '@/lib/api';
import { toast } from '@/lib/toast';

export type GoalCategory = 'horas_estudo' | 'revisoes' | 'questoes' | 'constancia' | 'materia' | 'personalizada';
export type TrackingMode = 'automatic' | 'manual';
export type PeriodType = 'semanal' | 'quinzenal' | 'mensal' | 'personalizado';

export interface StudyGoal {
  id: string;
  title: string;
  category: GoalCategory;
  tracking_mode: TrackingMode;
  target_value?: number;
  target_unit?: string;
  current_value?: number;
  period_type: PeriodType;
  start_date?: string;
  due_date?: string;
  status: 'active' | 'completed' | 'abandoned';
  notes?: string;
  materia_id?: string;
}

export interface UserProfileSchema {
  nome: string;
  bio?: string;
  instituicao?: string;
  curso?: string;
  semestre?: string;
  turno?: string;
  foto_url?: string;
  rotina?: string;
  goals?: StudyGoal[];
  created_at?: string;
  updated_at?: string;
  plano?: string;
}

export const userProfileService = {
  subscribe(userId: string, callback: (data: UserProfileSchema | null) => void) {
    let currentData: UserProfileSchema | null = null;
    
    // Polling simulation since we don't have websocket/sse yet
    const intervalId = setInterval(async () => {
      try {
        const { data } = await apiClient.get('/usuarios/perfil');
        if (JSON.stringify(data) !== JSON.stringify(currentData)) {
          currentData = data;
          callback(data);
        }
      } catch (e) {
        console.error("Erro ao buscar perfil do usuário:", e);
        // Do nothing, just try again next interval
      }
    }, 60000);
    
    // Initial fetch
    apiClient.get('/usuarios/perfil')
      .then(({ data }) => {
        currentData = data;
        callback(data);
      })
      .catch((e) => {
        console.error("Erro no fetch inicial do perfil:", e);
      });

    return () => clearInterval(intervalId);
  },

  async updateProfile(userId: string, data: Partial<UserProfileSchema>) {
    try {
      await apiClient.patch('/usuarios/perfil', data);
    } catch (e) {
      console.error(e);
      throw e;
    }
  },

  async addGoal(userId: string, goal: Omit<StudyGoal, 'id' | 'status'>) {
     try {
       await apiClient.post('/usuarios/perfil/goals', goal);
     } catch(e) {
       console.error("Failed to add goal", e);
       throw e;
     }
  },

  async updateGoal(userId: string, goalId: string, updates: Partial<StudyGoal>) {
    try {
      await apiClient.patch(`/usuarios/perfil/goals/${goalId}`, updates);
    } catch(e) {
      console.error("Failed to update goal", e);
      throw e;
    }
  },

  async deleteGoal(userId: string, goalId: string) {
     try {
       await apiClient.delete(`/usuarios/perfil/goals/${goalId}`);
     } catch(e) {
       console.error("Failed to delete goal", e);
       throw e;
     }
  }
};
