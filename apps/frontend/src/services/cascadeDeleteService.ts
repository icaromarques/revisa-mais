// TODO: Backend api endpoints need to be implemented for this to work.
import { apiClient } from '@/lib/api';
import { revisaoService } from './revisaoService';

export const cascadeDeleteService = {
  async deleteRevisoesByOrigin(originType: 'aula_id' | 'session_id' | 'deck_id' | 'caderno_id' | 'materia_id', originId: string, userId: string) {
    try {
      await apiClient.delete(`/revisoes/origin/${originType}/${originId}`);
    } catch (err) {
       console.error(`Erro ao deletar revisões em cascata (${originType})`, err);
    }
  },

  async deleteMateriaAndDerivates(materiaId: string, userId: string) {
    try {
      await apiClient.delete(`/materias/${materiaId}?cascade=true`);
    } catch (err) {
      console.error(`Erro ao deletar materia em cascata (${materiaId})`, err);
    }
  },

  async deleteAulaAndDerivates(aulaId: string, userId: string) {
    try {
      await apiClient.delete(`/aulas/${aulaId}?cascade=true`);
    } catch (err) {
      console.error('Error deleting aula in cascade', err);
    }
  },

  async wipeUserData(userId: string, modules: string[] = ['all']) {
    try {
       await apiClient.post('/admin/reset', { module: modules.includes('all') ? 'total' : modules[0] });
    } catch (err) {
       console.error("Failed to wipe user data", err);
    }
  },

  async deleteSessaoAndDerivates(sessaoId: string, userId: string) {
    await this.deleteRevisoesByOrigin('session_id', sessaoId, userId);
  },
  
  async deleteDeckAndDerivates(deckId: string, userId: string) {
    await this.deleteRevisoesByOrigin('deck_id', deckId, userId);
  },

  async deleteCadernoAndDerivates(cadernoId: string, userId: string) {
    await this.deleteRevisoesByOrigin('caderno_id', cadernoId, userId);
  }
};
