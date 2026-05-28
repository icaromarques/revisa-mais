import React, { useState } from 'react';
import { X, Edit2, BrainCircuit, AlertCircle, FileText, Video, File, Link as LinkIcon, Clock, Play, CheckCircle, CalendarIcon, Bookmark, Trash2, Mic, Image as ImageIcon } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { db } from '@/lib/firebase';
import { parseValidDate, safeFormat, formatDuration } from '@/lib/utils';
import { addDoc, collection, updateDoc, doc } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/lib/toast';
import { openMaterial } from '@/lib/utils';

interface AulaDetalheModalProps {
  isOpen: boolean;
  onClose: () => void;
  aula: any;
  topicos: any[];
  materiais: any[];
  eventos: any[];
  onEdit: (aula: any) => void;
  onDelete: (aulaId: string, deleteRelated: boolean) => Promise<void> | void;
  onEditMaterial?: (material: any) => void;
  onDeleteMaterial?: (id: string) => void;
  onAddMaterial?: (aulaId: string) => void;
}

export function AulaDetalheModal({
  isOpen,
  onClose,
  aula,
  topicos,
  materiais,
  eventos,
  onEdit,
  onDelete,
  onEditMaterial,
  onDeleteMaterial,
  onAddMaterial
}: AulaDetalheModalProps) {
  const { user } = useAuth();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isProcessingDelete, setIsProcessingDelete] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [isVincularProvaOpen, setIsVincularProvaOpen] = useState(false);
  const [isNovaAvaliacaoOpen, setIsNovaAvaliacaoOpen] = useState(false);
  const [novaAvaliacaoTitulo, setNovaAvaliacaoTitulo] = useState('');
  const [novaAvaliacaoData, setNovaAvaliacaoData] = useState(format(addDays(new Date(), 7), 'yyyy-MM-dd'));

  const handleCreateNovaAvaliacao = async () => {
    if (!user || !novaAvaliacaoTitulo) return;
    setIsScheduling(true);
    try {
      const newEventRef = await addDoc(collection(db, 'eventos_academicos'), {
        user_id: user.uid,
        materia_id: aula.materia_id,
        topico_id: aula.topico_id || null,
        tipo: 'prova',
        titulo: novaAvaliacaoTitulo,
        data_inicio: new Date(novaAvaliacaoData).toISOString(),
        created_at: new Date().toISOString()
      });
      await updateDoc(doc(db, 'aulas', aula.id), {
        evento_aval_id: newEventRef.id
      });
      toast.success('Nova avaliação criada e vinculada com sucesso!');
      setIsNovaAvaliacaoOpen(false);
      setNovaAvaliacaoTitulo('');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao criar avaliação.');
    } finally {
      setIsScheduling(false);
    }
  };

  if (!isOpen || !aula) return null;

  const handleCreateSummary = async () => {
    if (!user) return;
    setIsGenerating(true);
    try {
      await addDoc(collection(db, 'resumos'), {
        user_id: user.uid,
        materia_id: aula.materia_id,
        topico_id: aula.topico_id || null,
        aula_id: aula.id,
        titulo: `Resumo: ${aula.titulo}`,
        conteudo: aula.conteudo ? `Resumo gerado com base em: ${aula.conteudo.substring(0, 100)}...` : 'Nenhum conteúdo na aula para resumir.',
        origem: 'ia_aula',
        created_at: new Date().toISOString()
      });
      toast.success('Resumo gerado com sucesso!');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao gerar resumo.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCreateFlashcards = async () => {
    if (!user) return;
    setIsGenerating(true);
    try {
      const deckRef = await addDoc(collection(db, 'decks'), {
        user_id: user.uid,
        materia_id: aula.materia_id,
        topico_id: aula.topico_id || null,
        aula_id: aula.id,
        nome: `Flashcards: ${aula.titulo}`,
        cor: '#6366f1',
        origem: 'ia_aula',
        created_at: new Date().toISOString()
      });

      await addDoc(collection(db, 'flashcards'), {
        user_id: user.uid,
        deck_id: deckRef.id,
        frente: 'Qual é o principal conceito desta aula?',
        verso: aula.resumo_rapido || 'Rever o material da aula.',
        created_at: new Date().toISOString()
      });
      toast.success('Flashcards gerados com sucesso!');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao gerar flashcards.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCreateQuestions = async () => {
    if (!user) return;
    setIsGenerating(true);
    try {
      await addDoc(collection(db, 'questoes'), {
        user_id: user.uid,
        materia_id: aula.materia_id,
        topico_id: aula.topico_id || null,
        aula_id: aula.id,
        enunciado: 'Questão gerada a partir da aula: ' + aula.titulo,
        tipo: 'multipla_escolha',
        dificuldade: 'media',
        origem: 'ia_aula',
        created_at: new Date().toISOString()
      });
      toast.success('Questões geradas com sucesso!');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao gerar questões.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleScheduleReview = async () => {
    if (!user) return;
    setIsScheduling(true);
    try {
      await addDoc(collection(db, 'revisoes'), {
        user_id: user.uid,
        materia_id: aula.materia_id,
        topico_id: aula.topico_id || null,
        aula_id: aula.id,
        nome: `Revisão: ${aula.titulo}`,
        data_prevista: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
        status: 'pendente',
        origem: 'manual',
        created_at: new Date().toISOString()
      });
      toast.success('Revisão agendada para amanhã!');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao agendar revisão.');
    } finally {
      setIsScheduling(false);
    }
  };

  const handleAddToPlanner = async () => {
    if (!user) return;
    setIsScheduling(true);
    try {
      await addDoc(collection(db, 'eventos_academicos'), {
        user_id: user.uid,
        materia_id: aula.materia_id,
        topico_id: aula.topico_id || null,
        aula_id: aula.id,
        tipo: 'estudo',
        titulo: `Estudar: ${aula.titulo}`,
        data_inicio: new Date().toISOString(),
        created_at: new Date().toISOString()
      });
      toast.success('Adicionado ao planner!');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao adicionar ao planner.');
    } finally {
      setIsScheduling(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-end sm:justify-center p-0 sm:p-4 bg-background/80 backdrop-blur-sm">
      <div className="w-full h-[90vh] sm:h-[85vh] sm:max-w-4xl glass-panel sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom sm:slide-in-from-right duration-300">
         
         {/* Header */}
         <div className="shrink-0 p-6 border-b border-outline flex justify-between items-start bg-surface-container-lowest/50 relative overflow-hidden">
           <div className="absolute top-0 right-0 w-64 h-64 bg-secondary/10 blur-[80px] rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
           <div className="relative z-10 pr-10">
             <div className="flex flex-wrap items-center gap-3 mb-2">
                <span className={`text-[10px] uppercase font-black px-2 py-1 rounded tracking-widest ${aula.status === 'assistida' ? 'bg-success/10 text-success' : aula.status === 'revisar' ? 'bg-error/10 text-error' : aula.status === 'incompleta' ? 'bg-tertiary/10 text-tertiary' : 'bg-surface-container-low text-on-surface-variant'}`}>{aula.status}</span>
                {aula.importancia && (
                  <span className={`text-[10px] uppercase font-black px-2 py-1 rounded tracking-widest ${aula.importancia === 'alta' ? 'text-error bg-error/10' : aula.importancia === 'media' ? 'text-tertiary bg-tertiary/10' : 'text-primary bg-primary/10'}`}>{aula.importancia} Prioridade</span>
                )}
                <span className="text-xs text-on-surface-variant font-medium flex items-center gap-1.5"><CalendarIcon className="w-3.5 h-3.5" /> {(aula.data && !isNaN(parseValidDate(aula.data).getTime())) ? safeFormat(aula.data, "dd 'de' MMMM, yyyy", { locale: ptBR }) : '?'} {aula.horario ? `às ${aula.horario}` : ''}</span>
             </div>
             <h2 className="text-2xl sm:text-3xl font-black text-on-surface mb-2">{aula.titulo}</h2>
             {aula.resumo_rapido && <p className="text-lg text-secondary/80 font-medium">{aula.resumo_rapido}</p>}
           </div>
           
           <div className="flex gap-2 relative z-10 shrink-0">
              <button onClick={() => { onClose(); onEdit(aula); }} className="p-2 bg-surface-container hover:bg-surface-variant rounded-full transition-colors text-on-surface-variant" title="Editar">
                <Edit2 className="w-5 h-5"/>
              </button>
              <button onClick={() => setIsDeleting(true)} className="p-2 bg-surface-container hover:text-error hover:bg-error/10 rounded-full transition-colors text-on-surface-variant" title="Excluir">
                <Trash2 className="w-5 h-5"/>
              </button>
              <button onClick={onClose} className="p-2 bg-surface-container hover:bg-surface-variant rounded-full transition-colors text-on-surface-variant">
                <X className="w-5 h-5" />
              </button>
           </div>
         </div>

         {/* Content border-t inside content if needed */}
         {isDeleting && (
           <div className="shrink-0 p-4 bg-error/10 border-b border-error/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
             <div className="flex items-start sm:items-center gap-2 text-error">
               <AlertCircle className="w-5 h-5 shrink-0 mt-1 sm:mt-0" />
               <span className="text-sm font-bold">Como deseja excluir esta aula? Esta ação não pode ser desfeita.</span>
             </div>
             <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
               <button disabled={isProcessingDelete} onClick={() => setIsDeleting(false)} className="px-3 py-2 text-xs font-bold bg-surface-container hover:bg-surface-variant rounded-lg transition-colors disabled:opacity-50">Cancelar</button>
               <button disabled={isProcessingDelete} onClick={async () => {
                 setIsProcessingDelete(true);
                 try {
                   await onDelete(aula.id, false);
                 } finally {
                   setIsProcessingDelete(false);
                 }
               }} className="px-3 py-2 text-xs font-bold bg-error/20 text-error rounded-lg hover:bg-error/30 transition-colors disabled:opacity-50">
                 {isProcessingDelete ? 'Aguarde...' : 'Apenas Desvincular'}
               </button>
               <button disabled={isProcessingDelete} onClick={async () => {
                 setIsProcessingDelete(true);
                 try {
                   await onDelete(aula.id, true);
                 } finally {
                   setIsProcessingDelete(false);
                 }
               }} className="px-3 py-2 text-xs font-bold bg-error text-white rounded-lg hover:bg-error/90 transition-colors disabled:opacity-50">
                 {isProcessingDelete ? 'Aguarde...' : 'Excluir com Tudo'}
               </button>
             </div>
           </div>
         )}

         {/* Content */}
         <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-surface-container-lowest/50 flex flex-col md:flex-row gap-8">
            
            {/* Main Content Column */}
            <div className="flex-1 space-y-8">
               {aula.topico_id && (
                 <div>
                   <h4 className="text-xs font-bold uppercase tracking-widest text-outline mb-3">Tópico Vinculado</h4>
                   <div className="p-4 bg-surface-container hover:bg-surface-variant cursor-pointer transition-colors border border-outline/10 rounded-xl flex items-center gap-3">
                     <BrainCircuit className="w-5 h-5 text-primary" />
                     <span className="font-bold text-sm">{topicos.find(t => t.id === aula.topico_id)?.nome || 'Tópico Desconhecido'}</span>
                   </div>
                 </div>
               )}

               <div>
                 <h4 className="text-xs font-bold uppercase tracking-widest text-outline mb-3">Anotações e Conteúdo</h4>
                 {aula.conteudo ? (
                   <div className="p-5 bg-surface-container border border-outline/10 rounded-xl text-sm leading-relaxed whitespace-pre-wrap text-on-surface">
                     {aula.conteudo}
                   </div>
                 ) : (
                   <p className="text-sm text-on-surface-variant italic">Nenhuma anotação registrada.</p>
                 )}
               </div>

               {aula.duvidas && (
                 <div>
                   <h4 className="text-xs font-bold uppercase tracking-widest text-error mb-3 flex items-center gap-2"><AlertCircle className="w-4 h-4" /> Dúvidas / Dificuldades</h4>
                   <div className="p-5 bg-error/10 border border-error/20 rounded-xl text-sm leading-relaxed whitespace-pre-wrap text-error">
                     {aula.duvidas}
                   </div>
                 </div>
               )}

               {/* Materiais da Aula (Inline Section) */}
               <div>
                 <div className="flex items-center justify-between mb-4">
                   <h4 className="text-xs font-bold uppercase tracking-widest text-outline flex items-center gap-2"><FileText className="w-4 h-4 text-tertiary" /> Materiais da Aula</h4>
                   <button 
                     onClick={() => onAddMaterial?.(aula.id)}
                     className="p-1 px-2 text-[10px] font-black uppercase tracking-widest bg-tertiary/10 text-tertiary hover:bg-tertiary/20 rounded-lg transition-colors border border-tertiary/20"
                   >
                     + Adicionar
                   </button>
                 </div>
                 {materiais.filter(m => m.aula_id === aula.id).length === 0 ? (
                   <div className="p-8 border-2 border-dashed border-outline/30 rounded-xl text-center">
                     <FileText className="w-8 h-8 text-on-surface-variant/30 mx-auto mb-2" />
                     <p className="text-sm text-on-surface-variant">Nenhum material vinculado a esta aula.</p>
                   </div>
                 ) : (
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     {materiais.filter(m => m.aula_id === aula.id).map(mat => (
                        <div key={mat.id} className="p-3 w-full bg-surface-container border border-outline/20 rounded-xl flex items-start justify-between gap-3 hover:border-tertiary/30 hover:bg-surface-variant transition-colors group">
                           <div className="flex-1 min-w-0 flex items-start gap-3 cursor-pointer" onClick={() => openMaterial(mat, toast.error)}>
                              <div className="w-8 h-8 rounded-lg bg-tertiary/10 flex items-center justify-center shrink-0 group-hover:bg-tertiary/20">
                                {mat.tipo === 'video' ? <Video className="w-4 h-4 text-tertiary" /> :
                                mat.tipo === 'audio' ? <Mic className="w-4 h-4 text-tertiary" /> :
                                mat.tipo === 'imagem' ? <ImageIcon className="w-4 h-4 text-tertiary" /> :
                                mat.tipo === 'pdf' ? <File className="w-4 h-4 text-tertiary" /> : <LinkIcon className="w-4 h-4 text-tertiary" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold truncate text-on-surface group-hover:text-tertiary transition-colors">{mat.titulo || mat.url}</p>
                                <p className="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider mt-0.5">{mat.tipo}</p>
                              </div>
                           </div>
                           <div className="shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                type="button"
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEditMaterial?.(mat); }} 
                                className="p-1.5 text-on-surface-variant hover:text-tertiary hover:bg-tertiary/10 rounded-md transition-colors"
                                title="Editar Material"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                              <button 
                                type="button"
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDeleteMaterial?.(mat.id); }} 
                                className="p-1.5 text-on-surface-variant hover:text-error hover:bg-error/10 rounded-md transition-colors"
                                title="Excluir Material"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                           </div>
                        </div>
                     ))}
                   </div>
                 )}
               </div>
            </div>
            
            {/* Fixed Right Sidebar for actions */}
            <div className="w-full md:w-64 shrink-0 space-y-6">
              {/* Tempo */}
              <div className="glass-panel p-4 rounded-xl border border-outline/10 text-center">
                 <Clock className="w-6 h-6 text-primary mx-auto mb-2 opacity-80" />
                 <p className="text-[10px] uppercase font-black tracking-widest text-outline mb-1">Revisão Estimada</p>
                 <p className="text-xl font-bold text-on-surface">{aula.tempo_estimado_revisao ? formatDuration(aula.tempo_estimado_revisao * 60) : '--'}</p>
              </div>

              {/* IA Actions block */}
              <div className="glass-panel p-4 rounded-xl border border-primary/20 bg-primary/5">
                 <h4 className="text-[10px] font-black uppercase tracking-widest text-primary mb-3 flex items-center gap-1.5"><BrainCircuit className="w-3.5 h-3.5" /> IA Copilot</h4>
                 <div className="flex flex-col gap-2">
                   <button onClick={handleCreateSummary} disabled={isGenerating} className="w-full px-3 py-2 text-xs font-bold bg-surface-container text-on-surface rounded-lg border border-primary/20 hover:bg-primary/10 transition-colors text-left flex items-center gap-2 group disabled:opacity-50">
                     <div className="flex-1">✨ {isGenerating ? 'Resumindo...' : 'Resumir Aula'}</div>
                   </button>
                   <button onClick={handleCreateFlashcards} disabled={isGenerating} className="w-full px-3 py-2 text-xs font-bold bg-surface-container text-on-surface rounded-lg border border-primary/20 hover:bg-primary/10 transition-colors text-left flex items-center gap-2 group disabled:opacity-50">
                     <div className="flex-1">🃏 {isGenerating ? 'Extraindo...' : 'Extrair Flashcards'}</div>
                   </button>
                   <button onClick={handleCreateQuestions} disabled={isGenerating} className="w-full px-3 py-2 text-xs font-bold bg-surface-container text-on-surface rounded-lg border border-primary/20 hover:bg-primary/10 transition-colors text-left flex items-center gap-2 group disabled:opacity-50">
                     <div className="flex-1">❓ {isGenerating ? 'Gerando...' : 'Gerar Questões'}</div>
                   </button>
                 </div>
              </div>

              {/* Standard Actions block */}
              <div>
                <h4 className="text-[10px] font-black uppercase tracking-widest text-outline mb-3">Ações Rápidas</h4>
                <div className="flex flex-col gap-2">
                   <button onClick={() => toast.info('Utilize a aba Tópicos para iniciar sua sessão, o modal global está sendo aprimorado.')} className="w-full px-3 py-2.5 text-xs font-bold bg-surface-container-highest text-on-surface rounded-lg hover:bg-surface-variant transition-colors text-left flex items-center gap-2 group">
                     <Play className="w-3.5 h-3.5 text-primary group-hover:scale-110 transition-transform" /> Iniciar Sessão Estudo
                   </button>
                   <button onClick={handleScheduleReview} disabled={isScheduling} className="w-full px-3 py-2.5 text-xs font-bold bg-surface-container-highest text-on-surface rounded-lg hover:bg-surface-variant transition-colors text-left flex items-center gap-2 group disabled:opacity-50">
                     <CheckCircle className="w-3.5 h-3.5 text-secondary group-hover:scale-110 transition-transform" /> {isScheduling ? 'Agendando...' : 'Agendar Revisão'}
                   </button>
                   <button onClick={handleAddToPlanner} disabled={isScheduling} className="w-full px-3 py-2.5 text-xs font-bold bg-surface-container-highest text-on-surface rounded-lg hover:bg-surface-variant transition-colors text-left flex items-center gap-2 group disabled:opacity-50">
                     <CalendarIcon className="w-3.5 h-3.5 text-tertiary group-hover:scale-110 transition-transform" /> Add ao Planner
                   </button>
                   <button onClick={() => {
                      setIsVincularProvaOpen(!isVincularProvaOpen);
                      setIsNovaAvaliacaoOpen(false);
                   }} className="w-full px-3 py-2.5 text-xs font-bold bg-surface-container-highest text-on-surface rounded-lg hover:bg-surface-variant transition-colors text-left flex items-center justify-between group">
                     <span className="flex items-center gap-2">
                       <Bookmark className="w-3.5 h-3.5 text-error group-hover:scale-110 transition-transform" /> 
                       {aula.evento_aval_id && eventos.find(e => e.id === aula.evento_aval_id) 
                         ? 'Alterar Avaliação' 
                         : 'Vincular a Avaliação'}
                     </span>
                     {aula.evento_aval_id && eventos.find(e => e.id === aula.evento_aval_id) && (
                       <span className="text-[10px] text-on-surface-variant uppercase truncate max-w-[100px]" title={eventos.find(e => e.id === aula.evento_aval_id)?.titulo}>
                         {eventos.find(e => e.id === aula.evento_aval_id)?.titulo}
                       </span>
                     )}
                   </button>
                   {isVincularProvaOpen && !isNovaAvaliacaoOpen && (
                     <div className="flex flex-col gap-1 p-2 bg-background border border-outline/10 rounded-lg max-h-40 overflow-y-auto mt-1 custom-scrollbar">
                       {eventos.filter(e => ['prova', 'trabalho', 'apresentacao'].includes(e.tipo)).length === 0 && (
                          <p className="text-[10px] text-on-surface-variant italic p-2">Nenhuma avaliação encontrada.</p>
                       )}
                       {eventos.filter(e => ['prova', 'trabalho', 'apresentacao'].includes(e.tipo)).map(prova => (
                         <button key={prova.id} onClick={async () => {
                            try {
                              await updateDoc(doc(db, 'aulas', aula.id), {
                                evento_aval_id: prova.id
                              });
                              toast.success(`Aula vinculada à avaliação: ${prova.titulo}`);
                            } catch (err) {
                              console.error(err);
                              toast.error('Erro ao vincular.');
                            }
                            setIsVincularProvaOpen(false);
                         }} className="text-left text-xs font-medium p-2 hover:bg-surface-variant rounded text-on-surface-variant transition-colors limit-line">
                           {prova.titulo} ({prova.data_inicio && !isNaN(parseValidDate(prova.data_inicio).getTime()) ? safeFormat(prova.data_inicio, 'dd/MM') : '?'})
                         </button>
                       ))}
                       <div className="border-t border-outline/10 mt-1 pt-1">
                         <button 
                           onClick={() => setIsNovaAvaliacaoOpen(true)}
                           className="w-full text-center text-xs font-bold p-2 text-primary hover:bg-primary/10 rounded transition-colors"
                         >
                           + Nova Avaliação Rápida
                         </button>
                       </div>
                     </div>
                   )}

                   {isNovaAvaliacaoOpen && (
                      <div className="flex flex-col gap-2 p-3 bg-surface-container-highest border border-primary/20 rounded-lg mt-1">
                        <label className="text-[10px] uppercase font-black text-outline">Nova Prova/Trabalho</label>
                        <input 
                           type="text" 
                           placeholder="Título (Ex: P1 de Cálculo)"
                           value={novaAvaliacaoTitulo}
                           onChange={e => setNovaAvaliacaoTitulo(e.target.value)}
                           className="w-full bg-background border border-outline/20 rounded p-2 text-xs focus:outline-none focus:border-primary"
                        />
                        <input 
                           type="date"
                           value={novaAvaliacaoData}
                           onChange={e => setNovaAvaliacaoData(e.target.value)}
                           className="w-full bg-background border border-outline/20 rounded p-2 text-xs focus:outline-none focus:border-primary"
                        />
                        <div className="flex gap-2">
                           <button onClick={() => setIsNovaAvaliacaoOpen(false)} className="flex-1 px-2 py-1.5 text-xs font-bold text-on-surface-variant hover:bg-surface-variant rounded transition-colors">Cancelar</button>
                           <button onClick={handleCreateNovaAvaliacao} disabled={!novaAvaliacaoTitulo || isScheduling} className="flex-1 px-2 py-1.5 text-xs font-bold bg-primary text-on-primary rounded hover:bg-primary/90 transition-colors disabled:opacity-50">Criar</button>
                        </div>
                      </div>
                   )}
                </div>
              </div>
            </div>

         </div>
      </div>
    </div>
  );
}
