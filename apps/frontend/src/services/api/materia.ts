import { apiClient } from '../lib/api';

export const materiaApiService = {
  async getMaterias() {
    const response = await apiClient.get('/materias');
    return response.data;
  },

  async createMateria(data: { nome: string; cor: string }) {
    const response = await apiClient.post('/materias', data);
    return response.data;
  },

  async deleteMateria(id: string) {
    const response = await apiClient.delete(`/materias/${id}`);
    return response.data;
  }
};