import React, { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/lib/toast';
import { OcorrenciaGrade } from '@/types/availability';
import { formatDuration, safeFormat, parseValidDate } from '@/lib/utils';

interface ModalRecuperarFaltaProps {
  isOpen: boolean;
  onClose: () => void;
  faltaToRecuperar?: OcorrenciaGrade;
}

export function ModalRecuperarFalta({ isOpen, onClose, faltaToRecuperar }: ModalRecuperarFaltaProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [aulas, setAulas] = useState<any[]>([]);
  const [sessoes, setSessoes] = useState<any[]>([]);
  
  const [form, setForm] = useState({
     status_reposicao: 'recuperado',
     vinculo_tipo: 'observacao',
     reposicao_aula_id: '',
     reposicao_sessao_id: '',
     reposicao_observacao: ''
  });

  useEffect(() => {
    if (isOpen && user && faltaToRecuperar) {
      setForm({
         status_reposicao: 'recuperado',
         vinculo_tipo: 'observacao',
         reposicao_aula_id: '',
         reposicao_sessao_id: '',
         reposicao_observacao: faltaToRecuperar.reposicao_observacao || ''
      });
      
      const fetchRelated = async () => {
         try {
            const [aulasRes, sessoesRes] = await Promise.all([
               apiClient.get(`/aulas?materia_id=${faltaToRecuperar.materia_id}`),
               apiClient.get(`/sessoes?materia_id=${faltaToRecuperar.materia_id}`)
            ]);
            setAulas(aulasRes.data || []);
            setSessoes(sessoesRes.data || []);
         } catch (e) {
            console.error(e);
         }
      };
      fetchRelated();
    }
  }, [isOpen, user, faltaToRecuperar]);

  if (!isOpen || !faltaToRecuperar) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
       const payload: any = {
         status: 'falta',
         status_reposicao: form.status_reposicao,
         updated_at: new Date().toISOString()
       };
       
       if (form.vinculo_tipo === 'aula' && form.reposicao_aula_id) {
          payload.reposicao_aula_id = form.reposicao_aula_id;
          const a = aulas.find(x => x.id === form.reposicao_aula_id);
          if (a) payload.reposicao_observacao = `Recuperado via aula: ${a.titulo}`;
       } else if (form.vinculo_tipo === 'sessao' && form.reposicao_sessao_id) {
          payload.reposicao_sessao_id = form.reposicao_sessao_id;
          const s = sessoes.find(x => x.id === form.reposicao_sessao_id);
          if (s) payload.reposicao_observacao = `Recuperado via sessão de estudo (${s.data})`;
       } else {
          payload.reposicao_observacao = form.reposicao_observacao;
          payload.reposicao_aula_id = null;
          payload.reposicao_sessao_id = null;
       }

       await apiClient.patch(`/ocorrencias/${faltaToRecuperar.id}`, payload);
       toast.success('Falta atualizada com sucesso!');
       onClose();
    } catch(err) {
       console.error(err);
       toast.error('Erro ao atualizar falta.');
    } finally {
       setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-surface border border-outline/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        
        <div className="p-6 border-b border-outline/10 flex items-center justify-between bg-surface-container-lowest">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-on-surface">Resolver Pendência</h2>
            <p className="text-sm text-on-surface-variant mt-1">Falta do dia {faltaToRecuperar.data}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-surface-variant rounded-full transition-colors text-on-surface-variant">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar bg-surface-container-lowest">
          <form id="recuperarForm" onSubmit={handleSubmit} className="space-y-6">
             
            <div>
               <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Status da Reposição</label>
               <select 
                 value={form.status_reposicao} 
                 onChange={e => setForm({...form, status_reposicao: e.target.value})}
                 className="w-full bg-surface-container border border-outline/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors"
               >
                  <option value="recuperado">Totalmente Recuperado</option>
                  <option value="parcialmente">Parcialmente Recuperado</option>
               </select>
            </div>

            <div>
               <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Como foi recuperado?</label>
               <select 
                 value={form.vinculo_tipo} 
                 onChange={e => setForm({...form, vinculo_tipo: e.target.value})}
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

          </form>
        </div>

        <div className="p-6 border-t border-outline/10 bg-surface-container flex gap-3 flex-shrink-0">
          <button type="button" onClick={onClose} disabled={loading} className="flex-1 px-4 py-3 rounded-xl font-bold text-sm text-on-surface-variant hover:bg-surface-variant transition-colors">
            Cancelar
          </button>
          <button type="submit" form="recuperarForm" disabled={loading} className="flex-[2] flex items-center justify-center gap-2 bg-primary text-on-primary rounded-xl font-black text-sm uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-primary/20 disabled:opacity-50">
            {loading ? 'Salvando...' : <><Check className="w-4 h-4" /> Registrar</>}
          </button>
        </div>
      </div>
    </div>
  );
}
