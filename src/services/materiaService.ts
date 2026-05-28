import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, writeBatch, doc, getDoc } from 'firebase/firestore';

export const materiaService = {
  checkDependencies: async (materiaId: string, userId: string) => {
    const collections = {
        topicos: 'topicos',
        sessoes: 'sessoes',
        revisoes: 'revisoes',
        eventos: 'eventos_academicos',
        aulas: 'aulas',
        ocorrencias: 'ocorrencias_grade',
        materiais: 'materiais',
        grade: 'grade_faculdade'
    };

    const deps: Record<string, any> = {};
    for (const [key, coll] of Object.entries(collections)) {
        deps[key] = await getDocs(query(collection(db, coll), where('user_id', '==', userId), where('materia_id', '==', materiaId)));
    }

    let totalCount = 0;
    const counts: Record<string, number> = {};
    Object.keys(deps).forEach(key => {
        const size = deps[key].size;
        counts[key] = size;
        totalCount += size;
    });

    return { totalCount, counts, deps };
  },

  deleteMateriaCascade: async (materiaId: string, userId: string) => {
    const matDoc = await getDoc(doc(db, 'materias', materiaId));
    const materiaName = matDoc.exists() ? matDoc.data().nome : 'Matéria Excluída';

    let operations: { type: 'delete' | 'update', ref: any, data?: any }[] = [];

    // 1. Sessoes: unlink and snapshot
    const sessoesSnap = await getDocs(query(collection(db, 'sessoes'), where('user_id', '==', userId), where('materia_id', '==', materiaId)));
    sessoesSnap.docs.forEach(d => {
      operations.push({
        type: 'update',
        ref: d.ref,
        data: {
          materia_id: null,
          topico_id: null,
          materia_nome_snapshot: materiaName,
          linked_material_ids: [],
          material_id: null,
          primary_material_id: null
        }
      });
    });

    // 2. Materials: delete doc
    const materiaisSnap = await getDocs(query(collection(db, 'materiais'), where('user_id', '==', userId), where('materia_id', '==', materiaId)));
    for (const d of materiaisSnap.docs) {
      operations.push({ type: 'delete', ref: d.ref });
    }

    // 3. Other collections tied to the subject
    const collectionsToDelete = [
      'topicos', 
      'revisoes', 
      'eventos_academicos', 
      'aulas', 
      'ocorrencias_grade', 
      'resumos', 
      'decks', 
      'flashcards', 
      'notas_materia',
      'grade_faculdade'
    ];

    for (const key of collectionsToDelete) {
        const q = query(collection(db, key), where('user_id', '==', userId), where('materia_id', '==', materiaId));
        const snap = await getDocs(q);
        snap.docs.forEach(d => operations.push({ type: 'delete', ref: d.ref }));
    }

    operations.push({ type: 'delete', ref: doc(db, 'materias', materiaId) });

    // 4. Commit in chunks of 400
    const chunkSize = 400;
    for (let i = 0; i < operations.length; i += chunkSize) {
      const chunk = operations.slice(i, i + chunkSize);
      const batch = writeBatch(db);
      chunk.forEach(op => {
        if (op.type === 'update') batch.update(op.ref, op.data);
        else if (op.type === 'delete') batch.delete(op.ref);
      });
      await batch.commit();
    }
  }
};
