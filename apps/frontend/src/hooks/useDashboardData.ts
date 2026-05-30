import { useState, useEffect, useMemo } from 'react';
import { apiClient } from '@/lib/api';
import { TimeRange, dateFilters } from '@/lib/dashboard/dateFilters';
import { calculateWeeklyStreak, StreakData } from '@/lib/dashboard/streak';
import { buildAgendaItems, AgendaItem } from '@/lib/dashboard/agenda';
import { calendarService } from '@/services/calendarService';
import { availabilityService } from '@/services/availabilityService';
import { gradeOccurrenceService } from '@/services/gradeOccurrenceService';
import { startOfDay } from 'date-fns';
import { getPerformanceClass, PerformanceClass } from '@/lib/performanceUtils';
import { OcorrenciaGrade } from '@/types/availability';
import { calculateTotalExpectedOccurrences } from '@/lib/attendanceHelper';
import { calcularResumoFaltas, analisarLimiteDeFaltas } from '@/utils/faltasCalculator';
import { parseValidDate } from '@/lib/utils';
import { integrityService } from '@/services/integrityService';

export interface DashboardData {
  loading: boolean;
  materiasMap: Record<string, { nome: string; cor: string }>;
  materias: any[];
  sessoes: any[];
  revisoesPendentes: any[];
  academicEvents: any[];
  gradeDocs: any[];
  blockDocs: any[];
  stats: {
    totalMinutos: number;
    totalSessoes: number;
    aproveitamento: number;
    totalQuestoes: number;
    performance: PerformanceClass;
  };
  previousStats: {
    totalMinutos: number;
    totalSessoes: number;
    aproveitamento: number;
    totalQuestoes: number;
  };
  streak: StreakData | null;
  todayAgenda: AgendaItem[];
  allAgenda: AgendaItem[];
  criticalSubject: any | null;
  ocorrencias: OcorrenciaGrade[];
}

export function useDashboardData(userId: string | undefined, timeRange: TimeRange, customStart?: Date, customEnd?: Date): DashboardData {
  const [loading, setLoading] = useState(true);
  const [materiasMap, setMateriasMap] = useState<Record<string, {nome: string, cor: string}>>({});
  const [sessoes, setSessoes] = useState<any[]>([]);
  const [previousSessoes, setPreviousSessoes] = useState<any[]>([]);
  const [streakSessoes, setStreakSessoes] = useState<any[]>([]);
  const [revisoesPendentes, setRevisoesPendentes] = useState<any[]>([]);
  const [academicEvents, setAcademicEvents] = useState<any[]>([]);
  const [gradeDocs, setGradeDocs] = useState<any[]>([]);
  const [materias, setMaterias] = useState<any[]>([]);
  const [blockDocs, setBlockDocs] = useState<any[]>([]);
  const [ocorrencias, setOcorrencias] = useState<OcorrenciaGrade[]>([]);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);

    const fetchData = async () => {
      try {
        // 1. Materias
        const { data: materiasData } = await apiClient.get('/materias');
        if (!isMounted) return;
        
        const map: Record<string, {nome: string, cor: string}> = {};
        materiasData.forEach((m: any) => { map[m.id] = { nome: m.nome, cor: m.cor }; });
        setMateriasMap(map);
        setMaterias(materiasData);

        // 2. Sessoes
        const { startDate, endDate } = dateFilters.getRangeDates(timeRange, customStart, customEnd);
        const { data: sessoesData } = await apiClient.get('/sessoes', {
          params: { startDate: startDate.toISOString(), endDate: endDate.toISOString() }
        });
        if (!isMounted) return;
        setSessoes(sessoesData.map((d: any) => integrityService.normalizeSession(d)));

        // Previous Period Sessoes
        const duration = endDate.getTime() - startDate.getTime();
        const prevEndDate = new Date(startDate.getTime() - 1);
        const prevStartDate = new Date(prevEndDate.getTime() - duration);
        const { data: prevSessoesData } = await apiClient.get('/sessoes', {
          params: { startDate: prevStartDate.toISOString(), endDate: prevEndDate.toISOString() }
        });
        if (!isMounted) return;
        setPreviousSessoes(prevSessoesData);

        // 3. Revisoes Pendentes
        const { data: revisoesData } = await apiClient.get('/revisoes', { params: { status: 'pendente' } });
        if (!isMounted) return;
        setRevisoesPendentes(revisoesData.map((d: any) => integrityService.normalizeReview(d)));

        // 4. Academic Events
        const eventosData = await calendarService.fetchUserEvents(userId);
        if (!isMounted) return;
        
        const filteredEvents = eventosData.filter(e => e.data_inicio && !isNaN(parseValidDate(e.data_inicio).getTime()));
        // TODO: Mover lógica pesada do GoogleCalendarService para o backend. 
        // Por ora, manter apenas eventos internos para o MVP da refatoração.
        setAcademicEvents(filteredEvents);

        // 5. Grade & Bloqueios
        const grade = await availabilityService.getGradeFaculdade(userId);
        const blocks = await availabilityService.getBloqueios(userId);
        if (!isMounted) return;
        setGradeDocs(grade);
        setBlockDocs(blocks);

        // 6. Occurrences
        const { data: ocorrenciasData } = await apiClient.get('/ocorrencias'); // Rota a ser ajustada se necessário
        if (!isMounted) return;
        setOcorrencias(ocorrenciasData.map((d: any) => integrityService.normalizeAbsence(d)));
        
        // Trigger daily occurrences (should idealmente estar no BE em Cron)
        gradeOccurrenceService.generateDailyOccurrences(userId);

        // Streak Sessions
        const { startDate: streakStart } = dateFilters.getRangeDates('7d');
        const { data: streakData } = await apiClient.get('/sessoes', {
           params: { startDate: streakStart.toISOString() }
        });
        if (!isMounted) return;
        setStreakSessoes(streakData);

        setLoading(false);
      } catch (e) {
        console.error("Error fetching dashboard data via API", e);
        if (isMounted) setLoading(false);
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [userId, timeRange, customStart, customEnd]);

  // Derivations
  const stats = useMemo(() => {
    const totalMinutos = sessoes.reduce((acc, s) => acc + (s.tempo_estudado_minutos || 0), 0);
    const totalQuestoes = sessoes.reduce((acc, s) => acc + (s.total_questoes || 0), 0);
    const totalAcertos = sessoes.reduce((acc, s) => acc + (s.acertos || 0), 0);
    const aproveitamento = totalQuestoes > 0 ? (totalAcertos / totalQuestoes) * 100 : 0;
    const performance = getPerformanceClass(totalAcertos, totalQuestoes);
    return { totalMinutos, totalSessoes: sessoes.length, aproveitamento, totalQuestoes, performance };
  }, [sessoes]);

  const previousStats = useMemo(() => {
    const totalMinutos = previousSessoes.reduce((acc, s) => acc + (s.tempo_estudado_minutos || 0), 0);
    const totalQuestoes = previousSessoes.reduce((acc, s) => acc + (s.total_questoes || 0), 0);
    const totalAcertos = previousSessoes.reduce((acc, s) => acc + (s.acertos || 0), 0);
    const aproveitamento = totalQuestoes > 0 ? (totalAcertos / totalQuestoes) * 100 : 0;
    return { totalMinutos, totalSessoes: previousSessoes.length, aproveitamento, totalQuestoes };
  }, [previousSessoes]);

  const streak = useMemo(() => calculateWeeklyStreak(streakSessoes, revisoesPendentes), [streakSessoes, revisoesPendentes]);

  const allAgenda = useMemo(() => {
      const { startDate, endDate } = dateFilters.getRangeDates(timeRange, customStart, customEnd);
      let ds: Date[] = [];
      let dIter = new Date(startDate);
      while(dIter <= endDate) {
         ds.push(new Date(dIter));
         dIter.setDate(dIter.getDate() + 1);
      }
      return buildAgendaItems(ds, gradeDocs, blockDocs, academicEvents);
  }, [timeRange, customStart, customEnd, gradeDocs, blockDocs, academicEvents]);

  const todayAgenda = useMemo(() => {
     const { startDate } = dateFilters.getRangeDates(timeRange, customStart, customEnd);
     return buildAgendaItems([startOfDay(startDate)], gradeDocs, blockDocs, academicEvents);
  }, [timeRange, customStart, customEnd, gradeDocs, blockDocs, academicEvents]);

  const criticalSubject = useMemo(() => {
    let riskSubject = null;
    let highestUsedLimit = 0;
    
    materias.forEach(mat => {
      if (mat.periodo_inicio && mat.periodo_fim && mat.limite_faltas_percentual) {
        const gradeMat = gradeDocs.filter(g => g.materia_id === mat.id);
        const ocorrenciasMatCount = ocorrencias.filter(o => o.materia_id === mat.id);
        
        const expected = calculateTotalExpectedOccurrences(gradeMat, mat.periodo_inicio, mat.periodo_fim);
        const resumoFaltas = calcularResumoFaltas(ocorrenciasMatCount);
        const analise = analisarLimiteDeFaltas(expected, mat.limite_faltas_percentual, resumoFaltas);
        
        if (analise && analise.riskStatus === 'critical' && analise.percentualUsado > highestUsedLimit) {
             highestUsedLimit = analise.percentualUsado;
             const limitRemaining = analise.faltasRestantes;
             riskSubject = {
               id: mat.id,
               nome: mat.nome,
               reviews: 0,
               score: 0,
               performance: { level: 'fraco', color: 'text-error', message: limitRemaining <= 0 ? `Límite de faltas estourado.` : `Risco de reprovação por faltas. Restam ${limitRemaining} faltas.` },
               type: 'faltas',
               percUsed: analise.percentualUsado,
               limitRemaining
             };
        }
      }
    });
    
    if (riskSubject) return riskSubject;

    if (Object.keys(materiasMap).length === 0) return null;
    const subjectStats: Record<string, { count: number, reviews: number, score: number }> = {};
    revisoesPendentes.forEach(r => {
      if (!subjectStats[r.materia_id]) subjectStats[r.materia_id] = { count: 0, reviews: 0, score: 0 };
      subjectStats[r.materia_id].reviews += 1;
    });
    sessoes.forEach(s => {
      if (!subjectStats[s.materia_id]) subjectStats[s.materia_id] = { count: 0, reviews: 0, score: 0 };
      subjectStats[s.materia_id].count += 1;
      if (s.total_questoes > 0) {
        const perf = s.acertos / s.total_questoes;
        subjectStats[s.materia_id].score = (subjectStats[s.materia_id].score * (subjectStats[s.materia_id].count - 1) + perf) / subjectStats[s.materia_id].count;
      }
    });

    const entries = Object.entries(subjectStats);
    if (entries.length === 0) return null;
    const critical = entries.sort((a, b) => (b[1].reviews - a[1].reviews) || (a[1].score - b[1].score))[0];
    const totalQ_crit = sessoes.filter(s => s.materia_id === critical[0]).reduce((acc, s) => acc + (s.total_questoes || 0), 0);
    const totalH_crit = sessoes.filter(s => s.materia_id === critical[0]).reduce((acc, s) => acc + (s.acertos || 0), 0);
    const perfCrit = getPerformanceClass(totalH_crit, totalQ_crit);

    return {
      id: critical[0],
      nome: materiasMap[critical[0]]?.nome || 'Matéria Desconhecida',
      reviews: critical[1].reviews,
      score: Math.round(critical[1].score * 100),
      performance: perfCrit,
      type: 'performance'
    };
  }, [sessoes, revisoesPendentes, materiasMap, materias, ocorrencias, gradeDocs]);

  return {
    loading,
    materiasMap,
    materias,
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
  };
}
