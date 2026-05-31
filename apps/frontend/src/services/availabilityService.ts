import { GradeFaculdade, BloqueioAgenda } from '@/types/availability';
import { apiClient } from '@/lib/api';

export const availabilityService = {
  // Sync helper (now handled partly by backend or not strictly necessary if handled properly)
  async syncMateriaGradePeriodo(materiaId: string, userId: string, data: any) {
    try {
      const updateData: any = {};
      if (data.periodo_inicio !== undefined) {
         updateData.periodo_inicio = data.periodo_inicio;
         updateData.data_inicio_vigencia = data.periodo_inicio;
      }
      if (data.periodo_fim !== undefined) {
         updateData.periodo_fim = data.periodo_fim;
         updateData.data_fim_vigencia = data.periodo_fim;
      }
      if (data.tipo_periodo !== undefined) updateData.tipo_periodo = data.tipo_periodo;
      if (data.numero_periodo !== undefined) updateData.numero_periodo = data.numero_periodo;
      if (data.limite_faltas_percentual !== undefined) updateData.limite_faltas_percentual = data.limite_faltas_percentual;
      
      if (Object.keys(updateData).length > 0) {
        const { data: grades } = await apiClient.get(`/disponibilidade/grade_faculdade?materia_id=${materiaId}`);
        if (grades && grades.length > 0) {
           await Promise.all(grades.map((g: any) => apiClient.put(`/disponibilidade/grade_faculdade/${g.id}`, updateData)));
        }
      }
    } catch (e) {
      console.error("Failed to sync grade", e);
    }
  },

  // ================= Grade Faculdade =================
  async getGradeFaculdade(userId: string): Promise<GradeFaculdade[]> {
    try {
      const { data } = await apiClient.get('/disponibilidade/grade_faculdade');
      return data || [];
    } catch (err) {
      console.error("Failed to get grade faculdade", err);
      return [];
    }
  },

  async getGradeFaculdadePorMateria(userId: string, materiaId: string): Promise<GradeFaculdade[]> {
    try {
       const { data } = await apiClient.get(`/disponibilidade/grade_faculdade?materia_id=${materiaId}`);
       return data || [];
    } catch (err) {
       console.error("Failed to get grade faculdade by materia", err);
       return [];
    }
  },

  async createGradeFaculdade(data: Omit<GradeFaculdade, 'id' | 'created_at' | 'updated_at'>): Promise<string> {
    try {
       const res = await apiClient.post('/disponibilidade/grade_faculdade', data);
       return res.data.id;
    } catch (err) {
       console.error("Failed to create grade", err);
       throw err;
    }
  },

  async updateGradeFaculdade(id: string, data: Partial<GradeFaculdade>): Promise<void> {
    try {
      await apiClient.put(`/disponibilidade/grade_faculdade/${id}`, data);
    } catch (err) {
      console.error("Failed to update grade", err);
      throw err;
    }
  },

  async deleteGradeFaculdade(id: string, userId: string): Promise<void> {
    try {
      await apiClient.delete(`/disponibilidade/grade_faculdade/${id}`);
    } catch (err) {
      console.error('[Service] Erro em deleteGradeFaculdade:', err);
      throw err;
    }
  },

  // ================= Bloqueio Agenda =================
  async getBloqueios(userId: string): Promise<BloqueioAgenda[]> {
    try {
      const { data } = await apiClient.get('/disponibilidade/bloqueios');
      return data || [];
    } catch (err) {
      console.error("Failed to get bloqueios", err);
      return [];
    }
  },

  async createBloqueio(data: Omit<BloqueioAgenda, 'id' | 'created_at' | 'updated_at'>): Promise<string> {
    try {
       const res = await apiClient.post('/disponibilidade/bloqueios', data);
       return res.data.id;
    } catch (err) {
       console.error("Failed to create bloqueio", err);
       throw err;
    }
  },

  async updateBloqueio(id: string, data: Partial<BloqueioAgenda>): Promise<void> {
    try {
      await apiClient.put(`/disponibilidade/bloqueios/${id}`, data);
    } catch (err) {
      console.error("Failed to update bloqueio", err);
      throw err;
    }
  },

  async deleteBloqueio(id: string): Promise<void> {
    try {
      await apiClient.delete(`/disponibilidade/bloqueios/${id}`);
    } catch (err) {
      console.error("Failed to delete bloqueio", err);
      throw err;
    }
  }
};
