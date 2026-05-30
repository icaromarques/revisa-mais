import { OcorrenciaGrade } from '@/types/availability';

export interface ResumoFaltas {
  totalRegistrado: number;          // Total amount of absenses recorded (everything)
  faltasParaLimite: number;         // Absences that count towards the limit (excludes 'com_atestado')
  pendentesReposicao: number;       // Absences waiting to be recovered
  conteudosRecuperados: number;     // Absences completely or partially recovered
  comAtestado: number;              // Total absences with certificate
  justificadas: number;             // Total justified absences
}

export function calcularResumoFaltas(ocorrencias: OcorrenciaGrade[]): ResumoFaltas {
  return ocorrencias.reduce(
    (acc, oc) => {
      const isFalta = oc.status === 'falta' || oc.status === 'conteudo_recuperado';
      if (!isFalta) return acc;

      const qtd = Number(oc.quantidade_ocorrencias || 1);
      
      // Total de faltas registradas no sistema (tudo)
      acc.totalRegistrado += qtd;

      // Faltas que contam para o limite acadêmico
      if (oc.tipo_falta !== 'com_atestado') {
        acc.faltasParaLimite += qtd;
      }

      // Separação por tipo de falta
      if (oc.tipo_falta === 'com_atestado') {
        acc.comAtestado += qtd;
      }
      if (oc.tipo_falta === 'justificada') {
        acc.justificadas += qtd;
      }

      // Verificação de reposição / recuperação
      const isRecuperado = oc.status === 'conteudo_recuperado' || oc.status_reposicao === 'recuperado';
      if (isRecuperado) {
        acc.conteudosRecuperados += qtd;
      } else {
        // Se é falta e não tá recuperada, conta como pendente de reposição acadêmica
        if (oc.status_reposicao !== 'nao_precisa') {
           acc.pendentesReposicao += qtd;
        }
      }

      return acc;
    },
    {
      totalRegistrado: 0,
      faltasParaLimite: 0,
      pendentesReposicao: 0,
      conteudosRecuperados: 0,
      comAtestado: 0,
      justificadas: 0,
    }
  );
}

export interface AnaliseLimiteFaltas {
  expectedClasses: number;
  limitePermitido: number;
  faltasUsadasParaLimite: number;
  faltasRestantes: number;
  percentualUsado: number;
  riskStatus: 'safe' | 'warning' | 'critical';
}

export function analisarLimiteDeFaltas(
  expectedClasses: number,
  limitePercentual: number | undefined,
  resumoFaltas: ResumoFaltas
): AnaliseLimiteFaltas | null {
  if (!limitePercentual || expectedClasses <= 0) {
    return null;
  }

  const limitePermitido = Math.floor(expectedClasses * (limitePercentual / 100));
  const usadas = resumoFaltas.faltasParaLimite;
  const percentual = limitePermitido > 0 ? (usadas / limitePermitido) * 100 : 0;
  
  let riskStatus: 'safe' | 'warning' | 'critical' = 'safe';
  if (percentual >= 80) riskStatus = 'critical';
  else if (percentual >= 50) riskStatus = 'warning';

  return {
    expectedClasses,
    limitePermitido,
    faltasUsadasParaLimite: usadas,
    faltasRestantes: limitePermitido - usadas,
    percentualUsado: percentual,
    riskStatus
  };
}
