import { useState, useEffect, useMemo } from 'react';
import { Header } from '@/components/Header';
import { History as HistoryIcon, Search, Clock, Target, Calendar, Edit2, Trash2, Filter, ChevronDown, Eye, ArrowUpDown, X, Book, FileText } from 'lucide-react';
import { useSessionModal } from '@/contexts/SessionModalContext';
import { apiClient } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { format, isWithinInterval, startOfDay, endOfDay, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useConfirm } from '@/contexts/ConfirmContext';
import { toast } from '@/lib/toast';
import { cn, formatDuration } from '@/lib/utils';
import { SessionDetailModal } from '@/components/SessionDetailModal';
import { getPerformanceClass } from '@/lib/performanceUtils';
import { cascadeDeleteService } from '@/services/cascadeDeleteService';
import { ModalNovoMaterial } from '@/components/materias/ModalNovoMaterial';
import { SectionErrorBoundary } from '@/components/ErrorBoundary';

type SortOption = 'recente' | 'antiga' | 'maior_duracao' | 'menor_duracao';

export function Historico() {
  const { user } = useAuth();
  const { openModal } = useSessionModal();
  const { requestConfirm } = useConfirm();
  
  const [sessoes, setSessoes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  
  const [isMaterialModalOpen, setMaterialModalOpen] = useState(false);
  const [materialToEdit, setMaterialToEdit] = useState<any>(null);
  
  // Filters
  const [filtroMateria, setFiltroMateria] = useState('');
  const [filtroTopico, setFiltroTopico] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [filtroMaterial, setFiltroMaterial] = useState('todos');
  const [filtroDificuldade, setFiltroDificuldade] = useState('todos');
  const [filtroComQuestoes, setFiltroComQuestoes] = useState(false);
  const [filtroDataRange, setFiltroDataRange] = useState('todos'); // todos, 7d, 30d, personalizada
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  
  // Sorting
  const [sortBy, setSortBy] = useState<SortOption>('recente');
  
  // Maps
  const [materiasMap, setMateriasMap] = useState<Record<string, string>>({});
  const [topicosMap, setTopicosMap] = useState<Record<string, string>>({});
  const [materiasList, setMateriasList] = useState<any[]>([]);

  // Detail Modal
  const [selectedSessao, setSelectedSessao] = useState<any | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  useEffect(() => {
    if (!user) return;

    apiClient.get('/materias').then(({ data }) => {
      const map: Record<string, string> = {};
      const list: any[] = [];
      data.forEach((m: any) => {
        map[m.id] = m.nome;
        list.push({ id: m.id, nome: m.nome });
      });
      setMateriasMap(map);
      setMateriasList(list);
    }).catch(console.error);

    apiClient.get('/topicos').then(({ data }) => {
      const map: Record<string, string> = {};
      data.forEach((t: any) => map[t.id] = t.nome);
      setTopicosMap(map);
    }).catch(console.error);

    apiClient.get('/sessoes').then(({ data }) => {
      setSessoes(data);
      setLoading(false);
    }).catch((err) => {
      console.error(err);
      setLoading(false);
    });

  }, [user]);

  const handleDeleteSessao = async (sessao: any) => {
    requestConfirm({
      title: 'Excluir Sessão',
      message: 'Deseja realmente excluir esta sessão? Essa ação removerá o registro e atualizará os indicadores relacionados.',
      confirmText: 'Excluir sessão',
      isDanger: true,
      onConfirm: async () => {
        try {
          await apiClient.delete(`/sessoes/${sessao.id}`);
          toast.success("Sessão excluída com sucesso!");
          setIsDetailModalOpen(false);
          apiClient.get('/sessoes').then(({ data }) => setSessoes(data));
        } catch (error) {
          console.error("Erro ao excluir sessão:", error);
          toast.error("Erro ao excluir sessão.");
        }
      }
    });
  };

  const currentTopicos = useMemo(() => {
    if (!filtroMateria) return [];
    // Just find unique topics from sessions of the selected subject
    const topicIds = new Set(sessoes.filter(s => s.materia_id === filtroMateria).map(s => s.topico_id));
    return Array.from(topicIds)
      .filter(id => id && topicosMap[id])
      .map(id => ({ id, nome: topicosMap[id!] }));
  }, [filtroMateria, topicosMap, sessoes]);

  const filteredAndSortedItems = useMemo(() => {
    let result = sessoes.filter(s => {
      // Text Search
      const nomeMateria = (materiasMap[s.materia_id] || '').toLowerCase();
      const nomeTopico = (topicosMap[s.topico_id] || '').toLowerCase();
      const search = busca.toLowerCase();
      const matchesSearch = nomeMateria.includes(search) || nomeTopico.includes(search) || (s.notas || '').toLowerCase().includes(search);
      
      if (!matchesSearch) return false;

      // Materia/Topic Filter
      if (filtroMateria && s.materia_id !== filtroMateria) return false;
      if (filtroTopico && s.topico_id !== filtroTopico) return false;

      // Type Filter
      if (filtroTipo !== 'todos' && s.tipo !== filtroTipo) return false;

      // Material Filter
      const hasMaterial = (s.linked_material_ids && s.linked_material_ids.length > 0) || s.material_id;
      if (filtroMaterial === 'com_material' && !hasMaterial) return false;
      if (filtroMaterial === 'sem_material' && hasMaterial) return false;

      // Questions Filter
      if (filtroComQuestoes && !(s.total_questoes > 0)) return false;

      // Difficulty Filter
      if (filtroDificuldade !== 'todos' && s.dificuldade !== parseInt(filtroDificuldade)) return false;

      // Date Range Filter
      const sessionDate = s.data_registro 
        ? new Date(s.data_registro + 'T12:00:00') // Use noon to avoid timezone shift to previous day
        : (s.created_at ? (typeof s.created_at.toDate === 'function' ? s.created_at.toDate() : new Date(s.created_at)) : new Date());

      if (filtroDataRange === '7d') {
        const sevenDaysAgo = subDays(new Date(), 7);
        if (sessionDate < sevenDaysAgo) return false;
      } else if (filtroDataRange === '30d') {
        const thirtyDaysAgo = subDays(new Date(), 30);
        if (sessionDate < thirtyDaysAgo) return false;
      } else if (filtroDataRange === 'personalizada' && customStartDate && customEndDate) {
        const start = startOfDay(new Date(customStartDate + 'T00:00:00'));
        const end = endOfDay(new Date(customEndDate + 'T23:59:59'));
        if (!isWithinInterval(sessionDate, { start, end })) return false;
      }

      return true;
    });

    // Sorting
    return result.sort((a, b) => {
      if (sortBy === 'recente') {
        const da = a.created_at?.seconds || 0;
        const db_time = b.created_at?.seconds || 0;
        return db_time - da;
      }
      if (sortBy === 'antiga') {
        const da = a.created_at?.seconds || 0;
        const db_time = b.created_at?.seconds || 0;
        return da - db_time;
      }
      if (sortBy === 'maior_duracao') return (b.tempo_estudado_segundos || 0) - (a.tempo_estudado_segundos || 0);
      if (sortBy === 'menor_duracao') return (a.tempo_estudado_segundos || 0) - (b.tempo_estudado_segundos || 0);
      return 0;
    });
  }, [sessoes, busca, filtroMateria, filtroTopico, filtroTipo, filtroMaterial, filtroDificuldade, filtroComQuestoes, filtroDataRange, customStartDate, customEndDate, sortBy, materiasMap, topicosMap]);

  const openSessionDetail = (sessao: any) => {
    setSelectedSessao(sessao);
    setIsDetailModalOpen(true);
  };

  const handleEditSessao = (sessao: any) => {
    setIsDetailModalOpen(false);
    openModal({
      modo: 'edit',
      id: sessao.id,
      materiaId: sessao.materia_id,
      topicoId: sessao.topico_id,
      tempoHHMMSS: sessao.tempo_estudado_hhmmss,
      totalQuestoes: sessao.total_questoes,
      acertos: sessao.acertos,
      notas: sessao.notas,
      dificuldade: sessao.dificuldade,
      dataRegistroISO: sessao.data_registro || (sessao.created_at ? (typeof sessao.created_at.toDate === 'function' ? sessao.created_at.toDate().toISOString() : sessao.created_at) : new Date().toISOString()),
      origem: sessao.tipo
    });
  };

  return (
    <>
      <Header title="Histórico de Sessões" subtitle="Gestão centralizada de suas atividades de estudo." />

      <div className="p-8 max-w-7xl mx-auto w-full space-y-6">
        {/* Filters & Search Header */}
        <SectionErrorBoundary title="Filtros de busca" name="HistoricoFilters">
          <div className="glass-panel p-6 rounded-2xl border border-outline/20 space-y-6 animate-in slide-in-from-top-4 duration-500">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                <input 
                  type="text" 
                  placeholder="Buscar por matéria, tópico ou anotações..." 
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="w-full bg-surface-container-low rounded-xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all border border-outline/10"
                />
                {busca && (
                  <button 
                    onClick={() => setBusca('')}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-surface-container-high rounded-full transition-colors"
                  >
                    <X className="w-3 h-3 text-on-surface-variant" />
                  </button>
                )}
              </div>
              
              <div className="flex gap-2 shrink-0">
                 <div className="relative">
                    <select 
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as SortOption)}
                      className="appearance-none bg-surface-container-low border border-outline/10 text-on-surface text-xs font-bold rounded-xl pl-10 pr-10 py-3 focus:outline-none cursor-pointer"
                    >
                      <option value="recente">Mais Recentes</option>
                      <option value="antiga">Mais Antigas</option>
                      <option value="maior_duracao">Maior Duração</option>
                      <option value="menor_duracao">Menor Duração</option>
                    </select>
                    <ArrowUpDown className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-primary" />
                    <ChevronDown className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 text-outline pointer-events-none" />
                 </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {/* Subject Filter */}
              <div className="relative">
                <select 
                  value={filtroMateria}
                  onChange={(e) => { 
                    setFiltroMateria(e.target.value);
                    setFiltroTopico('');
                  }}
                  className="w-full appearance-none bg-surface-container-lowest border border-outline/10 text-xs font-medium rounded-lg px-4 py-2.5 pr-8 focus:outline-none focus:border-primary transition-colors cursor-pointer"
                >
                  <option value="">Todas as Matérias</option>
                  {materiasList.map(m => (
                    <option key={m.id} value={m.id}>{m.nome}</option>
                  ))}
                </select>
                <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-outline">
                  <Filter className="w-3 h-3" />
                </div>
              </div>

              {/* Topic Filter */}
              <div className="relative">
                <select 
                  value={filtroTopico}
                  onChange={(e) => setFiltroTopico(e.target.value)}
                  disabled={!filtroMateria}
                  className="w-full appearance-none bg-surface-container-lowest border border-outline/10 text-xs font-medium rounded-lg px-4 py-2.5 pr-8 focus:outline-none focus:border-primary transition-colors cursor-pointer disabled:opacity-50"
                >
                  <option value="">Todos os Tópicos</option>
                  {currentTopicos.map(t => (
                    <option key={t.id} value={t.id}>{t.nome}</option>
                  ))}
                </select>
                <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-outline">
                  <ChevronDown className="w-3 h-3" />
                </div>
              </div>

              {/* Tipo de Sessão */}
              <div className="relative">
                <select 
                  value={filtroTipo}
                  onChange={(e) => setFiltroTipo(e.target.value)}
                  className="w-full appearance-none bg-surface-container-lowest border border-outline/10 text-xs font-medium rounded-lg px-4 py-2.5 pr-8 focus:outline-none focus:border-primary transition-colors cursor-pointer"
                >
                  <option value="todos">Qualquer Tipo</option>
                  <option value="manual">Manual</option>
                  <option value="pomodoro">Pomodoro</option>
                </select>
                <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-outline">
                  <ChevronDown className="w-3 h-3" />
                </div>
              </div>

              {/* Material Filter */}
              <div className="relative">
                <select 
                  value={filtroMaterial}
                  onChange={(e) => setFiltroMaterial(e.target.value)}
                  className="w-full appearance-none bg-surface-container-lowest border border-outline/10 text-xs font-medium rounded-lg px-4 py-2.5 pr-8 focus:outline-none focus:border-primary transition-colors cursor-pointer"
                >
                  <option value="todos">Com ou Sem Material</option>
                  <option value="com_material">Com Material Vinculado</option>
                  <option value="sem_material">Sem Material</option>
                </select>
                <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-outline">
                  <ChevronDown className="w-3 h-3" />
                </div>
              </div>

              {/* Date Range Filter */}
              <div className="relative">
                <select 
                  value={filtroDataRange}
                  onChange={(e) => setFiltroDataRange(e.target.value)}
                  className="w-full appearance-none bg-surface-container-lowest border border-outline/10 text-xs font-medium rounded-lg px-4 py-2.5 pr-8 focus:outline-none focus:border-primary transition-colors cursor-pointer"
                >
                  <option value="todos">Qualquer Data</option>
                  <option value="7d">Últimos 7 dias</option>
                  <option value="30d">Últimos 30 dias</option>
                  <option value="personalizada">Personalizado</option>
                </select>
                <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-outline">
                  <Calendar className="w-3 h-3" />
                </div>
              </div>

              {/* Questions Toggle */}
              <button 
                onClick={() => setFiltroComQuestoes(!filtroComQuestoes)}
                className={cn(
                  "w-full px-4 py-2.5 rounded-lg border text-xs font-bold transition-all flex items-center justify-center gap-2",
                  filtroComQuestoes 
                    ? "bg-primary/20 border-primary text-primary" 
                    : "bg-surface-container-lowest border-outline/10 text-on-surface-variant hover:border-outline/30"
                )}
              >
                <Target className="w-3 h-3" />
                Com Questões
              </button>
            </div>

            {filtroDataRange === 'personalizada' && (
              <div className="flex items-center gap-3 animate-in fade-in slide-in-from-left-2">
                <div className="flex-1 space-y-1">
                  <label className="text-[10px] font-bold text-outline uppercase ml-1">Início</label>
                  <input 
                    type="date" 
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="w-full bg-surface-container-lowest border border-outline/20 rounded-lg px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary"
                  />
                </div>
                <div className="flex-1 space-y-1">
                  <label className="text-[10px] font-bold text-outline uppercase ml-1">Fim</label>
                  <input 
                    type="date" 
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="w-full bg-surface-container-lowest border border-outline/20 rounded-lg px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary"
                  />
                </div>
              </div>
            )}
          </div>
        </SectionErrorBoundary>

        {/* Results Info */}
        <div className="flex items-center justify-between px-2">
          <p className="text-xs font-medium text-on-surface-variant">
            Exibindo <span className="text-on-surface font-black">{filteredAndSortedItems.length}</span> sessões 
            {filtroMateria && <span> de <span className="text-primary">{materiasMap[filtroMateria]}</span></span>}
          </p>
          {(busca || filtroMateria || filtroTopico || filtroTipo !== 'todos' || filtroMaterial !== 'todos' || filtroDataRange !== 'todos' || filtroComQuestoes) && (
            <button 
              onClick={() => {
                setBusca('');
                setFiltroMateria('');
                setFiltroTopico('');
                setFiltroTipo('todos');
                setFiltroMaterial('todos');
                setFiltroDificuldade('todos');
                setFiltroComQuestoes(false);
                setFiltroDataRange('todos');
                setSortBy('recente');
              }}
              className="text-[10px] font-black uppercase text-error hover:bg-error/10 px-3 py-1.5 rounded-lg transition-colors border border-error/20"
            >
              Limpar Todos os Filtros
            </button>
          )}
        </div>

        <SectionErrorBoundary title="Listagem de atividades" name="HistoricoList" message="Ocorreu um erro ao carregar o histórico de atividades.">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 animate-pulse">
              <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mb-4"></div>
              <p className="text-on-surface-variant text-sm font-bold uppercase tracking-widest">Sincronizando Histórico...</p>
            </div>
          ) : filteredAndSortedItems.length === 0 ? (
            <div className="glass-panel p-20 text-center rounded-2xl animate-in zoom-in-95 duration-500">
               <div className="w-20 h-20 bg-surface-container-highest rounded-full flex items-center justify-center mx-auto mb-6">
                 <HistoryIcon className="w-10 h-10 text-outline-variant" />
               </div>
               <p className="font-black text-xl mb-2 text-on-surface">Nenhum registro encontrado</p>
               <p className="text-sm text-on-surface-variant max-w-sm mx-auto leading-relaxed">
                Tente ajustar seus filtros ou busca para encontrar a sessão desejada. 
                {sessoes.length === 0 && " Inicie um novo estudo para começar seu histórico."}
               </p>
               {sessoes.length === 0 && (
                 <button 
                  onClick={() => openModal()}
                  className="mt-8 px-6 py-3 bg-primary text-on-primary font-bold rounded-xl shadow-lg shadow-primary/20"
                 >
                   Registrar Primeira Sessão
                 </button>
               )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredAndSortedItems.map((sessao) => (
                <div 
                  key={sessao.id} 
                  onClick={() => openSessionDetail(sessao)}
                  className="glass-panel p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between hover:bg-surface-container-low transition-all border border-outline/10 hover:border-primary/30 group cursor-pointer active:scale-[0.99]"
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 shadow-lg",
                      sessao.origem_sessao === 'pomodoro' ? "bg-error/10 text-error shadow-error/5" : sessao.origem_sessao === 'cronometro_livre' ? "bg-primary/10 text-primary shadow-primary/5" : "bg-tertiary/10 text-tertiary shadow-tertiary/5"
                    )}>
                      {sessao.origem_sessao === 'pomodoro' ? <Clock className="w-6 h-6 border-2 border-current rounded-full p-1" /> : <HistoryIcon className="w-6 h-6" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={cn(
                          "text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded",
                           sessao.origem_sessao === 'pomodoro' ? "bg-error/20 text-error" : sessao.origem_sessao === 'cronometro_livre' ? "bg-primary/20 text-primary" : "bg-tertiary/20 text-tertiary"
                        )}>
                          {sessao.origem_sessao ? sessao.origem_sessao.replace(/_/g, ' ') : sessao.tipo?.replace(/_/g, ' ') || 'Manual'}
                        </span>
                        {(() => {
                          let linkedIds = sessao.linked_material_ids || [];
                          if (sessao.material_id && linkedIds.length === 0) linkedIds = [sessao.material_id];
                          if (linkedIds.length > 0) {
                            const hasPrimary = !!sessao.primary_material_id;
                            return (
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-tertiary/20 text-tertiary flex items-center gap-1">
                                  <Book className="w-2.5 h-2.5" />
                                  {hasPrimary ? 'Material Principal' : 'Material Vinculado'}
                                </span>
                                {linkedIds.length > 1 && (
                                  <span className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-surface-container-high text-on-surface-variant">
                                    +{linkedIds.length - 1} material(is)
                                  </span>
                                )}
                              </div>
                            );
                          }
                          if (sessao.output_destino === 'somente_sessao' || sessao.output_produzido) {
                            return (
                              <span className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-secondary/20 text-secondary flex items-center gap-1">
                                <FileText className="w-2.5 h-2.5" />
                                Output Interno
                              </span>
                            );
                          }
                          return null;
                        })()}
                        <h4 className="font-bold text-sm text-on-surface truncate block w-full mt-1">
                          {sessao.titulo || (sessao.topico_id ? topicosMap[sessao.topico_id] : (materiasMap[sessao.materia_id] || 'Estudo Geral'))}
                        </h4>
                      </div>
                      
                      <div className="text-xs text-on-surface-variant flex flex-wrap gap-x-3 gap-y-1.5 items-center">
                        {sessao.materia_id && (
                          <span className="flex items-center gap-1.5 px-2 py-0.5 bg-surface-container-highest rounded text-[10px] font-bold text-on-surface">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                            {materiasMap[sessao.materia_id]}
                          </span>
                        )}
                        
                        <span className="flex items-center gap-1 font-black text-primary">
                          <Clock className="w-3.5 h-3.5" /> 
                          {sessao.tempo_estudado_hhmmss || formatDuration((sessao.tempo_estudado_minutos || 0) * 60)}
                        </span>

                        {sessao.total_questoes > 0 && (
                          <>
                            <span className="flex items-center gap-1 font-bold text-tertiary whitespace-nowrap">
                              <Target className="w-3.5 h-3.5" /> 
                              {sessao.acertos}/{sessao.total_questoes}
                            </span>
                            {(() => {
                              const perf = getPerformanceClass(sessao.acertos, sessao.total_questoes);
                              return (
                                <span className={cn(
                                  "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-black uppercase border",
                                  perf.bg, perf.color, perf.border
                                )}>
                                  {perf.label}
                                </span>
                              );
                            })()}
                          </>
                        )}

                        {sessao.dificuldade && (
                           <div className="flex gap-0.5 ml-1 bg-surface-container-low px-1.5 py-1 rounded">
                              {[...Array(5)].map((_, i) => (
                                <div key={i} className={cn("w-1.5 h-1.5 rounded-full", i < sessao.dificuldade ? "bg-primary" : "bg-outline/20")} />
                              ))}
                           </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-6 mt-4 sm:mt-0 pt-4 sm:pt-0 border-t sm:border-t-0 border-outline/10">
                    <div className="text-right">
                      <span className="text-[10px] font-bold text-outline-variant block flex items-center gap-1 justify-end uppercase tracking-widest">
                        <Calendar className="w-3 h-3" /> 
                        {(() => {
                          if (sessao.data_registro) {
                            const [y, m, d] = sessao.data_registro.split('-');
                            return format(new Date(parseInt(y), parseInt(m)-1, parseInt(d)), "dd MMM", {locale:ptBR});
                          }
                          if (!sessao.created_at) return '?';
                          const date = typeof sessao.created_at.toDate === 'function' ? sessao.created_at.toDate() : new Date(sessao.created_at);
                          if (isNaN(date.getTime())) return '?';
                          return format(date, "dd MMM", {locale:ptBR});
                        })()}
                      </span>
                      <span className="text-[10px] text-outline font-medium">
                        {(() => {
                          if (!sessao.created_at) return '';
                          const date = typeof sessao.created_at.toDate === 'function' ? sessao.created_at.toDate() : new Date(sessao.created_at);
                          if (isNaN(date.getTime())) return '';
                          return format(date, "HH:mm");
                        })()}
                      </span>
                    </div>

                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <button 
                        onClick={() => openSessionDetail(sessao)}
                        className="p-2.5 bg-surface-container-highest hover:bg-primary/20 text-on-surface-variant hover:text-primary rounded-xl transition-all"
                        title="Ver Detalhes"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleEditSessao(sessao)}
                        className="p-2.5 bg-surface-container-highest hover:bg-primary/20 text-on-surface-variant hover:text-primary rounded-xl transition-all"
                        title="Editar Sessão"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDeleteSessao(sessao)}
                        className="p-2.5 bg-surface-container-highest hover:bg-error/20 text-on-surface-variant hover:text-error rounded-xl transition-all"
                        title="Excluir Sessão"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionErrorBoundary>
      </div>

      <SectionErrorBoundary title="Detalhes da Sessão" name="HistoricoDetail">
        <SessionDetailModal 
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          sessao={selectedSessao}
          materiaNome={selectedSessao ? materiasMap[selectedSessao.materia_id] : ''}
          topicoNome={selectedSessao ? (topicosMap[selectedSessao.topico_id] || 'Geral') : ''}
          onEdit={handleEditSessao}
          onDelete={handleDeleteSessao}
          onEditMaterial={(mat) => {
            setMaterialToEdit(mat);
            setMaterialModalOpen(true);
          }}
        />
      </SectionErrorBoundary>

      <ModalNovoMaterial
        isOpen={isMaterialModalOpen}
        onClose={() => {
          setMaterialModalOpen(false);
          setMaterialToEdit(null);
        }}
        materialToEdit={materialToEdit}
        materiaId={selectedSessao?.materia_id || ''}
        topicos={Object.keys(topicosMap).map(id => ({ id, nome: topicosMap[id] }))}
        aulas={[]}
      />
    </>
  );
}
