import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useConfirm } from '@/contexts/ConfirmContext';
import { toast } from '@/lib/toast';
import { X, Plus, Edit2, Trash2, ArrowLeft, BrainCircuit, Target } from 'lucide-react';
import { historyService } from '@/services/historyService';

interface CadernoModalProps {
  caderno: any;
  onClose: () => void;
}

export function CadernoModal({ caderno, onClose }: CadernoModalProps) {
  const { user } = useAuth();
  const { requestConfirm } = useConfirm();
  const [questoes, setQuestoes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modes
  const [mode, setMode] = useState<'list' | 'add' | 'edit' | 'practice'>('list');
  const [form, setForm] = useState({ enunciado: '', alternativas: [{id:'1', texto:'', correta:true}, {id:'2', texto:'', correta:false}] });
  const [editingId, setEditingId] = useState<string | null>(null);

  // Practice state
  const [studyIdx, setStudyIdx] = useState(0);
  const [selectedAlt, setSelectedAlt] = useState<string | null>(null);
  const [showingAnswer, setShowingAnswer] = useState(false);
  const [studyStartTime, setStudyStartTime] = useState<Date | null>(null);
  const [acertos, setAcertos] = useState(0);

  useEffect(() => {
    if (!user || !caderno.id) return;
    
    // Simulate until endpoint implemented
    setTimeout(() => {
      setQuestoes([]);
      setLoading(false);
    }, 300);

  }, [user, caderno.id]);

  const handleAddAlternativa = () => {
     setForm(f => ({ ...f, alternativas: [...f.alternativas, {id: Date.now().toString(), texto: '', correta: false}] }));
  };

  const setCorreta = (id: string) => {
     setForm(f => ({
        ...f,
        alternativas: f.alternativas.map(a => ({...a, correta: a.id === id}))
     }));
  };

  const handleAltChange = (id: string, val: string) => {
     setForm(f => ({
        ...f,
        alternativas: f.alternativas.map(a => a.id === id ? {...a, texto: val} : a)
     }));
  };

  const handleRemAlt = (id: string) => {
      setForm(f => ({
          ...f,
          alternativas: f.alternativas.filter(a => a.id !== id)
      }));
  }

  const handleSaveQuestao = async () => {
    if (!form.enunciado.trim() || form.alternativas.length < 2) return;
    const correctConfigured = form.alternativas.some(a => a.correta);
    if (!correctConfigured) {
        toast.error('Escolha a alternativa correta.');
        return;
    }

    try {
      /* Disabled until API implemented
      if (mode === 'edit' && editingId) {
        await apiClient.put(`/cadernos/${caderno.id}/questoes/${editingId}`, form);
        toast.success("Questão atualizada");
      } else {
        await apiClient.post(`/cadernos/${caderno.id}/questoes`, form);
        toast.success("Questão criada");
      }
      */
      setMode('list');
    } catch (e) {
      toast.error("Erro ao salvar questão");
    }
  };

  const handleDelete = async (id: string) => {
    requestConfirm({
      title: 'Excluir Questão',
      message: 'Deseja excluir esta questão?',
      confirmText: 'Excluir',
      isDanger: true,
      onConfirm: async () => {
        try {
          // await apiClient.delete(`/cadernos/${caderno.id}/questoes/${id}`);
          toast.success("Questão apagada");
        } catch(e) {
          toast.error("Erro ao excluir");
        }
      }
    });
  }

  const handleStartPractice = () => {
    if (questoes.length === 0) {
      toast.error("Não há questões neste caderno.");
      return;
    }
    setStudyIdx(0);
    setSelectedAlt(null);
    setShowingAnswer(false);
    setAcertos(0);
    setStudyStartTime(new Date());
    setMode('practice');
  };

  const handleFinishPractice = async () => {
     if (user && studyStartTime) {
         const end = new Date();
         const minutes = Math.ceil((end.getTime() - studyStartTime.getTime()) / 60000);
         await historyService.registerStudySession(user.id, {
             tipo: 'Questões',
             titulo: `Prática: ${caderno.nome}`,
             detalhes: `${acertos} acertos em ${questoes.length} questões.`,
             minutos: minutes
         });
     }
     toast.success(`Prática finalizada! Vocẽ acertou ${acertos}/${questoes.length}!`);
     setMode('list');
  };

  const handleAnswer = async () => {
      if (!selectedAlt) return;
      const questao = questoes[studyIdx];
      const selected = questao.alternativas.find((a:any) => a.id === selectedAlt);
      const isCorrect = selected?.correta;

      setShowingAnswer(true);

      if (isCorrect) {
          setAcertos(a => a + 1);
      }

      // Attempt recording is optional until tentativas endpoint exists
      
      setTimeout(async () => {
          if (studyIdx < questoes.length - 1) {
              setStudyIdx(prev => prev + 1);
              setSelectedAlt(null);
              setShowingAnswer(false);
          } else {
              await handleFinishPractice();
          }
      }, 1500);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 bg-background/90 backdrop-blur-sm">
      <div className="w-full max-w-4xl h-[85vh] bg-surface rounded-3xl mx-4 overflow-hidden flex flex-col shadow-2xl border border-outline/20">
         
         <div className="p-4 border-b border-outline/10 flex justify-between items-center bg-surface-container shrink-0">
             <div className="flex items-center gap-4">
                 {mode !== 'list' && (
                     <button onClick={() => setMode('list')} className="p-2 hover:bg-surface-variant rounded-full text-on-surface-variant">
                         <ArrowLeft className="w-5 h-5"/>
                     </button>
                 )}
                 <div>
                    <h2 className="font-bold text-lg">{caderno.nome}</h2>
                    <p className="text-xs text-on-surface-variant">{questoes.length} questões</p>
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
                      <h3 className="font-bold">Todas as Questões</h3>
                      <div className="flex gap-2">
                          <button onClick={handleStartPractice} className="px-4 py-2 bg-primary text-on-primary rounded-xl font-bold flex items-center gap-2">
                              <Target className="w-4 h-4" /> Praticar
                          </button>
                          <button onClick={() => { setForm({enunciado:'', alternativas:[{id:'1', texto:'', correta:true},{id:'2',texto:'', correta:false}]}); setEditingId(null); setMode('add'); }} className="px-4 py-2 bg-surface-container-highest rounded-xl font-bold flex items-center gap-2 hover:bg-surface-variant">
                              <Plus className="w-4 h-4" /> Nova Questão
                          </button>
                      </div>
                  </div>

                  {loading ? <p>Carregando...</p> : questoes.length === 0 ? (
                      <div className="text-center py-20 text-on-surface-variant">
                         <h3 className="font-bold text-xl mb-2">Este caderno está vazio</h3>
                         <p>Adicione questões para começar a praticar.</p>
                      </div>
                  ) : (
                      <div className="space-y-4">
                          {questoes.map((q, idx) => (
                              <div key={q.id} className="glass-panel p-4 rounded-xl flex gap-4 bg-surface group relative">
                                  <div className="flex-shrink-0 w-8 h-8 bg-surface-container-highest flex justify-center items-center rounded-lg font-bold">{idx + 1}</div>
                                  <div className="flex-1 pr-12">
                                      <p className="text-sm font-bold mb-2">{q.enunciado}</p>
                                      <ul className="space-y-1">
                                         {q.alternativas?.map((a:any) => (
                                             <li key={a.id} className={`text-xs p-1.5 rounded ${a.correta ? 'bg-success/10 text-success font-bold' : 'text-on-surface-variant'}`}>
                                                {a.texto} {a.correta && '(Correta)'}
                                             </li>
                                         ))}
                                      </ul>
                                  </div>
                                  <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button onClick={() => { setForm({enunciado: q.enunciado, alternativas: q.alternativas}); setEditingId(q.id); setMode('edit'); }} className="p-1.5 hover:bg-surface-variant rounded text-on-surface-variant"><Edit2 className="w-4 h-4"/></button>
                                      <button onClick={() => handleDelete(q.id)} className="p-1.5 hover:bg-error/20 text-error rounded"><Trash2 className="w-4 h-4"/></button>
                                  </div>
                              </div>
                          ))}
                      </div>
                  )}
               </div>
            )}

            {(mode === 'add' || mode === 'edit') && (
                <div className="max-w-2xl mx-auto space-y-6">
                    <h3 className="font-bold text-xl">{mode === 'edit' ? 'Editar Questão' : 'Nova Questão'}</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-bold uppercase text-on-surface-variant mb-1 block">Enunciado</label>
                            <textarea value={form.enunciado} onChange={e=>setForm({...form, enunciado: e.target.value})} className="w-full bg-surface-container rounded-xl p-4 min-h-[100px] border border-outline/10 text-sm" placeholder="Digite a questão..."/>
                        </div>
                        <div>
                            <label className="text-xs font-bold uppercase text-on-surface-variant mb-2 block">Alternativas (Selecione a correta)</label>
                            <div className="space-y-2">
                               {form.alternativas.map(alt => (
                                   <div key={alt.id} className="flex gap-2 items-center">
                                       <button onClick={() => setCorreta(alt.id)} className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${alt.correta ? 'border-primary bg-primary text-on-primary' : 'border-outline/50'}`}>
                                           {alt.correta && <div className="w-2 h-2 rounded-full bg-on-primary" />}
                                       </button>
                                       <input 
                                          type="text" 
                                          value={alt.texto}
                                          onChange={(e) => handleAltChange(alt.id, e.target.value)}
                                          placeholder="Texto da alternativa..."
                                          className="flex-1 bg-surface-container rounded-xl px-4 py-2 text-sm border border-outline/10"
                                       />
                                       <button onClick={() => handleRemAlt(alt.id)} className="p-2 text-error hover:bg-error/10 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                                   </div>
                               ))}
                               <button onClick={handleAddAlternativa} className="text-xs font-bold text-primary flex items-center gap-1 p-2 hover:bg-primary/10 rounded-lg mt-2">
                                  <Plus className="w-3 h-3" /> Adicionar Alternativa
                               </button>
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-end gap-2">
                        <button onClick={() => setMode('list')} className="px-6 py-3 font-bold rounded-xl hover:bg-surface-variant">Cancelar</button>
                        <button onClick={handleSaveQuestao} className="px-6 py-3 bg-primary text-on-primary font-bold rounded-xl">Salvar</button>
                    </div>
                </div>
            )}

            {mode === 'practice' && questoes[studyIdx] && (
                <div className="h-full flex flex-col justify-start pt-10 max-w-2xl mx-auto w-full">
                    <div className="flex justify-between text-xs font-bold text-on-surface-variant uppercase mb-6 tracking-widest">
                        <span>Questão {studyIdx + 1} de {questoes.length}</span>
                        <span className="text-success">{acertos} Acertos</span>
                    </div>

                    <div className="mb-8">
                       <h3 className="text-xl font-bold">{questoes[studyIdx].enunciado}</h3>
                    </div>

                    <div className="space-y-3">
                       {questoes[studyIdx].alternativas.map((alt:any) => {
                           const isSelected = selectedAlt === alt.id;
                           let stateClass = "bg-surface-container hover:bg-surface-variant cursor-pointer border-outline/10";
                           
                           if (showingAnswer) {
                               if (alt.correta) stateClass = "bg-success/20 border-success/50 text-success font-bold";
                               else if (isSelected && !alt.correta) stateClass = "bg-error/20 border-error/50 text-error";
                               else stateClass = "bg-surface-container opacity-50 cursor-not-allowed";
                           } else if (isSelected) {
                               stateClass = "bg-primary/20 border-primary/50 text-primary";
                           }

                           return (
                               <div 
                                  key={alt.id}
                                  onClick={() => !showingAnswer && setSelectedAlt(alt.id)}
                                  className={`p-4 rounded-xl border transition-all ${stateClass}`}
                               >
                                   {alt.texto}
                               </div>
                           );
                       })}
                    </div>

                    <div className="mt-auto h-24 flex items-center justify-end">
                       {!showingAnswer && selectedAlt && (
                           <button onClick={handleAnswer} className="px-8 py-3 bg-primary text-on-primary font-bold rounded-xl animate-in slide-in-from-right fade-in">
                               Responder
                           </button>
                       )}
                    </div>
                </div>
            )}
         </div>

      </div>
    </div>
  );
}
