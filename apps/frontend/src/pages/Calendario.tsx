import React, { useState, useEffect, useRef } from 'react';
import { Header } from '@/components/Header';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Plus, BookOpen, Clock, AlertCircle, RotateCw, Filter } from 'lucide-react';
import { format, addMonths, subMonths, addDays, subDays, addWeeks, subWeeks, addYears, subYears, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';
import { calendarService } from '@/services/calendarService';
import { EventoAcademico } from '@/types/calendar';
import { CalendarEventModal } from '@/components/CalendarEventModal';
import { EventDetailModal } from '@/components/EventDetailModal';
import { DayDetailModal } from '@/components/DayDetailModal';
import { toast } from 'sonner';

import { SectionErrorBoundary } from '@/components/ErrorBoundary';

import { getVisibleCalendarEvents, getCalendarRenderKey, resolveCalendarColor, getCalendarVisibleRange } from '@/lib/calendar-utils';

export function Calendario() {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<EventoAcademico[]>([]);
  const visibleEvents = React.useMemo(() => getVisibleCalendarEvents(events), [events]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [detailEvent, setDetailEvent] = useState<EventoAcademico | null>(null);
  
  const [isDayModalOpen, setIsDayModalOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<Date>(new Date());
  
  // Sidebar filters
  const [sidebarFilter, setSidebarFilter] = useState<'todos' | 'hoje' | '7dias' | 'avaliacoes' | 'google' | 'revisa'>('7dias');

  const [selectedEvent, setSelectedEvent] = useState<EventoAcademico | null>(null);
  const [modalInitialData, setModalInitialData] = useState<Partial<EventoAcademico>>({});

  const [isSyncing, setIsSyncing] = useState(false);
  const isSyncingRef = useRef(false);

  // Premium Views Architecture
  type CalendarView = 'day' | 'week' | 'month' | 'year' | 'agenda';
  const [activeView, setActiveView] = useState<CalendarView>('month');

  // Auto-sync Google Calendar periodically and on focus
  const lastSyncTime = useRef<number>(0);
  
  useEffect(() => {
     if (!user) return;
     let isMounted = true;

     const doSync = async (silent = true) => {
         if (isSyncingRef.current) return;
         
         const now = Date.now();
         // 2 minute cooldown for silent syncs
         if (silent && now - lastSyncTime.current < 120000) return;
         
         try {
             const { googleCalendarService } = await import('@/services/googleCalendar');
             const status = await googleCalendarService.getConnectionStatus(user.id);
             if (status.canSync) {
                 isSyncingRef.current = true;
                 if (!silent) setIsSyncing(true);
                 
                 const { timeMin, timeMax } = getCalendarVisibleRange(activeView, currentDate);
                 
                 await calendarService.syncGoogleRange(user.id, timeMin, timeMax).catch(e => {
                     // don't spam console
                 });
                 lastSyncTime.current = Date.now();
             }
         } catch(e) { /* ignore */ }
         finally {
             if (isMounted) {
                 isSyncingRef.current = false;
                 if (!silent) setIsSyncing(false);
             }
         }
     };

     doSync();

     const onFocus = () => {
         doSync();
     };
     window.addEventListener('focus', onFocus);

     const interval = setInterval(() => {
         doSync();
     }, 5 * 60 * 1000);

     return () => {
         isMounted = false;
         window.removeEventListener('focus', onFocus);
         clearInterval(interval);
     };
  }, [user, currentDate]);

  const handleManualSync = async () => {
     if (!user || isSyncingRef.current) return;
     setIsSyncing(true);
     isSyncingRef.current = true;
     try {
         const { googleCalendarService } = await import('@/services/googleCalendar');
         const status = await googleCalendarService.getConnectionStatus(user.id);
         if (!status.canSync) {
             toast.info(status.message || "Conecte o Google Calendar nas configurações.");
             setIsSyncing(false);
             isSyncingRef.current = false;
             return;
         }
         const { timeMin, timeMax } = getCalendarVisibleRange(activeView, currentDate);
         await calendarService.syncGoogleRange(user.id, timeMin, timeMax);
         toast.success("Agenda sincronizada com Google Calendar!");
     } catch (e: any) {
         toast.error(e.message?.includes('expirou') ? "Sua conexão expirou. Reconecte nas configurações." : "Erro ao sincronizar GCal");
     } finally {
         setIsSyncing(false);
         isSyncingRef.current = false;
     }
  };

  useEffect(() => {
    if (!user) return;
    const unsubscribe = calendarService.subscribeToUserEvents(user.id, async (data) => {
      
      const validData = data.filter(e => e.data_inicio && !isNaN(new Date(e.data_inicio).getTime()));
      
      // --- Add Grade and Bloqueios ---
      const timeMin = startOfWeek(startOfMonth(currentDate));
      const timeMax = endOfWeek(endOfMonth(currentDate));
      
      const { availabilityService } = await import('@/services/availabilityService');
      const { isSameDay } = await import('date-fns');
      const gradeDocs = await availabilityService.getGradeFaculdade(user.id);
      const blockDocs = await availabilityService.getBloqueios(user.id);
      
      const isDateWithinValidity = (item: any, d: Date) => {
         const startV = item.data_inicio_vigencia || item.periodo_inicio;
         const endV = item.data_fim_vigencia || item.periodo_fim;
         
         if (startV) {
             const startD = new Date(startV);
             // handle local timezone offset from YYYY-MM-DD
             const locStart = new Date(startD.getTime() + startD.getTimezoneOffset() * 60000);
             locStart.setHours(0,0,0,0);
             if (d < locStart) return false;
         }
         if (endV) {
             const endD = new Date(endV);
             const locEnd = new Date(endD.getTime() + endD.getTimezoneOffset() * 60000);
             locEnd.setHours(23,59,59,999);
             if (d > locEnd) return false;
         }
         return true;
      };

      let dateIter = new Date(timeMin);
      const synthesizedEvents: any[] = [];

      while(dateIter <= timeMax) {
        const day = dateIter.getDay(); // 0-6
        const iterDayMidnight = new Date(dateIter);
        iterDayMidnight.setHours(0,0,0,0);
        
        // Grade
        gradeDocs.filter(g => g.ativo).forEach(g => {
           if (!isDateWithinValidity(g, iterDayMidnight)) return;

           const hasDay = g.recorrente !== false && (g.dias_semana ? g.dias_semana.includes(day) : g.dia_semana === day);
           let shouldShow = hasDay;
           
           if (!shouldShow && g.recorrente === false && g.data_especifica) {
             const bd = new Date(g.data_especifica);
             const bdLocal = new Date(bd.getTime() + bd.getTimezoneOffset() * 60000);
             bdLocal.setHours(0,0,0,0);
             if (isSameDay(bdLocal, iterDayMidnight)) {
               shouldShow = true;
             }
           }

           if (shouldShow) {
             const startD = new Date(dateIter);
             const [sh, sm] = g.hora_inicio.split(':').map(Number);
             startD.setHours(sh, sm, 0, 0);
             
             const endD = new Date(dateIter);
             const [eh, em] = g.hora_fim ? g.hora_fim.split(':').map(Number) : [sh + 1, sm];
             endD.setHours(eh, em, 0, 0);

             synthesizedEvents.push({
                id: 'grade_'+g.id+'_'+startD.getTime(),
                user_id: user.id,
                titulo: g.titulo,
                descricao: '',
                tipo: 'aula',
                origem: 'grade',
                cor: g.cor || '#4F46E5',
                data_inicio: startD.toISOString(),
                data_fim: endD.toISOString(),
                dia_inteiro: false,
                local: g.local || '',
                concluido: false,
                sync_status: 'local' as const
             });
           }
        });

        // Bloqueios
        blockDocs.filter(b => b.ativo).forEach(b => {
           if (!isDateWithinValidity(b, iterDayMidnight)) return;

           const hasDay = b.recorrente && (b.dias_semana ? b.dias_semana.includes(day) : b.dia_semana === day);
           if (hasDay || (!b.recorrente && b.data_especifica && isSameDay(new Date(b.data_especifica + 'T00:00:00'), iterDayMidnight))) {
              const startD = new Date(dateIter);
              const [sh, sm] = b.hora_inicio.split(':').map(Number);
              startD.setHours(sh, sm, 0, 0);
              
              const endD = new Date(dateIter);
              const [eh, em] = b.hora_fim ? b.hora_fim.split(':').map(Number) : [sh + 1, sm];
              endD.setHours(eh, em, 0, 0);

              synthesizedEvents.push({
                 id: 'block_'+b.id+'_'+startD.getTime(),
                 user_id: user.id,
                 titulo: b.titulo,
                 descricao: '',
                 tipo: 'bloqueio',
                 origem: 'sistema',
                 cor: b.cor || '#6B7280',
                 data_inicio: startD.toISOString(),
                 data_fim: endD.toISOString(),
                 dia_inteiro: false,
                 local: '',
                 concluido: false,
                 sync_status: 'local' as const
              });
           }
        });

        dateIter.setDate(dateIter.getDate() + 1);
      }
      
      setEvents([...validData, ...synthesizedEvents]);
    });
    return () => unsubscribe();
  }, [user, currentDate]);

  const goNext = () => {
    switch (activeView) {
       case 'day': return setCurrentDate(addDays(currentDate, 1));
       case 'week': return setCurrentDate(addWeeks(currentDate, 1));
       case 'month': return setCurrentDate(addMonths(currentDate, 1));
       case 'year': return setCurrentDate(addYears(currentDate, 1));
       case 'agenda': return setCurrentDate(addDays(currentDate, 30));
    }
  };

  const goPrevious = () => {
    switch (activeView) {
       case 'day': return setCurrentDate(subDays(currentDate, 1));
       case 'week': return setCurrentDate(subWeeks(currentDate, 1));
       case 'month': return setCurrentDate(subMonths(currentDate, 1));
       case 'year': return setCurrentDate(subYears(currentDate, 1));
       case 'agenda': return setCurrentDate(subDays(currentDate, 30));
    }
  };
  const goToToday = () => setCurrentDate(new Date());

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);
  
  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

  const eventsForDay = (day: Date) => {
    return visibleEvents.filter(e => isSameDay(new Date(e.data_inicio), day));
  };

  const handleDayClick = (day: Date) => {
    setSelectedDay(day);
    setIsDayModalOpen(true);
  };
  
  const handleNewEventOnDay = (day: Date) => {
    const defaultStart = new Date(day);
    defaultStart.setHours(9, 0, 0, 0);
    const defaultEnd = new Date(day);
    defaultEnd.setHours(10, 0, 0, 0);

    setModalInitialData({
        data_inicio: defaultStart.toISOString(),
        data_fim: defaultEnd.toISOString()
    });
    setSelectedEvent(null);
    setIsModalOpen(true);
  };

  const handleEventClick = (e: React.MouseEvent, event: EventoAcademico) => {
    e.stopPropagation();
    setDetailEvent(event);
    setIsDetailModalOpen(true);
  };

  const openNewEvent = () => {
    setModalInitialData({});
    setSelectedEvent(null);
    setIsModalOpen(true);
  };

  const getTypeStyle = (tipo: string, cor?: string) => {
    const hexCor = resolveCalendarColor(cor);

    if (tipo === 'revisao') return { bg: `${hexCor}20`, text: hexCor, border: `${hexCor}50` };
    if (tipo === 'prova') return { bg: '#EF444420', text: '#EF4444', border: '#EF444450' };
    if (tipo === 'trabalho') return { bg: '#F59E0B20', text: '#F59E0B', border: '#F59E0B50' };
    if (tipo === 'bloqueio') return { bg: '#6B728020', text: '#9CA3AF', border: '#6B728050' };
    if (tipo === 'aula') return { bg: `${hexCor}10`, text: hexCor, border: `${hexCor}30` };
    return { bg: `${hexCor}20`, text: hexCor, border: `${hexCor}50` };
  };

  return (
    <>
      <Header title="Calendário" subtitle="Visão geral dos seus compromissos e prazos." />

      <div className="p-4 md:p-8 max-w-7xl mx-auto w-full flex flex-col lg:flex-row gap-6">
        
        {/* Main Calendar Area */}
        <SectionErrorBoundary title="Visualização do Calendário" name="CalendarGrid">
          <div className="flex-1 glass-panel rounded-3xl p-6 flex flex-col">
            
            {/* Calendar Header Controls */}
            <div className="flex flex-col mb-4 gap-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4 border border-outline/10 p-1 rounded-xl bg-surface-container-lowest">
                   {['day', 'week', 'month', 'year', 'agenda'].map((v, idx) => (
                      <button
                         key={`viewbtn-${v}-${idx}`}
                         onClick={() => setActiveView(v as CalendarView)}
                         className={`px-3 py-1.5 rounded-lg text-sm font-bold capitalize transition-all ${activeView === v ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant hover:bg-surface-variant'}`}
                      >
                         {v === 'day' ? 'Dia' : v === 'week' ? 'Semana' : v === 'month' ? 'Mês' : v === 'year' ? 'Ano' : 'Agenda'}
                      </button>
                   ))}
                </div>
                <div className="flex items-center gap-3">
                   <button onClick={handleManualSync} disabled={isSyncing} className="p-2 px-4 rounded-xl text-sm font-bold bg-surface-container hover:bg-surface-variant transition-colors flex items-center gap-2">
                     <RotateCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} /> Sincronizar GCal
                   </button>
                   <button onClick={openNewEvent} className="btn-primary py-2.5 px-5 rounded-xl text-sm whitespace-nowrap">
                     <Plus className="w-5 h-5 mr-2" /> Novo Evento
                   </button>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <h2 className="text-2xl font-black capitalize">
                    {activeView === 'year' ? format(currentDate, 'yyyy', { locale: ptBR }) :
                     activeView === 'day' ? format(currentDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) :
                     activeView === 'week' ? (() => {
                        const wStart = startOfWeek(currentDate);
                        const wEnd = endOfWeek(currentDate);
                        if (isSameMonth(wStart, wEnd)) return `${format(wStart, 'dd')} a ${format(wEnd, 'dd')} de ${format(wStart, 'MMMM yyyy', { locale: ptBR })}`;
                        return `${format(wStart, "dd 'de' MMM")} a ${format(wEnd, "dd 'de' MMM yyyy", { locale: ptBR })}`;
                     })() :
                     activeView === 'agenda' ? `Agenda a partir de ${format(currentDate, "dd 'de' MMMM", { locale: ptBR })}` :
                     format(currentDate, 'MMMM yyyy', { locale: ptBR })}
                  </h2>
                  <div className="flex bg-surface-container rounded-xl p-1">
                    <button onClick={goPrevious} className="p-2 hover:bg-surface-variant text-on-surface-variant rounded-lg transition-colors">
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button onClick={goToToday} className="px-4 py-2 font-bold text-sm hover:bg-surface-variant text-on-surface-variant rounded-lg transition-colors">
                      Hoje
                    </button>
                    <button onClick={goNext} className="p-2 hover:bg-surface-variant text-on-surface-variant rounded-lg transition-colors">
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {activeView === 'month' && (
              <div className="flex-1 border border-outline/10 rounded-2xl overflow-hidden flex flex-col">
                {/* Weekdays */}
                <div className="grid grid-cols-7 bg-surface-container border-b border-outline/10">
                  {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day, idx) => (
                    <div key={`header-day-${day}-${idx}`} className="py-3 text-center text-xs font-bold text-outline uppercase tracking-wider">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Days */}
                <div className="grid grid-cols-7 flex-1 auto-rows-fr">
                  {calendarDays.map((day, idx) => {
                    const dayEvents = eventsForDay(day);

                    const isCurrentMonth = isSameMonth(day, monthStart);
                    const isDayToday = isToday(day);

                    return (
                      <div 
                        key={`cell-${format(day, 'yyyy-MM-dd')}-${idx}`}
                        onClick={() => handleDayClick(day)}
                        className={`min-h-[100px] border-b border-r border-outline/10 p-2 cursor-pointer transition-colors relative
                          ${idx % 7 === 6 ? 'border-r-0' : ''} 
                          ${!isCurrentMonth ? 'bg-surface-container-lowest/50 opacity-50' : 'hover:bg-surface-container/50'}`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <span className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold
                            ${isDayToday ? 'bg-primary text-on-primary shadow-md shadow-primary/20' : ''}
                          `}>
                            {format(day, 'd')}
                          </span>
                        </div>

                        <div className="space-y-1">
                          {dayEvents.slice(0, 3).map((event, eventIdx) => {
                            const style = getTypeStyle(event.tipo, event.cor);
                            return (
                              <div 
                                key={getCalendarRenderKey(event, 'month', eventIdx)}
                                onClick={(e) => handleEventClick(e, event)}
                                className="text-[10px] px-2 py-1 rounded truncate font-medium border relative pr-4"
                                style={{ backgroundColor: style.bg, color: style.text, borderColor: style.border }}
                                title={event.sync_status === 'erro' || event.sync_status === 'precisa_reconectar' ? "Erro de sincronização com GCal" : event.sync_status === 'externo' ? "Google Calendar Externo" : event.sync_status === 'sincronizado' ? "Sincronizado" : "Local Revisa+"}
                              >
                                <div className="absolute right-1 top-1 flex flex-col gap-[2px]">
                                   {event.sync_status === 'sincronizado' && <div className="w-1.5 h-1.5 rounded-full bg-blue-500 opacity-60"></div>}
                                   {event.sync_status === 'externo' && <div className="w-1.5 h-1.5 rounded-full bg-blue-300 opacity-80"></div>}
                                   {(event.sync_status === 'erro' || event.sync_status === 'precisa_reconectar') && <div className="w-1.5 h-1.5 rounded-full bg-red-500 opacity-80"></div>}
                                </div>
                                {format(new Date(event.data_inicio), 'HH:mm')} - {event.titulo}
                              </div>
                            );
                          })}
                          {dayEvents.length > 3 && (
                            <div className="text-[10px] text-outline px-2 font-medium">
                              +{dayEvents.length - 3} mais
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {activeView === 'day' && (
              <div className="flex-1 flex flex-col items-center justify-center border border-outline/10 text-on-surface-variant font-medium rounded-2xl bg-surface-container-lowest py-20">
                 Trabalhando na Visão Dia
              </div>
            )}

            {activeView === 'week' && (
               <div className="flex-1 flex flex-col items-center justify-center border border-outline/10 text-on-surface-variant font-medium rounded-2xl bg-surface-container-lowest py-20">
                  Trabalhando na Visão Semana
               </div>
            )}

            {activeView === 'year' && (
               <div className="flex-1 flex flex-col items-center justify-center border border-outline/10 text-on-surface-variant font-medium rounded-2xl bg-surface-container-lowest py-20">
                  Trabalhando na Visão Ano
               </div>
            )}

            {activeView === 'agenda' && (
               <div className="flex-1 flex flex-col items-center justify-center border border-outline/10 text-on-surface-variant font-medium rounded-2xl bg-surface-container-lowest py-20">
                  Trabalhando na Visão Agenda
               </div>
            )}
          </div>
        </SectionErrorBoundary>

        {/* Sidebar */}
        <SectionErrorBoundary title="Próximos Compromissos" name="CalendarSidebar">
          <div className="w-full lg:w-80 space-y-6">
            
            <div className="glass-panel rounded-3xl p-6 h-full flex flex-col">
              <h3 className="font-bold mb-4 flex items-center gap-2 text-primary">
                <Filter className="w-5 h-5" />
                Sua Agenda
              </h3>
              
              <div className="flex flex-wrap gap-2 mb-6 text-xs">
                 <button onClick={() => setSidebarFilter('hoje')} className={`px-3 py-1.5 rounded-full font-semibold transition-colors ${sidebarFilter === 'hoje' ? 'bg-primary text-on-primary' : 'bg-surface-container hover:bg-surface-variant'}`}>Hoje</button>
                 <button onClick={() => setSidebarFilter('7dias')} className={`px-3 py-1.5 rounded-full font-semibold transition-colors ${sidebarFilter === '7dias' ? 'bg-primary text-on-primary' : 'bg-surface-container hover:bg-surface-variant'}`}>Próx 7 Dias</button>
                 <button onClick={() => setSidebarFilter('avaliacoes')} className={`px-3 py-1.5 rounded-full font-semibold transition-colors ${sidebarFilter === 'avaliacoes' ? 'bg-primary text-on-primary' : 'bg-surface-container hover:bg-surface-variant'}`}>Avaliações</button>
                 <button onClick={() => setSidebarFilter('google')} className={`px-3 py-1.5 rounded-full font-semibold transition-colors ${sidebarFilter === 'google' ? 'bg-primary text-on-primary' : 'bg-surface-container hover:bg-surface-variant'}`}>Google</button>
                 <button onClick={() => setSidebarFilter('revisa')} className={`px-3 py-1.5 rounded-full font-semibold transition-colors ${sidebarFilter === 'revisa' ? 'bg-primary text-on-primary' : 'bg-surface-container hover:bg-surface-variant'}`}>Revisa+</button>
              </div>

              <div className="space-y-3 overflow-y-auto flex-1 custom-scrollbar pr-2 pb-4">
                {(() => {
                  const filteredEvents = visibleEvents.filter(e => {
                     if (e.tipo === 'bloqueio' || e.concluido) return false;
                     const targetDate = new Date(e.data_inicio);
                     targetDate.setHours(23,59,59,999);
                     if (targetDate < new Date()) return false;

                     if (sidebarFilter === 'hoje') return isToday(targetDate);
                     if (sidebarFilter === '7dias') {
                        const sevenDaysLater = new Date();
                        sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);
                        return targetDate <= sevenDaysLater;
                     }
                     if (sidebarFilter === 'avaliacoes') return ['prova', 'trabalho', 'apresentacao'].includes(e.tipo);
                     if (sidebarFilter === 'google') return e.origem === 'google_external' || e.sync_status === 'sincronizado';
                     if (sidebarFilter === 'revisa') return e.origem !== 'google_external';
                     return true;
                  }).sort((a, b) => new Date(a.data_inicio).getTime() - new Date(b.data_inicio).getTime());

                  if (filteredEvents.length === 0) {
                     return (
                        <div className="flex flex-col items-center justify-center py-10 opacity-60 text-center">
                           <AlertCircle className="w-8 h-8 mb-3" />
                           <p className="text-sm">
                             {sidebarFilter === 'hoje' ? 'Nenhum evento hoje.' :
                              sidebarFilter === '7dias' ? 'Nenhum evento nos próximos 7 dias.' :
                              sidebarFilter === 'avaliacoes' ? 'Nenhuma avaliação encontrada.' :
                              sidebarFilter === 'google' ? 'Nenhum evento do Google encontrado.' :
                              'Nenhum evento encontrado.'}
                           </p>
                        </div>
                     );
                  }

                  return filteredEvents.slice(0, 15).map((event, idx) => (
                    <div key={getCalendarRenderKey(event, 'sidebar', idx)} onClick={(e) => handleEventClick(e, event)} className="p-3 bg-surface-container-highest rounded-xl cursor-pointer hover:bg-surface-variant transition-colors group border border-outline/10 flex gap-3 relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: resolveCalendarColor(event.cor) }}></div>
                      <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <span className="font-bold text-sm line-clamp-2 group-hover:text-primary transition-colors leading-tight" title={event.titulo}>{event.titulo}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-outline tracking-wider mb-2">
                             {event.origem === 'google_external' && <span className="bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded">Google</span>}
                             <span>{event.tipo.replace('_', ' ')}</span>
                          </div>
                          <div className="flex flex-col gap-1 text-xs text-on-surface-variant font-medium">
                            <div className="flex items-center gap-1.5">
                              <CalendarIcon className="w-3 h-3 flex-shrink-0" />
                              {format(new Date(event.data_inicio), "dd MMM, HH:mm", { locale: ptBR })}
                            </div>
                            {event.materia_nome && (
                                <div className="flex items-center gap-1.5 text-primary opacity-80">
                                   <BookOpen className="w-3 h-3 flex-shrink-0" />
                                   <span className="truncate">{event.materia_nome}</span>
                                </div>
                            )}
                          </div>
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>
          </div>
        </SectionErrorBoundary>

      </div>

      <CalendarEventModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        eventToEdit={selectedEvent}
        initialData={modalInitialData}
      />
      
      <EventDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        event={detailEvent}
        onEdit={(evt) => {
            setSelectedEvent(evt);
            setIsModalOpen(true);
        }}
        onImportAsLocal={(evt) => {
            setModalInitialData({
                ...evt,
                id: undefined,
                google_event_id: undefined,
                google_calendar_id: undefined,
                htmlLink: undefined,
                source_calendar_id: undefined,
                google_status: undefined,
                origem: 'manual',
                imported_from_google: false,
                google_deleted: false,
                sync_enabled: false,
                sync_status: 'local',
                tipo: evt.tipo === 'evento_google' ? 'lembrete' : evt.tipo
            });
            setSelectedEvent(null);
            setIsModalOpen(true);
        }}
      />
      
      <DayDetailModal
        isOpen={isDayModalOpen}
        onClose={() => setIsDayModalOpen(false)}
        date={selectedDay}
        events={eventsForDay(selectedDay)}
        onEventClick={(evt) => {
           setDetailEvent(evt);
           setIsDetailModalOpen(true);
        }}
        onNewEvent={handleNewEventOnDay}
      />
    </>
  );
}
