import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  serverTimestamp, 
  writeBatch, 
  doc, 
  onSnapshot,
  updateDoc,
  setDoc,
  deleteDoc,
  Timestamp,
  orderBy,
  limit
} from 'firebase/firestore';
import { db } from '@/lib/firebase'; // TODO: Refatorar
import { 
  AppNotification, 
  NotificationCategory, 
  NotificationPriority, 
  NotificationStatus, 
  NotificationType,
  NotificationAction
} from '@/types/notifications';
import { format, isSameDay, isBefore, addDays, startOfDay, parseISO, isAfter } from 'date-fns';

class NotificationService {
  private checkedToday = false;

  /**
   * Main sync function to evaluate the system state and generate/update notifications.
   * This handles deduplication using dedupe_key.
   */
  async syncNotificationsFromModules(userId: string) {
    // We can run this on login or periodically. 
    // It doesn't need to be extremely aggressive if onSnapshot handles the UI.
    try {
      const today = startOfDay(new Date());

      // Fetch data needed for analysis
      const [eventsSnap, reviewsSnap, faltasSnap] = await Promise.all([
        getDocs(query(collection(db, 'eventos_academicos'), where('user_id', '==', userId), where('concluido', '==', false))),
        getDocs(query(collection(db, 'revisoes'), where('user_id', '==', userId), where('status', '==', 'pendente'))),
        getDocs(query(collection(db, 'ocorrencias_grade'), where('user_id', '==', userId), where('status', '==', 'pendente')))
      ]);

      const events = eventsSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      const reviews = reviewsSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      const faltas = faltasSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));

      const batch = writeBatch(db);
      let batchCount = 0;

      // Helper to upsert a notification
      const upsertNotif = async (data: Partial<AppNotification> & { dedupe_key: string }) => {
        // Query to check if it exists
        const q = query(collection(db, 'notificacoes'), where('user_id', '==', userId), where('dedupe_key', '==', data.dedupe_key));
        const snap = await getDocs(q);
        
        if (snap.empty) {
          const docRef = doc(collection(db, 'notificacoes'));
          batch.set(docRef, {
            ...data,
            user_id: userId,
            status: 'nao_lida',
            lida: false,
            created_at: new Date().toISOString(),
            is_persistent: true
          });
          batchCount++;
        } else {
          // It exists, maybe update message if changed, but generally we avoid spam
          const existing = snap.docs[0];
          if (existing.data().status === 'resolvida' || existing.data().status === 'dispensada') return;

          // If it was lida but conditions persist, we don't necessarily want to pester the user
          // unless it's a high priority that changed state.
        }
      };

      // 1. REVIEWS Logic
      const todayReviews = reviews.filter(r => isSameDay(startOfDay(new Date(r.data_prevista)), today));
      if (todayReviews.length > 0) {
        await upsertNotif({
          titulo: `Você tem ${todayReviews.length} ${todayReviews.length === 1 ? 'revisão' : 'revisões'} para hoje`,
          mensagem: `Mantenha seu streak ativo! Suas revisões diárias já estão disponíveis.`,
          tipo: 'revisao_hoje',
          category: 'revisao',
          prioridade: 'alta',
          dedupe_key: `rev_today_${format(today, 'yyyy-MM-dd')}`,
          origem: 'system_sync',
          actions: [
            { label: 'Revisar Agora', type: 'abrir_revisao' }
          ]
        });
      }

      const overdueReviews = reviews.filter(r => isBefore(startOfDay(new Date(r.data_prevista)), today));
      if (overdueReviews.length > 0) {
        await upsertNotif({
          titulo: `${overdueReviews.length} ${overdueReviews.length === 1 ? 'revisão atrasada' : 'revisões atrasadas'}`,
          mensagem: `Atenção: algumas revisões ficaram pendentes. Tente recuperá-las hoje.`,
          tipo: 'revisao_atrasada',
          category: 'revisao',
          prioridade: 'critica',
          dedupe_key: `rev_overdue_${format(today, 'yyyy-MM-dd')}`,
          origem: 'system_sync',
          actions: [
            { label: 'Ver Atrasadas', type: 'abrir_revisao' }
          ]
        });
      }

      // 2. FALTAS Logic
      faltas.forEach(falta => {
        upsertNotif({
          titulo: `Falta Pendente de Reposição`,
          mensagem: `Você possui uma falta registrada que ainda não foi reposta ou recuperada.`,
          tipo: 'falta_pendente',
          category: 'falta',
          prioridade: 'media',
          source_entity_id: falta.id,
          source_entity_type: 'ocorrencias_grade',
          dedupe_key: `falta_${falta.id}`,
          origem: 'system_sync',
          actions: [
            { label: 'Resolver Falta', type: 'abrir_falta', payload: { id: falta.id } }
          ]
        });
      });

      // 3. EVENTS Logic (Provas, Reposições, etc)
      events.forEach(event => {
        const eventDate = startOfDay(new Date(event.data_inicio));
        
        // Today's events
        if (isSameDay(eventDate, today)) {
          if (event.tipo === 'reposicao') {
            upsertNotif({
              titulo: `Reposição Agendada para hoje`,
              mensagem: `Não esqueça: você tem uma reposição de aula hoje às ${format(new Date(event.data_inicio), 'HH:mm')}.`,
              tipo: 'reposicao_agendada',
              category: 'reposicao',
              prioridade: 'alta',
              source_entity_id: event.id,
              dedupe_key: `reposicao_hoje_${event.id}`,
              origem: 'system_sync',
              actions: [{ label: 'Ver Detalhes', type: 'abrir_calendario' }]
            });
          }
        }

        // 3 days before
        if (isSameDay(eventDate, addDays(today, 3))) {
          const catMap: Record<string, NotificationCategory> = { 'prova': 'avaliacao', 'trabalho': 'avaliacao', 'apresentacao': 'avaliacao' };
          const typeMap: Record<string, NotificationType> = { 'prova': 'prova_proxima', 'trabalho': 'trabalho_proximo', 'apresentacao': 'apresentacao_proxima' };
          
          upsertNotif({
            titulo: `${event.titulo} em 3 dias`,
            mensagem: `Lembrete: sua ${event.tipo.replace('_', ' ')} está se aproximando.`,
            tipo: typeMap[event.tipo] || 'evento_calendario',
            category: catMap[event.tipo] || 'agenda',
            prioridade: 'alta',
            source_entity_id: event.id,
            dedupe_key: `event_3d_${event.id}`,
            origem: 'system_sync',
            actions: [{ label: 'Ver no Calendário', type: 'abrir_calendario' }]
          });
        }
      });

      if (batchCount > 0) {
        await batch.commit();
      }

    } catch (e) {
      console.error("Error syncing notifications:", e);
    }
  }

  async markAsRead(id: string) {
    try {
      await updateDoc(doc(db, 'notificacoes', id), {
        status: 'lida',
        lida: true,
        read_at: new Date().toISOString()
      });
    } catch (e) {
      console.error("Error marking as read:", e);
    }
  }

  async markAllAsRead(userId: string) {
    try {
      const q = query(collection(db, 'notificacoes'), where('user_id', '==', userId), where('lida', '==', false));
      const snap = await getDocs(q);
      const batch = writeBatch(db);
      snap.docs.forEach(d => {
        batch.update(d.ref, { status: 'lida', lida: true, read_at: new Date().toISOString() });
      });
      await batch.commit();
    } catch (e) {
      console.error("Error marking all as read:", e);
    }
  }

  async archiveNotification(id: string) {
    try {
      await updateDoc(doc(db, 'notificacoes', id), {
        status: 'arquivada',
        dismissed_at: new Date().toISOString()
      });
    } catch (e) {
      console.error("Error archiving notification:", e);
    }
  }

  async resolveNotificationByDedupeKey(userId: string, dedupeKey: string) {
    try {
      const q = query(collection(db, 'notificacoes'), where('user_id', '==', userId), where('dedupe_key', '==', dedupeKey));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const batch = writeBatch(db);
        snap.docs.forEach(d => {
          batch.update(d.ref, { status: 'resolvida', resolved_at: new Date().toISOString() });
        });
        await batch.commit();
      }
    } catch (e) {
      console.error("Error resolving notification:", e);
    }
  }

  async deleteNotification(id: string) {
    try {
      await deleteDoc(doc(db, 'notificacoes', id));
    } catch (e) {
      console.error("Error deleting notification:", e);
    }
  }

  subscribeToUnread(userId: string, callback: (notifications: AppNotification[]) => void) {
    const q = query(
      collection(db, 'notificacoes'), 
      where('user_id', '==', userId), 
      where('status', 'in', ['nao_lida', 'lida']), // Show both in list, but handle ordering
      orderBy('created_at', 'desc'),
      limit(50)
    );

    return onSnapshot(q, (snap) => {
      const notifs = snap.docs.map(d => ({ id: d.id, ...d.data() } as AppNotification));
      callback(notifs);
    });
  }
}

export const notificationService = new NotificationService();
