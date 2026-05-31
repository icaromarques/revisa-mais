import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { Layers, Plus, BrainCircuit, Edit2, Trash2, Search } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useConfirm } from '@/contexts/ConfirmContext';
import { toast } from '@/lib/toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DeckModal } from '@/components/DeckModal';
import { SectionErrorBoundary } from '@/components/ErrorBoundary';
import { cascadeDeleteService } from '@/services/cascadeDeleteService';

export function Flashcards() {
  const { user } = useAuth();
  const { requestConfirm } = useConfirm();
  const [decks, setDecks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDeck, setEditingDeck] = useState<any>(null);
  const [form, setForm] = useState({ nome: '', descricao: '' });
  const [saving, setSaving] = useState(false);

  // Deck Modal state
  const [activeDeck, setActiveDeck] = useState<any>(null);

  useEffect(() => {
    if (!user) return;
    apiClient.get('/revisoes/decks').then(({ data }) => {
      setDecks(data);
      setLoading(false);
    }).catch((error) => {
      console.error(error);
      setLoading(false);
    });
  }, [user]);

  const handleOpenNew = () => {
    setEditingDeck(null);
    setForm({ nome: '', descricao: '' });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (deck: any) => {
    setEditingDeck(deck);
    setForm({ nome: deck.nome || '', descricao: deck.descricao || '' });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!user || !form.nome.trim()) return;
    setSaving(true);
    try {
      if (editingDeck) {
        await apiClient.put(`/revisoes/decks/${editingDeck.id}`, {
          nome: form.nome,
          descricao: form.descricao,
        });
        toast.success('Deck atualizado!');
      } else {
        await apiClient.post('/revisoes/decks', {
          nome: form.nome,
          descricao: form.descricao,
          origem: 'manual'
        });
        toast.success('Deck criado!');
      }
      
      // Update UI
      apiClient.get('/revisoes/decks').then(({ data }) => setDecks(data));
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao salvar deck.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!user) return;
    requestConfirm({
      title: 'Excluir Deck',
      message: 'Deseja excluir este item? Todas as revisões vinculadas a ele também serão removidas.',
      confirmText: 'Excluir',
      isDanger: true,
      onConfirm: async () => {
        try {
          await apiClient.delete(`/revisoes/decks/${id}`);
          toast.success('Deck excluído!');
          apiClient.get('/revisoes/decks').then(({ data }) => setDecks(data));
        } catch (err) {
          console.error(err);
          toast.error('Erro ao excluir deck.');
        }
      }
    });
  };

  const filteredDecks = decks.filter(d => 
    d.nome?.toLowerCase().includes(busca.toLowerCase()) || 
    d.descricao?.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <>
      <Header title="Flashcards" subtitle="Crie e pratique com cartões de memorização.">
        <button onClick={handleOpenNew} className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-full text-sm font-bold hover:bg-primary-fixed transition-colors ml-4">
          <Plus className="w-4 h-4" />
          Novo Deck
        </button>
      </Header>

      <div className="p-8 max-w-7xl mx-auto w-full">
        
        <div className="flex gap-4 mb-8">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
            <input 
              type="text" 
              placeholder="Buscar decks..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-surface-container-highest border border-outline/20 rounded-xl text-sm focus:outline-none focus:border-primary transition-colors"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <SectionErrorBoundary title="Ferramentas de IA" name="FlashcardsAI">
            {/* Create with AI Card */}
            <div onClick={() => toast.info('Em breve: Geração de Flashcards por IA')} className="glass-panel p-6 rounded-2xl flex flex-col justify-center items-center text-center cursor-pointer hover:shadow-[0_0_30px_-5px_rgba(128,131,255,0.2)] hover:border-primary transition-all h-[200px]">
              <BrainCircuit className="w-12 h-12 text-primary mb-4" />
              <h3 className="font-bold text-lg mb-2">Gerar com IA</h3>
              <p className="text-xs text-on-surface-variant">Cole um texto ou faça upload de um PDF para gerar flashcards automaticamente.</p>
            </div>
          </SectionErrorBoundary>

          <SectionErrorBoundary title="Seus Baralhos" name="FlashcardsList">
            {loading ? (
              <p className="text-on-surface-variant">Carregando...</p>
            ) : filteredDecks.map((deck) => (
              <div key={deck.id} className="glass-panel p-6 rounded-2xl group flex flex-col relative h-[200px]">
                 <div className="absolute top-4 right-4 flex opacity-0 group-hover:opacity-100 transition-opacity gap-1">
                  <button onClick={() => handleOpenEdit(deck)} className="p-1.5 bg-background/50 hover:bg-surface-variant rounded-lg text-on-surface-variant hover:text-primary transition-colors">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(deck.id)} className="p-1.5 bg-background/50 hover:bg-error/20 rounded-lg text-on-surface-variant hover:text-error transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex justify-between items-start mb-4 pr-16 cursor-pointer" onClick={() => setActiveDeck(deck)}>
                  <div className="w-10 h-10 rounded-xl bg-surface-container-highest flex items-center justify-center">
                    <Layers className="w-5 h-5 text-on-surface-variant" />
                  </div>
                  <span className="text-xs font-bold bg-surface-container-highest px-2 py-1 rounded">{deck.cards_count || 0} Cartões</span>
                </div>
                <h3 className="font-bold text-lg mb-1 truncate">{deck.nome}</h3>
                <p className="text-xs text-on-surface-variant mb-6 line-clamp-1">{deck.descricao || `Criado em ${(deck.created_at && !isNaN(new Date(deck.created_at).getTime())) ? format(new Date(deck.created_at), 'dd/MM/yyyy') : '?'}`}</p>
                <button onClick={() => setActiveDeck(deck)} className="mt-auto w-full py-2 bg-surface-container-highest hover:bg-surface-variant rounded-xl text-sm font-bold transition-colors">
                  Estudar Agora
                </button>
              </div>
            ))}
          </SectionErrorBoundary>
        </div>
      </div>

      {activeDeck && (
         <DeckModal deck={activeDeck} onClose={() => setActiveDeck(null)} />
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-surface rounded-2xl shadow-2xl flex flex-col border border-outline/20">
            <div className="p-4 border-b border-outline/10 flex justify-between items-center shrink-0">
              <h2 className="font-bold text-lg">{editingDeck ? 'Editar Deck' : 'Novo Deck'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-on-surface-variant hover:text-on-surface p-1">
                 ✕ 
              </button>
            </div>
            
            <div className="p-6 flex flex-col gap-4">
              <div>
                <label className="text-xs font-black uppercase text-outline tracking-widest mb-1.5 block">Nome do Deck</label>
                <input 
                  type="text" 
                  value={form.nome}
                  onChange={e => setForm({...form, nome: e.target.value})}
                  className="w-full bg-surface-container p-3 rounded-xl border border-outline/20 focus:outline-none focus:border-primary"
                  placeholder="Ex: Anatomia Básica"
                />
              </div>
              
              <div>
                <label className="text-xs font-black uppercase text-outline tracking-widest mb-1.5 block">Descrição</label>
                <textarea 
                  value={form.descricao}
                  onChange={e => setForm({...form, descricao: e.target.value})}
                  className="w-full bg-surface-container p-4 rounded-xl border border-outline/20 focus:outline-none focus:border-primary resize-none h-24"
                  placeholder="Opcional: Descreva o conteúdo deste deck"
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
                {saving ? 'Salvando...' : 'Salvar Deck'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
