import { REVISA_COLORS, normalizeColorId } from '@/lib/colors';
import React, { useState, useEffect } from 'react';
import { GradeFaculdade } from '@/types/availability';
import { useAuth } from '@/contexts/AuthContext';
import { availabilityService } from '@/services/availabilityService';
import { apiClient } from '@/lib/api';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore'; // TODO: Refatorar no próximo passo
import { db } from '@/lib/firebase'; // TODO: Refatorar no próximo passo
import { X } from 'lucide-react';
import { toast } from '@/lib/toast';
import { useConfirm } from '@/contexts/ConfirmContext';
import { DaySelector } from './DaySelector';
import { ColorTokenPicker } from '@/components/ColorTokenPicker';
import { DateInputMasked } from '@/components/ui/DateInputMasked';
import { TimeInputMasked } from '@/components/ui/TimeInputMasked';

interface Props {
  onClose: () => void;
  horarioToEdit?: GradeFaculdade;
}

export function ModalNovoHorario({ onClose, horarioToEdit }: Props) {
  const { user } = useAuth();
  const { requestConfirm } = useConfirm();
  const [loading, setLoading] = useState(false);
  const [userEditedProfessor, setUserEditedProfessor] = useState(false);
  const [userEditedTitulo, setUserEditedTitulo] = useState(false);
  const [userEditedVigencia, setUserEditedVigencia] = useState(false);
  const [userEditedInicioVigencia, setUserEditedInicioVigencia] = useState(false);
  const [userEditedFimVigencia, setUserEditedFimVigencia] = useState(false);
  const [userEditedNewMateriaNome, setUserEditedNewMateriaNome] = useState(false);
  const [userEditedNewMateriaProfessor, setUserEditedNewMateriaProfessor] = useState(false);
  const [materias, setMaterias] = useState<any[]>([]);
  const [isCreatingMateria, setIsCreatingMateria] = useState(false);
  const [newMateria, setNewMateria] = useState({
      nome: '',
      professor: '',
      cor: 'roxo',
      tipo_periodo: 'semestre',
      numero_periodo: '',
      periodo_inicio: '',
      periodo_fim: '',
      limite_faltas_percentual: '',
      prioridade: 'Média',
      peso_importancia: 'Médio',
      meta_semanal_horas: ''
  });

  const [form, setForm] = useState<Partial<GradeFaculdade>>({
    titulo: '',
    materia_id: '',
    dias_semana: [1],
    hora_inicio: '08:00',
    hora_fim: '10:00',
    recorrente: true,
    professor: '',
    local: '',
    observacoes: '',
    cor: '',
    ativo: true,
    sincronizado_google: false,
  });

  const [deletingMode, setDeletingMode] = useState(false);
  const [retroFaltasOption, setRetroFaltasOption] = useState<'none'|'quantidade'|'detalhado'>('none');
  const [retroFaltasQuant, setRetroFaltasQuant] = useState<number>(0);
  const [retroFaltasLista, setRetroFaltasLista] = useState<any[]>([]);

  useEffect(() => {
    if (horarioToEdit) {
      setForm({
        ...horarioToEdit,
        dias_semana: (horarioToEdit as any).dia_semana !== undefined ? [(horarioToEdit as any).dia_semana] : (horarioToEdit.dias_semana || []),
      });
    }
    
    if (user) {
      getDocs(query(collection(db, 'materias'), where('user_id', '==', user.id)))
        .then(snap => {
           setMaterias(snap.docs.map(d => ({
             id: d.id, 
             nome: d.data().nome, 
             professor: d.data().professor,
             cor: d.data().cor,
             periodo_inicio: d.data().periodo_inicio,
             periodo_fim: d.data().periodo_fim,
             tipo_periodo: d.data().tipo_periodo,
             numero_periodo: d.data().numero_periodo,
             limite_faltas_percentual: d.data().limite_faltas_percentual,
             meta_semanal_horas: d.data().meta_semanal_horas,
             prioridade: d.data().prioridade,
             peso_importancia: d.data().peso_importancia,
             status: d.data().status
           })));
        });
    }
  }, [horarioToEdit, user]);

  useEffect(() => {
    if (isCreatingMateria) {
       setNewMateria(prev => {
          let updated = { ...prev };
          if (!userEditedNewMateriaNome && form.titulo !== undefined) {
             updated.nome = form.titulo;
          }
          if (!userEditedNewMateriaProfessor && form.professor !== undefined) {
             updated.professor = form.professor;
          }
          return updated;
       });
    }
  }, [form.titulo, form.professor, isCreatingMateria, userEditedNewMateriaNome, userEditedNewMateriaProfessor]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!form.titulo || !form.hora_inicio || !form.hora_fim) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    if (form.recorrente && (!form.dias_semana || form.dias_semana.length === 0)) {
      toast.error('Selecione pelo menos um dia da semana');
      return;
    }

    setLoading(true);
    try {
      let finalMateriaId = form.materia_id;

      if (isCreatingMateria && newMateria.nome) {
         const { addDoc, collection } = await import('firebase/firestore');
         
         const nomeReal = form.titulo && !userEditedTitulo && !newMateria.nome ? form.titulo : newMateria.nome;
         const profReal = form.professor && !userEditedProfessor && !newMateria.professor ? form.professor : newMateria.professor;

         const obj = {
             nome: nomeReal || form.titulo,
             professor: profReal || form.professor,
             cor: normalizeColorId(newMateria.cor),
             tipo_periodo: newMateria.tipo_periodo || null,
             numero_periodo: newMateria.numero_periodo ? Number(newMateria.numero_periodo) : null,
             periodo_inicio: newMateria.periodo_inicio || null,
             periodo_fim: newMateria.periodo_fim || null,
             limite_faltas_percentual: newMateria.limite_faltas_percentual ? Number(newMateria.limite_faltas_percentual) : null,
             meta_semanal_horas: newMateria.meta_semanal_horas ? Number(newMateria.meta_semanal_horas) : null,
             prioridade: newMateria.prioridade,
             peso_importancia: newMateria.peso_importancia,
             user_id: user.id,
             progresso: 0,
             status: 'em_andamento',
             faltas: 0,
             created_at: new Date().toISOString(),
             updated_at: new Date().toISOString()
         };
         const rootCol = collection(db, 'materias');
         const docRef = await addDoc(rootCol, obj);
         finalMateriaId = docRef.id;
         toast.success("Matéria vinculada criada!");
         
         if (retroFaltasOption === 'quantidade' && retroFaltasQuant > 0) {
            await addDoc(collection(db, 'ocorrencias_grade'), {
               user_id: user.id,
               materia_id: docRef.id,
               grade_id: null,
               data: newMateria.periodo_inicio || new Date().toISOString(),
               status: 'falta',
               origem: 'retroativa',
               quantidade_ocorrencias: retroFaltasQuant,
               tipo_falta: 'comum',
               status_reposicao: 'pendente',
               observacoes: 'Faltas retroativas informadas no cadastro da matéria pela grade',
               created_at: new Date().toISOString(),
               updated_at: new Date().toISOString()
            });
         } else if (retroFaltasOption === 'detalhado' && retroFaltasLista.length > 0) {
            for (const falta of retroFaltasLista) {
               await addDoc(collection(db, 'ocorrencias_grade'), {
                  user_id: user.id,
                  materia_id: docRef.id,
                  data: falta.data || new Date().toISOString(),
                  status: 'falta',
                  origem: 'retroativa',
                  quantidade_ocorrencias: falta.quantidade || 1,
                  tipo_falta: falta.tipo_falta,
                  status_reposicao: falta.status_reposicao,
                  grade_id: null,
                  observacoes: falta.observacoes || 'Falta retroativa detalhada',
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
               });
            }
         }
      }

      const payload: any = {
        ...form,
        cor: form.cor ? normalizeColorId(form.cor) : null,
        user_id: user.id,
        titulo: form.titulo!,
        hora_inicio: form.hora_inicio!,
        hora_fim: form.hora_fim!,
        recorrente: form.recorrente ?? true,
        ativo: form.ativo ?? true,
        dias_semana: form.recorrente ? form.dias_semana : [],
        materia_id: finalMateriaId || null
      };

      const selectedMat = finalMateriaId && !isCreatingMateria ? materias.find(m => m.id === finalMateriaId) : null;
      let vigenciaInicio = form.data_inicio_vigencia || form.periodo_inicio || null;
      let vigenciaFim = form.data_fim_vigencia || form.periodo_fim || null;

      if (!userEditedInicioVigencia) {
         vigenciaInicio = vigenciaInicio || newMateria.periodo_inicio || selectedMat?.periodo_inicio || null;
      }
      if (!userEditedFimVigencia) {
         vigenciaFim = vigenciaFim || newMateria.periodo_fim || selectedMat?.periodo_fim || null;
      }

      if (finalMateriaId && !isCreatingMateria && selectedMat) {
         payload.tipo_periodo = form.tipo_periodo || selectedMat.tipo_periodo || null;
         payload.numero_periodo = form.numero_periodo || selectedMat.numero_periodo || null;
         payload.limite_faltas_percentual = form.limite_faltas_percentual ?? selectedMat.limite_faltas_percentual ?? null;
      } else if (isCreatingMateria) {
         payload.tipo_periodo = form.tipo_periodo || newMateria.tipo_periodo || null;
         payload.numero_periodo = form.numero_periodo || (newMateria.numero_periodo ? Number(newMateria.numero_periodo) : null);
         payload.limite_faltas_percentual = form.limite_faltas_percentual ?? (newMateria.limite_faltas_percentual ? Number(newMateria.limite_faltas_percentual) : null);
      }

      payload.data_inicio_vigencia = vigenciaInicio;
      payload.data_fim_vigencia = vigenciaFim;
      payload.periodo_inicio = vigenciaInicio;
      payload.periodo_fim = vigenciaFim;

      if (!payload.recorrente) {
          payload.data_especifica = form.data_especifica;
      } else {
          delete payload.data_especifica;
      }

      // Clean legacy field
      delete payload.dia_semana;
      
      // Remove any undefined values
      Object.keys(payload).forEach(key => {
        if (payload[key] === undefined) {
          delete payload[key];
        }
      });

      if (horarioToEdit?.id) {
        await availabilityService.updateGradeFaculdade(horarioToEdit.id, payload);
        toast.success('Horário atualizado!');
      } else {
        await availabilityService.createGradeFaculdade(payload as Omit<GradeFaculdade, 'id' | 'created_at'>);
        toast.success('Horário cadastrado!');
      }
      onClose();
    } catch (error) {
      console.error(error);
      toast.error('Erro ao salvar horário');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-surface-container rounded-3xl border border-outline/10 shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-6 border-b border-outline/5">
          <h2 className="text-xl font-bold text-on-surface">
            {horarioToEdit ? 'Editar Horário' : 'Novo Horário na Grade'}
          </h2>
          <button onClick={onClose} className="p-2 text-on-surface-variant hover:text-on-surface rounded-full hover:bg-surface-variant transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
          <form id="horario-form" onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">
                  Disciplina / Aula *
                </label>
                <input
                  type="text"
                  required
                  value={form.titulo}
                  onChange={e => {
                    setForm({...form, titulo: e.target.value});
                    setUserEditedTitulo(true);
                  }}
                  className="w-full bg-background border border-outline/20 rounded-xl px-4 py-3 text-sm text-on-surface focus:outline-none focus:border-primary transition-colors"
                  placeholder="Ex: Cálculo I"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">
                  Matéria Vinculada (Opcional)
                </label>
                <select
                  value={isCreatingMateria ? 'new' : form.materia_id}
                  onChange={e => {
                    const val = e.target.value;
                    if (val === 'new') {
                       setIsCreatingMateria(true);
                       setForm(prev => ({ ...prev, materia_id: '' }));
                       setNewMateria(prev => ({
                         ...prev,
                         nome: prev.nome || form.titulo || '',
                         professor: prev.professor || form.professor || ''
                       }));
                       return;
                    }
                    setIsCreatingMateria(false);
                    const newMateriaId = val;
                    const selectedMat = materias.find(m => m.id === newMateriaId);
                    
                    const newForm = { ...form, materia_id: newMateriaId };
                    
                    if (!userEditedTitulo && selectedMat) {
                      newForm.titulo = selectedMat.nome;
                    }
                    
                    if (!userEditedProfessor && selectedMat) {
                      newForm.professor = selectedMat.professor || '';
                    } else if (!userEditedProfessor && !newMateriaId) {
                      newForm.professor = '';
                    }

                    if (selectedMat) {
                      if (!userEditedInicioVigencia && selectedMat.periodo_inicio) newForm.data_inicio_vigencia = selectedMat.periodo_inicio;
                      if (!userEditedFimVigencia && selectedMat.periodo_fim) newForm.data_fim_vigencia = selectedMat.periodo_fim;
                      if (!form.tipo_periodo) newForm.tipo_periodo = selectedMat.tipo_periodo;
                      if (!form.numero_periodo) newForm.numero_periodo = selectedMat.numero_periodo;
                      if (form.limite_faltas_percentual === undefined || form.limite_faltas_percentual === null || form.limite_faltas_percentual === '') {
                        newForm.limite_faltas_percentual = selectedMat.limite_faltas_percentual;
                      }
                      if (!form.cor) newForm.cor = ''; // Force empty to inherit
                    }

                    setForm(newForm);
                  }}
                  className="w-full bg-background border border-outline/20 rounded-xl px-4 py-3 text-sm text-on-surface focus:outline-none focus:border-primary transition-colors"
                >
                  <option value="">-- Não vincular --</option>
                  <option value="new" className="font-bold text-primary">➕ Criar nova matéria agora</option>
                  {materias.map(m => (
                    <option key={m.id} value={m.id}>{m.nome}</option>
                  ))}
                </select>
              </div>

              {isCreatingMateria && (
                <div className="p-4 bg-primary/5 border border-primary/20 rounded-2xl space-y-4 animate-in slide-in-from-top-2">
                  <h3 className="text-sm font-bold text-primary flex items-center gap-2">
                    Nova Matéria
                    <button type="button" onClick={() => setIsCreatingMateria(false)} className="text-[10px] text-on-surface-variant bg-surface-container hover:bg-surface-variant px-2 py-1 rounded ml-auto transition-colors">Cancelar</button>
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <div className="flex justify-between items-end mb-1">
                        <label className="block text-[10px] uppercase font-bold text-on-surface-variant tracking-wider">Nome *</label>
                        {!userEditedNewMateriaNome && form.titulo && form.titulo === newMateria.nome && (
                           <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-black uppercase tracking-widest whitespace-nowrap">Sugerido da aula</span>
                        )}
                      </div>
                      <input type="text" value={newMateria.nome} onChange={e => {
                        setNewMateria({...newMateria, nome: e.target.value});
                        setUserEditedNewMateriaNome(true);
                      }} className="w-full bg-background border border-outline/20 rounded-xl px-3 py-2 text-sm" placeholder="Nome da matéria" required={isCreatingMateria} />
                    </div>
                    <div>
                       <div className="flex justify-between items-end mb-1">
                         <label className="block text-[10px] uppercase font-bold text-on-surface-variant tracking-wider">Professor(a)</label>
                         {!userEditedNewMateriaProfessor && form.professor && form.professor === newMateria.professor && (
                            <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-black uppercase tracking-widest whitespace-nowrap">Sugerido</span>
                         )}
                       </div>
                       <input type="text" value={newMateria.professor} onChange={e => {
                           setNewMateria({...newMateria, professor: e.target.value});
                           setUserEditedNewMateriaProfessor(true);
                       }} className="w-full bg-background border border-outline/20 rounded-xl px-3 py-2 text-sm" placeholder="Opcional" />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-on-surface-variant tracking-wider mb-1">Cor</label>
                      <div className="bg-background border border-outline/20 rounded-xl p-2">
                        <ColorTokenPicker 
                          value={newMateria.cor} 
                          onChange={(cor) => setNewMateria({...newMateria, cor})} 
                          allowEmpty={false}
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="block text-[10px] uppercase font-bold text-on-surface-variant tracking-wider mb-1">Tipo de Período</label>
                        <select value={newMateria.tipo_periodo} onChange={e => setNewMateria({...newMateria, tipo_periodo: e.target.value})} className="w-full bg-background border border-outline/20 rounded-xl px-3 py-2 text-sm">
                           <option value="bimestre">Bimestre</option>
                           <option value="trimestre">Trimestre</option>
                           <option value="semestre">Semestre</option>
                           <option value="modulo">Módulo</option>
                           <option value="ano">Ano</option>
                           <option value="outro">Outro</option>
                        </select>
                     </div>
                     <div>
                        <label className="block text-[10px] uppercase font-bold text-on-surface-variant tracking-wider mb-1">Núm do Período</label>
                        <input type="number" value={newMateria.numero_periodo} onChange={e => setNewMateria({...newMateria, numero_periodo: e.target.value})} className="w-full bg-background border border-outline/20 rounded-xl px-3 py-2 text-sm" placeholder="Ex: 2" min="1" max="20" />
                     </div>
                     <div>
                        <label className="block text-[10px] uppercase font-bold text-on-surface-variant tracking-wider mb-1">Início do Período</label>
                        <DateInputMasked value={newMateria.periodo_inicio} onChange={e => {
                           const val = e.target.value;
                           setNewMateria({...newMateria, periodo_inicio: val});
                           if (!userEditedInicioVigencia) {
                              setForm(prev => ({...prev, data_inicio_vigencia: val}));
                           }
                        }} className="[&_input]:py-2 [&_input]:text-sm" />
                     </div>
                     <div>
                        <label className="block text-[10px] uppercase font-bold text-on-surface-variant tracking-wider mb-1">Fim do Período</label>
                        <DateInputMasked value={newMateria.periodo_fim} onChange={e => {
                           const val = e.target.value;
                           setNewMateria({...newMateria, periodo_fim: val});
                           if (!userEditedFimVigencia) {
                              setForm(prev => ({...prev, data_fim_vigencia: val}));
                           }
                        }} className="[&_input]:py-2 [&_input]:text-sm" />
                     </div>
                     <div>
                        <label className="block text-[10px] uppercase font-bold text-on-surface-variant tracking-wider mb-1">Limite Faltas (%)</label>
                        <input type="number" value={newMateria.limite_faltas_percentual} onChange={e => setNewMateria({...newMateria, limite_faltas_percentual: e.target.value})} className="w-full bg-background border border-outline/20 rounded-xl px-3 py-2 text-sm" placeholder="Ex: 25" />
                     </div>
                     <div>
                        <label className="block text-[10px] uppercase font-bold text-on-surface-variant tracking-wider mb-1">Meta semanal (h)</label>
                        <input type="number" value={newMateria.meta_semanal_horas} onChange={e => setNewMateria({...newMateria, meta_semanal_horas: e.target.value})} className="w-full bg-background border border-outline/20 rounded-xl px-3 py-2 text-sm" placeholder="Ex: 4" />
                     </div>
                     <div>
                        <label className="block text-[10px] uppercase font-bold text-on-surface-variant tracking-wider mb-1">Prioridade</label>
                        <select value={newMateria.prioridade} onChange={e => setNewMateria({...newMateria, prioridade: e.target.value})} className="w-full bg-background border border-outline/20 rounded-xl px-3 py-2 text-sm">
                           <option value="Baixa">Baixa</option>
                           <option value="Média">Média</option>
                           <option value="Alta">Alta</option>
                        </select>
                     </div>
                     <div>
                        <label className="block text-[10px] uppercase font-bold text-on-surface-variant tracking-wider mb-1">Peso/Importância</label>
                        <select value={newMateria.peso_importancia} onChange={e => setNewMateria({...newMateria, peso_importancia: e.target.value})} className="w-full bg-background border border-outline/20 rounded-xl px-3 py-2 text-sm">
                           <option value="Baixo">Baixo</option>
                           <option value="Médio">Médio</option>
                           <option value="Alto">Alto</option>
                        </select>
                     </div>
                  </div>
                  <div className="pt-4 border-t border-outline/10 col-span-full">
                    <h4 className="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider mb-3">Faltas Anteriores</h4>
                    
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      <button
                        type="button"
                        onClick={() => setRetroFaltasOption('none')}
                        className={`text-xs py-2 rounded-xl transition-colors border ${retroFaltasOption === 'none' ? 'bg-primary/10 border-primary/30 text-primary font-bold' : 'bg-surface-container-low border-outline/10 text-on-surface-variant hover:bg-surface-variant'}`}
                      >
                        Não tive
                      </button>
                      <button
                        type="button"
                        onClick={() => setRetroFaltasOption('quantidade')}
                        className={`text-xs py-2 rounded-xl transition-colors border ${retroFaltasOption === 'quantidade' ? 'bg-primary/10 border-primary/30 text-primary font-bold' : 'bg-surface-container-low border-outline/10 text-on-surface-variant hover:bg-surface-variant'}`}
                      >
                        Qtd total
                      </button>
                      <button
                        type="button"
                        onClick={() => setRetroFaltasOption('detalhado')}
                        className={`text-xs py-2 rounded-xl transition-colors border ${retroFaltasOption === 'detalhado' ? 'bg-primary/10 border-primary/30 text-primary font-bold' : 'bg-surface-container-low border-outline/10 text-on-surface-variant hover:bg-surface-variant'}`}
                      >
                        Por data
                      </button>
                    </div>

                    {retroFaltasOption === 'quantidade' && (
                      <div className="animate-in slide-in-from-top-2">
                        <label className="block text-[10px] uppercase font-bold text-on-surface-variant tracking-wider mb-2">Quantas faltas você já teve?</label>
                        <input
                          type="number"
                          min="1"
                          value={retroFaltasQuant || ''}
                          onChange={e => setRetroFaltasQuant(Number(e.target.value))}
                          className="w-full bg-background border border-outline/20 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors"
                          placeholder="Ex: 4"
                        />
                      </div>
                    )}

                    {retroFaltasOption === 'detalhado' && (
                      <div className="space-y-3 animate-in slide-in-from-top-2">
                        {retroFaltasLista.map((falta, idx) => (
                          <div key={idx} className="flex gap-2 items-start p-2 border border-outline/10 rounded-xl bg-background">
                            <div className="flex-1 space-y-2">
                              <DateInputMasked
                                value={falta.data}
                                onChange={e => {
                                  const list = [...retroFaltasLista];
                                  list[idx].data = e.target.value;
                                  setRetroFaltasLista(list);
                                }}
                                className="[&_input]:py-1 [&_input]:text-xs [&_input]:bg-surface-container"
                              />
                              <div className="flex gap-2">
                                <select 
                                  value={falta.tipo_falta}
                                  onChange={e => {
                                    const list = [...retroFaltasLista];
                                    list[idx].tipo_falta = e.target.value;
                                    setRetroFaltasLista(list);
                                  }}
                                  className="bg-surface-container border border-outline/10 rounded-lg px-2 py-1 text-[10px] flex-1"
                                >
                                  <option value="comum">Comum</option>
                                  <option value="com_atestado">C/ Atestado</option>
                                  <option value="justificada">Justificada</option>
                                </select>
                                <select 
                                  value={falta.status_reposicao}
                                  onChange={e => {
                                    const list = [...retroFaltasLista];
                                    list[idx].status_reposicao = e.target.value;
                                    setRetroFaltasLista(list);
                                  }}
                                  className="bg-surface-container border border-outline/10 rounded-lg px-2 py-1 text-[10px] flex-1"
                                >
                                  <option value="pendente">A repor</option>
                                  <option value="recuperado">Reposta</option>
                                  <option value="nao_precisa">Não precisa</option>
                                </select>
                                <input
                                  type="number"
                                  min="1"
                                  value={falta.quantidade}
                                  onChange={e => {
                                    const list = [...retroFaltasLista];
                                    list[idx].quantidade = Number(e.target.value);
                                    setRetroFaltasLista(list);
                                  }}
                                  className="bg-surface-container border border-outline/10 rounded-lg px-2 py-1 text-[10px] w-12 text-center"
                                  placeholder="Qtd"
                                />
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                const list = [...retroFaltasLista];
                                list.splice(idx, 1);
                                setRetroFaltasLista(list);
                              }}
                              className="p-1.5 text-on-surface-variant hover:text-error hover:bg-error/10 rounded-lg transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => setRetroFaltasLista([...retroFaltasLista, { data: newMateria.periodo_inicio || new Date().toISOString().split('T')[0], tipo_falta: 'comum', status_reposicao: 'pendente', quantidade: 2 }])}
                          className="w-full py-2 border border-dashed border-primary/30 text-primary rounded-xl text-xs font-bold hover:bg-primary/5 transition-colors"
                        >
                          + Adicionar Falta
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  {form.recorrente ?? true ? (
                    <>
                      <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">
                        Dias da Semana *
                      </label>
                      <DaySelector 
                        selectedDays={form.dias_semana || []} 
                        onChange={days => setForm({...form, dias_semana: days})} 
                      />
                    </>
                  ) : (
                    <>
                      <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">
                        Data Específica *
                      </label>
                      <DateInputMasked
                        required
                        value={form.data_especifica || ''}
                        onChange={e => setForm({...form, data_especifica: e.target.value})}
                      />
                    </>
                  )}
                  <label className="flex items-center gap-3 mt-4 p-3 border border-outline/20 rounded-xl cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.recorrente ?? true}
                      onChange={e => setForm({...form, recorrente: e.target.checked})}
                      className="w-4 h-4 rounded text-primary focus:ring-primary"
                    />
                    <div>
                      <p className="text-sm font-bold text-on-surface">Repete semanalmente?</p>
                    </div>
                  </label>
                </div>
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Cor (Específica do Bloco)</label>
                  <div className="bg-background border border-outline/20 rounded-xl p-3">
                    <ColorTokenPicker 
                      value={form.cor || ''} 
                      onChange={(cor) => setForm({...form, cor})} 
                      allowEmpty={true}
                      emptyLabel="Herdar da Matéria"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Início *</label>
                  <TimeInputMasked
                    required
                    value={form.hora_inicio || ''}
                    onChange={e => setForm({...form, hora_inicio: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Fim *</label>
                  <TimeInputMasked
                    required
                    value={form.hora_fim || ''}
                    onChange={e => setForm({...form, hora_fim: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Professor(a)</label>
                  <input
                    type="text"
                    value={form.professor || ''}
                    onChange={e => {
                      setForm({...form, professor: e.target.value});
                      setUserEditedProfessor(true);
                    }}
                    className="w-full bg-background border border-outline/20 rounded-xl px-4 py-3 text-sm text-on-surface focus:outline-none focus:border-primary transition-colors"
                  />
                  {!userEditedProfessor && form.professor && !horarioToEdit && (
                    <p className="text-[10px] text-on-surface-variant italic mt-1">Sincronizado da matéria</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Local/Sala</label>
                  <input
                    type="text"
                    value={form.local || ''}
                    onChange={e => setForm({...form, local: e.target.value})}
                    className="w-full bg-background border border-outline/20 rounded-xl px-4 py-3 text-sm text-on-surface focus:outline-none focus:border-primary transition-colors"
                  />
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-outline/10">
                <h3 className="text-sm font-bold text-on-surface mb-1">Vigência do horário</h3>
                <p className="text-xs text-on-surface-variant mb-4">
                  Por padrão, acompanha o período da matéria. Edite apenas se este horário tiver uma vigência diferente.
                </p>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Início da vigência</label>
                    <DateInputMasked
                      value={form.data_inicio_vigencia || ''}
                      onChange={e => {
                        setForm({...form, data_inicio_vigencia: e.target.value});
                        setUserEditedInicioVigencia(true);
                      }}
                    />
                    {!userEditedInicioVigencia && form.data_inicio_vigencia && (
                       <p className="text-[10px] text-primary mt-1">Vigência herdada do período da matéria</p>
                    )}
                  </div>
                  <div>
                     <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Fim da vigência</label>
                    <DateInputMasked
                      value={form.data_fim_vigencia || ''}
                      onChange={e => {
                        setForm({...form, data_fim_vigencia: e.target.value});
                        setUserEditedFimVigencia(true);
                      }}
                    />
                    {!userEditedFimVigencia && form.data_fim_vigencia && (
                       <p className="text-[10px] text-primary mt-1">Vigência herdada do período da matéria</p>
                    )}
                  </div>
                </div>
              </div>

            </div>
          </form>
        </div>

        <div className="p-6 border-t border-outline/5 flex justify-between gap-3 bg-surface-container-low rounded-b-3xl">
          {horarioToEdit?.id ? (
            <button
              type="button"
              onClick={() => {
                if (form.materia_id) {
                  setDeletingMode(true);
                } else {
                  requestConfirm({
                    title: 'Excluir Horário',
                    message: 'Deseja realmente excluir este horário da sua grade? Isso removerá todas as ocorrências futuras pendentes.',
                    onConfirm: async () => {
                      setLoading(true);
                      console.log('[Excluir Horário] Iniciando exclusão sem matéria vinculada', { id: horarioToEdit.id });
                      try {
                        if (!horarioToEdit.id) throw new Error('ID do horário não encontrado');
                        await availabilityService.deleteGradeFaculdade(horarioToEdit.id, user.id);
                        toast.success('Horário removido com sucesso');
                        onClose();
                      } catch (e: any) {
                        console.error('[Excluir Horário] Erro na exclusão sem matéria:', e);
                        const errorMsg = e instanceof Error ? e.message : String(e);
                        toast.error(`Erro ao excluir horário: ${errorMsg}`);
                      } finally {
                        setLoading(false);
                      }
                    }
                  });
                }
              }}
              className="px-6 py-2.5 rounded-xl text-sm font-bold text-error bg-error/10 hover:bg-error/20 transition-colors"
            >
              Excluir
            </button>
          ) : (
            <div />
          )}
          
          <div className="flex gap-3 relative">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl text-sm font-bold text-on-surface hover:bg-surface-variant transition-colors"
            >
              Cancelar
            </button>
            <button
              form="horario-form"
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-xl text-sm font-bold bg-primary text-on-primary hover:bg-primary-container transition-colors disabled:opacity-50"
            >
              {loading ? 'Salvando...' : 'Salvar Horário'}
            </button>
          </div>
        </div>
      </div>

      {deletingMode && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface border border-outline/10 rounded-3xl w-full max-w-md shadow-2xl p-6 flex flex-col gap-6 animate-in zoom-in-95 duration-200">
            <div>
              <h3 className="text-xl font-bold text-on-surface mb-2">Excluir Horário</h3>
              <p className="text-sm text-on-surface-variant font-medium">
                Este horário está vinculado a uma matéria. O que deseja fazer?
              </p>
              <div className="mt-4 p-3 bg-primary/5 border border-primary/20 rounded-xl">
                 <p className="text-xs text-on-surface font-medium leading-relaxed">
                   <strong className="text-primary">Aviso importante:</strong> Excluir um horário <strong className="font-bold">nunca exclui a matéria</strong>. O histórico, notas e aulas continuam salvos.
                 </p>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={async () => {
                  setLoading(true);
                  console.log('[Excluir Horário] Opção 1: Apenas este horário', { id: horarioToEdit?.id, materia_id: form.materia_id });
                  try {
                    await availabilityService.deleteGradeFaculdade(horarioToEdit!.id!, user.id);
                    toast.success('Horário excluído da grade');
                    setDeletingMode(false);
                    onClose();
                  } catch(e: any) {
                    console.error('[Excluir Horário] Erro na Opção 1:', e);
                    const errorMsg = e instanceof Error ? e.message : String(e);
                    toast.error(`Erro ao excluir: ${errorMsg}`);
                  } finally { setLoading(false); }
                }}
                className="w-full bg-surface-container hover:bg-surface-variant p-4 rounded-2xl flex flex-col items-start gap-1 text-left transition-colors"
                disabled={loading}
              >
                <div className="text-sm font-bold text-on-surface">1. Excluir apenas este horário</div>
                <div className="text-xs text-on-surface-variant">A matéria continuará na grade em outros dias.</div>
              </button>

              <button
                onClick={async () => {
                  setLoading(true);
                  console.log('[Excluir Horário] Opção 2: Todos os horários da matéria', { materia_id: form.materia_id });
                  try {
                    // Remover TODOS com essa materia_id
                    const qAll = query(collection(db, 'grade_faculdade'), where('user_id', '==', user.id), where('materia_id', '==', form.materia_id));
                    const snap = await getDocs(qAll);
                    console.log(`[Excluir Horário] Encontrados ${snap.docs.length} horários para a matéria ${form.materia_id}`);
                    await Promise.all(snap.docs.map(d => availabilityService.deleteGradeFaculdade(d.id, user.id)));
                    toast.success('Todos os horários da grade foram removidos.');
                    setDeletingMode(false);
                    onClose();
                  } catch(e: any) {
                    console.error('[Excluir Horário] Erro na Opção 2:', e);
                    const errorMsg = e instanceof Error ? e.message : String(e);
                    toast.error(`Erro ao excluir todos os horários: ${errorMsg}`);
                  } finally { setLoading(false); }
                }}
                className="w-full bg-surface-container hover:bg-surface-variant p-4 rounded-2xl flex flex-col items-start gap-1 text-left transition-colors"
                disabled={loading}
              >
                <div className="text-sm font-bold text-on-surface">2. Remover todos os horários dessa matéria</div>
                <div className="text-xs text-on-surface-variant">Tira a matéria da grade futura.</div>
              </button>

              <button
                onClick={async () => {
                  setLoading(true);
                  console.log('[Excluir Horário] Opção 3: Excluir e concluir matéria', { id: horarioToEdit?.id, materia_id: form.materia_id });
                  try {
                    // Deletar o horário atual
                    await availabilityService.deleteGradeFaculdade(horarioToEdit!.id!, user.id);
                    // Atualizar materia para status concluída
                    await updateDoc(doc(db, 'materias', form.materia_id!), { status: 'concluida' });
                    toast.success('Horário removido e matéria concluída!');
                    setDeletingMode(false);
                    onClose();
                  } catch(e: any) {
                    console.error('[Excluir Horário] Erro na Opção 3:', e);
                    const errorMsg = e instanceof Error ? e.message : String(e);
                    toast.error(`Erro ao processar: ${errorMsg}`);
                  } finally { setLoading(false); }
                }}
                className="w-full bg-success/10 hover:bg-success/20 border border-success/20 p-4 rounded-2xl flex flex-col items-start gap-1 text-left transition-colors"
                disabled={loading}
              >
                <div className="text-sm font-bold text-success">3. Excluir horário e concluir matéria</div>
                <div className="text-xs text-success/80">Marca a matéria como concluída no sistema.</div>
              </button>
            </div>

            <div className="flex justify-end pt-2 border-t border-outline/10">
              <button
                onClick={() => setDeletingMode(false)}
                className="px-6 py-2.5 rounded-xl text-sm font-bold text-on-surface hover:bg-surface-variant transition-colors"
                disabled={loading}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
