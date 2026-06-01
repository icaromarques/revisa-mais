import { useState, useRef, useEffect, useMemo } from 'react';
import { Header } from '@/components/Header';
import { useSessionModal } from '@/contexts/SessionModalContext';
import { useStudyTimer } from '@/contexts/StudyTimerContext';
import { useAuth } from '@/contexts/AuthContext';
import { CalendarDays, Activity, Timer, PenTool } from 'lucide-react';
import { CalendarEventModal } from '@/components/CalendarEventModal';
import { TimeRange, dateFilters } from '@/lib/dashboard/dateFilters';
import { useDashboardData } from '@/hooks/useDashboardData';

import { useSmartAvailability } from '@/hooks/useSmartAvailability';

import { DashboardStatsRow } from '@/components/dashboard/DashboardStatsRow';
import { DashboardAulasDoDiaCard } from '@/components/dashboard/DashboardAulasDoDiaCard';
import { DashboardAgendaDiaCard } from '@/components/dashboard/DashboardAgendaDiaCard';
import { DashboardJanelasLivresCard } from '@/components/dashboard/DashboardJanelasLivresCard';
import { DashboardCriticalIssuesCard } from '@/components/dashboard/DashboardCriticalIssuesCard';
import { DashboardRecommendedActionCard } from '@/components/dashboard/DashboardRecommendedActionCard';
import { DashboardUpcomingDeadlinesCard } from '@/components/dashboard/DashboardUpcomingDeadlinesCard';
import { DashboardGradeHojeCard } from '@/components/dashboard/DashboardGradeHojeCard';
import { DashboardRecentFlowCard } from '@/components/dashboard/DashboardRecentFlowCard';
import { DashboardWeeklyStreakCard } from '@/components/dashboard/DashboardWeeklyStreakCard';
import { DashboardTodaySessions } from '@/components/dashboard/DashboardTodaySessions';

import { DashboardConfirmationCard } from '@/components/dashboard/DashboardConfirmationCard';
import { ModalNovaAula } from '@/components/ModalNovaAula';
import { gradeOccurrenceService } from '@/services/gradeOccurrenceService';
import { toast } from '@/lib/toast';
import { parseValidDate } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '@/lib/api';

import { SectionErrorBoundary } from '@/components/ErrorBoundary';

export function Dashboard() {
  const { openModal } = useSessionModal();
  const { openSettings } = useStudyTimer();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [timeRange, setTimeRange] = useState<TimeRange>('hoje');
  const [customStart, setCustomStart] = useState<Date | undefined>();
  const [customEnd, setCustomEnd] = useState<Date | undefined>();
  
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [isPeriodMenuOpen, setIsPeriodMenuOpen] = useState(false);
  const [showCustomRangePicker, setShowCustomRangePicker] = useState(false);
  const [tempStart, setTempStart] = useState('');
  const [tempEnd, setTempEnd] = useState('');
  
  const [isAulaModalOpen, setIsAulaModalOpen] = useState(false);
  const [aulaInitialData, setAulaInitialData] = useState<any>(null);
  const [pendingAulaMateriaId, setPendingAulaMateriaId] = useState('');
  const [materiaTopicos, setMateriaTopicos] = useState<any[]>([]);

  const periodMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (periodMenuRef.current && !periodMenuRef.current.contains(event.target as Node)) {
        setIsPeriodMenuOpen(false);
        setShowCustomRangePicker(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const {
    loading,
    materiasMap,
    sessoes,
    revisoesPendentes,
    academicEvents,
    gradeDocs,
    blockDocs,
    stats,
    previousStats,
    streak,
    allAgenda,
    todayAgenda,
    criticalSubject,
    ocorrencias
  } = useDashboardData(user?.id, timeRange, customStart, customEnd);

  const handleConfirmAssistida = async (oc: any) => {
    setPendingAulaMateriaId(oc.materia_id);
    setAulaInitialData({ 
      titulo: materiasMap[oc.materia_id]?.nome || 'Aula da Grade',
      data: oc.data,
      ocorrencia_id: oc.id
    });

    try {
      const { data } = await apiClient.get(`/topicos/materia/${oc.materia_id}`);
      setMateriaTopicos(data);
    } catch (e) {
      console.error("Erro ao buscar tópicos", e);
      setMateriaTopicos([]);
    }
    
    setIsAulaModalOpen(true);
  };

  const handleConfirmFalta = async (oc: any) => {
    try {
      await gradeOccurrenceService.confirmOccurrence(oc.id, 'falta');
      toast.important('Falta registrada. Não esqueça de recuperar o conteúdo!');
    } catch (e) {
      toast.error('Erro ao registrar falta.');
    }
  };

  const handleCancelOccurrence = async (oc: any) => {
    try {
      await gradeOccurrenceService.confirmOccurrence(oc.id, 'cancelada');
      toast.info('Aula marcada como cancelada.');
    } catch (e) {
      toast.error('Erro ao cancelar.');
    }
  };

  const today = useMemo(() => new Date(), []);
  const { freeSlots } = useSmartAvailability(user?.id, today, 30);
  const nextSlot = freeSlots.length > 0 ? freeSlots[0] : null;

  if (loading && Object.keys(materiasMap).length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
        <p className="text-on-surface-variant font-medium animate-pulse">Carregando painel de controle...</p>
      </div>
    );
  }

  const rangeText = dateFilters.getRangeLabel(timeRange, customStart, customEnd);

  const handleApplyCustomRange = () => {
    if (tempStart && tempEnd) {
      setCustomStart(parseValidDate(tempStart + 'T00:00:00'));
      setCustomEnd(parseValidDate(tempEnd + 'T23:59:59'));
      setTimeRange('personalizado');
      setShowCustomRangePicker(false);
      setIsPeriodMenuOpen(false);
    }
  };

  const handleSelectPredefined = (range: TimeRange) => {
    setTimeRange(range);
    setCustomStart(undefined);
    setCustomEnd(undefined);
    setIsPeriodMenuOpen(false);
    setShowCustomRangePicker(false);
  };

  const handleAgendaClick = (item: any) => {
    if (item.type === 'revisao') {
      const isAtrasada = item.dateObj && item.dateObj < new Date();
      openModal({
        tipoSessao: 'revisao',
        revisaoId: item.rawData.id,
        materiaId: item.materia,
        origem: isAtrasada ? 'dashboard_revisao_atrasada' : 'dashboard_revisao'
      });
    }
  };

  const isCustomOrSecondaryActive = !['hoje', 'amanha', '7d', 'mes'].includes(timeRange);

  return (
    <>
      <Header title="Dashboard">
        <div className="flex items-center bg-surface-container-low rounded-full border border-outline-variant/10 ml-4 shadow-inner p-1 relative">
          {(['hoje', 'amanha', '7d', 'mes'] as TimeRange[]).map(rt => (
            <button 
              key={rt}
              onClick={() => handleSelectPredefined(rt)}
              className={`px-4 py-1 text-xs font-bold rounded-full transition-all capitalize whitespace-nowrap ${timeRange === rt ? 'bg-primary text-on-primary shadow-md' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'}`}
            >
              {rt === '7d' ? '7 Dias' : rt}
            </button>
          ))}
          
          <div className="relative ml-1" ref={periodMenuRef}>
            <button
               onClick={() => setIsPeriodMenuOpen(!isPeriodMenuOpen)}
               className={`flex items-center justify-center w-8 h-8 rounded-full transition-all ${isCustomOrSecondaryActive || isPeriodMenuOpen ? 'bg-primary/20 text-primary border border-primary/30' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'}`}
               title="Outros períodos"
            >
              <CalendarDays className="w-4 h-4" />
            </button>
            
            {isPeriodMenuOpen && (
              <div className="absolute left-1/2 -translate-x-1/2 top-full mt-3 w-56 bg-popover border border-outline/30 rounded-2xl shadow-2xl ring-1 ring-outline/20 overflow-hidden z-[100]">
                {!showCustomRangePicker ? (
                  <div className="flex flex-col p-2 gap-1 text-sm bg-transparent">
                    {(['ontem', '3d', 'semana', '30d'] as TimeRange[]).map(rt => (
                        <button
                          key={rt}
                          onClick={() => handleSelectPredefined(rt)}
                          className={`text-left px-3 py-2.5 rounded-lg transition-colors font-bold ${
                            timeRange === rt 
                              ? 'bg-primary/15 text-primary' 
                              : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
                          }`}
                        >
                          {rt === '3d' ? 'Últimos 3 dias' : rt === '30d' ? 'Últimos 30 dias' : rt === 'semana' ? 'Esta semana' : rt.charAt(0).toUpperCase() + rt.slice(1)}
                        </button>
                    ))}
                    <div className="h-px bg-outline/20 my-1 mx-2"></div>
                    <button
                      onClick={() => setShowCustomRangePicker(true)}
                      className={`text-left px-3 py-2.5 rounded-lg transition-colors font-bold ${
                        timeRange === 'personalizado' 
                          ? 'bg-primary/15 text-primary' 
                          : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
                      }`}
                    >
                      Personalizado...
                    </button>
                  </div>
                ) : (
                  <div className="p-4 flex flex-col gap-4 bg-transparent">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-bold text-on-surface tracking-tight">Intervalo</span>
                      <button onClick={() => { setShowCustomRangePicker(false); }} className="text-on-surface-variant hover:text-on-surface w-6 h-6 flex items-center justify-center rounded-full hover:bg-surface-container-high transition-colors">
                         <span className="text-xs uppercase tracking-widest font-black">X</span>
                      </button>
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold tracking-widest text-on-surface-variant mb-1 block">Início</label>
                      <input type="date" value={tempStart} onChange={e => setTempStart(e.target.value)} className="w-full bg-surface-container-low border border-outline/20 rounded-lg px-3 py-2 text-sm text-on-surface" />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold tracking-widest text-on-surface-variant mb-1 block">Fim</label>
                      <input type="date" value={tempEnd} onChange={e => setTempEnd(e.target.value)} className="w-full bg-surface-container-low border border-outline/20 rounded-lg px-3 py-2 text-sm text-on-surface" />
                    </div>
                    <button 
                      onClick={handleApplyCustomRange}
                      disabled={!tempStart || !tempEnd}
                      className="mt-2 w-full bg-primary text-on-primary py-2 rounded-lg text-xs font-bold uppercase tracking-widest hover:brightness-110 disabled:opacity-50"
                    >
                      Aplicar
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </Header>

      <div className="p-8 space-y-8 max-w-[1400px] mx-auto w-full animate-in fade-in duration-500">
        
        <div className="text-[11px] font-black text-on-surface-variant mb-4 uppercase tracking-widest flex items-center gap-2">
          <CalendarDays className="w-3.5 h-3.5" />
          {rangeText}
        </div>

        {/* Confirmação de Aulas */}
        {timeRange === 'hoje' && (
          <SectionErrorBoundary title="Aulas pendentes de confirmação" name="DashboardConfirmation">
            <DashboardConfirmationCard 
              ocorrencias={ocorrencias}
              materiasMap={materiasMap}
              onConfirmAssistida={handleConfirmAssistida}
              onConfirmFalta={handleConfirmFalta}
              onCancel={handleCancelOccurrence}
            />
          </SectionErrorBoundary>
        )}
        
        {/* Nível 3 / Compact Stats Row */}
        <SectionErrorBoundary title="Estatísticas do período" name="DashboardStats">
          <DashboardStatsRow stats={stats} previousStats={previousStats} timeRange={timeRange} />
        </SectionErrorBoundary>

        {/* Action Level & Organization Level */}
        <div className="grid grid-cols-12 gap-6 items-start">
           
           {/* Coluna Principal Hoje (Central) */}
           <div className="col-span-12 lg:col-span-8 flex flex-col gap-6">
              
              {/* Recommended Action Full Width inside area */}
              {user && (
                <SectionErrorBoundary title="Recomendação inteligente" name="DashboardRecommended">
                  <DashboardRecommendedActionCard 
                     revisoesPendentes={revisoesPendentes} 
                     nextSlot={nextSlot} 
                     onActionClick={() => {
                         if (revisoesPendentes.length > 0) navigate('/revisoes');
                         else navigate('/resumos');
                     }}
                  />
                </SectionErrorBoundary>
              )}

              {/* Sessões do Dia (Visible only in Today view) */}
              {timeRange === 'hoje' && sessoes.length > 0 && (
                <SectionErrorBoundary title="Sessões registradas no dia" name="DashboardTodaySessions">
                  <DashboardTodaySessions sessoes={sessoes} materiasMap={materiasMap} />
                </SectionErrorBoundary>
              )}

              {/* Aulas & Agenda */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 {/* Aulas do Dia */}
                 <section className="glass-panel rounded-2xl overflow-hidden flex flex-col">
                   <div className="p-5 border-b border-outline/50 bg-primary/5 flex justify-between items-center">
                     <h3 className="font-black text-sm text-on-surface uppercase tracking-tight">📚 Aulas e Eventos</h3>
                     <button onClick={() => { setSelectedEvent(null); setIsEventModalOpen(true); }} className="text-[10px] font-bold text-primary hover:underline">+ Nova</button>
                   </div>
                   <div className="p-5 bg-surface-container-low flex-1 max-h-[350px] overflow-y-auto custom-scrollbar">
                    <SectionErrorBoundary title="Eventos e Aulas" name="DashboardAulas">
                      <DashboardAulasDoDiaCard agenda={['hoje', 'amanha'].includes(timeRange) ? todayAgenda : allAgenda} materiasMap={materiasMap} />
                    </SectionErrorBoundary>
                   </div>
                 </section>

                 {/* Timeline Agenda */}
                 <section className="glass-panel rounded-2xl overflow-hidden flex flex-col">
                   <div className="p-5 border-b border-outline/50 flex justify-between items-center">
                     <h3 className="font-black text-sm text-on-surface uppercase tracking-tight">Agenda do dia</h3>
                     <span className="text-[9px] font-black uppercase text-outline">
                       {['hoje', 'amanha'].includes(timeRange) ? (timeRange === 'hoje' ? 'Hoje' : 'Amanhã') : 'Período'}
                     </span>
                   </div>
                   <div className="p-5 bg-surface-container-low flex-1 max-h-[350px] overflow-y-auto custom-scrollbar">
                    <SectionErrorBoundary title="Agenda do Dia" name="DashboardAgenda">
                      <DashboardAgendaDiaCard 
                        agenda={['hoje', 'amanha'].includes(timeRange) ? todayAgenda : allAgenda} 
                        onItemClick={handleAgendaClick}
                      />
                    </SectionErrorBoundary>
                   </div>
                 </section>
              </div>

              {/* Grade Hoje */}
              <section className="glass-panel rounded-2xl p-5">
                 <div className="mb-3 flex items-center justify-between">
                    <h3 className="font-black text-[11px] text-on-surface uppercase tracking-widest text-outline">Estrutura Fixa do Dia</h3>
                 </div>
                 <SectionErrorBoundary title="Estrutura fixa de horários" name="DashboardGrade">
                    <DashboardGradeHojeCard gradeDocs={gradeDocs} blockDocs={blockDocs} />
                 </SectionErrorBoundary>
              </section>

           </div>

           {/* Coluna Secundária (Direita) */}
           <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
              
              {/* Critical Widget */}
              <div className="h-[220px]">
                <SectionErrorBoundary title="Alerta crítico" name="DashboardCritical">
                  <DashboardCriticalIssuesCard 
                     criticalSubject={criticalSubject} 
                     onActionClick={() => {
                         if (criticalSubject?.type === 'faltas') {
                             navigate(`/materias/${criticalSubject.id}`);
                         } else {
                             openModal();
                         }
                     }} 
                  />
                </SectionErrorBoundary>
              </div>

              {/* Free Slots */}
              {user && (
                <SectionErrorBoundary title="Janelas livres detectadas" name="DashboardAvailability">
                   <DashboardJanelasLivresCard nextSlot={nextSlot} />
                </SectionErrorBoundary>
              )}

              {/* Streak */}
              <div className="h-[180px]">
                <SectionErrorBoundary title="Frequência semanal" name="DashboardStreak">
                  <DashboardWeeklyStreakCard streak={streak} />
                </SectionErrorBoundary>
              </div>

              {/* Upcoming Deadlines */}
              <section className="glass-panel rounded-2xl p-5">
                 <h3 className="font-black text-[11px] text-on-surface uppercase tracking-widest text-outline mb-4">Próximas Avaliações</h3>
                 <SectionErrorBoundary title="Avaliações programadas" name="DashboardDeadlines">
                    <DashboardUpcomingDeadlinesCard events={academicEvents} />
                 </SectionErrorBoundary>
              </section>

              {/* Recent Flow */}
              <section className="glass-panel rounded-2xl p-5">
                 <div className="flex justify-between items-center mb-4">
                    <h3 className="font-black text-[11px] text-on-surface uppercase tracking-widest text-outline">Fluxo Recente</h3>
                    <Activity className="w-3.5 h-3.5 text-outline" />
                 </div>
                 <SectionErrorBoundary title="Fluxo de estudos recentes" name="DashboardFlow">
                    <DashboardRecentFlowCard sessoes={sessoes} materiasMap={materiasMap} />
                 </SectionErrorBoundary>
              </section>
              
           </div>
        </div>

        {/* Quick Actions Integration */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-outline/10">
          <button onClick={openSettings} className="group relative p-6 glass-panel rounded-2xl hover:bg-primary/5 transition-all text-left overflow-hidden">
            <div className="absolute -right-6 -bottom-6 opacity-0 group-hover:opacity-10 transition-all group-hover:scale-110">
              <Timer className="w-24 h-24 text-primary" />
            </div>
            <div className="relative z-10 flex flex-col gap-4">
              <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-on-primary transition-all duration-300">
                <Timer className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-black text-sm text-on-surface uppercase tracking-tight">Ritual Pomodoro</h4>
                <p className="text-[10px] text-on-surface-variant mt-1 leading-relaxed">Inicie um ciclo de foco profundo agora.</p>
              </div>
            </div>
          </button>
          
          <button onClick={() => openModal()} className="group relative p-6 glass-panel rounded-2xl hover:bg-tertiary/5 transition-all text-left overflow-hidden">
            <div className="absolute -right-6 -bottom-6 opacity-0 group-hover:opacity-10 transition-all group-hover:scale-110">
              <PenTool className="w-24 h-24 text-tertiary" />
            </div>
            <div className="relative z-10 flex flex-col gap-4">
              <div className="w-10 h-10 bg-tertiary/20 rounded-xl flex items-center justify-center text-tertiary group-hover:bg-tertiary group-hover:text-on-tertiary transition-all duration-300">
                <PenTool className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-black text-sm text-on-surface uppercase tracking-tight">Registro Manual</h4>
                <p className="text-[10px] text-on-surface-variant mt-1 leading-relaxed">Registre sessões ou avaliações passadas.</p>
              </div>
            </div>
          </button>

          <button onClick={() => navigate('/planner')} className="group relative p-6 glass-panel rounded-2xl hover:bg-success/5 transition-all text-left overflow-hidden">
            <div className="absolute -right-6 -bottom-6 opacity-0 group-hover:opacity-10 transition-all group-hover:scale-110">
              <CalendarDays className="w-24 h-24 text-success" />
            </div>
            <div className="relative z-10 flex flex-col gap-4">
              <div className="w-10 h-10 bg-success/20 rounded-xl flex items-center justify-center text-success group-hover:bg-success group-hover:text-on-success transition-all duration-300">
                <CalendarDays className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-black text-sm text-on-surface uppercase tracking-tight">Planner Semanal</h4>
                <p className="text-[10px] text-on-surface-variant mt-1 leading-relaxed">Acesse sua grade de estudos completa.</p>
              </div>
            </div>
          </button>
        </section>

      </div>

      <CalendarEventModal 
        isOpen={isEventModalOpen}
        onClose={() => setIsEventModalOpen(false)}
        eventToEdit={selectedEvent}
        materias={[]}
        topicos={[]}
      />

      {isAulaModalOpen && (
        <ModalNovaAula 
          isOpen={isAulaModalOpen}
          onClose={() => setIsAulaModalOpen(false)}
          aulaAtual={null}
          materiaId={pendingAulaMateriaId}
          topicos={materiaTopicos}
          initialData={aulaInitialData}
        />
      )}
    </>
  );
}

