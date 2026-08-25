import { OcorrenciaGrade } from '@/types/availability';

/** Operational absence counts — not used for academic limit/reprovação rules. */
export interface ResumoOperacionalFaltas {
  totalRegistrado: number;
  pendentesReposicao: number;
  conteudosRecuperados: number;
  comAtestado: number;
  justificadas: number;
}

export function calcularResumoOperacionalFaltas(
  ocorrencias: OcorrenciaGrade[]
): ResumoOperacionalFaltas {
  return ocorrencias.reduce(
    (acc, oc) => {
      const isFalta = oc.status === 'falta' || oc.status === 'conteudo_recuperado';
      if (!isFalta) return acc;

      const qtd = Number(oc.quantidade_ocorrencias || 1);
      acc.totalRegistrado += qtd;

      if (oc.tipo_falta === 'com_atestado') {
        acc.comAtestado += qtd;
      }
      if (oc.tipo_falta === 'justificada') {
        acc.justificadas += qtd;
      }

      const isRecuperado =
        oc.status === 'conteudo_recuperado' || oc.status_reposicao === 'recuperado';
      if (isRecuperado) {
        acc.conteudosRecuperados += qtd;
      } else if (oc.status_reposicao !== 'nao_precisa') {
        acc.pendentesReposicao += qtd;
      }

      return acc;
    },
    {
      totalRegistrado: 0,
      pendentesReposicao: 0,
      conteudosRecuperados: 0,
      comAtestado: 0,
      justificadas: 0
    }
  );
}

/**
 * Policy (Etapa 1B): tipo_falta = com_atestado is excluded from academic limit on the backend.
 * May become configurable in a future stage.
 */
