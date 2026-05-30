import React, { useState, useEffect } from 'react';
import { X, AlertCircle } from 'lucide-react';
// TODO: A refatoração completa deste modal para usar apiClient foi adiada. 
// Atualmente ele ainda usa firebase/firestore diretamente.
import { collection, query, where, getDocs, addDoc, updateDoc, doc } from 'firebase/firestore'; // TODO: Refatorar
import { db } from '@/lib/firebase'; // TODO: Refatorar
import { apiClient } from '@/lib/api';
import { OcorrenciaGrade } from '@/types/availability';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/lib/toast';
import { formatDuration } from '@/lib/utils';

import { DateInputMasked } from '@/components/ui/DateInputMasked';

interface ModalFaltaManualProps {
  isOpen: boolean;
  onClose: () => void;
  materiaIdProp?: string;
  faltaToEdit?: OcorrenciaGrade;
}

export function ModalFaltaManual({ isOpen, onClose, materiaIdProp, faltaToEdit }: ModalFaltaManualProps) {
  const { user } = useAuth();
  const [materias, setMaterias] = useState<any[]>([]);
  const [topicos, setTopicos] = useState<any[]>([]);
  const [grades, setGrades] = useState<any[]>([]);
  const [aulas, setAulas] = useState<any[]>([]);
  const [sessoes, setSessoes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState<{
    materia_id: string;
    data: string;
    quantidade_ocorrencias: number;
    topico_id: string;
    observacoes: string;
    tipo_falta: 'comum' | 'com_atestado' | 'justificada';
    status_reposicao: 'pendente' | 'recuperado' | 'parcialmente';
    vinculo_tipo: 'observacao' | 'aula' | 'sessao';
    reposicao_aula_id: string;
    reposicao_sessao_id: string;
    reposicao_observacao: string;
  }>({
    materia_id: materiaIdProp || '',
    data: new Date().toISOString().split('T')[0],
    quantidade_ocorrencias: 1,
    topico_id: '',
    observacoes: '',
    tipo_falta: 'comum',
    status_reposicao: 'pendente',
    vinculo_tipo: 'observacao',
    reposicao_aula_id: '',
    reposicao_sessao_id: '',
    reposicao_observacao: ''
  });

  useEffect(() => {
    if (!isOpen || !user) return;
    const fetchMaterias = async () => {
      const q = query(collection(db, 'materias'), where('user_id', '==', user.id));
      const snap = await getDocs(q);
      setMaterias(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    };
    fetchMaterias();
  }, [isOpen, user]);

  useEffect(() => {
    if (!isOpen || !user) return;
    if (faltaToEdit) {
      setForm({
        materia_id: faltaToEdit.materia_id,
        data: faltaToEdit.data,
        quantidade_ocorrencias: faltaToEdit.quantidade_ocorrencias || 1,
        topico_id: faltaToEdit.topico_id || '',
        observacoes: faltaToEdit.observacoes || '',
        tipo_falta: faltaToEdit.tipo_falta || 'comum',
        status_reposicao: faltaToEdit.status_reposicao || 'pendente',
        vinculo_tipo: faltaToEdit.reposicao_aula_id ? 'aula' : faltaToEdit.reposicao_sessao_id ? 'sessao' : 'observacao',
        reposicao_aula_id: faltaToEdit.reposicao_aula_id || '',
        reposicao_sessao_id: faltaToEdit.reposicao_sessao_id || '',
        reposicao_observacao: faltaToEdit.reposicao_observacao || ''
      });
    } else {
      setForm({
        materia_id: materiaIdProp || '',
        data: new Date().toISOString().split('T')[0],
        quantidade_ocorrencias: 1,
        topico_id: '',
        observacoes: '',
        tipo_falta: 'comum',
        status_reposicao: 'pendente',
        vinculo_tipo: 'observacao',
        reposicao_aula_id: '',
        reposicao_sessao_id: '',
        reposicao_observacao: ''
      });
    }
  }, [isOpen, user, faltaToEdit, materiaIdProp]);

  useEffect(() => {
    if (!form.materia_id || !user) {
      setTopicos([]);
      setGrades([]);
      setAulas([]);
      setSessoes([]);
      return;
    }
    const fetchDeps = async () => {
      const qTopico = query(collection(db, 'topicos'), where('user_id', '==', user.id), where('materia_id', '==', form.materia_id));
      const qGrade = query(collection(db, 'grade_faculdade'), where('user_id', '==', user.id), where('materia_id', '==', form.materia_id));
      const qAulas = query(collection(db, 'aulas'), where('user_id', '==', user.id), where('materia_id', '==', form.materia_id));
      const qSessoes = query(collection(db, 'sessoes'), where('user_id', '==', user.id), where('materia_id', '==', form.materia_id));
      
      const [snapTopico, snapGrade, sAulas, sSessoes] = await Promise.all([getDocs(qTopico), getDocs(qGrade), getDocs(qAulas), getDocs(qSessoes)]);
      setTopicos(snapTopico.docs.map(d => ({ id: d.id, ...d.data() })));
      setGrades(snapGrade.docs.map(d => ({ id: d.id, ...d.data() })));
      setAulas(sAulas.docs.map(d => ({ id: d.id, ...d.data() })));
      setSessoes(sSessoes.docs.map(d => ({ id: d.id, ...d.data() })));
    };
    fetchDeps();
  }, [form.materia_id, user]);

  const [duplicateFlow, setDuplicateFlow] = useState<{
    duplicadas: OcorrenciaGrade[];
    payload: any;
  } | null>(null);

  const processDuplicateAction = async (action: 'add' | 'new' | 'cancel') => {
    if (action === 'cancel') {
        setDuplicateFlow(null);
        setLoading(false);
        return;
    }
    
    setLoading(true);
    try {
        if (action === 'add' && duplicateFlow?.duplicadas[0] && duplicateFlow.payload) {
             const existing = duplicateFlow.duplicadas[0];
             await updateDoc(doc(db, 'ocorrencias_grade', existing.id!), {
               quantidade_ocorrencias: (existing.quantidade_ocorrencias || 1) + form.quantidade_ocorrencias,
               updated_at: new Date().toISOString(),
               observacoes: form.observacoes ? `${existing.observacoes || ''}\n${form.observacoes}`.trim() : existing.observacoes
             });
             toast.success('Falta existente atualizada com soma de quantidade!');
             onClose();
        } else if (action === 'new' && duplicateFlow?.payload) {
             duplicateFlow.payload.created_at = new Date().toISOString();
             await addDoc(collection(db, 'ocorrencias_grade'), duplicateFlow.payload);
             toast.success('Falta registrada em paralelo com sucesso!');
             onClose();
        }
    } catch(e) {
       console.error(e);
       toast.error('Erro ao processar duplicidade.');
    } finally {
        setDuplicateFlow(null);
        setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && !faltaToEdit) {
      setDuplicateFlow(null);
    }
  }, [isOpen, faltaToEdit]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    try {
      // Find matching grade
      let grade_id = null;
      if (grades.length > 0 && form.data) {
        const dateObj = new Date(form.data + 'T12:00:00');
        const dayOfWeek = dateObj.getDay();
        const matchingGrades = grades.filter(g => {
          if (!g.ativo) return false;
          if (g.recorrente !== false) {
             return g.dias_semana?.includes(dayOfWeek) || (g as any).dia_semana === dayOfWeek;
          } else {
             return g.data_especifica === form.data;
          }
        });
        if (matchingGrades.length > 0) {
          grade_id = matchingGrades[0].id; // Assign to grade strictly on that day of week
        }
      }
      
      const payload: Partial<OcorrenciaGrade> = {
        user_id: user.id,
        materia_id: form.materia_id,
        data: form.data,
        status: 'falta',
        origem: faltaToEdit?.origem || 'manual', // preserve origin if editing
        quantidade_ocorrencias: form.quantidade_ocorrencias,
        observacoes: form.observacoes,
        tipo_falta: form.tipo_falta,
        status_reposicao: form.status_reposicao,
        updated_at: new Date().toISOString()
      };

      if (form.status_reposicao === 'recuperado' || form.status_reposicao === 'parcialmente') {
         if (form.vinculo_tipo === 'aula' && form.reposicao_aula_id) {
            payload.reposicao_aula_id = form.reposicao_aula_id;
            const a = aulas.find(x => x.id === form.reposicao_aula_id);
            if (a) payload.reposicao_observacao = `Recuperado via aula: ${a.titulo}`;
            payload.reposicao_sessao_id = null;
         } else if (form.vinculo_tipo === 'sessao' && form.reposicao_sessao_id) {
            payload.reposicao_sessao_id = form.reposicao_sessao_id;
            const s = sessoes.find(x => x.id === form.reposicao_sessao_id);
            if (s) payload.reposicao_observacao = `Recuperado via sessão de estudo (${s.data})`;
            payload.reposicao_aula_id = null;
         } else {
            payload.reposicao_observacao = form.reposicao_observacao;
            payload.reposicao_aula_id = null;
            payload.reposicao_sessao_id = null;
         }
      } else {
         payload.reposicao_aula_id = null;
         payload.reposicao_sessao_id = null;
         payload.reposicao_observacao = null;
      }

      if (form.topico_id) payload.topico_id = form.topico_id;
      if (grade_id) payload.grade_id = grade_id;

      if (!faltaToEdit) {
        // Check for duplicates
        const qDup = query(
          collection(db, 'ocorrencias_grade'), 
          where('user_id', '==', user.id),
          where('materia_id', '==', form.materia_id),
          where('data', '==', form.data),
          where('status', '==', 'falta')
        );
        const dupSnap = await getDocs(qDup);
        const duplicadas = dupSnap.docs.map(d => ({id: d.id, ...d.data()} as OcorrenciaGrade));
        
        if (duplicadas.length > 0) {
          setDuplicateFlow({ duplicadas, payload });
          return;
        }
        
        payload.created_at = new Date().toISOString();
        await addDoc(collection(db, 'ocorrencias_grade'), payload);
        toast.success('Falta registrada com sucesso!');
      } else {
        await updateDoc(doc(db, 'ocorrencias_grade', faltaToEdit.id!), payload);
        toast.success('Falta atualizada com sucesso!');
      }

      onClose();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao salvar falta.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-md bg-surface border border-outline/10 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {duplicateFlow ? (
          <div className="absolute inset-0 z-10 bg-surface flex flex-col p-6 text-center shadow-lg justify-center items-center">
             <div className="w-12 h-12 bg-warning/10 text-warning rounded-full flex items-center justify-center mb-4 mx-auto">
                <AlertCircle className="w-6 h-6" />
             </div>
             <h3 className="text-lg font-black text-on-surface mb-2">Falta Duplicada?</h3>
             <p className="text-sm text-on-surface-variant mb-6 text-balance">
                Já existe uma falta registrada para esta matéria no dia <strong>{form.data}</strong>. O que deseja fazer?
             </p>
             <div className="space-y-3 w-full max-w-xs">
                <button
                   onClick={() => processDuplicateAction('add')}
                   className="w-full bg-primary text-on-primary py-3 rounded-xl font-bold hover:brightness-110 active:scale-95 transition-all shadow-md shadow-primary/20"
                >
                   Somar à falta existente
                </button>
                <button
                   onClick={() => processDuplicateAction('new')}
                   className="w-full bg-surface-container border border-outline/10 text-on-surface py-3 rounded-xl font-bold hover:bg-surface-container-high transition-colors"
                >
                   Criar registro separado
                </button>
                <button
                   onClick={() => processDuplicateAction('cancel')}
                   className="w-full bg-transparent text-on-surface-variant py-2.5 rounded-xl text-sm font-bold hover:text-error transition-colors mt-2"
                >
                   Cancelar Registro
                </button>
             </div>
          </div>
        ) : null}

        <div className="flex items-center justify-between p-6 border-b border-outline/10">
          <h2 className="text-xl font-black text-on-surface">
            {faltaToEdit ? 'Editar Falta' : 'Registrar Falta'}
          </h2>
          <button onClick={onClose} className="p-2 bg-surface-container hover:bg-surface-container-high rounded-full transition-colors">
            <X className="w-5 h-5 text-on-surface-variant" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Matéria *</label>
            <select
              required
              value={form.materia_id}
              onChange={e => setForm({...form, materia_id: e.target.value})}
              className="w-full bg-surface-container border border-outline/10 rounded-xl px-4 py-3 text-sm text-on-surface focus:outline-none focus:border-primary transition-colors"
            >
              <option value="">Selecione...</option>
              {materias.map(m => (
                <option key={m.id} value={m.id}>{m.nome}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Data *</label>
              <DateInputMasked
                required
                value={form.data}
                onValueChange={val => setForm({...form, data: val})}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Quantidade *</label>
              <input
                type="number"
                required
                min="1"
                value={form.quantidade_ocorrencias}
                onChange={e => setForm({...form, quantidade_ocorrencias: parseInt(e.target.value) || 1})}
                className="w-full bg-surface-container border border-outline/10 rounded-xl px-4 py-3 text-sm text-on-surface focus:outline-none focus:border-primary transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Tópico (Opcional)</label>
              <select
                value={form.topico_id}
                onChange={e => setForm({...form, topico_id: e.target.value})}
                className="w-full bg-surface-container border border-outline/10 rounded-xl px-4 py-3 text-sm text-on-surface focus:outline-none focus:border-primary transition-colors"
              >
                <option value="">Nenhum tópico associado</option>
                {topicos.map(t => (
                  <option key={t.id} value={t.id}>{t.nome}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Tipo de Falta</label>
              <select
                value={form.tipo_falta}
                onChange={e => setForm({...form, tipo_falta: e.target.value as any})}
                className="w-full bg-surface-container border border-outline/10 rounded-xl px-4 py-3 text-sm text-on-surface focus:outline-none focus:border-primary transition-colors"
              >
                <option value="comum">Falta normal</option>
                <option value="com_atestado">Falta com Atestado Médico</option>
                <option value="justificada">Falta Justificada</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Status da Reposição</label>
            <select
              value={form.status_reposicao}
              onChange={e => setForm({...form, status_reposicao: e.target.value as any})}
              className="w-full bg-surface-container border border-outline/10 rounded-xl px-4 py-3 text-sm text-on-surface focus:outline-none focus:border-primary transition-colors"
            >
              <option value="pendente">Pendente</option>
              <option value="recuperado">Conteúdo Recuperado</option>
              <option value="parcialmente">Parcialmente Recuperado</option>
            </select>
          </div>

          {(form.status_reposicao === 'recuperado' || form.status_reposicao === 'parcialmente') && (
            <div className="animate-in fade-in zoom-in slide-in-from-top-2 duration-300 space-y-4">
              <div>
                 <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Como foi recuperado?</label>
                 <select 
                   value={form.vinculo_tipo} 
                   onChange={e => setForm({...form, vinculo_tipo: e.target.value as any})}
                   className="w-full bg-surface-container border border-outline/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors"
                 >
                    <option value="observacao">Observação Manual</option>
                    <option value="aula">Vincular a uma Aula Registrada</option>
                    <option value="sessao">Vincular a uma Sessão de Estudo</option>
                 </select>
              </div>

              {form.vinculo_tipo === 'aula' && (
                 <div className="animate-in fade-in slide-in-from-top-2">
                   <label className="block text-xs font-bold text-primary uppercase tracking-wider mb-2">Selecione a Aula</label>
                   <select 
                     value={form.reposicao_aula_id} 
                     onChange={e => setForm({...form, reposicao_aula_id: e.target.value})}
                     required
                     className="w-full bg-primary/5 border border-primary/20 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary text-on-surface transition-colors"
                   >
                      <option value="">Selecione uma aula...</option>
                      {aulas.map(a => <option key={a.id} value={a.id}>{a.data} - {a.titulo}</option>)}
                      {aulas.length === 0 && <option value="" disabled>Nenhuma aula encontrada</option>}
                   </select>
                 </div>
              )}

              {form.vinculo_tipo === 'sessao' && (
                 <div className="animate-in fade-in slide-in-from-top-2">
                   <label className="block text-xs font-bold text-primary uppercase tracking-wider mb-2">Selecione a Sessão</label>
                   <select 
                     value={form.reposicao_sessao_id} 
                     onChange={e => setForm({...form, reposicao_sessao_id: e.target.value})}
                     required
                     className="w-full bg-primary/5 border border-primary/20 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary text-on-surface transition-colors"
                   >
                      <option value="">Selecione uma sessão...</option>
                      {sessoes.map(s => <option key={s.id} value={s.id}>{s.data} - {s.hhmmss || formatDuration((s.duracao || 0) * 60)}</option>)}
                      {sessoes.length === 0 && <option value="" disabled>Nenhuma sessão encontrada</option>}
                   </select>
                 </div>
              )}

              {form.vinculo_tipo === 'observacao' && (
                 <div className="animate-in fade-in slide-in-from-top-2">
                   <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Observação</label>
                   <textarea 
                     value={form.reposicao_observacao} 
                     onChange={e => setForm({...form, reposicao_observacao: e.target.value})}
                     rows={3}
                     placeholder="Descreva como o conteúdo foi recuperado"
                     className="w-full bg-surface-container border border-outline/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors resize-none"
                   />
                 </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Observações</label>
            <textarea
              value={form.observacoes}
              onChange={e => setForm({...form, observacoes: e.target.value})}
              rows={3}
              placeholder="Ex: Faltei porque estava doente..."
              className="w-full bg-surface-container border border-outline/10 rounded-xl px-4 py-3 text-sm text-on-surface focus:outline-none focus:border-primary transition-colors resize-none placeholder:text-outline"
            />
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-6 py-3 rounded-xl font-bold text-sm text-on-surface-variant hover:bg-surface-container transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-primary text-on-primary rounded-xl font-black text-sm uppercase tracking-wider shadow-lg shadow-primary/20 hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
            >
              {loading ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
