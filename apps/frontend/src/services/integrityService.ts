// TODO: Backend api endpoints need to be implemented for this to work.
import { apiClient } from '@/lib/api';
import { normalizeColorId } from '@/lib/colors';

export type IntegrityIssueType = 
  | 'orphan' 
  | 'duplicate' 
  | 'invalid_id' 
  | 'legacy_format' 
  | 'invalid_date' 
  | 'inconsistent_state';

export interface IntegrityIssue {
  id: string;
  collection: string;
  type: IntegrityIssueType;
  description: string;
  isRepairable: boolean;
  metadata?: any;
}

export interface IntegrityScanResult {
  totalScanned: number;
  issuesFound: number;
  repairableCount: number;
  issues: IntegrityIssue[];
}

export const integrityService = {
  // --- Normalization Helpers (Safe transformations) ---

  normalizeSession(session: any): any {
    if (!session) return session;
    const data = { ...session };
    
    // 1. Handle Legacy Material IDs
    if (data.material_id && (!data.linked_material_ids || !data.linked_material_ids.includes(data.material_id))) {
      data.linked_material_ids = Array.from(new Set([...(data.linked_material_ids || []), data.material_id]));
    }

    // 2. Clear Duplicates in Arrays
    if (data.linked_material_ids) {
      data.linked_material_ids = Array.from(new Set(data.linked_material_ids.filter((id: any) => typeof id === 'string' && id.length > 0)));
    }

    // 3. Primary ID Guard
    if (data.primary_material_id && (!data.linked_material_ids || !data.linked_material_ids.includes(data.primary_material_id))) {
       if (data.linked_material_ids?.length > 0) {
         data.primary_material_id = data.linked_material_ids[0];
       } else {
         data.primary_material_id = null;
       }
    }

    // 4. Validate Review Type
    if (data.tipo === 'revisao' && !data.revisao_id && data.revisao_vinculada_id) {
       data.revisao_id = data.revisao_vinculada_id; // Normalize legacy field name if used
    }

    return data;
  },

  normalizeMaterial(material: any): any {
    if (!material) return material;
    const data = { ...material };
    
    if (data.linked_session_ids) {
      data.linked_session_ids = Array.from(new Set(data.linked_session_ids.filter((id: any) => typeof id === 'string' && id.length > 0)));
    }

    // Ensure type is valid
    const validTypes = ['resumo', 'videoaula', 'link', 'arquivo', 'mapa_mental', 'exercicio', 'outro'];
    if (data.tipo && !validTypes.includes(data.tipo)) {
      data.tipo = 'outro';
    }

    return data;
  },

  normalizeReview(review: any): any {
    if (!review) return review;
    const data = { ...review };

    // Standardize status
    if (!data.status) data.status = 'pendente';
    
    // Check completion state
    if (data.status === 'concluido' && !data.data_execucao && data.updated_at) {
       data.data_execucao = this.normalizeDate(data.updated_at);
    }

    return data;
  },

  normalizeAbsence(absence: any): any {
    if (!absence) return absence;
    const data = { ...absence };

    if (data.status === 'recuperada' && !data.recuperacao_referencia_id && !data.sessao_recuperacao_id) {
       // Mark as possibly inconsistent but kept for now
    }

    return data;
  },

  normalizeDate(dateValue: any): string | null {
    if (!dateValue) return null;
    try {
      if (typeof dateValue === 'string') return dateValue;
      if (dateValue.toDate) return dateValue.toDate().toISOString();
      if (dateValue.seconds) return new Date(dateValue.seconds * 1000).toISOString();
      return String(dateValue);
    } catch {
      return null;
    }
  },

  // --- Integrity Scanning ---

  async runIntegrityScan(userId: string): Promise<IntegrityScanResult> {
    const result: IntegrityScanResult = {
      totalScanned: 0,
      issuesFound: 0,
      repairableCount: 0,
      issues: []
    };

    const collectionsToScan = [
      'materias', 'topicos', 'aulas', 'sessoes', 'revisoes', 
      'ocorrencias_grade', 'materiais', 'eventos_academicos',
      'grade_faculdade', 'bloqueios_agenda', 'faltas_materias'
    ];

    const cache: Record<string, Set<string>> = {}; // Valid IDs cache
    const allDocs: Record<string, any[]> = {};

    // Load user data from backend export for integrity analysis
    try {
      const { data } = await apiClient.get('/admin/export');
      allDocs.materias = data.materias || [];
      allDocs.topicos = (data.materias || []).flatMap((m: any) => (m.topicos || []).map((t: any) => ({ ...t, materia_id: m.id })));
      allDocs.aulas = (data.materias || []).flatMap((m: any) => (m.aulas || []).map((a: any) => ({ ...a, materia_id: m.id })));
      allDocs.sessoes = data.sessoes || [];
      allDocs.revisoes = data.revisoes || [];
      allDocs.ocorrencias_grade = data.ocorrencias || [];
      allDocs.materiais = (data.materias || []).flatMap((m: any) => m.materiais || []);
      allDocs.eventos_academicos = data.eventos || [];
      allDocs.grade_faculdade = data.grade || [];
      allDocs.bloqueios_agenda = data.bloqueios || [];
      allDocs.faltas_materias = [];

      for (const collName of collectionsToScan) {
        cache[collName] = new Set((allDocs[collName] || []).map((d: any) => d.id));
        result.totalScanned += (allDocs[collName] || []).length;
      }
    } catch (err) {
      console.warn('Integrity scan failed', err);
      return result;
    }

    // FASE 2: Escanear relações e inconsistências
    for (const collName of collectionsToScan) {
      const docs = allDocs[collName] || [];
      for (const data of docs) {
        const docId = data.id;

        // --- RELATIONAL CHECKS (Orphans) ---
        
        // Verificar materia_id em várias coleções
        if (data.materia_id && !cache['materias']?.has(data.materia_id)) {
          this.addIssue(result, {
            id: docId,
            collection: collName,
            type: 'orphan',
            description: `Vínculo com matéria inexistente (${data.materia_id})`,
            isRepairable: true,
            metadata: { field: 'materia_id' }
          });
        }

        // Verificar topico_id em várias coleções
        if (data.topico_id && !cache['topicos']?.has(data.topico_id)) {
          this.addIssue(result, {
            id: docId,
            collection: collName,
            type: 'orphan',
            description: `Vínculo com tópico inexistente (${data.topico_id})`,
            isRepairable: true,
            metadata: { field: 'topico_id' }
          });
        }

        // --- COR ANTIGA (Materias) ---
        if (collName === 'materias') {
          const validColors = ['roxo', 'esmeralda', 'rosa', 'laranja', 'azul', 'indigo', 'verde', 'amarelo', 'ciano', 'grafite', 'vermelho'];
          if (data.cor && !validColors.includes(data.cor)) {
             this.addIssue(result, {
               id: docId,
               collection: collName,
               type: 'legacy_format',
               description: `Cor em formato legado ou inválido: ${data.cor}`,
               isRepairable: true,
               metadata: { field: 'cor', badValue: data.cor }
             });
          }
        }

        // --- MIGRAÇÃO DE FALTAS LEGADO ---
        if (collName === 'faltas_materias') {
             this.addIssue(result, {
               id: docId,
               collection: collName,
               type: 'legacy_format',
               description: `Registro legado de faltas (migração para ocorrencias_grade)`,
               isRepairable: true,
               metadata: { rawFalta: data }
             });
        }

        // --- SESSION SPECIFIC ---
        if (collName === 'sessoes') {
          // Check linked materials
          if (data.linked_material_ids) {
            const invalidIds = data.linked_material_ids.filter((id: string) => !cache['materiais']?.has(id));
            if (invalidIds.length > 0) {
              this.addIssue(result, {
                id: docId,
                collection: collName,
                type: 'orphan',
                description: `${invalidIds.length} materiais vinculados não existem mais`,
                isRepairable: true,
                metadata: { field: 'linked_material_ids', invalidIds }
              });
            }

            // Check duplicates
            const unique = new Set(data.linked_material_ids);
            if (unique.size !== data.linked_material_ids.length) {
              this.addIssue(result, {
                id: docId,
                collection: collName,
                type: 'duplicate',
                description: 'IDs duplicados no array de materiais vinculados',
                isRepairable: true,
                metadata: { field: 'linked_material_ids' }
              });
            }
          }

          // Legacy format
          if (data.material_id && !data.linked_material_ids?.includes(data.material_id)) {
            this.addIssue(result, {
              id: docId,
              collection: collName,
              type: 'legacy_format',
              description: 'Formato de vínculo de material legado (material_id)',
              isRepairable: true,
              metadata: { field: 'material_id' }
            });
          }
        }

        // --- REVIEW SPECIFIC ---
        if (collName === 'revisoes') {
          if (data.status === 'concluido' && !data.data_execucao) {
            this.addIssue(result, {
              id: docId,
              collection: collName,
              type: 'inconsistent_state',
              description: 'Revisão concluída sem data de execução',
              isRepairable: false
            });
          }
        }
      }
    }

    return result;
  },

  addIssue(result: IntegrityScanResult, issue: IntegrityIssue) {
    result.issuesFound++;
    if (issue.isRepairable) result.repairableCount++;
    result.issues.push(issue);
  },

  async repairIssues(userId: string, issues: IntegrityIssue[]): Promise<number> {
      try {
          const { data } = await apiClient.post('/admin/integrity/repair', { issues });
          return data.repairedCount;
      } catch(e) {
          console.error("Failed to repair issues", e);
          throw e;
      }
  }
};
