import React, { useState } from 'react';
import { EventoAcademico } from '@/types/calendar';
import { Plus, Trash2, Edit2, CheckCircle, Target, Award, ChevronDown, ChevronUp } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { availabilityService } from '@/services/availabilityService';
import { toast } from '@/lib/toast';
import { parseValidDate } from '@/lib/utils';
import { useConfirm } from '@/contexts/ConfirmContext';
import { getCalendarRenderKey } from '@/lib/calendar-utils';

interface AvaliacoesNotasTabProps {
  materia: any;
  notas: any[];
  events: EventoAcademico[];
}

export function AvaliacoesNotasTab({ materia, notas, events }: AvaliacoesNotasTabProps) {
  const { user } = useAuth();
  const { requestConfirm } = useConfirm();
  const [loading, setLoading] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNota, setEditingNota] = useState<any>(null);

  const [form, setForm] = useState({
    nome: '',
    tipo: 'prova',
    data: '',
    nota_obtida: '',
    nota_maxima: '10',
    peso: '1',
    observacoes: '',
    status: 'lancada'
  });

  const mediaFinal = notas.reduce((acc, curr) => {
    if (curr.nota_obtida !== null && curr.nota_obtida !== undefined && curr.status === 'lancada') {
      return acc + (Number(curr.nota_obtida) * Number(curr.peso));
    }
    return acc;
  }, 0) / (notas.reduce((acc, curr) => curr.status === 'lancada' && curr.nota_obtida !== null ? acc + Number(curr.peso) : acc, 0) || 1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    try {
      const payload = {
        materia_id: materia.id,
        user_id: user.id,
        nome: form.nome,
        tipo: form.tipo,
        data: form.data,
        nota_obtida: form.nota_obtida ? Number(form.nota_obtida) : null,
        nota_maxima: Number(form.nota_maxima),
        peso: Number(form.peso),
        observacoes: form.observacoes,
        status: form.status,
      };

      if (editingNota) {
        await apiClient.put(`/notas/${editingNota.id}`, payload);
        toast.success("Nota atualizada com sucesso");
      } else {
        await apiClient.post('/notas', payload);
        toast.success("Nota registrada com sucesso");
      }
      setIsModalOpen(false);
    } catch (error) {
      toast.error("Erro ao salvar nota");
      handleFirestoreError(error, OperationType.WRITE, 'notas_materia');
    } finally {
      setLoading(false);
    }
  };

  const openNew = () => {
    setEditingNota(null);
    setForm({
      nome: '',
      tipo: 'prova',
      data: new Date().toISOString().substring(0,10),
      nota_obtida: '',
      nota_maxima: '10',
      peso: '1',
      observacoes: '',
      status: 'lancada'
    });
    setIsModalOpen(true);
  };

  const openEdit = (nota: any) => {
    setEditingNota(nota);
    setForm({
      nome: nota.nome,
      tipo: nota.tipo,
      data: nota.data || '',
      nota_obtida: nota.nota_obtida ? String(nota.nota_obtida) : '',
      nota_maxima: String(nota.nota_maxima || 10),
      peso: String(nota.peso || 1),
      observacoes: nota.observacoes || '',
      status: nota.status || 'lancada'
    });
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    requestConfirm({
      title: 'Excluir Avaliação',
      message: 'Deseja realmente excluir esta nota?',
      onConfirm: async () => {
        try {
          await apiClient.delete(`/notas/${id}`);
          toast.success("Nota excluída");
        } catch(e) {
          toast.error("Erro ao excluir");
        }
      }
    });
  };

  const handleStatusChange = async (newStatus: string) => {
    requestConfirm({
      title: `Marcar matéria como ${newStatus.toUpperCase()}`,
      message: `Deseja atualizar a situação acadêmica da matéria para '${newStatus}'?`,
      onConfirm: async () => {
        try {
          await apiClient.patch(`/materias/${materia.id}`, { status: newStatus });
          toast.success("Status atualizado!");

          if (['aprovada', 'concluida'].includes(newStatus)) {
            requestConfirm({
              title: "Remover da Grade Futura?",
              message: "Como a matéria foi encerrada, deseja remover todos os horários futuros desta matéria na grade?",
              onConfirm: async () => {
                if (!user) return;
                try {
                  const grades = await availabilityService.getGradeFaculdade(user.id);
                  const gradesToDel = grades.filter((g: any) => g.materia_id === materia.id);
                  await Promise.all(gradesToDel.map((d: any) => availabilityService.deleteGradeFaculdade(d.id, user.id)));
                  toast.success("Horários da grade removidos.");
                } catch(e) {
                  toast.error("Erro ao remover horários: " + String(e));
                }
              }
            });
          }
        } catch(e) {
           toast.error("Erro ao atualizar status");
        }
      }
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Status Widget */}
        <div className="glass-panel p-6 rounded-2xl border-l-4 border-l-primary flex flex-col gap-4">
          <div>
            <h3 className="text-xl font-bold flex items-center gap-2">
               <Target className="w-5 h-5 text-primary" /> Situação da Matéria
            </h3>
            <p className="text-sm text-on-surface-variant">Resultado e status acadêmico atual</p>
          </div>
          
          <div className="flex items-center justify-between mt-2">
            <div>
              <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider block mb-1">Status Atual</span>
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider
                ${materia.status === 'aprovada' ? 'bg-success/20 text-success' : 
                  materia.status === 'reprovada' ? 'bg-error/20 text-error' : 
                  materia.status === 'concluida' ? 'bg-tertiary/20 text-tertiary' : 
                  materia.status === 'trancada' ? 'bg-on-surface-variant/20 text-on-surface-variant' :
                  'bg-primary/20 text-primary'}
              `}>
                {materia.status?.replace('_', ' ') || 'Em andamento'}
              </span>
            </div>
            
            <div className="text-right">
              <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider block mb-1">Média Atual</span>
              <span className="text-3xl font-black text-on-surface">{notas.length > 0 ? mediaFinal.toFixed(1) : '-'}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-outline/10">
            <button onClick={() => handleStatusChange('em_andamento')} className="px-3 py-1.5 text-xs font-bold rounded-lg bg-surface-container hover:bg-surface-variant text-on-surface transition-colors">Voltar para Andamento</button>
            <button onClick={() => handleStatusChange('concluida')} className="px-3 py-1.5 text-xs font-bold rounded-lg bg-tertiary/10 text-tertiary hover:bg-tertiary/20 transition-colors">Concluída</button>
            <button onClick={() => handleStatusChange('aprovada')} className="px-3 py-1.5 text-xs font-bold rounded-lg bg-success/10 text-success hover:bg-success/20 transition-colors">Aprovada</button>
            <button onClick={() => handleStatusChange('reprovada')} className="px-3 py-1.5 text-xs font-bold rounded-lg bg-error/10 text-error hover:bg-error/20 transition-colors">Reprovada</button>
            <button onClick={() => handleStatusChange('trancada')} className="px-3 py-1.5 text-xs font-bold rounded-lg bg-on-surface-variant/10 text-on-surface-variant hover:bg-on-surface-variant/20 transition-colors">Trancada</button>
          </div>
        </div>

        {/* Média e Notas */}
        <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold flex items-center gap-2">
               <Award className="w-5 h-5 text-tertiary" /> Avaliações e Notas
            </h3>
            <p className="text-sm text-on-surface-variant">Notas lançadas e atividades pendentes</p>
          </div>

          <div className="mt-6 flex flex-col gap-2">
            <div className="flex items-center justify-between p-3 bg-surface-container rounded-xl">
               <span className="text-sm font-medium text-on-surface-variant">Total de avaliações:</span>
               <span className="font-bold text-on-surface">{notas.length}</span>
            </div>
          </div>
          
          <button onClick={openNew} className="mt-4 w-full py-2 bg-tertiary/10 text-tertiary rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-tertiary/20 transition-colors">
            <Plus className="w-4 h-4" /> Nova Nota/Avaliação
          </button>
        </div>
      </div>

      <div className="glass-panel rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-outline flex justify-between items-center bg-surface-container-low/50">
          <h3 className="text-lg font-bold">Registro de Notas</h3>
        </div>

        <div className="p-0">
          {notas.length === 0 ? (
             <div className="p-12 text-center text-on-surface-variant">Nenhuma nota registrada ainda.</div>
          ) : (
            <div className="divide-y divide-outline/10">
              {notas.map(n => (
                <div key={n.id} className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-surface-container-low/30 transition-colors">
                  <div className="flex items-start gap-4">
                     <div className={`p-3 rounded-xl $\n                       {n.tipo === 'prova' ? 'bg-error/10 text-error' : \n                        n.tipo === 'projeto' ? 'bg-primary/10 text-primary' : \n                        n.tipo === 'trabalho' ? 'bg-tertiary/10 text-tertiary' : \n                        'bg-success/10 text-success'}\n                     `}>
                        <Award className="w-5 h-5" />
                     </div>
                     <div>
                       <h4 className="font-bold text-on-surface text-base">{n.nome}</h4>
                       <div className="flex gap-3 text-xs text-on-surface-variant font-medium mt-1">
                          <span className="px-2 py-0.5 rounded-md bg-surface-container capitalize">{n.tipo}</span>
                          <span>{n.data ? parseValidDate(n.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : 'Sem data'}</span>
                          <span>Peso {n.peso}</span>
                       </div>
                       {n.observacoes && <p className="text-xs text-on-surface/60 mt-2">{n.observacoes}</p>}
                     </div>
                  </div>

                  <div className="flex items-center gap-6 sm:ml-auto">
                    <div className="text-right">
                       <span className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant/60 block mb-1">Resultado</span>
                       <div className="flex items-baseline gap-1">
                          <span className="text-2xl font-black text-on-surface">{n.nota_obtida !== null ? n.nota_obtida : '-'}</span>
                          <span className="text-sm font-bold text-on-surface-variant">/{n.nota_maxima}</span>
                       </div>
                    </div>

                    <div className="flex gap-2">
                      <button onClick={() => openEdit(n)} className="p-2 bg-surface-container hover:bg-surface-variant text-on-surface rounded-lg transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(n.id)} className="p-2 bg-error/10 hover:bg-error/20 text-error rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="glass-panel rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-outline/10 flex justify-between items-center bg-surface-container-low/50">
          <h3 className="text-lg font-bold">Eventos e Prazos do Calendário</h3>
          <p className="text-xs text-on-surface-variant flex-1 text-right">Avaliações cadastradas no calendário geral</p>
        </div>
        <div className="p-6 flex flex-col gap-4">
           {events.filter(e => ['prova', 'trabalho', 'apresentacao'].includes(e.tipo)).length === 0 ? (
              <p className="text-sm text-on-surface-variant italic text-center py-12">Nenhum evento programado.</p>
           ) : (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {events.filter(e => ['prova', 'trabalho', 'apresentacao'].includes(e.tipo)).sort((a,b) => parseValidDate(a.data_inicio).getTime() - parseValidDate(b.data_inicio).getTime()).map((event, idx) => (
                 <div key={getCalendarRenderKey(event, 'avaliacoes', idx)} className={`p-4 bg-surface-container rounded-xl border flex gap-4 relative overflow-hidden ${event.concluido ? 'border-success/50 opacity-60' : 'border-outline/10'}`}>
                   <div className="absolute top-0 left-0 w-1.5 h-full" style={{ backgroundColor: event.concluido ? '#10b981' : event.cor }}></div>
                   <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-on-surface truncate">{event.titulo}</h4>
                      <div className="flex gap-2 items-center mt-1">
                         <span className="text-[9px] uppercase font-black px-1.5 py-0.5 rounded tracking-widest text-on-surface-variant bg-surface-container-low">{event.tipo.split('_').join(' ')}</span>
                      </div>
                      <p className="text-[10px] text-on-surface-variant font-bold mt-2">
                        {parseValidDate(event.data_inicio).toLocaleDateString()}
                      </p>
                   </div>
                 </div>
               ))}
             </div>
           )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md">
          <div className="w-full max-w-lg glass-panel rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
            <div className="p-6 border-b border-outline flex justify-between items-center bg-surface-container-low/50">
              <h3 className="text-xl font-bold text-on-surface">{editingNota ? 'Editar Avaliação' : 'Registrar Avaliação'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 bg-surface-container hover:bg-surface-variant rounded-full transition-colors text-on-surface-variant">
                <ChevronDown className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">
              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Nome da Avaliação</label>
                <input required type="text" value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} className="w-full bg-background border border-outline/20 rounded-xl px-4 py-3 text-sm text-on-surface focus:outline-none focus:border-tertiary transition-colors" placeholder="Ex: Prova 1" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Tipo</label>
                  <select value={form.tipo} onChange={e => setForm({...form, tipo: e.target.value})} className="w-full bg-background border border-outline/20 rounded-xl px-4 py-3 text-sm text-on-surface focus:outline-none focus:border-tertiary transition-colors">
                    <option value="prova">Prova</option>
                    <option value="projeto">Projeto</option>
                    <option value="trabalho">Trabalho</option>
                    <option value="exercicio">Exercício</option>
                    <option value="apresentacao">Apresentação</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Data</label>
                  <input type="date" value={form.data} onChange={e => setForm({...form, data: e.target.value})} className="w-full bg-background border border-outline/20 rounded-xl px-4 py-3 text-sm text-on-surface focus:outline-none focus:border-tertiary transition-colors" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Nota Máxima</label>
                  <input type="number" step="0.1" required value={form.nota_maxima} onChange={e => setForm({...form, nota_maxima: e.target.value})} className="w-full bg-background border border-outline/20 rounded-xl px-4 py-3 text-sm text-on-surface focus:outline-none focus:border-tertiary transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Peso</label>
                  <input type="number" step="0.1" required value={form.peso} onChange={e => setForm({...form, peso: e.target.value})} className="w-full bg-background border border-outline/20 rounded-xl px-4 py-3 text-sm text-on-surface focus:outline-none focus:border-tertiary transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-tertiary uppercase tracking-wider mb-2">Nota Obtida</label>
                  <input type="number" step="0.1" value={form.nota_obtida} onChange={e => setForm({...form, nota_obtida: e.target.value})} className="w-full bg-tertiary/5 border border-tertiary/20 rounded-xl px-4 py-3 text-sm text-tertiary font-bold focus:outline-none focus:border-tertiary transition-colors" placeholder="-" />
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Observações</label>
                <textarea rows={2} value={form.observacoes} onChange={e => setForm({...form, observacoes: e.target.value})} className="w-full bg-background border border-outline/20 rounded-xl px-4 py-3 text-sm text-on-surface focus:outline-none focus:border-tertiary transition-colors resize-none" placeholder="Opcional..." />
              </div>

              <div className="flex justify-end gap-3 mt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 rounded-xl text-sm font-bold text-on-surface hover:bg-surface-variant transition-colors">Cancelar</button>
                <button type="submit" disabled={loading} className="px-6 py-2.5 rounded-xl text-sm font-bold bg-tertiary text-on-tertiary hover:bg-tertiary/90 transition-colors shadow-lg shadow-tertiary/20 disabled:opacity-50">{loading ? 'Salvando...' : 'Salvar Nota'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
