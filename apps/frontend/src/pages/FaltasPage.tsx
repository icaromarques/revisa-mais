import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { useAuth } from '@/contexts/AuthContext';
import { useConfirm } from '@/contexts/ConfirmContext';
import { collection, query, where, onSnapshot, doc, updateDoc, increment, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { OcorrenciaGrade, StatusOcorrencia } from '@/types/availability';
import { AlertCircle, CheckCircle2, History, Filter, BookOpen, Clock, Calendar, Check, Plus, Trash2, Edit2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from '@/lib/toast';
import { ModalFaltaManual } from '@/components/ModalFaltaManual';
import { ModalRecuperarFalta } from '@/components/ModalRecuperarFalta';
import { ModalExcluirFalta } from '@/components/ModalExcluirFalta';
import { calcularResumoFaltas } from '@/utils/faltasCalculator';
import { handleFirestoreError, OperationType } from '@/lib/firestoreErrorHandler';

import { SectionErrorBoundary } from '@/components/ErrorBoundary';

export function FaltasPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { requestConfirm } = useConfirm();
  const [ocorrencias, setOcorrencias] = useState<OcorrenciaGrade[]>([]);
  const [materias, setMaterias] = useState<any[]>([]);
  const [filter, setFilter] = useState<'all' | 'pendente' | 'recuperado'>('all');
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRecuperarOpen, setIsRecuperarOpen] = useState(false);
  const [isExcluirOpen, setIsExcluirOpen] = useState(false);
  const [faltaToEdit, setFaltaToEdit] = useState<OcorrenciaGrade | undefined>();
  const [faltaToRecuperar, setFaltaToRecuperar] = useState<OcorrenciaGrade | undefined>();
  const [faltaToExcluir, setFaltaToExcluir] = useState<OcorrenciaGrade | undefined>();

  useEffect(() => {
    if (!user) return;

    const qOc = query(
      collection(db, 'ocorrencias_grade'),
      where('user_id', '==', user.uid),
      where('status', 'in', ['falta', 'conteudo_recuperado'])
    );

    const unsubOc = onSnapshot(qOc, (snap) => {
      setOcorrencias(snap.docs.map(d => ({ id: d.id, ...d.data() } as OcorrenciaGrade)));
      setLoading(false);
    });

    const qMat = query(collection(db, 'materias'), where('user_id', '==', user.uid));
    const unsubMat = onSnapshot(qMat, (snap) => {
      setMaterias(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubOc();
      unsubMat();
    };
  }, [user]);

  const materiasMap = materias.reduce((acc, m) => {
    acc[m.id] = m;
    return acc;
  }, {} as any);

  const filtered = ocorrencias.filter(oc => {
    // If status_reposicao is 'recuperado', treat effectively as 'conteudo_recuperado' for filtering purposes
    const isRecuperado = oc.status === 'conteudo_recuperado' || oc.status_reposicao === 'recuperado';
    if (filter === 'all') return true;
    if (filter === 'pendente') return !isRecuperado;
    return isRecuperado;
  }).sort((a, b) => b.data.localeCompare(a.data));

  // Centralised metrics
  const resumoFaltas = calcularResumoFaltas(ocorrencias);

  const faltasParaLimite = resumoFaltas.faltasParaLimite;
  const totalFaltas = resumoFaltas.totalRegistrado;
  const pendentes = resumoFaltas.pendentesReposicao;
  const recuperadas = resumoFaltas.conteudosRecuperados;

  const handleMarkAsRecuperado = (oc: OcorrenciaGrade) => {
    setFaltaToRecuperar(oc);
    setIsRecuperarOpen(true);
  };

  const handleDelete = async (oc: OcorrenciaGrade) => {
    if (!oc.id) return;
    setFaltaToExcluir(oc);
    setIsExcluirOpen(true);
  };

  const openEditModal = (oc: OcorrenciaGrade) => {
    setFaltaToEdit(oc);
    setIsModalOpen(true);
  };

  return (
    <>
      <Header title="Controle de Faltas" />

      <main className="p-8 max-w-7xl mx-auto w-full space-y-8 animate-in fade-in duration-500">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 flex-1">
            <div className="glass-panel p-6 rounded-3xl border-primary/20 bg-primary/5">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-2xl">
                  <AlertCircle className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-outline">Total Registrado</p>
                  <p className="text-3xl font-black text-on-surface">{totalFaltas}</p>
                </div>
              </div>
            </div>

            <div className="glass-panel p-6 rounded-3xl border-error/20 bg-error/5">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-error/10 rounded-2xl">
                  <History className="w-6 h-6 text-error" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-outline">Pendentes de Reposição</p>
                  <p className="text-3xl font-black text-on-surface">{pendentes}</p>
                </div>
              </div>
            </div>

            <div className="glass-panel p-6 rounded-3xl border-success/20 bg-success/5">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-success/10 rounded-2xl">
                  <CheckCircle2 className="w-6 h-6 text-success" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-outline">Conteúdo Recuperado</p>
                  <p className="text-3xl font-black text-on-surface">{recuperadas}</p>
                </div>
              </div>
            </div>
          </div>
          
          <button 
            onClick={() => { setFaltaToEdit(undefined); setIsModalOpen(true); }}
            className="flex items-center gap-2 px-6 py-4 bg-primary text-on-primary rounded-2xl font-black text-sm uppercase tracking-wider shadow-lg shadow-primary/20 hover:brightness-110 active:scale-95 transition-all mt-4 md:mt-0"
          >
            <Plus className="w-5 h-5" />
            Nova Falta
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center justify-between">
          <div className="flex bg-surface-container rounded-full p-1 border border-outline/10">
            <button
              onClick={() => setFilter('all')}
              className={cn(
                "px-6 py-2 rounded-full text-xs font-black transition-all",
                filter === 'all' ? "bg-surface text-on-surface shadow-lg" : "text-on-surface-variant hover:text-on-surface"
              )}
            >
              TODAS
            </button>
            <button
              onClick={() => setFilter('pendente')}
              className={cn(
                "px-6 py-2 rounded-full text-xs font-black transition-all",
                filter === 'pendente' ? "bg-error text-on-error shadow-lg" : "text-on-surface-variant hover:text-on-surface"
              )}
            >
              PENDENTES
            </button>
            <button
              onClick={() => setFilter('recuperado')}
              className={cn(
                "px-6 py-2 rounded-full text-xs font-black transition-all",
                filter === 'recuperado' ? "bg-success text-on-success shadow-lg" : "text-on-surface-variant hover:text-on-surface"
              )}
            >
              RECUPERADAS
            </button>
          </div>
          
          <div className="flex items-center gap-2 text-outline text-[10px] font-black uppercase tracking-widest">
            <Filter className="w-3 h-3" />
             Vizu: {filtered.length} Registros ({filtered.reduce((a, b) => a + (b.quantidade_ocorrencias || 1), 0)} Faltas)
          </div>
        </div>

        {/* List */}
        <SectionErrorBoundary title="Faltas e Ocorrências" name="FaltasContent">
          <div className="grid gap-4">
            {filtered.length === 0 ? (
              <div className="text-center py-20 glass-panel rounded-3xl border-outline/10 bg-surface-container-low">
                <CheckCircle2 className="w-12 h-12 text-success/20 mx-auto mb-4" />
                <p className="text-on-surface-variant font-medium">Nenhum registro encontrado para este filtro.</p>
              </div>
            ) : (
              filtered.map((oc) => {
                const materia = materiasMap[oc.materia_id];
                const isRecuperado = oc.status === 'conteudo_recuperado' || oc.status_reposicao === 'recuperado';
                return (
                  <div 
                    key={oc.id} 
                    className={cn(
                      "group glass-panel p-5 rounded-3xl border-outline/5 bg-surface-container flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all hover:scale-[1.01]",
                      isRecuperado && "opacity-60 grayscale-[0.5]"
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div 
                        className="w-2 h-12 rounded-full hidden md:block" 
                        style={{ backgroundColor: materia?.cor || '#666' }} 
                      />
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span 
                            className="w-2 h-2 rounded-full md:hidden" 
                            style={{ backgroundColor: materia?.cor || '#666' }} 
                          />
                          <h4 className="font-bold text-lg text-on-surface">{materia?.nome || 'Matéria Desconhecida'}</h4>
                          {isRecuperado && (
                            <span className="bg-success/20 text-success text-[10px] font-black px-2 py-0.5 rounded-full uppercase">Recuperada</span>
                          )}
                          <span className={cn("text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded border", oc.origem === 'manual' ? "border-tertiary/30 text-tertiary bg-tertiary/10" : oc.grade_id ? "border-secondary/30 text-secondary bg-secondary/10" : "border-outline text-outline")}>
                             {oc.origem === 'manual' ? 'Manual' : oc.grade_id ? 'Grade' : 'Automática'}
                          </span>
                          {oc.tipo_falta === 'com_atestado' && (
                            <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded border border-warning/30 text-warning bg-warning/10">
                              Atestado
                            </span>
                          )}
                          {oc.tipo_falta === 'justificada' && (
                            <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded border border-primary/30 text-primary bg-primary/10">
                              Justificada
                            </span>
                          )}
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-4 text-xs text-on-surface-variant">
                          <div className="flex items-center gap-1.5 font-medium">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>{oc.data}</span>
                          </div>
                          {oc.quantidade_ocorrencias && oc.quantidade_ocorrencias > 1 && (
                            <div className="flex items-center gap-1.5 font-medium text-error">
                              <AlertCircle className="w-3.5 h-3.5" />
                              <span>{oc.quantidade_ocorrencias} Faltas no dia</span>
                            </div>
                          )}
                          {materia?.professor && (
                            <div className="flex items-center gap-1.5 font-medium">
                              <BookOpen className="w-3.5 h-3.5" />
                              <span>Prof. {materia.professor}</span>
                            </div>
                          )}
                        </div>
                        {oc.observacoes && (
                          <p className="text-xs text-on-surface-variant mt-2 italic border-l-2 border-outline/20 pl-2">
                             "{oc.observacoes}"
                          </p>
                        )}
                        {oc.reposicao_observacao && (
                          <p className="text-xs text-success/80 mt-2 font-medium bg-success/10 px-3 py-1.5 rounded-lg inline-block">
                             <CheckCircle2 className="w-3 h-3 inline mr-1.5 opacity-70" />
                             {oc.reposicao_observacao}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
                      {!isRecuperado ? (
                        <div className="flex gap-2 w-full md:w-auto">
                          <button 
                            onClick={() => {
                              if (oc.materia_id) {
                                navigate(`/materias/${oc.materia_id}/aulas/nova?reposicao_ocorrencia_id=${oc.id}&reposicao_data=${oc.data}`);
                              } else {
                                toast.error('Matéria não encontrada.');
                              }
                            }}
                            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-error/10 text-error px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-error hover:text-on-error transition-colors border border-error/20"
                          >
                            <BookOpen className="w-3.5 h-3.5" />
                            Repor c/ Aula
                          </button>
                          <button 
                            onClick={() => handleMarkAsRecuperado(oc)}
                            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-success text-on-success px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider shadow-lg shadow-success/20 hover:brightness-110 active:scale-95 transition-all"
                          >
                            <Check className="w-3.5 h-3.5" />
                            Alternativa
                          </button>
                        </div>
                      ) : (
                        <div className="text-success flex justify-center items-center gap-2 px-4 py-2 bg-success/10 rounded-xl text-xs font-bold w-full md:w-auto">
                          <CheckCircle2 className="w-4 h-4" />
                          Em dia
                        </div>
                      )}
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openEditModal(oc)}
                          className="p-3 text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded-xl transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(oc); }}
                          className="p-3 text-on-surface-variant hover:text-error hover:bg-error/10 rounded-xl transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </SectionErrorBoundary>

        <ModalFaltaManual 
          isOpen={isModalOpen}
          onClose={() => { setIsModalOpen(false); setFaltaToEdit(undefined); }}
          faltaToEdit={faltaToEdit}
        />
        <ModalRecuperarFalta
          isOpen={isRecuperarOpen}
          onClose={() => { setIsRecuperarOpen(false); setFaltaToRecuperar(undefined); }}
          faltaToRecuperar={faltaToRecuperar}
        />
        <ModalExcluirFalta
          isOpen={isExcluirOpen}
          onClose={() => { setIsExcluirOpen(false); setFaltaToExcluir(undefined); }}
          faltaToExcluir={faltaToExcluir}
        />
      </main>
    </>
  );
}
