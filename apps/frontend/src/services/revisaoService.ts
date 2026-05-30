import { db } from '@/lib/firebase';
import { collection, doc, addDoc, updateDoc, deleteDoc, getDocs, getDoc, query, where, serverTimestamp } from 'firebase/firestore';
import { calendarService, EVENTOS_COLLECTION } from './calendarService';
import { smartScheduleService } from './smartScheduleService';
import { parseValidDate } from '@/lib/utils';
import { userPreferencesService } from './userPreferencesService';

export const revisaoService = {
  async createRevisao(data: any) {
    const docRef = await addDoc(collection(db, 'revisoes'), {
      ...data,
      created_at: serverTimestamp()
    });
    
    // Automatically manage event if data_prevista exists
    if (data.data_prevista) {
        await this.syncEvent(docRef.id, data);
    }
    return docRef.id;
  },

  async updateRevisao(id: string, data: any) {
    const docRef = doc(db, 'revisoes', id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return;
    const existing = snap.data();

    await updateDoc(docRef, { ...data, updated_at: serverTimestamp() });
    
    // Merge data so partial updates don't delete the event
    const mergedData = { ...existing, ...data, user_id: existing.user_id || data.user_id };
    
    // If explicitly set to null/empty string, we remove the date
    if (data.data_prevista === null || data.data_prevista === '') {
       mergedData.data_prevista = null;
    }

    await this.syncEvent(id, mergedData, true);
  },

  async deleteRevisao(id: string, userId: string) {
    // Delete associated events
    const q = query(
      collection(db, EVENTOS_COLLECTION), 
      where('user_id', '==', userId),
      where('revisao_id', '==', id)
    );
    const snaps = await getDocs(q);
    for (const snap of snaps.docs) {
       await calendarService.deleteEvent(snap.id);
    }
    
    await deleteDoc(doc(db, 'revisoes', id));
  },
  
  async syncEvent(revisaoId: string, data: any, isUpdate = false) {
    // Find existing event
    const q = query(
      collection(db, EVENTOS_COLLECTION), 
      where('user_id', '==', data.user_id),
      where('revisao_id', '==', revisaoId)
    );
    const snaps = await getDocs(q);
    const existing = snaps.docs[0];

    // If no date, remove event if it exists
    if (!data.data_prevista) {
        if (existing) {
             await calendarService.deleteEvent(existing.id);
        }
        return;
    }
    
    // Configure event
    const baseDate = parseValidDate(data.data_prevista);
    let startDate = baseDate;
    let endDate = new Date(baseDate.getTime() + 60*60*1000);

    // If it's a new event or we didn't have an exact time, let's try to find a smart slot
    if (!existing) {
       try {
         const prefs = await userPreferencesService.getPreferences(data.user_id);
         const targetDuration = prefs?.durations?.default_review_minutes || 60;
         
         const slot = await smartScheduleService.findNextBestSlot(data.user_id, baseDate, targetDuration);
         if (slot) {
           startDate = slot.start;
           endDate = slot.end;
         } else {
           startDate.setHours(9, 0, 0, 0);
           endDate = new Date(startDate.getTime() + targetDuration * 60000);
         }
       } catch (e) {
         console.error("Erro ao buscar horários", e);
         startDate.setHours(9, 0, 0, 0);
         endDate = new Date(startDate.getTime() + 60*60000);
       }
    } else {
       // Keep existing time if we already have it
       const existingData = existing.data() as any;
       let evtDate: Date;
       if (existingData.data_inicio && existingData.data_inicio.toDate) {
            evtDate = existingData.data_inicio.toDate();
       } else if (existingData.data_inicio) {
            evtDate = new Date(existingData.data_inicio);
       } else {
            evtDate = new Date();
       }
       
       startDate.setHours(evtDate.getHours(), evtDate.getMinutes(), 0, 0);

       if (existingData.data_fim && existingData.data_fim.toDate) {
            endDate = existingData.data_fim.toDate();
       } else if (existingData.data_fim) {
            endDate = new Date(existingData.data_fim);
       } else {
            endDate = new Date();
       }

       const daysDiff = Math.floor((startDate.getTime() - evtDate.getTime()) / (24 * 60 * 60 * 1000));
       if (daysDiff !== 0) { // Date changed
          endDate = new Date(endDate.getTime() + daysDiff * 24 * 60 * 60 * 1000);
       }
    }

    const { googleCalendarService } = await import('@/services/googleCalendar');
    // Fetch user setting
    let prefs = null;
    try {
       prefs = await userPreferencesService.getPreferences(data.user_id);
    }catch(e){}

    const shouldSync = prefs?.googleCalendar?.syncReviewsByDefault !== false && await googleCalendarService.isConnected();

    const eventoData: any = {
      user_id: data.user_id,
      titulo: `Revisão: ${data.nome || 'Pendência'}`,
      descricao: `Revisão automática gerada.`,
      tipo: 'revisao',
      origem: 'sistema',
      materia_id: data.materia_id || null,
      topico_id: data.topico_id || null,
      revisao_id: revisaoId,
      data_inicio: startDate.toISOString(),
      data_fim: endDate.toISOString(),
      dia_inteiro: false,
      concluido: data.status === 'concluida',
    };

    if (existing) {
      await calendarService.updateEvent(existing.id, eventoData);
      if (existing.data()?.sync_enabled) {
         await calendarService.syncLocalEventToGoogle(existing.id, data.user_id);
      }
    } else {
      eventoData.sync_enabled = shouldSync;
      const docId = await calendarService.createEvent(eventoData);
      if (shouldSync) {
         await calendarService.syncLocalEventToGoogle(docId, data.user_id);
      }
    }
  }
};
