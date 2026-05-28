import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

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
      const now = new Date();
      const hhmmss = `${Math.floor(data.minutos / 60).toString().padStart(2, '0')}:${(Math.floor(data.minutos) % 60).toString().padStart(2, '0')}:${Math.round((data.minutos * 60) % 60).toString().padStart(2, '0')}`;
      
      await addDoc(collection(db, 'sessoes'), {
        user_id: userId,
        tipo: data.tipo,
        materia_id: data.materia_id || null,
        topico_id: data.topico_id || null,
        tempo_estudado_hhmmss: hhmmss,
        tempo_estudado_segundos: Math.round(data.minutos * 60),
        tempo_estudado_minutos: data.minutos,
        data_registro: now.toISOString().split('T')[0],
        total_questoes: 0,
        acertos: 0,
        notas: data.detalhes || '',
        created_at: serverTimestamp(),
        updated_at: serverTimestamp()
      });
    } catch (e) {
      console.error("Erro ao salvar histórico:", e);
    }
  }
};
