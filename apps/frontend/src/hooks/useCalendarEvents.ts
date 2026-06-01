import { useEffect, useMemo, useState } from 'react';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  isSameDay
} from 'date-fns';
import { calendarService } from '@/services/calendarService';
import { EventoAcademico } from '@/types/calendar';

function isDateWithinValidity(item: any, d: Date) {
  const startV = item.data_inicio_vigencia || item.periodo_inicio;
  const endV = item.data_fim_vigencia || item.periodo_fim;

  if (startV) {
    const startD = new Date(startV);
    const locStart = new Date(startD.getTime() + startD.getTimezoneOffset() * 60000);
    locStart.setHours(0, 0, 0, 0);
    if (d < locStart) return false;
  }
  if (endV) {
    const endD = new Date(endV);
    const locEnd = new Date(endD.getTime() + endD.getTimezoneOffset() * 60000);
    locEnd.setHours(23, 59, 59, 999);
    if (d > locEnd) return false;
  }
  return true;
}

export function useCalendarEvents(
  userId: string | undefined,
  currentDate: Date,
  reloadToken: number
) {
  const [apiEvents, setApiEvents] = useState<EventoAcademico[]>([]);
  const [gradeDocs, setGradeDocs] = useState<any[]>([]);
  const [blockDocs, setBlockDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const { availabilityService } = await import('@/services/availabilityService');
        const [data, grade, blocks] = await Promise.all([
          calendarService.fetchUserEvents(userId),
          availabilityService.getGradeFaculdade(userId),
          availabilityService.getBloqueios(userId)
        ]);
        if (cancelled) return;
        const validData = (data as EventoAcademico[]).filter(
          (e) => e.data_inicio && !isNaN(new Date(e.data_inicio).getTime())
        );
        setApiEvents(validData);
        setGradeDocs(grade.filter((g: any) => g.ativo));
        setBlockDocs(blocks.filter((b: any) => b.ativo));
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, reloadToken]);

  const synthesizedEvents = useMemo(() => {
    if (!userId) return [];

    const timeMin = startOfWeek(startOfMonth(currentDate));
    const timeMax = endOfWeek(endOfMonth(currentDate));
    const result: EventoAcademico[] = [];
    const dateIter = new Date(timeMin);

    while (dateIter <= timeMax) {
      const day = dateIter.getDay();
      const iterDayMidnight = new Date(dateIter);
      iterDayMidnight.setHours(0, 0, 0, 0);

      gradeDocs.forEach((g) => {
        if (!isDateWithinValidity(g, iterDayMidnight)) return;
        const hasDay =
          g.recorrente !== false &&
          (g.dias_semana ? g.dias_semana.includes(day) : g.dia_semana === day);
        let shouldShow = hasDay;

        if (!shouldShow && g.recorrente === false && g.data_especifica) {
          const bd = new Date(g.data_especifica);
          const bdLocal = new Date(bd.getTime() + bd.getTimezoneOffset() * 60000);
          bdLocal.setHours(0, 0, 0, 0);
          if (isSameDay(bdLocal, iterDayMidnight)) shouldShow = true;
        }

        if (shouldShow) {
          const startD = new Date(dateIter);
          const [sh, sm] = g.hora_inicio.split(':').map(Number);
          startD.setHours(sh, sm, 0, 0);
          const endD = new Date(dateIter);
          const [eh, em] = g.hora_fim ? g.hora_fim.split(':').map(Number) : [sh + 1, sm];
          endD.setHours(eh, em, 0, 0);

          result.push({
            id: `grade_${g.id}_${startD.getTime()}`,
            user_id: userId,
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
            sync_status: 'local',
            created_at: startD.toISOString(),
            updated_at: startD.toISOString()
          } as EventoAcademico);
        }
      });

      blockDocs.forEach((b) => {
        if (!isDateWithinValidity(b, iterDayMidnight)) return;
        const hasDay =
          b.recorrente && (b.dias_semana ? b.dias_semana.includes(day) : b.dia_semana === day);
        if (
          hasDay ||
          (!b.recorrente &&
            b.data_especifica &&
            isSameDay(new Date(b.data_especifica + 'T00:00:00'), iterDayMidnight))
        ) {
          const startD = new Date(dateIter);
          const [sh, sm] = b.hora_inicio.split(':').map(Number);
          startD.setHours(sh, sm, 0, 0);
          const endD = new Date(dateIter);
          const [eh, em] = b.hora_fim ? b.hora_fim.split(':').map(Number) : [sh + 1, sm];
          endD.setHours(eh, em, 0, 0);

          result.push({
            id: `block_${b.id}_${startD.getTime()}`,
            user_id: userId,
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
            sync_status: 'local',
            created_at: startD.toISOString(),
            updated_at: startD.toISOString()
          } as EventoAcademico);
        }
      });

      dateIter.setDate(dateIter.getDate() + 1);
    }

    return result;
  }, [userId, currentDate, gradeDocs, blockDocs]);

  const events = useMemo(
    () => [...apiEvents, ...synthesizedEvents],
    [apiEvents, synthesizedEvents]
  );

  return { events, loading, refresh: () => {} };
}
