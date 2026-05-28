import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { FileText, Plus, BrainCircuit, Trash2, Edit2, Search } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, deleteDoc, doc, updateDoc, addDoc, orderBy } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { useConfirm } from '@/contexts/ConfirmContext';
import { toast } from '@/lib/toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function Resumos() {
  const { user } = useAuth();
  const { requestConfirm } = useConfirm();
  const [resumos, setResumos] = useState<any[]>([]);
  const [materiasMap, setMateriasMap] = useState<Record<string, string>>({});
  const [materiasObj, setMateriasObj] = useState<any[]>([]);
  const [topicosObj, setTopicosObj] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingResumo, setEditingResumo] = useState<any>(null);
  const [form, setForm] = useState({ titulo: '', conteudo: '', materia_id: '', topico_id: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    
    // Fetch Materias
    const unsubMaterias = onSnapshot(query(collection(db, 'materias'), where('user_id', '==', user.uid)), (snap) => {
      const map:any = {};
      const arr:any = [];
      snap.docs.forEach(d => {
         map[d.id] = d.data().nome;
         arr.push({id: d.id, ...d.data()});
      });
      setMateriasMap(map);
      setMateriasObj(arr);
    });

    // Fetch Topicos
    const unsubTopicos = onSnapshot(query(collection(db, 'topicos'), where('user_id', '==', user.uid)), (snap) => {
      setTopicosObj(snap.docs.map(d => ({id: d.id, ...d.data()})));
    });

    const q = query(
      collection(db, 'resumos'),
      where('user_id', '==', user.uid),
      orderBy('created_at', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setResumos(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => {
      console.error(error);
      setLoading(false);
    });
    return () => {
       unsubscribe();
       unsubMaterias();
       unsubTopicos();
    }
  }, [user]);

  const handleOpenNew = () => {
    setEditingResumo(null);
    setForm({ titulo: '', conteudo: '', materia_id: '', topico_id: '' });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (resumo: any) => {
    setEditingResumo(resumo);
    setForm({ 
        titulo: resumo.titulo || '', 
        conteudo: resumo.conteudo || '',
        materia_id: resumo.materia_id || '',
        topico_id: resumo.topico_id || ''
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!user || !form.titulo.trim() || !form.conteudo.trim()) return;
    setSaving(true);
    try {
      const payload: any = {
          titulo: form.titulo,
          conteudo: form.conteudo,
          materia_id: form.materia_id || null,
          topico_id: form.topico_id || null,
      };

      if (editingResumo) {
        await updateDoc(doc(db, 'resumos', editingResumo.id), {
          ...payload,
          updated_at: new Date().toISOString()
        });
        toast.success('Resumo atualizado!');
      } else {
        await addDoc(collection(db, 'resumos'), {
          ...payload,
          user_id: user.uid,
          origem: 'manual',
          created_at: new Date().toISOString()
        });
        toast.success('Resumo criado!');
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao salvar resumo.');
    } finally {
      setSaving(false);
    }
  };

  const generateWithAi = () => {
      if(!form.topico_id || !form.materia_id) {
          toast.error("Selecione primeiramente a matéria e o tópico!");
          return;
      }
      toast.promise(
          new Promise(r => setTimeout(() => r(true), 2000)),
          {
             loading: 'Sintetizando informações e gerando melhor resumo...',
             success: () => {
                 setForm(f => ({
                    ...f,
                    titulo: `Resumo Sintetizado: ${topicosObj.find(t=>t.id===f.topico_id)?.nome || 'Tópico'}`,
                    conteudo: "# Resumo Gerado\n\n- Ponto 1: ...\n- Ponto 2: ..."
                 }));
                 return "Resumo gerado com sucesso! (IA mockada no front)";
             },
             error: 'Erro'
          }
      )
  };

  const handleDelete = async (id: string) => {
    requestConfirm({
      title: 'Excluir Resumo',
      message: 'Excluir este resumo?',
      confirmText: 'Excluir',
      isDanger: true,
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'resumos', id));
          toast.success('Resumo excluído!');
        } catch (err) {
          console.error(err);
          toast.error('Erro ao excluir resumo.');
        }
      }
    });
  };

  const filteredResumos = resumos.filter(r => 
    r.titulo?.toLowerCase().includes(busca.toLowerCase()) || 
    r.conteudo?.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <>
      <Header title="Resumos Inteligentes" subtitle="Seu acervo de anotações e sínteses.">
        <button onClick={handleOpenNew} className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-full text-sm font-bold hover:bg-primary-fixed transition-colors ml-4">
          <Plus className="w-4 h-4" />
          Novo Resumo
        </button>
      </Header>

      <div className="p-8 max-w-7xl mx-auto w-full">
        
        <div className="flex gap-4 mb-8">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
            <input 
              type="text" 
              placeholder="Buscar resumos..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-surface-container-highest border border-outline/20 rounded-xl text-sm focus:outline-none focus:border-primary transition-colors"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div onClick={() => { handleOpenNew(); setTimeout(() => toast.info('Na janela que se abrirá, preencha os dados e clique no botão de gerar IA'), 500); }} className="glass-panel p-6 rounded-2xl flex flex-col justify-center items-center text-center cursor-pointer hover:shadow-[0_0_30px_-5px_rgba(255,164,213,0.2)] hover:border-tertiary transition-all min-h-[200px]">
            <BrainCircuit className="w-12 h-12 text-tertiary mb-4" />
            <h3 className="font-bold text-lg mb-2">Sintetizar com IA</h3>
            <p className="text-xs text-on-surface-variant">Transforme aulas longas em resumos concisos e estruturados.</p>
          </div>

          {loading ? (
            <p className="text-on-surface-variant">Carregando...</p>
          ) : filteredResumos.map((resumo) => (
            <div key={resumo.id} className="glass-panel p-6 rounded-2xl group flex flex-col relative h-[200px]">
              <div className="absolute top-4 right-4 flex opacity-0 group-hover:opacity-100 transition-opacity gap-1">
                <button onClick={() => handleOpenEdit(resumo)} className="p-1.5 bg-surface-container-highest hover:bg-surface-variant rounded-lg text-on-surface-variant hover:text-primary transition-colors">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete(resumo.id)} className="p-1.5 bg-surface-container-highest hover:bg-error/20 rounded-lg text-on-surface-variant hover:text-error transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-3 mb-4 pr-16 cursor-pointer" onClick={() => handleOpenEdit(resumo)}>
                <div className="w-10 h-10 rounded-xl bg-surface-container-highest flex flex-shrink-0 items-center justify-center">
                  <FileText className="w-5 h-5 text-on-surface-variant" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-sm truncate">{resumo.titulo}</h3>
                  <p className="text-[10px] text-on-surface-variant uppercase tracking-widest">{resumo.origem || 'Manual'}</p>
                </div>
              </div>
              
              {resumo.materia_id && (
                  <p className="text-xs font-bold text-primary mb-2 truncate">
                      {materiasMap[resumo.materia_id]} 
                      {resumo.topico_id && ` > ${topicosObj.find(t=>t.id===resumo.topico_id)?.nome}`}
                  </p>
              )}

              <p className="text-xs text-on-surface-variant line-clamp-3 mb-4 flex-1 cursor-pointer" onClick={() => handleOpenEdit(resumo)}>
                {resumo.conteudo}
              </p>
              <div className="mt-auto text-[10px] text-on-surface-variant font-medium pt-4 border-t border-outline/10">
                {(() => {
                    const dUpdate = resumo.updated_at ? new Date(resumo.updated_at) : null;
                    const dCreate = resumo.created_at ? new Date(resumo.created_at) : null;
                    if (dUpdate && !isNaN(dUpdate.getTime())) {
                      return `Atualizado ${format(dUpdate, 'dd MMM', {locale:ptBR})}`;
                    } else if (dCreate && !isNaN(dCreate.getTime())) {
                      return `Criado ${format(dCreate, 'dd MMM', {locale:ptBR})}`;
                    } else {
                      return 'Sem data';
                    }
                })()}
              </div>
            </div>
          ))}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-4xl bg-surface rounded-2xl shadow-2xl flex flex-col h-[80vh] border border-outline/20">
            <div className="p-4 border-b border-outline/10 flex justify-between items-center shrink-0">
              <h2 className="font-bold text-lg">{editingResumo ? 'Editar Resumo' : 'Novo Resumo'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-on-surface-variant hover:text-on-surface p-1">
                 ✕ 
              </button>
            </div>
            
            <div className="p-6 flex-1 overflow-y-auto flex gap-6">
              
              <div className="w-1/3 flex flex-col gap-4 border-r border-outline/10 pr-6">
                  <div>
                    <label className="text-xs font-black uppercase text-outline tracking-widest mb-1.5 block">Matéria</label>
                    <select 
                      value={form.materia_id} 
                      onChange={e => setForm({...form, materia_id: e.target.value, topico_id: ''})} 
                      className="w-full bg-surface-container p-3 rounded-xl border border-outline/20 focus:outline-none focus:border-primary text-sm"
                    >
                      <option value="">Nenhuma Matéria</option>
                      {materiasObj.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
                    </select>
                  </div>
                  
                  {form.materia_id && (
                    <div>
                        <label className="text-xs font-black uppercase text-outline tracking-widest mb-1.5 block">Tópico</label>
                        <select 
                          value={form.topico_id} 
                          onChange={e => setForm({...form, topico_id: e.target.value})} 
                          className="w-full bg-surface-container p-3 rounded-xl border border-outline/20 focus:outline-none focus:border-primary text-sm"
                        >
                          <option value="">Selecione um tópico</option>
                          {topicosObj.filter(t => t.materia_id === form.materia_id).map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                        </select>
                        <p className="text-[10px] text-on-surface-variant mt-1.5">Apenas tópicos da matéria selecionada.</p>
                    </div>
                  )}

                  <button onClick={generateWithAi} className="mt-4 w-full py-3 bg-tertiary text-on-tertiary rounded-xl font-bold flex gap-2 justify-center items-center shadow-[0_0_15px_-5px_var(--color-tertiary)] hover:bg-tertiary/90">
                      <BrainCircuit className="w-4 h-4" /> Sintetizar com IA
                  </button>
                  <p className="text-[10px] text-on-surface-variant text-center">Para gerar por IA, um tópico deve estar selecionado.</p>
              </div>

              <div className="flex-1 flex flex-col gap-4">
                  <div>
                    <label className="text-xs font-black uppercase text-outline tracking-widest mb-1.5 block">Título do Resumo</label>
                    <input 
                      type="text" 
                      value={form.titulo}
                      onChange={e => setForm({...form, titulo: e.target.value})}
                      className="w-full bg-surface-container p-3 rounded-xl border border-outline/20 focus:outline-none focus:border-primary"
                      placeholder="Ex: Princípios do Direito Administrativo"
                    />
                  </div>
                  
                  <div className="flex-1 flex flex-col">
                    <label className="text-xs font-black uppercase text-outline tracking-widest mb-1.5 block">Conteúdo</label>
                    <textarea 
                      value={form.conteudo}
                      onChange={e => setForm({...form, conteudo: e.target.value})}
                      className="w-full flex-1 bg-surface-container p-4 rounded-xl border border-outline/20 focus:outline-none focus:border-primary resize-none font-mono text-sm leading-relaxed"
                      placeholder="Escreva seu resumo aqui em Markdown..."
                    />
                  </div>
              </div>

            </div>

            <div className="p-4 border-t border-outline/10 flex justify-end gap-2 shrink-0">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 font-bold text-sm bg-surface-container hover:bg-surface-variant rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSave}
                disabled={saving || !form.titulo || !form.conteudo}
                className="px-6 py-2 font-bold text-sm bg-primary text-on-primary rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {saving ? 'Salvando...' : 'Salvar Resumo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

