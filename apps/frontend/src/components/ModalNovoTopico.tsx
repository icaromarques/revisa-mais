import React, { useState, useEffect } from 'react';
import { X, CheckCircle, BrainCircuit, Star, Hash, AlignLeft, Calendar } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/lib/toast';

interface ModalNovoTopicoProps {
  isOpen: boolean;
  onClose: () => void;
  topicoAtual: any;
  materiaId: string;
}

export function ModalNovoTopico({ isOpen, onClose, topicoAtual, materiaId }: ModalNovoTopicoProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const initialForm = {
    nome: '',
    descricao: '',
    professor: '',
    status_dominio: 'nao_vi',
    dificuldade: 'media',
    prioridade: 'media',
    peso: '1',
    observacoes: '',
    tags: '',
    auto_revisao: false
  };

  const [form, setForm] = useState(initialForm);
  const [userEditedProfessor, setUserEditedProfessor] = useState(false);
  
  useEffect(() => {
    if (isOpen && materiaId && !topicoAtual) {
      // Auto-fill form professor from materia if new topic
      apiClient.get(`/materias/${materiaId}`).then(res => {
          if (res.data && res.data.professor && !userEditedProfessor) {
             setForm(f => ({...f, professor: res.data.professor}));
          }
      }).catch(console.error);
    }
  }, [isOpen, materiaId, topicoAtual, userEditedProfessor]);

  useEffect(() => {
    if (isOpen) {
      if (topicoAtual) {
        setForm({ 
          ...initialForm, 
          ...topicoAtual,
          tags: topicoAtual.tags ? (Array.isArray(topicoAtual.tags) ? topicoAtual.tags.join(', ') : topicoAtual.tags) : ''
        });
      } else {
        setForm(initialForm);
      }
    }
  }, [isOpen, topicoAtual]);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !materiaId || !form.nome.trim()) return;

    setLoading(true);
    try {
      const topicoData = {
        user_id: user.id,
        materia_id: materiaId,
        nome: form.nome,
        descricao: form.descricao,
        professor: form.professor,
        status_dominio: form.status_dominio,
        dificuldade: form.dificuldade,
        prioridade: form.prioridade,
        peso: Number(form.peso) || 1,
        observacoes: form.observacoes,
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
        updated_at: new Date().toISOString()
      };

      if (topicoAtual?.id) {
        await apiClient.put(`/topicos/${topicoAtual.id}`, topicoData);
        toast.success("Tópico atualizado com sucesso!");
      } else {
        await apiClient.post('/topicos', {
          ...topicoData,
          status: 'em_andamento', // compatibility
        });
        toast.success("Tópico criado com sucesso!");
      }

      setLoading(false);
      onClose();
    } catch (error) {
      console.error(error);
      setLoading(false);
      toast.error('Erro ao salvar tópico. Tente novamente.');
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-background/80 backdrop-blur-md overflow-y-auto pt-20">
      <div className="w-full max-w-2xl glass-panel rounded-2xl shadow-2xl flex flex-col animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between p-6 border-b border-outline bg-surface-container-low/50">
          <div>
            <h2 className="text-xl font-bold text-on-surface flex items-center gap-2">
              <Hash className="w-5 h-5 text-primary" /> 
              {topicoAtual ? 'Editar Tópico' : 'Novo Tópico'}
            </h2>
            <p className="text-sm text-on-surface-variant mt-1">Organize o conteúdo e seu domínio de estudo.</p>
          </div>
          <button type="button" onClick={onClose} className="p-2 hover:bg-surface-variant rounded-full transition-colors text-on-surface-variant">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Content */}
        <form id="topicoForm" onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6">
          <div>
            <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Nome do Tópico *</label>
            <input 
              type="text" 
              value={form.nome} 
              onChange={e => setForm({...form, nome: e.target.value})} 
              required 
              placeholder="Ex: Direitos Fundamentais, Membrana Plasmática" 
              className="w-full bg-surface-container border border-outline rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors" 
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Descrição Rápida</label>
            <textarea 
              value={form.descricao} 
              onChange={e => setForm({...form, descricao: e.target.value})} 
              placeholder="O que abrange este tópico?" 
              className="w-full bg-surface-container border border-outline rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors min-h-[80px]" 
            />
          </div>

          <div>
             <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Professor / Docente</label>
             <input 
               type="text" 
               value={form.professor} 
               onChange={e => {
                 setForm({...form, professor: e.target.value});
                 setUserEditedProfessor(true);
               }} 
               placeholder="Nome do professor ou docente" 
               className="w-full bg-surface-container border border-outline rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors" 
             />
             {!userEditedProfessor && form.professor && !topicoAtual && (
                <p className="text-[10px] text-on-surface-variant italic mt-1">Preenchido automaticamente com base na matéria</p>
             )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Domínio Atual</label>
              <select 
                value={form.status_dominio} 
                onChange={e => setForm({...form, status_dominio: e.target.value})} 
                className="w-full bg-surface-container border border-outline rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors"
              >
                <option value="nao_vi">Não vi ainda</option>
                <option value="estudando">Estudando / Aula</option>
                <option value="revisao_inicial">Revisão Inicial</option>
                <option value="revisao_intermediaria">Revisão Intermediária</option>
                <option value="dominado">Dominado</option>
              </select>
            </div>
            <div>
               <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Prioridade</label>
               <select 
                 value={form.prioridade} 
                 onChange={e => setForm({...form, prioridade: e.target.value})} 
                 className="w-full bg-surface-container border border-outline rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors"
               >
                 <option value="baixa">Baixa</option>
                 <option value="media">Média</option>
                 <option value="alta">Alta</option>
               </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
             <div>
               <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Dificuldade</label>
               <select 
                 value={form.dificuldade} 
                 onChange={e => setForm({...form, dificuldade: e.target.value})} 
                 className="w-full bg-surface-container border border-outline rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors"
               >
                 <option value="facil">Fácil</option>
                 <option value="media">Média</option>
                 <option value="dificil">Difícil</option>
               </select>
             </div>
             <div>
               <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Peso / Importância na Prova (1 a 10)</label>
               <input 
                 type="number" 
                 min="1" max="10"
                 value={form.peso} 
                 onChange={e => setForm({...form, peso: e.target.value})} 
                 className="w-full bg-surface-container border border-outline rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors"
               />
             </div>
          </div>

          <div>
             <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Tags (Separadas por vírgula)</label>
             <input 
               type="text" 
               value={form.tags} 
               onChange={e => setForm({...form, tags: e.target.value})} 
               placeholder="Ex: teoria, pratica, lei_seca" 
               className="w-full bg-surface-container border border-outline rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors" 
             />
          </div>

          <div>
            <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Observações Pessoais</label>
            <textarea 
              value={form.observacoes} 
              onChange={e => setForm({...form, observacoes: e.target.value})} 
              placeholder="Anotações de rodapé, o que focar etc." 
              className="w-full bg-surface-container border border-outline rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors min-h-[80px]" 
            />
          </div>

        </form>

        {/* Footer */}
        <div className="shrink-0 flex items-center justify-end gap-3 p-4 border-t border-outline bg-surface-container-low/80 backdrop-blur-sm">
          <button 
            type="button" 
            onClick={onClose}
            className="px-6 py-2 text-sm font-bold text-on-surface-variant hover:text-on-surface transition-colors"
          >
            Cancelar
          </button>
          <button 
            type="submit" 
            form="topicoForm"
            disabled={loading}
            className="px-8 py-2.5 bg-primary text-on-primary text-sm font-bold rounded-xl hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? 'Salvando...' : 'Salvar Tópico'}
          </button>
        </div>

      </div>
    </div>
  );
}
