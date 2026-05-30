import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Calendar as CalendarIcon, MapPin, AlignLeft, Check, Trash2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { EventoAcademico, EventoAcademicoTipo } from '@/types/calendar';
import { useAuth } from '@/contexts/AuthContext';
import { useConfirm } from '@/contexts/ConfirmContext';
import { calendarService } from '@/services/calendarService';
import { googleCalendarService } from '@/services/googleCalendar';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useRestWindow } from '@/hooks/useRestWindow';
import { parseValidDate } from '@/lib/utils';
import { toast } from 'sonner';
import { getStableRenderKey } from '@/lib/calendar-utils';

interface CalendarEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventToEdit?: EventoAcademico | null;
  initialData?: Partial<EventoAcademico>;
  materias?: any[];
  topicos?: any[];
}

export function CalendarEventModal({ isOpen, onClose, eventToEdit, initialData }: CalendarEventModalProps) {
  const { user } = useAuth();
  const { requestConfirm } = useConfirm();
  const { isInRestWindow } = useRestWindow();
  const [materias, setMaterias] = useState<any[]>([]);
  const [topicos, setTopicos] = useState<any[]>([]);
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [tipo, setTipo] = useState<EventoAcademicoTipo>('lembrete');
  const [materiaId, setMateriaId] = useState('');
  const [topicoId, setTopicoId] = useState('');
  
  const now = new Date();
  const nextHour = new Date(now);
  nextHour.setHours(now.getHours() + 1);

  const getLocalDateString = (d: Date) => {
    try {
      if (isNaN(d.getTime())) return new Date().toISOString().split('T')[0];
      return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0];
    } catch (e) {
      return new Date().toISOString().split('T')[0];
    }
  };

  const [dataInicio, setDataInicio] = useState(getLocalDateString(now));
  const [horaInicio, setHoraInicio] = useState(now.toTimeString().slice(0, 5));
  const [dataFim, setDataFim] = useState(getLocalDateString(nextHour));
  const [horaFim, setHoraFim] = useState(nextHour.toTimeString().slice(0, 5));
  
  const [diaInteiro, setDiaInteiro] = useState(false);
  const [local, setLocal] = useState('');
  const [cor, setCor] = useState('#8B5CF6'); // Default primary
  const [concluido, setConcluido] = useState(false);
  const [peso, setPeso] = useState('');
  const [syncGoogle, setSyncGoogle] = useState(false);
  const [isGcalConnected, setIsGcalConnected] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isSuggested, setIsSuggested] = useState(false);

  useEffect(() => {
    async function fetchData() {
      if (!user) return;
      try {
        const mQuery = query(collection(db, 'materias'), where('user_id', '==', user.uid));
        const mSnap = await getDocs(mQuery);
        setMaterias(mSnap.docs.map(d => ({id: d.id, ...d.data()})));
        
        const tQuery = query(collection(db, 'topicos'), where('user_id', '==', user.uid));
        const tSnap = await getDocs(tQuery);
        setTopicos(tSnap.docs.map(d => ({id: d.id, ...d.data()})));

        const isConn = await googleCalendarService.isConnected();
        setIsGcalConnected(isConn);

        if (!eventToEdit && initialData?.sync_enabled === undefined) {
           const { userPreferencesService } = await import('@/services/userPreferencesService');
           const prefs = await userPreferencesService.getPreferences(user.uid);
           const defaultSync = prefs?.googleCalendar?.syncManualEventsByDefault;
           if (defaultSync !== undefined) {
               setSyncGoogle(defaultSync && isConn);
           } else {
               setSyncGoogle(isConn);
           }
        }
      } catch (e) {
        console.error("Erro ao buscar dados iniciais:", e);
      }
    }
    if (isOpen) {
      fetchData();
    }
  }, [isOpen, user, eventToEdit, initialData]);

  useEffect(() => {
    if (isOpen) {
      if (eventToEdit) {
        setTitulo(eventToEdit.titulo);
        setDescricao(eventToEdit.descricao);
        const validTypes = ['prova', 'trabalho', 'apresentacao', 'revisao', 'sessao_estudo', 'tarefa', 'lembrete'];
        setTipo(validTypes.includes(eventToEdit.tipo) ? eventToEdit.tipo : 'lembrete');
        setMateriaId(eventToEdit.materia_id || '');
        setTopicoId(eventToEdit.topico_id || '');
        
        const start = parseValidDate(eventToEdit.data_inicio);
        const end = parseValidDate(eventToEdit.data_fim);
        setDataInicio(getLocalDateString(start));
        setHoraInicio(start.toTimeString().slice(0, 5));
        setDataFim(getLocalDateString(end));
        setHoraFim(end.toTimeString().slice(0, 5));
        
        setDiaInteiro(eventToEdit.dia_inteiro || false);
        setLocal(eventToEdit.local || '');
        setCor(eventToEdit.cor || '#0284c7');
        setConcluido(eventToEdit.concluido || false);
        setSyncGoogle(eventToEdit.sync_enabled || false);
        setPeso(eventToEdit.peso ? String(eventToEdit.peso) : '');
      } else if (initialData) {
        setTitulo(initialData.titulo || '');
        setDescricao(initialData.descricao || '');
        const validTypes = ['prova', 'trabalho', 'apresentacao', 'revisao', 'sessao_estudo', 'tarefa', 'lembrete'];
        setTipo(initialData.tipo && validTypes.includes(initialData.tipo) ? initialData.tipo : 'lembrete');
        setMateriaId(initialData.materia_id || '');
        setTopicoId(initialData.topico_id || '');
        
        if (initialData.data_inicio) {
          const start = parseValidDate(initialData.data_inicio);
          setDataInicio(getLocalDateString(start));
          setHoraInicio(start.toTimeString().slice(0, 5));
        }
        if (initialData.data_fim) {
          const end = parseValidDate(initialData.data_fim);
          setDataFim(getLocalDateString(end));
          setHoraFim(end.toTimeString().slice(0, 5));
        }
        
        setDiaInteiro(initialData.dia_inteiro || false);
        setLocal(initialData.local || '');
        setCor(initialData.cor || '#8B5CF6');
        if (initialData.sync_enabled !== undefined) {
           setSyncGoogle(initialData.sync_enabled);
        }
      } else {
        // Reset defaults
        setTitulo('');
        setDescricao('');
        setTipo('lembrete');
        setMateriaId('');
        setTopicoId('');
        setDiaInteiro(false);
        setLocal('');
        setCor('#8B5CF6');
        setConcluido(false);
        setPeso('');
        setIsSuggested(false);

        // Fetch smart schedule
        if (user) {
          import('@/services/smartScheduleService').then(({ smartScheduleService }) => {
             smartScheduleService.findNextBestSlot(user.uid, now, 60).then(slot => {
                if (slot) {
                  setDataInicio(getLocalDateString(slot.start));
                  setHoraInicio(slot.start.toTimeString().slice(0, 5));
                  setDataFim(getLocalDateString(slot.end));
                  setHoraFim(slot.end.toTimeString().slice(0, 5));
                  setIsSuggested(true);
                } else {
                  setDataInicio(getLocalDateString(now));
                  setHoraInicio(now.toTimeString().slice(0, 5));
                  setDataFim(getLocalDateString(nextHour));
                  setHoraFim(nextHour.toTimeString().slice(0, 5));
                }
             });
          });
        }
      }
    }
  }, [isOpen, eventToEdit, initialData, user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || (!titulo.trim())) return;
    
    setIsSaving(true);
    
    const startIso = diaInteiro ? `${dataInicio}T00:00:00` : `${dataInicio}T${horaInicio}:00`;
    const endIso = diaInteiro ? `${dataFim}T23:59:59` : `${dataFim}T${horaFim}:00`;

    const proceedSave = async () => {
      try {
        const eventData: any = {
          user_id: user.uid,
          titulo,
          descricao,
          tipo,
          materia_id: materiaId || null,
          topico_id: topicoId || null,
          origem: eventToEdit ? eventToEdit.origem : 'manual',
          data_inicio: startIso,
          data_fim: endIso,
          dia_inteiro: diaInteiro,
          local,
          cor,
          concluido,
          peso: peso || null,
          sync_enabled: syncGoogle,
          sync_status: syncGoogle ? 'pendente' : 'local' as const
        };
        
        if (eventToEdit?.revisao_id) eventData.revisao_id = eventToEdit.revisao_id;
        if (eventToEdit?.sessao_id) eventData.sessao_id = eventToEdit.sessao_id;

        if (!eventToEdit) {
          const docId = await calendarService.createEvent(eventData);
          if (syncGoogle) {
              try {
                  await calendarService.syncLocalEventToGoogle(docId, user.uid);
              } catch (e: any) {
                  console.error("GCal Sync Error on Create", e);
                  toast.error(e.message?.includes('expirou') ? "Evento salvo localmente, mas conexão GCal expirou. Reconecte nas Configurações." : "Evento salvo no Revisa+, mas não foi possível sincronizar com Google Calendar.");
              }
          }
        } else {
          await calendarService.updateEvent(eventToEdit.id!, eventData);
          if (syncGoogle) {
              try {
                  await calendarService.syncLocalEventToGoogle(eventToEdit.id!, user.uid);
              } catch (e: any) {
                  console.error("GCal Sync Error on Update", e);
                  toast.error(e.message?.includes('expirou') ? "Evento atualizado localmente, mas conexão GCal expirou. Reconecte nas Configurações." : "Evento salvo no Revisa+, mas não foi possível sincronizar com Google Calendar.");
              }
          }
        }
        
        onClose();
      } catch (error) {
        console.error("Error saving event", error);
        toast.error("Erro ao salvar evento. Verifique os dados e tente novamente.");
      } finally {
        setIsSaving(false);
      }
    };

    if (!diaInteiro) {
        const startDt = parseValidDate(startIso);
        const endDt = parseValidDate(endIso);
        const { unifiedAvailabilityService } = await import('@/services/unifiedAvailabilityService');
        const conflictData = await unifiedAvailabilityService.checkScheduleConflict(user.uid, startDt, endDt, eventToEdit?.id);

        if (conflictData.hasConflict) {
            setIsSaving(false); 
            const conflictingList = conflictData.conflicts.map(c => `• ${c.title} (${c.type.toUpperCase()})`).join('\n');
            requestConfirm({
                title: 'Conflito de Horário Detectado',
                message: `Este horário entra em conflito com outros compromissos:\n\n${conflictingList}\n\nDeseja ajustar o horário ou salvar mesmo assim?`,
                confirmText: 'Salvar Mesmo Assim',
                cancelText: 'Ajustar Horário',
                isDanger: true,
                onConfirm: () => {
                    setIsSaving(true);
                    proceedSave();
                }
            });
            return;
        }
    }

    await proceedSave();
  };

  const handleDeleteClick = () => {
    if (!eventToEdit?.id) return;
    if (eventToEdit.google_event_id && eventToEdit.sync_enabled) {
        setShowDeleteModal(true);
    } else {
        requestConfirm({
          title: 'Excluir Evento',
          message: 'Tem certeza que deseja excluir este evento?',
          confirmText: 'Excluir',
          isDanger: true,
          onConfirm: () => executeDelete(false)
        });
    }
  };

  const executeDelete = async (deleteGoogle: boolean) => {
    if (!eventToEdit?.id) return;
    setIsSaving(true);
    try {
      await calendarService.deleteEvent(eventToEdit.id, { deleteGoogle });
      toast.success("Evento excluído.");
      setShowDeleteModal(false);
      onClose();
    } catch (error: any) {
      if (error.message === 'GCAL_TOKEN_EXPIRED') {
          // Token expired, delete from Google failed. The local event wasn't deleted yet.
          setShowDeleteModal(false);
          requestConfirm({
             title: 'Falha no GCal',
             message: 'Não foi possível excluir no Google porque a conexão expirou. Deseja excluir apenas do Revisa+?',
             confirmText: 'Excluir apenas do Revisa+',
             isDanger: true,
             onConfirm: async () => {
                try {
                  setIsSaving(true);
                  await calendarService.deleteEvent(eventToEdit.id, { deleteGoogle: false });
                  toast.success("Evento excluído localmente.");
                  onClose();
                } catch(e) {
                  toast.error("Erro ao excluir evento.");
                } finally {
                  setIsSaving(false);
                }
             }
          });
      } else {
          toast.error("Erro ao excluir evento.");
          console.error("Error deleting event", error);
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const tiposDisponiveis: { value: EventoAcademicoTipo, label: string }[] = [
    { value: 'prova', label: 'Prova' },
    { value: 'trabalho', label: 'Trabalho' },
    { value: 'apresentacao', label: 'Apresentação' },
    { value: 'revisao', label: 'Revisão' },
    { value: 'sessao_estudo', label: 'Sessão de Estudo' },
    { value: 'tarefa', label: 'Tarefa' },
    { value: 'lembrete', label: 'Lembrete' },
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="absolute inset-0 bg-background/80 backdrop-blur-sm"
          onClick={onClose}
        />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-2xl bg-surface-container rounded-3xl overflow-hidden shadow-2xl z-10 max-h-[90vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-outline/10">
            <h2 className="text-xl font-bold">{eventToEdit ? 'Editar Evento' : 'Novo Evento'}</h2>
            <button onClick={onClose} className="p-2 hover:bg-surface-variant rounded-full text-on-surface-variant transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 overflow-y-auto flex-1">
            <form id="event-form" onSubmit={handleSave} className="space-y-6">
              
              <div className="space-y-2">
                <input 
                  type="text" 
                  value={titulo} onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Título do evento" 
                  className="w-full bg-transparent text-2xl font-bold border-none placeholder-outline/50 focus:outline-none py-2"
                  autoFocus
                  required
                />
              </div>

               <div className="space-y-3">
                  <label className="text-xs font-bold text-outline uppercase tracking-wider">Tipo de Evento</label>
                  <div className="flex flex-wrap gap-2">
                     <div className="flex gap-2 p-1 bg-surface-container border border-outline/10 rounded-2xl w-full sm:w-auto overflow-x-auto custom-scrollbar">
                         {tiposDisponiveis.map((t, idx) => (
                            <button
                               key={`tipo-${t.value}-${idx}`}
                               type="button"
                               onClick={() => setTipo(t.value as EventoAcademicoTipo)}
                               className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${tipo === t.value ? 'bg-primary text-on-primary shadow-sm' : 'hover:bg-surface-variant text-on-surface-variant'}`}
                            >
                               {t.label}
                            </button>
                         ))}
                     </div>
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-outline uppercase tracking-wider">Cor de Destaque</label>
                    <div className="flex bg-surface-container border border-outline/10 rounded-2xl p-2 gap-2 justify-between">
                       {['#0284c7', '#8B5CF6', '#ec4899', '#f59e0b', '#10b981', '#ef4444', '#64748b'].map((c, idx) => (
                          <button
                            key={`color-${c}-${idx}`}
                            type="button"
                            onClick={() => setCor(c)}
                            className={`w-10 h-10 rounded-xl transition-all flex items-center justify-center ${cor === c ? 'ring-2 ring-primary ring-offset-2 ring-offset-surface-container' : 'hover:scale-110'}`}
                            style={{ backgroundColor: c }}
                          >
                             {cor === c && <Check className="w-5 h-5 text-white" />}
                          </button>
                       ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                     <label className="text-xs font-bold text-outline uppercase tracking-wider">Matéria (Opcional)</label>
                     <select 
                       value={materiaId} 
                       onChange={(e) => setMateriaId(e.target.value)}
                       className="w-full bg-surface-container-highest border border-outline/20 rounded-xl px-4 h-14"
                     >
                       <option value="">Sem vinculação</option>
                       {materias.map((m, idx) => <option key={getStableRenderKey('materia', m, idx)} value={m.id}>{m.nome}</option>)}
                     </select>
                  </div>
                </div>

                 {materiaId && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-primary uppercase tracking-wider">Tópico (Opcional)</label>
                    <select 
                      value={topicoId} 
                      onChange={(e) => setTopicoId(e.target.value)}
                      className="w-full bg-surface-container-highest border border-outline/20 rounded-xl px-4 py-3"
                    >
                      <option value="">Nenhum tópico</option>
                      {topicos.filter(t => t.materia_id === materiaId).map((t, idx) => (
                        <option key={getStableRenderKey('topico', t, idx)} value={t.id}>{t.nome}</option>
                      ))}
                    </select>
                  </div>
                )}

                {['prova', 'trabalho', 'apresentacao'].includes(tipo) && (
                  <div className="grid grid-cols-2 gap-4 mt-4">
                     <div className="space-y-2">
                        <label className="text-xs font-bold text-outline uppercase tracking-wider">Peso / Valor</label>
                        <input 
                           type="text" 
                           value={peso}
                           onChange={(e) => setPeso(e.target.value)}
                           placeholder="Ex: 2.0"
                           className="w-full bg-surface-container-highest border border-outline/20 rounded-xl px-4 py-3"
                        />
                     </div>
                     <div className="space-y-2">
                        <label className="text-xs font-bold text-outline uppercase tracking-wider">Lembretes Automáticos</label>
                        <div className="text-[10px] text-primary/80 px-2 py-3 bg-primary/10 rounded-xl font-medium">Avisa 7, 3 e 1 dia antes.</div>
                     </div>
                  </div>
                )}

              <div className="bg-surface-container-highest rounded-2xl p-4 space-y-4">
                <div className="flex items-center gap-2">
                  <input id="diainteiro" type="checkbox" checked={diaInteiro} onChange={e => setDiaInteiro(e.target.checked)} className="w-4 h-4 rounded border-outline/30 text-primary focus:ring-primary/20 bg-surface-container-lowest" />
                  <label htmlFor="diainteiro" className="text-sm font-medium">Dia inteiro</label>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs text-outline font-medium flex items-center justify-between">
                      Início
                      {isSuggested && <span className="text-[9px] text-primary capitalize">Sugerido</span>}
                    </label>
                    <div className="flex gap-2">
                      <input type="date" value={dataInicio} onChange={e => { setDataInicio(e.target.value); setIsSuggested(false); }} className="flex-1 bg-surface-container-lowest border border-outline/20 rounded-xl px-3 py-2 text-sm" required />
                      {!diaInteiro && <input type="time" value={horaInicio} onChange={e => { setHoraInicio(e.target.value); setIsSuggested(false); }} className="w-24 bg-surface-container-lowest border border-outline/20 rounded-xl px-3 py-2 text-sm" required />}
                    </div>
                    {!diaInteiro && isInRestWindow(horaInicio) && (
                      <p className="text-[10px] text-orange-400 mt-1">Esse horário está dentro da sua janela de descanso</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-outline font-medium">Fim</label>
                    <div className="flex gap-2">
                      <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className="flex-1 bg-surface-container-lowest border border-outline/20 rounded-xl px-3 py-2 text-sm" required />
                      {!diaInteiro && <input type="time" value={horaFim} onChange={e => setHoraFim(e.target.value)} className="w-24 bg-surface-container-lowest border border-outline/20 rounded-xl px-3 py-2 text-sm" required />}
                    </div>
                    {!diaInteiro && isInRestWindow(horaFim) && (
                      <p className="text-[10px] text-orange-400 mt-1">Esse horário está dentro da sua janela de descanso</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <AlignLeft className="w-5 h-5 text-outline mt-3 shrink-0" />
                  <textarea 
                    value={descricao} onChange={(e) => setDescricao(e.target.value)}
                    placeholder="Adicionar descrição ou observações"
                    rows={3}
                    className="w-full bg-surface-container-highest border border-outline/20 rounded-xl px-4 py-3 placeholder:text-outline/50 resize-none"
                  />
                </div>
                
                <div className="flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-outline shrink-0" />
                  <input 
                    type="text" value={local} onChange={(e) => setLocal(e.target.value)}
                    placeholder="Adicionar local"
                    className="w-full bg-surface-container-highest border border-outline/20 rounded-xl px-4 py-3"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-outline/10 space-y-3">
                <div className="flex flex-col gap-1">
                  <label className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface-variant transition-colors cursor-pointer">
                    <input type="checkbox" checked={syncGoogle} onChange={e => setSyncGoogle(e.target.checked)} className="w-5 h-5 rounded border-outline/30 text-primary bg-surface-container-lowest" />
                    <span className="font-medium">Sincronizar com Google Calendar</span>
                  </label>
                  {!isGcalConnected && syncGoogle && (
                     <div className="pl-11 text-xs text-orange-400 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Conecte o Google Calendar em Configurações para sincronizar.
                     </div>
                  )}
                  {eventToEdit && (
                     <div className="pl-11 text-xs text-outline/60 flex items-center gap-1">
                        Status atual: <strong>{
                           eventToEdit.sync_status === 'sincronizado' ? 'Sincronizado' :
                           eventToEdit.sync_status === 'erro' || eventToEdit.sync_status === 'precisa_reconectar' ? 'Falha ou desconectado' :
                           eventToEdit.sync_status === 'pendente' ? 'Pendente' :
                           eventToEdit.sync_status === 'externo' ? 'Importado externamente' :
                           'Salvo apenas no Revisa+'
                        }</strong>
                     </div>
                  )}
                </div>
                
                {eventToEdit && (
                  <label className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface-variant transition-colors cursor-pointer bg-primary/5 border border-primary/20">
                    <div className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${concluido ? 'bg-primary border-primary text-on-primary' : 'border-outline/50 bg-surface-container-lowest text-transparent'}`}>
                      <Check className="w-3.5 h-3.5" />
                    </div>
                    <input type="checkbox" checked={concluido} onChange={e => setConcluido(e.target.checked)} className="hidden" />
                    <span className="font-medium text-primary">Marcar evento como concluído</span>
                  </label>
                )}
              </div>

            </form>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-outline/10 flex items-center justify-between gap-4 bg-surface-container border-t">
            {eventToEdit ? (
              <button 
                type="button" onClick={handleDeleteClick} disabled={isSaving}
                className="p-3 text-error hover:bg-error/10 rounded-xl transition-colors shrink-0 disabled:opacity-50"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            ) : <div></div>}
            
            <div className="flex gap-3">
              <button type="button" onClick={onClose} disabled={isSaving} className="px-6 py-3 font-bold rounded-xl hover:bg-surface-variant transition-colors disabled:opacity-50">
                Cancelar
              </button>
              <button type="submit" form="event-form" disabled={isSaving || !titulo.trim()} className="px-6 py-3 bg-primary text-on-primary font-bold rounded-xl hover:bg-primary/90 transition-colors flex items-center gap-2 disabled:opacity-50">
                {isSaving ? 'Salvando...' : <><CheckCircle2 className="w-5 h-5" /> Salvar</>}
              </button>
            </div>
          </div>

        </motion.div>
      </div>

      <AnimatePresence>
         {showDeleteModal && (
            <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-background/80 backdrop-blur-md">
               <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full max-w-sm glass-panel rounded-2xl shadow-2xl overflow-hidden flex flex-col p-6 border border-outline/10">
                  <div className="flex items-center gap-3 mb-4 text-error">
                     <AlertTriangle className="w-6 h-6" />
                     <h3 className="text-xl font-bold">Excluir Evento</h3>
                  </div>
                  <p className="text-on-surface mb-6 opacity-80 text-sm">
                     Este evento está sincronizado com o Google Calendar. O que você deseja fazer?
                  </p>
                  <div className="flex flex-col gap-3">
                     <button onClick={() => executeDelete(true)} disabled={isSaving} className="btn-primary w-full bg-error text-white hover:bg-error/90 disabled:opacity-50 border-none font-bold py-3 text-sm">
                        Excluir do Revisa+ e do Google
                     </button>
                     <button onClick={() => executeDelete(false)} disabled={isSaving} className="btn-secondary w-full disabled:opacity-50 font-bold py-3 text-sm">
                        Excluir Apenas do Revisa+
                     </button>
                     <button onClick={() => setShowDeleteModal(false)} disabled={isSaving} className="font-bold py-2 mt-2 text-outline/80 hover:text-outline transition-colors disabled:opacity-50 text-sm">
                        Cancelar
                     </button>
                  </div>
               </motion.div>
            </div>
         )}
      </AnimatePresence>
    </AnimatePresence>
  );
}
