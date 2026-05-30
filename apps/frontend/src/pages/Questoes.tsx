import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { Target, Filter, Plus, Edit2, Trash2, Search, BookOpen } from 'lucide-react';
// TODO: A refatoração completa desta página para usar apiClient foi adiada. 
// Atualmente ela ainda usa firebase/firestore diretamente.
import { db } from '@/lib/firebase'; // TODO: Refatorar
import { collection, query, where, onSnapshot, deleteDoc, doc, updateDoc, addDoc, orderBy } from 'firebase/firestore'; // TODO: Refatorar
import { apiClient } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useConfirm } from '@/contexts/ConfirmContext';
import { toast } from '@/lib/toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CadernoModal } from '@/components/CadernoModal';
import { cascadeDeleteService } from '@/services/cascadeDeleteService';

export function Questoes() {
  const { user } = useAuth();
  const { requestConfirm } = useConfirm();
  const [cadernos, setCadernos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCaderno, setEditingCaderno] = useState<any>(null);
  const [form, setForm] = useState({ nome: '', descricao: '' });
  const [saving, setSaving] = useState(false);

  const [activeCaderno, setActiveCaderno] = useState<any>(null);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'cadernos'),
      where('user_id', '==', user.id),
      orderBy('created_at', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setCadernos(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => {
      console.error(error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  const handleOpenNew = () => {
    setEditingCaderno(null);
    setForm({ nome: '', descricao: '' });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (caderno: any) => {
    setEditingCaderno(caderno);
    setForm({ nome: caderno.nome || '', descricao: caderno.descricao || '' });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!user || !form.nome.trim()) return;
    setSaving(true);
    try {
      if (editingCaderno) {
        await updateDoc(doc(db, 'cadernos', editingCaderno.id), {
          nome: form.nome,
          descricao: form.descricao,
          updated_at: new Date().toISOString()
        });
        toast.success('Caderno atualizado!');
      } else {
        await addDoc(collection(db, 'cadernos'), {
          user_id: user.id,
          nome: form.nome,
          descricao: form.descricao,
          questoes_count: 0,
          created_at: new Date().toISOString()
        });
        toast.success('Caderno criado!');
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao salvar caderno.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!user) return;
    requestConfirm({
      title: 'Excluir Caderno',
      message: 'Deseja excluir este item? Todas as revisões vinculadas a ele também serão removidas.',
      confirmText: 'Excluir',
      isDanger: true,
      onConfirm: async () => {
        try {
          await cascadeDeleteService.deleteCadernoAndDerivates(id, user.id);
          await deleteDoc(doc(db, 'cadernos', id));
          toast.success('Caderno excluído!');
        } catch (err) {
          console.error(err);
          toast.error('Erro ao excluir caderno.');
        }
      }
    });
  };

  const filteredCadernos = cadernos.filter(c => 
    c.nome?.toLowerCase().includes(busca.toLowerCase()) || 
    c.descricao?.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <>
      <Header title="Banco de Questões" subtitle="Pratique com questões focadas no seu edital.">
        <div className="flex items-center gap-4 ml-6">
          <button className="flex items-center gap-2 px-4 py-2 bg-surface-container-highest text-on-surface rounded-full text-sm font-bold hover:bg-surface-variant transition-colors">
            <Filter className="w-4 h-4" />
            Filtros
          </button>
          <button onClick={handleOpenNew} className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-full text-sm font-bold hover:bg-primary-fixed transition-colors">
            <Plus className="w-4 h-4" />
            Criar Caderno
          </button>
        </div>
      </Header>

      <div className="p-8 max-w-7xl mx-auto w-full">
        
        <div className="flex gap-4 mb-8">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
            <input 
              type="text" 
              placeholder="Buscar cadernos..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-surface-container-highest border border-outline/20 rounded-xl text-sm focus:outline-none focus:border-primary transition-colors"
            />
          </div>
        </div>

        {loading ? (
          <p className="text-center text-on-surface-variant mt-10">Carregando cadernos...</p>
        ) : cadernos.length === 0 ? (
          <div className="glass-panel rounded-2xl p-8 text-center mt-8">
            <Target className="w-16 h-16 text-outline-variant mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">Nenhum caderno criado</h3>
            <p className="text-on-surface-variant mb-6">Crie um caderno de questões para começar a praticar.</p>
            <button onClick={handleOpenNew} className="px-6 py-2 bg-primary text-on-primary rounded-xl text-sm font-bold hover:bg-primary-fixed transition-colors">
              Criar Primeiro Caderno
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {filteredCadernos.map((caderno) => (
              <div key={caderno.id} className="glass-panel p-6 rounded-2xl group flex flex-col relative h-[200px]">
                <div className="absolute top-4 right-4 flex opacity-0 group-hover:opacity-100 transition-opacity gap-1">
                  <button onClick={() => handleOpenEdit(caderno)} className="p-1.5 bg-background/50 hover:bg-surface-variant rounded-lg text-on-surface-variant hover:text-primary transition-colors">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(caderno.id)} className="p-1.5 bg-background/50 hover:bg-error/20 rounded-lg text-on-surface-variant hover:text-error transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex justify-between items-start mb-4 pr-16 cursor-pointer" onClick={() => setActiveCaderno(caderno)}>
                  <div className="w-10 h-10 rounded-xl bg-surface-container-highest flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-on-surface-variant" />
                  </div>
                  <span className="text-xs font-bold bg-surface-container-highest px-2 py-1 rounded">{caderno.questoes_count || 0} Questões</span>
                </div>
                <h3 className="font-bold text-lg mb-1 truncate">{caderno.nome}</h3>
                <p className="text-xs text-on-surface-variant mb-6 line-clamp-1">
                 {caderno.descricao || `Criado em ${(caderno.created_at && !isNaN(new Date(caderno.created_at).getTime())) ? format(new Date(caderno.created_at), 'dd/MM/yyyy') : '?'}`}
              </p>
                <div className="mt-auto flex gap-2">
                  <button onClick={() => setActiveCaderno(caderno)} className="flex-1 py-2 bg-surface-container-highest hover:bg-surface-variant rounded-xl text-[10px] uppercase tracking-wider font-bold transition-colors">
                    Praticar
                  </button>
                  <button onClick={() => setActiveCaderno(caderno)} className="flex-1 py-2 bg-primary/10 text-primary hover:bg-primary/20 rounded-xl text-[10px] uppercase tracking-wider font-bold transition-colors">
                    Gerenciar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {activeCaderno && (
          <CadernoModal caderno={activeCaderno} onClose={() => setActiveCaderno(null)} />
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-surface rounded-2xl shadow-2xl flex flex-col border border-outline/20">
            <div className="p-4 border-b border-outline/10 flex justify-between items-center shrink-0">
              <h2 className="font-bold text-lg">{editingCaderno ? 'Editar Caderno' : 'Novo Caderno'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-on-surface-variant hover:text-on-surface p-1">
                 ✕ 
              </button>
            </div>
            
            <div className="p-6 flex flex-col gap-4">
              <div>
                <label className="text-xs font-black uppercase text-outline tracking-widest mb-1.5 block">Nome do Caderno</label>
                <input 
                  type="text" 
                  value={form.nome}
                  onChange={e => setForm({...form, nome: e.target.value})}
                  className="w-full bg-surface-container p-3 rounded-xl border border-outline/20 focus:outline-none focus:border-primary"
                  placeholder="Ex: Simulados de Constitucional"
                />
              </div>
              
              <div>
                <label className="text-xs font-black uppercase text-outline tracking-widest mb-1.5 block">Descrição</label>
                <textarea 
                  value={form.descricao}
                  onChange={e => setForm({...form, descricao: e.target.value})}
                  className="w-full bg-surface-container p-4 rounded-xl border border-outline/20 focus:outline-none focus:border-primary resize-none h-24"
                  placeholder="Opcional: Descreva o conteúdo deste caderno"
                />
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
                disabled={saving || !form.nome}
                className="px-6 py-2 font-bold text-sm bg-primary text-on-primary rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {saving ? 'Salvando...' : 'Salvar Caderno'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
