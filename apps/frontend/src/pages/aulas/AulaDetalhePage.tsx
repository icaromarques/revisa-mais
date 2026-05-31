import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, Edit2, BrainCircuit, AlertCircle, FileText, Video, 
  File, Link as LinkIcon, Clock, Play, CheckCircle, Calendar as CalendarIcon, 
  Bookmark, Trash2, X, Sparkles, MoreVertical, ChevronRight, Zap, Save, Plus, ExternalLink,
  Mic, Image as ImageIcon
} from 'lucide-react';
import { format, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { apiClient } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/lib/toast';
import { Header } from '@/components/Header';
import { openMaterial, cn } from '@/lib/utils';
import { ModalNovoMaterial } from '@/components/materias/ModalNovoMaterial';
import { cascadeDeleteService } from '@/services/cascadeDeleteService';

export function AulaDetalhePage() {
  const { id: materiaId, aulaId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [materia, setMateria] = useState<any>(null);
  const [aula, setAula] = useState<any>(null);
  const [topicos, setTopicos] = useState<any[]>([]);
  const [materiais, setMateriais] = useState<any[]>([]);
  const [revisoes, setRevisoes] = useState<any[]>([]);
  const [eventos, setEventos] = useState<any[]>([]);
  const [allAulasInMateria, setAllAulasInMateria] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isDeleting, setIsDeleting] = useState(false);
  const [isProcessingDelete, setIsProcessingDelete] = useState(false);
  const [activeTab, setActiveTab] = useState('conteudo');

  // Modals state
  const [isModalMaterialOpen, setIsModalMaterialOpen] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<any>(null);
  
  const [isModalRevisaoOpen, setIsModalRevisaoOpen] = useState(false);
  const [selectedRevisao, setSelectedRevisao] = useState<any>(null);
  const [revisaoForm, setRevisaoForm] = useState({ nome: '', data_prevista: '', status: 'pendente' });
  const [savingRevisao, setSavingRevisao] = useState(false);

  // Custom Confirm Dialog
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    confirmText?: string;
    isDanger?: boolean;
    isProcessing?: boolean;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const requestConfirm = (title: string, message: string, onConfirm: () => void, confirmText = 'Excluir', isDanger = true) => {
    setConfirmDialog({
      isOpen: true,
      title,
      message,
      onConfirm,
      confirmText,
      isDanger,
      isProcessing: false
    });
  };

  const closeConfirm = () => {
    setConfirmDialog(prev => ({ ...prev, isOpen: false, isProcessing: false }));
  };

  const executeConfirm = async () => {
    setConfirmDialog(prev => ({ ...prev, isProcessing: true }));
    await confirmDialog.onConfirm();
  };

  // States for notes editing
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [notesForm, setNotesForm] = useState({
    resumo_rapido: '',
    conteudo: '',
    duvidas: '',
    observacoes: ''
  });
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  // Warn before leaving if editing
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (editingSection) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [editingSection]);

  useEffect(() => {
    if (!user || !materiaId || !aulaId) return;

    // Fetch Materia
    apiClient.get(`/materias/${materiaId}`).then(({ data }) => setMateria(data)).catch(console.error);

    // Fetch Aula
    apiClient.get(`/aulas/${aulaId}`).then(({ data }) => {
       if (data) {
          setAula(data);
          if (!editingSection) {
            setNotesForm({
              resumo_rapido: data.resumo_rapido || '',
              conteudo: data.conteudo || '',
              duvidas: data.duvidas || '',
              observacoes: data.observacoes || ''
            });
          }
       } else {
          toast.error("Aula não encontrada");
          navigate(`/materias/${materiaId}`);
       }
       setLoading(false);
    }).catch(console.error);

    // Fetch Topics
    apiClient.get(`/topicos?materia_id=${materiaId}`).then(({ data }) => {
      setTopicos(data || []);
    }).catch(console.error);

    // Fetch Materials
    apiClient.get(`/materiais?aula_id=${aulaId}`).then(({ data }) => {
      setMateriais(data || []);
    }).catch(console.error);

    // Fetch Revisions
    apiClient.get(`/revisoes?aula_id=${aulaId}`).then(({ data }) => {
      setRevisoes(data || []);
    }).catch(console.error);

    // Fetch Events (Planner)
    apiClient.get(`/eventos?aula_id=${aulaId}`).then(({ data }) => {
      setEventos(data || []);
    }).catch(console.error);

    // Fetch All Aulas for Navigation
    apiClient.get(`/aulas?materia_id=${materiaId}`).then(({ data }) => {
      if (data) {
         const sorted = data.sort((a: any, b: any) => new Date(a.data).getTime() - new Date(b.data).getTime());
         setAllAulasInMateria(sorted);
      }
    }).catch(console.error);

  }, [user, materiaId, aulaId, navigate]);

  const [isVincularMaterialOpen, setIsVincularMaterialOpen] = useState(false);
  const [allMateriaisMateria, setAllMateriaisMateria] = useState<any[]>([]);

  useEffect(() => {
    if (!user || !materiaId || !aulaId) return;

    // Fetch all materials of this materia
    apiClient.get(`/materiais?materia_id=${materiaId}`).then(({ data }) => {
      setAllMateriaisMateria(data || []);
    }).catch(console.error);
    
  }, [user, materiaId, aulaId]);

  const handleLinkMaterial = async (matId: string) => {
    try {
      await apiClient.patch(`/materiais/${matId}`, {
        aula_id: aulaId
      });
      // Update local state temporarily until next refetch if needed, but endpoint refetch might be better
      setMateriais(prev => {
        const mat = allMateriaisMateria.find(m => m.id === matId);
        if (mat) return [...prev, { ...mat, aula_id: aulaId }];
        return prev;
      });
      toast.success('Material vinculado com sucesso!');
    } catch (err) {
      toast.error('Erro ao vincular material');
    }
  };

  const materiaisDisponiveisParaVincular = allMateriaisMateria.filter(m => m.aula_id !== aulaId);

  const handleDelete = async (deleteRelated: boolean) => {
    if (!aula) return;
    setIsProcessingDelete(true);
    try {
      await apiClient.delete(`/aulas/${aula.id}?cascade=${deleteRelated}`);
      
      // Reset occurrence if it was a makeup class
      if (aula.tipo_aula === 'reposicao' && aula.reposicao_ocorrencia_id) {
         try {
            await apiClient.patch(`/ocorrencias/${aula.reposicao_ocorrencia_id}`, {
               status_reposicao: 'pendente',
               reposicao_aula_id: null,
               reposicao_observacao: 'Reposição excluída'
            });
         } catch(e) {
            console.error('Failed to reset occurrence', e);
         }
      }

      toast.success('Aula excluída com sucesso');
      navigate(`/materias/${materiaId}`);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao excluir aula');
    } finally {
      setIsProcessingDelete(false);
      setIsDeleting(false);
    }
  };

  const handleSaveNotes = async (section: string) => {
    if (!aula) return;
    setIsSavingNotes(true);
    try {
      await apiClient.patch(`/aulas/${aulaId}`, {
        [section]: (notesForm as any)[section]
      });
      toast.success('Alteração salva!');
      setEditingSection(null);
      // Update local state
      setAula((prev: any) => ({...prev, [section]: (notesForm as any)[section]}));
    } catch (error) {
      toast.error('Erro ao salvar notas.');
    } finally {
      setIsSavingNotes(false);
    }
  };

  const clearSection = (section: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    requestConfirm(
      "Confirmar Ação",
      "Deseja realmente limpar este conteúdo? Esta ação não poderá ser desfeita.",
      async () => {
        try {
          await apiClient.patch(`/aulas/${aulaId}`, {
            [section]: ''
          });
          setNotesForm(prev => ({ ...prev, [section]: '' }));
          // Update local state
          setAula((prev: any) => ({...prev, [section]: ''}));
          toast.success('Conteúdo removido');
          closeConfirm();
        } catch (err) {
          toast.error('Erro ao limpar conteúdo');
          closeConfirm();
        }
      },
      "Limpar Conteúdo",
      true
    );
  };

  const handleOpenEditRevisao = (rev: any) => {
    setSelectedRevisao(rev);
    setRevisaoForm({
      nome: rev.nome || '',
      data_prevista: rev.data_prevista ? format(new Date(rev.data_prevista), 'yyyy-MM-dd') : '',
      status: rev.status || 'pendente'
    });
    setIsModalRevisaoOpen(true);
  };

  const handleOpenNewRevisao = () => {
    setSelectedRevisao(null);
    setRevisaoForm({
      nome: `Revisão: ${aula.titulo}`,
      data_prevista: format(addDays(new Date(), 3), 'yyyy-MM-dd'),
      status: 'pendente'
    });
    setIsModalRevisaoOpen(true);
  };

  const handleSaveRevisao = async () => {
    if (!revisaoForm.nome || !user) {
      toast.error("Nome da revisão é obrigatório");
      return;
    }
    setSavingRevisao(true);
    try {
      const dataISO = revisaoForm.data_prevista ? new Date(revisaoForm.data_prevista).toISOString() : null;
      const payload: any = {
        materia_id: materiaId,
        aula_id: aulaId,
        topico_id: aula.topico_id || null,
        nome: revisaoForm.nome,
        data_prevista: dataISO,
        status: revisaoForm.status,
        origem: selectedRevisao ? (selectedRevisao.origem || 'manual') : 'manual'
      };

      if (selectedRevisao) {
          await apiClient.put(`/revisoes/${selectedRevisao.id}`, payload);
          toast.success("Revisão atualizada!");
          apiClient.get(`/revisoes?aula_id=${aulaId}`).then(({ data }) => setRevisoes(data || []));
      } else {
         await apiClient.post('/revisoes', payload);
         toast.success("Revisão agendada!");
         apiClient.get(`/revisoes?aula_id=${aulaId}`).then(({ data }) => setRevisoes(data || []));
      }
      setIsModalRevisaoOpen(false);
    } catch (err) {
      toast.error("Erro ao salvar revisão");
    } finally {
      setSavingRevisao(false);
    }
  };

  const handleToggleRevisaoStatus = async (rev: any) => {
    try {
      const newStatus = rev.status === 'concluida' ? 'pendente' : 'concluida';
      await apiClient.patch(`/revisoes/${rev.id}`, {
        status: newStatus
      });
      toast.success(newStatus === 'concluida' ? 'Revisão concluída!' : 'Revisão reaberta');
      apiClient.get(`/revisoes?aula_id=${aulaId}`).then(({ data }) => setRevisoes(data || []));
    } catch (err) {
      toast.error('Erro ao atualizar status');
    }
  };

  const handleDeleteRevisao = (id: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    requestConfirm(
      "Excluir Revisão",
      "Excluir esta revisão permanentemente? Esta ação não pode ser desfeita.",
      async () => {
        try {
          await apiClient.delete(`/revisoes/${id}`);
          toast.success('Revisão excluída');
          apiClient.get(`/revisoes?aula_id=${aulaId}`).then(({ data }) => setRevisoes(data || []));
          closeConfirm();
        } catch (err) {
          toast.error('Erro ao excluir');
          closeConfirm();
        }
      }
    );
  };

  const handleUnlinkMaterial = (matId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    requestConfirm(
      "Desvincular Material",
      "Deseja desvincular este material da aula? Ele continuará existindo no acervo da matéria.",
      async () => {
        try {
          await apiClient.patch(`/materiais/${matId}`, {
            aula_id: null
          });
          toast.success('Material desvinculado');
          setMateriais(prev => prev.filter(m => m.id !== matId));
          closeConfirm();
        } catch (err) {
          toast.error('Erro ao desvincular');
          closeConfirm();
        }
      },
      "Desvincular",
      false
    );
  };

  const handleDeleteMaterial = (matId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    requestConfirm(
      "Excluir Material",
      "Deseja excluir este material permanentemente do sistema?",
      async () => {
        try {
          await apiClient.delete(`/materiais/${matId}`);
          toast.success('Material excluído');
          setMateriais(prev => prev.filter(m => m.id !== matId));
          closeConfirm();
        } catch (err) {
          toast.error('Erro ao excluir');
          closeConfirm();
        }
      }
    );
  };

  const handleStartStudy = async () => {
    toast.success('Iniciando sessão de estudo para esta aula...');
  };

  const handleManualAgendarRevisao = async () => {
    if (!aula || !user) return;
    try {
      const dataISO = addDays(new Date(), 3).toISOString();
      await apiClient.post('/revisoes', {
        materia_id: materiaId,
        aula_id: aulaId,
        topico_id: aula.topico_id || null,
        nome: `Revisão Extra: ${aula.titulo}`,
        data_prevista: addDays(new Date(), 3).toISOString(),
        status: 'pendente'
      });
      toast.success('Revisão agendada para daqui a 3 dias!');
    } catch (err) {
      toast.error('Erro ao agendar revisão.');
    }
  };

  const handleManualAddPlanner = async () => {
    if (!aula || !user) return;
    try {
      const dataISO = addDays(new Date(), 1).toISOString();
      await apiClient.post('/eventos', {
        materia_id: materiaId,
        aula_id: aulaId,
        topico_id: aula.topico_id || null,
        titulo: `Estudar: ${aula.titulo}`,
        descricao: 'Sessão de estudo agendada manualmente',
        data_inicio: addDays(new Date(), 1).toISOString(),
        data_fim: addDays(new Date(), 1).toISOString(),
        tipo: 'estudo',
        concluido: false
      });
      toast.success('Adicionado ao Planner para amanhã!');
    } catch (err) {
      toast.error('Erro ao adicionar ao Planner.');
    }
  };

  const handleGenerateAI = (type: 'resumo' | 'flashcards' | 'questoes') => {
    toast.info(`O Copiloto IA está gerando ${type}... isso pode levar alguns segundos.`);
  };

  if (loading || !materia || !aula) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  const currentTopico = topicos.find(t => t.id === aula.topico_id);
  const viculadaAvaliacao = eventos.find(e => e.aula_id === aulaId || (aula.topico_id && e.topico_id === aula.topico_id && ['prova', 'trabalho'].includes(e.tipo)));

  return (
    <>
      <Header title={aula.titulo}>
        <div className="flex items-center gap-3 ml-4">
          <Link 
            to={`/materias/${materiaId}`} 
            className="flex items-center gap-2 px-4 py-2 bg-surface-container-highest text-on-surface rounded-full text-sm font-bold hover:bg-surface-variant transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Link>
          <button 
            onClick={() => navigate(`/materias/${materiaId}/aulas/${aulaId}/editar`)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-full text-sm font-bold hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
          >
            <Edit2 className="w-4 h-4" />
            Editar Aula
          </button>
        </div>
      </Header>

      <main className="p-8 max-w-7xl mx-auto w-full space-y-8 animate-in fade-in duration-500 pb-20">
        <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-widest text-on-surface-variant/60">
          <Link to="/materias" className="hover:text-primary transition-colors">Matérias</Link>
          <ChevronRight className="w-3 h-3" />
          <Link to={`/materias/${materiaId}`} className="hover:text-primary transition-colors">{materia?.nome || '...'}</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-on-surface">Aula: {aula.titulo}</span>
        </div>

        <div className="glass-panel p-8 rounded-3xl border border-outline/10 flex flex-col md:flex-row gap-8 items-start md:items-center justify-between bg-gradient-to-br from-surface-container-low to-surface-container-lowest">
          <div className="space-y-4 max-w-2xl">
            <div className="flex flex-wrap gap-2">
              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                aula.status === 'assistida' ? 'bg-success/10 text-success border border-success/20' :
                aula.status === 'revisar' ? 'bg-error/10 text-error border border-error/20' :
                'bg-outline/10 text-outline border border-outline/20'
              }`}>
                {aula.status}
              </span>
              <span className="px-3 py-1 rounded-full bg-surface-container-highest text-on-surface-variant text-[10px] font-black uppercase tracking-widest border border-outline/10">
                Prioridade: {aula.prioridade_estudo || 'Média'}
              </span>
              {currentTopico && (
                <span className="px-3 py-1 rounded-full bg-secondary/10 text-secondary text-[10px] font-black uppercase tracking-widest border border-secondary/20">
                  Tópico: {currentTopico.nome}
                </span>
              )}
              {aula.tipo_aula === 'reposicao' && (
                <span className="px-3 py-1 rounded-full bg-warning/10 text-warning text-[10px] font-black uppercase tracking-widest border border-warning/20 flex items-center gap-1.5">
                  <AlertCircle className="w-3 h-3" /> Reposição de Falta
                </span>
              )}
            </div>
            <h1 className="text-4xl font-black text-on-surface tracking-tight leading-tight">{aula.titulo}</h1>
            <div className="flex flex-wrap items-center gap-6 text-on-surface-variant font-medium">
              <span className="flex items-center gap-2"><CalendarIcon className="w-4 h-4 text-primary" /> {aula.data ? format(new Date(aula.data), "dd 'de' MMMM", { locale: ptBR }) : 'Sem data'}</span>
              {aula.horario && <span className="flex items-center gap-2"><Clock className="w-4 h-4 text-primary" /> {aula.horario}</span>}
              {aula.professor && <span className="flex items-center gap-2"><FileText className="w-4 h-4 text-primary" /> Prof. {aula.professor}</span>}
            </div>
          </div>
          
          <div className="flex gap-3 shrink-0">
             <button 
               onClick={() => setIsDeleting(true)}
               className="p-3 bg-error/10 text-error rounded-2xl hover:bg-error/20 transition-all border border-error/20"
             >
               <Trash2 className="w-6 h-6" />
             </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div className="flex border-b border-outline/20 gap-8">
              {[
                { id: 'conteudo', label: 'Resumo e Notas', icon: FileText },
                { id: 'materiais', label: 'Materiais', icon: Bookmark },
                { id: 'revisoes', label: 'Ciclo de Revisão', icon: BrainCircuit }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`pb-4 text-sm font-bold flex items-center gap-2 transition-all border-b-2 ${
                    activeTab === tab.id ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>

            {activeTab === 'conteudo' && (
              <div className="space-y-8 animate-in fade-in duration-300">
                {/* Resumo Rápido */}
                <div className="relative group p-6 bg-primary/5 border border-primary/20 rounded-3xl overflow-hidden">
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-xs font-black uppercase text-primary tracking-widest">Conceito Central</p>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {editingSection === 'resumo_rapido' ? (
                        <>
                          <button onClick={() => handleSaveNotes('resumo_rapido')} disabled={isSavingNotes} className="p-1.5 bg-success/20 text-success rounded-lg hover:bg-success/30">
                            <CheckCircle className="w-4 h-4" />
                          </button>
                          <button onClick={() => { setEditingSection(null); setNotesForm(prev => ({ ...prev, resumo_rapido: aula.resumo_rapido || '' })) }} className="p-1.5 bg-outline/20 text-outline rounded-lg hover:bg-outline/30">
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => setEditingSection('resumo_rapido')} className="p-1.5 bg-primary/20 text-primary rounded-lg hover:bg-primary/30">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {aula.resumo_rapido && (
                            <button onClick={(e) => clearSection('resumo_rapido', e)} className="p-1.5 bg-error/20 text-error rounded-lg hover:bg-error/30">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {editingSection === 'resumo_rapido' ? (
                    <input 
                      type="text"
                      value={notesForm.resumo_rapido}
                      onChange={e => setNotesForm(prev => ({ ...prev, resumo_rapido: e.target.value }))}
                      className="w-full bg-surface-container border border-primary/30 rounded-xl px-4 py-3 text-lg font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50"
                      autoFocus
                    />
                  ) : (
                    <p className={cn("text-xl font-bold text-on-surface", !aula.resumo_rapido && "text-on-surface-variant/40 italic")}>
                      {aula.resumo_rapido || "Nenhum conceito central definido."}
                      {!aula.resumo_rapido && <button onClick={() => setEditingSection('resumo_rapido')} className="ml-2 text-xs text-primary underline">Adicionar</button>}
                    </p>
                  )}
                </div>

                {/* Notas de Aula */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center px-2">
                    <h3 className="text-lg font-bold flex items-center gap-2 text-on-surface">
                      <FileText className="w-5 h-5 text-tertiary" /> Notas de Aula
                    </h3>
                    <div className="flex gap-2">
                      {editingSection === 'conteudo' ? (
                        <>
                          <button onClick={() => handleSaveNotes('conteudo')} disabled={isSavingNotes} className="px-4 py-1.5 bg-success text-white rounded-full text-xs font-bold flex items-center gap-2">
                            <Save className="w-3 h-3" /> Salvar Notas
                          </button>
                          <button onClick={() => { setEditingSection(null); setNotesForm(prev => ({ ...prev, conteudo: aula.conteudo || '' })) }} className="px-4 py-1.5 bg-surface-container text-on-surface-variant rounded-full text-xs font-bold">
                            Cancelar
                          </button>
                        </>
                      ) : (
                        <button onClick={() => setEditingSection('conteudo')} className="px-4 py-1.5 bg-surface-container-highest text-on-surface rounded-full text-xs font-bold hover:bg-surface-variant flex items-center gap-2">
                          <Edit2 className="w-3 h-3" /> {aula.conteudo ? 'Editar Notas' : 'Adicionar Notas'}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="glass-panel p-8 rounded-3xl border border-outline/10 text-on-surface leading-relaxed relative min-h-[200px]">
                    {editingSection === 'conteudo' ? (
                      <textarea 
                        value={notesForm.conteudo}
                        onChange={e => setNotesForm(prev => ({ ...prev, conteudo: e.target.value }))}
                        className="w-full bg-transparent resize-none focus:outline-none min-h-[300px] font-medium"
                        placeholder="Escreva suas anotações principais aqui..."
                        autoFocus
                      />
                    ) : (
                      <div className={cn("whitespace-pre-wrap", !aula.conteudo && "italic text-on-surface-variant/60")}>
                        {aula.conteudo || "Nenhuma anotação principal registrada para esta aula."}
                      </div>
                    )}
                  </div>
                </div>

                {/* Dúvidas */}
                <div className="space-y-4 p-8 bg-error/5 border border-error/10 rounded-3xl relative group">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-bold flex items-center gap-2 text-error">
                      <AlertCircle className="w-5 h-5" /> Dúvidas e Pontos Difíceis
                    </h3>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {editingSection === 'duvidas' ? (
                        <>
                          <button onClick={() => handleSaveNotes('duvidas')} disabled={isSavingNotes} className="p-1.5 bg-success/20 text-success rounded-lg hover:bg-success/30">
                            <CheckCircle className="w-4 h-4" />
                          </button>
                          <button onClick={() => { setEditingSection(null); setNotesForm(prev => ({ ...prev, duvidas: aula.duvidas || '' })) }} className="p-1.5 bg-outline/20 text-outline rounded-lg hover:bg-outline/30">
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => setEditingSection('duvidas')} className="p-1.5 bg-error/20 text-error rounded-lg hover:bg-error/30">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {aula.duvidas && (
                            <button onClick={(e) => clearSection('duvidas', e)} className="p-1.5 bg-error/30 text-error rounded-lg hover:bg-error/40 transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {editingSection === 'duvidas' ? (
                    <textarea 
                      value={notesForm.duvidas}
                      onChange={e => setNotesForm(prev => ({ ...prev, duvidas: e.target.value }))}
                      className="w-full bg-background/50 border border-error/20 rounded-xl px-4 py-3 text-on-surface focus:outline-none focus:ring-2 focus:ring-error/30 min-h-[100px] resize-none"
                      placeholder="Quais foram as suas maiores dificuldades?"
                      autoFocus
                    />
                  ) : (
                   <p className={cn("text-on-surface leading-relaxed", !aula.duvidas && "italic text-on-surface-variant/60")}>
                    {aula.duvidas || "Nenhuma dúvida registrada."}
                    {!aula.duvidas && <button onClick={() => setEditingSection('duvidas')} className="ml-2 text-xs text-error underline">Adicionar</button>}
                   </p>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'materiais' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-bold text-on-surface flex items-center gap-2">
                    <Bookmark className="w-5 h-5 text-primary" /> Arquivos e Links
                  </h3>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setIsVincularMaterialOpen(true)}
                      className="px-4 py-2 bg-secondary/10 text-secondary rounded-full text-xs font-bold hover:bg-secondary/20 flex items-center gap-2"
                    >
                      <LinkIcon className="w-4 h-4" /> Vincular Existente
                    </button>
                    <button 
                      onClick={() => { setSelectedMaterial(null); setIsModalMaterialOpen(true); }}
                      className="px-4 py-2 bg-primary/10 text-primary rounded-full text-xs font-bold hover:bg-primary/20 flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" /> Novo Material
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {materiais.length === 0 ? (
                    <div className="col-span-full py-20 text-center glass-panel rounded-3xl border border-dashed border-outline/30">
                      <Bookmark className="w-12 h-12 text-outline/30 mx-auto mb-4" />
                      <p className="text-on-surface-variant font-medium">Nenhum material vinculado.</p>
                      <button 
                        onClick={() => { setSelectedMaterial(null); setIsModalMaterialOpen(true); }}
                        className="mt-4 text-xs font-bold text-primary hover:underline underline-offset-4"
                      >
                        Clique aqui para adicionar seu primeiro material
                      </button>
                    </div>
                  ) : (
                    materiais.map(mat => (
                      <div 
                        key={mat.id} 
                        className="glass-panel p-6 rounded-3xl border border-outline/10 hover:border-primary/30 transition-all group flex items-start gap-4 relative"
                      >
                        <div onClick={() => openMaterial(mat)} className="p-3 bg-surface-container rounded-2xl group-hover:bg-primary/10 transition-colors cursor-pointer">
                          {mat.tipo === 'video' ? <Video className="w-6 h-6 text-error" /> :
                          mat.tipo === 'audio' ? <Mic className="w-6 h-6 text-primary" /> :
                          mat.tipo === 'pdf' ? <File className="w-6 h-6 text-primary" /> :
                          mat.tipo === 'imagem' ? <ImageIcon className="w-6 h-6 text-tertiary" /> :
                          <LinkIcon className="w-6 h-6 text-tertiary" />}
                        </div>
                        <div onClick={() => openMaterial(mat)} className="flex-1 min-w-0 cursor-pointer">
                          <h4 className="font-bold text-on-surface truncate group-hover:text-primary transition-colors pr-8">{mat.titulo}</h4>
                          <p className="text-xs text-on-surface-variant mt-1 capitalize tracking-wide">{mat.tipo}</p>
                          {mat.descricao && <p className="text-[10px] text-on-surface-variant mt-2 line-clamp-1 italic">{mat.descricao}</p>}
                        </div>
                        
                        <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={(e) => { e.stopPropagation(); setSelectedMaterial(mat); setIsModalMaterialOpen(true); }}
                            className="p-1.5 bg-surface-container hover:bg-primary/20 text-on-surface-variant hover:text-primary rounded-lg transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <div className="relative group/menu">
                            <button className="p-1.5 bg-surface-container text-on-surface-variant rounded-lg hover:bg-surface-variant">
                              <MoreVertical className="w-3.5 h-3.5" />
                            </button>
                            <div className="absolute right-0 top-full mt-2 w-48 bg-surface-container-highest border border-outline/20 rounded-xl shadow-2xl opacity-0 invisible group-hover/menu:opacity-100 group-hover/menu:visible transition-all z-20 py-2">
                               <button onClick={() => openMaterial(mat)} className="w-full px-4 py-2 text-left text-xs font-bold flex items-center gap-2 hover:bg-surface-variant transition-colors">
                                 <ExternalLink className="w-4 h-4" /> Abrir Material
                               </button>
                               <button onClick={(e) => handleUnlinkMaterial(mat.id, e)} className="w-full px-4 py-2 text-left text-xs font-bold flex items-center gap-2 hover:bg-surface-variant transition-colors">
                                 <Bookmark className="w-4 h-4" /> Desvincular da Aula
                               </button>
                               <div className="h-px bg-outline/10 my-1" />
                               <button onClick={(e) => handleDeleteMaterial(mat.id, e)} className="w-full px-4 py-2 text-left text-xs font-bold flex items-center gap-2 text-error hover:bg-error/10 transition-colors">
                                 <Trash2 className="w-4 h-4" /> Excluir Arquivo
                               </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {activeTab === 'revisoes' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-bold text-on-surface flex items-center gap-2">
                    <BrainCircuit className="w-5 h-5 text-secondary" /> Ciclo de Revisão Espaçada
                  </h3>
                  <button 
                    onClick={handleOpenNewRevisao}
                    className="px-4 py-2 bg-secondary/10 text-secondary rounded-full text-xs font-bold hover:bg-secondary/20 flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" /> Nova Revisão
                  </button>
                </div>

                <div className="space-y-3">
                  {revisoes.length === 0 ? (
                    <div className="py-20 text-center glass-panel rounded-3xl border border-dashed border-outline/30">
                      <BrainCircuit className="w-12 h-12 text-outline/30 mx-auto mb-4" />
                      <p className="text-on-surface-variant font-medium">Nenhuma revisão ativa para esta aula.</p>
                      <button 
                        onClick={handleManualAgendarRevisao}
                        className="mt-4 px-6 py-2 bg-primary/10 text-primary font-bold text-sm rounded-full hover:bg-primary/20 transition-colors"
                      >
                        Agendar via Copiloto IA (Ciclo 123)
                      </button>
                    </div>
                  ) : (
                    revisoes.sort((a,b) => new Date(a.data_prevista).getTime() - new Date(b.data_prevista).getTime()).map(rev => (
                      <div key={rev.id} className="glass-panel p-6 rounded-3xl border border-outline/10 flex items-center justify-between group hover:border-secondary/30 transition-all">
                        <div className="flex items-center gap-4">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              handleToggleRevisaoStatus(rev);
                            }}
                            className={cn(
                              "p-3 rounded-2xl transition-all",
                              rev.status === 'concluida' ? 'bg-success/10 text-success' : 'bg-secondary/10 text-secondary hover:bg-secondary/20'
                            )}
                          >
                            <CheckCircle className={cn("w-6 h-6", rev.status === 'concluida' ? "fill-current" : "")} />
                          </button>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                               <span className="text-[9px] font-black uppercase bg-surface-container px-2 py-0.5 rounded text-on-surface-variant tracking-widest">{rev.tipo_intervalo || 'manual'}</span>
                               {rev.data_prevista && new Date(rev.data_prevista) < new Date() && rev.status !== 'concluida' && (
                                 <span className="text-[9px] font-black uppercase bg-error/10 text-error px-2 py-0.5 rounded tracking-widest">Atrasada</span>
                               )}
                            </div>
                            <p className={cn("text-sm font-bold text-on-surface", rev.status === 'concluida' && "line-through opacity-50")}>{rev.nome}</p>
                            <p className="text-[10px] font-medium text-on-surface-variant flex items-center gap-1.5 mt-1">
                              <CalendarIcon className="w-3 h-3" /> 
                              {rev.data_prevista ? format(new Date(rev.data_prevista), "dd 'de' MMMM", { locale: ptBR }) : 'Sem data'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <span className={cn(
                            "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest",
                            rev.status === 'concluida' ? 'bg-success/10 text-success' :
                            rev.status === 'pendente' ? 'bg-secondary/10 text-secondary' : 'bg-surface-container text-on-surface-variant'
                          )}>
                            {rev.status}
                          </span>
                          
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                handleOpenEditRevisao(rev);
                              }}
                              className="p-2 bg-surface-container hover:bg-secondary/20 text-on-surface-variant hover:text-secondary rounded-xl transition-colors"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={(e) => handleDeleteRevisao(rev.id, e)}
                              className="p-2 bg-error/10 hover:bg-error text-error hover:text-white rounded-xl transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="glass-panel p-6 rounded-3xl border border-primary/20 bg-primary/5">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-primary mb-6 flex items-center gap-2">
                <Sparkles className="w-3 h-3" /> Copiloto IA Revisa+
              </h4>
              
              <div className="space-y-3">
                <button 
                  onClick={() => handleGenerateAI('resumo')}
                  className="w-full p-4 bg-background border border-primary/10 rounded-2xl flex items-center gap-3 hover:bg-primary/10 transition-all text-left"
                >
                  <Zap className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-xs font-bold text-on-surface">Gerar Resumo</p>
                    <p className="text-[9px] text-on-surface-variant">Melhorar anotações com IA</p>
                  </div>
                </button>
                <button 
                  onClick={() => handleGenerateAI('flashcards')}
                  className="w-full p-4 bg-background border border-primary/10 rounded-2xl flex items-center gap-3 hover:bg-primary/10 transition-all text-left"
                >
                  <BrainCircuit className="w-5 h-5 text-secondary" />
                  <div>
                    <p className="text-xs font-bold text-on-surface">Gerar Flashcards</p>
                    <p className="text-[9px] text-on-surface-variant">Criar revisão ativa</p>
                  </div>
                </button>
                <button 
                  onClick={() => handleGenerateAI('questoes')}
                  className="w-full p-4 bg-background border border-primary/10 rounded-2xl flex items-center gap-3 hover:bg-primary/10 transition-all text-left"
                >
                  <Zap className="w-5 h-5 text-tertiary" />
                  <div>
                    <p className="text-xs font-bold text-on-surface">Gerar Questões</p>
                    <p className="text-[9px] text-on-surface-variant">Testar conhecimentos</p>
                  </div>
                </button>
              </div>
            </div>

            <div className="glass-panel p-6 rounded-3xl border border-outline/10 space-y-4">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-outline mb-4">Próximos Passos</h4>
              
              <button 
                onClick={handleStartStudy}
                className="w-full py-4 bg-primary text-on-primary font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
              >
                <Play className="w-5 h-5 fill-current" /> Começar Estudo
              </button>

              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={handleManualAgendarRevisao}
                  className="p-3 bg-surface-container rounded-2xl hover:bg-surface-variant transition-colors flex flex-col items-center gap-2"
                >
                  <CalendarIcon className="w-5 h-5 text-tertiary" />
                  <span className="text-[9px] font-bold uppercase tracking-tight text-on-surface">Revisar</span>
                </button>
                <button 
                  onClick={handleManualAddPlanner}
                  className="p-3 bg-surface-container rounded-2xl hover:bg-surface-variant transition-colors flex flex-col items-center gap-2"
                >
                  <BrainCircuit className="w-5 h-5 text-primary" />
                  <span className="text-[9px] font-bold uppercase tracking-tight text-on-surface">Planejar</span>
                </button>
              </div>
            </div>

            {viculadaAvaliacao && (
              <div className="glass-panel p-6 rounded-3xl border border-tertiary/20 bg-tertiary/5">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-tertiary mb-3 flex items-center gap-2">
                  <CalendarIcon className="w-3 h-3" /> Avaliação Próxima
                </h4>
                <div className="p-4 bg-background border border-tertiary/10 rounded-2xl">
                  <p className="text-sm font-bold text-on-surface">{viculadaAvaliacao.titulo}</p>
                  <p className="text-xs text-on-surface-variant mt-1">
                    {format(new Date(viculadaAvaliacao.data_inicio), "dd/MM 'às' HH:mm")}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {isDeleting && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-md">
          <div className="w-full max-w-sm glass-panel rounded-3xl shadow-2xl p-8 border border-outline/10">
            <h3 className="text-2xl font-black text-on-surface text-center mb-2 tracking-tight">Excluir Aula?</h3>
            <p className="text-sm text-on-surface-variant text-center mb-8">
              Esta ação removerá a aula <strong>{aula.titulo}</strong> do seu sistema. Como deseja proceder?
            </p>
            <div className="flex flex-col gap-3">
              <button 
                onClick={() => handleDelete(true)}
                className="w-full py-4 px-6 flex justify-center text-sm font-bold text-white bg-error rounded-2xl hover:bg-error/90 transition-all shadow-lg shadow-error/20"
                disabled={isProcessingDelete}
              >
                {isProcessingDelete ? 'Removendo tudo...' : 'Excluir com Tudo'}
              </button>
              <button 
                onClick={() => handleDelete(false)}
                className="w-full py-4 px-6 flex justify-center text-sm font-bold bg-error/20 text-error rounded-2xl hover:bg-error/30 transition-colors"
                disabled={isProcessingDelete}
              >
                {isProcessingDelete ? 'Desvinculando...' : 'Apenas Desvincular'}
              </button>
              <button 
                onClick={() => setIsDeleting(false)}
                className="w-full py-4 px-6 flex justify-center text-sm font-bold bg-surface-container text-on-surface rounded-2xl hover:bg-surface-variant transition-colors"
                disabled={isProcessingDelete}
              >
                Cancelar
              </button>
            </div>
            {isProcessingDelete && (
                <p className="text-[10px] text-center text-on-surface-variant mt-4 animate-pulse">Este processo pode levar alguns segundos se houver muitos materiais...</p>
            )}
          </div>
        </div>
      )}

      {/* Modal Confirmação Genérica */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-background/80 backdrop-blur-md">
          <div className="w-full max-w-sm glass-panel rounded-3xl shadow-2xl p-8 border border-outline/10 animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-black text-on-surface text-center mb-3 tracking-tight">{confirmDialog.title}</h3>
            <p className="text-sm text-on-surface-variant text-center mb-8 px-2 leading-relaxed">
              {confirmDialog.message}
            </p>
            <div className="flex flex-col gap-3">
              <button 
                onClick={executeConfirm}
                disabled={confirmDialog.isProcessing}
                className={cn(
                  "w-full py-4 px-6 flex justify-center text-sm font-bold rounded-2xl transition-all shadow-lg",
                  confirmDialog.isProcessing ? "opacity-70 pointer-events-none" : "",
                  confirmDialog.isDanger 
                    ? "bg-error text-white hover:bg-error/90 shadow-error/20" 
                    : "bg-primary text-on-primary hover:bg-primary/90 shadow-primary/20"
                )}
              >
                {confirmDialog.isProcessing ? 'Processando...' : (confirmDialog.confirmText || 'Confirmar')}
              </button>
              <button 
                onClick={closeConfirm}
                disabled={confirmDialog.isProcessing}
                className="w-full py-4 px-6 flex justify-center text-sm font-bold bg-surface-container text-on-surface hover:bg-surface-variant rounded-2xl transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Novo/Editar Material */}
      <ModalNovoMaterial
        isOpen={isModalMaterialOpen}
        onClose={() => { setIsModalMaterialOpen(false); setSelectedMaterial(null); }}
        materialToEdit={selectedMaterial}
        materiaId={materiaId || ''}
        topicos={topicos}
        aulas={allAulasInMateria}
        defaultAulaId={aulaId}
        defaultTopicoId={aula.topico_id}
      />

      {/* Modal Nova/Editar Revisão */}
      {isModalRevisaoOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-md">
          <div className="w-full max-w-sm glass-panel rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 border border-outline/10">
             <div className="flex items-center justify-between p-6 border-b border-outline/10 bg-secondary/5">
                <h2 className="text-xl font-bold text-on-surface flex items-center gap-2">
                  <BrainCircuit className="w-5 h-5 text-secondary" /> 
                  {selectedRevisao ? 'Editar Revisão' : 'Nova Revisão'}
                </h2>
                <button onClick={() => setIsModalRevisaoOpen(false)} className="p-2 hover:bg-surface-variant rounded-full text-on-surface-variant">
                  <X className="w-5 h-5" />
                </button>
             </div>
             
             <div className="p-6 space-y-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant ml-1 block mb-1.5">Título da Revisão</label>
                  <input
                    type="text"
                    value={revisaoForm.nome}
                    onChange={e => setRevisaoForm({...revisaoForm, nome: e.target.value})}
                    className="w-full bg-surface-container border border-outline/20 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/40 font-bold"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant ml-1 block mb-1.5">Data Prevista</label>
                    <input
                      type="date"
                      value={revisaoForm.data_prevista}
                      onChange={e => setRevisaoForm({...revisaoForm, data_prevista: e.target.value})}
                      className="w-full bg-surface-container border border-outline/20 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/40 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant ml-1 block mb-1.5">Status Atual</label>
                    <select
                      value={revisaoForm.status}
                      onChange={e => setRevisaoForm({...revisaoForm, status: e.target.value as any})}
                      className="w-full bg-surface-container border border-outline/20 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/40 appearance-none font-bold"
                    >
                      <option value="pendente">Pendente</option>
                      <option value="concluida">Concluída</option>
                    </select>
                  </div>
                </div>
             </div>

             <div className="p-6 border-t border-outline/10 flex gap-3">
               <button
                 onClick={() => setIsModalRevisaoOpen(false)}
                 className="flex-1 py-3 bg-surface-container text-on-surface rounded-xl font-bold text-xs uppercase tracking-widest"
               >
                 Cancelar
               </button>
               <button
                 onClick={handleSaveRevisao}
                 disabled={savingRevisao}
                 className="flex-1 py-3 bg-secondary text-on-secondary rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-secondary/20 flex items-center justify-center gap-2"
               >
                 {savingRevisao ? 'Salvando...' : <><Save className="w-4 h-4" /> Salvar</>}
               </button>
             </div>
          </div>
        </div>
      )}
      {/* Modal Vincular Material */}
      {isVincularMaterialOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-md">
          <div className="w-full max-w-lg glass-panel rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 border border-outline/10 h-[80vh] flex flex-col">
             <div className="flex items-center justify-between p-6 border-b border-outline/10 bg-secondary/5 shrink-0">
                <h2 className="text-xl font-bold text-on-surface flex items-center gap-2">
                  <LinkIcon className="w-5 h-5 text-secondary" /> 
                  Vincular Material Existente
                </h2>
                <button onClick={() => setIsVincularMaterialOpen(false)} className="p-2 hover:bg-surface-variant rounded-full text-on-surface-variant">
                  <X className="w-5 h-5" />
                </button>
             </div>
             
             <div className="p-6 overflow-y-auto flex-1 space-y-3">
                <p className="text-xs text-on-surface-variant mb-4">Selecione um material da matéria para vincular a esta aula.</p>
                {materiaisDisponiveisParaVincular.length === 0 ? (
                  <div className="py-10 text-center">
                    <p className="text-sm text-on-surface-variant italic">Nenhum outro material disponível na matéria.</p>
                  </div>
                ) : (
                  materiaisDisponiveisParaVincular.map(mat => (
                    <div 
                      key={mat.id}
                      className="p-4 bg-surface-container rounded-2xl border border-outline/10 flex items-center justify-between group hover:bg-surface-container-highest transition-colors"
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="p-2 bg-background rounded-xl">
                          {mat.tipo === 'video' ? <Video className="w-4 h-4 text-error" /> :
                           mat.tipo === 'pdf' ? <File className="w-4 h-4 text-primary" /> :
                           <LinkIcon className="w-4 h-4 text-tertiary" />}
                        </div>
                        <div className="truncate">
                          <p className="text-sm font-bold text-on-surface truncate">{mat.titulo}</p>
                          <p className="text-[10px] text-on-surface-variant uppercase tracking-widest">{mat.tipo} • {mat.aula_id ? 'Vinculado a outra aula' : 'Sem aula'}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => { handleLinkMaterial(mat.id); setIsVincularMaterialOpen(false); }}
                        className="px-4 py-2 bg-secondary text-on-secondary rounded-xl text-xs font-bold hover:bg-secondary/90 transition-colors shrink-0"
                      >
                        Vincular
                      </button>
                    </div>
                  ))
                )}
             </div>
             
             <div className="p-4 border-t border-outline/10 bg-surface-container-low shrink-0">
               <button 
                 onClick={() => setIsVincularMaterialOpen(false)}
                 className="w-full py-3 bg-surface-container text-on-surface rounded-xl font-bold text-xs uppercase tracking-widest"
               >
                 Fechar
               </button>
             </div>
          </div>
        </div>
      )}
    </>
  );
}
