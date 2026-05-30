import { apiClient } from '@/lib/api';

export const historyService = {
  async registerStudySession(userId: string, data: {
    tipo: 'Flashcards' | 'Sessão de Estudo' | 'Questões' | 'Revisão' | 'Resumo' | 'Aula';
    titulo: string;
    detalhes?: string;
    minutos: number;
    materia_id?: string | null;
    topico_id?: string | null;
  }) {
    if (!userId) return;
    
    try {
      const tempo_estudado_segundos = Math.round(data.minutos * 60);

      // Usando a rota já criada no backend em sessao.routes.ts -> /sessoes/registrar
      await apiClient.post('/sessoes/registrar', {
        tipo: data.tipo,
        materia_id: data.materia_id || null,
        topico_id: data.topico_id || null,
        tempo_estudado_segundos,
        total_questoes: 0,
        acertos: 0,
        notas: data.detalhes || ''
      });
    } catch (e) {
      console.error("Erro ao salvar histórico:", e);
    }
  }
};
