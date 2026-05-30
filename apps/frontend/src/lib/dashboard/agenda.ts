import { getDay, isSameDay, format, parseISO } from 'date-fns';
import { parseValidDate } from '../utils';

export interface AgendaItem {
  id: string;
  type: 'aula' | 'evento' | 'bloqueio' | 'sessao' | 'revisao';
  title: string;
  timeStart: string;
  timeEnd?: string;
  color: string;
  status?: string;
  materia?: string;
  dateObj: Date;
  rawData: any;
}

export function buildAgendaItems(
  dates: Date[],
  gradeInfos: any[],
  bloqueiosInfos: any[],
  eventosInfos: any[]
): AgendaItem[] {
  const items: AgendaItem[] = [];

  dates.forEach(dateIter => {
      const dayOfWeek = getDay(dateIter);
      
      // Grade
      gradeInfos.filter(g => {
        if (!g.ativo) return false;
        
        let hasDay = false;
        if (g.dias_semana && Array.isArray(g.dias_semana)) {
           hasDay = g.dias_semana.includes(dayOfWeek);
        } else {
           hasDay = g.dia_semana === dayOfWeek;
        }

        if (g.recorrente !== false && hasDay) {
          return true;
        }

        if (g.recorrente === false && g.data_especifica) {
          const bd = parseValidDate(g.data_especifica);
          const bdLocal = new Date(bd.getTime() + bd.getTimezoneOffset() * 60000);
          if (isSameDay(bdLocal, dateIter)) {
            return true;
          }
        }

        return false;
      }).forEach(g => {
         const startD = new Date(dateIter);
         const [sh, sm] = g.hora_inicio.split(':').map(Number);
         startD.setHours(sh, sm, 0, 0);
         const endD = new Date(dateIter);
         if (g.hora_fim) {
            const [eh, em] = g.hora_fim.split(':').map(Number);
            endD.setHours(eh, em, 0, 0);
         }
         
         items.push({
            id: 'grade_'+g.id+'_'+startD.getTime(),
            type: 'aula',
            title: g.titulo,
            timeStart: format(startD, 'HH:mm'),
            timeEnd: g.hora_fim ? format(endD, 'HH:mm') : undefined,
            color: g.cor || '#4F46E5',
            dateObj: startD,
            materia: g.materia_id,
            rawData: g
         });
      });

      // Bloqueios
      bloqueiosInfos.filter(b => b.ativo).forEach(b => {
         const hasDay = b.dias_semana && Array.isArray(b.dias_semana) 
           ? b.dias_semana.includes(dayOfWeek) 
           : b.dia_semana === dayOfWeek;

         if ((b.recorrente && hasDay) || 
             (!b.recorrente && b.data_especifica && isSameDay(parseValidDate(b.data_especifica), dateIter))) {
            const startD = new Date(dateIter);
            const [sh, sm] = b.hora_inicio.split(':').map(Number);
            startD.setHours(sh, sm, 0, 0);
            
            const endD = new Date(dateIter);
            if (b.hora_fim) {
               const [eh, em] = b.hora_fim.split(':').map(Number);
               endD.setHours(eh, em, 0, 0);
            }

            items.push({
               id: 'block_'+b.id+'_'+startD.getTime(),
               type: 'bloqueio',
               title: b.titulo,
               timeStart: format(startD, 'HH:mm'),
               timeEnd: b.hora_fim ? format(endD, 'HH:mm') : undefined,
               color: b.cor || '#6B7280',
               dateObj: startD,
               rawData: b
            });
         }
      });
  });

  // Eventos / Sessoes planeadas / Revisoes
  eventosInfos.forEach(e => {
     if (!e.data_inicio) return;
     const evtD = parseValidDate(e.data_inicio);
     // Somente mantem se o evento estiver na lista de datas pedidas
     if (dates.some(d => isSameDay(d, evtD))) {
        items.push({
            id: 'evt_'+e.id,
            type: e.tipo === 'sessao_estudo' ? 'sessao' : (e.tipo === 'revisao' ? 'revisao' : 'evento'),
            title: e.titulo,
            timeStart: format(evtD, 'HH:mm'),
            timeEnd: e.data_fim ? format(parseValidDate(e.data_fim), 'HH:mm') : undefined,
            color: e.cor || '#10B981',
            status: e.concluido ? 'completed' : 'pending',
            dateObj: evtD,
            materia: e.materia_id,
            rawData: e
        });
     }
  });

  // Sort by time
  return items.sort((a,b) => a.dateObj.getTime() - b.dateObj.getTime());
}
