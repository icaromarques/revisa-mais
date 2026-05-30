// TODO: A refatoração completa deste serviço para usar apiClient foi adiada. 
// Atualmente ele ainda usa firebase/firestore diretamente.
import { db } from '@/lib/firebase';
import { collection, doc, addDoc, updateDoc, deleteDoc, serverTimestamp, query, where, getDocs, writeBatch, getDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '@/lib/firestoreErrorHandler';

export interface MaterialInput {
  user_id: string;
  materia_id: string;
  topico_id?: string | null;
  aula_id?: string | null;
  titulo: string;
  tipo: string;
  
  source_kind?: 'external_url' | 'google_drive' | 'youtube' | 'text' | 'manual';
  provider?: 'google_drive' | 'youtube' | 'external' | 'text';
  
  url?: string;
  conteudo?: string;
  descricao?: string;
  observacoes?: string;
  
  drive_file_id?: string | null;
  drive_web_view_link?: string | null;
  drive_web_content_link?: string | null;
  drive_file_name?: string | null;
  drive_mime_type?: string | null;
  drive_file_size?: number | null;

  criado_a_partir_da_sessao?: boolean;
  origin_session_id?: string | null;
  linked_session_ids?: string[];
  
  // Legacy fields
  arquivo_url?: string;
  arquivo_path?: string;
  arquivo_nome?: string;
  arquivo_tipo?: string;
  arquivo_extensao?: string;
  arquivo_tamanho?: number;
  storage_path?: string;
}

function sanitizeFirestorePayload(payload: any) {
  const sanitized = { ...payload };
  for (const key in sanitized) {
    if (sanitized[key] === undefined) {
      delete sanitized[key];
    }
  }
  return sanitized;
}

export const materialService = {
  // Common validation for all materials
  validateMaterial: (data: Partial<MaterialInput>) => {
    if (!data.titulo || !data.titulo.trim()) throw new Error('O título do material é obrigatório.');
    if (!data.tipo) throw new Error('O tipo do material é obrigatório.');

    const hasUrl = !!(data.url && data.url.trim());
    const hasDriveProps = !!data.drive_file_id || !!(data as any).drive_preview_url || !!(data as any).drive_open_url || !!data.drive_web_view_link;
    const hasDrive = hasDriveProps || hasUrl;
    const hasLegacyFile = !!(data.arquivo_url || data.arquivo_path || data.storage_path);
    const hasAnyFileUrl = hasUrl || hasDrive || hasLegacyFile;

    const sourceKind = data.source_kind;

    if (sourceKind === 'external_url' && !hasUrl) {
       throw new Error('A URL é obrigatória para links externos.');
    }

    if (sourceKind === 'google_drive' && !hasDrive && !hasLegacyFile) {
       throw new Error('As informações do arquivo são obrigatórias.');
    }

    const isTextType = ['resumo', 'mapa_mental', 'anotacao', 'material_apoio'].includes(data.tipo);
    if (sourceKind === 'text' && (!data.conteudo || !data.conteudo.trim()) && (!data.observacoes || !data.observacoes.trim())) {
      throw new Error('O conteúdo textual é obrigatório.');
    }

    if (['pdf', 'slide', 'imagem', 'arquivo', 'outro', 'video', 'audio'].includes(data.tipo)) {
      if (data.tipo !== 'outro' && !hasAnyFileUrl && sourceKind !== 'text') {
           throw new Error(`Para o tipo selecionado (${data.tipo}), você precisa fornecer um Link ou arquivo.`);
      }
    }

    const isBook = data.tipo === 'livro';
    if (isBook && (!data.titulo || !data.titulo.trim())) {
      throw new Error('Para livro, o título é obrigatório.');
    }
  },

  createMaterial: async (data: MaterialInput) => {
    materialService.validateMaterial(data);

    try {
      const payload: any = {
        ...data,
        status: 'disponivel',
        linked_session_ids: data.linked_session_ids || (data.origin_session_id ? [data.origin_session_id] : []),
        created_at: serverTimestamp(),
        updated_at: serverTimestamp()
      };
      const materialRef = await addDoc(collection(db, 'materiais'), sanitizeFirestorePayload(payload));
      return materialRef.id;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'materiais');
      throw err;
    }
  },

  updateMaterial: async (materialId: string, data: Partial<MaterialInput>) => {
    try {
      const docRef = doc(db, 'materiais', materialId);
      const snapshot = await getDoc(docRef);
      const existingData = snapshot.exists() ? snapshot.data() : {};
      
      const mergedData = { ...existingData, ...data } as Partial<MaterialInput>;
      materialService.validateMaterial(mergedData);
    } catch(validationError: any) {
        if (data.source_kind === 'external_url' && data.url !== undefined && !data.url.trim()) {
           throw new Error('A URL/Link é obrigatória para este tipo.');
        } else {
           throw validationError;
        }
    }

    try {
      await updateDoc(doc(db, 'materiais', materialId), sanitizeFirestorePayload({
        ...data,
        updated_at: serverTimestamp()
      }));
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `materiais/${materialId}`);
      throw err;
    }
  },

  deleteMaterial: async (materialId: string, userId: string) => {
    if (!materialId) throw new Error("ID do material ausente.");
    if (!userId) throw new Error("Usuário não autenticado.");

    try {
      const matRef = doc(db, 'materiais', materialId);
      const matSnap = await getDoc(matRef);
      if (!matSnap.exists()) {
         return; // If it doesn't exist, we skip
      }
      if (matSnap.data().user_id !== userId) {
         throw new Error("Você não tem permissão para excluir este material.");
      }

      const batch = writeBatch(db);
      
      // Delete the material document itself
      batch.delete(matRef);

      // Track sessions we are updating to avoid Duplicate Document updates in the same Batch
      const sessionsToUpdate = new Map<string, { ref: any, updates: any, data: any }>();

      // 1. Find sessions linking to this material via linked_material_ids
      const sessaoQuery = query(collection(db, 'sessoes'), where('user_id', '==', userId), where('linked_material_ids', 'array-contains', materialId));
      const sessoesSnap = await getDocs(sessaoQuery);
      
      sessoesSnap.forEach((s) => {
        const data = s.data();
        const newLinked = (data.linked_material_ids || []).filter((id: string) => id !== materialId);
        
        const updates: any = {
          linked_material_ids: newLinked,
          ...(data.material_id === materialId ? { material_id: null } : {}),
          updated_at: serverTimestamp()
        };
        
        if (data.primary_material_id === materialId) {
            updates.primary_material_id = newLinked.length > 0 ? newLinked[newLinked.length - 1] : null; 
        }
        
        sessionsToUpdate.set(s.id, { ref: s.ref, updates, data });
      });

      // 2. Find sessions linking via legacy material_id
      const sessaoLegacyQuery = query(collection(db, 'sessoes'), where('user_id', '==', userId), where('material_id', '==', materialId));
      const sessoesLegacySnap = await getDocs(sessaoLegacyQuery);
      
      sessoesLegacySnap.forEach((s) => {
          if (sessionsToUpdate.has(s.id)) {
              const existing = sessionsToUpdate.get(s.id)!;
              existing.updates.material_id = null;
              if (existing.data.primary_material_id === materialId) {
                  existing.updates.primary_material_id = null;
              }
          } else {
              sessionsToUpdate.set(s.id, {
                 ref: s.ref,
                 data: s.data(),
                 updates: {
                    material_id: null,
                    primary_material_id: s.data().primary_material_id === materialId ? null : s.data().primary_material_id,
                    updated_at: serverTimestamp()
                 }
              });
          }
      });

      for (const [_, session] of sessionsToUpdate) {
          batch.update(session.ref, session.updates);
      }

      await batch.commit();
    } catch (err) {
      console.error('[MATERIAL_DELETE] Erro ao excluir material:', err);
      handleFirestoreError(err, OperationType.DELETE, `materiais/${materialId}`);
      throw err;
    }
  },
  
  linkMaterialToSession: async (materialId: string, sessionId: string, setAsPrimary: boolean = false) => {
    try {
       await updateDoc(doc(db, 'materiais', materialId), {
           linked_session_ids: arrayUnion(sessionId),
           updated_at: serverTimestamp()
       });

       const sessionRef = doc(db, 'sessoes', sessionId);
       const sessionSnap = await getDoc(sessionRef);
       
       const updates: any = {
           linked_material_ids: arrayUnion(materialId),
           updated_at: serverTimestamp()
       };
       
       if (sessionSnap.exists()) {
           const data = sessionSnap.data();
           if (setAsPrimary || !data.primary_material_id) {
               updates.primary_material_id = materialId;
           }
       }

       await updateDoc(sessionRef, updates);
    } catch(err) {
       handleFirestoreError(err, OperationType.UPDATE, 'link_material_session');
    }
  },

  unlinkMaterialFromSession: async (materialId: string, sessionId: string) => {
    try {
       await updateDoc(doc(db, 'materiais', materialId), {
           linked_session_ids: arrayRemove(sessionId),
           updated_at: serverTimestamp()
       });

       const sessionRef = doc(db, 'sessoes', sessionId);
       const sessionSnap = await getDoc(sessionRef);
       
       const updates: any = {
           linked_material_ids: arrayRemove(materialId),
           material_id: null, // clear legacy
           updated_at: serverTimestamp()
       };
       
       if (sessionSnap.exists()) {
           const data = sessionSnap.data();
           if (data.primary_material_id === materialId) {
               const newLinked = (data.linked_material_ids || []).filter((id: string) => id !== materialId);
               updates.primary_material_id = newLinked.length > 0 ? newLinked[newLinked.length - 1] : null;
           }
       }

       await updateDoc(sessionRef, updates);
    } catch(err) {
       handleFirestoreError(err, OperationType.UPDATE, 'unlink_material_session');
    }
  },

  setPrimaryMaterialForSession: async (sessionId: string, materialId: string | null) => {
    try {
       await updateDoc(doc(db, 'sessoes', sessionId), {
           primary_material_id: materialId,
           updated_at: serverTimestamp()
       });
    } catch(err) {
       handleFirestoreError(err, OperationType.UPDATE, 'set_primary_material');
    }
  }
};
