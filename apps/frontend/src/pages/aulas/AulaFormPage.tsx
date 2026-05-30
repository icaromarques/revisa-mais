import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { 
  X, BookOpen, Clock, CalendarIcon, FileText, CheckCircle, 
  BrainCircuit, Bookmark, Plus, Trash2, Zap, ArrowLeft, Save,
  Video, Link as LinkIcon, File, MoreVertical, Sparkles, AlertCircle, ChevronRight
} from 'lucide-react';
import { format } from 'date-fns';
// TODO: A refatoração completa desta página para usar apiClient foi adiada. 
// Atualmente ela ainda usa firebase/firestore diretamente.
import { db } from '@/lib/firebase'; // TODO: Refatorar
import { addDoc, collection, doc, updateDoc, writeBatch, query, where, onSnapshot, getDoc, getDocs } from 'firebase/firestore'; // TODO: Refatorar
import { apiClient } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/lib/toast';
import { Header } from '@/components/Header';

export function AulaFormPage() {
  const { id: materiaId, aulaId } = useParams();
  const [searchParams] = useSearchParams();
  const defaultTopicoId = searchParams.get('topicoId') || '';
  const reposicaoOcorrenciaId = searchParams.get('reposicao_ocorrencia_id') || '';
  const rawReposicaoData = searchParams.get('reposicao_data') || '';
  const reposicaoData = rawReposicaoData ? rawReposicaoData.substring(0, 10) : '';
  
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const [materia, setMateria] = useState<any>(null);
  const [topicos, setTopicos] = useState<any[]>([]);
  const [materiais, setMateriais] = useState<any[]>([]);
  const [materiaisExcluidos, setMateriaisExcluidos] = useState<string[]>([]);
  const [faltasPendentes, setFaltasPendentes] = useState<any[]>([]);
  const [horarioError, setHorarioError] = useState('');

  const initialForm = {
    titulo: '',
    data: reposicaoData || format(new Date(), 'yyyy-MM-dd'),
    horario: '',
    professor: '',
    local_ou_link: '',
    status: 'assistida',
    topico_id: defaultTopicoId || '',
    tipo_aula: reposicaoOcorrenciaId ? 'reposicao' : 'normal',
    reposicao_ocorrencia_id: reposicaoOcorrenciaId,
    conteudo: '',
    resumo_rapido: '',
    anotacoes_livres: '',
    duvidas: '',
    prioridade_estudo: 'media',
    tempo_estimado_revisao: '',
    add_to_planner: false,
    auto_revisao: false,
    auto_sessao: false,
    auto_resumo_ia: false,
    auto_flashcards_ia: false,
    auto_questoes_ia: false,
    auto_calendario: false
  };

  const [form, setForm] = useState(initialForm);
  const [userEditedProfessor, setUserEditedProfessor] = useState(false);

  // Fetch materia and topics
  useEffect(() => {
    if (!user || !materiaId) return;

    const materiaRef = doc(db, 'materias', materiaId);
    const unsubMateria = onSnapshot(materiaRef, (doc) => {
      if (doc.exists()) {
        const matData = doc.data();
        setMateria({ id: doc.id, ...matData });
        
        // Auto-fill professor if new class and not manually edited
        if (!aulaId && !userEditedProfessor && matData.professor) {
          setForm(f => ({...f, professor: matData.professor}));
        }
      } else {
        toast.error('Matéria não encontrada');
        navigate('/materias');
      }
    });

    const topicosQuery = query(
      collection(db, 'topicos'), 
      where('user_id', '==', user.id),
      where('materia_id', '==', materiaId)
    );
    const unsubTopicos = onSnapshot(topicosQuery, (snapshot) => {
      setTopicos(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const ocorrenciasQuery = query(
      collection(db, 'ocorrencias_grade'),
      where('user_id', '==', user.id),
      where('materia_id', '==', materiaId)
    );
    const unsubOcorrencias = onSnapshot(ocorrenciasQuery, (snapshot) => {
      const pendentes = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter((oc: any) => oc.status_reposicao !== 'recuperado');
      setFaltasPendentes(pendentes);
    });

    return () => {
      unsubMateria();
      unsubTopicos();
      unsubOcorrencias();
    };
  }, [user, materiaId, navigate]);

  // Fetch aula details if editing
  useEffect(() => {
    if (!user || !aulaId) {
      setInitialLoading(false);
      return;
    }

    const fetchAula = async () => {
      try {
        const aulaDoc = await getDoc(doc(db, 'aulas', aulaId));
        if (aulaDoc.exists()) {
          const data = aulaDoc.data();
          setForm({
            ...initialForm,
            ...data,
            topico_id: data.topico_id || ''
          });
          setUserEditedProfessor(true); // Don't overwrite existing class professor

          // Fetch materials for this class
          const matQuery = query(
            collection(db, 'materiais'),
            where('aula_id', '==', aulaId)
          );
          const matSnap = await onSnapshot(matQuery, (snapshot) => {
            setMateriais(snapshot.docs.map(doc => ({ 
              id: doc.id, 
              ...doc.data(),
              observacao: doc.data().descricao || ''
            })));
          });
          
          setInitialLoading(false);
        } else {
          toast.error('Aula não encontrada');
          navigate(`/materias/${materiaId}`);
        }
      } catch (err) {
        console.error(err);
        toast.error('Erro ao carregar detalhes da aula');
        setInitialLoading(false);
      }
    };

    fetchAula();
  }, [user, aulaId, materiaId, navigate]);

  const validateAndFormatHorario = (val: string): { valid: boolean, value: string, error?: string } => {
    let clean = val.trim();
    if (!clean) return { valid: true, value: '' };
    
    clean = clean.replace(/[^\d:]/g, ':').replace(/:+/g, ':');
    clean = clean.replace(/^:/, '').replace(/:$/, '');

    if (/^\d{1,4}$/.test(clean)) {
      if (clean.length === 1 || clean.length === 2) {
        clean = `${clean.padStart(2, '0')}:00`;
      } else if (clean.length === 3) {
        clean = `0${clean[0]}:${clean.substring(1)}`;
      } else if (clean.length === 4) {
        clean = `${clean.substring(0,2)}:${clean.substring(2)}`;
      }
    }

    const match = clean.match(/^(\d{1,2}):(\d{1,2})$/);
    if (!match) return { valid: false, value: val, error: 'Use o formato HH:MM' };

    const h = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);

    if (isNaN(h) || isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59) {
      return { valid: false, value: val, error: 'Horário inválido (00:00 - 23:59)' };
    }

    return { valid: true, value: `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}` };
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!user || !materiaId || !form.titulo.trim() || !form.data) return;

    const horarioRes = validateAndFormatHorario(form.horario);
    if (!horarioRes.valid) {
      setHorarioError(horarioRes.error || 'Horário inválido.');
      toast.error('Corrija o horário da aula para poder salvar.');
      return;
    }

    setSaving(true);
    try {
      const aulaData: any = {
        user_id: user.id,
        materia_id: materiaId,
        titulo: form.titulo,
        data: form.data,
        horario: horarioRes.value,
        professor: form.professor,
        local_ou_link: form.local_ou_link,
        status: form.status,
        topico_id: form.topico_id,
        tipo_aula: form.tipo_aula || 'normal',
        reposicao_ocorrencia_id: form.tipo_aula === 'reposicao' ? form.reposicao_ocorrencia_id : '',
        conteudo: form.conteudo,
        resumo_rapido: form.resumo_rapido,
        duvidas: form.duvidas,
        prioridade_estudo: form.prioridade_estudo,
        tempo_estimado_revisao: form.tempo_estimado_revisao,
        updated_at: new Date().toISOString()
      };

      let aulaRefId = '';

      if (aulaId) {
        const oldAulaRef = await getDoc(doc(db, 'aulas', aulaId));
        const oldTitulo = oldAulaRef.exists() ? oldAulaRef.data().titulo : '';

        await updateDoc(doc(db, 'aulas', aulaId), aulaData);
        aulaRefId = aulaId;

        // Sync title change to other collections
        if (oldTitulo && oldTitulo !== form.titulo) {
          const batchUpdate = writeBatch(db);
          let hasUpdates = false;

          // Revisions
          const revsSnap = await getDocs(query(collection(db, 'revisoes'), where('user_id', '==', user.id), where('aula_id', '==', aulaId)));
          revsSnap.forEach(rev => {
             const newName = rev.data().nome.replace(oldTitulo, form.titulo);
             batchUpdate.update(rev.ref, { nome: newName });
             hasUpdates = true;
          });

          // Events
          const evtsSnap = await getDocs(query(collection(db, 'eventos_academicos'), where('user_id', '==', user.id), where('aula_id', '==', aulaId)));
          evtsSnap.forEach(evt => {
             const newTitle = evt.data().titulo.replace(oldTitulo, form.titulo);
             batchUpdate.update(evt.ref, { titulo: newTitle });
             hasUpdates = true;
          });

          if (hasUpdates) {
             await batchUpdate.commit();
          }
        }
      } else {
        const docRef = await addDoc(collection(db, 'aulas'), {
          ...aulaData,
          created_at: new Date().toISOString()
        });
        aulaRefId = docRef.id;
      }

      // Resolve absence if makeup class
      if (form.tipo_aula === 'reposicao' && form.reposicao_ocorrencia_id && aulaRefId) {
         try {
            await updateDoc(doc(db, 'ocorrencias_grade', form.reposicao_ocorrencia_id), {
               status_reposicao: 'recuperado',
               reposicao_aula_id: aulaRefId,
               reposicao_observacao: `Recuperado pela aula: ${form.titulo}`,
               updated_at: new Date().toISOString()
            });
         } catch(e) {
            console.error("Failed to update occurrence with makeup class:", e);
         }
      }

      // Salvar Materiais
      if (aulaRefId) {
        const batch = writeBatch(db);
        
        materiaisExcluidos.forEach(matId => {
          batch.delete(doc(db, 'materiais', matId));
        });

        materiais.forEach(mat => {
          if (!mat.id) { // Create
            const matRef = doc(collection(db, 'materiais'));
            batch.set(matRef, {
              user_id: user.id,
              materia_id: materiaId,
              aula_id: aulaRefId,
              topico_id: form.topico_id,
              titulo: mat.titulo,
              tipo: mat.tipo,
              url: mat.url,
              descricao: mat.observacao || '',
              created_at: new Date().toISOString()
            });
          } else { // Update
            const matRef = doc(db, 'materiais', mat.id);
            batch.update(matRef, {
              topico_id: form.topico_id,
              titulo: mat.titulo,
              tipo: mat.tipo,
              url: mat.url,
              descricao: mat.observacao || '',
            });
          }
        });

        // Auto-actions (Only for NEW class)
        if (!aulaId) {
          // 1. auto_revisao
          if (form.auto_revisao) {
            const intervalos = [3, 7, 15, 30, 90];
            intervalos.forEach(dias => {
              const dataISO = new Date(new Date().getTime() + dias * 24 * 60 * 60 * 1000).toISOString();
              const revRef = doc(collection(db, 'revisoes'));
              batch.set(revRef, {
                user_id: user.id,
                materia_id: materiaId,
                aula_id: aulaRefId,
                topico_id: form.topico_id,
                nome: `Revisão de: ${form.titulo} (${dias} dias)`,
                data_prevista: dataISO,
                status: 'pendente',
                origem: 'assistente_aula',
                tipo_intervalo: `+${dias}d`,
                created_at: new Date().toISOString()
              });
            });
            toast.success(`5 revisões programadas!`);
          }

          // 2. auto_calendario
          if (form.auto_calendario) {
            const evtRef = doc(collection(db, 'eventos_academicos'));
            const d = form.data || new Date().toISOString().split('T')[0];
            const t = form.horario || '12:00';
            const startISO = new Date(`${d}T${t}:00`).toISOString();
            batch.set(evtRef, {
              user_id: user.id,
              materia_id: materiaId,
              aula_id: aulaRefId,
              topico_id: form.topico_id,
              titulo: `Aula: ${form.titulo}`,
              descricao: form.resumo_rapido || '',
              tipo: 'aula',
              origem: 'assistente_aula',
              data_inicio: startISO,
              data_fim: startISO,
              concluido: form.status === 'assistida',
              created_at: new Date().toISOString()
            });
            toast.success('Aula adicionada ao Calendário.');
          }

          // 3. add_to_planner
          if (form.add_to_planner) {
            const evtRef = doc(collection(db, 'eventos_academicos'));
            const startISO = new Date(new Date().getTime() + 1 * 24 * 60 * 60 * 1000).toISOString();
            batch.set(evtRef, {
              user_id: user.id,
              materia_id: materiaId,
              aula_id: aulaRefId,
              topico_id: form.topico_id,
              titulo: `Estudar: ${form.titulo}`,
              descricao: 'Revisar material da aula',
              data_inicio: startISO,
              data_fim: startISO,
              tipo: 'estudo',
              origem: 'assistente_aula',
              concluido: false,
              created_at: new Date().toISOString()
            });
            toast.success('Bloco de estudo adicionado ao Planner.');
          }

          // 4. auto_resumo_ia
          if (form.auto_resumo_ia) {
            const resRef = doc(collection(db, 'resumos'));
            batch.set(resRef, {
              user_id: user.id,
              materia_id: materiaId,
              aula_id: aulaRefId,
              topico_id: form.topico_id,
              titulo: `${form.titulo} (Resumo Aula)`,
              conteudo: form.conteudo || "Resumo gerado automaticamente.",
              origem: 'assistente_aula',
              created_at: new Date().toISOString()
            });
          }

          // 5. auto_flashcards_ia
          if (form.auto_flashcards_ia) {
            const deckRef = doc(collection(db, 'decks'));
            batch.set(deckRef, {
              user_id: user.id,
              materia_id: materiaId,
              aula_id: aulaRefId,
              topico_id: form.topico_id,
              nome: `Flashcards: ${form.titulo}`,
              descricao: "Extraído da aula.",
              cor: '#3B82F6',
              origem: 'assistente_aula',
              created_at: new Date().toISOString()
            });
          }
        }

        await batch.commit();
      }
      
      toast.success(aulaId ? 'Aula atualizada!' : 'Aula criada com sucesso!');
      navigate(`/materias/${materiaId}/aulas/${aulaRefId}`);
    } catch (error) {
      console.error(error);
      toast.error('Erro ao salvar aula.');
    } finally {
      setSaving(false);
    }
  };

  const addMaterial = () => {
    setMateriais([...materiais, { titulo: '', tipo: 'link', url: '', observacao: '' }]);
  };

  const updateMaterial = (index: number, field: string, value: string) => {
    const newMats = [...materiais];
    newMats[index] = { ...newMats[index], [field]: value };
    setMateriais(newMats);
  };

  const removeMaterial = (index: number) => {
    const mat = materiais[index];
    if (mat.id) {
      setMateriaisExcluidos([...materiaisExcluidos, mat.id]);
    }
    setMateriais(materiais.filter((_, i) => i !== index));
  };

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-on-surface">
      <Header title={aulaId ? 'Editar Aula' : 'Nova Aula'} />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {form.tipo_aula === 'reposicao' && (
          <div className="mb-6 bg-error/10 text-error px-6 py-4 rounded-2xl border border-error/20 flex flex-col md:flex-row md:items-center gap-3">
             <div className="p-2 bg-error/20 rounded-xl shrink-0">
               <AlertCircle className="w-5 h-5" />
             </div>
             <div>
               <h3 className="text-sm font-bold uppercase tracking-widest">
                 Registrando aula de reposição
               </h3>
               {form.reposicao_ocorrencia_id && (
                 <p className="text-xs opacity-80 mt-1">
                    Esta aula será vinculada à pendência selecionada, e o status da falta passará para "Em Reposição" (ou Concluído dependendo de outras ações).
                 </p>
               )}
             </div>
          </div>
        )}

        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate(`/materias/${materiaId}`)}
              className="p-2 hover:bg-surface-container rounded-full transition-colors text-on-surface-variant"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div>
              <nav className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-outline mb-1">
                <span className="hover:text-primary cursor-pointer" onClick={() => navigate('/materias')}>Matérias</span>
                <span>/</span>
                <span className="hover:text-primary cursor-pointer" onClick={() => navigate(`/materias/${materiaId}`)}>{materia?.nome || '...'}</span>
                <span>/</span>
                <span className="text-on-surface-variant">{aulaId ? 'Editar Aula' : 'Nova Aula'}</span>
              </nav>
              <h1 className="text-3xl font-black">{aulaId ? 'Editar Aula' : 'Nova Aula'}</h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(`/materias/${materiaId}`)}
              className="px-6 py-3 font-bold text-sm bg-surface-container hover:bg-surface-variant rounded-xl transition-all"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-8 py-3 font-bold text-sm bg-primary text-on-primary rounded-xl hover:bg-primary/90 transition-all flex items-center gap-2 shadow-lg shadow-primary/20 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Salvando...' : 'Salvar Aula'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form Column */}
          <div className="lg:col-span-2 space-y-8">
            {/* Bloco 1: Informações Principais */}
            <section className="glass-panel p-8 rounded-3xl border border-outline/10">
              <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-secondary" /> Informações Principais
              </h3>
              
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-outline mb-2">Tipo da Aula *</label>
                    <select 
                      value={form.tipo_aula} 
                      onChange={e => setForm({...form, tipo_aula: e.target.value})}
                      className="w-full bg-surface-container border border-outline rounded-2xl px-6 py-4 text-sm focus:outline-none focus:border-secondary transition-colors font-bold"
                    >
                      <option value="normal">Aula Normal</option>
                      <option value="reposicao">Aula de Reposição</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-outline mb-2">Título da Aula *</label>
                    <input 
                      type="text" 
                      value={form.titulo} 
                      onChange={e => setForm({...form, titulo: e.target.value})} 
                      placeholder="Ex: Introdução ao Direito Penal"
                      className="w-full bg-surface-container border border-outline rounded-2xl px-6 py-4 text-sm focus:outline-none focus:border-secondary transition-colors"
                    />
                  </div>
                </div>

                {form.tipo_aula === 'reposicao' && (
                  <div className="p-4 bg-error/5 border border-error/20 rounded-2xl">
                    <label className="block text-xs font-black uppercase tracking-widest text-outline mb-2">Vincular a uma falta pendente (Opcional)</label>
                    <select 
                      value={form.reposicao_ocorrencia_id} 
                      onChange={e => {
                         const occId = e.target.value;
                         const occ = faltasPendentes.find(f => f.id === occId);
                         setForm({
                            ...form, 
                            reposicao_ocorrencia_id: occId,
                            data: occ ? (occ.data.substring(0, 10)) : form.data
                         });
                      }}
                      className="w-full bg-surface-container border border-error/20 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-error transition-colors"
                    >
                      <option value="">Nenhuma ou Falta não listada</option>
                      {faltasPendentes.map((falta: any) => (
                        <option key={falta.id} value={falta.id}>
                          Falta do dia {format(new Date(falta.data), 'dd/MM/yyyy')}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-outline mb-2">Data *</label>
                    <input 
                      type="date" 
                      value={form.data} 
                      onChange={e => setForm({...form, data: e.target.value})}
                      className="w-full bg-surface-container border border-outline rounded-2xl px-6 py-4 text-sm focus:outline-none focus:border-secondary transition-colors"
                    />
                    
                    {form.tipo_aula !== 'reposicao' && faltasPendentes.some((f: any) => f.data.substring(0,10) === form.data.substring(0,10)) && (
                      <div className="mt-3 p-3 bg-error/10 border border-error/20 rounded-xl flex flex-col gap-2 animate-in fade-in">
                        <span className="text-[11px] font-bold text-error flex items-center gap-1.5">
                          <AlertCircle className="w-4 h-4" /> Você tem uma falta pendente neste mesmo dia.
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const falta = faltasPendentes.find((f: any) => f.data.substring(0,10) === form.data.substring(0,10));
                            if (falta) {
                              setForm(prev => ({
                                ...prev,
                                tipo_aula: 'reposicao',
                                reposicao_ocorrencia_id: falta.id
                              }));
                            }
                          }}
                          className="text-[11px] uppercase font-black tracking-wider text-error underline self-start hover:text-error/80"
                        >
                          Usar aula como reposição
                        </button>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-outline mb-2">Horário</label>
                    <input 
                      type="text" 
                      value={form.horario} 
                      placeholder="HH:MM"
                      onChange={e => setForm({...form, horario: e.target.value})}
                      className="w-full bg-surface-container border border-outline rounded-2xl px-6 py-4 text-sm focus:outline-none focus:border-secondary transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-outline mb-2">Professor</label>
                    <input 
                      type="text" 
                      value={form.professor} 
                      onChange={e => {
                        setForm({...form, professor: e.target.value});
                        setUserEditedProfessor(true);
                      }}
                      placeholder="Nome do docente"
                      className="w-full bg-surface-container border border-outline rounded-2xl px-6 py-4 text-sm focus:outline-none focus:border-secondary transition-colors"
                    />
                    {!userEditedProfessor && form.professor && !aulaId && (
                      <p className="text-[10px] text-on-surface-variant italic mt-1 pb-[-4px]">Preenchido automaticamente da matéria</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-outline mb-2">Tempo Estimado Revisão (min)</label>
                    <input 
                      type="number" 
                      value={form.tempo_estimado_revisao} 
                      onChange={e => setForm({...form, tempo_estimado_revisao: e.target.value})}
                      placeholder="Ex: 20"
                      className="w-full bg-surface-container border border-outline rounded-2xl px-6 py-4 text-sm focus:outline-none focus:border-secondary transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-outline mb-2">Status</label>
                    <select 
                      value={form.status} 
                      onChange={e => setForm({...form, status: e.target.value})}
                      className="w-full bg-surface-container border border-outline rounded-2xl px-6 py-4 text-sm focus:outline-none focus:border-secondary transition-colors appearance-none cursor-pointer"
                    >
                      <option value="pendente">Pendente</option>
                      <option value="assistida">Assistida</option>
                      <option value="revisar">Preciso Revisar</option>
                      <option value="incompleta">Incompleta</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-outline mb-2">Prioridade</label>
                    <select 
                      value={form.prioridade_estudo} 
                      onChange={e => setForm({...form, prioridade_estudo: e.target.value})}
                      className="w-full bg-surface-container border border-outline rounded-2xl px-6 py-4 text-sm focus:outline-none focus:border-secondary transition-colors appearance-none cursor-pointer"
                    >
                      <option value="baixa">Baixa</option>
                      <option value="media">Média</option>
                      <option value="alta">Alta</option>
                    </select>
                  </div>
                </div>
              </div>
            </section>

            {/* Bloco 2: Organização */}
            <section className="glass-panel p-8 rounded-3xl border border-outline/10">
              <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                <BrainCircuit className="w-5 h-5 text-primary" /> Organização e Vínculos
              </h3>
              
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-outline mb-2">Tópico Vinculado</label>
                <select 
                  id="topico_id_select"
                  value={form.topico_id} 
                  onChange={e => setForm({...form, topico_id: e.target.value})}
                  className="w-full bg-surface-container border border-outline rounded-2xl px-6 py-4 text-sm focus:outline-none focus:border-secondary transition-colors appearance-none cursor-pointer"
                >
                  <option value="">(Sem tópico)</option>
                  {topicos.map(t => (
                    <option key={t.id} value={t.id}>{t.nome}</option>
                  ))}
                </select>
              </div>
            </section>

            {/* Bloco 3: Conteúdo e Anotações */}
            <section className="glass-panel p-8 rounded-3xl border border-outline/10">
              <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                <FileText className="w-5 h-5 text-tertiary" /> Conteúdo e Notas
              </h3>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-outline mb-2">Resumo Rápido / Conceito Central</label>
                  <input 
                    type="text" 
                    value={form.resumo_rapido} 
                    onChange={e => setForm({...form, resumo_rapido: e.target.value})}
                    placeholder="O que resume esta aula em uma frase?"
                    className="w-full bg-surface-container border border-outline rounded-2xl px-6 py-4 text-sm focus:outline-none focus:border-secondary transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-outline mb-2">Conteúdo / Anotações Principais</label>
                  <textarea 
                    value={form.conteudo} 
                    onChange={e => setForm({...form, conteudo: e.target.value})}
                    placeholder="Escreva livremente sobre o conteúdo da aula..."
                    className="w-full bg-surface-container border border-outline rounded-2xl px-6 py-4 text-sm focus:outline-none focus:border-secondary transition-colors min-h-[300px] resize-y"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-error mb-2">Dúvidas ou Pontos Difíceis</label>
                  <textarea 
                    value={form.duvidas} 
                    onChange={e => setForm({...form, duvidas: e.target.value})}
                    placeholder="Quais partes não ficaram claras?"
                    className="w-full bg-error/5 border border-error/10 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:border-error transition-colors min-h-[100px] resize-y text-error"
                  />
                </div>
              </div>
            </section>

            {/* Bloco 4: Materiais */}
            <section id="materiais_section" className="glass-panel p-8 rounded-3xl border border-outline/10">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <Bookmark className="w-5 h-5 text-tertiary" /> Materiais da Aula
                </h3>
                <button
                  type="button"
                  onClick={addMaterial}
                  className="px-4 py-2 bg-tertiary/10 text-tertiary rounded-xl text-xs font-black uppercase tracking-widest hover:bg-tertiary hover:text-on-tertiary transition-all"
                >
                  + Adicionar Material
                </button>
              </div>

              {materiais.length === 0 ? (
                <div className="p-12 border-2 border-dashed border-outline/20 rounded-3xl text-center">
                  <Plus className="w-8 h-8 text-outline mx-auto mb-4 opacity-30" />
                  <p className="text-sm text-on-surface-variant italic">Nenhum material anexado</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {materiais.map((mat, idx) => (
                    <div key={idx} className="p-6 bg-surface-container rounded-2xl border border-outline/10 relative group">
                      <button 
                        onClick={() => removeMaterial(idx)}
                        className="absolute top-6 right-6 p-2 text-on-surface-variant hover:text-error hover:bg-error/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mr-10">
                        <div>
                          <label className="block text-[10px] font-black uppercase tracking-widest text-outline mb-1">Título</label>
                          <input 
                            type="text" 
                            value={mat.titulo} 
                            onChange={e => updateMaterial(idx, 'titulo', e.target.value)}
                            placeholder="Ex: Slides da Aula"
                            className="w-full bg-background border border-outline/50 rounded-xl px-4 py-2 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black uppercase tracking-widest text-outline mb-1">Tipo</label>
                          <select 
                            value={mat.tipo} 
                            onChange={e => updateMaterial(idx, 'tipo', e.target.value)}
                            className="w-full bg-background border border-outline/50 rounded-xl px-4 py-2 text-sm"
                          >
                            <option value="video">Vídeo / Aula</option>
                            <option value="pdf">Documento PDF</option>
                            <option value="slide">Apresentação / Slide</option>
                            <option value="livro">Cáp de Livro</option>
                            <option value="link">Link Externo</option>
                          </select>
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-[10px] font-black uppercase tracking-widest text-outline mb-1">URL / Link</label>
                          <input 
                            type="url" 
                            value={mat.url} 
                            onChange={e => updateMaterial(idx, 'url', e.target.value)}
                            placeholder="https://..."
                            className="w-full bg-background border border-outline/50 rounded-xl px-4 py-2 text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Bloco 5: Ações Automáticas e IA */}
            {!aulaId && (
              <section className="glass-panel p-8 rounded-3xl border border-primary/20 bg-primary/5">
                <h3 className="text-lg font-bold mb-6 flex items-center gap-2 text-primary">
                  <Sparkles className="w-5 h-5" /> Automações de Cadastro
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="flex items-start gap-3 p-4 bg-background/50 border border-primary/10 rounded-2xl cursor-pointer hover:bg-primary/5 transition-all">
                    <input 
                      type="checkbox" 
                      className="mt-1"
                      checked={form.auto_revisao} 
                      onChange={e => setForm({...form, auto_revisao: e.target.checked})} 
                    />
                    <div>
                      <p className="text-sm font-bold">Agendar Ciclo de Revisões</p>
                      <p className="text-[10px] text-on-surface-variant">Agenda revisões automáticas (3, 7, 15, 30, 90 dias).</p>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 p-4 bg-background/50 border border-primary/10 rounded-2xl cursor-pointer hover:bg-primary/5 transition-all">
                    <input 
                      type="checkbox" 
                      className="mt-1"
                      checked={form.auto_calendario} 
                      onChange={e => setForm({...form, auto_calendario: e.target.checked})} 
                    />
                    <div>
                      <p className="text-sm font-bold">Adicionar ao Calendário</p>
                      <p className="text-[10px] text-on-surface-variant">Cria um evento de aula no seu calendário acadêmico.</p>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 p-4 bg-background/50 border border-primary/10 rounded-2xl cursor-pointer hover:bg-primary/5 transition-all">
                    <input 
                      type="checkbox" 
                      className="mt-1"
                      checked={form.add_to_planner} 
                      onChange={e => setForm({...form, add_to_planner: e.target.checked})} 
                    />
                    <div>
                      <p className="text-sm font-bold">Adicionar ao Planner</p>
                      <p className="text-[10px] text-on-surface-variant">Cria uma tarefa de estudo baseada nesta aula.</p>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 p-4 bg-background/50 border border-primary/10 rounded-2xl cursor-pointer hover:bg-primary/5 transition-all">
                    <input 
                      type="checkbox" 
                      className="mt-1"
                      checked={form.auto_resumo_ia} 
                      onChange={e => setForm({...form, auto_resumo_ia: e.target.checked})} 
                    />
                    <div>
                      <p className="text-sm font-bold flex items-center gap-1.5">Gerar Resumo IA <Zap className="w-3 h-3" /></p>
                      <p className="text-[10px] text-on-surface-variant">Extrai os pontos principais e cria um resumo vinculado.</p>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 p-4 bg-background/50 border border-primary/10 rounded-2xl cursor-pointer hover:bg-primary/5 transition-all">
                    <input 
                      type="checkbox" 
                      className="mt-1"
                      checked={form.auto_flashcards_ia} 
                      onChange={e => setForm({...form, auto_flashcards_ia: e.target.checked})} 
                    />
                    <div>
                      <p className="text-sm font-bold flex items-center gap-1.5">Gerar Flashcards IA <Zap className="w-3 h-3" /></p>
                      <p className="text-[10px] text-on-surface-variant">Cria um deck de revisão ativa baseado nesta aula.</p>
                    </div>
                  </label>
                </div>
              </section>
            )}
          </div>

          {/* Lateral Column */}
          <div className="space-y-6">
            <div className="glass-panel p-6 rounded-3xl border border-outline/10 sticky top-24">
              <h4 className="text-xs font-black uppercase tracking-widest text-outline mb-6">Resumo da Aula</h4>
              
              <div className="space-y-6">
                <div className="flex items-center justify-between py-2 border-b border-outline/5">
                  <span className="text-xs text-on-surface-variant">Matéria</span>
                  <span className="text-xs font-bold text-on-surface truncate max-w-[120px] md:max-w-[150px]" title={materia?.nome || ''}>{materia?.nome || '...'}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-outline/5">
                  <span className="text-xs text-on-surface-variant">Tópico</span>
                  <span className="text-xs font-bold text-on-surface truncate max-w-[120px]" title={topicos.find(t => t.id === form.topico_id)?.nome}>
                    {topicos.find(t => t.id === form.topico_id)?.nome || '(Sem tópico)'}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-outline/5">
                  <span className="text-xs text-on-surface-variant">Status</span>
                  <span className={`text-[10px] uppercase font-black px-2 py-1 rounded tracking-widest ${
                    form.status === 'assistida' ? 'bg-success/10 text-success' :
                    form.status === 'revisar' ? 'bg-error/10 text-error' :
                    'bg-surface-container-low text-on-surface-variant'
                  }`}>
                    {form.status}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-outline/5">
                  <span className="text-xs text-on-surface-variant">Prioridade</span>
                  <span className={`text-[10px] uppercase font-black px-2 py-1 rounded tracking-widest ${
                    form.prioridade_estudo === 'alta' ? 'bg-error/10 text-error' :
                    form.prioridade_estudo === 'media' ? 'bg-tertiary/10 text-tertiary' :
                    'bg-primary/10 text-primary'
                  }`}>
                    {form.prioridade_estudo}
                  </span>
                </div>
              </div>

              <div className="mt-8 pt-8 border-t border-outline/10 space-y-4">
                 <h5 className="text-[10px] font-black uppercase tracking-widest text-outline mb-4">Avisos e Pendências</h5>
                 
                 {!form.topico_id ? (
                   <div 
                      className="flex flex-col gap-1 text-error bg-error/5 p-3 rounded-xl border border-error/10 cursor-pointer hover:bg-error/10 transition-colors"
                      onClick={() => {
                        const el = document.getElementById('topico_id_select');
                        if (el) { el.focus(); el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
                      }}
                   >
                     <div className="flex items-center gap-3">
                       <AlertCircle className="w-4 h-4" />
                       <span className="text-[10px] font-bold">Aula sem tópico vinculado</span>
                     </div>
                     <span className="text-[10px] font-bold underline pl-7">Criar tópico agora</span>
                   </div>
                 ) : null}

                 {materiais.length === 0 ? (
                   <div 
                      className="flex flex-col gap-1 text-tertiary bg-tertiary/5 p-3 rounded-xl border border-tertiary/10 cursor-pointer hover:bg-tertiary/10 transition-colors"
                      onClick={() => {
                         const el = document.getElementById('materiais_section');
                         if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
                      }}
                   >
                     <div className="flex items-center gap-3">
                       <Clock className="w-4 h-4" />
                       <span className="text-[10px] font-bold">Sem materiais anexados</span>
                     </div>
                     <span className="text-[10px] font-bold underline pl-7">Adicionar material</span>
                   </div>
                 ) : null}

                 {form.status === 'revisar' && (
                   <div className="flex items-center gap-3 text-secondary bg-secondary/5 p-3 rounded-xl">
                     <Bookmark className="w-4 h-4" />
                     <span className="text-[10px] font-bold">Marcada para revisão</span>
                   </div>
                 )}
              </div>

              {/* Quick Actions (IA/Planning) */}
              <div className="mt-8 space-y-3">
                 <button className="w-full py-4 px-6 bg-primary/5 text-primary border border-primary/20 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-primary/10 transition-all flex items-center justify-center gap-2">
                   <Sparkles className="w-4 h-4" /> Gerar Resumo IA
                 </button>
                 <button className="w-full py-4 px-6 bg-surface-container-highest text-on-surface-variant border border-outline/10 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-surface-variant transition-all flex items-center justify-center gap-2">
                   <CalendarIcon className="w-4 h-4" /> Agendar Revisão
                 </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
