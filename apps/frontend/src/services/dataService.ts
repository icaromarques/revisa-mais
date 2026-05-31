// TODO: Backend api endpoints need to be implemented for this to work.
import { apiClient } from '@/lib/api';

export type ResetModule = 
  | 'materias' 
  | 'sessoes' 
  | 'revisoes' 
  | 'faltas' 
  | 'planner' 
  | 'materiais' 
  | 'flashcards' 
  | 'questoes' 
  | 'resumos' 
  | 'agenda' 
  | 'total';

export interface ResetImpact {
  counts: Record<string, number>;
  totalCount: number;
}

const COLLECTION_MAP: Record<string, string> = {
  materias: 'materias',
  topicos: 'topicos',
  aulas: 'aulas',
  sessoes: 'sessoes',
  revisoes: 'revisoes',
  ocorrencias_grade: 'ocorrencias_grade',
  eventos_academicos: 'eventos_academicos',
  materiais: 'materiais',
  resumos: 'resumos',
  decks: 'decks',
  flashcards: 'flashcards',
  questoes: 'questoes',
  alternativas: 'alternativas',
  tentativas: 'tentativas',
  grade_faculdade: 'grade_faculdade',
  bloqueios_agenda: 'bloqueios_agenda',
  notificacoes: 'notificacoes',
  faltas_materias: 'faltas_materias' // Legacy
};

export const dataService = {
  async getResetImpact(userId: string, module: ResetModule): Promise<ResetImpact> {
    try {
        const { data } = await apiClient.get(`/admin/reset-impact?module=${module}`);
        return data;
    } catch(e) {
        console.error("Erro ao computar impacto de reset", e);
        return { counts: {}, totalCount: 0 };
    }
  },

  getCollectionsForModule(module: ResetModule): string[] {
    switch (module) {
      case 'materias':
        return ['materias', 'topicos', 'aulas', 'materiais', 'revisoes', 'ocorrencias_grade', 'eventos_academicos'];
      case 'sessoes':
        return ['sessoes'];
      case 'revisoes':
        return ['revisoes'];
      case 'faltas':
        return ['ocorrencias_grade'];
      case 'planner':
        return ['eventos_academicos']; // Filtered by origem='planner_ai' usually, but here we might want all planner events
      case 'materiais':
        return ['materiais'];
      case 'flashcards':
        return ['decks', 'flashcards'];
      case 'questoes':
        return ['questoes', 'alternativas', 'tentativas'];
      case 'resumos':
        return ['resumos'];
      case 'agenda':
        return ['grade_faculdade', 'bloqueios_agenda'];
      case 'total':
        return Object.values(COLLECTION_MAP);
      default:
        return [];
    }
  },

  async resetData(userId: string, module: ResetModule) {
      try {
          await apiClient.post(`/admin/reset`, { module });
      } catch(e) {
          console.error("Failed to reset data", e);
          throw e;
      }
  },
  async exportUserData(userId: string): Promise<string> {
    try {
        const { data } = await apiClient.get(`/admin/export`);
        return JSON.stringify(data, null, 2);
    } catch(e) {
        console.error("Erro ao exportar dados", e);
        return JSON.stringify({ error: "Export failed" }, null, 2);
    }
  }
};
