export type SituacaoFaltas =
  | 'indeterminado'
  | 'seguro'
  | 'atencao'
  | 'critico'
  | 'reprovado_limite';

export interface FaltasResumoApi {
  materia_id?: string;
  total_aulas_previstas: number;
  total_previsto_bruto?: boolean;
  total_previsto_nota?: string;
  total_ocorrencias_registradas?: number;
  faltas_contabilizadas: number;
  percentual_faltas: number | null;
  limite_percentual: number | null;
  minimo_faltas_para_reprovar: number | null;
  maximo_faltas_sem_reprovar: number | null;
  faltas_ainda_permitidas_sem_reprovar: number | null;
  percentual_do_limite_consumido: number | null;
  situacao: SituacaoFaltas;
  reprovado_por_limite?: boolean;
}

export type FaltasRiskStatus = 'safe' | 'warning' | 'critical';

export function faltasResumosToMap(
  resumos: FaltasResumoApi[]
): Record<string, FaltasResumoApi> {
  return resumos.reduce<Record<string, FaltasResumoApi>>((acc, resumo) => {
    if (resumo.materia_id) {
      acc[resumo.materia_id] = resumo;
    }
    return acc;
  }, {});
}

export function situacaoToRiskStatus(situacao: SituacaoFaltas): FaltasRiskStatus {
  if (situacao === 'reprovado_limite' || situacao === 'critico') return 'critical';
  if (situacao === 'atencao') return 'warning';
  return 'safe';
}

export function formatMargemFaltasText(resumo: FaltasResumoApi): string {
  if (resumo.reprovado_por_limite || resumo.situacao === 'reprovado_limite') {
    return 'Reprovado por limite de faltas';
  }
  const restantes = resumo.faltas_ainda_permitidas_sem_reprovar ?? 0;
  if (restantes <= 0) {
    return 'Você atingiu a margem máxima antes do limite.';
  }
  return `${restantes} falta(s) ainda permitidas`;
}
