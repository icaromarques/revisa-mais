import { apiClient } from '@/lib/api';

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
        linked_session_ids: data.linked_session_ids || (data.origin_session_id ? [data.origin_session_id] : [])
      };
      
      const res = await apiClient.post('/materiais', payload);
      return res.data.id;
    } catch (err) {
      console.error("Failed to create material", err);
      throw err;
    }
  },

  updateMaterial: async (materialId: string, data: Partial<MaterialInput>) => {
    // Basic partial validation, ideally the backend validates
    try {
      await apiClient.put(`/materiais/${materialId}`, data);
    } catch (err) {
      console.error("Failed to update material", err);
      throw err;
    }
  },

  deleteMaterial: async (materialId: string, userId: string) => {
    if (!materialId) throw new Error("ID do material ausente.");
    if (!userId) throw new Error("Usuário não autenticado.");

    try {
      await apiClient.delete(`/materiais/${materialId}`);
    } catch (err) {
      console.error('[MATERIAL_DELETE] Erro ao excluir material:', err);
      throw err;
    }
  },
  
  linkMaterialToSession: async (materialId: string, sessionId: string, setAsPrimary: boolean = false) => {
    try {
       await apiClient.post(`/materiais/${materialId}/link/${sessionId}`, { setAsPrimary });
    } catch(err) {
       console.error("Erro ao linkar material a sessão:", err);
       throw err;
    }
  },

  unlinkMaterialFromSession: async (materialId: string, sessionId: string) => {
    try {
       await apiClient.delete(`/materiais/${materialId}/link/${sessionId}`);
    } catch(err) {
       console.error("Erro ao deslinkar material da sessão:", err);
       throw err;
    }
  },

  setPrimaryMaterialForSession: async (sessionId: string, materialId: string | null) => {
    try {
       await apiClient.patch(`/sessoes/${sessionId}/primary-material`, { material_id: materialId });
    } catch(err) {
       console.error("Erro ao definir material primário da sessão:", err);
       throw err;
    }
  }
};
