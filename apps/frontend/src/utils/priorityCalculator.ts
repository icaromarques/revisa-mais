import { OcorrenciaGrade } from '@/types/availability';
import { EventoAcademico } from '@/types/calendar';
import { calcularResumoFaltas, analisarLimiteDeFaltas } from './faltasCalculator';
import { differenceInDays, differenceInWeeks } from 'date-fns';

interface PriorityResult {
  level: "baixa" | "media" | "alta" | "critica";
  score: number;
  reasons: string[];
}

interface PriorityParams {
  materia: any;
  events?: EventoAcademico[];
  revisoes?: any[];
  ocorrencias?: OcorrenciaGrade[];
  sessoes?: any[];
  topicos?: any[];
  notas?: any[];
  totalClassesExpected?: number;
}

export function calculateSubjectPriority({
  materia,
  events = [],
  revisoes = [],
  ocorrencias = [],
  sessoes = [],
  topicos = [],
  notas = [],
  totalClassesExpected = 0
}: PriorityParams): PriorityResult {
  let score = 0;
  const reasons: string[] = [];
  const now = new Date();

  // 1. Prioridade Manual
  if (materia.prioridade === 'Alta') { score += 15; reasons.push('Prioridade manual alta'); }
  if (materia.prioridade === 'Média') { score += 5; reasons.push('Prioridade manual média'); }

  // 2. Peso/Importância
  if (materia.peso_importancia === 'Alto') { score += 15; reasons.push('Peso/Importância alto na grade'); }
  if (materia.peso_importancia === 'Médio') { score += 5; }

  // 3. Avaliações Próximas (7 dias)
  const proximasAvaliacoes = events.filter(e => {
    if (e.concluido) return false;
    if (!['prova', 'trabalho', 'apresentacao'].includes(e.tipo)) return false;
    if (!e.data_inicio) return false;
    const diff = differenceInDays(new Date(e.data_inicio), now);
    return diff >= 0 && diff <= 10;
  });
  
  if (proximasAvaliacoes.length > 0) {
    score += 30;
    reasons.push(`${proximasAvaliacoes.length} avaliação(ões) nos próximos dias`);
  }

  // 4. Revisões Atrasadas
  const atrasadas = revisoes.filter(r => r.status === 'pendente' && r.data_prevista && new Date(r.data_prevista) < now);
  if (atrasadas.length > 0) {
    const pontos = Math.min(atrasadas.length * 3, 15);
    score += pontos;
    reasons.push(`${atrasadas.length} revisão(ões) pontual atrasada(s)`);
  }

  // 5. Faltas e Risco
  if (ocorrencias.length > 0 && materia.limite_faltas_percentual && totalClassesExpected > 0) {
    const resumoFaltas = calcularResumoFaltas(ocorrencias);
    const analise = analisarLimiteDeFaltas(totalClassesExpected, materia.limite_faltas_percentual, resumoFaltas);
    if (analise) {
      if (analise.riskStatus === 'critical') {
        score += 30;
        reasons.push('Risco CRÍTICO de reprovação por falta');
      } else if (analise.riskStatus === 'warning') {
        score += 15;
        reasons.push('Limites de faltas em estado de alerta');
      }
    }
  }

  // 6. Pendências de reposição
  const pendencias = ocorrencias.filter(o => o.status === 'pendente_confirmacao' || (o.status === 'falta' && o.status_reposicao === 'pendente'));
  if (pendencias.length > 0) {
    score += 10;
    reasons.push(`${pendencias.length} aula(s) perdidas pendentes de reposição`);
  }

  // 7. Desempenho baixo
  const notasNumeric = notas.filter(n => typeof n.valor === 'number');
  if (notasNumeric.length > 0) {
    const media = notasNumeric.reduce((acc, n) => acc + (n.valor as number), 0) / notasNumeric.length;
    if (media < 6) {
        score += 20;
        reasons.push('Desempenho atual abaixo da média esperada');
    }
  }

  // 8. Tópicos com baixo domínio
  const dominiosBaixos = topicos.filter(t => t.dominio === 'Novo' || t.dominio === 'Baixo');
  const proporcaoDominioBaixo = topicos.length > 0 ? dominiosBaixos.length / topicos.length : 0;
  if (proporcaoDominioBaixo > 0.5) {
      score += 10;
      reasons.push('Mais da metade dos tópicos com baixo domínio');
  }

  // 9. Tempo sem estagiar (14 dias ou mais) e não concluída
  if (sessoes.length > 0 && materia.status !== 'concluida' && materia.status !== 'aprovada') {
    // Pegar a data real da sessão (data_inicio, data, ou created_at)
    const validSessoes = sessoes.map(s => {
      const dtStr = s.data_inicio || s.data || s.created_at || s.data_registro;
      return { ...s, parsedDate: dtStr ? new Date(dtStr).getTime() : 0 };
    }).filter(s => s.parsedDate > 0);

    if (validSessoes.length > 0) {
      validSessoes.sort((a, b) => b.parsedDate - a.parsedDate);
      const lastSessao = new Date(validSessoes[0].parsedDate);
      const diasSemEstudar = differenceInDays(now, lastSessao);
      if (diasSemEstudar >= 10) {
          score += 15;
          reasons.push(`Mais de ${diasSemEstudar} dias sem estudar esta matéria`);
      }
    }
  }

  // Fallback se não tivermos informações mas a matéria está em andamento
  if (score === 0 && reasons.length === 0) {
    reasons.push('Frequência regular recomendada. Acumule dados para cálculos mais precisos.');
  }

  let level: PriorityResult['level'] = 'baixa';
  if (score >= 60) level = 'critica';
  else if (score >= 40) level = 'alta';
  else if (score >= 20) level = 'media';

  return {
    level,
    score,
    reasons
  };
}
