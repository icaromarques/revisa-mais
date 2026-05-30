import React, { useState, useMemo } from 'react';
import { 
  Play, CheckCircle, Search, Filter, MoreVertical, Edit2, Trash2, 
  BrainCircuit, BookOpen, Clock, CalendarIcon, ChevronRight, Hash, 
  FileText, Activity, AlertCircle, TrendingUp, Plus
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { openMaterial, parseValidDate, safeFormat, formatDuration } from '@/lib/utils';
import { toast } from '@/lib/toast';
import { doc, updateDoc, deleteField } from 'firebase/firestore'; // TODO: Refatorar
import { db } from '@/lib/firebase'; // TODO: Refatorar
import { apiClient } from '@/lib/api';
import { getPerformanceClass } from '@/lib/performanceUtils';
import { cn } from '@/lib/utils';

interface TopicosTabProps {
  topicos: any[];
  aulas: any[];
  sessoes: any[];
  revisoes: any[];
  materiais: any[];
  openNovoTopico: () => void;
  openEditTopico: (topico: any) => void;
  openDeleteTopico: (topico: any) => void;
  openDetalheAula: (aula: any) => void;
  openNovaAulaNoTopico?: (topicoId: string) => void;
  openVincularAula?: (topico: any) => void;
  onDesvincularAula?: (aula: any) => void;
  onEditAula?: (aula: any) => void;
  onEditMaterial?: (material: any) => void;
  onDeleteMaterial?: (id: string) => void;
  onAddMaterial?: (topicoId: string) => void;
}

export function TopicosTab({ 
  topicos, aulas, sessoes, revisoes, materiais, 
  openNovoTopico, openEditTopico, openDeleteTopico, openDetalheAula,
  openNovaAulaNoTopico, openVincularAula, onDesvincularAula, onEditAula,
  onEditMaterial, onDeleteMaterial, onAddMaterial
}: TopicosTabProps) {
  
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [filtroPrioridade, setFiltroPrioridade] = useState('');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  
  // Expanded view for a specific topic
  const [selectedTopico, setSelectedTopico] = useState<any>(null);
  
  // Annotation inline edit state
  const [editAnotacaoMode, setEditAnotacaoMode] = useState<boolean>(false);
  const [anotacaoForm, setAnotacaoForm] = useState<string>('');
  const [confirmDeleteAnotacao, setConfirmDeleteAnotacao] = useState(false);

  // Helper to compute metrics for a single topic
  const computeTopicoMetricas = (t: any) => {
    const topicoAulas = aulas.filter(a => a.topico_id === t.id);
    const topicoSessoes = sessoes.filter(s => s.topico_id === t.id);
    const topicoRevisoes = revisoes.filter(r => r.topico_id === t.id);
    
    const totalQ = topicoSessoes.reduce((acc, s) => acc + (s.total_questoes || 0), 0);
    const totalH = topicoSessoes.reduce((acc, s) => acc + (s.acertos || 0), 0);
    const performance = getPerformanceClass(totalH, totalQ);
    
    const horasEstudadas = topicoSessoes.reduce((acc, curr) => acc + (Number(curr.duracao) || 0), 0) / 60;
    
    let dominio = t.status_dominio || t.status || 'nao_vi';
    if (dominio === 'pendente') dominio = 'nao_vi';
    const statusMap: Record<string, { label: string, color: string }> = {
      nao_vi: { label: 'Não vi', color: 'text-outline bg-surface-container' },
      estudando: { label: 'Estudando', color: 'text-primary bg-primary/10 border-primary/20' },
      revisao_inicial: { label: 'Rev. Inicial', color: 'text-tertiary bg-tertiary/10 border-tertiary/20' },
      revisao_intermediaria: { label: 'Rev. Avançada', color: 'text-secondary bg-secondary/10 border-secondary/20' },
      dominado: { label: 'Dominado', color: 'text-success bg-success/10 border-success/20' },
      em_andamento: { label: 'Em Andamento', color: 'text-primary bg-primary/10 border-primary/20' },
      concluido: { label: 'Concluído', color: 'text-success bg-success/10 border-success/20' }
    };

    return {
      ...t,
      stats: {
        aulas: topicoAulas.length,
        sessoes: topicoSessoes.length,
        revisoes: topicoRevisoes.length,
        horasFormatadas: horasEstudadas.toFixed(1),
        performance
      },
      dominioObj: statusMap[dominio] || statusMap['nao_vi']
    };
  };

  // Compute metrics for each topic
  const topicosComMetricas = useMemo(() => {
    return topicos
      .filter(t => {
        const matchBusca = t.nome.toLowerCase().includes(busca.toLowerCase());
        const matchStatus = filtroStatus ? t.status_dominio === filtroStatus : true;
        const matchPrioridade = filtroPrioridade ? t.prioridade === filtroPrioridade : true;
        return matchBusca && matchStatus && matchPrioridade;
      })
      .map(computeTopicoMetricas);
  }, [topicos, aulas, sessoes, revisoes, busca, filtroStatus, filtroPrioridade]);

  if (selectedTopico) {
    // VISÃO DETALHADA DO TÓPICO
    // Use raw topicos array to find the current topic data, ensuring it reflects real-time updates without filter lag
    const topicoBase = topicos.find((top: any) => top.id === selectedTopico.id) || selectedTopico;
    
    // Always compute fresh metrics for the detail view to avoid stale/missing data due to filters
    const topicoMetricas = topicosComMetricas.find((top: any) => top.id === selectedTopico.id);
    const t = topicoMetricas ? { ...topicoBase, ...topicoMetricas } : topicoBase;

    const topicoAulas = aulas.filter(a => a.topico_id === t.id);
    const topicoSessoes = sessoes.filter(s => s.topico_id === t.id);
    const topicoRevisoes = revisoes.filter(r => r.topico_id === t.id);
    const topicoMateriais = materiais.filter(m => m.topico_id === t.id);
    
    // Performance for topic
    const totalQ_top = topicoSessoes.reduce((acc, s) => acc + (s.total_questoes || 0), 0);
    const totalH_top = topicoSessoes.reduce((acc, s) => acc + (s.acertos || 0), 0);
    const topicoPerf = getPerformanceClass(totalH_top, totalQ_top);

    const handleSaveAnotacao = async () => {
      try {
        const novoValor = anotacaoForm.trim();

        await updateDoc(doc(db, 'topicos', t.id), {
          observacoes: novoValor,
          updated_at: new Date().toISOString()
        });

        setSelectedTopico((prev: any) =>
          prev ? { ...prev, observacoes: novoValor } : prev
        );

        toast.success('Anotação atualizada!');
        setEditAnotacaoMode(false);
      } catch (error) {
        console.error(error);
        toast.error('Erro ao atualizar anotação.');
      }
    };

    const handleDeleteAnotacao = async () => {
      try {
        await updateDoc(doc(db, 'topicos', t.id), {
          observacoes: deleteField(),
          updated_at: new Date().toISOString()
        });

        setSelectedTopico((prev: any) =>
          prev ? { ...prev, observacoes: '' } : prev
        );

        setAnotacaoForm('');
        setEditAnotacaoMode(false);
        setConfirmDeleteAnotacao(false);

        toast.success('Anotação removida!');
      } catch (error) {
        console.error(error);
        toast.error('Erro ao apagar anotação.');
      }
    };

    const startEditAnotacao = () => {
       setConfirmDeleteAnotacao(false);
       setAnotacaoForm(t.observacoes || '');
       setEditAnotacaoMode(true);
    };

    return (
      <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-300">
         {/* Top Bar Navigation */}
         <div className="flex items-center gap-4 mb-4">
           <button onClick={() => { setSelectedTopico(null); setEditAnotacaoMode(false); setConfirmDeleteAnotacao(false); }} className="text-sm font-bold text-on-surface-variant hover:text-on-surface flex items-center gap-1 transition-colors">
             <ChevronRight className="w-4 h-4 rotate-180" /> Voltar para Lista
           </button>
         </div>

         {/* Hero Block */}
         <div className="glass-panel rounded-2xl overflow-hidden p-6 md:p-8 flex items-start gap-6 relative border border-primary/20">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-[80px] rounded-full pointer-events-none -translate-y-1/2 translate-x-1/2"></div>
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
              <Hash className="w-8 h-8 text-primary" />
            </div>
            <div className="flex-1 relative z-10">
               <div className="flex flex-wrap items-center gap-3 mb-3">
                 <span className={`text-[10px] uppercase font-black px-2.5 py-1 rounded-md tracking-widest border ${t.dominioObj.color}`}>{t.dominioObj.label}</span>
                 {t.prioridade && <span className={`text-[10px] uppercase font-black px-2 py-1 rounded-md tracking-widest border ${t.prioridade === 'alta' ? 'border-error/30 text-error bg-error/10' : t.prioridade === 'media' ? 'border-tertiary/30 text-tertiary bg-tertiary/10' : 'border-outline/20 text-on-surface-variant bg-surface-container'}`}>{t.prioridade} Prioridade</span>}
                 {t.dificuldade && <span className={`text-[10px] uppercase font-black px-2 py-1 rounded-md tracking-widest border border-outline/20 bg-surface-container text-on-surface-variant`}>Dificuldade {t.dificuldade}</span>}
                 {t.peso && <span className={`text-[10px] uppercase font-black px-2 py-1 rounded-md tracking-widest border border-outline/20 bg-surface-container text-on-surface-variant`}>Peso {t.peso}</span>}
               </div>
               <h2 className="text-3xl font-black text-on-surface mb-2">{t.nome}</h2>
               {t.descricao && <p className="text-on-surface-variant mb-4">{t.descricao}</p>}
               
               <div className="flex items-center flex-wrap gap-3 mt-6">
                 <div className={cn("inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black uppercase border", t.stats.performance.bg, t.stats.performance.color, t.stats.performance.border)}>
                    <TrendingUp className="w-4 h-4" />
                    {t.stats.performance.level === 'sem_dados' ? 'Sem dados' : `Desempenho ${t.stats.performance.label}`}
                 </div>
                 <button onClick={() => toast.info('Utilize o menu global para iniciar sessão, aprimoramento em breve.')} className="text-xs font-bold bg-secondary text-on-secondary px-4 py-2 rounded-lg hover:bg-secondary/90 transition-colors flex items-center gap-2 shadow-lg shadow-secondary/20">
                   <Play className="w-3.5 h-3.5" /> Iniciar Estudo
                 </button>
                  <button onClick={() => openNovaAulaNoTopico?.(t.id)} className="text-xs font-bold bg-primary text-on-primary px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2 shadow-lg shadow-primary/20">
                    <Plus className="w-3.5 h-3.5" /> Nova Aula
                  </button>
                  <button onClick={() => {
                    openEditTopico(t);
                  }} className="text-xs font-bold bg-surface-container text-on-surface px-4 py-2 rounded-lg hover:bg-surface-variant transition-colors flex items-center gap-2 border border-outline/20">
                    <Edit2 className="w-3.5 h-3.5" /> Editar
                  </button>
                  <button onClick={() => openDeleteTopico(t)} className="text-xs font-bold bg-surface-container text-error px-4 py-2 rounded-lg hover:bg-error/10 hover:border-error/30 transition-colors flex items-center gap-2 border border-outline/20">
                    <Trash2 className="w-3.5 h-3.5" /> Excluir
                  </button>
                </div>
            </div>
         </div>

         {/* Metrics Grid */}
         <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="glass-panel p-5 rounded-2xl flex flex-col items-center justify-center text-center">
               <BookOpen className="w-6 h-6 text-primary mb-2 opacity-80" />
               <p className="text-2xl font-black text-on-surface leading-none mb-1">{t.stats.aulas}</p>
               <p className="text-[10px] uppercase font-bold tracking-widest text-on-surface-variant">Aulas</p>
            </div>
            <div className="glass-panel p-5 rounded-2xl flex flex-col items-center justify-center text-center">
               <Activity className="w-6 h-6 text-secondary mb-2 opacity-80" />
               <p className="text-2xl font-black text-on-surface leading-none mb-1">{t.stats.sessoes}</p>
               <p className="text-[10px] uppercase font-bold tracking-widest text-on-surface-variant">Sessões</p>
            </div>
            <div className="glass-panel p-5 rounded-2xl flex flex-col items-center justify-center text-center">
               <TrendingUp className="w-6 h-6 text-tertiary mb-2 opacity-80" />
               <p className="text-2xl font-black text-on-surface leading-none mb-1">{t.stats.revisoes}</p>
               <p className="text-[10px] uppercase font-bold tracking-widest text-on-surface-variant">Revisões</p>
            </div>
            <div className="glass-panel p-5 rounded-2xl flex flex-col items-center justify-center text-center">
               <Clock className="w-6 h-6 text-success mb-2 opacity-80" />
               <p className="text-2xl font-black text-on-surface leading-none mb-1">{t.stats.horasFormatadas}h</p>
               <p className="text-[10px] uppercase font-bold tracking-widest text-on-surface-variant">Estudadas</p>
            </div>
         </div>

         {/* Anotações Pessoais Módulo */}
         <div className="glass-panel rounded-2xl p-6 relative group">
            <div className="flex justify-between items-center mb-4">
               <h3 className="text-sm font-bold uppercase tracking-widest text-secondary flex items-center gap-2">
                 <FileText className="w-4 h-4" /> Anotações Pessoais
               </h3>
               {t.observacoes && !editAnotacaoMode && !confirmDeleteAnotacao && (
                   <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                      <button type="button" onClick={startEditAnotacao} className="p-1.5 text-on-surface-variant hover:text-primary transition-colors bg-surface-container-highest hover:bg-surface-variant rounded-lg">
                         <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button type="button" onClick={() => setConfirmDeleteAnotacao(true)} className="p-1.5 text-on-surface-variant hover:text-error transition-colors bg-surface-container-highest hover:bg-error/10 rounded-lg">
                         <Trash2 className="w-3.5 h-3.5" />
                      </button>
                   </div>
               )}
            </div>

            {confirmDeleteAnotacao && (
              <div className="mb-4 p-4 rounded-xl border border-error/20 bg-error/10">
                <p className="text-sm font-bold text-error mb-3">
                  Deseja realmente apagar esta anotação?
                </p>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteAnotacao(false)}
                    className="px-4 py-2 text-xs font-bold bg-surface-container hover:bg-surface-variant rounded-xl transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteAnotacao}
                    className="px-4 py-2 text-xs font-bold bg-error text-white hover:bg-error/90 rounded-xl transition-colors"
                  >
                    Confirmar exclusão
                  </button>
                </div>
              </div>
            )}

            {editAnotacaoMode ? (
               <div className="space-y-3">
                  <textarea
                    value={anotacaoForm}
                    onChange={(e) => setAnotacaoForm(e.target.value)}
                    className="w-full bg-surface-container border border-outline/20 rounded-xl p-4 text-sm min-h-[120px] focus:outline-none focus:border-secondary transition-colors"
                    placeholder="Suas anotações, macetes e dúvidas..."
                  />
                  <div className="flex justify-end gap-2">
                     <button onClick={() => setEditAnotacaoMode(false)} className="px-4 py-2 text-xs font-bold bg-surface-container hover:bg-surface-variant rounded-xl transition-colors">Cancelar</button>
                     <button onClick={handleSaveAnotacao} className="px-4 py-2 text-xs font-bold bg-secondary text-on-secondary hover:bg-secondary/90 rounded-xl shadow-lg shadow-secondary/20 transition-colors">Salvar Anotação</button>
                  </div>
               </div>
            ) : (
               t.observacoes ? (
                   <div className="bg-surface-container-lowest rounded-xl p-4 border border-outline/10 text-sm text-on-surface-variant whitespace-pre-wrap leading-relaxed">
                      {t.observacoes}
                   </div>
               ) : (
                   <div className="text-center py-6 border border-dashed border-outline/20 rounded-xl">
                      <p className="text-xs text-on-surface-variant mb-2">Você ainda não tem anotações para este tópico.</p>
                      <button onClick={startEditAnotacao} className="text-xs font-bold text-secondary hover:underline">
                         Adicionar Anotação
                      </button>
                   </div>
               )
            )}
         </div>

         {/* Grids Content */}
         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Aulas Block */}
            <div className="glass-panel rounded-2xl p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold uppercase tracking-widest text-primary flex items-center gap-2"><BookOpen className="w-4 h-4"/> Aulas</h3>
                <div className="flex gap-2">
                  <button 
                    onClick={() => openVincularAula?.(selectedTopico)}
                    className="p-1.5 text-xs font-bold text-secondary flex items-center gap-1 hover:bg-secondary/10 rounded-lg transition-colors border border-secondary/20"
                  >
                    <Hash className="w-3 h-3" /> Vincular Existente
                  </button>
                  <button 
                    onClick={() => openNovaAulaNoTopico?.(selectedTopico.id)}
                    className="p-1.5 text-xs font-bold text-primary flex items-center gap-1 hover:bg-primary/10 rounded-lg transition-colors border border-primary/20"
                  >
                    + Nova Aula
                  </button>
                </div>
              </div>
              <div className="space-y-3">
                {topicoAulas.length === 0 ? (
                  <p className="text-xs text-on-surface-variant italic">Nenhuma aula vinculada.</p>
                ) : topicoAulas.map(aula => (
                  <div key={aula.id} className="p-3 bg-surface-container rounded-xl border border-outline/10 flex items-center justify-between group hover:border-primary/30 transition-colors">
                    <div className="flex-1 cursor-pointer min-w-0" onClick={() => openDetalheAula(aula)}>
                      <p className="text-sm font-bold text-on-surface group-hover:text-primary transition-colors truncate">{aula.titulo}</p>
                      <p className="text-[10px] text-on-surface-variant uppercase font-medium">{(aula.data && !isNaN(parseValidDate(aula.data).getTime())) ? safeFormat(aula.data, 'dd MMM yyyy', {locale:ptBR}) : '?'} {aula.horario ? ` às ${aula.horario}` : ''} • {aula.status}</p>
                    </div>
                    <div className="shrink-0 ml-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                         onClick={() => onEditAula?.(aula)} 
                         className="p-1.5 text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded-md transition-colors"
                         title="Editar Aula"
                      >
                         <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button 
                         onClick={() => onDesvincularAula?.(aula)} 
                         className="p-1.5 text-on-surface-variant hover:text-error hover:bg-error/10 rounded-md transition-colors"
                         title="Desvincular do Tópico"
                      >
                         <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Materiais Block */}
            <div className="glass-panel rounded-2xl p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold uppercase tracking-widest text-tertiary flex items-center gap-2"><FileText className="w-4 h-4"/> Materiais</h3>
                <button 
                  onClick={() => onAddMaterial?.(selectedTopico.id)}
                  className="p-1 px-2 text-[10px] font-black uppercase tracking-widest bg-tertiary/10 text-tertiary hover:bg-tertiary/20 rounded-lg transition-colors border border-tertiary/20"
                >
                  + Adicionar
                </button>
              </div>
              <div className="space-y-3">
                {topicoMateriais.length === 0 ? (
                  <div className="text-center py-8 border border-dashed border-outline/20 rounded-xl">
                    <p className="text-[10px] text-on-surface-variant italic">Nenhum material vinculado.</p>
                  </div>
                ) : topicoMateriais.map(m => (
                  <div key={m.id} className="p-3 bg-surface-container rounded-xl border border-outline/10 flex items-center justify-between group hover:border-tertiary/30 transition-colors">
                    <div className="flex-1 cursor-pointer min-w-0" onClick={() => openMaterial(m, toast.error)}>
                      <p className="text-sm font-bold text-on-surface group-hover:text-tertiary transition-colors truncate">{m.titulo}</p>
                      <p className="text-[10px] text-on-surface-variant uppercase font-medium">{m.tipo} {m.aula_id ? '• Vinculado à Aula' : ''}</p>
                    </div>
                    <div className="shrink-0 ml-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => onEditMaterial?.(m)} 
                        className="p-1.5 text-on-surface-variant hover:text-tertiary hover:bg-tertiary/10 rounded-md transition-colors"
                        title="Editar Material"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => onDeleteMaterial?.(m.id)} 
                        className="p-1.5 text-on-surface-variant hover:text-error hover:bg-error/10 rounded-md transition-colors"
                        title="Excluir Material"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Revisões Block */}
            <div className="glass-panel rounded-2xl p-6">
              <h3 className="text-sm font-bold uppercase tracking-widest text-secondary flex items-center gap-2 mb-4"><CalendarIcon className="w-4 h-4"/> Histórico de Revisões</h3>
              <div className="space-y-3">
                {topicoRevisoes.length === 0 ? (
                  <p className="text-xs text-on-surface-variant italic">Nenhuma revisão vinculada.</p>
                ) : topicoRevisoes.map(rev => (
                  <div key={rev.id} className="p-3 bg-surface-container rounded-xl border border-outline/10 flex flex-col gap-1">
                    <p className="text-sm font-bold text-on-surface">{rev.nome || 'Sessão de Revisão'}</p>
                    <p className="text-[10px] text-on-surface-variant uppercase font-medium">Agendada para: {(rev.data_revisao && !isNaN(parseValidDate(rev.data_revisao).getTime())) ? safeFormat(rev.data_revisao, 'dd MMM yyyy', {locale:ptBR}) : 'Data Indefinida'} • {rev.concluida ? 'Concluída' : 'Pendente'}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Sessões Block */}
            <div className="glass-panel rounded-2xl p-6">
              <h3 className="text-sm font-bold uppercase tracking-widest text-primary flex items-center gap-2 mb-4"><Activity className="w-4 h-4"/> Sessões de Estudo</h3>
              <div className="space-y-3">
                {topicoSessoes.length === 0 ? (
                  <p className="text-xs text-on-surface-variant italic">Nenhuma sessão de estudo vinculada.</p>
                ) : topicoSessoes.slice(0, 5).map(sessao => (
                  <div key={sessao.id} className="p-3 bg-surface-container rounded-xl border border-outline/10 flex flex-col gap-1">
                    <div className="flex justify-between items-center">
                       <p className="text-sm font-bold text-on-surface">Sessão {sessao.tipo === 'pomodoro' ? 'Pomodoro' : 'Manual'}</p>
                       <span className="text-[10px] text-on-surface-variant font-medium">{sessao.tempo_estudado_hhmmss || formatDuration((sessao.tempo_estudado_minutos || 0) * 60)}</span>
                    </div>
                    {(() => {
                      const sPerf = getPerformanceClass(sessao.acertos, sessao.total_questoes);
                      return (
                        <div className="flex items-center justify-between mt-1">
                          <p className="text-[10px] text-on-surface-variant uppercase font-medium">
                            {(sessao.created_at && !isNaN(parseValidDate(sessao.created_at).getTime())) ? safeFormat(sessao.created_at, 'dd MMM yyyy', {locale:ptBR}) : ''} • {sessao.acertos || 0}/{sessao.total_questoes || 0} acertos
                          </p>
                          {sPerf.level !== 'sem_dados' && (
                            <span className={cn("text-[8px] font-black uppercase px-1.5 py-0.5 rounded border", sPerf.bg, sPerf.color, sPerf.border)}>
                              {sPerf.label}
                            </span>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                ))}
              </div>
            </div>

         </div>

      </div>
    );
  }

  // LISTA GERAL DE TÓPICOS
  return (
    <div className="space-y-6 animate-in fade-in" onClick={() => setOpenMenuId(null)}>
      <div className="glass-panel rounded-2xl overflow-hidden flex flex-col h-fit relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[100px] rounded-full pointer-events-none"></div>

        <div className="p-6 border-b border-outline flex flex-col md:flex-row md:justify-between md:items-center bg-surface-container-low/50 gap-4 relative z-10">
          <div>
            <h3 className="text-lg font-bold flex items-center gap-2"><Hash className="w-5 h-5 text-primary" /> Tópicos Programáticos</h3>
            <p className="text-xs text-on-surface-variant mt-1">Gerencie a estrutura da matéria e acompanhe seu domínio ao longo do tempo.</p>
          </div>
          <button onClick={openNovoTopico} className="text-sm font-bold bg-primary text-on-primary px-5 py-2.5 rounded-xl hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 whitespace-nowrap">
            + Novo Tópico
          </button>
        </div>

        {/* Filters */}
        <div className="p-4 border-b border-outline/50 bg-surface-container-lowest/50 flex flex-col md:flex-row gap-3 relative z-10">
           <div className="relative flex-1">
             <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
             <input 
               type="text" 
               placeholder="Buscar tópico..." 
               value={busca}
               onChange={e => setBusca(e.target.value)}
               className="w-full bg-surface-container border border-outline rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors"
             />
           </div>
           <div className="flex gap-3">
             <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)} className="bg-surface-container border border-outline rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors">
               <option value="">Status (Todos)</option>
               <option value="nao_vi">Não vi</option>
               <option value="estudando">Estudando</option>
               <option value="revisao_inicial">Revisão Inicial</option>
               <option value="dominado">Dominado</option>
             </select>
             <select value={filtroPrioridade} onChange={(e) => setFiltroPrioridade(e.target.value)} className="bg-surface-container border border-outline rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors">
               <option value="">Prioridade (Todas)</option>
               <option value="alta">Alta</option>
               <option value="media">Média</option>
               <option value="baixa">Baixa</option>
             </select>
           </div>
        </div>

        <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-4 bg-surface-container-lowest relative z-10">
          {topicosComMetricas.length === 0 ? (
            <div className="col-span-full py-16 text-center">
              <Hash className="w-12 h-12 text-on-surface-variant/30 mx-auto mb-3" />
              <p className="text-sm text-on-surface-variant font-medium">Nenhum tópico encontrado.</p>
              <p className="text-xs text-on-surface-variant opacity-70 mt-1">Crie tópicos para dividir o estudo desta matéria.</p>
            </div>
          ) : topicosComMetricas.map(topico => (
            <div 
              key={topico.id} 
              onClick={() => { setSelectedTopico(topico); setEditAnotacaoMode(false); setConfirmDeleteAnotacao(false); }}
              className="bg-surface-container-highest border border-outline/20 rounded-2xl p-5 hover:bg-surface-variant hover:border-primary/30 transition-all cursor-pointer group hover:shadow-xl hover:-translate-y-1 relative"
            >
              
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                   <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${topico.dominioObj.color.replace('bg-','bg-opacity-20 ').replace('border-','border-opacity-30 ')}`}>
                     <Hash className={`w-4 h-4 ${topico.dominioObj.color.split(' ')[0]}`} />
                   </div>
                   <div>
                     <h4 className="font-bold text-sm text-on-surface group-hover:text-primary transition-colors">{topico.nome}</h4>
                   </div>
                </div>

                <div className="relative">
                  <button 
                    onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === topico.id ? null : topico.id); }}
                    className="p-1.5 text-on-surface-variant hover:text-on-surface hover:bg-surface-variant rounded-md transition-colors"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                  
                  {openMenuId === topico.id && (
                    <div className="absolute right-0 mt-1 w-40 bg-surface-container-highest rounded-xl shadow-xl border border-outline/20 py-1 z-50 overflow-hidden" onClick={e => e.stopPropagation()}>
                      <button onClick={() => { setOpenMenuId(null); setSelectedTopico(topico); setEditAnotacaoMode(false); setConfirmDeleteAnotacao(false); }} className="w-full text-left px-4 py-2.5 text-xs font-bold text-on-surface hover:bg-surface-variant transition-colors flex items-center gap-2">
                        <BookOpen className="w-3.5 h-3.5" /> Abrir Detalhes
                      </button>
                      <button onClick={() => { setOpenMenuId(null); openEditTopico(topico); }} className="w-full text-left px-4 py-2.5 text-xs font-bold text-on-surface hover:bg-surface-variant transition-colors flex items-center gap-2">
                        <Edit2 className="w-3.5 h-3.5" /> Editar
                      </button>
                      <div className="w-full h-px bg-outline/20 my-1"></div>
                      <button onClick={() => { setOpenMenuId(null); openDeleteTopico(topico); }} className="w-full text-left px-4 py-2.5 text-xs font-bold text-error hover:bg-error/10 transition-colors flex items-center gap-2">
                        <Trash2 className="w-3.5 h-3.5" /> Excluir
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                 <span className={cn("text-[9px] uppercase font-black px-2 py-0.5 rounded tracking-widest border", topico.dominioObj.color)}>{topico.dominioObj.label}</span>
                 {topico.prioridade && <span className={`text-[9px] uppercase font-black px-2 py-0.5 rounded tracking-widest border ${topico.prioridade === 'alta' ? 'border-error/30 text-error bg-error/10' : topico.prioridade === 'media' ? 'border-tertiary/30 text-tertiary bg-tertiary/10' : 'border-outline/20 text-on-surface-variant bg-surface-container'}`}>{topico.prioridade} Prior</span>}
                 {topico.stats.performance.level !== 'sem_dados' && (
                   <span className={cn("text-[9px] uppercase font-black px-2 py-0.5 rounded tracking-widest border", topico.stats.performance.bg, topico.stats.performance.color, topico.stats.performance.border)}>
                     {topico.stats.performance.label}
                   </span>
                 )}
              </div>

              <div className="mb-4">
                 {topico.observacoes ? (
                     <div className="bg-surface-container/50 rounded-xl p-3 border border-outline/10">
                         <p className="text-xs text-on-surface-variant line-clamp-2 leading-relaxed">
                            <FileText className="w-3 h-3 inline-block mr-1 opacity-70" />
                            {topico.observacoes}
                         </p>
                     </div>
                 ) : (
                     <p className="text-[10px] text-on-surface-variant italic opacity-70">Sem anotações pessoais</p>
                 )}
              </div>

              <div className="grid grid-cols-4 gap-2 pt-4 border-t border-outline/20">
                <div className="text-center">
                  <p className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider mb-0.5">Aulas</p>
                  <p className="text-xs font-black text-on-surface">{topico.stats.aulas}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider mb-0.5">Sessões</p>
                  <p className="text-xs font-black text-on-surface">{topico.stats.sessoes}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider mb-0.5">Revisões</p>
                  <p className="text-xs font-black text-on-surface">{topico.stats.revisoes}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider mb-0.5">Horas</p>
                  <p className="text-xs font-black text-success">{topico.stats.horasFormatadas}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
