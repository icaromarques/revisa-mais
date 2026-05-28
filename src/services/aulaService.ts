import { db } from '@/lib/firebase';
import { collection, doc, query, where, getDocs, writeBatch, DocumentReference } from 'firebase/firestore';

export const aulaService = {
  chunkArray: <T>(arr: T[], size: number): T[][] => {
    return Array.from({ length: Math.ceil(arr.length / size) }, (v, i) =>
      arr.slice(i * size, i * size + size)
    );
  },

  async getAulaDependencies(aulaId: string, userId: string) {
    const baseQuery = (collName: string) => 
      query(collection(db, collName), where('user_id', '==', userId), where('aula_id', '==', aulaId));

    const reposicaoQuery = query(collection(db, 'ocorrencias_grade'), where('user_id', '==', userId), where('reposicao_aula_id', '==', aulaId));

    try {
      const [
        materiaisSnap,
        revisoesSnap,
        resumosSnap,
        decksSnap,
        questoesSnap,
        cadernosSnap,
        eventosSnap,
        ocorrenciasSnap
      ] = await Promise.all([
        getDocs(baseQuery('materiais')),
        getDocs(baseQuery('revisoes')),
        getDocs(baseQuery('resumos')),
        getDocs(baseQuery('decks')),
        getDocs(baseQuery('questoes')),
        getDocs(baseQuery('cadernos')),
        getDocs(baseQuery('eventos_academicos')),
        getDocs(reposicaoQuery)
      ]);

      const decks = decksSnap.docs;
      const questoes = questoesSnap.docs;

      const flashcardsRefs: DocumentReference[] = [];
      if (decks.length > 0) {
        const deckIds = decks.map(d => d.id);
        const chunks = this.chunkArray(deckIds, 10);
        for (const chunk of chunks) {
          const q = query(collection(db, 'flashcards'), where('user_id', '==', userId), where('deck_id', 'in', chunk));
          const snap = await getDocs(q);
          snap.docs.forEach(d => flashcardsRefs.push(d.ref));
        }
      }

      const alternativasRefs: DocumentReference[] = [];
      const tentativasRefs: DocumentReference[] = [];
      if (questoes.length > 0) {
        const questaoIds = questoes.map(q => q.id);
        const chunks = this.chunkArray(questaoIds, 10);
        for (const chunk of chunks) {
          const qAlt = query(collection(db, 'alternativas'), where('user_id', '==', userId), where('questao_id', 'in', chunk));
          const snapAlt = await getDocs(qAlt);
          snapAlt.docs.forEach(d => alternativasRefs.push(d.ref));

          const qTent = query(collection(db, 'tentativas'), where('user_id', '==', userId), where('questao_id', 'in', chunk));
          const snapTent = await getDocs(qTent);
          snapTent.docs.forEach(d => tentativasRefs.push(d.ref));
        }
      }

      return {
        materiais: materiaisSnap.docs,
        revisoes: revisoesSnap.docs,
        resumos: resumosSnap.docs,
        decks: decksSnap.docs,
        questoes: questoesSnap.docs,
        cadernos: cadernosSnap.docs,
        eventos: eventosSnap.docs,
        ocorrenciasRepo: ocorrenciasSnap.docs,
        flashcardsRefs,
        alternativasRefs,
        tentativasRefs
      };
    } catch (error) {
      console.error('[AULA_DELETE] Erro ao buscar dependencias da aula', { aulaId, error });
      throw error;
    }
  },

  async desvincularAula(aulaId: string, userId: string) {
    try {
      console.log('[AULA_DELETE] Iniciando desvinculação da aula', aulaId);
      const depends = await this.getAulaDependencies(aulaId, userId);
      
      const collectionsToUnlink = [
        ...depends.materiais,
        ...depends.revisoes,
        ...depends.resumos,
        ...depends.decks,
        ...depends.questoes,
        ...depends.cadernos,
        ...depends.eventos
      ];

      const batchOptions = { max: 400 };
      let batch = writeBatch(db);
      let count = 0;

      for (const docSnap of collectionsToUnlink) {
        batch.update(docSnap.ref, { aula_id: null });
        count++;
        if (count >= batchOptions.max) {
          await batch.commit();
          batch = writeBatch(db);
          count = 0;
        }
      }

      for (const ocorrenciaSnap of depends.ocorrenciasRepo) {
        batch.update(ocorrenciaSnap.ref, {
          status_reposicao: 'pendente',
          reposicao_aula_id: null,
          reposicao_observacao: null,
          updated_at: new Date().toISOString()
        });
        count++;
        if (count >= batchOptions.max) {
          await batch.commit();
          batch = writeBatch(db);
          count = 0;
        }
      }

      batch.delete(doc(db, 'aulas', aulaId));
      await batch.commit();
      console.log('[AULA_DELETE] Desvinculação concluída com sucesso');
    } catch (error) {
      console.error('[AULA_DELETE] Erro ao desvincular', { aulaId, error });
      throw error;
    }
  },

  async deleteAulaCascade(aulaId: string, userId: string) {
    try {
      console.log('[AULA_DELETE] Iniciando exclusão em cascata da aula', aulaId);
      const depends = await this.getAulaDependencies(aulaId, userId);

      // Usando calendarService para garantir que os eventos também saiam do GCal
      for (const evtSnap of depends.eventos) {
         try {
            const { calendarService } = await import('@/services/calendarService');
            await calendarService.deleteEvent(evtSnap.id);
            console.log(`[AULA_DELETE] Evento academico ${evtSnap.id} excluído com sucesso (incluindo do GCal, se vinculado).`);
         } catch(e) {
            console.error('[AULA_DELETE] Erro ao excluir evento academico via calendarService', { event_id: evtSnap.id, error: e });
         }
      }

      const collectionsToDelete = [
        ...depends.flashcardsRefs,
        ...depends.alternativasRefs,
        ...depends.tentativasRefs,
        ...depends.materiais.map(d => d.ref),
        ...depends.revisoes.map(d => d.ref),
        ...depends.resumos.map(d => d.ref),
        ...depends.decks.map(d => d.ref),
        ...depends.questoes.map(d => d.ref),
        ...depends.cadernos.map(d => d.ref),
      ];

      let batch = writeBatch(db);
      let count = 0;

      for (const ocorrenciaSnap of depends.ocorrenciasRepo) {
        batch.update(ocorrenciaSnap.ref, {
          status_reposicao: 'pendente',
          reposicao_aula_id: null,
          reposicao_observacao: null,
          updated_at: new Date().toISOString()
        });
        count++;
        if (count >= 400) {
          await batch.commit();
          batch = writeBatch(db);
          count = 0;
        }
      }

      for (const ref of collectionsToDelete) {
        batch.delete(ref);
        count++;
        if (count >= 400) {
          await batch.commit();
          batch = writeBatch(db);
          count = 0;
        }
      }

      batch.delete(doc(db, 'aulas', aulaId));
      await batch.commit();

      console.log('[AULA_DELETE] Exclusão em cascata concluída com sucesso');
    } catch (error) {
      console.error('[AULA_DELETE] Erro ao excluir em cascata', { aulaId, error });
      throw error;
    }
  }
};
