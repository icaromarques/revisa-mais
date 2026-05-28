import { parseValidDate } from '@/lib/utils';
import { GradeFaculdade } from '@/types/availability';
import { differenceInCalendarDays, addDays, getDay, isBefore, isWithinInterval } from 'date-fns';

export function calculateTotalExpectedOccurrences(grade: GradeFaculdade[], inicio: string, fim: string): number {
  if (!inicio || !fim || grade.length === 0) return 0;
  
  const start = parseValidDate(inicio);
  const end = parseValidDate(fim);
  
  if (isBefore(end, start)) return 0;
  
  let total = 0;
  const daysDiff = differenceInCalendarDays(end, start);
  
  for (let i = 0; i <= daysDiff; i++) {
    const d = addDays(start, i);
    const dayOfWeek = getDay(d);
    const dateStr = d.toISOString().split('T')[0];
    
    for (const g of grade) {
      if (!g.ativo) continue;
      
      const pInicio = g.periodo_inicio || (g as any).data_inicio_vigencia;
      const pFim = g.periodo_fim || (g as any).data_fim_vigencia;
      const gStart = pInicio ? parseValidDate(pInicio) : start;
      const gEnd = pFim ? parseValidDate(pFim) : end;
      
      if (!isWithinInterval(d, { start: gStart, end: gEnd })) continue;
      
      if (g.recorrente) {
        if (g.dias_semana?.includes(dayOfWeek) || g.dia_semana === dayOfWeek) {
          total++;
        }
      } else {
        if (g.data_especifica === dateStr) {
          total++;
        }
      }
    }
  }
  
  return total;
}
