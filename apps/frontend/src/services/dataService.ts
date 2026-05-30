// TODO: A refatoração completa deste serviço para usar apiClient foi adiada. 
// Atualmente ele ainda usa firebase/firestore diretamente.
import { db } from '@/lib/firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  writeBatch, 
  doc, 
  serverTimestamp,
  deleteDoc,
  getDoc
} from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '@/lib/firestoreErrorHandler';

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
    const counts: Record<string, number> = {};
    let totalCount = 0;

    const collectionsToCheck = this.getCollectionsForModule(module);

    for (const coll of collectionsToCheck) {
      try {
        const q = query(collection(db, coll), where('user_id', '==', userId));
        const snap = await getDocs(q);
        counts[coll] = snap.size;
        totalCount += snap.size;
      } catch (e) {
        console.error(`Error counting ${coll}:`, e);
        counts[coll] = 0;
      }
    }

    return { counts, totalCount };
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
    const collectionsToReset = this.getCollectionsForModule(module);
    
    for (const collName of collectionsToReset) {
      try {
        const q = query(collection(db, collName), where('user_id', '==', userId));
        const snap = await getDocs(q);
        
        if (snap.empty) continue;

        // Firestore batch limit is 500
        const docs = snap.docs;
        for (let i = 0; i < docs.length; i += 500) {
          const batch = writeBatch(db);
          const chunk = docs.slice(i, i + 500);
          chunk.forEach(d => batch.delete(d.ref));
          await batch.commit();
        }

        // Relational cleanups if needed
        if (module === 'sessoes' && collName === 'sessoes') {
            // Clear session links in materials
            const materialsQ = query(collection(db, 'materiais'), where('user_id', '==', userId));
            const materialsSnap = await getDocs(materialsQ);
            const batchMat = writeBatch(db);
            let countMat = 0;
            materialsSnap.forEach(m => {
                const data = m.data();
                if (data.linked_session_ids?.length > 0 || data.origin_session_id) {
                    batchMat.update(m.ref, {
                        linked_session_ids: [],
                        origin_session_id: null,
                        updated_at: serverTimestamp()
                    });
                    countMat++;
                }
            });
            if (countMat > 0) await batchMat.commit();

            // Reset subject progress as sessions are gone
            const materiasQ = query(collection(db, 'materias'), where('user_id', '==', userId));
            const materiasSnap = await getDocs(materiasQ);
            const batchMat2 = writeBatch(db);
            let countMat2 = 0;
            materiasSnap.forEach(m => {
                batchMat2.update(m.ref, {
                    progresso: 0,
                    updated_at: serverTimestamp()
                });
                countMat2++;
            });
            if (countMat2 > 0) await batchMat2.commit();
        }

        if (module === 'materiais' && collName === 'materiais') {
            // Clear material links in sessions
            const sessoesQ = query(collection(db, 'sessoes'), where('user_id', '==', userId));
            const sessoesSnap = await getDocs(sessoesQ);
            const batchSess = writeBatch(db);
            let countSess = 0;
            sessoesSnap.forEach(s => {
                const data = s.data();
                if (data.linked_material_ids?.length > 0 || data.primary_material_id || data.material_id) {
                    batchSess.update(s.ref, {
                        linked_material_ids: [],
                        primary_material_id: null,
                        material_id: null,
                        updated_at: serverTimestamp()
                    });
                    countSess++;
                }
            });
            if (countSess > 0) await batchSess.commit();
        }

        if (module === 'faltas' && collName === 'ocorrencias_grade') {
            // Reset subject absence counts
            const materiasQ = query(collection(db, 'materias'), where('user_id', '==', userId));
            const materiasSnap = await getDocs(materiasQ);
            const batchMat = writeBatch(db);
            let countMat = 0;
            materiasSnap.forEach(m => {
                batchMat.update(m.ref, {
                    faltas: 0,
                    updated_at: serverTimestamp()
                });
                countMat++;
            });
            if (countMat > 0) await batchMat.commit();
        }

      } catch (err) {
        console.error(`Error resetting ${collName}:`, err);
        handleFirestoreError(err, OperationType.DELETE, collName);
      }
    }

    // Special case: Total reset also resets user settings?
    if (module === 'total') {
        try {
            // We don't delete the user document, but we might want to reset the settings within it
            const userRef = doc(db, 'users', userId);
            await updateDoc(userRef, {
                settings: {},
                updated_at: serverTimestamp()
            });
        } catch (e) {
            console.error("Error resetting user settings:", e);
        }
    }
  },

  async exportUserData(userId: string): Promise<string> {
    const data: Record<string, any[]> = {};
    const collections = Object.values(COLLECTION_MAP);

    for (const coll of collections) {
      const q = query(collection(db, coll), where('user_id', '==', userId));
      const snap = await getDocs(q);
      data[coll] = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    }

    return JSON.stringify(data, null, 2);
  }
};

// Helper for resetting user settings if import from firestore fails in updateDoc above
async function updateDoc(ref: any, data: any) {
    const { updateDoc: fbUpdateDoc } = await import('firebase/firestore');
    return fbUpdateDoc(ref, data);
}
