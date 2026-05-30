import { parseValidDate } from '@/lib/utils';
import { Header } from '@/components/Header';
import { History, Filter, Play, CheckCircle2, Edit2, Trash2, CalendarIcon, Plus } from 'lucide-react';
import { useState, useEffect } from 'react';
// TODO: A refatoração completa desta página para usar apiClient foi adiada. 
// Atualmente ela ainda usa firebase/firestore diretamente.
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore'; // TODO: Refatorar
import { db } from '@/lib/firebase'; // TODO: Refatorar
import { apiClient } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useConfirm } from '@/contexts/ConfirmContext';
import { format, isToday, isPast,  } from 'date-fns';
import { revisaoService } from '@/services/revisaoService';
import { toast } from '@/lib/toast';

export function Revisoes() {
  const { user } = useAuth();
  const { requestConfirm } = useConfirm();
  const [revisoes, setRevisoes] = useState<any[]>([]);
  const [materiasMap, setMateriasMap] = useState<Record<string, string>>({});
  const [topicosMap, setTopicosMap] = useState<Record<string, string>>({});

  const [loading, setLoading] = useState(true);

  // Form states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRevisao, setEditingRevisao] = useState<any>(null);
  const [form, setForm] = useState<any>({ nome: '', data_prevista: '', status: 'pendente' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;

    // Fetch Materias
    const qMaterias = query(collection(db, 'materias'), where('user_id', '==', user.id));
    const unsubMaterias = onSnapshot(qMaterias, (snapshot) => {
      const map: Record<string, string> = {};
      snapshot.docs.forEach(docSnap => {
        map[docSnap.id] = docSnap.data().nome;
      });
      setMateriasMap(map);
    });

    // Fetch Topicos
    const qTopicos = query(collection(db, 'topicos'), where('user_id', '==', user.id));
    const unsubTopicos = onSnapshot(qTopicos, (snapshot) => {
      const map: Record<string, string> = {};
      snapshot.docs.forEach(docSnap => {
        map[docSnap.id] = docSnap.data().nome;
      });
      setTopicosMap(map);
    });

    // Fetch all Revisoes
    const qRevisoes = query(
      collection(db, 'revisoes'), 
      where('user_id', '==', user.id),
      orderBy('data_prevista', 'asc')
    );
    const unsubRevisoes = onSnapshot(qRevisoes, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRevisoes(data);
      setLoading(false);
    });

    return () => {
      unsubMaterias();
      unsubTopicos();
      unsubRevisoes();
    };
  }, [user]);

  const handleOpenNew = () => {
    setEditingRevisao(null);
    setForm({ nome: '', data_prevista: new Date().toISOString().split('T')[0], status: 'pendente' });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (rev: any) => {
    setEditingRevisao(rev);
    setForm({ 
      ...rev,
      nome: rev.nome || '', 
      data_prevista: rev.data_prevista ? new Date(rev.data_prevista).toISOString().split('T')[0] : '', 
      status: rev.status || 'pendente' 
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!user || !form.nome) return;
    setSaving(true);
    try {
      const savedData = {
         ...form,
         user_id: user.id,
         data_prevista: form.data_prevista ? new Date(form.data_prevista).toISOString() : null,
      };

      if (editingRevisao) {
          await revisaoService.updateRevisao(editingRevisao.id, savedData);
          toast.success("Revisão atualizada e sincronizada!");
      } else {
         savedData.tipo_intervalo = form.tipo_intervalo || 'manual';
         await revisaoService.createRevisao(savedData);
         toast.success("Revisão criada e agendada!");
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error("Erro ao salvar revisão:", error);
      toast.error("Erro ao salvar revisão.");
    } finally {
      setSaving(false);
    }
  };

  const handleConcluir = async (revisao: any) => {
    try {
      const isConcluida = revisao.status === 'concluida';
      await revisaoService.updateRevisao(revisao.id, {
        ...revisao,
        status: isConcluida ? 'pendente' : 'concluida',
        data_realizada: isConcluida ? null : new Date().toISOString()
      });
      toast.success(isConcluida ? 'Revisão reaberta!' : 'Revisão concluída!');
    } catch (error) {
      console.error("Erro ao concluir revisão:", error);
      toast.error("Erro ao concluir revisão.");
    }
  };

  const handleDelete = async (id: string, e?: any) => {
    if (e) e.stopPropagation();
    requestConfirm({
      title: 'Excluir Revisão',
      message: 'Deseja excluir apenas esta revisão? As demais revisões e o conteúdo vinculado continuarão normalmente.',
      confirmText: 'Excluir',
      isDanger: true,
      onConfirm: async () => {
        try {
          await revisaoService.deleteRevisao(id, user.id);
          toast.success("Revisão excluída");
        } catch (err) {
          console.error(err);
          toast.error("Erro ao excluir revisão");
        }
      }
    });
  };

  const revisoesPendentes = revisoes.filter(r => r.status === 'pendente');
  const revisoesConcluidas = revisoes.filter(r => r.status === 'concluida');

  const revisoesHojeOuAtrasadas = revisoesPendentes.filter(r => {
    if (!r.data_prevista) return false;
    const date = parseValidDate(r.data_prevista);
    if (isNaN(date.getTime())) return false;
    return isToday(date) || isPast(date);
  });

  const revisoesFuturas = revisoesPendentes.filter(r => {
    if (!r.data_prevista) return false;
    const date = parseValidDate(r.data_prevista);
    if (isNaN(date.getTime())) return false;
    return !isToday(date) && !isPast(date);
  });
  
  const revisoesSemData = revisoesPendentes.filter(r => !r.data_prevista);

  const getRevisaoTitulo = (r: any) => {
    if (r.nome) return r.nome;
    if (r.topico_id) return topicosMap[r.topico_id] || 'Tópico Desconhecido';
    if (r.materia_id) return materiasMap[r.materia_id] || 'Matéria Desconhecida';
    return 'Revisão Sem Nome';
  };

  return (
    <>
      <Header title="Revisões Espaçadas" subtitle="Algoritmo inteligente para retenção máxima.">
        <button onClick={handleOpenNew} className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-full text-sm font-bold hover:bg-primary-fixed transition-colors ml-4">
          <Plus className="w-4 h-4" /> Nova Revisão
        </button>
      </Header>

      <div className="p-8 max-w-7xl mx-auto w-full space-y-10">
        
        {/* Hoje ou Atrasadas */}
         <div className="space-y-6">
          <div className="flex justify-between items-center">
             <h2 className="text-xl font-bold flex items-center gap-2 text-error">
              Atrasadas ou para Hoje <span className="text-sm font-normal text-on-surface-variant bg-surface-container-highest px-2 py-0.5 rounded-full">{revisoesHojeOuAtrasadas.length}</span>
            </h2>
          </div>

          {revisoesHojeOuAtrasadas.length === 0 ? (
            <div className="glass-panel p-8 text-center rounded-xl bg-success/5 border-success/20">
              <CheckCircle2 className="w-12 h-12 text-success mx-auto mb-3 opacity-80" />
              <p className="text-success font-bold">Você está em dia com suas revisões de hoje!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {revisoesHojeOuAtrasadas.map((revisao) => (
                <div key={revisao.id} className="glass-panel p-5 rounded-xl flex justify-between items-center hover:bg-surface-container-low transition-colors group">
                  <div className="flex-1 cursor-pointer" onClick={() => handleOpenEdit(revisao)}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-black bg-primary/10 text-primary px-2 py-0.5 rounded uppercase">{revisao.tipo_intervalo || 'manual'}</span>
                      <span className="text-xs text-on-surface-variant">{revisao.materia_id ? materiasMap[revisao.materia_id] : 'Sem vínculo'}</span>
                      {revisao.data_prevista && !isNaN(parseValidDate(revisao.data_prevista).getTime()) && isPast(parseValidDate(revisao.data_prevista)) && !isToday(parseValidDate(revisao.data_prevista)) && (
                        <span className="text-[10px] font-bold text-error bg-error/10 px-2 py-0.5 rounded">Atrasada</span>
                      )}
                    </div>
                    <h4 className="font-bold">{getRevisaoTitulo(revisao)}</h4>
                  </div>
                  <div className="flex gap-2">
                     <button onClick={() => handleDelete(revisao.id)} className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center hover:bg-error hover:text-on-error transition-colors text-error opacity-0 group-hover:opacity-100">
                       <Trash2 className="w-4 h-4" />
                     </button>
                     <button 
                       onClick={() => handleConcluir(revisao)}
                       className="w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center hover:bg-primary hover:text-on-primary transition-colors text-primary"
                       title="Marcar como concluída"
                     >
                       <CheckCircle2 className="w-5 h-5" />
                     </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sem Data Definida */}
        {revisoesSemData.length > 0 && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold flex items-center gap-2">
              Pendentes / Sem Data <span className="text-sm font-normal text-on-surface-variant bg-surface-container-highest px-2 py-0.5 rounded-full">{revisoesSemData.length}</span>
            </h2>
            <div className="grid grid-cols-1 gap-4">
              {revisoesSemData.map((revisao) => (
                <div key={revisao.id} className="glass-panel p-4 rounded-xl flex items-center gap-4 justify-between bg-surface-container-low group">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-surface-container-highest rounded-lg"><CalendarIcon className="w-5 h-5 text-on-surface-variant" /></div>
                    <div className="cursor-pointer" onClick={() => handleOpenEdit(revisao)}>
                      <h4 className="font-bold">{getRevisaoTitulo(revisao)}</h4>
                      <p className="text-xs text-on-surface-variant">Sugestão: Definir data ou agendar.</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                     <button onClick={() => {
                        handleOpenEdit(revisao);
                        setForm(f => ({ ...f, data_prevista: new Date().toISOString().split('T')[0] }));
                     }} className="px-3 py-1.5 text-xs font-bold bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors">
                       Agendar
                     </button>
                     <button onClick={() => handleDelete(revisao.id)} className="p-1.5 text-on-surface-variant hover:text-error hover:bg-error/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                      <Trash2 className="w-4 h-4" />
                     </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Futuras */}
        {revisoesFuturas.length > 0 && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold flex items-center gap-2">
              Próximas <span className="text-sm font-normal text-on-surface-variant bg-surface-container-highest px-2 py-0.5 rounded-full">{revisoesFuturas.length}</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {revisoesFuturas.map((revisao) => (
                <div key={revisao.id} className="glass-panel p-5 rounded-xl flex justify-between items-center group cursor-pointer hover:bg-surface-container-low" onClick={() => handleOpenEdit(revisao)}>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-black bg-surface-container-highest text-on-surface-variant px-2 py-0.5 rounded uppercase">{revisao.tipo_intervalo || 'manual'}</span>
                    </div>
                    <h4 className="font-bold min-w-[200px]">{getRevisaoTitulo(revisao)}</h4>
                  </div>
                  <div className="flex items-center gap-4 text-xs font-bold">
                    <span className="text-on-surface-variant">
                      {revisao.data_prevista && !isNaN(parseValidDate(revisao.data_prevista).getTime()) ? format(parseValidDate(revisao.data_prevista), "dd/MM") : '-'}
                    </span>
                     <button onClick={(e) => { e.stopPropagation(); handleDelete(revisao.id)}} className="p-1.5 text-on-surface-variant hover:text-error hover:bg-error/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                      <Trash2 className="w-4 h-4" />
                     </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Concluidas */}
        {revisoesConcluidas.length > 0 && (
          <div className="space-y-6 opacity-70">
            <h2 className="text-xl font-bold flex items-center gap-2 text-on-surface-variant">
              Concluídas <span className="text-sm font-normal text-on-surface-variant bg-surface-container-highest px-2 py-0.5 rounded-full">{revisoesConcluidas.length}</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {revisoesConcluidas.map((revisao) => (
                <div key={revisao.id} className="glass-panel p-4 rounded-xl flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                     <CheckCircle2 className="w-5 h-5 text-success" />
                     <div>
                       <h4 className="font-bold text-sm strike line-through">{getRevisaoTitulo(revisao)}</h4>
                       <span className="text-[10px] text-on-surface-variant">Realizada em {revisao.data_realizada && !isNaN(new Date(revisao.data_realizada).getTime()) ? format(new Date(revisao.data_realizada), "dd/MM") : '?'}</span>
                     </div>
                  </div>
                  <button onClick={() => handleConcluir(revisao)} className="p-1 text-on-surface-variant hover:text-primary transition-colors opacity-0 group-hover:opacity-100" title="Desfazer">
                    <Edit2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-surface rounded-2xl shadow-2xl flex flex-col border border-outline/20">
            <div className="p-4 border-b border-outline/10 flex justify-between items-center shrink-0">
              <h2 className="font-bold text-lg">{editingRevisao ? 'Editar Revisão' : 'Nova Revisão'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-on-surface-variant hover:text-on-surface p-1">
                 ✕ 
              </button>
            </div>
            
            <div className="p-6 flex flex-col gap-4">
              <div>
                <label className="text-xs font-black uppercase text-outline tracking-widest mb-1.5 block">Nome da Revisão</label>
                <input 
                  type="text" 
                  value={form.nome}
                  onChange={e => setForm({...form, nome: e.target.value})}
                  className="w-full bg-surface-container p-3 rounded-xl border border-outline/20 focus:outline-none focus:border-primary"
                  placeholder="Ex: Revisar Atos Administrativos"
                />
              </div>
              
               <div>
                <label className="text-xs font-black uppercase text-outline tracking-widest mb-1.5 block">Data Prevista</label>
                <input 
                  type="date" 
                  value={form.data_prevista}
                  onChange={e => setForm({...form, data_prevista: e.target.value})}
                  className="w-full bg-surface-container p-3 rounded-xl border border-outline/20 focus:outline-none focus:border-primary"
                />
              </div>

               <div>
                <label className="text-xs font-black uppercase text-outline tracking-widest mb-1.5 block">Status</label>
                <select 
                  value={form.status}
                  onChange={e => setForm({...form, status: e.target.value as any})}
                  className="w-full bg-surface-container p-3 rounded-xl border border-outline/20 focus:outline-none focus:border-primary"
                >
                  <option value="pendente">Pendente</option>
                  <option value="concluida">Concluída</option>
                </select>
              </div>
            </div>

            <div className="p-4 border-t border-outline/10 flex justify-end gap-2 shrink-0">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 font-bold text-sm bg-surface-container hover:bg-surface-variant rounded-lg transition-colors"
                disabled={saving}
              >
                Cancelar
              </button>
              <button 
                onClick={handleSave}
                disabled={saving || !form.nome}
                className="px-6 py-2 font-bold text-sm bg-primary text-on-primary rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
