import { GradeFaculdade, BloqueioAgenda } from '@/types/availability';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, getDoc, setDoc } from 'firebase/firestore';
import { isSameDay, addMinutes, isBefore, isAfter, startOfDay, endOfDay, getDay, addDays } from 'date-fns';
import { EventoAcademico } from '@/types/calendar';
import { parseValidDate } from '@/lib/utils';
import { userPreferencesService } from './userPreferencesService';

export interface TimeSlot {
  start: Date;
  end: Date;
}

export interface ConflictDetails {
  hasConflict: boolean;
  conflicts: Array<{
    title: string;
    type: string;
    start: Date;
    end: Date;
    id?: string;
  }>;
}

const isDateWithinValidity = (item: any, d: Date) => {
   const startV = item.data_inicio_vigencia || item.periodo_inicio;
   const endV = item.data_fim_vigencia || item.periodo_fim;
   
   if (startV) {
       const startD = new Date(startV);
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

export const unifiedAvailabilityService = {
  /**
   * Calculates unified availability for a given day, considering all constraints:
   * - Grade Faculdade
   * - Bloqueios
   * - Rest Window (Sleep)
   * - Eventos Acadêmicos (including Google Calendar synced events)
   */
  async getDisponibilidadeUnificada(
    userId: string, 
    date: Date, 
    durationMinutes: number = 30,
    prefOverrides?: any
  ): Promise<TimeSlot[]> {
     // Get user preferences
     const preferences = prefOverrides || await userPreferencesService.getPreferences(userId);
 
     // 1. Get Grade
     const qGrade = query(collection(db, 'grade_faculdade'), where('user_id', '==', userId), where('ativo', '==', true));
     const gradeSnap = await getDocs(qGrade);
     const grade = gradeSnap.docs.map(d => d.data() as GradeFaculdade);
 
     // 2. Get Bloqueios
     const qBloqueios = query(collection(db, 'bloqueios_agenda'), where('user_id', '==', userId), where('ativo', '==', true));
     const bloqueiosSnap = await getDocs(qBloqueios);
     const bloqueios = bloqueiosSnap.docs.map(d => d.data() as BloqueioAgenda);
 
     // 3. Get Planner/Calendar events for this day
     const qEventos = query(
       collection(db, 'eventos_academicos'),
       where('user_id', '==', userId)
     );
     const eventosSnap = await getDocs(qEventos);
     
     const { getVisibleCalendarEvents } = await import('@/lib/calendar-utils');
     const validEventos = getVisibleCalendarEvents(
        eventosSnap.docs.map(d => ({ id: d.id, ...d.data() }) as EventoAcademico)
     );
     
     const eventos = validEventos.filter(e => {
        if (!e.data_inicio) return false;
        const d = parseValidDate(e.data_inicio);
        return isSameDay(d, date);
     });

     const busySlots: TimeSlot[] = [];
     const weekDayNo = getDay(date);
     const dateMidnight = new Date(date);
     dateMidnight.setHours(0,0,0,0);

     grade.forEach(g => {
        if (!isDateWithinValidity(g, dateMidnight)) return;

        const hasDay = g.recorrente !== false && (g.dias_semana ? g.dias_semana.includes(weekDayNo) : g.dia_semana === weekDayNo);
        if (hasDay) {
           const slot = this.createSlotFromTime(date, g.hora_inicio, g.hora_fim);
           if (slot) busySlots.push(slot);
        } else if (g.recorrente === false && g.data_especifica) {
           const bd = parseValidDate(g.data_especifica);
           const bdLocal = new Date(bd.getTime() + bd.getTimezoneOffset() * 60000);
           if (isSameDay(bdLocal, date)) {
             const slot = this.createSlotFromTime(date, g.hora_inicio, g.hora_fim);
             if (slot) busySlots.push(slot);
           }
        }
     });

     bloqueios.forEach(b => {
       if (!isDateWithinValidity(b, dateMidnight)) return;

       const hasDay = b.recorrente && (b.dias_semana ? b.dias_semana.includes(weekDayNo) : b.dia_semana === weekDayNo);
       if (hasDay) {
         const slot = this.createSlotFromTime(date, b.hora_inicio, b.hora_fim);
         if (slot) busySlots.push(slot);
       } else if (!b.recorrente && b.data_especifica) {
         const bd = new Date(b.data_especifica + 'T00:00:00');
         if (isSameDay(bd, date)) {
           const slot = this.createSlotFromTime(date, b.hora_inicio, b.hora_fim);
           if (slot) busySlots.push(slot);
         }
       }
     });

     eventos.forEach(e => {
       // Do not block availability for full-day deadlines types
       if (e.dia_inteiro && ['prova', 'trabalho', 'apresentacao', 'lembrete', 'tarefa'].includes(e.tipo)) {
           return;
       }
       if (e.data_inicio && e.data_fim) {
          busySlots.push({
            start: parseValidDate(e.data_inicio),
            end: parseValidDate(e.data_fim)
          });
       }
     });

     const blockedHours = preferences.scheduling?.blocked_hours || [];
     blockedHours.forEach((blocked: any) => {
        const rStart = blocked.start;
        const rEnd = blocked.end;
        if (!rStart || !rEnd) return;
        
        const [sh, sm] = rStart.split(':').map(Number);
        const [eh, em] = rEnd.split(':').map(Number);
        
        const startInMins = sh * 60 + sm;
        const endInMins = eh * 60 + em;
        
        if (startInMins < endInMins) {
            const slot = this.createSlotFromTime(date, rStart, rEnd);
            if (slot) busySlots.push(slot);
        } else {
            const slot1 = this.createSlotFromTime(date, "00:00", rEnd);
            if (slot1) busySlots.push(slot1);
            
            const slot2 = this.createSlotFromTime(date, rStart, "23:59");
            if (slot2) {
                slot2.end.setSeconds(59);
                busySlots.push(slot2);
            }
        }
     });

     busySlots.sort((a, b) => a.start.getTime() - b.start.getTime());
     const mergedBusySlots: TimeSlot[] = [];
     for (const slot of busySlots) {
       if (mergedBusySlots.length === 0) {
         mergedBusySlots.push(slot);
       } else {
         const last = mergedBusySlots[mergedBusySlots.length - 1];
         if (slot.start <= last.end) {
           last.end = new Date(Math.max(last.end.getTime(), slot.end.getTime()));
         } else {
           mergedBusySlots.push(slot);
         }
       }
     }

     const workingStart = startOfDay(date);
     const workingEnd = endOfDay(date);

     const now = new Date();
     let currentFreeTime = isSameDay(date, now) && now > workingStart ? now : workingStart;

     const freeSlots: TimeSlot[] = [];

     for (const busy of mergedBusySlots) {
        if (isBefore(currentFreeTime, busy.start)) {
           const gapMinutes = (busy.start.getTime() - currentFreeTime.getTime()) / 60000;
           if (gapMinutes >= durationMinutes) {
              freeSlots.push({ start: currentFreeTime, end: busy.start });
           }
        }
        if (isAfter(busy.end, currentFreeTime)) {
           currentFreeTime = busy.end;
        }
     }

     if (isBefore(currentFreeTime, workingEnd)) {
         const gapMinutes = (workingEnd.getTime() - currentFreeTime.getTime()) / 60000;
         if (gapMinutes >= durationMinutes) {
             freeSlots.push({ start: currentFreeTime, end: workingEnd });
         }
     }

     return freeSlots;
  },

  async sugerirHorarioDisponivel(
    userId: string,
    startDate: Date,
    durationMinutes: number = 30,
    maxDaysToLook: number = 14
  ): Promise<TimeSlot | null> {
    const preferences = await userPreferencesService.getPreferences(userId);
    let currentDate = new Date(startDate);
    
    for (let i = 0; i < maxDaysToLook; i++) {
        // Option to skip weekends based on preference
        const dayOfWeek = getDay(currentDate);
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const allowWeekend = preferences?.scheduling?.allow_weekend_scheduling ?? true;

        if (!isWeekend || allowWeekend) {
            const slots = await this.getDisponibilidadeUnificada(userId, currentDate, durationMinutes, preferences);
            if (slots.length > 0) {
                return {
                    // return a proper TimeSpan object, but shorten to exact duration
                    start: slots[0].start,
                    end: new Date(slots[0].start.getTime() + durationMinutes * 60000)
                };
            }
        }
        currentDate = addDays(currentDate, 1);
        currentDate = startOfDay(currentDate);
    }
    return null;
  },

  getSyncStatusDisplay(lastSyncTimeStr?: string | null): string {
     if (!lastSyncTimeStr) return 'Agenda externa desatualizada (Usando dados locais)';
     try {
       const lastSync = parseValidDate(lastSyncTimeStr);
       const minsAgo = Math.floor((new Date().getTime() - lastSync.getTime()) / 60000);
       if (isNaN(minsAgo)) return 'Usando dados locais (Sincronização pendente)';
       if (minsAgo < 1) return 'Sincronizado com Google Calendar agora';
       if (minsAgo < 60) return `Sincronizado com Google Calendar há ${minsAgo} min`;
       const hoursAgo = Math.floor(minsAgo / 60);
       if (hoursAgo < 24) return `Sincronizado com Google Calendar há ${hoursAgo}h`;
     } catch (e) {
       return 'Usando dados locais (Sincronização pendente)';
     }
     return 'Usando dados locais no momento (Sincronização pendente)';
  },

  createSlotFromTime(baseDate: Date, startTimeStr: string, endTimeStr: string): TimeSlot | null {
    if (!startTimeStr || !endTimeStr) return null;
    const [sh, sm] = startTimeStr.split(':').map(Number);
    const [eh, em] = endTimeStr.split(':').map(Number);
    const start = new Date(baseDate);
    start.setHours(sh, sm, 0, 0);
    const end = new Date(baseDate);
    end.setHours(eh, em, 0, 0);
    return { start, end };
  },

  /**
   * Detects simple time overlaps for a specific start and end time against all events on that day.
   */
  async checkScheduleConflict(
    userId: string,
    proposedStart: Date,
    proposedEnd: Date,
    ignoredEventId?: string
  ): Promise<ConflictDetails> {
    const date = startOfDay(proposedStart);
    const weekDayNo = getDay(date);
    const dateMidnight = new Date(date);
    dateMidnight.setHours(0,0,0,0);

    // Fetch existing data for the day
    const qGrade = query(collection(db, 'grade_faculdade'), where('user_id', '==', userId), where('ativo', '==', true));
    const gradeSnap = await getDocs(qGrade);
    const grade = gradeSnap.docs.map(d => ({ id: d.id, ...d.data() } as GradeFaculdade));

    const qBloqueios = query(collection(db, 'bloqueios_agenda'), where('user_id', '==', userId), where('ativo', '==', true));
    const bloqueiosSnap = await getDocs(qBloqueios);
    const bloqueios = bloqueiosSnap.docs.map(d => ({ id: d.id, ...d.data() } as BloqueioAgenda));

    const qEventos = query(collection(db, 'eventos_academicos'), where('user_id', '==', userId));
    const eventosSnap = await getDocs(qEventos);
    const eventos = eventosSnap.docs.map(d => ({ id: d.id, ...d.data() } as EventoAcademico)).filter(e => {
        if (!e.data_inicio) return false;
        return isSameDay(parseValidDate(e.data_inicio), date);
    });

    const conflicts: ConflictDetails['conflicts'] = [];

    const checkOverlap = (existingStart: Date, existingEnd: Date) => {
        return proposedStart < existingEnd && proposedEnd > existingStart;
    };

    grade.forEach(g => {
        if (!isDateWithinValidity(g, dateMidnight)) return;

        const hasDay = g.recorrente !== false && (g.dias_semana ? g.dias_semana.includes(weekDayNo) : g.dia_semana === weekDayNo);
        let applies = hasDay;
        if (!hasDay && g.recorrente === false && g.data_especifica) {
            const bd = parseValidDate(g.data_especifica);
            const bdLocal = new Date(bd.getTime() + bd.getTimezoneOffset() * 60000);
            if (isSameDay(bdLocal, date)) applies = true;
        }

        if (applies && g.id !== ignoredEventId) {
             const slot = this.createSlotFromTime(date, g.hora_inicio, g.hora_fim);
             if (slot && checkOverlap(slot.start, slot.end)) {
                 conflicts.push({ title: g.titulo || 'Aula', type: 'grade', start: slot.start, end: slot.end, id: g.id });
             }
        }
    });

    bloqueios.forEach(b => {
        if (!isDateWithinValidity(b, dateMidnight)) return;

        const hasDay = b.recorrente && (b.dias_semana ? b.dias_semana.includes(weekDayNo) : b.dia_semana === weekDayNo);
        let applies = hasDay;
        if (!hasDay && !b.recorrente && b.data_especifica) {
            const bd = new Date(b.data_especifica + 'T00:00:00');
            if (isSameDay(bd, date)) applies = true;
        }

        if (applies && b.id !== ignoredEventId) {
            const slot = this.createSlotFromTime(date, b.hora_inicio, b.hora_fim);
            if (slot && checkOverlap(slot.start, slot.end)) {
                 conflicts.push({ title: b.titulo || 'Bloqueio', type: 'bloqueio', start: slot.start, end: slot.end, id: b.id });
            }
        }
    });

    eventos.forEach(e => {
        if (e.data_inicio && e.data_fim && e.id !== ignoredEventId) {
            const eStart = parseValidDate(e.data_inicio);
            const eEnd = parseValidDate(e.data_fim);
            if (checkOverlap(eStart, eEnd)) {
                let niceType = 'Evento';
                if (e.tipo === 'revisao') niceType = 'Revisão';
                if (e.tipo === 'sessao_estudo') niceType = 'Sessão de Estudo';
                if (e.tipo === 'prova' || e.tipo === 'trabalho' || e.tipo === 'apresentacao') niceType = 'Avaliação';
                conflicts.push({ title: e.titulo || niceType, type: e.tipo || 'evento', start: eStart, end: eEnd, id: e.id });
            }
        }
    });

    return {
        hasConflict: conflicts.length > 0,
        conflicts: conflicts.sort((a, b) => a.start.getTime() - b.start.getTime())
    };
  }
};
