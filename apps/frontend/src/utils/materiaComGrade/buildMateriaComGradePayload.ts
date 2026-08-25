import { normalizeColorId } from '@/lib/colors';
import type { MateriaComGradeApiPayload, MateriaComGradeFormState } from '@/types/materiaComGradeForm';

export function buildMateriaComGradePayload(form: MateriaComGradeFormState): MateriaComGradeApiPayload {
  const cor = normalizeColorId(form.materia.cor) || 'roxo';

  return {
    materia: {
      nome: form.materia.nome.trim(),
      descricao: form.materia.descricao.trim() || null,
      professor: form.materia.professor.trim() || null,
      cor,
      prioridade: form.materia.prioridade,
      peso_importancia: form.materia.peso_importancia,
      meta_semanal_horas: form.materia.meta_semanal_horas === '' ? null : Number(form.materia.meta_semanal_horas),
      status: form.materia.status,
      periodo_inicio: form.periodo.periodo_inicio || null,
      periodo_fim: form.periodo.periodo_fim || null,
      tipo_periodo: form.periodo.tipo_periodo || null,
      numero_periodo: form.periodo.numero_periodo === '' ? null : Number(form.periodo.numero_periodo),
      limite_faltas_percentual:
        form.materia.limite_faltas_percentual === '' ? null : Number(form.materia.limite_faltas_percentual),
      revisao_automatica_ativa: form.materia.revisao_automatica_ativa,
      exibir_no_calendario: form.materia.exibir_no_calendario,
      ia_habilitada: form.materia.ia_habilitada
    },
    grade: form.grade.map(({ dias_semana, hora_inicio, hora_fim, local, observacoes }) => {
      const slot: MateriaComGradeApiPayload['grade'][number] = {
        dias_semana: [...dias_semana].sort((a, b) => a - b),
        hora_inicio,
        hora_fim
      };
      const trimmedLocal = local?.trim();
      if (trimmedLocal) slot.local = trimmedLocal;
      const trimmedObservacoes = observacoes?.trim();
      if (trimmedObservacoes) slot.observacoes = trimmedObservacoes;
      return slot;
    })
  };
}
