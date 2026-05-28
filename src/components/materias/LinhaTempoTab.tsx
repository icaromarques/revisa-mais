import React, { useState, useMemo } from 'react';
import { 
  BookOpen, BrainCircuit, Clock, RotateCcw, Calendar as CalendarIcon, 
  FileText, Layers, ListChecks, Sparkles, Search, Filter, 
  ChevronRight, ArrowUpRight, AlertCircle, TrendingUp, Play, 
  CheckCircle, MoreVertical, Edit2, Trash2, Calendar, 
  Clock3, Tag, ExternalLink, Zap, Plus
} from 'lucide-react';
import { format, isToday, isYesterday, isWithinInterval, subDays, startOfMonth, isAfter, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { parseValidDate, safeFormat } from '@/lib/utils';

interface LinhaTempoTabProps {
  materia: any;
  topicos: any[];
  aulas: any[];
  sessoes: any[];
  revisoes: any[];
  materiais: any[];
  events: any[];
  resumos: any[];
  decks: any[];
  cadernos: any[];
  ocorrencias?: any[];
  onReporAula?: (falta: any) => void;
  onRecuperarEstudo?: (falta: any) => void;
  onOpenSessao?: (sessao: any) => void;
  openDetalheAula: (aula: any) => void;
  openEditAula: (aula: any) => void;
  onDesvincularAula: (aula: any) => void;
  onEditTopico: (topico: any) => void;
  onDeleteTopico: (topico: any) => void;
  onOpenRevisao: (revisao: any) => void;
  onOpenNovaAula?: () => void;
  onOpenIniciarEstudo?: () => void;
  onEditSessao?: (sessao: any) => void;
  onDeleteSessao?: (sessao: any) => void;
}

type TimelineItemType = 'aula' | 'topico' | 'sessao' | 'revisao' | 'avaliacao' | 'material' | 'resumo' | 'deck' | 'caderno' | 'ia' | 'falta';

interface TimelineItem {
  id: string;
  tipo: TimelineItemType;
  subtipo: string;
  titulo: string;
  descricao: string;
  data: Date;
  impacto?: string;
  origem: 'manual' | 'automatica' | 'ia';
  meta: any;
  status?: string;
}

export function LinhaTempoTab({
  materia, topicos, aulas, sessoes, revisoes, materiais, events,
  resumos, decks, cadernos, ocorrencias,
  openDetalheAula, openEditAula, onDesvincularAula,
  onEditTopico, onDeleteTopico, onOpenRevisao,
  onOpenNovaAula, onOpenIniciarEstudo, onEditSessao, onDeleteSessao,
  onReporAula, onRecuperarEstudo, onOpenSessao
}: LinhaTempoTabProps) {
  const [filtroTipo, setFiltroTipo] = useState<string>('todos');
  const [filtroPeriodo, setFiltroPeriodo] = useState<string>('todos');
  const [busca, setBusca] = useState('');

  // 1. DATA AGGREGATION & NORMALIZATION
  const timelineItems = useMemo(() => {
    const items: TimelineItem[] = [];

    // Auxiliary collections map for names
    const topicosMap = Object.fromEntries(topicos.map(t => [t.id, t.nome]));

    // AULAS
    aulas.forEach(a => {
      if (a.created_at) {
        items.push({
          id: `aula-cre-${a.id}`,
          tipo: 'aula',
          subtipo: 'criada',
          titulo: `Aula cadastrada: ${a.titulo}`,
          descricao: a.professor ? `Professor: ${a.professor}` : 'Nenhuma descrição informada.',
          data: parseValidDate(a.created_at),
          impacto: a.topico_id ? `Vinculada ao tópico: ${topicosMap[a.topico_id] || 'Removido'}` : 'Sem tópico vinculado.',
          origem: 'manual',
          meta: a,
          status: a.status
        });
      }
      if (a.updated_at && a.updated_at !== a.created_at) {
        items.push({
          id: `aula-upd-${a.id}`,
          tipo: 'aula',
          subtipo: 'atualizada',
          titulo: `Aula atualizada: ${a.titulo}`,
          descricao: `Status atual: ${a.status}`,
          data: parseValidDate(a.updated_at),
          impacto: 'Informações da aula foram modificadas.',
          origem: 'manual',
          meta: a,
          status: a.status
        });
      }
    });

    // TOPICOS
    topicos.forEach(t => {
      if (t.created_at) {
        items.push({
          id: `top-cre-${t.id}`,
          tipo: 'topico',
          subtipo: 'criado',
          titulo: `Novo Tópico: ${t.nome}`,
          descricao: t.descricao || 'Tópico adicionado à matéria.',
          data: parseValidDate(t.created_at),
          impacto: `Peso: ${t.peso || 1} | Prioridade: ${t.prioridade || 'Media'}`,
          origem: 'manual',
          meta: t
        });
      }
      
      // Intelligent Milestone: Mastery
      if (t.status_dominio === 'dominado' && t.updated_at) {
        items.push({
          id: `top-mastery-${t.id}`,
          tipo: 'ia',
          subtipo: 'conquista',
          titulo: `Tópico Dominado! 🎉`,
          descricao: `Você atingiu o nível máximo de domínio em: ${t.nome}`,
          data: parseValidDate(t.updated_at),
          impacto: 'Excelente progresso! Tópico pronto para revisões de manutenção.',
          origem: 'ia',
          meta: t
        });
      }

      // Simple status check if updated_at exists
      if (t.updated_at && t.updated_at !== t.created_at && t.status_dominio !== 'dominado') {
        items.push({
          id: `top-upd-${t.id}`,
          tipo: 'topico',
          subtipo: 'atualizado',
          titulo: `Tópico atualizado: ${t.nome}`,
          descricao: `Domínio: ${t.status_dominio || 'Não iniciado'}`,
          data: parseValidDate(t.updated_at),
          impacto: 'Status de domínio ou dados do tópico alterados.',
          origem: 'manual',
          meta: t
        });
      }
    });

    // SESSOES (Add record detection)
    sessoes.forEach(s => {
      const dataStr = s.created_at || s.data_registro;
      if (dataStr) {
        const isLongSessao = s.tempo_estudado_minutos > 60;
        
        let sessionFormatada = s.tipo?.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') || 'Sessão de Estudo';
        const fallbackTitle = isLongSessao ? `${sessionFormatada} Épica 🔥` : `${sessionFormatada} Finalizada`;
        
        items.push({
          id: `ses-${s.id}`,
          tipo: 'sessao',
          subtipo: isLongSessao ? 'intensiva' : 'concluida',
          titulo: s.titulo || fallbackTitle,
          descricao: `Duração: ${s.tempo_estudado_minutos || 0} min${s.topico_id ? ` • ${topicosMap[s.topico_id] || ''}` : ''}${s.material_id ? ` • com material vinculado` : ''}.`,
          data: parseValidDate(s.created_at || s.data_registro),
          impacto: s.total_questoes ? `${s.total_questoes} questões feitas (${s.acertos} acertos)` : 'Tempo de foco registrado.',
          origem: s.tipo || 'manual',
          meta: s
        });
      }
    });

    // REVISOES
    revisoes.forEach(r => {
      if (r.status === 'concluida' && r.updated_at) {
        items.push({
          id: `rev-concluid-${r.id}`,
          tipo: 'revisao',
          subtipo: 'concluida',
          titulo: `Revisão concluída: ${r.tipo || 'Diferenciada'}`,
          descricao: `Tópico: ${topicosMap[r.topico_id] || 'Geral'}`,
          data: parseValidDate(r.updated_at),
          impacto: 'Próxima revisão sugerida para o próximo ciclo (ex: 15 ou 30 dias).',
          origem: r.origem || 'automatica',
          meta: r,
          status: 'concluido'
        });
      } else if (r.created_at) {
        items.push({
          id: `rev-cre-${r.id}`,
          tipo: 'revisao',
          subtipo: 'criada',
          titulo: `Revisão agendada: ${r.tipo || 'Diferenciada'}`,
          descricao: `Data prevista: ${r.data_prevista ? safeFormat(r.data_prevista, 'dd/MM/yyyy') : '-'}`,
          data: parseValidDate(r.created_at),
          impacto: r.origem === 'ia' ? 'Sugestão de revisão gerada por IA.' : 'Novo lembrete de revisão no cronograma.',
          origem: r.origem || 'automatica',
          meta: r,
          status: 'pendente'
        });
      }
    });

    // AVALIACOES (Events)
    events.forEach(e => {
      if (e.data_inicio) {
        items.push({
          id: `ev-main-${e.id}`,
          tipo: 'avaliacao',
          subtipo: e.concluido ? 'concluida' : 'agendada',
          titulo: `${e.tipo.toUpperCase()}: ${e.titulo}`,
          descricao: `Data: ${safeFormat(e.data_inicio, 'dd/MM HH:mm')}`,
          data: parseValidDate(e.created_at || e.data_inicio),
          impacto: e.concluido ? 'Avaliação finalizada e registrada no histórico.' : 'Lembretes criados e evento sincronizado no calendário.',
          origem: 'manual',
          meta: e,
          status: e.concluido ? 'concluido' : 'pendente'
        });
      }
    });

    // MATERIAIS
    materiais.forEach(m => {
      if (m.created_at) {
        items.push({
          id: `mat-cre-${m.id}`,
          tipo: 'material',
          subtipo: 'adicionado',
          titulo: `Material anexado: ${m.titulo || 'Sem título'}`,
          descricao: `Tipo: ${m.tipo || 'Arquivo/Link'}`,
          data: parseValidDate(m.created_at),
          impacto: 'Acervo da matéria ampliado.',
          origem: 'manual',
          meta: m
        });
      }
    });

    // RESUMOS
    resumos.forEach(res => {
      if (res.created_at) {
        items.push({
          id: `res-cre-${res.id}`,
          tipo: 'resumo',
          subtipo: res.origem === 'ia' ? 'gerado' : 'criado',
          titulo: `Resumo ${res.origem === 'ia' ? 'gerado por IA' : 'cadastrado'}`,
          descricao: res.titulo || 'Novo resumo disponível.',
          data: parseValidDate(res.created_at),
          impacto: 'Material de revisão teórica criado.',
          origem: res.origem || 'manual',
          meta: res
        });
      }
    });

    // DECKS (Flashcards)
    decks.forEach(d => {
      if (d.created_at) {
        items.push({
          id: `dk-cre-${d.id}`,
          tipo: 'deck',
          subtipo: d.origem === 'ia' ? 'gerado' : 'criado',
          titulo: `Deck de Flashcards: ${d.nome}`,
          descricao: `${d.total_cards || 0} cards ${d.origem === 'ia' ? 'criados por IA' : 'cadastrados'}.`,
          data: parseValidDate(d.created_at),
          impacto: 'Nova ferramenta de estudo ativo adicionada.',
          origem: d.origem || 'manual',
          meta: d
        });
      }
    });

    // CADERNOS (Questoes)
    cadernos.forEach(c => {
      if (c.created_at) {
        items.push({
          id: `cad-cre-${c.id}`,
          tipo: 'caderno',
          subtipo: c.origem === 'ia' ? 'gerado' : 'criado',
          titulo: `Caderno de Questões: ${c.nome}`,
          descricao: `Vinculado aos tópicos da matéria.`,
          data: parseValidDate(c.created_at),
          impacto: 'Banco de questões reforçado.',
          origem: c.origem || 'manual',
          meta: c
        });
      }
    });

    // FALTAS (Ocorrencias)
    if (ocorrencias) {
      ocorrencias.forEach(oc => {
        if (oc.created_at) {
           const isRecuperado = oc.status_reposicao === 'recuperado';
           items.push({
             id: `oc-cre-${oc.id}`,
             tipo: 'falta',
             subtipo: isRecuperado ? 'recuperada' : 'pendente',
             titulo: isRecuperado ? 'Falta recuperada' : 'Falta registrada (Pendente de reposição)',
             descricao: `Ocorrência do dia ${safeFormat(oc.data, 'dd/MM')}. ${isRecuperado ? 'O conteúdo já foi recuperado.' : 'Requer reposição para evitar perda de aprendizagem.'}`,
             data: parseValidDate(oc.created_at),
             impacto: isRecuperado ? 'Recuperação registrada com sucesso.' : 'Impacto direto no limite de presenças e progressão de conteúdo.',
             origem: oc.origem || 'manual',
             meta: oc,
             status: isRecuperado ? 'concluido' : 'pendente'
           });
        }
      });
    }

    // Filter by type
    let filtered = items;
    if (filtroTipo !== 'todos') {
      if (filtroTipo === 'ia') {
        filtered = filtered.filter(it => it.origem === 'ia');
      } else {
        filtered = filtered.filter(it => it.tipo === filtroTipo);
      }
    }

    // Filter by search
    if (busca) {
      filtered = filtered.filter(it => 
        it.titulo.toLowerCase().includes(busca.toLowerCase()) || 
        it.descricao.toLowerCase().includes(busca.toLowerCase())
      );
    }

    // Filter by period
    const now = new Date();
    if (filtroPeriodo === 'hoje') {
      filtered = filtered.filter(it => !isNaN(it.data.getTime()) && isToday(it.data));
    } else if (filtroPeriodo === '7dias') {
      filtered = filtered.filter(it => !isNaN(it.data.getTime()) && isAfter(it.data, subDays(now, 7)));
    } else if (filtroPeriodo === '30dias') {
      filtered = filtered.filter(it => !isNaN(it.data.getTime()) && isAfter(it.data, subDays(now, 30)));
    } else if (filtroPeriodo === 'mes') {
      filtered = filtered.filter(it => !isNaN(it.data.getTime()) && isAfter(it.data, startOfMonth(now)));
    }

    // Sort by date desc
    return filtered.sort((a, b) => b.data.getTime() - a.data.getTime());
  }, [aulas, topicos, sessoes, revisoes, materiais, events, resumos, decks, cadernos, filtroTipo, filtroPeriodo, busca]);

  // 2. SUMMARY DATA
  const summary = useMemo(() => {
    const sortedAll = timelineItems.sort((a, b) => b.data.getTime() - a.data.getTime());
    const lastItem = sortedAll[0];
    
    const now = new Date();
    
    // Proxima Revisao
    const nextRev = revisoes
      .filter(r => r.status === 'pendente' && r.data_prevista && parseValidDate(r.data_prevista) >= now)
      .sort((a, b) => parseValidDate(a.data_prevista).getTime() - parseValidDate(b.data_prevista).getTime())[0];
    
    const delayedRevCount = revisoes.filter(r => r.status === 'pendente' && r.data_prevista && parseValidDate(r.data_prevista) < now).length;

    // Próxima Avaliação
    const nextEval = events
      .filter(e => !e.concluido && e.data_inicio && parseValidDate(e.data_inicio) >= now && ['prova', 'trabalho', 'apresentacao'].includes(e.tipo))
      .sort((a, b) => parseValidDate(a.data_inicio).getTime() - parseValidDate(b.data_inicio).getTime())[0];

    // Dias sem atividade
    let daysWithoutActivity = 0;
    if (lastItem && !isNaN(lastItem.data.getTime())) {
      daysWithoutActivity = Math.max(0, differenceInDays(now, lastItem.data));
    }

    // Evolução Recente (Last 7 days)
    const sevenDaysAgo = subDays(now, 7);
    const recentItems = timelineItems.filter(it => !isNaN(it.data.getTime()) && isAfter(it.data, sevenDaysAgo));
    const recentStats = {
      sessões: recentItems.filter(it => it.tipo === 'sessao').length,
      revisões: recentItems.filter(it => it.tipo === 'revisao' && it.subtipo === 'concluida').length,
      aulas: recentItems.filter(it => it.tipo === 'aula' && it.subtipo === 'criada').length,
      ia: recentItems.filter(it => it.origem === 'ia').length
    };

    return {
      lastItem,
      nextRev,
      delayedRevCount,
      nextEval,
      daysWithoutActivity,
      recentStats
    };
  }, [timelineItems, revisoes, events]);

  const configItem = (tipo: TimelineItemType) => {
    switch (tipo) {
      case 'aula': return { color: 'text-blue-400', bg: 'bg-blue-500/10', icon: BookOpen, label: 'Aula' };
      case 'topico': return { color: 'text-purple-400', bg: 'bg-purple-500/10', icon: BrainCircuit, label: 'Tópico' };
      case 'sessao': return { color: 'text-indigo-400', bg: 'bg-indigo-500/10', icon: Clock, label: 'Sessão' };
      case 'revisao': return { color: 'text-pink-400', bg: 'bg-pink-500/10', icon: RotateCcw, label: 'Revisão' };
      case 'avaliacao': return { color: 'text-red-400', bg: 'bg-red-500/10', icon: CalendarIcon, label: 'Avaliação' };
      case 'material': return { color: 'text-yellow-400', bg: 'bg-yellow-500/10', icon: FileText, label: 'Material' };
      case 'resumo': return { color: 'text-cyan-400', bg: 'bg-cyan-500/10', icon: FileText, label: 'Resumo' };
      case 'deck': return { color: 'text-green-400', bg: 'bg-green-500/10', icon: Layers, label: 'Flashcard' };
      case 'caderno': return { color: 'text-orange-400', bg: 'bg-orange-500/10', icon: ListChecks, label: 'Questão' };
      case 'ia': return { color: 'text-fuchsia-400', bg: 'bg-fuchsia-500/10', icon: Sparkles, label: 'IA' };
      case 'falta': return { color: 'text-error', bg: 'bg-error/10', icon: AlertCircle, label: 'Falta' };
      default: return { color: 'text-on-surface-variant', bg: 'bg-surface-container', icon: Tag, label: 'Evento' };
    }
  };

  const handleClickItem = (item: TimelineItem) => {
    switch (item.tipo) {
      case 'aula': openDetalheAula(item.meta); break;
      case 'revisao': onOpenRevisao(item.meta); break;
      case 'topico': onEditTopico(item.meta); break;
      case 'sessao': onOpenSessao ? onOpenSessao(item.meta) : onEditSessao?.(item.meta); break;
      case 'falta':
         if (item.meta.reposicao_aula_id && aulas) {
            const aula = aulas.find(a => a.id === item.meta.reposicao_aula_id);
            if (aula) {
               openDetalheAula(aula);
               break;
            }
         }
         if (item.meta.reposicao_sessao_id && sessoes && onOpenSessao) {
            const sessao = sessoes.find(s => s.id === item.meta.reposicao_sessao_id);
            if (sessao) {
               onOpenSessao(sessao);
               break;
            }
         }
         if (item.meta.status_reposicao !== 'recuperado') {
            onReporAula?.(item.meta);
         }
         break;
      case 'avaliacao': /* Add navigation to evaluation */ break;
      // Add more as needed
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      
      {/* BLOCO A — RESUMO ESTRATÉGICO */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Card 1: Última Atividade */}
        <div className="glass-panel p-4 rounded-2xl border-l-4 border-primary">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-outline mb-2">Última Atividade</p>
          {summary.lastItem ? (
            <div className="space-y-1">
              <p className="font-bold text-sm text-on-surface truncate">{summary.lastItem.titulo}</p>
              <p className="text-[10px] text-on-surface-variant font-medium">{safeFormat(summary.lastItem.data, 'dd MMM • HH:mm', { locale: ptBR })}</p>
              <button onClick={() => handleClickItem(summary.lastItem)} className="text-[9px] font-black uppercase text-primary mt-2 flex items-center gap-1 hover:underline">
                Abrir <ArrowUpRight className="w-2.5 h-2.5" />
              </button>
            </div>
          ) : (
            <p className="text-xs text-on-surface-variant italic">Sem histórico ainda</p>
          )}
        </div>

        {/* Card 2: Próxima Revisão */}
        <div className="glass-panel p-4 rounded-2xl border-l-4 border-pink-500">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-outline mb-2">Próxima Revisão</p>
          {summary.nextRev ? (
            <div className="space-y-1">
              <p className="font-bold text-sm text-on-surface truncate">{summary.nextRev.tipo || 'Revisão Geral'}</p>
              <p className={`text-[10px] font-black uppercase ${summary.delayedRevCount > 0 ? 'text-error' : 'text-on-surface-variant'}`}>
                {summary.delayedRevCount > 0 ? `${summary.delayedRevCount} EM ATRASO` : safeFormat(summary.nextRev.data_prevista, 'dd MMM', { locale: ptBR })}
              </p>
              <button 
                onClick={() => onOpenRevisao(summary.nextRev)}
                className="text-[9px] font-black uppercase text-pink-500 mt-2 flex items-center gap-1 hover:underline"
              >
                Detalhes <ChevronRight className="w-2.5 h-2.5" />
              </button>
            </div>
          ) : (
            <p className="text-xs text-on-surface-variant italic">Nada agendado</p>
          )}
        </div>

        {/* Card 3: Próxima Avaliação */}
        <div className="glass-panel p-4 rounded-2xl border-l-4 border-error">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-outline mb-2">Próxima Avaliação</p>
          {summary.nextEval ? (
            <div className="space-y-1">
              <p className="font-bold text-sm text-on-surface truncate">{summary.nextEval.titulo}</p>
              <p className="text-[10px] text-error font-black uppercase">
                {safeFormat(summary.nextEval.data_inicio, "dd 'de' MMM", { locale: ptBR })}
              </p>
              <p className="text-[9px] text-on-surface-variant font-bold">
                {(() => {
                  const d = parseValidDate(summary.nextEval.data_inicio);
                  if (isNaN(d.getTime())) return 'Data não definida';
                  const diff = differenceInDays(d, new Date());
                  return diff > 0 ? `Inicia em ${diff} dias` : diff === 0 ? 'Ocorre hoje' : 'Já ocorreu';
                })()}
              </p>
            </div>
          ) : (
            <p className="text-xs text-on-surface-variant italic">Sem provas próximas</p>
          )}
        </div>

        {/* Card 4: Tempo sem atividade */}
        <div className="glass-panel p-4 rounded-2xl border-l-4 border-tertiary">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-outline mb-2">Inatividade</p>
          <div className="flex items-baseline gap-1">
            <span className={`text-2xl font-black ${summary.daysWithoutActivity > 3 ? 'text-error' : 'text-on-surface'}`}>{summary.daysWithoutActivity}</span>
            <span className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">dias</span>
          </div>
          {summary.daysWithoutActivity > 3 && (
            <div className="flex items-center gap-1 text-[9px] text-error font-bold mt-2">
              <AlertCircle className="w-2.5 h-2.5" /> Alerta de Estagnação
            </div>
          )}
        </div>

        {/* Card 5: Evolução Recente */}
        <div className="glass-panel p-4 rounded-2xl border-l-4 border-success">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-outline mb-2">Evolução Recente (7d)</p>
          <div className="grid grid-cols-2 gap-2 mt-1">
             <div className="flex flex-col">
                <span className="text-lg font-black text-on-surface leading-tight">{summary.recentStats.sessões}</span>
                <span className="text-[8px] font-black uppercase text-on-surface-variant tracking-wider">Sessões</span>
             </div>
             <div className="flex flex-col">
                <span className="text-lg font-black text-on-surface leading-tight">{summary.recentStats.revisões}</span>
                <span className="text-[8px] font-black uppercase text-on-surface-variant tracking-wider">Revisões</span>
             </div>
             <div className="flex flex-col">
                <span className="text-lg font-black text-on-surface leading-tight">{summary.recentStats.aulas}</span>
                <span className="text-[8px] font-black uppercase text-on-surface-variant tracking-wider">Aulas</span>
             </div>
          </div>
        </div>

        {/* Card 6: IA / Automações Recentes */}
        <div className="glass-panel p-4 rounded-2xl border-l-4 border-fuchsia-500">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-fuchsia-400 mb-2">IA / Automações</p>
          <div className="flex items-center gap-3 mt-1">
             <div className="p-2 rounded-xl bg-fuchsia-500/20">
                <Sparkles className="w-5 h-5 text-fuchsia-400" />
             </div>
             <div>
                <span className="text-xl font-black text-fuchsia-400">{summary.recentStats.ia}</span>
                <p className="text-[8px] font-black uppercase text-fuchsia-400/70 tracking-wider">Ações Inteligentes</p>
             </div>
          </div>
          {summary.recentStats.ia > 0 && (
            <div className="text-[9px] text-fuchsia-400/50 font-bold mt-2 flex items-center gap-1">
              <Zap className="w-2.5 h-2.5" /> Otimizando seu estudo
            </div>
          )}
        </div>
      </div>

      {/* BLOCO B — FILTROS */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'todos', label: 'Tudo', icon: ListChecks },
            { id: 'aula', label: 'Aulas', icon: BookOpen },
            { id: 'topico', label: 'Tópicos', icon: BrainCircuit },
            { id: 'sessao', label: 'Sessões', icon: Clock },
            { id: 'revisao', label: 'Revisões', icon: RotateCcw },
            { id: 'avaliacao', label: 'Avaliações', icon: CalendarIcon },
            { id: 'ia', label: 'IA', icon: Sparkles },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFiltroTipo(tab.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all border ${
                filtroTipo === tab.id 
                  ? 'bg-primary text-on-primary border-primary shadow-lg shadow-primary/20' 
                  : 'bg-surface-container text-on-surface-variant border-outline/20 hover:border-primary/50'
              }`}
            >
              <tab.icon className="w-3 h-3" />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
             <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
             <input 
               type="text" 
               placeholder="Pesquisar na timeline..."
               value={busca}
               onChange={e => setBusca(e.target.value)}
               className="w-full bg-surface-container border border-outline/20 rounded-xl pl-10 pr-4 py-2 text-xs focus:ring-2 focus:ring-primary/40 outline-none transition-all"
             />
          </div>
          <select 
            value={filtroPeriodo}
            onChange={e => setFiltroPeriodo(e.target.value)}
            className="bg-surface-container border border-outline/20 rounded-xl px-3 py-2 text-xs font-bold text-on-surface outline-none"
          >
            <option value="todos">Todo o perido</option>
            <option value="hoje">Hoje</option>
            <option value="7dias">Últimos 7 dias</option>
            <option value="30dias">Últimos 30 dias</option>
            <option value="mes">Neste mês</option>
          </select>
        </div>
      </div>

      {/* BLOCO C — TIMELINE PRINCIPAL */}
      <div className="relative">
        {/* Vertical line - hidden on mobile, centered on desktop */}
        <div className="hidden md:block absolute left-1/2 top-4 bottom-4 w-px bg-gradient-to-b from-primary/30 via-outline/20 to-transparent -translate-x-1/2" />

        <div className="space-y-10">
          {timelineItems.length === 0 ? (
            <div className="text-center py-24 glass-panel rounded-3xl border-dashed border-2 border-outline/20">
               <Zap className="w-16 h-16 text-on-surface-variant/20 mx-auto mb-4" />
               <h4 className="text-lg font-bold text-on-surface">Ative sua Linha do Tempo</h4>
               <p className="text-sm text-on-surface-variant max-w-sm mx-auto mt-2">
                 Comece seus estudos nesta matéria para ver o histórico de evolução aparecer aqui. Tente cadastrar uma aula ou registrar uma sessão de estudos.
               </p>
               <div className="mt-8 flex flex-wrap justify-center gap-4">
                  <button onClick={onOpenNovaAula} className="px-6 py-2 bg-primary rounded-xl text-xs font-bold text-on-primary hover:bg-primary/90 transition-all flex items-center gap-2">
                    <Plus className="w-4 h-4" /> Cadastrar Aula
                  </button>
                  <button onClick={onOpenIniciarEstudo} className="px-6 py-2 bg-surface-container-highest rounded-xl text-xs font-bold text-on-surface hover:bg-surface-variant transition-all flex items-center gap-2">
                    <Play className="w-4 h-4" /> Iniciar Estudo
                  </button>
               </div>
            </div>
          ) : (
            timelineItems.map((item, idx) => {
              const cfg = configItem(item.tipo);
              const isEven = idx % 2 === 0;

              return (
                <div key={item.id} className="relative animate-in slide-in-from-bottom-5 duration-700" style={{ animationDelay: `${idx * 50}ms` }}>
                  {/* Date Badge on the side or top */}
                  <div className={`flex flex-col md:flex-row items-center gap-4 ${isEven ? 'md:flex-row' : 'md:flex-row-reverse'}`}>
                    
                    {/* Content Card */}
                    <div className={`w-full md:w-[calc(50%-2rem)] glass-panel p-5 rounded-2xl hover:bg-surface-container-highest transition-all duration-300 group cursor-pointer border hover:border-${item.origem === 'ia' ? 'fuchsia-500/50' : 'primary/50'}`} onClick={() => handleClickItem(item)}>
                      <div className="flex items-start justify-between mb-3">
                        <div className={`p-2 rounded-xl ${cfg.bg} ${cfg.color} shrink-0`}>
                          <cfg.icon className="w-5 h-5" />
                        </div>
                        <div className="flex items-center gap-2">
                           <span className={`text-[8px] uppercase font-black px-1.5 py-0.5 rounded tracking-[0.1em] ${cfg.bg} ${cfg.color}`}>
                             {item.subtipo}
                           </span>
                           {item.origem === 'ia' && (
                             <span className="text-[8px] uppercase font-black px-1.5 py-0.5 rounded tracking-[0.1em] bg-fuchsia-500/20 text-fuchsia-400 flex items-center gap-1">
                               <Sparkles className="w-2 h-2" /> IA
                             </span>
                           )}
                           <div className="relative flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                             {item.tipo === 'sessao' && (
                               <>
                                 <button 
                                   onClick={(e) => { e.stopPropagation(); onEditSessao?.(item.meta); }}
                                   className="p-1.5 hover:bg-primary/20 hover:text-primary rounded-lg transition-colors text-on-surface-variant"
                                   title="Editar"
                                 >
                                   <Edit2 className="w-3.5 h-3.5" />
                                 </button>
                                 <button 
                                   onClick={(e) => { e.stopPropagation(); onDeleteSessao?.(item.meta); }}
                                   className="p-1.5 hover:bg-error/20 hover:text-error rounded-lg transition-colors text-on-surface-variant"
                                   title="Excluir"
                                 >
                                   <Trash2 className="w-3.5 h-3.5" />
                                 </button>
                               </>
                             )}
                             {item.tipo !== 'sessao' && (
                                <button className="p-1 hover:bg-surface-variant rounded-md">
                                  <MoreVertical className="w-4 h-4 text-on-surface-variant" />
                                </button>
                             )}
                           </div>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <h4 className="font-bold text-on-surface group-hover:text-primary transition-colors leading-tight">
                          {item.titulo}
                        </h4>
                        <p className="text-xs text-on-surface-variant leading-relaxed">
                          {item.descricao}
                        </p>
                      </div>

                      {item.impacto && (
                        <div className="mt-4 pt-3 border-t border-outline/10 flex items-center gap-2">
                          <TrendingUp className="w-3 h-3 text-secondary" />
                          <span className="text-[10px] font-bold text-secondary uppercase tracking-widest">{item.impacto}</span>
                        </div>
                      )}

                      <div className="mt-4 flex items-center justify-between text-[10px] font-medium text-on-surface-variant">
                         <div className="flex items-center gap-3">
                           <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {safeFormat(item.data, 'dd/MM/yyyy')}</span>
                           <span className="flex items-center gap-1"><Clock3 className="w-3 h-3" /> {safeFormat(item.data, 'HH:mm')}</span>
                         </div>
                         <div className="flex items-center gap-1 text-primary opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                           {item.tipo === 'falta' && item.subtipo === 'pendente' ? 'Resolver' : 'Acessar'} <ArrowUpRight className="w-3 h-3" />
                         </div>
                      </div>
                    </div>

                    {/* Timeline Dot (Desktop only) */}
                    <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 items-center justify-center z-10">
                      <div className={`w-3 h-3 rounded-full border-2 border-background ${item.origem === 'ia' ? 'bg-fuchsia-500 shadow-[0_0_10px_rgba(217,70,239,0.5)]' : 'bg-primary shadow-[0_0_10px_rgba(var(--primary-rgb),0.5)]'}`} />
                    </div>

                    {/* Spacer for flow */}
                    <div className="hidden md:block w-[calc(50%-2rem)]" />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
