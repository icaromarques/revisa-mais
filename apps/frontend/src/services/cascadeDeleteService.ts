// TODO: A refatoração completa deste serviço para usar apiClient foi adiada. 
// Atualmente ele ainda usa firebase/firestore diretamente.
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, deleteDoc, doc, writeBatch } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '@/lib/firestoreErrorHandler';
import { revisaoService } from './revisaoService';

export const cascadeDeleteService = {
  async deleteRevisoesByOrigin(originType: 'aula_id' | 'session_id' | 'deck_id' | 'caderno_id' | 'materia_id', originId: string, userId: string) {
    try {
      const q = query(collection(db, 'revisoes'), where('user_id', '==', userId), where(originType, '==', originId));
      const snapshot = await getDocs(q);
      
      for (const docSnap of snapshot.docs) {
        await revisaoService.deleteRevisao(docSnap.id, userId);
      }
    } catch (err) {
       console.error(`Erro ao deletar revisões em cascata (${originType})`, err);
    }
  },

  async deleteMateriaAndDerivates(materiaId: string, userId: string) {
    try {
      // 1. Delete all reviews for this subject
      await this.deleteRevisoesByOrigin('materia_id', materiaId, userId);

      // 2. Collections to wipe entirely for this subject
      const collectionsToWipe = ['topicos', 'sessoes', 'faltas', 'materiais', 'avaliacoes', 'ocorrencias'];
      
      for (const collectionName of collectionsToWipe) {
        const q = query(collection(db, collectionName), where('user_id', '==', userId), where('materia_id', '==', materiaId));
        const snapshot = await getDocs(q);
        
        const batch = writeBatch(db);
        snapshot.docs.forEach(docSnap => {
          batch.delete(docSnap.ref);
        });
        await batch.commit();
      }

      // 3. Delete the subject itself
      await deleteDoc(doc(db, 'materias', materiaId));
      
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `materias/${materiaId}`);
    }
  },

  async deleteAulaAndDerivates(aulaId: string, userId: string) {
    // 1. Delete associated reviews
    await this.deleteRevisoesByOrigin('aula_id', aulaId, userId);
    
    // 2. Unlink materials and events
    const batch = writeBatch(db);
    
    try {
      const materialsToUnlink = await getDocs(query(collection(db, 'materiais'), where('user_id', '==', userId), where('aula_id', '==', aulaId)));
      materialsToUnlink.forEach(d => batch.update(d.ref, { aula_id: null }));

      const eventsToUnlink = await getDocs(query(collection(db, 'eventos_academicos'), where('user_id', '==', userId), where('aula_id', '==', aulaId)));
      eventsToUnlink.forEach(d => batch.update(d.ref, { aula_id: null }));
    } catch (err) {
      console.error('Error unlinking materials/events from aula', err);
    }
    
    // 3. Delete the aula itself
    batch.delete(doc(db, 'aulas', aulaId));
    
    await batch.commit();
  },

  async wipeUserData(userId: string, modules: string[] = ['all']) {
    const isAll = modules.includes('all');
    const targetCollections = isAll 
      ? ['materias', 'topicos', 'sessoes', 'faltas', 'materiais', 'avaliacoes', 'ocorrencias', 'revisoes', 'decks', 'cards', 'cadernos', 'flashcards']
      : modules;

    try {
      for (const collectionName of targetCollections) {
        const q = query(collection(db, collectionName), where('user_id', '==', userId));
        const snapshot = await getDocs(q);
        
        // Batch limit is 500
        let batch = writeBatch(db);
        let count = 0;
        
        for (const docSnap of snapshot.docs) {
          batch.delete(docSnap.ref);
          count++;
          if (count >= 400) {
            await batch.commit();
            batch = writeBatch(db);
            count = 0;
          }
        }
        if (count > 0) await batch.commit();
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `wipeUserData/${userId}`);
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
