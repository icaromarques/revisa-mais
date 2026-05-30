import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { EventoAcademico } from '@/types/calendar';
import { calendarService } from './calendarService';
import { userPreferencesService } from './userPreferencesService';

export const plannerService = {
  async generateHeuristicSchedule(userId: string) {
    // 1. Fetch pending reviews
    const revQ = query(collection(db, 'revisoes'), where('user_id', '==', userId), where('status', '==', 'pendente'));
    const revSnap = await getDocs(revQ);
    const reviews = revSnap.docs.map(d => ({id: d.id, ...d.data()}));
    
    // Sort reviews: prioritize overdue, then by data_prevista
    const now = new Date();
    const sortedReviews = reviews.sort((a: any, b: any) => {
        const da = a.data_prevista ? new Date(a.data_prevista).getTime() : Infinity;
        const dbTime = b.data_prevista ? new Date(b.data_prevista).getTime() : Infinity;
        return da - dbTime;
    });

    let eventsCreated = 0;
    
    let syncPlanner = false;
    try {
        const prefs = await userPreferencesService.getPreferences(userId);
        syncPlanner = prefs?.googleCalendar?.syncPlannerEventsByDefault === true;
    } catch(e) {}
    
    // Check existing events to prevent duplicates
    const evtQ = query(collection(db, 'eventos_academicos'), where('user_id', '==', userId), where('origem', '==', 'planner_ai'));
    const evtSnap = await getDocs(evtQ);
    const existingPlannerEvents = evtSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));

    // We will schedule max 5 reviews in the next days
    for (const [index, rev] of sortedReviews.slice(0, 5).entries()) {
        const alreadyScheduled = existingPlannerEvents.find(e => e.revisao_id === rev.id && e.concluido === false);
        if (alreadyScheduled) {
           continue; // Skip if already scheduled by planner
        }

        const scheduleDate = new Date();
        scheduleDate.setDate(scheduleDate.getDate() + 1 + index);
        scheduleDate.setHours(10, 0, 0, 0); // At 10 AM
        
        const docId = await calendarService.createEvent({
            user_id: userId,
            titulo: `Revisão Pendente: ${(rev as any).nome || 'Sem nome'}`,
            descricao: `Agendado automaticamente pelo Planner.`,
            tipo: 'revisao',
            materia_id: (rev as any).materia_id || null,
            topico_id: (rev as any).topico_id || null,
            revisao_id: rev.id,
            origem: 'planner_ai',
            local: '',
            cor: '#8B5CF6',
            data_inicio: scheduleDate.toISOString(),
            data_fim: new Date(scheduleDate.getTime() + 60*60*1000).toISOString(),
            dia_inteiro: false,
            concluido: false,
            sync_enabled: syncPlanner
        } as Omit<EventoAcademico, 'id' | 'created_at' | 'updated_at'>);
        
        if (syncPlanner) {
           await calendarService.syncLocalEventToGoogle(docId, userId);
        }
        
        eventsCreated++;
    }
    
    return eventsCreated;
  }
};
