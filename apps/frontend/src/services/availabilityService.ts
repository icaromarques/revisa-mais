import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { GradeFaculdade, BloqueioAgenda } from '@/types/availability';
import { handleFirestoreError, OperationType } from '@/lib/firestoreErrorHandler';

export const availabilityService = {
  // Sync helper
  async syncMateriaGradePeriodo(materiaId: string, userId: string, data: any) {
    try {
      const q = query(collection(db, 'grade_faculdade'), where('user_id', '==', userId), where('materia_id', '==', materiaId));
      const snap = await getDocs(q);
      const updateData: any = {};
      if (data.periodo_inicio !== undefined) {
         updateData.periodo_inicio = data.periodo_inicio;
         updateData.data_inicio_vigencia = data.periodo_inicio;
      }
      if (data.periodo_fim !== undefined) {
         updateData.periodo_fim = data.periodo_fim;
         updateData.data_fim_vigencia = data.periodo_fim;
      }
      if (data.tipo_periodo !== undefined) updateData.tipo_periodo = data.tipo_periodo;
      if (data.numero_periodo !== undefined) updateData.numero_periodo = data.numero_periodo;
      if (data.limite_faltas_percentual !== undefined) updateData.limite_faltas_percentual = data.limite_faltas_percentual;
      
      if (Object.keys(updateData).length > 0) {
        await Promise.all(snap.docs.map(d => updateDoc(doc(db, 'grade_faculdade', d.id), updateData)));
      }
    } catch (e) {
      console.error("Failed to sync grade", e);
    }
  },

  // ================= Grade Faculdade =================
  async getGradeFaculdade(userId: string): Promise<GradeFaculdade[]> {
    try {
      const q = query(collection(db, 'grade_faculdade'), where('user_id', '==', userId));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as GradeFaculdade));
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'grade_faculdade');
      return [];
    }
  },

  async getGradeFaculdadePorMateria(userId: string, materiaId: string): Promise<GradeFaculdade[]> {
    const q = query(collection(db, 'grade_faculdade'), where('user_id', '==', userId), where('materia_id', '==', materiaId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as GradeFaculdade));
  },

  async createGradeFaculdade(data: Omit<GradeFaculdade, 'id' | 'created_at' | 'updated_at'>): Promise<string> {
    const docRef = await addDoc(collection(db, 'grade_faculdade'), {
      ...data,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
    
    return docRef.id;
  },

  async updateGradeFaculdade(id: string, data: Partial<GradeFaculdade>): Promise<void> {
    try {
      const docRef = doc(db, 'grade_faculdade', id);
      await updateDoc(docRef, {
        ...data,
        updated_at: new Date().toISOString()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `grade_faculdade/${id}`);
    }
  },

  async deleteGradeFaculdade(id: string, userId: string): Promise<void> {
    try {
      console.log('[Service] deleteGradeFaculdade', { id, userId });
      // Find occurrences to delete as well - adding user_id filter for safety
      const qOcorrencias = query(
        collection(db, 'ocorrencias_grade'), 
        where('user_id', '==', userId),
        where('grade_id', '==', id), 
        where('status', '==', 'pendente_confirmacao')
      );
      const snap = await getDocs(qOcorrencias);
      console.log(`[Service] Encontradas ${snap.docs.length} ocorrências pendentes para deletar`);
      const promises = snap.docs.map(d => deleteDoc(doc(db, 'ocorrencias_grade', d.id)));
      
      await Promise.all([
        deleteDoc(doc(db, 'grade_faculdade', id)),
        ...promises
      ]);
    } catch (err) {
      console.error('[Service] Erro em deleteGradeFaculdade:', err);
      handleFirestoreError(err, OperationType.DELETE, `grade_faculdade/${id}`);
    }
  },

  // ================= Bloqueio Agenda =================
  async getBloqueios(userId: string): Promise<BloqueioAgenda[]> {
    try {
      const q = query(collection(db, 'bloqueios_agenda'), where('user_id', '==', userId));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BloqueioAgenda));
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'bloqueios_agenda');
      return [];
    }
  },

  async createBloqueio(data: Omit<BloqueioAgenda, 'id' | 'created_at' | 'updated_at'>): Promise<string> {
    const docRef = await addDoc(collection(db, 'bloqueios_agenda'), {
      ...data,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
    return docRef.id;
  },

  async updateBloqueio(id: string, data: Partial<BloqueioAgenda>): Promise<void> {
    const docRef = doc(db, 'bloqueios_agenda', id);
    await updateDoc(docRef, {
      ...data,
      updated_at: new Date().toISOString()
    });
  },

  async deleteBloqueio(id: string): Promise<void> {
    await deleteDoc(doc(db, 'bloqueios_agenda', id));
  }
};
