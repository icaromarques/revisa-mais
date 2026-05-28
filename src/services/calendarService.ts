import { db } from '@/lib/firebase';
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  setDoc,
  updateDoc, 
  deleteDoc,
  query,
  where,
  serverTimestamp,
  Timestamp,
  onSnapshot
} from 'firebase/firestore';
import { EventoAcademico } from '@/types/calendar';
import { handleFirestoreError, OperationType } from '@/lib/firestoreErrorHandler';
import { parseValidDate } from '@/lib/utils';
import { googleCalendarService } from './googleCalendar';

export const EVENTOS_COLLECTION = 'eventos_academicos';

export const calendarService = {
  subscribeToUserEvents(userId: string, callback: (events: EventoAcademico[]) => void) {
    const q = query(
      collection(db, EVENTOS_COLLECTION),
      where('user_id', '==', userId)
    );
    
    return onSnapshot(q, (snapshot) => {
      const events: EventoAcademico[] = [];
      snapshot.forEach((snapDoc) => {
        const data = snapDoc.data();
        events.push({
          ...data,
          id: snapDoc.id,
          data_inicio: data.data_inicio?.toDate?.()?.toISOString() || data.data_inicio,
          data_fim: data.data_fim?.toDate?.()?.toISOString() || data.data_fim,
          created_at: data.created_at?.toDate?.()?.toISOString() || data.created_at,
          updated_at: data.updated_at?.toDate?.()?.toISOString() || data.updated_at,
        } as EventoAcademico);
      });
      callback(events);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, EVENTOS_COLLECTION);
    });
  },

  async createEvent(event: Omit<EventoAcademico, 'id' | 'created_at' | 'updated_at'>): Promise<string> {
    try {
      let dataInicio = parseValidDate(event.data_inicio);
      let dataFim = parseValidDate(event.data_fim);

      // Validate dates
      if (dataFim <= dataInicio && !event.dia_inteiro) {
        dataFim = new Date(dataInicio.getTime() + 60 * 60 * 1000); // add 1 hour
      }

      const eventData: any = {
        ...event,
        data_inicio: Timestamp.fromDate(dataInicio),
        data_fim: Timestamp.fromDate(dataFim),
        sync_status: event.sync_enabled ? 'pendente' : 'local',
        created_at: serverTimestamp(),
        updated_at: serverTimestamp()
      };

      const docRef = doc(collection(db, EVENTOS_COLLECTION));
      const docId = docRef.id;

      // Create in Firestore first
      await setDoc(docRef, eventData);

      // We do not do direct google sync here. 
      // The component calling this should optionally call syncLocalEventToGoogle.

      return docId;
    } catch (error) {
       handleFirestoreError(error, OperationType.CREATE, EVENTOS_COLLECTION);
       throw error;
    }
  },

  async updateEvent(id: string, event: Partial<EventoAcademico>) {
    try {
      const docRef = doc(db, EVENTOS_COLLECTION, id);
      const snap = await getDoc(docRef);
      if (!snap.exists()) throw new Error('Evento não encontrado');
      
      const existing = snap.data();
      const updateData: any = { ...event, updated_at: serverTimestamp() };
      
      let dataInicio = existing.data_inicio?.toDate?.() || new Date(existing.data_inicio);
      let dataFim = existing.data_fim?.toDate?.() || new Date(existing.data_fim);

      if (event.data_inicio) {
        dataInicio = parseValidDate(event.data_inicio);
        updateData.data_inicio = Timestamp.fromDate(dataInicio);
      }
      if (event.data_fim) {
        dataFim = parseValidDate(event.data_fim);
        updateData.data_fim = Timestamp.fromDate(dataFim);
      }

      if (dataFim <= dataInicio && !event.dia_inteiro && !existing.dia_inteiro) {
        dataFim = new Date(dataInicio.getTime() + 60 * 60 * 1000);
        updateData.data_fim = Timestamp.fromDate(dataFim);
      }

      // Sync status resolution
      const isSyncEnabled = event.sync_enabled !== undefined ? event.sync_enabled : existing.sync_enabled;
      
      if (!isSyncEnabled && existing.google_event_id) {
         // User turned off sync - we should NOT delete from google automatically
         // We do NOT set google_event_id to null, we keep it just in case, but mark it deactivated
         updateData.sync_status = 'desativado';
         updateData.sync_error = null;
      } else if (isSyncEnabled) {
          updateData.sync_status = 'pendente';
      }

      // Update Firestore locally
      await updateDoc(docRef, updateData);

      // Actual sync requires manual call to syncLocalEventToGoogle by the caller,
      // but for background processes, just left here. Components should handle explicit syncs.
    } catch (error) {
       handleFirestoreError(error, OperationType.UPDATE, EVENTOS_COLLECTION);
       throw error;
    }
  },

  async syncLocalEventToGoogle(eventId: string, userId: string) {
      const docRef = doc(db, EVENTOS_COLLECTION, eventId);
      const snap = await getDoc(docRef);
      if (!snap.exists()) return;
      
      const localEvent = snap.data();
      if (localEvent.user_id !== userId) return;
      if (!localEvent.sync_enabled) return;
      if (localEvent.origem === 'google_external' || localEvent.imported_from_google) return;

      const isConn = await googleCalendarService.isConnected();
      if (!isConn) {
          await this.markSyncError(eventId, 'Google Calendar desconectado. Reconecte nas configurações.', 'precisa_reconectar');
          return;
      }

      try {
          let materia_nome = localEvent.materia_nome;
          let topico_nome = localEvent.topico_nome;
          
          if (localEvent.materia_id && !materia_nome) {
             const mSnap = await getDoc(doc(db, 'materias', localEvent.materia_id));
             if (mSnap.exists()) materia_nome = mSnap.data().nome;
          }
          if (localEvent.topico_id && !topico_nome) {
             const tSnap = await getDoc(doc(db, 'topicos', localEvent.topico_id));
             if (tSnap.exists()) topico_nome = tSnap.data().nome;
          }

          const syncResult = await googleCalendarService.upsertEvent({
              ...localEvent,
              materia_nome,
              topico_nome,
              data_inicio: localEvent.data_inicio?.toDate?.()?.toISOString() || localEvent.data_inicio,
              data_fim: localEvent.data_fim?.toDate?.()?.toISOString() || localEvent.data_fim,
          });

          await updateDoc(docRef, {
             google_event_id: syncResult.google_event_id,
             google_calendar_id: 'primary',
             htmlLink: syncResult.htmlLink || null,
             sync_status: syncResult.sync_status,
             last_google_sync_at: serverTimestamp(),
             sync_error: null,
             materia_nome: materia_nome || null,
             topico_nome: topico_nome || null,
             updated_at: serverTimestamp()
          });

      } catch (error: any) {
          console.error("syncLocalEventToGoogle error:", error);
          const status = error.message?.includes('expirou') ? 'precisa_reconectar' : 'erro';
          await this.markSyncError(eventId, error.message || 'Erro desconhecido', status);
      }
  },

  async markSyncError(eventId: string, errorMsg: string, status: string = 'erro') {
     try {
         await updateDoc(doc(db, EVENTOS_COLLECTION, eventId), {
             sync_status: status,
             sync_error: errorMsg,
             last_google_sync_at: serverTimestamp(), // Update even on error to know when we tried
             updated_at: serverTimestamp()
         });
     } catch (e) {
         console.warn("Could not mark sync error", e);
     }
  },

  async deleteEvent(id: string, options?: { deleteGoogle?: boolean }) {
    try {
      const docRef = doc(db, EVENTOS_COLLECTION, id);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
         const data = snap.data();
         if (data.google_event_id && options?.deleteGoogle) {
            // Never delete external imports from Google automatically unless explicit
            if (data.origem !== 'google_external' && !data.imported_from_google) {
                try {
                   await googleCalendarService.deleteGoogleEventIfExists(data);
                } catch(e: any) {
                   console.warn('Failed to delete event from Google Calendar during local delete', e);
                   if (e.message?.includes('expirou')) {
                       throw new Error('GCAL_TOKEN_EXPIRED'); // Let UI know we failed GCal delete
                   }
                }
            }
         }
      }
      await deleteDoc(docRef);
    } catch (error: any) {
      if (error.message === 'GCAL_TOKEN_EXPIRED') throw error;
      handleFirestoreError(error, OperationType.DELETE, EVENTOS_COLLECTION);
      throw error;
    }
  },

  async retrySyncEvent(id: string) {
     const snap = await getDoc(doc(db, EVENTOS_COLLECTION, id));
     if (!snap.exists()) return;
     const data = snap.data();
     if (!data.sync_enabled) return;

     await this.syncLocalEventToGoogle(id, data.user_id);
  },

  async syncGoogleRange(userId: string, timeMin: Date, timeMax: Date) {
     await googleCalendarService.syncToLocalDatabase({ userId, timeMin, timeMax });
  }
};
