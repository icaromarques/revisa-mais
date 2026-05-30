import { parseValidDate } from '@/lib/utils';
import { subDays, startOfDay, endOfDay, format, startOfMonth, endOfMonth, isToday, isTomorrow, isPast, addDays, startOfWeek, endOfWeek, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export type TimeRange = 'hoje' | 'amanha' | '7d' | 'mes' | 'ontem' | '3d' | 'semana' | '30d' | 'personalizado';

export const dateFilters = {
  getRangeDates(range: TimeRange, customStart?: Date, customEnd?: Date): { startDate: Date; endDate: Date } {
    const today = new Date();
    switch (range) {
      case 'amanha':
        return {
          startDate: startOfDay(addDays(today, 1)),
          endDate: endOfDay(addDays(today, 1))
        };
      case 'ontem':
        return {
          startDate: startOfDay(subDays(today, 1)),
          endDate: endOfDay(subDays(today, 1))
        };
      case '3d':
        return {
          startDate: startOfDay(subDays(today, 3)),
          endDate: endOfDay(today)
        };
      case '7d':
        return {
          startDate: startOfDay(subDays(today, 7)),
          endDate: endOfDay(today)
        };
      case '30d':
        return {
          startDate: startOfDay(subDays(today, 30)),
          endDate: endOfDay(today)
        };
      case 'semana':
        return {
          startDate: startOfWeek(today, { weekStartsOn: 0 }),
          endDate: endOfWeek(today, { weekStartsOn: 0 })
        };
      case 'mes':
        return {
          startDate: startOfDay(startOfMonth(today)),
          endDate: endOfDay(endOfMonth(today))
        };
      case 'personalizado':
        if (customStart && customEnd) {
          return { startDate: startOfDay(customStart), endDate: endOfDay(customEnd) };
        }
        return { startDate: startOfDay(today), endDate: endOfDay(today) };
      case 'hoje':
      default:
        return {
          startDate: startOfDay(today),
          endDate: endOfDay(today)
        };
    }
  },

  getRangeLabel(range: TimeRange, customStart?: Date, customEnd?: Date): string {
    const today = new Date();
    if (range === 'hoje') return `Hoje — ${format(today, 'dd/MM/yyyy', { locale: ptBR })}`;
    if (range === 'amanha') return `Amanhã — ${format(addDays(today, 1), 'dd/MM/yyyy', { locale: ptBR })}`;
    if (range === 'ontem') return `Ontem — ${format(subDays(today, 1), 'dd/MM/yyyy', { locale: ptBR })}`;
    if (range === '3d') return `Últimos 3 dias — ${format(subDays(today, 3), 'dd/MM')} a ${format(today, 'dd/MM')}`;
    if (range === '7d') return `Últimos 7 dias — ${format(subDays(today, 7), 'dd/MM')} a ${format(today, 'dd/MM')}`;
    if (range === '30d') return `Últimos 30 dias — ${format(subDays(today, 30), 'dd/MM')} a ${format(today, 'dd/MM')}`;
    if (range === 'semana') return `Esta semana — ${format(startOfWeek(today, { weekStartsOn: 0 }), 'dd/MM')} a ${format(endOfWeek(today, { weekStartsOn: 0 }), 'dd/MM')}`;
    if (range === 'mes') return format(today, 'MMMM yyyy', { locale: ptBR }).replace(/^\w/, (c) => c.toUpperCase());
    if (range === 'personalizado' && customStart && customEnd) {
      if (isSameDay(customStart, customEnd)) return format(customStart, 'dd/MM/yyyy', { locale: ptBR });
      return `${format(customStart, 'dd/MM/yyyy')} a ${format(customEnd, 'dd/MM/yyyy')}`;
    }
    return `Período`;
  },

  formatRelativeDate(dateString: string | Date | null | undefined): string {
    if (!dateString) return '-';
    try {
      const date = typeof dateString === 'string' ? parseValidDate(dateString) : dateString;
      if (isNaN(date.getTime())) return '-';
      if (isToday(date)) return 'Hoje';
      if (isTomorrow(date)) return 'Amanhã';
      return format(date, "dd/MM", { locale: ptBR });
    } catch {
      return '-';
    }
  }
};
