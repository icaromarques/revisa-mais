import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { useConfirm } from '@/contexts/ConfirmContext';
import { toast } from '@/lib/toast';
import { X, Plus, Edit2, Trash2, ArrowLeft, ArrowRight, RotateCcw, BrainCircuit } from 'lucide-react';
import { historyService } from '@/services/historyService';

interface DeckModalProps {
  deck: any;
  onClose: () => void;
}

export function DeckModal({ deck, onClose }: DeckModalProps) {
  const { user } = useAuth();
  const { requestConfirm } = useConfirm();
  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modes
  const [mode, setMode] = useState<'list' | 'add' | 'edit' | 'study'>('list');
  const [form, setForm] = useState({ frente: '', verso: '' });
  const [editingId, setEditingId] = useState<string | null>(null);

  // Study state
  const [studyIdx, setStudyIdx] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [studyStartTime, setStudyStartTime] = useState<Date | null>(null);

  useEffect(() => {
    if (!user || !deck.id) return;
    const q = query(collection(db, 'flashcards'), where('user_id', '==', user.uid), where('deck_id', '==', deck.id));
    const unsub = onSnapshot(q, (snap) => {
      setCards(snap.docs.map(d => ({id: d.id, ...d.data()})));
      setLoading(false);
    });
    return () => unsub();
  }, [user, deck.id]);

  const handleSaveCard = async () => {
    if (!form.frente.trim() || !form.verso.trim()) return;
    try {
      if (mode === 'edit' && editingId) {
        await updateDoc(doc(db, 'flashcards', editingId), {
           frente: form.frente,
           verso: form.verso,
           updated_at: serverTimestamp()
        });
        toast.success("Card atualizado");
      } else {
        await addDoc(collection(db, 'flashcards'), {
           user_id: user?.uid,
           deck_id: deck.id,
           frente: form.frente,
           verso: form.verso,
           created_at: serverTimestamp(),
        });
        // Update cards_count on deck
        await updateDoc(doc(db, 'decks', deck.id), {
           cards_count: cards.length + 1
        });
        toast.success("Card criado");
      }
      setMode('list');
    } catch (e) {
      toast.error("Erro ao salvar card");
    }
  };

  const handleDelete = async (id: string) => {
    requestConfirm({
      title: 'Excluir Card',
      message: 'Deseja excluir este card?',
      confirmText: 'Excluir',
      isDanger: true,
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'flashcards', id));
          await updateDoc(doc(db, 'decks', deck.id), {
               cards_count: cards.length > 0 ? cards.length - 1 : 0
          });
          toast.success("Card apagado");
        } catch(e) {
          toast.error("Erro ao excluir");
        }
      }
    });
  }

  const handleStartStudy = () => {
    if (cards.length === 0) {
      toast.error("Não há cards neste deck.");
      return;
    }
    setStudyIdx(0);
    setIsFlipped(false);
    setStudyStartTime(new Date());
    setMode('study');
  };

  const handleFinishStudy = async () => {
     if (user && studyStartTime) {
         const end = new Date();
         const minutes = Math.ceil((end.getTime() - studyStartTime.getTime()) / 60000);
         await historyService.registerStudySession(user.uid, {
             tipo: 'Flashcards',
             titulo: `Estudo: ${deck.nome}`,
             detalhes: `${cards.length} cards revisados.`,
             minutos: minutes
         });
     }
     toast.success("Você terminou os cards deste deck!");
     setMode('list');
  };

  const handleAnswer = async (difficulty: 'facil' | 'medio' | 'dificil') => {
      if (studyIdx < cards.length - 1) {
          setStudyIdx(prev => prev + 1);
          setIsFlipped(false);
      } else {
          await handleFinishStudy();
      }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-background/90 backdrop-blur-md">
      <div className="w-full max-w-4xl h-[85vh] bg-surface rounded-3xl overflow-hidden flex flex-col shadow-2xl border border-outline/20">
         
         <div className="p-4 border-b border-outline/10 flex justify-between items-center bg-surface-container shrink-0">
             <div className="flex items-center gap-4">
                 {mode !== 'list' && (
                     <button onClick={() => setMode('list')} className="p-2 hover:bg-surface-variant rounded-full text-on-surface-variant">
                         <ArrowLeft className="w-5 h-5"/>
                     </button>
                 )}
                 <div>
                    <h2 className="font-bold text-lg">{deck.nome}</h2>
                    <p className="text-xs text-on-surface-variant">{cards.length} cartões</p>
                 </div>
             </div>
             <button onClick={onClose} className="p-2 hover:bg-surface-variant rounded-full text-on-surface-variant">
                 <X className="w-5 h-5" />
             </button>
         </div>

         <div className="flex-1 overflow-y-auto p-6 bg-surface-container-lowest">
            {mode === 'list' && (
               <div className="space-y-6">
                  <div className="flex justify-between items-center">
                      <h3 className="font-bold">Todos os Cartões</h3>
                      <div className="flex gap-2">
                          <button onClick={handleStartStudy} className="px-4 py-2 bg-primary text-on-primary rounded-xl font-bold flex items-center gap-2">
                              <BrainCircuit className="w-4 h-4" /> Estudar
                          </button>
                          <button onClick={() => { setForm({frente:'', verso:''}); setEditingId(null); setMode('add'); }} className="px-4 py-2 bg-surface-container-highest rounded-xl font-bold flex items-center gap-2 hover:bg-surface-variant">
                              <Plus className="w-4 h-4" /> Adicionar Manual
                          </button>
                      </div>
                  </div>

                  {loading ? <p>Carregando...</p> : cards.length === 0 ? (
                      <div className="text-center py-20 text-on-surface-variant">
                         <h3 className="font-bold text-xl mb-2">Este deck está vazio</h3>
                         <p>Adicione cartões para começar a estudar.</p>
                      </div>
                  ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {cards.map(card => (
                              <div key={card.id} className="glass-panel p-4 rounded-xl flex gap-4 bg-surface group relative">
                                  <div className="flex-1 border-r border-outline/10 pr-4">
                                      <span className="text-[10px] text-outline uppercase font-bold block mb-1">Frente</span>
                                      <p className="text-sm">{card.frente}</p>
                                  </div>
                                  <div className="flex-1 pr-12">
                                      <span className="text-[10px] text-outline uppercase font-bold block mb-1">Verso</span>
                                      <p className="text-sm whitespace-pre-wrap">{card.verso}</p>
                                  </div>
                                  <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button onClick={() => { setForm({frente: card.frente, verso: card.verso}); setEditingId(card.id); setMode('edit'); }} className="p-1.5 hover:bg-surface-variant rounded text-on-surface-variant"><Edit2 className="w-4 h-4"/></button>
                                      <button onClick={() => handleDelete(card.id)} className="p-1.5 hover:bg-error/20 text-error rounded"><Trash2 className="w-4 h-4"/></button>
                                  </div>
                              </div>
                          ))}
                      </div>
                  )}
               </div>
            )}

            {(mode === 'add' || mode === 'edit') && (
                <div className="max-w-2xl mx-auto space-y-6">
                    <h3 className="font-bold text-xl">{mode === 'edit' ? 'Editar Cartão' : 'Novo Cartão'}</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-bold uppercase text-on-surface-variant mb-1 block">Frente (Pergunta)</label>
                            <textarea value={form.frente} onChange={e=>setForm({...form, frente: e.target.value})} className="w-full bg-surface-container rounded-xl p-4 min-h-[100px] border border-outline/10" placeholder="Qual o conceito de..."/>
                        </div>
                        <div>
                            <label className="text-xs font-bold uppercase text-on-surface-variant mb-1 block">Verso (Resposta)</label>
                            <textarea value={form.verso} onChange={e=>setForm({...form, verso: e.target.value})} className="w-full bg-surface-container rounded-xl p-4 min-h-[150px] border border-outline/10" placeholder="A resposta é..."/>
                        </div>
                    </div>
                    <div className="flex justify-end gap-2">
                        <button onClick={() => setMode('list')} className="px-6 py-3 font-bold rounded-xl hover:bg-surface-variant">Cancelar</button>
                        <button onClick={handleSaveCard} className="px-6 py-3 bg-primary text-on-primary font-bold rounded-xl">Salvar</button>
                    </div>
                </div>
            )}

            {mode === 'study' && cards[studyIdx] && (
                <div className="h-full flex flex-col items-center justify-center max-w-2xl mx-auto w-full">
                    <div className="text-sm font-bold text-on-surface-variant mb-6">
                        Cartão {studyIdx + 1} de {cards.length}
                    </div>

                    <div 
                        className={`w-full min-h-[300px] bg-surface-container-highest border border-outline/10 rounded-2xl flex items-center justify-center p-8 text-center cursor-pointer transition-all duration-300 shadow-xl ${isFlipped ? 'bg-primary/5 border-primary/20 bg-surface' : ''}`}
                        onClick={() => setIsFlipped(!isFlipped)}
                    >
                        {isFlipped ? (
                            <div className="animate-in fade-in zoom-in duration-300">
                                <span className="text-xs font-bold text-primary block mb-4 uppercase">Verso</span>
                                <p className="text-xl whitespace-pre-wrap">{cards[studyIdx].verso}</p>
                            </div>
                        ) : (
                            <div className="animate-in fade-in zoom-in duration-300">
                                <span className="text-xs font-bold text-on-surface-variant block mb-4 uppercase">Frente</span>
                                <p className="text-2xl font-bold">{cards[studyIdx].frente}</p>
                            </div>
                        )}
                    </div>

                    <div className="mt-8 h-20 w-full flex justify-center">
                        {!isFlipped ? (
                            <p className="text-on-surface-variant animate-pulse">Toque no cartão para virar</p>
                        ) : (
                            <div className="flex gap-4 animate-in slide-in-from-bottom-4 fade-in">
                                <button onClick={() => handleAnswer('dificil')} className="px-6 py-3 bg-error text-on-error font-bold rounded-xl hover:opacity-90">Difícil</button>
                                <button onClick={() => handleAnswer('medio')} className="px-6 py-3 bg-tertiary text-on-tertiary font-bold rounded-xl hover:opacity-90">Médio</button>
                                <button onClick={() => handleAnswer('facil')} className="px-6 py-3 bg-success text-on-success font-bold rounded-xl hover:opacity-90">Fácil</button>
                            </div>
                        )}
                    </div>
                </div>
            )}
         </div>

      </div>
    </div>
  );
}
