import { apiClient } from '@/lib/api';

// Como o backend relacional tem restrições `ON DELETE CASCADE` ou `ON DELETE SET NULL`,
// o front-end não precisa mais calcular quais coleções excluir (flashcards, resumos, etc).
// Deixamos a exclusão total sob a responsabilidade do Express (Backend) 

export const aulaService = {
  // Retorna um placeholder pro frontend não quebrar
  async getAulaDependencies(aulaId: string, userId: string) {
    try {
      const { data } = await apiClient.get(`/aulas/${aulaId}/dependencies`);
      return data;
    } catch (error) {
      console.warn("Rota de dependências em construção. Retornando objeto zerado.");
      return {
        materiais: [], revisoes: [], resumos: [], decks: [], questoes: [],
        cadernos: [], eventos: [], ocorrenciasRepo: [], flashcardsRefs: [],
        alternativasRefs: [], tentativasRefs: []
      };
    }
  },

  async desvincularAula(aulaId: string, userId: string) {
    try {
      await apiClient.post(`/aulas/${aulaId}/desvincular`);
    } catch (error) {
      console.error('[AULA_DELETE] Erro ao desvincular', { aulaId, error });
      throw error;
    }
  },

  async deleteAulaCascade(aulaId: string, userId: string) {
    try {
      await apiClient.delete(`/aulas/${aulaId}`);
    } catch (error) {
      console.error('[AULA_DELETE] Erro ao excluir em cascata', { aulaId, error });
      throw error;
    }
  }
};
