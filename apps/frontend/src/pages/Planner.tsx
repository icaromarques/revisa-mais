import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { Calendar as CalendarIcon, List, LayoutGrid, Plus, CheckCircle, Clock, Trash2, Edit2, Play, Sparkles, MapPin, RefreshCw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useConfirm } from '@/contexts/ConfirmContext';
import { EventoAcademico } from '@/types/calendar';
import { format, isSameDay, startOfWeek, addDays, getDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarEventModal } from '@/components/CalendarEventModal';
import { toast } from '@/lib/toast';
import { calendarService } from '@/services/calendarService';
import { plannerService } from '@/services/plannerService';
import { availabilityService } from '@/services/availabilityService';
import { GradeFaculdade, BloqueioAgenda } from '@/types/availability';
import { useNavigate } from 'react-router-dom';
import { googleCalendarService } from '@/services/googleCalendar';
import { unifiedAvailabilityService } from '@/services/unifiedAvailabilityService';
import { apiClient } from '@/lib/api';

import { SectionErrorBoundary } from '@/components/ErrorBoundary';

export function Planner() {
  const { user } = useAuth();
  const { requestConfirm } = useConfirm();
  const navigate = useNavigate();
  const [blocos, setBlocos] = useState<EventoAcademico[]>([]);
  const [grade, setGrade] = useState<GradeFaculdade[]>([]);
  const [bloqueios, setBloqueios] = useState<BloqueioAgenda[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'semana' | 'lista'>('semana');
  const [generating, setGenerating] = useState(false);
  const [lastSyncText, setLastSyncText] = useState('Verificando status de sincronização...');

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBlock, setSelectedBlock] = useState<EventoAcademico | null>(null);

  useEffect(() => {
    if (!user) return;

    // Get last sync context for header
    apiClient.get('/usuarios/me').then(({ data }) => {
       if (data && data.gcal_last_sync) {
          setLastSyncText(unifiedAvailabilityService.getSyncStatusDisplay(data.gcal_last_sync));
       } else {
          setLastSyncText('');
       }
    }).catch(console.error);

    // Fetch Eventos
    calendarService.fetchUserEvents(user.id).then((events: any[]) => {
      const validEvents = events.filter(e => e.data_inicio && !isNaN(new Date(e.data_inicio).getTime()));
      const sorted = validEvents.sort((a,b) => new Date(a.data_inicio).getTime() - new Date(b.data_inicio).getTime());
      setBlocos(sorted);
      setLoading(false);
    });

    // Fetch Grade + Bloqueios
    availabilityService.getGradeFaculdade(user.id).then(res => setGrade(res.filter((g: any) => g.ativo)));
    availabilityService.getBloqueios(user.id).then(res => setBloqueios(res.filter((b: any) => b.ativo)));

  }, [user]);

  const handleGenerateCronograma = async () => {
    if (!user) return;
    setGenerating(true);
    try {
      const created = await plannerService.generateHeuristicSchedule(user.id);
      if (created > 0) {
         toast.success(`${created} novos blocos sugeridos baseados em suas revisões pendentes!`);
      } else {
         toast.info(`Não encontramos novas necessidades de estudo para sugerir agora.`);
      }
    } catch (e: any) {
      toast.error('Erro ao gerar cronograma: ' + e.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleOpenNew = () => {
    setSelectedBlock(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (bloco: EventoAcademico) => {
    setSelectedBlock(bloco);
    setIsModalOpen(true);
  };

  const handleToggleConcluido = async (bloco: EventoAcademico) => {
    try {
      await calendarService.updateEvent(bloco.id!, {
        concluido: !bloco.concluido
      });
      toast.success(bloco.concluido ? 'Bloco reaberto!' : 'Bloco concluído!');
    } catch (e) {
      toast.error('Erro ao atualizar status');
    }
  };

  const handleDelete = async (id: string) => {
    requestConfirm({
      title: 'Excluir Bloco',
      message: 'Excluir este bloco?',
      confirmText: 'Excluir',
      isDanger: true,
      onConfirm: async () => {
        try {
          await calendarService.deleteEvent(id);
          toast.success('Bloco excluído!');
        } catch (e) {
          toast.error('Erro ao excluir');
        }
      }
    });
  };

  const renderList = () => {
    if (loading) return <p className="text-center text-on-surface-variant mt-10">Carregando...</p>;
    if (blocos.length === 0) return (
        <div className="glass-panel rounded-2xl p-8 text-center mt-8">
          <CalendarIcon className="w-16 h-16 text-outline-variant mx-auto mb-4" />
          <h3 className="text-xl font-bold mb-2">Seu Planner está vazio</h3>
          <p className="text-on-surface-variant mb-6">Adicione blocos de estudo para organizar sua semana.</p>
          <button onClick={handleOpenNew} className="px-6 py-3 bg-surface-container-highest text-on-surface font-bold rounded-xl hover:bg-surface-variant transition-colors">
            Adicionar Novo Bloco
          </button>
        </div>
    );

    return (
      <div className="space-y-4">
        {blocos.map(bloco => (
          <div key={bloco.id} className={`glass-panel p-4 rounded-xl flex items-center justify-between group transition-all border ${bloco.concluido ? 'border-success/30 bg-success/5' : 'border-outline/10 hover:border-primary/30'}`}>
            <div className="flex items-center gap-4 cursor-pointer flex-1" onClick={() => handleOpenEdit(bloco)}>
               <div onClick={(e) => { e.stopPropagation(); handleToggleConcluido(bloco); }} className={`w-10 h-10 rounded-xl flex items-center justify-center cursor-pointer transition-colors ${bloco.concluido ? 'bg-success text-on-success' : 'bg-surface-container-highest text-on-surface-variant hover:bg-surface-variant'}`}>
                 {bloco.concluido ? <CheckCircle className="w-6 h-6" /> : <div className="w-5 h-5 rounded-full border-2 border-current" />}
               </div>
               <div>
                  <h4 className={`font-bold text-sm ${bloco.concluido ? 'line-through text-on-surface-variant' : 'text-on-surface'}`}>
                    {bloco.titulo}
                    {bloco.origem === 'automatica' && (
                      <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-bold tracking-widest uppercase bg-primary/10 text-primary" title="Horário sugerido automaticamente">Auto</span>
                    )}
                  </h4>
                  <div className="flex gap-2 items-center text-[10px] uppercase font-bold tracking-wider text-on-surface-variant mt-1">
                    <span style={{color: bloco.cor || 'currentColor'}}>{bloco.tipo}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {format(new Date(bloco.data_inicio), "dd MMM HH:mm", {locale:ptBR})}</span>
                  </div>
               </div>
            </div>

            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => toast.info('Em breve: Iniciar Timer')} className="px-3 py-1.5 text-xs font-bold bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors">
                Iniciar
              </button>
              <button onClick={() => handleDelete(bloco.id!)} className="p-1.5 text-on-surface-variant hover:text-error hover:bg-error/10 rounded-lg transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderWeek = () => {
    if (loading) return <p className="text-center text-on-surface-variant mt-10">Carregando...</p>;
    
    // Quick 7 days view starts from today
    const days = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        days.push(d);
    }
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
        {days.map((day, dIdx) => {
           const evts = blocos.filter(b => b.data_inicio && isSameDay(new Date(b.data_inicio), day));
           const weekDay = getDay(day);

           const gradeDay = grade.filter(g => g.dia_semana === weekDay);
           const bloqueioDay = bloqueios.filter(b => {
             if (b.recorrente) return b.dia_semana === weekDay;
             if (b.data_especifica) return isSameDay(new Date(b.data_especifica), day);
             return false;
           });

           // Mix everything to sort by time
           const allItems: any[] = [];
           
           gradeDay.forEach(g => {
             allItems.push({
               id: 'grade_'+g.id,
               type: 'grade',
               titulo: g.titulo,
               hora_inicio: g.hora_inicio,
               cor: g.cor || '#4F46E5',
               local: g.local
             });
           });

           bloqueioDay.forEach(b => {
             allItems.push({
               id: 'bloqueio_'+b.id,
               type: 'bloqueio',
               titulo: b.titulo,
               hora_inicio: b.hora_inicio,
               cor: b.cor || '#6B7280',
             });
           });

           evts.forEach(e => {
             allItems.push({
               ...e,
               type: 'evento',
               hora_inicio: format(new Date(e.data_inicio), 'HH:mm')
             });
           });

           allItems.sort((a,b) => (a.hora_inicio || '').localeCompare(b.hora_inicio || ''));

           return (
               <div key={dIdx} className={`rounded-xl border border-outline/10 p-4 ${isSameDay(day, new Date()) ? 'bg-primary/5 border-primary/20' : 'bg-surface-container-low'}`}>
                  <h3 className={`text-sm font-bold mb-3 ${isSameDay(day, new Date()) ? 'text-primary' : 'text-on-surface-variant'}`}>{format(day, 'EEEEEE, dd', {locale:ptBR})}</h3>
                  {allItems.length === 0 ? (
                     <p className="text-xs text-on-surface-variant opacity-50">Sem blocos</p>
                  ) : (
                     <div className="space-y-2">
                        {allItems.map(bloco => {
                           if (bloco.type === 'grade') {
                             return (
                               <div key={bloco.id} className="group flex flex-col p-2.5 rounded-lg border text-xs bg-surface-container border-outline/5 relative overflow-hidden" style={{borderLeftWidth: '3px', borderLeftColor: bloco.cor}}>
                                  <div className="flex justify-between items-start mb-1">
                                    <span className="font-bold line-clamp-2 text-on-surface">{bloco.titulo}</span>
                                  </div>
                                  <div className="flex justify-between items-center mt-auto">
                                     <span className="font-mono opacity-60 text-[10px]">{bloco.hora_inicio}</span>
                                     <span className="opacity-50 text-[10px]">Aula</span>
                                  </div>
                               </div>
                             );
                           }

                           if (bloco.type === 'bloqueio') {
                             return (
                               <div key={bloco.id} className="group flex flex-col p-2.5 rounded-lg border text-xs bg-surface-container border-outline/5 relative overflow-hidden" style={{borderLeftWidth: '3px', borderLeftColor: bloco.cor}}>
                                  <div className="flex justify-between items-start mb-1">
                                    <span className="font-bold line-clamp-2 text-on-surface line-through decoration-on-surface-variant/50">{bloco.titulo}</span>
                                  </div>
                                  <div className="flex justify-between items-center mt-auto">
                                     <span className="font-mono opacity-60 text-[10px]">{bloco.hora_inicio}</span>
                                     <span className="opacity-50 text-[10px]">Ocupado</span>
                                  </div>
                               </div>
                             );
                           }

                           // Evento
                           return (
                             <div key={bloco.id} onClick={() => handleOpenEdit(bloco)} className={`cursor-pointer group flex flex-col p-2.5 rounded-lg border text-xs transition-colors hover:shadow-sm ${bloco.concluido ? 'bg-success/5 border-success/30' : 'bg-surface-container-highest border-outline/10 hover:border-primary/40'}`}>
                                <div className="flex justify-between items-start mb-1">
                                  <span className={`font-bold line-clamp-2 ${bloco.concluido ? 'line-through text-on-surface-variant' : 'text-on-surface'}`}>{bloco.titulo}</span>
                                </div>
                                <div className="flex justify-between items-center mt-auto">
                                   <span className="font-mono opacity-60 text-[10px]">{bloco.hora_inicio}</span>
                                   {bloco.tipo === 'sessao_estudo' && !bloco.concluido && (
                                      <div 
                                         onClick={(e) => { e.stopPropagation(); navigate('/pomodoro'); }}
                                         className="bg-primary/10 text-primary p-1 rounded hover:bg-primary/20"
                                         title="Começar sessão"
                                      >
                                         <Play className="w-3 h-3" />
                                      </div>
                                   )}
                                </div>
                             </div>
                           )
                        })}
                     </div>
                  )}
               </div>
           );
        })}
      </div>
    );
  };

  return (
    <>
      <Header title="Planner" subtitle="Organize seus blocos de estudo.">
        <div className="flex items-center gap-4 ml-6">
          <div className="flex bg-surface-container-low rounded-lg p-1 border border-outline-variant/10">
            <button onClick={() => setViewMode('semana')} className={`p-2 rounded-md transition-colors ${viewMode === 'semana' ? 'bg-surface-container-highest text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}><CalendarIcon className="w-4 h-4" /></button>
            <button onClick={() => setViewMode('lista')} className={`p-2 rounded-md transition-colors ${viewMode === 'lista' ? 'bg-surface-container-highest text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}><List className="w-4 h-4" /></button>
          </div>
          <button onClick={handleOpenNew} className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-full text-sm font-bold hover:bg-primary-fixed transition-colors">
            <Plus className="w-4 h-4" />
            Novo Bloco
          </button>
        </div>
      </Header>

      <div className="p-8 max-w-7xl mx-auto w-full">
         <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
           <div>
             <h2 className="text-xl font-bold flex items-center gap-2">Meus Blocos</h2>
             <p className="text-[10px] text-on-surface-variant flex items-center gap-1 mt-1 opacity-70">
               <RefreshCw className="w-3 h-3" /> {lastSyncText}
             </p>
           </div>
           <button 
             onClick={handleGenerateCronograma} 
             disabled={generating}
             className="px-4 py-2 bg-tertiary/10 text-tertiary flex gap-2 items-center font-bold text-sm rounded-xl hover:bg-tertiary/20 transition-colors disabled:opacity-50"
           >
             <Sparkles className="w-4 h-4" />
             {generating ? 'Gerando...' : 'Gerar Cronograma IA'}
           </button>
         </div>
         <SectionErrorBoundary title="Visualização do Planner" name="PlannerContent">
           {viewMode === 'lista' ? renderList() : renderWeek()}
         </SectionErrorBoundary>
      </div>

      <CalendarEventModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        eventToEdit={selectedBlock}
      />
    </>
  );
}
