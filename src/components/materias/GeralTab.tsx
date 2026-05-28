import React, { useMemo, useState } from 'react';
import { 
  BookOpen, Clock, CheckCircle, BrainCircuit, Calendar as CalendarIcon, 
  FileText, AlertCircle, TrendingUp, ChevronRight, Edit2, Trash2, 
  Plus, History, Lightbulb, Play, MoreVertical
} from 'lucide-react';
import { format, isToday, isFuture, isPast, addDays } from 'date-fns';
import { parseValidDate, safeFormat } from '@/lib/utils';
import { ptBR } from 'date-fns/locale';
import { MaterialCard } from './MaterialCard';
import { calculateTotalExpectedOccurrences } from '@/lib/attendanceHelper';
import { ModalFaltaManual } from '@/components/ModalFaltaManual';
import { calcularResumoFaltas, analisarLimiteDeFaltas } from '@/utils/faltasCalculator';
import { calculateSubjectPriority } from '@/utils/priorityCalculator';
import { getCalendarRenderKey } from '@/lib/calendar-utils';

interface GeralTabProps {
  materia: any;
  grade?: any[];
  topicos: any[];
  aulas: any[];
  revisoes: any[];
  events: any[];
  materiais: any[];
  sessoes: any[];
  resumos: any[];
  decks: any[];
  cadernos: any[];
  notas: any[];
  ocorrencias: any[];
  // Actions
  openDetalheAula: (aula: any) => void;
  openEditAula: (aula: any) => void;
  onDeleteAula: (aulaId: string, deleteRelated: boolean) => void;
  onAddMaterial: (aulaId: string) => void;
  onEditMaterial: (material: any) => void;
  onDeleteMaterial: (id: string) => void;
  onEditEvent: (event: any) => void;
  onUpdateRevisao: (revisao: any, updates: any) => void;
  onDeleteRevisao: (revisao: any) => void;
  onToggleEventConcluido: (event: any) => void;
  onNewEvent: () => void;
  onNewAula: (initialContext?: any) => void;
  onReporAula?: (falta: any, desiredDateStr?: string) => void;
  onRecuperarEstudo?: (falta: any) => void;
  onTabChange: (tabId: string) => void;
  onEditSessao?: (sessao: any) => void;
}

export function GeralTab({
  materia,
  grade = [],
  topicos,
  aulas,
  revisoes,
  events,
  materiais,
  sessoes,
  resumos,
  decks,
  cadernos,
  notas,
  ocorrencias,
  openDetalheAula,
  openEditAula,
  onDeleteAula,
  onAddMaterial,
  onEditMaterial,
  onDeleteMaterial,
  onEditEvent,
  onUpdateRevisao,
  onDeleteRevisao,
  onToggleEventConcluido,
  onNewEvent,
  onNewAula,
  onReporAula,
  onRecuperarEstudo,
  onTabChange,
  onEditSessao
}: GeralTabProps) {

  const [isFaltaModalOpen, setIsFaltaModalOpen] = useState(false);

  // 0. SUMMARY DATA
  const resumoEstrategico = useMemo(() => {
    const now = new Date();
    
    // Progresso
    const totalAulas = aulas.length;
    const aulasAssistidas = aulas.filter(a => a.status === 'assistida').length;
    const progresso = totalAulas > 0 ? Math.round((aulasAssistidas / totalAulas) * 100) : 0;
    
    // Proxima Avaliação
    const upcomingEvents = events
      .filter(e => !e.concluido && e.data_inicio && parseValidDate(e.data_inicio) >= now && ['prova', 'trabalho', 'apresentacao'].includes(e.tipo))
      .sort((a,b) => parseValidDate(a.data_inicio).getTime() - parseValidDate(b.data_inicio).getTime());
    const nextEval = upcomingEvents[0];
    
    // Proxima Revisão
    const upcomingReviews = revisoes
      .filter(r => r.status === 'pendente' && r.data_prevista && parseValidDate(r.data_prevista) >= now)
      .sort((a,b) => parseValidDate(a.data_prevista).getTime() - parseValidDate(b.data_prevista).getTime());
    const nextReview = upcomingReviews[0];
    
    // Faltas
    const resumoFaltas = calcularResumoFaltas(ocorrencias);
    const faltasCount = resumoFaltas.faltasParaLimite;
    const reposicaoPendente = resumoFaltas.pendentesReposicao;
    const conteudosRecuperados = resumoFaltas.conteudosRecuperados;
    const totalFaltasRegistradas = resumoFaltas.totalRegistrado;
    
    // Período e Limite
    let totalClassesExpected = 0;
    let limiteFaltas = 0;
    let faltasUsadasPercentual = 0;
    let riskStatus: 'safe'|'warning'|'critical' = 'safe';
    let faltasRestantes = 0;
    
    if (materia.periodo_inicio && materia.periodo_fim && grade.length > 0) {
      totalClassesExpected = calculateTotalExpectedOccurrences(grade, materia.periodo_inicio, materia.periodo_fim);
      const analiseLimite = analisarLimiteDeFaltas(totalClassesExpected, materia.limite_faltas_percentual, resumoFaltas);
      if (analiseLimite) {
         limiteFaltas = analiseLimite.limitePermitido;
         faltasUsadasPercentual = analiseLimite.percentualUsado;
         riskStatus = analiseLimite.riskStatus;
         faltasRestantes = analiseLimite.faltasRestantes;
      }
    }
    
    // Média
    const notasLançadas = notas.filter(n => n.nota_obtida !== null && n.nota_obtida !== undefined && n.status === 'lancada');
    const somaPesos = notasLançadas.reduce((acc, n) => acc + Number(n.peso || 1), 0);
    const somaNotas = notasLançadas.reduce((acc, n) => acc + (Number(n.nota_obtida) * Number(n.peso || 1)), 0);
    const mediaAtual = notasLançadas.length > 0 ? (somaNotas / (somaPesos || 1)).toFixed(1) : null;

    // Estudo
    const totalMinutos = sessoes.reduce((acc, s) => acc + (s.tempo_estudado_minutos || 0), 0);
    const totalHoras = Math.round(totalMinutos / 60);
    const questoesFeitas = sessoes.reduce((acc, s) => acc + (s.total_questoes || 0), 0);

    return {
      progresso,
      nextEval,
      nextReview,
      faltasCount,
      reposicaoPendente,
      conteudosRecuperados,
      totalClassesExpected,
      limiteFaltas,
      faltasUsadasPercentual,
      riskStatus,
      faltasRestantes,
      mediaAtual,
      totalAulas,
      aulasAssistidas,
      totalHoras,
      questoesFeitas,
      totalFaltasRegistradas,
      resumoFaltas
    };
  }, [aulas, events, revisoes, ocorrencias, notas, sessoes, materia, grade]);

  // Calculo de prioridade
  const priorityInfo = useMemo(() => {
    return calculateSubjectPriority({
      materia,
      events,
      revisoes,
      ocorrencias,
      sessoes,
      topicos,
      notas,
      totalClassesExpected: resumoEstrategico.totalClassesExpected
    });
  }, [materia, events, revisoes, ocorrencias, sessoes, topicos, notas, resumoEstrategico.totalClassesExpected]);

  // 1. STATS & ALERTS
  const alerts = useMemo(() => {
    const list: any[] = [];
    
    // Revisões pendentes
    const pendentes = revisoes.filter(r => r.status === 'pendente');
    const hoje = pendentes.filter(r => r.data_prevista && isToday(parseValidDate(r.data_prevista)));
    const atrasadas = pendentes.filter(r => r.data_prevista && isPast(parseValidDate(r.data_prevista)) && !isToday(parseValidDate(r.data_prevista)));
    const semData = pendentes.filter(r => !r.data_prevista);

    if (atrasadas.length > 0) {
      list.push({
        id: 'rev-atrasada',
        type: 'error',
        icon: <Clock className="w-4 h-4" />,
        title: `${atrasadas.length} revisões atrasadas`,
        desc: 'Sua retenção pode cair. Priorize estas revisões agora.',
        action: () => onTabChange('planejamento')
      });
    }

    if (hoje.length > 0) {
      list.push({
        id: 'rev-hoje',
        type: 'warning',
        icon: <CalendarIcon className="w-4 h-4" />,
        title: `${hoje.length} revisões para hoje`,
        desc: 'Não esqueça de revisar os conteúdos programados para hoje.',
        action: () => onTabChange('geral') // Stay here and scroll to reviews?
      });
    }

    if (semData.length > 0) {
      list.push({
        id: 'rev-sem-data',
        type: 'info',
        icon: <CalendarIcon className="w-4 h-4" />,
        title: `${semData.length} revisões sem data`,
        desc: 'Agende essas revisões para manter o seu cronograma em dia.',
        action: () => onTabChange('planejamento')
      });
    }

    // Aulas sem tópico
    const aulasSemTopico = aulas.filter(a => !a.topico_id);
    if (aulasSemTopico.length > 0) {
      list.push({
        id: 'aula-sem-topico',
        type: 'info',
        icon: <BrainCircuit className="w-4 h-4" />,
        title: `${aulasSemTopico.length} aulas sem tópico`,
        desc: 'Vincule estas aulas a tópicos para melhor organização.',
        action: () => onTabChange('aulas')
      });
    }

    // Aulas "Preciso Revisar"
    const aulasRevisar = aulas.filter(a => a.status === 'revisar');
    if (aulasRevisar.length > 0) {
      list.push({
        id: 'aula-revisar',
        type: 'error',
        icon: <AlertCircle className="w-4 h-4" />,
        title: `${aulasRevisar.length} aulas marcadas para revisar`,
        desc: 'Você sinalizou dúvidas ou necessidade de reforço nestas aulas.',
        action: () => onTabChange('aulas')
      });
    }

    // Tópicos sem aula
    const topicosSemAula = topicos.filter(t => !aulas.some(a => a.topico_id === t.id));
    if (topicosSemAula.length > 0) {
      list.push({
        id: 'topico-sem-aula',
        type: 'info',
        icon: <BookOpen className="w-4 h-4" />,
        title: `${topicosSemAula.length} tópicos sem aulas`,
        desc: 'Considere registrar aulas para cobrir estes tópicos.',
        action: () => onTabChange('topicos')
      });
    }

    // Avaliações próximas
    const proximasProvas = events.filter(e => !e.concluido && ['prova', 'trabalho'].includes(e.tipo) && isFuture(parseValidDate(e.data_inicio)));
    if (proximasProvas.length > 0) {
      list.push({
        id: 'prova-proxima',
        type: 'warning',
        icon: <TrendingUp className="w-4 h-4" />,
        title: `Próxima avaliação em breve`,
        desc: `"${proximasProvas[0].titulo}" em ${safeFormat(proximasProvas[0].data_inicio, "dd/MM")}`,
        action: () => onTabChange('avaliacoes')
      });
    }

    if (resumoEstrategico.reposicaoPendente > 0 && resumoEstrategico.riskStatus !== 'critical') {
      const pendingFalta = ocorrencias.find(f => f.status_reposicao !== 'recuperado');
      list.push({
        id: 'faltas',
        type: 'warning',
        icon: <AlertCircle className="w-4 h-4" />,
        title: `${resumoEstrategico.reposicaoPendente} conteúdo(s) de aula para repor`,
        desc: 'Você tem faltas registradas sem aulas equivalentes.',
        action: pendingFalta && onReporAula ? () => onReporAula(pendingFalta) : () => onTabChange('aulas')
      });
    }

    if (resumoEstrategico.riskStatus === 'critical') {
      const restam = resumoEstrategico.faltasRestantes;
      list.push({
        id: 'faltas-risco-critico',
        type: 'error',
        icon: <AlertCircle className="w-4 h-4" />,
        title: `Risco Crítico por Faltas`,
        desc: restam <= 0 ? 'Você atingiu ou ultrapassou o limite de faltas.' : `Você já usou ${Math.round(resumoEstrategico.faltasUsadasPercentual)}% do limite. Restam apenas ${restam} falta(s).`,
        action: null
      });
    } else if (resumoEstrategico.riskStatus === 'warning') {
      const restam = resumoEstrategico.faltasRestantes;
      list.push({
        id: 'faltas-risco-atencao',
        type: 'warning',
        icon: <AlertCircle className="w-4 h-4" />,
        title: `Atenção com Faltas`,
        desc: `Você já usou ${Math.round(resumoEstrategico.faltasUsadasPercentual)}% do limite. Restam ${restam} falta(s).`,
        action: null
      });
    }

    return list;
  }, [revisoes, aulas, topicos, events, onTabChange, resumoEstrategico]);

  // 2. AULAS SECTIONS
  const aulasSections = useMemo(() => {
    const sorted = [...aulas].sort((a,b) => parseValidDate(b.data).getTime() - parseValidDate(a.data).getTime());
    return {
      recentes: sorted.slice(0, 3),
      revisar: aulas.filter(a => a.status === 'revisar').slice(0, 3),
      proximas: sorted.filter(a => isFuture(parseValidDate(a.data))).reverse().slice(0, 3)
    };
  }, [aulas]);

  // 3. REVISOES SECTIONS
  const revisoesSections = useMemo(() => {
    const pendentes = revisoes.filter(r => r.status === 'pendente');
    return {
      hoje: pendentes.filter(r => r.data_prevista && isToday(parseValidDate(r.data_prevista))),
      futuras: pendentes.filter(r => r.data_prevista && isFuture(parseValidDate(r.data_prevista)) && !isToday(parseValidDate(r.data_prevista))),
      atrasadas: pendentes.filter(r => r.data_prevista && isPast(parseValidDate(r.data_prevista)) && !isToday(parseValidDate(r.data_prevista))),
      semData: pendentes.filter(r => !r.data_prevista)
    };
  }, [revisoes]);

  // 4. AVALIACOES
  const avaliacoesProx = useMemo(() => {
    return events
      .filter(e => ['prova', 'trabalho', 'apresentacao'].includes(e.tipo))
      .sort((a,b) => parseValidDate(a.data_inicio).getTime() - parseValidDate(b.data_inicio).getTime())
      .slice(0, 4);
  }, [events]);

  // 5. ATIVIDADE RECENTE
  const atividadeRecente = useMemo(() => {
    const items: any[] = [];
    
    aulas.forEach(a => items.push({ type: 'aula', date: a.created_at || a.updated_at || a.data, data: a, title: `Aula: ${a.titulo}` }));
    materiais.forEach(m => items.push({ type: 'material', date: m.created_at || m.updated_at, data: m, title: `Material: ${m.titulo}` }));
    revisoes.filter(r => r.status === 'concluida').forEach(r => items.push({ type: 'revisao', date: r.updated_at, data: r, title: `Revisão Concluída: ${r.nome || 'Pendência'}` }));
    resumos.forEach(r => items.push({ type: 'resumo', date: r.created_at, data: r, title: `Resumo Gerado: ${r.titulo}` }));
    decks.forEach(d => items.push({ type: 'deck', date: d.created_at, data: d, title: `Flashcards Gerados: ${d.nome}` }));
    cadernos.forEach(c => items.push({ type: 'caderno', date: c.created_at, data: c, title: `Questões Geradas: ${c.titulo}` }));
    events.forEach(e => items.push({ type: 'evento', date: e.created_at || e.data_inicio, data: e, title: `Evento: ${e.titulo}` }));
    sessoes.forEach(s => items.push({ type: 'sessao', date: s.created_at || s.data, data: s, title: `Estudo: ${s.tempo_estudado_hhmmss || (s.tempo_estudado_minutos + 'min')}` }));

    return items
      .filter(i => i.date)
      .sort((a,b) => parseValidDate(b.date).getTime() - parseValidDate(a.date).getTime())
      .slice(0, 8);
  }, [aulas, materiais, revisoes, resumos, decks, cadernos, events, sessoes]);

  // 6. RECOMENDACOES
  const recomendacoes = useMemo(() => {
    const list: any[] = [];
    const now = new Date();
    
    // Prioridade: Aulas nulas
    if (aulas.length === 0) {
      list.push({
        title: 'Registrar sua primeira aula',
        desc: 'Você ainda não registrou nenhuma aula nesta matéria. Comece agora!',
        action: onNewAula,
        icon: <Plus className="w-4 h-4 text-primary" />
      });
    }

    // Prioridade: Faltas sem reposição
    if (resumoEstrategico.reposicaoPendente > 0) {
      const pendingFaltas = ocorrencias.filter(f => f.status_reposicao !== 'recuperado');
      const latestFalta = pendingFaltas.length > 0 ? pendingFaltas[0] : null;

      list.push({
        title: 'Repor conteúdo de falta',
        desc: `Você tem ${resumoEstrategico.reposicaoPendente} falta(s) recente(s) aguardando reposição de conteúdo.`,
        action: latestFalta && onReporAula ? () => onReporAula(latestFalta) : undefined,
        icon: <AlertCircle className="w-4 h-4 text-error" />,
        customActions: latestFalta ? (
          <div className="flex flex-col gap-3 w-full mt-2">
             <div className="flex flex-wrap gap-2">
               <button 
                  onClick={(e) => { e.stopPropagation(); onReporAula?.(latestFalta); }}
                  className="px-3 py-1.5 bg-error/10 text-error rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-error hover:text-on-error transition-colors"
               >
                  Repor agora
               </button>
               <button 
                  onClick={(e) => { e.stopPropagation(); onRecuperarEstudo?.(latestFalta); }}
                  className="px-3 py-1.5 border border-error/20 text-error rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-error/5 transition-colors"
               >
                  Marcar recuperação por estudo
               </button>
             </div>
             <div className="flex items-center gap-2 mt-1">
               <span className="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest">Agendar reposição:</span>
               <button 
                  onClick={(e) => { e.stopPropagation(); onReporAula?.(latestFalta, format(addDays(new Date(), 1), 'yyyy-MM-dd')); }}
                  className="px-2 py-1 bg-surface-container hover:bg-surface-variant text-on-surface text-[10px] rounded-md transition-colors"
               >
                  Amanhã
               </button>
               <button 
                  onClick={(e) => { 
                     e.stopPropagation(); 
                     const d = new Date();
                     const day = d.getDay();
                     const diff = day <= 5 ? 6 - day : 7 - day + 6;
                     onReporAula?.(latestFalta, format(addDays(d, diff), 'yyyy-MM-dd')); 
                  }}
                  className="px-2 py-1 bg-surface-container hover:bg-surface-variant text-on-surface text-[10px] rounded-md transition-colors"
               >
                  Próx. Sábado
               </button>
               <button 
                  onClick={(e) => { e.stopPropagation(); onTabChange('aulas'); }}
                  className="px-2 py-1 text-on-surface-variant hover:text-on-surface text-[10px] rounded-md transition-colors underline"
               >
                  Resolver depois
               </button>
             </div>
          </div>
        ) : null
      });
    }

    // Prioridade: Revisões atrasadas
    const atrasadas = revisoes.filter(r => r.status === 'pendente' && r.data_prevista && isPast(parseValidDate(r.data_prevista)) && !isToday(parseValidDate(r.data_prevista)));
    if (atrasadas.length > 0) {
      list.push({
        title: 'Recuperar revisões atrasadas',
        desc: `Você tem ${atrasadas.length} revisões que passaram do prazo.`,
        action: () => onTabChange('planejamento'),
        icon: <Clock className="w-4 h-4 text-error" />
      });
    }

    // Prioridade: Revisão hoje
    const hoje = revisoes.filter(r => r.status === 'pendente' && r.data_prevista && isToday(parseValidDate(r.data_prevista)));
    if (hoje.length > 0 && atrasadas.length === 0) {
      list.push({
        title: 'Concluir revisões de hoje',
        desc: `Há ${hoje.length} revisões programadas para hoje. Mantenha o foco!`,
        action: () => onTabChange('geral'),
        icon: <CalendarIcon className="w-4 h-4 text-warning" />
      });
    }

    // Prioridade: Sem avaliações
    if (events.filter(e => ['prova', 'trabalho', 'apresentacao'].includes(e.tipo)).length === 0) {
      list.push({
        title: 'Cadastre a primeira avaliação',
        desc: 'Não esqueça de registrar as datas de provas e trabalhos no calendário.',
        action: onNewEvent,
        icon: <TrendingUp className="w-4 h-4 text-tertiary" />
      });
    }

    // Prioridade: Sem notas
    if (notas.length === 0 && events.some(e => e.concluido && ['prova', 'trabalho'].includes(e.tipo))) {
      list.push({
        title: 'Lançar notas pendentes',
        desc: 'Você concluiu uma avaliação mas ainda não registrou o resultado.',
        action: () => onTabChange('avaliacoes'),
        icon: <FileText className="w-4 h-4 text-success" />
      });
    }

    // Prioridade: Materiais órfãos
    const materiaisSemVinculo = materiais.filter(m => !m.topico_id && !m.aula_id);
    if (materiaisSemVinculo.length > 0) {
      list.push({
        title: 'Organizar acervo rápida',
        desc: `Existem ${materiaisSemVinculo.length} materiais sem vínculo com tópicos ou aulas.`,
        action: () => onTabChange('materiais'),
        icon: <FileText className="w-4 h-4 text-primary" />
      });
    }

    // Se estiver tudo ok
    if (list.length === 0) {
      list.push({
        title: 'Tudo em dia!',
        desc: 'Continue assim. Que tal registrar uma nova sessão de estudo?',
        action: () => onTabChange('topicos'),
        icon: <CheckCircle className="w-4 h-4 text-success" />
      });
    }

    return list.slice(0, 3);
  }, [revisoes, aulas, materiais, onTabChange, openDetalheAula, ocorrencias, events, notas, onNewAula, onNewEvent]);

  return (
    <div className="space-y-8 animate-in fade-in pb-20">
      
      {/* SUMMARY TOP BLOCK */}
      <section className="grid grid-cols-2 lg:grid-cols-8 gap-4">
        {/* Prioridade Inteligente Box (Spans 2 columns) */}
        <div className="col-span-2 lg:col-span-2 glass-panel p-4 rounded-2xl border-outline/10 flex flex-col justify-center min-h-[100px] relative overflow-hidden group">
          <div className={`absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 opacity-20 pointer-events-none transition-all duration-1000`} 
               style={{ backgroundColor: priorityInfo.level === 'critica' || priorityInfo.level === 'alta' ? 'var(--color-error)' : priorityInfo.level === 'media' ? 'var(--color-tertiary)' : 'var(--color-success)' }} />
          
          <div className="flex items-center gap-2 mb-1 z-10 relative">
             <span className="text-[10px] font-black uppercase tracking-widest text-outline">Prioridade Inteligente</span>
             <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: priorityInfo.level === 'critica' || priorityInfo.level === 'alta' ? 'var(--color-error)' : priorityInfo.level === 'media' ? 'var(--color-tertiary)' : 'var(--color-success)' }} />
          </div>
          <span className={`text-xl font-black mb-1 z-10 relative 
             ${priorityInfo.level === 'critica' || priorityInfo.level === 'alta' ? 'text-error' : priorityInfo.level === 'media' ? 'text-tertiary' : 'text-success'} uppercase`}>
             {priorityInfo.level === 'critica' ? 'CRÍTICA' : priorityInfo.level === 'alta' ? 'ALTA' : priorityInfo.level === 'media' ? 'MÉDIA' : 'BAIXA'}
          </span>
          <span className="text-[9px] text-on-surface-variant font-medium leading-tight z-10 relative title-reason" title={priorityInfo.reasons.join('\n')}>
             {priorityInfo.reasons[0] || 'Frequência regular recomendada.'} {priorityInfo.reasons.length > 1 ? `(+${priorityInfo.reasons.length - 1})` : ''}
          </span>
        </div>

        <div className="glass-panel p-4 rounded-2xl border-outline/10 text-center flex flex-col justify-center min-h-[100px]">
          <span className="text-[10px] font-black uppercase tracking-widest text-outline mb-1">Status</span>
          <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border border-current mx-auto
            ${materia.status === 'aprovada' ? 'text-success' : 
              materia.status === 'reprovada' ? 'text-error' : 
              materia.status === 'concluida' ? 'text-tertiary' : 
              materia.status === 'trancada' ? 'text-on-surface-variant' :
              'text-primary'}
          `}>
            {materia.status === 'em_andamento' ? 'Cursando' :
             materia.status === 'concluida' ? 'Concluída' :
             materia.status === 'aprovada' ? 'Aprovada' :
             materia.status === 'reprovada' ? 'Reprovada' :
             materia.status === 'trancada' ? 'Trancada' : 'Em andamento'}
          </span>
        </div>

        <div className="glass-panel p-4 rounded-2xl border-outline/10 text-center flex flex-col justify-center min-h-[100px]">
          <span className="text-[10px] font-black uppercase tracking-widest text-outline mb-1">Progresso</span>
          <span className="text-xl font-black text-on-surface">{resumoEstrategico.progresso}%</span>
          <div className="w-full h-1 bg-surface-container rounded-full mt-2 overflow-hidden">
            <div className="h-full bg-primary transition-all duration-1000" style={{ width: `${resumoEstrategico.progresso}%` }}></div>
          </div>
        </div>

        <div className="glass-panel p-4 rounded-2xl border-outline/10 text-center flex flex-col justify-center min-h-[100px]">
          <span className="text-[10px] font-black uppercase tracking-widest text-outline mb-1">Avaliação</span>
          {resumoEstrategico.nextEval ? (
            <>
              <span className="text-sm font-bold text-tertiary truncate px-1">{resumoEstrategico.nextEval.titulo}</span>
              <span className="text-[10px] font-bold text-on-surface-variant mt-1">{safeFormat(resumoEstrategico.nextEval.data_inicio, "dd/MM")}</span>
            </>
          ) : (
            <span className="text-xs text-on-surface-variant italic">Sem prazos</span>
          )}
        </div>

        <div className="glass-panel p-4 rounded-2xl border-outline/10 text-center flex flex-col justify-center min-h-[100px]">
          <span className="text-[10px] font-black uppercase tracking-widest text-outline mb-1">Revisão</span>
          {resumoEstrategico.nextReview ? (
            <>
              <span className="text-sm font-bold text-primary truncate px-1">{resumoEstrategico.nextReview.nome || 'Pendência'}</span>
              <span className="text-[10px] font-bold text-on-surface-variant mt-1">{safeFormat(resumoEstrategico.nextReview.data_prevista, "dd/MM")}</span>
            </>
          ) : (
            <span className="text-xs text-on-surface-variant italic">Em dia</span>
          )}
        </div>

        <div className={`relative group glass-panel p-4 rounded-2xl border-outline/10 flex flex-col justify-center min-h-[100px] ${resumoEstrategico.riskStatus === 'critical' ? 'bg-error/5 border-error/20 ring-1 ring-error/20' : resumoEstrategico.riskStatus === 'warning' ? 'bg-warning/5 border-warning/20 ring-1 ring-warning/20' : ''}`}>
          <span className="text-[10px] font-black uppercase tracking-widest text-outline mb-2 text-center">Faltas</span>
          
          {resumoEstrategico.limiteFaltas > 0 ? (
            <div className="flex flex-col items-center gap-1.5 w-full">
               <span className={`text-xl font-black leading-none ${resumoEstrategico.riskStatus === 'critical' ? 'text-error' : resumoEstrategico.riskStatus === 'warning' ? 'text-warning' : 'text-on-surface'}`}>
                  {resumoEstrategico.faltasCount} <span className="text-sm font-bold text-on-surface-variant">de {resumoEstrategico.limiteFaltas} usadas</span>
               </span>
               <span className="text-[10px] font-bold text-on-surface">
                  {resumoEstrategico.faltasRestantes} faltas restantes
               </span>
               
               <div className="w-full flex flex-col gap-1 mt-1">
                 <div className="flex justify-between items-center text-[9px] font-bold">
                    <span className="text-on-surface-variant font-mono">{Math.round(resumoEstrategico.faltasUsadasPercentual)}% usado</span>
                    <span className={
                       resumoEstrategico.faltasCount === 0 ? "text-on-surface-variant" :
                       resumoEstrategico.faltasUsadasPercentual <= 50 ? "text-success" :
                       resumoEstrategico.faltasUsadasPercentual < 80 ? "text-warning" :
                       resumoEstrategico.faltasUsadasPercentual < 100 ? "text-error" : "text-error uppercase"
                    }>
                       {resumoEstrategico.faltasCount === 0 ? "Nenhuma falta registrada" :
                        resumoEstrategico.faltasUsadasPercentual <= 50 ? "Dentro do limite" :
                        resumoEstrategico.faltasUsadasPercentual < 80 ? "Atenção: acompanhe suas faltas" :
                        resumoEstrategico.faltasUsadasPercentual < 100 ? "Risco alto de atingir o limite" :
                        "Limite atingido/ultrapassado"}
                    </span>
                 </div>
                 <div className="w-full h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-1000 ${
                       resumoEstrategico.faltasUsadasPercentual <= 50 ? "bg-success" :
                       resumoEstrategico.faltasUsadasPercentual < 80 ? "bg-warning" :
                       "bg-error shadow-[0_0_8px_rgba(255,0,0,0.5)]"
                    }`} style={{ width: `${Math.min(resumoEstrategico.faltasUsadasPercentual, 100)}%` }} />
                 </div>
               </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1">
               <span className="text-[9px] font-bold uppercase text-on-surface-variant mb-1 border border-outline/20 px-2 py-0.5 rounded-full">Limite não definido</span>
               <span className="text-xl font-black leading-none text-on-surface">
                  {resumoEstrategico.totalFaltasRegistradas}
               </span>
               <span className="text-[10px] font-bold text-on-surface-variant">total de faltas registradas</span>
            </div>
          )}
          
          {/* Status extra conditions */}
          {(resumoEstrategico.reposicaoPendente > 0 || resumoEstrategico.conteudosRecuperados > 0) && (
            <div className="flex gap-2 justify-center mt-3 pt-3 border-t border-outline/5 w-full">
              {resumoEstrategico.reposicaoPendente > 0 && (
                 <span className="text-[9px] font-black text-warning animate-pulse">{resumoEstrategico.reposicaoPendente} a repor</span>
              )}
              {resumoEstrategico.conteudosRecuperados > 0 && (
                 <span className="text-[9px] font-bold text-success">{resumoEstrategico.conteudosRecuperados} recuperadas</span>
              )}
            </div>
          )}

          <button 
             onClick={() => setIsFaltaModalOpen(true)} 
             className="absolute md:opacity-0 group-hover:opacity-100 top-2 right-2 p-1.5 bg-surface hover:bg-primary hover:text-on-primary text-on-surface-variant rounded-full transition-all shadow-sm z-10"
             title="Registrar Falta Manual"
          >
             <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="glass-panel p-4 rounded-2xl border-outline/10 text-center flex flex-col justify-center min-h-[100px]">
          <span className="text-[10px] font-black uppercase tracking-widest text-outline mb-1">Média</span>
          <span className="text-xl font-black text-success">{resumoEstrategico.mediaAtual || '-'}</span>
        </div>

        <div className="glass-panel p-4 rounded-2xl border-outline/10 text-center flex flex-col justify-center min-h-[100px]">
          <span className="text-[10px] font-black uppercase tracking-widest text-outline mb-1">Estudo</span>
          <span className="text-xl font-black text-on-surface">{resumoEstrategico.totalHoras}h</span>
          <span className="text-[9px] font-bold text-on-surface-variant mt-1">{resumoEstrategico.questoesFeitas} questões</span>
        </div>
      </section>

      {/* 1. ALERTAS INTELIGENTES */}
      {alerts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {alerts.map(alert => (
            <button 
              key={alert.id}
              onClick={alert.action}
              className={`flex items-start gap-4 p-4 rounded-2xl border text-left transition-all hover:scale-[1.02] active:scale-[0.98] ${
                alert.type === 'error' ? 'bg-error/10 border-error/20 text-error' :
                alert.type === 'warning' ? 'bg-warning/10 border-warning/20 text-warning' :
                'bg-primary/10 border-primary/20 text-primary'
              }`}
            >
              <div className={`p-2 rounded-xl bg-current/10 shrink-0`}>
                {alert.icon}
              </div>
              <div>
                <h5 className="font-bold text-sm leading-tight">{alert.title}</h5>
                <p className="text-xs mt-1 opacity-80 line-clamp-2">{alert.desc}</p>
              </div>
            </button>
          ))}
        </div>
      )}
      
      {/* 1.5 RESUMO DE FALTAS */}
      {(resumoEstrategico.totalFaltasRegistradas > 0) && (
        <div className="p-4 rounded-2xl border bg-surface-container-low border-outline/10 text-sm">
           <h4 className="font-bold text-on-surface mb-3 text-xs uppercase tracking-widest text-outline flex items-center gap-2"><AlertCircle className="w-4 h-4" /> Detalhamento de Faltas</h4>
           <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold text-on-surface-variant">Total Registrado</span>
                <span className="text-lg font-black">{resumoEstrategico.totalFaltasRegistradas}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold text-error">Para o Limite</span>
                <span className="text-lg font-black text-error">{resumoEstrategico.faltasCount}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold text-success">Com Atestado</span>
                <span className="text-lg font-black text-success">{resumoEstrategico.resumoFaltas.comAtestado}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold text-tertiary">Justificadas</span>
                <span className="text-lg font-black text-tertiary">{resumoEstrategico.resumoFaltas.justificadas}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold text-on-surface-variant">Retroativas</span>
                <span className="text-lg font-black">{ocorrencias.filter(o => o.origem === 'retroativa').length}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold text-warning">A Repor</span>
                <span className="text-lg font-black text-warning">{resumoEstrategico.resumoFaltas.pendentesReposicao}</span>
              </div>
           </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* COLUNA ESQUERDA (2/3) */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* BLOCO AULAS */}
          <section className="glass-panel rounded-3xl overflow-hidden border border-outline/10 shadow-sm">
            <div className="p-6 border-b border-outline/10 flex justify-between items-center bg-surface-container-low/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-secondary/10 flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-secondary" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Aulas da Matéria</h3>
                  <p className="text-[10px] text-on-surface-variant font-medium uppercase tracking-widest">Atividade Recente e Planejamento</p>
                </div>
              </div>
              <button 
                onClick={onNewAula}
                className="p-2 bg-secondary/10 text-secondary rounded-xl hover:bg-secondary/20 transition-colors"
                title="Nova Aula"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h4 className="text-xs font-black uppercase tracking-widest text-outline mb-4 flex items-center gap-2">
                  <Clock className="w-3 h-3" /> Últimas Registradas
                </h4>
                <div className="space-y-3">
                  {aulasSections.recentes.length === 0 ? (
                    <p className="text-xs text-on-surface-variant italic">Nenhuma aula registrada.</p>
                  ) : (
                    aulasSections.recentes.map(aula => (
                      <AulaItem 
                        key={aula.id} 
                        aula={aula} 
                        topicos={topicos} 
                        onClick={() => openDetalheAula(aula)}
                        onEdit={() => openEditAula(aula)}
                      />
                    ))
                  )}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-black uppercase tracking-widest text-outline mb-4 flex items-center gap-2">
                  <AlertCircle className="w-3 h-3 text-error" /> Precisam Revisão
                </h4>
                <div className="space-y-3">
                  {aulasSections.revisar.length === 0 ? (
                    <p className="text-xs text-on-surface-variant italic">Tudo em dia por aqui.</p>
                  ) : (
                    aulasSections.revisar.map(aula => (
                      <AulaItem 
                        key={aula.id} 
                        aula={aula} 
                        topicos={topicos} 
                        onClick={() => openDetalheAula(aula)} 
                        onEdit={() => openEditAula(aula)}
                      />
                    ))
                  )}
                </div>
              </div>
            </div>
            
            <div className="p-4 bg-surface-container-highest/30 border-t border-outline/10 text-center">
               <button onClick={() => onTabChange('aulas')} className="text-xs font-bold text-primary hover:underline flex items-center gap-1 mx-auto">
                 Ver todas as aulas <ChevronRight className="w-3 h-3" />
               </button>
            </div>
          </section>

          {/* BLOCO REVISOES */}
          <section className="glass-panel rounded-3xl overflow-hidden border border-outline/10 shadow-sm">
            <div className="p-6 border-b border-outline/10 flex justify-between items-center bg-surface-container-low/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <History className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Revisões Programadas</h3>
                  <p className="text-[10px] text-on-surface-variant font-medium uppercase tracking-widest">Cronograma de Retenção</p>
                </div>
              </div>
            </div>
            
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
               <div>
                  <h4 className="text-xs font-black uppercase tracking-widest text-outline mb-4 flex items-center gap-2">
                    <CalendarIcon className="w-3 h-3 text-primary" /> Para Hoje
                  </h4>
                  <div className="space-y-3">
                    {revisoesSections.hoje.length === 0 ? (
                      <p className="text-xs text-on-surface-variant italic">Sem revisões para hoje.</p>
                    ) : (
                      revisoesSections.hoje.map(rev => (
                        <RevisaoItem 
                          key={rev.id} 
                          revisao={rev} 
                          onUpdate={(up) => onUpdateRevisao(rev, up)}
                          onDelete={() => onDeleteRevisao(rev)}
                        />
                      ))
                    )}
                  </div>
               </div>

               <div>
                  <h4 className="text-xs font-black uppercase tracking-widest text-outline mb-4 flex items-center gap-2">
                    <Clock className="w-3 h-3 text-error" /> Atrasadas
                  </h4>
                  <div className="space-y-3">
                    {revisoesSections.atrasadas.length === 0 ? (
                      <p className="text-xs text-on-surface-variant italic">Nenhuma revisão atrasada. Parabéns!</p>
                    ) : (
                      revisoesSections.atrasadas.map(rev => (
                        <RevisaoItem 
                          key={rev.id} 
                          revisao={rev} 
                          onUpdate={(up) => onUpdateRevisao(rev, up)}
                          onDelete={() => onDeleteRevisao(rev)}
                        />
                      ))
                    )}
                  </div>
               </div>
            </div>

            {revisoesSections.semData.length > 0 && (
              <div className="px-6 py-4 border-t border-outline/10 bg-surface-container-highest/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-warning" />
                    <span className="text-xs font-bold text-on-surface-variant">{revisoesSections.semData.length} revisões aguardando agendamento</span>
                  </div>
                  <button onClick={() => onTabChange('planejamento')} className="text-[10px] font-black uppercase tracking-widest text-primary hover:underline">
                    Resolver Agora
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* NOVO BLOCO: ÚLTIMAS SESSÕES */}
          <section className="glass-panel rounded-3xl overflow-hidden border border-outline/10 shadow-sm bg-indigo-500/5">
            <div className="p-6 border-b border-outline/10 flex justify-between items-center bg-surface-container-low/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Tempo de Estudo</h3>
                  <p className="text-[10px] text-on-surface-variant font-medium uppercase tracking-widest">Tempo de Foco Registrado</p>
                </div>
              </div>
            </div>
            
            <div className="p-6">
              {sessoes.length === 0 ? (
                <div className="py-8 text-center text-on-surface-variant italic text-xs">
                  Nenhuma sessão de estudo registrada para esta matéria ainda.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {sessoes.slice(0, 4).map(sessao => (
                    <div 
                      key={sessao.id} 
                      onClick={() => onEditSessao?.(sessao)}
                      className="p-4 bg-surface-container-highest/50 rounded-2xl border border-outline/5 hover:border-indigo-500/30 transition-all group cursor-pointer"
                    >
                       <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2 mb-2">
                             <Clock className="w-3.5 h-3.5 text-indigo-400" />
                             <span className="text-sm font-black text-on-surface">
                               {sessao.tempo_estudado_hhmmss || `${sessao.tempo_estudado_minutos || 0}min`}
                             </span>
                          </div>
                          <span className="text-[9px] font-black uppercase text-outline">
                            {safeFormat(sessao.created_at || sessao.data, "dd/MM/yy", { locale: ptBR })}
                          </span>
                       </div>
                       <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-tight mb-2">
                         {sessao.tipo || 'Estudo'} • {sessao.topico_id ? topicos.find(t => t.id === sessao.topico_id)?.nome : 'Geral'}
                       </p>
                       {sessao.total_questoes > 0 && (
                         <div className="flex items-center gap-2 mt-2 pt-2 border-t border-outline/10">
                            <CheckCircle className="w-3 h-3 text-success" />
                            <span className="text-[10px] font-bold text-success/80">{sessao.acertos}/{sessao.total_questoes} ({Math.round((sessao.acertos/sessao.total_questoes)*100)}%)</span>
                         </div>
                       )}
                       {sessao.notas && (
                         <p className="text-[10px] text-on-surface-variant italic mt-2 line-clamp-1 opacity-60">
                           "{sessao.notas}"
                         </p>
                       )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 bg-surface-container-highest/30 border-t border-outline/10 text-center">
               <button onClick={() => onTabChange('historico')} className="text-xs font-bold text-indigo-400 hover:underline flex items-center gap-1 mx-auto font-mono uppercase tracking-tighter">
                 Ver histórico completo <ChevronRight className="w-3 h-3" />
               </button>
            </div>
          </section>

          {/* BLOCO MATERIAIS RECENTES */}
          <section className="space-y-4">
             <div className="flex justify-between items-center">
               <h3 className="font-bold text-lg flex items-center gap-2">
                 <FileText className="w-5 h-5 text-tertiary" /> Acervo Recente
               </h3>
               <button onClick={() => onTabChange('materiais')} className="text-xs font-bold text-primary hover:underline">Ver acervo completo</button>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {materiais.slice(0, 4).map(mat => (
                 <MaterialCard 
                   key={mat.id} 
                   material={mat} 
                   topicos={topicos} 
                   aulas={aulas}
                   onEdit={onEditMaterial}
                   onDelete={onDeleteMaterial}
                 />
               ))}
             </div>
          </section>

        </div>

        {/* COLUNA DIREITA (1/3) */}
        <div className="space-y-8">
          
          {/* BLOCO AVALIACOES */}
          <section className="glass-panel rounded-3xl overflow-hidden border border-outline/10 shadow-sm">
            <div className="p-5 border-b border-outline/10 flex justify-between items-center bg-surface-container-low/30">
               <h3 className="font-bold flex items-center gap-2"><TrendingUp className="w-4 h-4 text-tertiary" /> Avaliações</h3>
               <button onClick={onNewEvent} className="p-1.5 bg-tertiary/10 text-tertiary rounded-lg hover:bg-tertiary/20"><Plus className="w-4 h-4" /></button>
            </div>
            <div className="p-5 space-y-4">
              {avaliacoesProx.length === 0 ? (
                <p className="text-xs text-on-surface-variant italic text-center py-4">Sem avaliações agendadas.</p>
              ) : (
                avaliacoesProx.map((event, idx) => (
                  <div key={getCalendarRenderKey(event, 'geral-aval', idx)} onClick={() => onEditEvent(event)} className="p-3 bg-surface-container-highest rounded-xl cursor-pointer hover:bg-surface-variant transition-colors border border-outline/5 relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: event.cor }}></div>
                    <div className="flex items-center gap-3">
                       <div className="flex flex-col items-center justify-center w-10 shrink-0">
                          <span className="text-[8px] uppercase font-black text-outline">{safeFormat(event.data_inicio, "MMM", { locale: ptBR })}</span>
                          <span className="text-sm font-bold leading-none">{safeFormat(event.data_inicio, "dd")}</span>
                       </div>
                       <div className="flex-1 min-w-0">
                          <h5 className="text-sm font-bold truncate">{event.titulo}</h5>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[9px] uppercase tracking-wider font-bold opacity-60">{event.tipo}</span>
                            {isPast(parseValidDate(event.data_inicio)) ? (
                              <span className="text-[9px] font-bold text-on-surface-variant">Encerrado</span>
                            ) : (
                              <span className="text-[x-small] font-bold text-tertiary">{safeFormat(event.data_inicio, "HH:mm")}</span>
                            )}
                          </div>
                       </div>
                       <button 
                         onClick={(e) => { e.stopPropagation(); onToggleEventConcluido(event); }}
                         className={`p-2 rounded-lg transition-colors ${event.concluido ? 'text-success bg-success/10' : 'text-on-surface-variant hover:bg-surface-container'}`}
                       >
                         <CheckCircle className="w-4 h-4" />
                       </button>
                    </div>
                  </div>
                ))
              )}
            </div>
            <button onClick={() => onTabChange('avaliacoes')} className="w-full py-3 text-[10px] font-black uppercase tracking-widest text-outline border-t border-outline/10 hover:text-tertiary transition-colors">Ver todas avaliações</button>
          </section>

          {/* RECOMENDACOES */}
          <section className="glass-panel p-6 rounded-3xl border border-primary/20 bg-primary/5">
             <h4 className="font-bold flex items-center gap-2 text-primary mb-4"><Lightbulb className="w-4 h-4" /> Recomendado</h4>
             <div className="space-y-4">
                {recomendacoes.map((rec, i) => (
                  <div 
                    key={i} 
                    className="w-full text-left p-3 rounded-xl bg-surface-container-lowest border border-primary/10 transition-all flex flex-col gap-3"
                  >
                     <button onClick={rec.action} className="group flex gap-3 items-start text-left w-full hover:opacity-80 transition-opacity">
                       <div className="p-2 rounded-lg bg-primary/5 text-primary shrink-0">
                         {rec.icon}
                       </div>
                       <div>
                         <h5 className="text-xs font-bold text-on-surface group-hover:text-primary transition-colors">{rec.title}</h5>
                         <p className="text-[10px] text-on-surface-variant mt-1">{rec.desc}</p>
                       </div>
                     </button>
                     
                     {rec.customActions && (
                       <div className="pl-[44px] flex flex-col sm:flex-row gap-2 mt-1">
                          {rec.customActions}
                       </div>
                     )}
                  </div>
                ))}
             </div>
          </section>

          {/* ATIVIDADE RECENTE */}
          <section>
             <div className="flex items-center justify-between mb-4">
                <h4 className="font-bold flex items-center gap-2"><History className="w-4 h-4 text-on-surface-variant" /> Atividade Recente</h4>
                <button onClick={() => onTabChange('historico')} className="text-[10px] font-black uppercase tracking-widest text-primary hover:underline">Ver Linha do Tempo</button>
             </div>
             <div className="space-y-4 relative before:absolute before:left-[17px] before:top-2 before:bottom-2 before:w-px before:bg-outline/20">
                {atividadeRecente.length === 0 ? (
                  <div className="pl-12 py-4">
                    <p className="text-xs text-on-surface-variant italic">Sem atividades registradas.</p>
                  </div>
                ) : (
                  atividadeRecente.map((item, i) => (
                    <div key={i} className="flex gap-4 relative">
                       <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 border border-background z-10 shadow-sm ${
                          item.type === 'aula' ? 'bg-secondary/10 text-secondary' :
                          item.type === 'revisao' ? 'bg-success/10 text-success' :
                          item.type === 'evento' ? 'bg-error/10 text-error' :
                          item.type === 'material' ? 'bg-tertiary/10 text-tertiary' :
                          item.type === 'sessao' ? 'bg-indigo-500/10 text-indigo-400' :
                          'bg-primary/10 text-primary'
                       }`}>
                          {item.type === 'aula' ? <BookOpen className="w-4 h-4" /> :
                           item.type === 'revisao' ? <CheckCircle className="w-4 h-4" /> :
                           item.type === 'evento' ? <CalendarIcon className="w-4 h-4" /> :
                           item.type === 'material' ? <FileText className="w-4 h-4" /> :
                           item.type === 'sessao' ? <Clock className="w-4 h-4" /> :
                           <BrainCircuit className="w-4 h-4" />}
                       </div>
                       <div className="pb-4">
                          <p className="text-xs font-bold leading-none mt-1 text-on-surface">{item.title}</p>
                          <p className="text-[10px] text-on-surface-variant mt-1.5 font-medium">
                            {safeFormat(item.date, "dd MMM, HH:mm", { locale: ptBR })}
                          </p>
                       </div>
                    </div>
                  ))
                )}
             </div>
          </section>

        </div>

      </div>

      <ModalFaltaManual 
        isOpen={isFaltaModalOpen}
        onClose={() => setIsFaltaModalOpen(false)}
        materiaIdProp={materia.id}
      />

    </div>
  );
}

function AulaItem({ aula, topicos, onClick, onEdit }: { key?: any, aula: any, topicos: any[], onClick: () => void, onEdit: () => void }) {
  const topico = topicos.find(t => t.id === aula.topico_id);
  return (
    <div onClick={onClick} className="p-3 bg-surface-container-highest rounded-xl cursor-pointer hover:bg-surface-variant transition-colors border border-outline/5 group">
      <div className="flex justify-between items-start gap-2">
        <h5 className="text-sm font-bold truncate group-hover:text-secondary transition-colors">{aula.titulo}</h5>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
           <button 
             type="button"
             onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEdit(); }} 
             className="p-1 text-outline hover:text-secondary"
           >
             <Edit2 className="w-3 h-3" />
           </button>
        </div>
      </div>
      <div className="flex items-center gap-3 mt-1 text-[10px] text-on-surface-variant font-medium">
         <span className="flex items-center gap-1"><CalendarIcon className="w-3 h-3" /> {safeFormat(aula.data, "dd/MM")}</span>
         {topico && <span className="flex items-center gap-1 max-w-[100px] truncate"><BrainCircuit className="w-3 h-3" /> {topico.nome}</span>}
         <span className={`px-1.5 py-0.5 rounded uppercase tracking-tighter font-black ${
            aula.status === 'assistida' ? 'bg-success/10 text-success' :
            aula.status === 'revisar' ? 'bg-error/10 text-error' :
            'bg-surface-container text-on-surface-variant'
         }`}>{aula.status}</span>
      </div>
    </div>
  );
}

function RevisaoItem({ revisao, onUpdate, onDelete }: { key?: any, revisao: any, onUpdate: (updates: any) => void, onDelete: () => void }) {
  return (
    <div className="p-3 bg-surface-container-highest rounded-xl border border-outline/5 group flex items-center gap-3">
       <button 
         type="button"
         onClick={(e) => { e.preventDefault(); e.stopPropagation(); onUpdate({ status: 'concluida', data_conclusao: new Date().toISOString() }); }}
         className="w-5 h-5 rounded border border-outline/30 flex items-center justify-center hover:border-success hover:bg-success/10 text-transparent hover:text-success transition-all"
       >
         <CheckCircle className="w-4 h-4" />
       </button>
       <div className="flex-1 min-w-0">
          <h5 className="text-xs font-bold truncate">{revisao.nome || 'Revisão Pendente'}</h5>
          <p className="text-[9px] text-on-surface-variant font-medium mt-0.5">
             {revisao.data_prevista ? safeFormat(revisao.data_prevista, "eeee, dd/MM", { locale: ptBR }) : 'Sem data definida'}
          </p>
       </div>
       <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button 
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(); }} 
            className="p-1 text-on-surface-variant hover:text-error"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
       </div>
    </div>
  );
}
