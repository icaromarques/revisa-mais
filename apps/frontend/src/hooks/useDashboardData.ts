import { useState, useEffect, useMemo } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, orderBy, Timestamp } from 'firebase/firestore';
import { TimeRange, dateFilters } from '@/lib/dashboard/dateFilters';
import { calculateWeeklyStreak, StreakData } from '@/lib/dashboard/streak';
import { buildAgendaItems, AgendaItem } from '@/lib/dashboard/agenda';
import { calendarService } from '@/services/calendarService';
import { availabilityService } from '@/services/availabilityService';
import { gradeOccurrenceService } from '@/services/gradeOccurrenceService';
import { startOfDay, isSameDay } from 'date-fns';
import { handleFirestoreError, OperationType } from '@/lib/firestoreErrorHandler';
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

    setLoading(true);

    // 1. Materias
    const unsubMaterias = onSnapshot(query(collection(db, 'materias'), where('user_id', '==', userId)), (snap) => {
      const map: Record<string, {nome: string, cor: string}> = {};
      const list = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
      list.forEach(m => { map[m.id!] = { nome: m.nome, cor: m.cor }; });
      setMateriasMap(map);
      setMaterias(list);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'materias');
    });

    // 2. Sessoes (Filtered by timeRange)
    const { startDate, endDate } = dateFilters.getRangeDates(timeRange, customStart, customEnd);
    
    // Calculate previous period for comparisons
    const duration = endDate.getTime() - startDate.getTime();
    const prevEndDate = new Date(startDate.getTime() - 1);
    const prevStartDate = new Date(prevEndDate.getTime() - duration);

    const unsubSessoes = onSnapshot(
      query(collection(db, 'sessoes'), where('user_id', '==', userId), where('created_at', '>=', Timestamp.fromDate(startDate)), where('created_at', '<=', Timestamp.fromDate(endDate))),
      (snap) => {
        setSessoes(snap.docs.map(d => integrityService.normalizeSession({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'sessoes')
    );

    const unsubPrevSessoes = onSnapshot(
      query(collection(db, 'sessoes'), where('user_id', '==', userId), where('created_at', '>=', Timestamp.fromDate(prevStartDate)), where('created_at', '<=', Timestamp.fromDate(prevEndDate))),
      (snap) => {
        setPreviousSessoes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'sessoes')
    );

    // 3. Revisoes Pendentes (Overall to find critical ones)
    const unsubRevisoes = onSnapshot(query(collection(db, 'revisoes'), where('user_id', '==', userId), where('status', '==', 'pendente')), (snap) => {
      setRevisoesPendentes(snap.docs.map(d => integrityService.normalizeReview({ id: d.id, ...d.data() })));
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'revisoes');
    });

    // 4. Academic Events
    const unsubEvents = calendarService.subscribeToUserEvents(userId, async (events) => {
       const filtered = events.filter(e => e.data_inicio && !isNaN(parseValidDate(e.data_inicio).getTime()));
       
       const { googleCalendarService } = await import('@/services/googleCalendar');
       let externalEvents: any[] = [];
       if (await googleCalendarService.isConnected()) {
           try {
             const endCal = new Date(endDate); endCal.setDate(endCal.getDate() + 7);
             const gcalItems = await googleCalendarService.fetchEvents(new Date(startDate), endCal);
             const internalGcalIds = new Set(events.filter(e => e.google_event_id).map(e => e.google_event_id));
             
             externalEvents = gcalItems
               .filter((item: any) => !internalGcalIds.has(item.id))
               .map((item: any) => ({
                 id: item.id,
                 titulo: item.summary || 'Sem Título',
                 tipo: 'evento_google',
                 data_inicio: item.start.dateTime || item.start.date,
                 data_fim: item.end.dateTime || item.end.date,
                 cor: '#4285F4',
                 concluido: false,
                 origem: 'google'
               }));
           } catch(e) { }
       }
       setAcademicEvents([...filtered, ...externalEvents]);
    });

    // 5. Grade & Bloqueios
    availabilityService.getGradeFaculdade(userId).then(setGradeDocs);
    availabilityService.getBloqueios(userId).then(setBlockDocs);

    // 6. Occurrences (Specific for Today generally, but we can query by range if needed)
    // For confirmation workflow, we usually want "pendente_confirmacao" or current date ones.
    const unsubOcorrencias = onSnapshot(
      query(collection(db, 'ocorrencias_grade'), where('user_id', '==', userId), orderBy('data', 'desc')),
      (snap) => {
        setOcorrencias(snap.docs.map(d => integrityService.normalizeAbsence({ id: d.id, ...d.data() }) as OcorrenciaGrade));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'ocorrencias_grade')
    );

    // Trigger daily occurrence generation
    gradeOccurrenceService.generateDailyOccurrences(userId);

    // Fetch Last 7 Days Sessoes specifically for streak
    const unsubStreakSessoes = onSnapshot(
      query(collection(db, 'sessoes'), where('user_id', '==', userId), where('created_at', '>=', Timestamp.fromDate(dateFilters.getRangeDates('7d').startDate))),
      (snap) => {
        setStreakSessoes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, 'sessoes-streak');
      }
    );

    return () => {
      unsubMaterias();
      unsubSessoes();
      unsubPrevSessoes();
      unsubRevisoes();
      unsubEvents();
      unsubStreakSessoes();
      unsubOcorrencias();
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
      // Create a list of dates to parse
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
     // use the start date of the selected range instead of explicitly today, so "Amanhã" works naturally for the user's focus
     const { startDate } = dateFilters.getRangeDates(timeRange, customStart, customEnd);
     return buildAgendaItems([startOfDay(startDate)], gradeDocs, blockDocs, academicEvents);
  }, [timeRange, customStart, customEnd, gradeDocs, blockDocs, academicEvents]);

  const criticalSubject = useMemo(() => {
    // Faltas Risk
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
