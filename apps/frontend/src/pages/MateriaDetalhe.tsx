import { Header } from '@/components/Header';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, Clock, CheckCircle, Play, FileText, BrainCircuit, Calendar as CalendarIcon, Plus, X, MoreVertical, Edit2, Trash2, Search, Filter, Video, Link as LinkIcon, File, Download, AlertCircle, Bookmark, MessageSquare, ChevronDown, ChevronUp } from 'lucide-react';
import React, { useState, useEffect, useMemo } from 'react';
// TODO: A refatoração completa desta página para usar apiClient foi adiada. 
// Atualmente ela ainda usa firebase/firestore diretamente.
import { doc, collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, writeBatch, getDocs } from 'firebase/firestore'; // TODO: Refatorar
import { db } from '@/lib/firebase'; // TODO: Refatorar
import { apiClient } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useConfirm } from '@/contexts/ConfirmContext';
import { calendarService } from '@/services/calendarService';
import { EventoAcademico } from '@/types/calendar';
import { CalendarEventModal } from '@/components/CalendarEventModal';
import { ModalNovaAula } from '@/components/ModalNovaAula';
import { ModalRecuperarFalta } from '@/components/ModalRecuperarFalta';
import { ModalNovoTopico } from '@/components/ModalNovoTopico';
import { TopicosTab } from '@/components/materias/TopicosTab';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from '@/lib/toast';
import { parseValidDate } from '@/lib/utils';
import { formatPeriodoLabel } from '@/lib/colors';
import { AulasTab } from '@/components/materias/AulasTab';
import { AulaDetalheModal } from '@/components/materias/AulaDetalheModal';
import { VincularAulaTopicoModal } from '@/components/materias/VincularAulaTopicoModal';
import { LinhaTempoTab } from '@/components/materias/LinhaTempoTab';
import { ModalNovoMaterial } from '@/components/materias/ModalNovoMaterial';
import { MaterialCard } from '@/components/materias/MaterialCard';
import { openMaterial } from '@/lib/utils';

import { GeralTab } from '@/components/materias/GeralTab';
import { AvaliacoesNotasTab } from '@/components/materias/AvaliacoesNotasTab';
import { revisaoService } from '@/services/revisaoService';
import { aulaService } from '@/services/aulaService';
import { useSessionModal } from '@/contexts/SessionModalContext';
import { handleFirestoreError, OperationType } from '@/lib/firestoreErrorHandler';
import { SectionErrorBoundary } from '@/components/ErrorBoundary';
import { cascadeDeleteService } from '@/services/cascadeDeleteService';
import { calcularResumoFaltas } from '@/utils/faltasCalculator';
import { integrityService } from '@/services/integrityService';

export function MateriaDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { requestConfirm } = useConfirm();
  const { openModal: openSessionModal } = useSessionModal();
  
  const [materia, setMateria] = useState<any>(null);
  const [topicos, setTopicos] = useState<any[]>([]);
  const [sessoes, setSessoes] = useState<any[]>([]);
  const [events, setEvents] = useState<EventoAcademico[]>([]);
  const [revisoes, setRevisoes] = useState<any[]>([]);
  const [aulas, setAulas] = useState<any[]>([]);
  const [materiais, setMateriais] = useState<any[]>([]);
  const [ocorrencias, setOcorrencias] = useState<any[]>([]);
  const [grade, setGrade] = useState<any[]>([]);
  const [resumos, setResumos] = useState<any[]>([]);
  const [decks, setDecks] = useState<any[]>([]);
  const [cadernos, setCadernos] = useState<any[]>([]);
  const [notas, setNotas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('geral'); // default to start testing aulas directly
  const [openTopicoMenuId, setOpenTopicoMenuId] = useState<string | null>(null);

  // Modal State
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [eventModalInitial, setEventModalInitial] = useState<any>({});
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  
  const [isModalTopicoOpen, setIsModalTopicoOpen] = useState(false);
  const [editingTopico, setEditingTopico] = useState<any>(null);
  
  const [topicoToDelete, setTopicoToDelete] = useState<any>(null);
  const [deletingTopico, setDeletingTopico] = useState(false);

  // Modal Aula
  const [isModalAulaOpen, setIsModalAulaOpen] = useState(false);
  const [selectedAula, setSelectedAula] = useState<any>(null);
  const [aulaInitialData, setAulaInitialData] = useState<any>(null);
  const [defaultTopicoIdParaAula, setDefaultTopicoIdParaAula] = useState('');
  const [isAulaDetalheOpen, setIsAulaDetalheOpen] = useState(false);

  // Vincular Aula Existente
  const [isVincularAulaOpen, setIsVincularAulaOpen] = useState(false);
  const [topicoParaVincular, setTopicoParaVincular] = useState<any>(null);
  
  // Recuperacao
  const [isRecuperarOpen, setIsRecuperarOpen] = useState(false);
  const [faltaToRecuperar, setFaltaToRecuperar] = useState<any>(null);

  const handleReporAula = (falta: any, desiredDateStr?: string) => {
     navigate(`/materias/${id}/aulas/nova?reposicao_ocorrencia_id=${falta.id}&reposicao_data=${desiredDateStr || falta.data}`);
  };

  const handleRecuperarEstudo = (falta: any) => {
     openSessionModal({
       tipoSessao: 'recuperacao_de_conteudo',
       materiaId: falta.materia_id,
       faltaId: falta.id,
       origem: 'falta_pendente'
     });
  };

  const [vincularLoading, setVincularLoading] = useState(false);
  const [aulaSearch, setAulaSearch] = useState('');
  const [aulaFiltroTopico, setAulaFiltroTopico] = useState('');
  const [aulaFiltroStatus, setAulaFiltroStatus] = useState('');

  // Modal Material
  const [isModalMaterialOpen, setIsModalMaterialOpen] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<any>(null);
  const [defaultTopicoIdParaMaterial, setDefaultTopicoIdParaMaterial] = useState('');
  const [defaultAulaIdParaMaterial, setDefaultAulaIdParaMaterial] = useState('');
  const [materialToDelete, setMaterialToDelete] = useState<any | null>(null);
  const [deletingMaterial, setDeletingMaterial] = useState(false);

  const openNewTopico = () => {
    setEditingTopico(null);
    setIsModalTopicoOpen(true);
  };

  const openEditTopico = (topico: any) => {
    setEditingTopico(topico);
    setIsModalTopicoOpen(true);
  };

  const openEditSessao = (sessao: any) => {
    openSessionModal({
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

  const handleDeleteSessao = async (sessao: any) => {
    if (!user) return;
    requestConfirm({
      title: 'Excluir Sessão',
      message: 'Deseja excluir este item? Todas as revisões vinculadas a ele também serão removidas.',
      confirmText: 'Excluir sessão',
      isDanger: true,
      onConfirm: async () => {
        try {
          await cascadeDeleteService.deleteSessaoAndDerivates(sessao.id, user.id);
          await deleteDoc(doc(db, 'sessoes', sessao.id));
          toast.success("Sessão excluída com sucesso!");
        } catch (error) {
          console.error("Erro ao excluir sessão:", error);
          toast.error("Erro ao excluir sessão.");
        }
      }
    });
  };

  const confirmDeleteTopico = async (deleteRelated: boolean) => {
    if (!user || !topicoToDelete) return;
    setDeletingTopico(true);
    try {
      const batch = writeBatch(db);
      const collectionsToClear = ['aulas', 'materiais', 'sessoes', 'revisoes', 'resumos', 'decks', 'questoes', 'eventos_academicos'];
      
      for (const collName of collectionsToClear) {
        const q = query(collection(db, collName), where('user_id', '==', user.id), where('topico_id', '==', topicoToDelete.id));
        const snapshots = await getDocs(q);
        snapshots.forEach(snapshot => {
          if (deleteRelated) {
             batch.delete(snapshot.ref);
          } else {
             batch.update(snapshot.ref, { topico_id: null });
          }
        });
      }

      batch.delete(doc(db, 'topicos', topicoToDelete.id));
      await batch.commit();
      
      toast.success(deleteRelated ? "Tópico e tudo relacionado excluídos." : "Tópico excluído e itens desvinculados.");
      setTopicoToDelete(null);
    } catch (e) {
      console.error("Erro ao excluir tópico", e);
      toast.error("Erro ao excluir tópico");
    } finally {
      setDeletingTopico(false);
    }
  };

  useEffect(() => {
    if (!user || !id) return;
    setLoading(true);

    const unsubMateria = onSnapshot(doc(db, 'materias', id), (docSnap) => {
      if (docSnap.exists()) {
        setMateria({ id: docSnap.id, ...docSnap.data() });
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `materias/${id}`);
    });

    const qTopicos = query(collection(db, 'topicos'), where('user_id', '==', user.id), where('materia_id', '==', id));
    const unsubTopicos = onSnapshot(qTopicos, (snapshot) => {
      const sortedTopicos = snapshot.docs.map(d => ({ id: d.id, ...d.data() })).sort((a: any, b: any) => {
        const da = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dbTime = b.created_at ? new Date(b.created_at).getTime() : 0;
        return dbTime - da;
      });
      setTopicos(sortedTopicos);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'topicos');
    });

    const qSessoes = query(collection(db, 'sessoes'), where('user_id', '==', user.id), where('materia_id', '==', id));
    const unsubSessoes = onSnapshot(qSessoes, (snapshot) => {
      setSessoes(snapshot.docs.map(d => integrityService.normalizeSession({ id: d.id, ...d.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'sessoes');
    });

    const qRevisoes = query(collection(db, 'revisoes'), where('user_id', '==', user.id), where('materia_id', '==', id));
    const unsubRevisoes = onSnapshot(qRevisoes, (snapshot) => {
      setRevisoes(snapshot.docs.map(d => integrityService.normalizeReview({ id: d.id, ...d.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'revisoes');
    });

    const qNotas = query(collection(db, 'notas_materia'), where('user_id', '==', user.id), where('materia_id', '==', id));
    const unsubNotas = onSnapshot(qNotas, (snapshot) => {
      setNotas(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'notas_materia');
    });

    const qAulas = query(collection(db, 'aulas'), where('user_id', '==', user.id), where('materia_id', '==', id));
    const unsubAulas = onSnapshot(qAulas, (snapshot) => {
      setAulas(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'aulas');
    });

    const qMateriais = query(collection(db, 'materiais'), where('user_id', '==', user.id), where('materia_id', '==', id));
    const unsubMateriais = onSnapshot(qMateriais, (snapshot) => {
      setMateriais(snapshot.docs.map(d => integrityService.normalizeMaterial({ id: d.id, ...d.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'materiais');
    });

    const qOcorrencias = query(collection(db, 'ocorrencias_grade'), where('user_id', '==', user.id), where('materia_id', '==', id));
    const unsubOcorrencias = onSnapshot(qOcorrencias, (snapshot) => {
      setOcorrencias(snapshot.docs.map(d => integrityService.normalizeAbsence({ id: d.id, ...d.data() })));
    }, (error) => {
       handleFirestoreError(error, OperationType.LIST, 'ocorrencias_grade');
    });

    const qGrade = query(collection(db, 'grade_faculdade'), where('user_id', '==', user.id), where('materia_id', '==', id));
    const unsubGrade = onSnapshot(qGrade, (snapshot) => {
      setGrade(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => {
       handleFirestoreError(error, OperationType.LIST, 'grade_faculdade');
    });

    calendarService.fetchUserEvents(user.id).then((data: any[]) => {
      setEvents(data.filter((e: any) => e.materia_id === id && e.data_inicio && !isNaN(parseValidDate(e.data_inicio).getTime())));
      setLoading(false);
    });

    return () => {
      unsubMateria();
      unsubTopicos();
      unsubSessoes();
      unsubRevisoes();
      unsubNotas();
      unsubAulas();
      unsubMateriais();
      unsubOcorrencias();
      unsubGrade();
    };
  }, [user, id]);

  useEffect(() => {
    if (!user || !id) return;

    const qResumos = query(collection(db, 'resumos'), where('user_id', '==', user.id), where('materia_id', '==', id));
    const unsubResumos = onSnapshot(qResumos, (snapshot) => {
      setResumos(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const qDecks = query(collection(db, 'decks'), where('user_id', '==', user.id), where('materia_id', '==', id));
    const unsubDecks = onSnapshot(qDecks, (snapshot) => {
      setDecks(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const qCadernos = query(collection(db, 'cadernos'), where('user_id', '==', user.id), where('materia_id', '==', id));
    const unsubCadernos = onSnapshot(qCadernos, (snapshot) => {
      setCadernos(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubResumos();
      unsubDecks();
      unsubCadernos();
    };
  }, [user, id]);

  const handleDeleteAula = async (aulaId: string, deleteRelated: boolean) => {
    if (!user) return;
    try {
      if (deleteRelated) {
        await aulaService.deleteAulaCascade(aulaId, user.id);
      } else {
        await aulaService.desvincularAula(aulaId, user.id);
      }
      
      toast.success(deleteRelated ? 'Aula e vínculos excluídos!' : 'Aula excluída com sucesso!');
      setIsAulaDetalheOpen(false);
    } catch (error) {
      console.error(error);
      toast.error('Erro ao excluir aula.');
    }
  };

  const handleVincularAula = async (aula: any, topicoId: string | null) => {
    if (!user) return;
    setVincularLoading(true);
    try {
      const batch = writeBatch(db);
      const now = new Date().toISOString();

      // Update lesson
      const aulaRef = doc(db, 'aulas', aula.id);
      batch.update(aulaRef, {
        topico_id: topicoId,
        updated_at: now
      });

      // Update materials
      const qMateriais = query(collection(db, 'materiais'), where('user_id', '==', user.id), where('aula_id', '==', aula.id));
      const matSnaps = await getDocs(qMateriais);
      matSnaps.forEach(matDoc => {
        batch.update(matDoc.ref, {
          topico_id: topicoId,
          updated_at: now
        });
      });

      // Update other related items if moving TO a topic
      if (topicoId) {
        const collectionsToSync = ['revisoes', 'resumos', 'decks', 'cadernos', 'eventos_academicos'];
        for (const coll of collectionsToSync) {
          const q = query(collection(db, coll), where('user_id', '==', user.id), where('aula_id', '==', aula.id));
          const snaps = await getDocs(q);
          snaps.forEach(d => batch.update(d.ref, { topico_id: topicoId, updated_at: now }));
        }
      }

      await batch.commit();
      toast.success(topicoId ? 'Aula vinculada com sucesso!' : 'Aula desvinculada com sucesso!');
      setIsVincularAulaOpen(false);
      setTopicoParaVincular(null);
    } catch (error) {
      console.error(error);
      toast.error('Erro ao vincular aula.');
    } finally {
      setVincularLoading(false);
    }
  };

  const handleDesvincularAula = async (aula: any) => {
    requestConfirm({
      title: 'Desvincular Aula',
      message: `Deseja desvincular a aula "${aula.titulo}" deste tópico?`,
      confirmText: 'Desvincular',
      isDanger: true,
      onConfirm: async () => {
        await handleVincularAula(aula, null);
      }
    });
  };

  const requestDeleteMaterial = (id: string) => {
    const material = materiais.find(m => m.id === id);
    if (material) {
      setMaterialToDelete(material);
    }
  };

  const confirmDeleteMaterial = async () => {
    if (!materialToDelete) return;
    if (!user) return;
    setDeletingMaterial(true);
    try {
      const { materialService } = await import('@/services/materialService');
      await materialService.deleteMaterial(materialToDelete.id, user.id);
      toast.success("Material excluído!");
      setMaterialToDelete(null);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao excluir material.");
    } finally {
      setDeletingMaterial(false);
    }
  };

  const handleUpdateRevisao = async (revisao: any, updates: any) => {
    try {
      await revisaoService.updateRevisao(revisao.id, updates);
      toast.success("Revisão atualizada!");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao atualizar revisão.");
    }
  };

  const handleDeleteRevisao = async (revisao: any) => {
    if (!user) return;
    requestConfirm({
      title: 'Excluir Revisão',
      message: 'Excluir esta revisão?',
      confirmText: 'Excluir',
      isDanger: true,
      onConfirm: async () => {
        try {
          await revisaoService.deleteRevisao(revisao.id, user.id);
          toast.success("Revisão excluída!");
        } catch (error) {
          console.error(error);
          toast.error("Erro ao excluir revisão.");
        }
      }
    });
  };

  const handleToggleEventConcluido = async (event: any) => {
    try {
      await calendarService.updateEvent(event.id, { ...event, concluido: !event.concluido });
    } catch (error) {
      console.error(error);
    }
  };

  const stats = useMemo(() => {
    let totalMinutos = 0;
    let questoesFeitas = 0;
    let acertos = 0;
    
    sessoes.forEach(s => {
      totalMinutos += (s.tempo_estudado_minutos || 0);
      questoesFeitas += (s.total_questoes || 0);
      acertos += (s.acertos || 0);
    });
    
    const acertoMedio = questoesFeitas > 0 ? Math.round((acertos / questoesFeitas) * 100) : 0;
    const totalHoras = Math.round(totalMinutos / 60);

    const now = new Date();
    
    // Topicos stats
    const topicosStats = topicos.map(t => {
      const topicoSessoes = sessoes.filter(s => s.topico_id === t.id);
      const min = topicoSessoes.reduce((acc, s) => acc + (s.tempo_estudado_minutos || 0), 0);
      return {
        ...t,
        horas: Math.round(min / 60 * 10) / 10,
        status: t.status || (min > 0 ? 'em_andamento' : 'pendente')
      };
    });

    const isValidDate = (dString: any) => dString && !isNaN(parseValidDate(dString).getTime());

    // Proximas Avaliacoes (Prova, Trabalho, Apresentacao)
    const upcomingEvents = events
      .filter(e => !e.concluido && isValidDate(e.data_inicio) && parseValidDate(e.data_inicio) >= now && ['prova', 'trabalho', 'apresentacao'].includes(e.tipo))
      .sort((a,b) => parseValidDate(a.data_inicio).getTime() - parseValidDate(b.data_inicio).getTime());
    const proximasAvaliacoes = upcomingEvents.length;
    const nextEvent = upcomingEvents[0];

    // Proximas Revisoes
    const pendingReviews = revisoes.filter(r => r.status === 'pendente' && isValidDate(r.data_prevista) && parseValidDate(r.data_prevista) >= now);
const delayedReviews = revisoes.filter(r => r.status === 'pendente' && isValidDate(r.data_prevista) && parseValidDate(r.data_prevista) < now);

    const resumoFaltas = calcularResumoFaltas(ocorrencias);

    return {
      totalHoras,
      questoesFeitas,
      acertoMedio,
      topicos: topicosStats,
      proximasAvaliacoes,
      nextEvent,
      pendingReviewsCount: pendingReviews.length,
      delayedReviewsCount: delayedReviews.length,
      aulasCount: aulas.length,
      aulasPendentes: aulas.filter(a => a.status === 'pendente' || a.status === 'revisar').length,
      faltas: resumoFaltas.faltasParaLimite,
      ocorrenciasPendentes: ocorrencias.filter(o => o.status === 'pendente_confirmacao'),
      aulasPerdidasCount: resumoFaltas.pendentesReposicao,
      aulasPerdidasItems: ocorrencias.filter(o => (o.status === 'falta' || o.status === 'conteudo_recuperado') && o.status_reposicao !== 'recuperado'),
      aulasRecuperadas: resumoFaltas.conteudosRecuperados
    };
  }, [sessoes, topicos, events, revisoes, aulas, ocorrencias, materia]);


  if (loading && !materia) {
    return <div className="p-8 text-center text-on-surface-variant font-medium">Carregando matéria...</div>;
  }

  if (!materia) return <div className="p-8 text-center text-error border border-error/20 bg-error/10 w-fit mx-auto mt-10 rounded-xl">Matéria não encontrada</div>;

  return (
    <>
      <Header title={materia.nome} subtitle={formatPeriodoLabel(materia.tipo_periodo, materia.numero_periodo, materia.periodo_inicio, materia.periodo_fim)}>
        <div className="flex items-center gap-3 ml-4">
          <Link to="/materias" className="flex items-center gap-2 px-4 py-2 bg-surface-container-highest text-on-surface rounded-full text-sm font-bold hover:bg-surface-variant transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Link>
          {materia.status && materia.status !== 'em_andamento' && (
             <span className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-current opacity-80
               ${materia.status === 'aprovada' ? 'bg-success/10 text-success' : 
                 materia.status === 'reprovada' ? 'bg-error/10 text-error' : 
                 materia.status === 'concluida' ? 'bg-tertiary/10 text-tertiary' : 
                 materia.status === 'trancada' ? 'bg-on-surface-variant/10 text-on-surface-variant' :
                 'bg-primary/10 text-primary'}
             `}>
               {materia.status === 'em_andamento' ? 'Em andamento' :
                materia.status === 'concluida' ? 'Concluída' :
                materia.status === 'aprovada' ? 'Aprovada' :
                materia.status === 'reprovada' ? 'Reprovada' :
                materia.status === 'trancada' ? 'Trancada' : materia.status.replace('_', ' ')}
             </span>
          )}
        </div>
      </Header>

      <div className="p-8 max-w-7xl mx-auto w-full space-y-8 animate-in fade-in duration-500">
        <div className="flex border-b border-outline/30 overflow-x-auto custom-scrollbar gap-8">
          {[
            { id: 'geral', label: 'Visão Geral' },
            { id: 'aulas', label: 'Aulas' },
            { id: 'topicos', label: 'Tópicos' },
            { id: 'planejamento', label: 'Planejamento' },
            { id: 'avaliacoes', label: 'Avaliações' },
            { id: 'materiais', label: 'Materiais' },
            { id: 'historico', label: 'Linha do Tempo' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-4 text-sm font-bold uppercase tracking-widest whitespace-nowrap transition-colors border-b-2 ${activeTab === tab.id ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-on-surface'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Notificação de Confirmação Pendente */}
        {stats.ocorrenciasPendentes.length > 0 && (
          <div className="glass-panel p-4 rounded-2xl border-primary/20 bg-primary/5 flex items-center justify-between gap-4 animate-in slide-in-from-top-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-xl">
                <AlertCircle className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-bold text-on-surface">Você tem aulas desta matéria pendentes de confirmação</p>
                <p className="text-xs text-on-surface-variant">Confirme se assistiu para manter seu histórico em dia.</p>
              </div>
            </div>
            <button 
              onClick={() => navigate('/dashboard')}
              className="px-4 py-2 bg-primary text-on-primary rounded-xl text-xs font-bold whitespace-nowrap hover:brightness-110"
            >
              Confirmar no Dashboard
            </button>
          </div>
        )}

        {activeTab === 'geral' && (
          <SectionErrorBoundary title="Visão Geral da Matéria" name="MateriaGeral">
            <GeralTab 
              materia={materia}
              grade={grade}
              topicos={topicos}
              aulas={aulas}
              revisoes={revisoes}
              events={events}
              materiais={materiais}
              sessoes={sessoes}
              resumos={resumos}
              decks={decks}
              cadernos={cadernos}
              notas={notas}
              ocorrencias={ocorrencias}
              openDetalheAula={(aula) => navigate(`/materias/${id}/aulas/${aula.id}`)}
              openEditAula={(aula) => navigate(`/materias/${id}/aulas/${aula.id}/editar`)}
              onDeleteAula={handleDeleteAula}
              onAddMaterial={(aid) => { setSelectedMaterial(null); setDefaultAulaIdParaMaterial(aid); setDefaultTopicoIdParaMaterial(''); setIsModalMaterialOpen(true); }}
              onEditMaterial={(m) => { setSelectedMaterial(m); setIsModalMaterialOpen(true); }}
              onDeleteMaterial={requestDeleteMaterial}
              onEditEvent={(e) => { setSelectedEvent(e); setIsEventModalOpen(true); }}
              onUpdateRevisao={handleUpdateRevisao}
              onDeleteRevisao={handleDeleteRevisao}
              onToggleEventConcluido={handleToggleEventConcluido}
              onNewEvent={() => { setSelectedEvent(null); setEventModalInitial({ materia_id: id }); setIsEventModalOpen(true); }}
              onNewAula={() => navigate(`/materias/${id}/aulas/nova`)}
              onReporAula={handleReporAula}
              onRecuperarEstudo={handleRecuperarEstudo}
              onTabChange={setActiveTab}
              onEditSessao={openEditSessao}
            />
          </SectionErrorBoundary>
        )}

        {activeTab === 'aulas' && (
          <SectionErrorBoundary title="Listagem de Aulas" name="MateriaAulas">
            <AulasTab
              aulas={aulas}
              topicos={topicos}
              materiais={materiais}
              openNovaAula={() => navigate(`/materias/${id}/aulas/nova`)}
              openEditAula={(aula) => navigate(`/materias/${id}/aulas/${aula.id}/editar`)}
              openDetalheAula={(aula) => navigate(`/materias/${id}/aulas/${aula.id}`)}
              onVincularTopico={(aula, tid) => handleVincularAula(aula, tid)}
            />
          </SectionErrorBoundary>
        )}
         {activeTab === 'topicos' && (
           <SectionErrorBoundary title="Tópicos e Assuntos" name="MateriaTopicos">
              <TopicosTab
                topicos={topicos}
                aulas={aulas}
                sessoes={sessoes}
                revisoes={revisoes}
                materiais={materiais}
                openNovoTopico={openNewTopico}
                openEditTopico={openEditTopico}
                openDeleteTopico={setTopicoToDelete}
                openDetalheAula={(aula) => navigate(`/materias/${id}/aulas/${aula.id}`)}
                openNovaAulaNoTopico={(tid) => navigate(`/materias/${id}/aulas/nova?topicoId=${tid}`)}
                onEditAula={(aula) => navigate(`/materias/${id}/aulas/${aula.id}/editar`)}
                openVincularAula={(topico) => { setTopicoParaVincular(topico); setIsVincularAulaOpen(true); }}
                onDesvincularAula={handleDesvincularAula}
                 onEditMaterial={(m) => { setSelectedMaterial(m); setIsModalMaterialOpen(true); }}
                 onDeleteMaterial={requestDeleteMaterial}
                 onAddMaterial={(tid) => { setSelectedMaterial(null); setDefaultTopicoIdParaMaterial(tid); setDefaultAulaIdParaMaterial(''); setIsModalMaterialOpen(true); }}
              />
            </SectionErrorBoundary>
         )}

        {activeTab === 'avaliacoes' && (
          <SectionErrorBoundary title="Provas e Trabalhos" name="MateriaAvaliacoes">
            <AvaliacoesNotasTab materia={materia} notas={notas} events={events} />
          </SectionErrorBoundary>
        )}

        {activeTab === 'planejamento' && (
          <SectionErrorBoundary title="Planejamento de Estudos" name="MateriaPlanejamento" message="Ocorreu um erro ao calcular o planejamento futuro desta matéria.">
            <div className="space-y-6 animate-in fade-in">
               <div className="glass-panel rounded-2xl overflow-hidden h-fit">
                <div className="p-6 border-b border-outline flex justify-between items-center bg-surface-container-low/50">
                  <div>
                    <h3 className="text-lg font-bold flex items-center gap-2"><BrainCircuit className="w-5 h-5 text-primary" /> Planejamento Futuro</h3>
                    <p className="text-xs text-on-surface-variant">Próximos passos sugeridos pelo Tutor Cognitivo.</p>
                  </div>
                </div>
                <div className="p-6 flex flex-col gap-6">
                   {/* Sugestoes */}
                   <div>
                     <h4 className="text-sm font-bold text-on-surface mb-3 uppercase tracking-widest text-outline">Revisões Atrasadas</h4>
                     {stats.delayedReviewsCount > 0 ? (
                       <div className="p-4 bg-error/10 border border-error/20 rounded-xl mb-6">
                         <p className="text-sm text-error font-bold mb-1">Atenção!</p>
                         <p className="text-xs text-on-surface-variant">Você possui {stats.delayedReviewsCount} revisões atrasadas nesta matéria. Resolva-as antes de prosseguir no conteúdo.</p>
                         <Link to="/revisoes" className="mt-3 inline-block px-4 py-2 bg-error text-white font-bold text-[10px] uppercase rounded hover:bg-error/80 transition-colors">Ir para Revisões</Link>
                       </div>
                     ) : (
                       <p className="text-sm text-on-surface-variant italic mb-6">Sem atrasos. Ótimo trabalho!</p>
                     )}
                   </div>

                   {/* Recovery Flow Section */}
                   {(stats.faltas > 0 || stats.aulasPerdidasCount > 0) && (
                     <div className="mb-6">
                       <h4 className="text-sm font-bold text-on-surface mb-3 uppercase tracking-widest text-outline">Aulas Perdidas & Reposição</h4>
                       <div className="p-4 bg-warning/10 border border-warning/20 rounded-xl space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                               <AlertCircle className="w-4 h-4 text-warning" />
                               <span className="text-sm font-bold text-warning">Total de Faltas: {stats.faltas}</span>
                            </div>
                            <span className="text-[10px] font-black bg-warning/20 text-warning px-2 py-0.5 rounded tracking-widest">Atenção ao limite!</span>
                          </div>
                          
                          {stats.aulasPerdidasItems && stats.aulasPerdidasItems.length > 0 && (
                            <div className="space-y-2">
                              <p className="text-xs text-on-surface-variant">Conteúdos que você perdeu e precisa recuperar:</p>
                              {stats.aulasPerdidasItems.map((oc: any) => (
                                <div key={oc.id} className="flex items-center justify-between p-2 bg-surface-container-high rounded border border-outline/10">
                                  <span className="text-xs font-bold text-on-surface">Aula de {oc.data}</span>
                                  <button
                                    onClick={() => {
                                      setAulaInitialData({
                                        titulo: `Reposição: ${materia.nome} (${oc.data})`,
                                        data: format(new Date(), 'yyyy-MM-dd'),
                                        reposicao_ocorrencia_id: oc.id,
                                        tipo_aula: 'reposicao',
                                        conteudo: 'AULA PERDIDA - Recuperar conteúdo, obter anotações com colegas e assistir gravação se disponível.'
                                      });
                                      setIsModalAulaOpen(true);
                                    }}
                                    className="text-[10px] font-black text-primary uppercase hover:underline"
                                  >
                                    Marcar como Reposta
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                       </div>
                     </div>
                   )}

                   <div>
                     <h4 className="text-sm font-bold text-on-surface mb-3 uppercase tracking-widest text-outline">Próximos Tópicos</h4>
                     {stats.topicos.filter(t => t.status !== 'concluido').length === 0 ? (
                       <p className="text-sm text-on-surface-variant italic">Você concluiu todos os tópicos cadastrados.</p>
                     ) : (
                       <div className="flex flex-col gap-2">
                         {stats.topicos.filter(t => t.status !== 'concluido').map(t => (
                           <div key={t.id} className="p-3 bg-surface-container-highest rounded-lg flex items-center justify-between border border-outline/10">
                             <span className="text-sm font-bold">{t.nome}</span>
                             <span className={`text-[10px] font-bold px-2 py-1 rounded bg-surface-container-low uppercase tracking-widest text-outline`}>
                               {t.status === 'em_andamento' ? 'Retomar Estudo' : 'Iniciar'}
                             </span>
                           </div>
                         ))}
                       </div>
                     )}
                   </div>
                </div>
              </div>
            </div>
          </SectionErrorBoundary>
        )}

        {activeTab === 'materiais' && (
          <SectionErrorBoundary title="Acervo de Materiais" name="MateriaMateriais">
            <div className="space-y-6 animate-in fade-in">
               <div className="glass-panel rounded-2xl overflow-hidden h-fit">
                <div className="p-6 border-b border-outline flex justify-between items-center bg-surface-container-low/50">
                  <div>
                    <h3 className="text-lg font-bold flex items-center gap-2"><FileText className="w-5 h-5 text-tertiary" /> Acervo da Matéria</h3>
                    <p className="text-xs text-on-surface-variant">Todos os livros, PDFs, vídeos e anexos vinculados.</p>
                  </div>
                  <button 
                    onClick={() => { setSelectedMaterial(null); setDefaultTopicoIdParaMaterial(''); setDefaultAulaIdParaMaterial(''); setIsModalMaterialOpen(true); }} 
                    className="text-sm font-bold bg-tertiary text-on-tertiary px-4 py-2 rounded-lg hover:bg-tertiary/90 transition-colors shadow-lg shadow-tertiary/20"
                  >
                    + Novo Material
                  </button>
                </div>
                <div className="p-6 flex flex-col gap-4">
                   {materiais.length === 0 ? (
                      <div className="text-center py-12">
                        <File className="w-12 h-12 text-on-surface-variant/30 mx-auto mb-3" />
                        <p className="text-sm text-on-surface-variant italic">Nenhum material salvo no acervo.</p>
                      </div>
                   ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {materiais.map(mat => (
                          <MaterialCard 
                            key={mat.id} 
                            material={mat} 
                            topicos={topicos} 
                            aulas={aulas}
                            onEdit={(m) => { setSelectedMaterial(m); setIsModalMaterialOpen(true); }}
                            onDelete={requestDeleteMaterial}
                          />
                        ))}
                      </div>
                   )}
                </div>
              </div>
            </div>
          </SectionErrorBoundary>
        )}

        {activeTab === 'historico' && (
          <SectionErrorBoundary title="Histórico de Atividades" name="MateriaHistorico">
            <LinhaTempoTab
              materia={materia}
              topicos={topicos}
              aulas={aulas}
              sessoes={sessoes}
              revisoes={revisoes}
              materiais={materiais}
              events={events}
              resumos={resumos}
              decks={decks}
              cadernos={cadernos}
              ocorrencias={ocorrencias}
              openDetalheAula={(aula) => navigate(`/materias/${id}/aulas/${aula.id}`)}
              openEditAula={(aula) => navigate(`/materias/${id}/aulas/${aula.id}/editar`)}
              onDesvincularAula={handleDesvincularAula}
              onEditTopico={openEditTopico}
              onDeleteTopico={setTopicoToDelete}
              onOpenRevisao={(r) => {
                window.location.href = `/revisoes?id=${r.id}`;
              }}
              onOpenNovaAula={() => navigate(`/materias/${id}/aulas/nova`)}
              onReporAula={handleReporAula}
              onRecuperarEstudo={handleRecuperarEstudo}
              onOpenSessao={openEditSessao}
              onOpenIniciarEstudo={() => setActiveTab('topicos')}
              onEditSessao={openEditSessao}
              onDeleteSessao={handleDeleteSessao}
            />
          </SectionErrorBoundary>
        )}
      </div>

      <CalendarEventModal
        isOpen={isEventModalOpen}
        onClose={() => setIsEventModalOpen(false)}
        eventToEdit={selectedEvent}
        initialData={eventModalInitial}
      />

      {/* Modal Novo Tópico */}
      <ModalNovoTopico 
        isOpen={isModalTopicoOpen}
        onClose={() => setIsModalTopicoOpen(false)}
        topicoAtual={editingTopico}
        materiaId={id || ''}
      />

      {/* Delete Topico Modal */}
      {topicoToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-background/80 backdrop-blur-md">
          <div className="w-full max-w-sm glass-panel rounded-2xl shadow-2xl p-6">
            <h3 className="text-xl font-bold text-on-surface mb-2">Excluir Tópico?</h3>
            <p className="text-sm text-on-surface-variant mb-6">
              Como deseja excluir o tópico <strong>{topicoToDelete.nome}</strong>?
            </p>
            <div className="flex flex-col gap-3">
              <button 
                onClick={() => confirmDeleteTopico(true)}
                className="w-full px-4 py-2 flex justify-center text-sm font-bold text-white bg-error rounded-lg hover:bg-error/90 transition-colors"
                disabled={deletingTopico}
              >
                {deletingTopico ? 'Processando...' : 'Excluir com Tudo'}
              </button>
              <button 
                onClick={() => confirmDeleteTopico(false)}
                className="w-full px-4 py-2 flex justify-center text-sm font-bold bg-error/20 text-error rounded-lg hover:bg-error/30 transition-colors"
                disabled={deletingTopico}
              >
                {deletingTopico ? 'Processando...' : 'Apenas Desvincular'}
              </button>
              <button 
                onClick={() => setTopicoToDelete(null)}
                className="w-full px-4 py-2 flex justify-center text-sm font-bold bg-surface-container text-on-surface-variant rounded-lg hover:bg-surface-variant transition-colors"
                disabled={deletingTopico}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Vincular Aula Existente Modal */}
      <VincularAulaTopicoModal
        isOpen={isVincularAulaOpen}
        onClose={() => { setIsVincularAulaOpen(false); setTopicoParaVincular(null); }}
        topico={topicoParaVincular}
        aulas={aulas}
        topicos={topicos}
        onConfirm={(aula) => handleVincularAula(aula, topicoParaVincular.id)}
        loading={vincularLoading}
      />

      <ModalNovoMaterial
        isOpen={isModalMaterialOpen}
        onClose={() => setIsModalMaterialOpen(false)}
        materialToEdit={selectedMaterial}
        materiaId={id || ''}
        topicos={topicos}
        aulas={aulas}
        defaultTopicoId={defaultTopicoIdParaMaterial}
        defaultAulaId={defaultAulaIdParaMaterial}
      />

      {/* Delete Material Modal */}
      {materialToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-background/80 backdrop-blur-md">
          <div className="w-full max-w-sm glass-panel rounded-2xl shadow-2xl p-6">
            <h3 className="text-xl font-bold text-on-surface mb-2">Excluir material?</h3>
            <p className="text-sm text-on-surface-variant mb-6">
              Deseja realmente excluir o material <strong>{materialToDelete.titulo || 'Sem título'}</strong>?
            </p>
            <div className="flex flex-col gap-3">
              <button 
                onClick={confirmDeleteMaterial}
                className="w-full px-4 py-2 flex justify-center text-sm font-bold text-white bg-error rounded-lg hover:bg-error/90 transition-colors"
                disabled={deletingMaterial}
              >
                {deletingMaterial ? 'Excluindo...' : 'Excluir'}
              </button>
              <button 
                onClick={() => setMaterialToDelete(null)}
                className="w-full px-4 py-2 flex justify-center text-sm font-bold bg-surface-container text-on-surface-variant rounded-lg hover:bg-surface-variant transition-colors"
                disabled={deletingMaterial}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {isModalAulaOpen && (
        <ModalNovaAula 
          isOpen={isModalAulaOpen}
          onClose={() => { setIsModalAulaOpen(false); setAulaInitialData(null); }}
          aulaAtual={selectedAula}
          materiaId={id || ''}
          topicos={topicos}
          initialData={aulaInitialData}
        />
      )}

      {isRecuperarOpen && (
         <ModalRecuperarFalta
            isOpen={isRecuperarOpen}
            onClose={() => { setIsRecuperarOpen(false); setFaltaToRecuperar(null); }}
            faltaToRecuperar={faltaToRecuperar}
         />
      )}
    </>
  );
}
