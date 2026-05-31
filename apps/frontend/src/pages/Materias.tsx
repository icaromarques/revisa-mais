import { Header } from '@/components/Header';
import { Plus, BookOpen, Clock, ChevronRight, X, Calendar as CalendarIcon, Edit2, Trash2, MoreVertical, Target, Zap, LayoutTemplate, MonitorPlay, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { calendarService } from '@/services/calendarService';
import { materiaService } from '@/services/materiaService';
import { availabilityService } from '@/services/availabilityService';
import { EventoAcademico } from '@/types/calendar';
import { CalendarEventModal } from '@/components/CalendarEventModal';
import { format } from 'date-fns';
import { toast } from '@/lib/toast';
import { getMateriaColor, formatPeriodoLabel, normalizeColorId } from '@/lib/colors';
import { ColorTokenPicker } from '@/components/ColorTokenPicker';
import { DateInputMasked } from '@/components/ui/DateInputMasked';
import { calculateSubjectPriority } from '@/utils/priorityCalculator';
import { apiClient } from '@/lib/api';

export { calculateSubjectPriority };

/**
 * Safelist for tailwind dynamic classes:
 * text-primary text-blue-500 text-pink-500 text-success text-tertiary text-error
 * ring-primary ring-blue-500 ring-pink-500 ring-success ring-tertiary ring-error
 * bg-primary bg-blue-500 bg-pink-500 bg-success bg-tertiary bg-error
 */

export function Materias() {
  const { user } = useAuth();
  const [materias, setMaterias] = useState<any[]>([]);
  const [events, setEvents] = useState<EventoAcademico[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMateria, setEditingMateria] = useState<any>(null);
  
  // Modal States
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [professor, setProfessor] = useState('');
  const [cor, setCor] = useState('bg-primary');
  const [prioridade, setPrioridade] = useState('Média'); 
  const [metaSemanalHoras, setMetaSemanalHoras] = useState<number | ''>('');
  const [pesoImportancia, setPesoImportancia] = useState('Médio');
  const [status, setStatus] = useState('em_andamento');
  const [periodoInicio, setPeriodoInicio] = useState('');
  const [periodoFim, setPeriodoFim] = useState('');
  const [tipoPeriodo, setTipoPeriodo] = useState('semestre');
  const [numeroPeriodo, setNumeroPeriodo] = useState<number | ''>('');
  const [limiteFaltasPercentual, setLimiteFaltasPercentual] = useState<number | ''>('');
  const [revisaoAutomaticaAtiva, setRevisaoAutomaticaAtiva] = useState(true);
  const [exibirNoCalendario, setExibirNoCalendario] = useState(true);
  const [criarEstruturaInicial, setCriarEstruturaInicial] = useState(true);
  const [iaHabilitada, setIaHabilitada] = useState(false);

  // Faltas retroativas states
  const [retroFaltasOption, setRetroFaltasOption] = useState<'none' | 'quantidade' | 'detalhado'>('none');
  const [retroFaltasQuant, setRetroFaltasQuant] = useState<number | ''>('');
  const [retroFaltasLista, setRetroFaltasLista] = useState<{data: string, quantidade: number, tipo_falta: string, observacoes: string, status_reposicao: string}[]>([]);
  
  // Grade fields
  const [criarGrade, setCriarGrade] = useState(false);
  const [gradeDias, setGradeDias] = useState<number[]>([1]);
  const [gradeHoraInicio, setGradeHoraInicio] = useState('08:00');
  const [gradeHoraFim, setGradeHoraFim] = useState('10:00');
  const [gradeCor, setGradeCor] = useState('');
  const [gradeRecorrente, setGradeRecorrente] = useState(true);
  const [gradeDataEspecifica, setGradeDataEspecifica] = useState('');
  const [gradeLocal, setGradeLocal] = useState('');

  const [nomeError, setNomeError] = useState('');
  
  const [loading, setLoading] = useState(false);
  
  // Delete confirm modal
  const [deleteData, setDeleteData] = useState<{ id: string, name: string, count: number, counts?: Record<string, number> } | null>(null);
  const [deleting, setDeleting] = useState(false);
  
  // Menu visibility state
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Event Modal specific state
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [eventModalInitial, setEventModalInitial] = useState<any>({});
  const [ocorrencias, setOcorrencias] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    
    let isMounted = true;
    const fetchAll = async () => {
       try {
         // Transform Promise.all into individual calls or Promise.allSettled to not fail entirely
         let mats = [];
         let evts = [];
         let ocs = [];
         
         try {
           const resMats = await apiClient.get('/materias');
           mats = resMats.data;
         } catch(e) { console.warn("Failed to fetch materias", e); }

         try {
           evts = await calendarService.fetchUserEvents(user.id);
         } catch(e) { console.warn("Failed to fetch events", e); }
         
         try {
           const resOcs = await apiClient.get('/ocorrencias');
           ocs = resOcs.data;
         } catch(e) { console.warn("Failed to fetch ocorrencias", e); }
         
         if (isMounted) {
           setMaterias(mats);
           setEvents(evts.filter((e: any) => e && e.data_inicio && !isNaN(new Date(e.data_inicio).getTime())));
           setOcorrencias(ocs);
         }
       } catch (error) {
         console.error("Erro ao carregar dados", error);
       }
    };
    
    fetchAll();
    
    // Provisoriamente polling ou sem realtime até socket
    const interval = setInterval(fetchAll, 60000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [user]);

  const openEditModal = (materia: any) => {
    setEditingMateria(materia);
    setNome(materia.nome);
    setDescricao(materia.descricao || '');
    setProfessor(materia.professor || '');
    setCor(materia.cor || 'bg-primary');
    setPrioridade(materia.prioridade || 'Média');
    setMetaSemanalHoras(materia.meta_semanal_horas || '');
    setPesoImportancia(materia.peso_importancia || 'Médio');
    setStatus(materia.status || 'em_andamento');
    setPeriodoInicio(materia.periodo_inicio || '');
    setPeriodoFim(materia.periodo_fim || '');
    setTipoPeriodo(materia.tipo_periodo || 'semestre');
    setNumeroPeriodo(materia.numero_periodo || '');
    setLimiteFaltasPercentual(materia.limite_faltas_percentual || '');
    setRevisaoAutomaticaAtiva(materia.revisao_automatica_ativa ?? true);
    setExibirNoCalendario(materia.exibir_no_calendario ?? true);
    setCriarEstruturaInicial(false); // only on create
    setIaHabilitada(materia.ia_habilitada ?? false);
    setNomeError('');
    setIsModalOpen(true);
    setOpenMenuId(null);
  };

  const openNewModal = () => {
    setEditingMateria(null);
    setNome('');
    setDescricao('');
    setProfessor('');
    setCor('bg-primary');
    setPrioridade('Média');
    setMetaSemanalHoras('');
    setPesoImportancia('Médio');
    setStatus('em_andamento');
    setPeriodoInicio('');
    setPeriodoFim('');
    setTipoPeriodo('semestre');
    setNumeroPeriodo('');
    setLimiteFaltasPercentual('');
    setRevisaoAutomaticaAtiva(true);
    setExibirNoCalendario(true);
    setCriarEstruturaInicial(true);
    setIaHabilitada(false);
    
    setCriarGrade(false);
    setGradeDias([1]);
    setGradeHoraInicio('08:00');
    setGradeHoraFim('10:00');
    setGradeCor('');
    setGradeRecorrente(true);
    setGradeDataEspecifica('');

    setNomeError('');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    if (!nome.trim()) {
      setNomeError('O nome da matéria é obrigatório.');
      return;
    }
    
    const exists = materias.some(m => m.nome.trim().toLowerCase() === nome.trim().toLowerCase() && m.id !== editingMateria?.id);
    if (exists) {
       setNomeError("Você já tem uma matéria cadastrada com este nome.");
       return;
    }
    
    setNomeError('');
    setLoading(true);
    try {
      const payload = {
          nome: nome.trim(),
          descricao: descricao.trim(),
          professor: professor.trim(),
          cor: normalizeColorId(cor),
          prioridade,
          meta_semanal_horas: metaSemanalHoras === '' ? null : Number(metaSemanalHoras),
          peso_importancia: pesoImportancia,
          status,
          periodo_inicio: periodoInicio || null,
          periodo_fim: periodoFim || null,
          tipo_periodo: tipoPeriodo,
          numero_periodo: numeroPeriodo === '' ? null : Number(numeroPeriodo),
          limite_faltas_percentual: limiteFaltasPercentual === '' ? null : Number(limiteFaltasPercentual),
          revisao_automatica_ativa: revisaoAutomaticaAtiva,
          exibir_no_calendario: exibirNoCalendario,
          ia_habilitada: iaHabilitada
      };
      
      let materiaId = editingMateria?.id;
      
      if (editingMateria) {
        await apiClient.put(`/materias/${editingMateria.id}`, payload);
        
        // Sync downward (isso deve idealmente ser feito pelo backend via trigger/controller ao salvar matéria)
        await availabilityService.syncMateriaGradePeriodo(editingMateria.id, user.id, {
          periodo_inicio: payload.periodo_inicio,
          periodo_fim: payload.periodo_fim,
          tipo_periodo: payload.tipo_periodo,
          limite_faltas_percentual: payload.limite_faltas_percentual
        });

        toast.success("Matéria atualizada com sucesso");
      } else {
        const { data: novaMateria } = await apiClient.post('/materias', payload);
        materiaId = novaMateria.id;
        
        if (retroFaltasOption === 'quantidade' && typeof retroFaltasQuant === 'number' && retroFaltasQuant > 0) {
           await apiClient.post('/ocorrencias', {
               materia_id: materiaId,
               data: payload.periodo_inicio || new Date().toISOString(),
               status: 'falta',
               origem: 'retroativa',
               quantidade_ocorrencias: retroFaltasQuant,
               tipo_falta: 'comum',
               status_reposicao: 'pendente',
               observacoes: 'Faltas retroativas informadas no cadastro da matéria'
           });
        } else if (retroFaltasOption === 'detalhado' && retroFaltasLista.length > 0) {
           for (const falta of retroFaltasLista) {
              await apiClient.post('/ocorrencias', {
                  materia_id: materiaId,
                  data: falta.data || new Date().toISOString(),
                  status: 'falta',
                  origem: 'retroativa',
                  quantidade_ocorrencias: falta.quantidade || 1,
                  tipo_falta: falta.tipo_falta,
                  status_reposicao: falta.status_reposicao,
                  observacoes: falta.observacoes || 'Falta retroativa detalhada'
              });
           }
        }
        
        if (criarGrade) {
           const blockPayload: any = {
              titulo: payload.nome,
              materia_id: materiaId,
              professor: payload.professor,
              hora_inicio: gradeHoraInicio,
              hora_fim: gradeHoraFim,
              local: gradeLocal || null,
              cor: gradeCor || null, // null means inherit
              recorrente: gradeRecorrente,
              dias_semana: gradeRecorrente ? gradeDias : [],
              data_especifica: gradeRecorrente ? null : gradeDataEspecifica,
              ativo: true,
              data_inicio_vigencia: payload.periodo_inicio || null,
              data_fim_vigencia: payload.periodo_fim || null,
              periodo_inicio: payload.periodo_inicio || null,
              periodo_fim: payload.periodo_fim || null,
              tipo_periodo: payload.tipo_periodo || null,
              numero_periodo: payload.numero_periodo || null,
              limite_faltas_percentual: payload.limite_faltas_percentual || null
           };
           // clear undefined
           Object.keys(blockPayload).forEach(key => blockPayload[key] === undefined && delete blockPayload[key]);
           await availabilityService.createGradeFaculdade(blockPayload);
           toast.success("Matéria e horário criados com sucesso!");
        } else {
           toast.success("Matéria criada com sucesso");
        }
      }
      setIsModalOpen(false);
      setEditingMateria(null);
      // Forçar refresh das materias
      const res = await apiClient.get('/materias');
      setMaterias(res.data);
    } catch (error) {
      console.error("Erro ao salvar matéria:", error);
      toast.error("Erro ao salvar matéria");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRequest = async (materia: any) => {
    setOpenMenuId(null);
    if (!user) return;
    try {
      const { totalCount, counts } = await materiaService.checkDependencies(materia.id, user.id);
      setDeleteData({ id: materia.id, name: materia.nome, count: totalCount, counts });
    } catch (e) {
      console.error("Erro ao checar dependências", e);
      toast.error("Erro ao preparar exclusão.");
    }
  };

  const confirmDelete = async () => {
    if (!user || !deleteData) return;
    setDeleting(true);
    try {
      await materiaService.deleteMateriaCascade(deleteData.id, user.id);
      toast.success("Matéria excluída com sucesso");
      setDeleteData(null);
      // Atualizar interface
      const res = await apiClient.get('/materias');
      setMaterias(res.data);
    } catch (error) {
      console.error("Erro ao excluir matéria:", error);
      toast.error("Erro ao excluir matéria");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Header title="Matérias" subtitle="Gerencie seu currículo e acompanhe seu progresso por disciplina.">
        <button 
          onClick={openNewModal}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-full text-sm font-bold hover:bg-primary-fixed transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nova Matéria
        </button>
      </Header>

      <div className="p-8 max-w-7xl mx-auto w-full" onClick={() => setOpenMenuId(null)}>
        {materias.length === 0 ? (
          <div className="text-center py-20">
            <BookOpen className="w-16 h-16 text-outline mx-auto mb-4" />
            <h3 className="text-xl font-bold text-on-surface mb-2">Nenhuma matéria cadastrada</h3>
            <p className="text-on-surface-variant mb-6">Comece adicionando sua primeira disciplina.</p>
            <button 
              onClick={openNewModal}
              className="px-6 py-3 bg-primary text-on-primary rounded-full font-bold hover:bg-primary-fixed transition-colors"
            >
              Cadastrar Matéria
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {materias.map((materia) => (
              <div key={materia.id} className="glass-panel rounded-2xl p-6 hover:bg-surface-container-low transition-all group relative">
                <Link to={`/materias/${materia.id}`} className="block h-full absolute inset-0 z-0"></Link>
                
                <div className="flex justify-between items-start mb-4 relative z-10">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center`} style={{ backgroundColor: getMateriaColor(materia.cor).bg }}>
                    <BookOpen className={`w-5 h-5`} style={{ color: getMateriaColor(materia.cor).color || getMateriaColor(materia.cor).corDefault }} />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded bg-surface-container-highest ${materia.prioridade === 'Alta' ? 'text-error' : 'text-on-surface-variant'}`}>
                      Prioridade {materia.prioridade}
                    </span>
                    <div className="relative">
                      <button 
                        onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === materia.id ? null : materia.id); }}
                        className="p-1 text-on-surface-variant hover:text-on-surface hover:bg-surface-variant rounded-md transition-colors"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                      
                      {openMenuId === materia.id && (
                        <div className="absolute right-0 mt-1 w-36 bg-surface-container-highest rounded-xl shadow-lg border border-outline/20 py-1 z-50 overflow-hidden" onClick={e => e.stopPropagation()}>
                          <button 
                            onClick={() => openEditModal(materia)}
                            className="w-full text-left px-4 py-2 text-sm text-on-surface hover:bg-surface-variant transition-colors flex items-center gap-2"
                          >
                            <Edit2 className="w-4 h-4" /> Editar
                          </button>
                          <button 
                            onClick={() => handleDeleteRequest(materia)}
                            className="w-full text-left px-4 py-2 text-sm text-error hover:bg-error/10 transition-colors flex items-center gap-2"
                          >
                            <Trash2 className="w-4 h-4" /> Excluir
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="mb-6 relative z-10 pointer-events-none">
                  <h3 className="text-lg font-bold text-on-surface group-hover:text-primary transition-colors">{materia.nome}</h3>
                  <div className="flex flex-col gap-1.5 mt-2">
                    {materia.tipo_periodo && (
                      <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
                        {formatPeriodoLabel(materia.tipo_periodo, materia.numero_periodo, materia.periodo_inicio, materia.periodo_fim)}
                      </p>
                    )}
                    {materia.professor && (
                      <p className="text-xs text-on-surface-variant font-medium">
                        Prof. {materia.professor}
                      </p>
                    )}
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border border-current opacity-80
                        ${materia.status === 'aprovada' ? 'text-success' : 
                          materia.status === 'reprovada' ? 'text-error' : 
                          materia.status === 'concluida' ? 'text-tertiary' : 
                          materia.status === 'trancada' ? 'text-on-surface-variant' :
                          'text-primary'}
                      `}>
                        {materia.status === 'em_andamento' ? 'Em andamento' :
                         materia.status === 'concluida' ? 'Concluída' :
                         materia.status === 'aprovada' ? 'Aprovada' :
                         materia.status === 'reprovada' ? 'Reprovada' :
                         materia.status === 'trancada' ? 'Trancada' : 'Em andamento'}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4 relative z-10 pointer-events-none">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-on-surface-variant">Progresso</span>
                      <span className="font-bold">{materia.progresso || 0}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-surface-container-highest rounded-full overflow-hidden">
                      <div className="h-full" style={{ width: `${materia.progresso || 0}%`, backgroundColor: getMateriaColor(materia.cor).color || getMateriaColor(materia.cor).corDefault }}></div>
                    </div>
                  </div>
                  
                  {/* Próximo Evento / Avisos */}
                  {(() => {
                    const materiaEvents = events.filter(e => e.materia_id === materia.id && !e.concluido && new Date(e.data_inicio) >= new Date());
                    materiaEvents.sort((a,b) => new Date(a.data_inicio).getTime() - new Date(b.data_inicio).getTime());
                    const nextEvent = materiaEvents[0];
                    return nextEvent ? (
                      <div className="pt-2">
                        <div className="flex items-center gap-2 text-[10px] text-on-surface-variant mb-1 group-hover:text-on-surface transition-colors">
                          <CalendarIcon className="w-3 h-3" />
                          <span className="font-bold uppercase tracking-widest text-primary overflow-hidden text-ellipsis whitespace-nowrap">{nextEvent.titulo}</span>
                        </div>
                        <div className="text-xs font-bold text-on-surface-variant">
                          {format(new Date(nextEvent.data_inicio), 'dd/MM/yyyy HH:mm')}
                        </div>
                      </div>
                    ) : null;
                  })()}

                  <div className="flex items-center justify-between pt-4 border-t border-outline">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 text-[10px] text-on-surface-variant">
                           <Clock className="w-3 h-3" />
                           <span>Revisão: <strong className="text-on-surface">Pendente</strong></span>
                        </div>
                        {(() => {
                          const faltasDaMateria = ocorrencias.filter(o => 
                            o.materia_id === materia.id && 
                            (o.status === 'falta' || o.status === 'conteudo_recuperado') && 
                            o.tipo_falta !== 'com_atestado'
                          );
                          const totalFaltasObj = faltasDaMateria.reduce((acc, obj) => acc + (obj.quantidade_ocorrencias || 1), 0);
                          return totalFaltasObj > 0 ? (
                            <div className="flex items-center gap-1.5 text-[10px] text-error">
                               <AlertCircle className="w-3 h-3" />
                               <span className="font-bold">{totalFaltasObj} {totalFaltasObj === 1 ? 'falta' : 'faltas'}</span>
                            </div>
                          ) : null;
                        })()}
                      </div>
                      
                      {/* Priority Hint */}
                      {(() => {
                          const p = calculateSubjectPriority({ materia, events, ocorrencias });
                          const labelMap = { baixa: 'Baixa', media: 'Média', alta: 'Alta', critica: 'Crítica' };
                          const nivelLabel = labelMap[p.level];
                          return (
                            <div className="flex items-center gap-1.5 text-[9px] text-on-surface-variant/80 font-medium" title={p.reasons.join(' | ')}>
                               <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: p.level === 'critica' || p.level === 'alta' ? 'var(--color-error)' : p.level === 'media' ? 'var(--color-tertiary)' : 'var(--color-success)' }} />
                               Prioridade: {nivelLabel} 
                            </div>
                          );
                      })()}
                    </div>
                    <ChevronRight className="w-4 h-4 text-outline group-hover:text-primary transition-colors" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 lg:p-8 bg-background/80 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-5xl glass-panel rounded-[2rem] shadow-2xl flex flex-col my-auto max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
            
            <div className="shrink-0 flex items-center justify-between p-6 lg:px-8 border-b border-outline bg-surface-container-lowest/50 rounded-t-[2rem]">
              <div>
                <h2 className="text-2xl font-bold text-on-surface">{editingMateria ? 'Editar matéria' : 'Nova matéria'}</h2>
                <p className="text-sm text-on-surface-variant mt-1">Crie uma matéria para organizar aulas, revisões, provas, trabalhos e sessões de estudo.</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-surface-variant rounded-full transition-colors self-start">
                <X className="w-6 h-6 text-outline hover:text-on-surface transition-colors" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 flex flex-col lg:flex-row">
              
              <div className="flex-1 p-6 lg:p-8 space-y-12">
                
                {/* BLOCO 2: INFORMAÇÕES BÁSICAS */}
                <section className="space-y-6">
                  <div className="flex items-center gap-2 mb-4 border-b border-outline/50 pb-2">
                    <LayoutTemplate className="w-4 h-4 text-primary" />
                    <h3 className="text-sm font-bold text-on-surface uppercase tracking-wider">Informações Básicas</h3>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Nome da matéria <span className="text-error">*</span></label>
                    <input 
                      autoFocus
                      type="text" 
                      value={nome}
                      onChange={(e) => {
                        setNome(e.target.value);
                        if (nomeError) setNomeError('');
                      }}
                      className={`w-full bg-surface-container-lowest border ${nomeError ? 'border-error' : 'border-outline'} rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all`}
                      placeholder="Ex.: Direito Constitucional"
                    />
                    {nomeError && <p className="text-xs text-error mt-2 flex items-center gap-1"><X className="w-3 h-3"/> {nomeError}</p>}
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider">Descrição (Opcional)</label>
                      <span className="text-[10px] text-on-surface-variant">{descricao.length}/120</span>
                    </div>
                    <textarea 
                      value={descricao}
                      onChange={(e) => setDescricao(e.target.value.substring(0, 120))}
                      className="w-full bg-surface-container-lowest border border-outline rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all resize-none"
                      placeholder="Breve descrição da matéria..."
                      rows={2}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Professor / Docente</label>
                      <input 
                        type="text" 
                        value={professor}
                        onChange={(e) => setProfessor(e.target.value)}
                        className="w-full bg-surface-container-lowest border border-outline rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                        placeholder="Nome do professor"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-3">Situação Acadêmica</label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { id: 'em_andamento', label: 'Em andamento' },
                        { id: 'concluida', label: 'Concluída' },
                        { id: 'aprovada', label: 'Aprovada' },
                        { id: 'reprovada', label: 'Reprovada' },
                        { id: 'trancada', label: 'Trancada' },
                      ].map(s => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => setStatus(s.id)}
                          className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-full border transition-all ${status === s.id ? (s.id === 'aprovada' ? 'bg-success/20 border-success text-success' : s.id === 'reprovada' ? 'bg-error/20 border-error text-error' : s.id === 'concluida' ? 'bg-tertiary/20 border-tertiary text-tertiary' : s.id === 'trancada' ? 'bg-on-surface-variant/20 border-outline text-on-surface-variant' : 'bg-primary/20 border-primary text-primary') : 'bg-surface-container-lowest border-outline text-on-surface-variant hover:bg-surface-container-highest'}`}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </section>
                
                {/* BLOCO EXTRA: PERÍODO E FALTAS */}
                <section className="space-y-6">
                  <div className="flex items-center gap-2 mb-4 border-b border-outline/50 pb-2">
                    <CalendarIcon className="w-4 h-4 text-primary" />
                    <h3 className="text-sm font-bold text-on-surface uppercase tracking-wider">Período Letivo e Faltas (Opcional)</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Início do Período</label>
                      <DateInputMasked 
                        value={periodoInicio}
                        onValueChange={setPeriodoInicio}
                        className="w-full bg-surface-container-lowest border border-outline rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-[inherit]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Fim do Período</label>
                      <DateInputMasked 
                        value={periodoFim}
                        onValueChange={setPeriodoFim}
                        className="w-full bg-surface-container-lowest border border-outline rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-[inherit]"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Tipo de Período</label>
                      <select
                        value={tipoPeriodo}
                        onChange={(e) => setTipoPeriodo(e.target.value)}
                        className="w-full bg-surface-container-lowest border border-outline rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-[inherit]"
                      >
                        <option value="bimestre">Bimestre</option>
                        <option value="trimestre">Trimestre</option>
                        <option value="semestre">Semestre</option>
                        <option value="modulo">Módulo</option>
                        <option value="ano">Ano</option>
                        <option value="outro">Outro (Livre)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Número do Período</label>
                      <input 
                        type="number" 
                        value={numeroPeriodo}
                        onChange={(e) => setNumeroPeriodo(e.target.value ? Number(e.target.value) : '')}
                        className="w-full bg-surface-container-lowest border border-outline rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-[inherit]"
                        placeholder="Ex.: 2"
                        min="1"
                        max="20"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Limite de Faltas (%)</label>
                      <input 
                        type="number" 
                        min="0"
                        max="100"
                        value={limiteFaltasPercentual}
                        onChange={(e) => setLimiteFaltasPercentual(e.target.value ? Number(e.target.value) : '')}
                        className="w-full bg-surface-container-lowest border border-outline rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                        placeholder="Ex.: 25"
                      />
                    </div>
                  </div>

                  {!editingMateria && periodoInicio && new Date(periodoInicio) < new Date() && (
                    <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 mt-4 space-y-4">
                      <h4 className="text-sm font-bold text-primary flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        Faltas Anteriores
                      </h4>
                      <p className="text-xs text-on-surface-variant">Você já teve faltas nesta matéria antes de começar a usar o Revisa+?</p>
                      
                      <div className="flex flex-col sm:flex-row gap-3">
                        <label className="flex items-center gap-2 text-sm cursor-pointer border border-outline rounded-xl p-3 flex-1">
                          <input type="radio" value="none" checked={retroFaltasOption === 'none'} onChange={() => setRetroFaltasOption('none')} className="text-primary focus:ring-primary" />
                          <span>Não tive faltas</span>
                        </label>
                        <label className="flex items-center gap-2 text-sm cursor-pointer border border-outline rounded-xl p-3 flex-1">
                          <input type="radio" value="quantidade" checked={retroFaltasOption === 'quantidade'} onChange={() => setRetroFaltasOption('quantidade')} className="text-primary focus:ring-primary" />
                          <span>Informar quantidade</span>
                        </label>
                        <label className="flex items-center gap-2 text-sm cursor-pointer border border-outline rounded-xl p-3 flex-1">
                          <input type="radio" value="detalhado" checked={retroFaltasOption === 'detalhado'} onChange={() => setRetroFaltasOption('detalhado')} className="text-primary focus:ring-primary" />
                          <span>Registrar por data</span>
                        </label>
                      </div>
                      
                      {retroFaltasOption === 'quantidade' && (
                        <div>
                          <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Quantidade de faltas cadastradas</label>
                          <input 
                            type="number" 
                            min="1"
                            value={retroFaltasQuant}
                            onChange={(e) => setRetroFaltasQuant(e.target.value ? Number(e.target.value) : '')}
                            className="w-full sm:w-1/2 bg-surface-container-lowest border border-outline rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-[inherit]"
                            placeholder="Ex.: 3"
                          />
                        </div>
                      )}

                      {retroFaltasOption === 'detalhado' && (
                        <div className="space-y-4">
                           {retroFaltasLista.map((falta, idx) => (
                             <div key={idx} className="flex flex-col gap-3 p-3 border border-outline rounded-xl bg-surface-container-lowest">
                               <div className="flex gap-2">
                                  <div className="flex-1">
                                    <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Data</label>
                                    <input type="date" value={falta.data} onChange={e => {
                                      const n = [...retroFaltasLista]; n[idx].data = e.target.value; setRetroFaltasLista(n);
                                    }} className="w-full bg-background border border-outline/20 rounded-xl px-3 py-2 text-[10px] font-[inherit]" />
                                  </div>
                                  <div className="w-20">
                                    <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Qtd</label>
                                    <input type="number" min="1" value={falta.quantidade} onChange={e => {
                                      const n = [...retroFaltasLista]; n[idx].quantidade = Number(e.target.value); setRetroFaltasLista(n);
                                    }} className="w-full bg-background border border-outline/20 rounded-xl px-3 py-2 text-[10px] font-[inherit]" />
                                  </div>
                               </div>
                               <div className="flex gap-2">
                                  <div className="flex-1">
                                    <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Tipo de Falta</label>
                                    <select value={falta.tipo_falta} onChange={e => {
                                      const n = [...retroFaltasLista]; n[idx].tipo_falta = e.target.value; setRetroFaltasLista(n);
                                    }} className="w-full bg-background border border-outline/20 rounded-xl px-3 py-2 text-[10px] font-[inherit]">
                                       <option value="comum">Comum</option>
                                       <option value="com_atestado">Com Atestado / Justificada</option>
                                    </select>
                                  </div>
                                  <div className="flex-1">
                                    <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Status Reposição</label>
                                    <select value={falta.status_reposicao} onChange={e => {
                                      const n = [...retroFaltasLista]; n[idx].status_reposicao = e.target.value; setRetroFaltasLista(n);
                                    }} className="w-full bg-background border border-outline/20 rounded-xl px-3 py-2 text-[10px] font-[inherit]">
                                       <option value="nao_precisa">Não repor</option>
                                       <option value="pendente">Repor conteúdo</option>
                                       <option value="recuperado">Já reposto</option>
                                    </select>
                                  </div>
                               </div>
                               <div>
                                  <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">Observações / Conteúdo Perdido</label>
                                  <input type="text" value={falta.observacoes} onChange={e => {
                                    const n = [...retroFaltasLista]; n[idx].observacoes = e.target.value; setRetroFaltasLista(n);
                                  }} className="w-full bg-background border border-outline/20 rounded-xl px-3 py-2 text-[10px] font-[inherit]" placeholder="Ex.: Atraso por trânsito | Matéria capítulo 3" />
                               </div>
                               <div className="flex justify-end mt-1">
                                  <button type="button" onClick={() => setRetroFaltasLista(retroFaltasLista.filter((_, i) => i !== idx))} className="text-[10px] text-error font-medium flex items-center gap-1 hover:underline">
                                    <Trash2 className="w-3 h-3" /> Remover
                                  </button>
                               </div>
                             </div>
                           ))}
                           <button type="button" onClick={() => setRetroFaltasLista([...retroFaltasLista, { data: periodoInicio || new Date().toISOString().substring(0,10), quantidade: 1, tipo_falta: 'comum', status_reposicao: 'nao_precisa', observacoes: '' }])} className="w-full py-2 bg-background border border-dashed border-primary/50 text-primary rounded-xl text-xs font-bold hover:bg-primary/5 transition-colors flex items-center justify-center gap-2">
                             <Plus className="w-3 h-3" /> Adicionar registro de falta
                           </button>
                        </div>
                      )}
                    </div>
                  )}
                </section>

                {/* BLOCO 3: CONFIGURAÇÃO DA MATÉRIA */}
                <section className="space-y-6">
                  <div className="flex items-center gap-2 mb-4 border-b border-outline/50 pb-2">
                    <Target className="w-4 h-4 text-primary" />
                    <h3 className="text-sm font-bold text-on-surface uppercase tracking-wider">Configuração da Matéria</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-3">Prioridade</label>
                      <div className="flex flex-wrap gap-2">
                        {['Baixa', 'Média', 'Alta'].map(p => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setPrioridade(p)}
                            className={`flex-1 py-2 text-sm font-bold rounded-lg border transition-all ${prioridade === p ? (p === 'Alta' ? 'bg-error/20 border-error text-error shadow-[0_0_15px_rgba(239,68,68,0.2)]' : p === 'Média' ? 'bg-tertiary/20 border-tertiary text-tertiary shadow-[0_0_15px_rgba(245,158,11,0.2)]' : 'bg-success/20 border-success text-success shadow-[0_0_15px_rgba(16,185,129,0.2)]') : 'bg-surface-container-lowest border-outline text-on-surface-variant hover:border-outline-variant hover:bg-surface-container-highest'}`}
                          >
                            {p}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                       <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-3">Peso / Importância</label>
                       <div className="flex flex-wrap gap-2">
                        {['Baixo', 'Médio', 'Alto'].map(p => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setPesoImportancia(p)}
                            className={`flex-1 py-2 text-sm font-bold rounded-lg border transition-all ${pesoImportancia === p ? 'bg-secondary/20 border-secondary text-on-surface shadow-[0_0_15px_rgba(255,255,255,0.05)]' : 'bg-surface-container-lowest border-outline text-on-surface-variant hover:border-outline-variant hover:bg-surface-container-highest'}`}
                          >
                            {p}
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-3">Cor da Matéria</label>
                      <div className="bg-surface-container-lowest border border-outline rounded-xl p-3">
                        <ColorTokenPicker 
                          value={cor} 
                          onChange={setCor} 
                          allowEmpty={false}
                        />
                      </div>
                    </div>
                    
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Meta semanal (horas)</label>
                      <div className="relative md:w-1/2">
                        <input 
                          type="number" 
                          min="0"
                          step="0.5"
                          value={metaSemanalHoras}
                          onChange={(e) => setMetaSemanalHoras(e.target.value ? Number(e.target.value) : '')}
                          className="w-full bg-surface-container-lowest border border-outline rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all pl-11"
                          placeholder="Ex.: 4"
                        />
                        <Clock className="w-4 h-4 text-on-surface-variant absolute left-4 top-1/2 -translate-y-1/2" />
                      </div>
                    </div>
                  </div>
                </section>

                {/* BLOCO GRADE HORÁRIA */}
                {!editingMateria && (
                  <section className="space-y-6">
                    <div className="flex items-center gap-2 mb-4 border-b border-outline/50 pb-2">
                      <CalendarIcon className="w-4 h-4 text-primary" />
                      <h3 className="text-sm font-bold text-on-surface uppercase tracking-wider">Grade Horária (Opcional)</h3>
                    </div>

                    <div className="p-4 bg-surface-container border border-outline/20 rounded-2xl flex flex-col gap-4">
                       <label className="flex items-center justify-between cursor-pointer">
                          <span className="text-sm font-bold text-on-surface">Criar horário na grade agora?</span>
                          <input type="checkbox" checked={criarGrade} onChange={e => setCriarGrade(e.target.checked)} className="w-4 h-4 text-primary rounded border-outline/50" />
                       </label>

                       {criarGrade && (
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-outline/10 animate-in fade-in">
                            <div className="md:col-span-2">
                               <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-2">Dias da semana</label>
                               <div className="flex gap-2">
                                  {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((letra, idx) => (
                                     <button key={idx} type="button" onClick={() => setGradeDias(prev => prev.includes(idx) ? prev.filter(d => d !== idx) : [...prev, idx])}
                                       className={`w-8 h-8 rounded-full text-xs font-bold transition-all ${gradeDias.includes(idx) ? 'bg-primary text-on-primary' : 'bg-surface hover:bg-surface-variant text-on-surface-variant'}`}
                                     >{letra}</button>
                                  ))}
                               </div>
                            </div>
                            <div>
                               <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-2">Início</label>
                               <input type="time" value={gradeHoraInicio} onChange={e => setGradeHoraInicio(e.target.value)} className="w-full bg-background border border-outline/20 rounded-xl px-3 py-2 text-sm" />
                            </div>
                            <div>
                               <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-2">Fim</label>
                               <input type="time" value={gradeHoraFim} onChange={e => setGradeHoraFim(e.target.value)} className="w-full bg-background border border-outline/20 rounded-xl px-3 py-2 text-sm" />
                            </div>
                            <div>
                               <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-2">Local/Sala</label>
                               <input type="text" value={gradeLocal} onChange={e => setGradeLocal(e.target.value)} placeholder="Opcional" className="w-full bg-background border border-outline/20 rounded-xl px-3 py-2 text-sm" />
                            </div>
                            <div>
                               <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-2 flex items-center justify-between">
                                  Repetição
                                  <input type="checkbox" checked={gradeRecorrente} onChange={e => setGradeRecorrente(e.target.checked)} className="w-3 h-3 text-primary rounded border-outline/50" />
                               </label>
                               {!gradeRecorrente ? (
                                  <input type="date" value={gradeDataEspecifica} onChange={e => setGradeDataEspecifica(e.target.value)} className="w-full bg-background border border-outline/20 rounded-xl px-3 py-2 text-sm" />
                               ) : (
                                  <div className="w-full bg-surface-container py-2 px-3 rounded-xl text-xs text-on-surface-variant border border-transparent">Semanalmente</div>
                               )}
                            </div>
                            <div className="md:col-span-2">
                               <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-2">Cor específica do bloco (opcional)</label>
                               <div className="bg-background border border-outline/20 rounded-xl p-3">
                                  <ColorTokenPicker 
                                    value={gradeCor} 
                                    onChange={setGradeCor} 
                                    allowEmpty={true}
                                    emptyLabel="Herdar da matéria"
                                  />
                               </div>
                            </div>
                         </div>
                       )}
                    </div>
                  </section>
                )}

                {/* BLOCO 4: AUTOMAÇÃO E INTEGRAÇÃO */}
                <section className="space-y-6">
                  <div className="flex items-center gap-2 mb-4 border-b border-outline/50 pb-2">
                    <Zap className="w-4 h-4 text-primary" />
                    <h3 className="text-sm font-bold text-on-surface uppercase tracking-wider">Automação e Integração</h3>
                  </div>

                  <div className="space-y-4">
                     <div className="flex items-center justify-between p-4 bg-surface-container-lowest rounded-xl border border-outline">
                        <div className="pr-4">
                          <p className="text-sm font-bold text-on-surface">Ativar revisões automáticas</p>
                          <p className="text-xs text-on-surface-variant mt-1">Lógica de repetição espaçada (1, 3, 7, 15, 30 dias)</p>
                        </div>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={revisaoAutomaticaAtiva}
                          onClick={() => setRevisaoAutomaticaAtiva(!revisaoAutomaticaAtiva)}
                          className={`w-11 h-6 shrink-0 flex items-center rounded-full p-1 transition-colors ${revisaoAutomaticaAtiva ? 'bg-primary' : 'bg-surface-variant'}`}
                        >
                          <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${revisaoAutomaticaAtiva ? 'translate-x-5' : 'translate-x-0'}`} />
                        </button>
                     </div>
                     
                     <div className="flex items-center justify-between p-4 bg-surface-container-lowest rounded-xl border border-outline">
                        <div className="pr-4">
                          <p className="text-sm font-bold text-on-surface">Exibir no Calendário</p>
                          <p className="text-xs text-on-surface-variant mt-1">Vincular aulas e eventos desta matéria</p>
                        </div>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={exibirNoCalendario}
                          onClick={() => setExibirNoCalendario(!exibirNoCalendario)}
                          className={`w-11 h-6 shrink-0 flex items-center rounded-full p-1 transition-colors ${exibirNoCalendario ? 'bg-primary' : 'bg-surface-variant'}`}
                        >
                          <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${exibirNoCalendario ? 'translate-x-5' : 'translate-x-0'}`} />
                        </button>
                     </div>
                     
                     {!editingMateria && (
                       <div className="flex items-center justify-between p-4 bg-surface-container-lowest rounded-xl border border-outline">
                          <div className="pr-4">
                            <p className="text-sm font-bold text-on-surface">Criar estrutura inicial</p>
                            <p className="text-xs text-on-surface-variant mt-1">Preparar coleções de aulas, tópicos e notas</p>
                          </div>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={criarEstruturaInicial}
                            onClick={() => setCriarEstruturaInicial(!criarEstruturaInicial)}
                            className={`w-11 h-6 shrink-0 flex items-center rounded-full p-1 transition-colors ${criarEstruturaInicial ? 'bg-primary' : 'bg-surface-variant'}`}
                          >
                             <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${criarEstruturaInicial ? 'translate-x-5' : 'translate-x-0'}`} />
                          </button>
                       </div>
                     )}

                     <div className="flex items-center justify-between p-4 bg-primary/5 hover:bg-primary/10 rounded-xl border border-primary/20 transition-colors">
                        <div className="pr-4">
                          <p className="text-sm font-bold text-primary flex items-center gap-1"><Zap className="w-3 h-3"/> IA Tools</p>
                          <p className="text-xs text-on-surface-variant mt-1">Permitir geração de resumos e questões com IA</p>
                        </div>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={iaHabilitada}
                          onClick={() => setIaHabilitada(!iaHabilitada)}
                          className={`w-11 h-6 shrink-0 flex items-center rounded-full p-1 transition-colors ${iaHabilitada ? 'bg-primary' : 'bg-primary/20 border-primary/30 border'}`}
                        >
                          <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${iaHabilitada ? 'translate-x-5' : 'translate-x-0'}`} />
                        </button>
                     </div>
                  </div>
                </section>
                
              </div>
              
              {/* RIGHT PREVIEW */}
              <div className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-outline bg-surface-container-lowest/30 p-6 lg:p-8 flex flex-col gap-4">
                <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2 flex items-center gap-2"><MonitorPlay className="w-4 h-4" /> Preview da Matéria</h3>
                
                <div className="glass-panel rounded-2xl p-6 transition-all border border-outline/30 shadow-xl relative overflow-hidden group">
                  
                  <div className="flex justify-between items-start mb-4 relative z-10">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: getMateriaColor(cor).bg }}>
                      <BookOpen className="w-5 h-5" style={{ color: getMateriaColor(cor).color || getMateriaColor(cor).corDefault }} />
                    </div>
                    <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded bg-surface-container-highest ${prioridade === 'Alta' ? 'text-error' : 'text-on-surface-variant'}`}>
                      Prioridade {prioridade}
                    </span>
                  </div>
                  
                  <h3 className="text-lg font-bold text-on-surface mb-1 relative z-10">{nome.trim() || 'Nova matéria'}</h3>
                  <div className="mb-4 relative z-10">
                    <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border border-current opacity-80
                      ${status === 'aprovada' ? 'text-success' : 
                        status === 'reprovada' ? 'text-error' : 
                        status === 'concluida' ? 'text-tertiary' : 
                        status === 'trancada' ? 'text-on-surface-variant' :
                        'text-primary'}
                    `}>
                      {status === 'em_andamento' ? 'Em andamento' :
                       status === 'concluida' ? 'Concluída' :
                       status === 'aprovada' ? 'Aprovada' :
                       status === 'reprovada' ? 'Reprovada' :
                       status === 'trancada' ? 'Trancada' : 'Em andamento'}
                    </span>
                  </div>
                  
                  {tipoPeriodo && (
                    <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-2 relative z-10">
                       {formatPeriodoLabel(tipoPeriodo, numeroPeriodo, periodoInicio, periodoFim) || 'Período não definido'}
                    </p>
                  )}
                  
                  <p className="text-xs text-on-surface-variant mb-6 line-clamp-2 min-h-[32px] relative z-10">{descricao || 'Adicione uma descrição para visualizar aqui.'}</p>
                  
                  <div className="space-y-4 relative z-10">
                    <div>
                      <div className="flex justify-between text-[10px] mb-1">
                        <span className="text-on-surface-variant uppercase font-bold tracking-wider">Progresso</span>
                        <span className="font-bold">0%</span>
                      </div>
                      <div className="h-1.5 w-full bg-surface-container-highest rounded-full overflow-hidden">
                        <div className="h-full" style={{ width: '0%', backgroundColor: getMateriaColor(cor).color || getMateriaColor(cor).corDefault }}></div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between pt-4 border-t border-outline">
                      <div className="flex items-center gap-2 text-[10px] text-on-surface-variant">
                        <Clock className="w-3 h-3" />
                        <span>Meta: {metaSemanalHoras ? <strong className="text-on-surface">{metaSemanalHoras}h/sem</strong> : 'Não definida'}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-2">
                      <div className="flex items-center gap-2 text-[10px] text-on-surface-variant">
                        <CalendarIcon className="w-3 h-3" />
                        <span>Próx. evento: <strong className="text-on-surface">Nenhum</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* Prioridade Inteligente */}
                  <div className="mt-6 pt-4 border-t border-outline/30 relative z-10 flex flex-col gap-2">
                     <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Prioridade Inteligente</span>
                        <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: prioridade === 'Alta' ? 'var(--color-error)' : prioridade === 'Média' ? 'var(--color-tertiary)' : 'var(--color-success)' }} />
                     </div>
                     <p className="text-[10px] leading-relaxed text-on-surface-variant">
                       {prioridade === 'Alta' && (pesoImportancia === 'Alto' || pesoImportancia === 'Médio') ? (
                         <>Cálculo baseado em: <strong className="text-error">Alta Prioridade Manual</strong> e peso <strong>{pesoImportancia}</strong>. Foco imediato necessário para metas não atingidas.</>
                       ) : prioridade === 'Média' ? (
                         <>Cálculo baseado em: <strong className="text-tertiary">Prioridade Média</strong> e peso <strong>{pesoImportancia}</strong>. Manter frequência de estudos regular.</>
                       ) : (
                         <>Cálculo baseado em: <strong className="text-success">Prioridade Baixa</strong>. Apenas manutenção recomendada.</>
                       )}
                     </p>
                     <p className="text-[9px] text-on-surface-variant/70 italic mt-1">A prioridade real aumentará automaticamente conforme revisões atrasem ou provas se aproximem.</p>
                  </div>

                  {/* Decorative background glow based on selected color */}
                  <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none`} style={{ backgroundColor: getMateriaColor(cor).bg }} />
                </div>
              </div>
              
            </div>

            <div className="shrink-0 flex justify-end gap-3 p-6 lg:px-8 border-t border-outline bg-surface-container-lowest/50 rounded-b-[2rem]">
              <button 
                type="button" 
                onClick={() => setIsModalOpen(false)}
                className="px-6 py-2.5 text-sm font-bold text-on-surface-variant hover:text-on-surface hover:bg-surface-variant rounded-full transition-colors"
                disabled={loading}
              >
                Cancelar
              </button>
              <button 
                type="button" 
                onClick={handleSave}
                disabled={loading || !nome.trim()}
                className="px-8 py-2.5 bg-primary text-on-primary text-sm font-bold rounded-full hover:bg-primary-fixed hover:-translate-y-0.5 active:translate-y-0 shadow-lg shadow-primary/25 transition-all disabled:opacity-50 disabled:hover:translate-y-0 disabled:shadow-none"
              >
                {loading ? 'Salvando...' : (editingMateria ? 'Salvar Matéria' : 'Criar Matéria')}
              </button>
            </div>
            
          </div>
        </div>
      )}

      {deleteData && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-background/80 backdrop-blur-md">
          <div className="w-full max-w-sm glass-panel rounded-2xl shadow-2xl p-6">
            <h3 className="text-xl font-bold text-on-surface mb-2">Excluir Matéria?</h3>
            <p className="text-sm text-on-surface-variant mb-4">
              Tem certeza que deseja excluir <strong>{deleteData.name}</strong>?
            </p>
            
            {deleteData.count > 0 && (
              <div className="p-3 bg-error/10 border border-error/20 rounded-xl mb-4">
                <p className="text-sm text-error font-bold mb-1">Aviso de Exclusão em Cascata</p>
                <p className="text-xs text-error font-medium mb-2">Se você continuar, os seguintes {deleteData.count} itens associados serão impactados:</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  {deleteData.counts?.topicos > 0 && <span className="text-[10px] text-error/80">• {deleteData.counts.topicos} tópicos</span>}
                  {deleteData.counts?.aulas > 0 && <span className="text-[10px] text-error/80">• {deleteData.counts.aulas} aulas</span>}
                  {deleteData.counts?.ocorrencias > 0 && <span className="text-[10px] text-error/80">• {deleteData.counts.ocorrencias} faltas</span>}
                  {deleteData.counts?.revisoes > 0 && <span className="text-[10px] text-error/80">• {deleteData.counts.revisoes} revisões</span>}
                  {deleteData.counts?.materiais > 0 && <span className="text-[10px] text-error/80">• {deleteData.counts.materiais} materiais</span>}
                  {deleteData.counts?.eventos > 0 && <span className="text-[10px] text-error/80">• {deleteData.counts.eventos} eventos</span>}
                  {deleteData.counts?.sessoes > 0 && <span className="text-[10px] text-error/80">• {deleteData.counts.sessoes} sessões (histórico)</span>}
                  {deleteData.counts?.grade > 0 && <span className="text-[10px] text-error/80">• {deleteData.counts.grade} horários/grades</span>}
                </div>
                <p className="text-[10px] text-error/60 mt-2 italic">* Tópicos, aulas, faltas, horários da grade e revisões serão EXCLUÍDOS. Sessões de estudo serão preservadas no seu histórico, mas desvinculadas desta matéria.</p>
              </div>
            )}
            
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setDeleteData(null)}
                className="px-4 py-2 text-sm font-bold text-on-surface-variant hover:text-on-surface transition-colors"
                disabled={deleting}
              >
                Cancelar
              </button>
              <button 
                onClick={confirmDelete}
                className="px-4 py-2 text-sm font-bold text-white bg-error rounded-lg hover:bg-error/90 transition-colors"
                disabled={deleting}
              >
                {deleting ? 'Excluindo...' : 'Excluir Matéria'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reusable Calendar Event Modal */}
      <CalendarEventModal 
        isOpen={isEventModalOpen}
        onClose={() => setIsEventModalOpen(false)}
        eventToEdit={eventModalInitial}
        materias={materias}
        topicos={[]}
      />
    </>
  );
}
