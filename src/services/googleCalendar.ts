import { auth, db } from '@/lib/firebase';
import { GoogleAuthProvider, signInWithPopup, reauthenticateWithPopup } from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';

const SCOPES = 'https://www.googleapis.com/auth/calendar.events'; // Note: token is temporary in this frontend-only approach and can expire.
const TIMEZONE = 'America/Sao_Paulo';

export type GCalDiagnosticResult = {
  ok: boolean;
  step:
    | 'no_auth_user'
    | 'popup_opened'
    | 'popup_cancelled'
    | 'popup_blocked'
    | 'account_mismatch'
    | 'missing_access_token'
    | 'token_received'
    | 'calendar_probe_success'
    | 'calendar_probe_401'
    | 'calendar_probe_403'
    | 'calendar_probe_other_error'
    | 'unknown_error';
  message: string;
  technical?: {
    firebaseCode?: string;
    googleStatus?: number;
    googleStatusText?: string;
    googleError?: any;
    hasToken?: boolean;
    tokenStart?: string;
    email?: string | null;
    uid?: string;
  };
};

export const googleCalendarService = {
  getToken(): string | null {
    return localStorage.getItem('gcal_token');
  },

  ensureTokenOrThrow(): string {
    const token = this.getToken();
    if (!token) throw new Error('Google Calendar desconectado ou sessão expirada. Conecte novamente.');
    return token;
  },

  async markNeedsReconnect(userId: string, errorMessage: string = 'Reconexão necessária') {
    localStorage.removeItem('gcal_token');
    await setDoc(doc(db, 'users', userId), {
      gcal_connected: false,
      gcal_needs_reconnect: true,
      gcal_last_error: errorMessage,
      gcal_token_status: 'expired',
      updated_at: serverTimestamp()
    }, { merge: true });
  },

  clearLocalGoogleSession() {
    localStorage.removeItem('gcal_token');
  },

  async handleGoogleApiResponse(response: Response, userId: string, actionName: string) {
    if (response.status === 401 || response.status === 403) {
      await this.markNeedsReconnect(userId, 'Sua conexão com o Google Calendar expirou. Reconecte nas Configurações.');
      throw new Error('Sua conexão com o Google Calendar expirou. Reconecte nas Configurações.');
    }
    if (!response.ok) {
      let errorText = '';
      try { errorText = await response.text(); } catch(e){}
      console.error(`Google Calendar API Error [${actionName}]: ${response.status} ${response.statusText} - ${errorText}`);
      throw new Error(`Erro ao sincronizar com Google Calendar (${response.status}).`);
    }
  },

  async getConnectionStatus(userId?: string) {
    if (!auth.currentUser) {
      return {
        status: 'disconnected',
        canSync: false,
        canReconnect: false,
        message: 'Usuário não autenticado no Revisa+.'
      };
    }
    
    const uid = userId || auth.currentUser.uid;
    const token = this.getToken();
    const userDoc = await getDoc(doc(db, 'users', uid));
    const data = userDoc.exists() ? userDoc.data() : null;
    
    if (!data || !data.gcal_connected) {
      return {
        status: 'disconnected',
        canSync: false,
        canReconnect: true,
        message: 'Google Calendar não conectado.'
      };
    }
    
    if (data.gcal_token_status === 'connecting') {
      return {
        status: 'connecting',
        canSync: false,
        canReconnect: false, // temporarily block while another tab might be connecting
        message: 'Conectando...'
      };
    }
    
    if (data.gcal_needs_reconnect || data.gcal_token_status === 'expired') {
      return {
        status: 'needs_reconnect',
        canSync: false,
        canReconnect: true,
        message: 'Sua conexão com o Google Calendar expirou. Reconecte nas Configurações.'
      };
    }
    
    if (!token) {
      return {
        status: 'missing_token',
        canSync: false,
        canReconnect: true,
        message: 'Sessão local do Google Calendar perdida. Reconecte nas Configurações.'
      };
    }
    
    return {
      status: 'connected',
      canSync: true,
      canReconnect: true,
      message: 'Conectado e pronto para sincronizar.'
    };
  },

  async diagnosticConnect(): Promise<GCalDiagnosticResult> {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        return {
          ok: false,
          step: 'no_auth_user',
          message: 'Usuário não autenticado no Revisa+.'
        };
      }
      
      const currentUid = currentUser.uid;
      const currentEmail = currentUser.email;

      this.clearLocalGoogleSession();
      
      setDoc(doc(db, 'users', currentUid), {
        gcal_connected: false,
        gcal_needs_reconnect: false,
        gcal_token_status: 'connecting',
        gcal_last_error: null,
        updated_at: serverTimestamp()
      }, { merge: true }).catch(console.error);

      const provider = new GoogleAuthProvider();
      provider.addScope(SCOPES);
      provider.setCustomParameters({ prompt: 'consent select_account' });
      
      let result;
      try {
        result = await signInWithPopup(auth, provider);
      } catch (err: any) {
        if (err.code === 'auth/popup-closed-by-user') {
          return { ok: false, step: 'popup_cancelled', message: 'A conexão foi cancelada antes da autorização.' };
        } else if (err.code === 'auth/popup-blocked') {
          return { ok: false, step: 'popup_blocked', message: 'O navegador bloqueou o popup. Permita popups ou abra o app em nova guia.' };
        } else if (err.code === 'auth/network-request-failed') {
          return { ok: false, step: 'unknown_error', message: 'O preview bloqueou a conexão. Abra o app em nova guia.', technical: { firebaseCode: err.code } };
        }
        return { ok: false, step: 'unknown_error', message: err.message, technical: { firebaseCode: err.code } };
      }
      
      if (result.user.uid !== currentUid) {
         this.clearLocalGoogleSession();
         await setDoc(doc(db, 'users', currentUid), {
            gcal_connected: false,
            gcal_needs_reconnect: true,
            gcal_token_status: 'account_mismatch',
            gcal_last_error: 'Conta Google diferente da conta logada no Revisa+'
         }, { merge: true });
         return {
           ok: false,
           step: 'account_mismatch',
           message: 'A conta Google escolhida não é a mesma conta logada no Revisa+.'
         };
      }

      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential?.accessToken;
      
      if (!token) {
        this.clearLocalGoogleSession();
        await setDoc(doc(db, 'users', currentUid), {
            gcal_connected: false,
            gcal_needs_reconnect: true,
            gcal_token_status: 'missing_access_token',
            gcal_last_error: 'O Firebase não retornou accessToken do Google.'
        }, { merge: true });
        return {
           ok: false,
           step: 'missing_access_token',
           message: 'O Google confirmou o login, mas não retornou permissão utilizável do Calendar.'
        };
      }

      // Check token validity
      const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=1', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        localStorage.setItem('gcal_token', token);
        await setDoc(doc(db, 'users', currentUid), {
          gcal_connected: true,
          gcal_needs_reconnect: false,
          gcal_token_status: 'active',
          gcal_last_error: null,
          gcal_email: result.user.email,
          gcal_connected_at: new Date().toISOString(),
          updated_at: serverTimestamp()
        }, { merge: true });
        return {
          ok: true,
          step: 'calendar_probe_success',
          message: 'Google Calendar conectado e validado com sucesso.'
        };
      } else {
        const rawText = await response.text();
        let googleError = null;
        try { googleError = JSON.parse(rawText); } catch(e){}
        console.warn('GCal probe failed:', rawText);
        this.clearLocalGoogleSession();
        
        if (response.status === 401) {
          await setDoc(doc(db, 'users', currentUid), {
            gcal_connected: false,
            gcal_needs_reconnect: true,
            gcal_token_status: 'expired',
            gcal_last_error: rawText
          }, { merge: true });
          return {
            ok: false,
            step: 'calendar_probe_401',
            message: 'O Google recusou o token. Reconecte e aceite as permissões.',
            technical: { googleStatus: response.status, googleStatusText: response.statusText, googleError }
          };
        } else if (response.status === 403) {
          await setDoc(doc(db, 'users', currentUid), {
            gcal_connected: false,
            gcal_needs_reconnect: true,
            gcal_token_status: 'forbidden',
            gcal_last_error: rawText
          }, { merge: true });
          return {
            ok: false,
            step: 'calendar_probe_403',
            message: 'Autorização recebida, mas o Google bloqueou a API Calendar. Verifique API habilitada, consent screen e test users.',
            technical: { googleStatus: response.status, googleStatusText: response.statusText, googleError }
          };
        } else {
          await setDoc(doc(db, 'users', currentUid), {
            gcal_connected: false,
            gcal_needs_reconnect: true,
            gcal_token_status: 'error',
            gcal_last_error: rawText
          }, { merge: true });
          return {
            ok: false,
            step: 'calendar_probe_other_error',
            message: `Erro do Google Calendar (${response.status})`,
            technical: { googleStatus: response.status, googleStatusText: response.statusText, googleError }
          };
        }
      }
    } catch (error: any) {
      return {
        ok: false,
        step: 'unknown_error',
        message: error.message || 'Erro desconhecido ao conectar com o Google.',
        technical: { googleError: error }
      };
    }
  },

  async forceReconnect(): Promise<boolean> {
     const res = await this.diagnosticConnect();
     if (!res.ok) throw new Error(res.message);
     return true;
  },

  async connect() {
    const res = await this.diagnosticConnect();
    if (!res.ok) throw new Error(res.message);
    return true;
  },

  async isConnected() {
    const status = await this.getConnectionStatus();
    return status.canSync;
  },

  async disconnect() {
    if (!auth.currentUser) return;
    this.clearLocalGoogleSession();
    await setDoc(doc(db, 'users', auth.currentUser.uid), {
      gcal_connected: false,
      gcal_needs_reconnect: false,
      gcal_email: null,
      gcal_token_status: 'disconnected',
      updated_at: serverTimestamp()
    }, { merge: true });
  },

  buildGoogleEventPayload(eventDetails: any) {
    // Determine end date handling for allDay (exclusive)
    let endDateForGoogle = eventDetails.data_fim.split('T')[0];
    if (eventDetails.dia_inteiro) {
        const startDate = new Date(eventDetails.data_inicio.split('T')[0]);
        const endDate = new Date(eventDetails.data_fim.split('T')[0]);
        // Google expects exclusive end date, so if start == end or end is invalid, we add 1 day
        if (endDate <= startDate) {
           startDate.setDate(startDate.getDate() + 1);
           endDateForGoogle = startDate.toISOString().split('T')[0];
        } else {
           endDate.setDate(endDate.getDate() + 1);
           endDateForGoogle = endDate.toISOString().split('T')[0];
        }
    }

    // Prepare description text
    let description = '';
    
    // Matéria info if available
    const materiaInfo = eventDetails.materia_nome ? `📚 Matéria: ${eventDetails.materia_nome}` : '';
    const topicoInfo = eventDetails.topico_nome ? `🔹 Tópico/Conteúdo: ${eventDetails.topico_nome}` : '';

    if (eventDetails.tipo === 'revisao') {
        description += `🔄 Revisão Agendada\n${materiaInfo}\n${topicoInfo}`.trim();
        if (eventDetails.descricao) description += `\n\n${eventDetails.descricao}`;
        description += `\n\n✨ Criado pelo Revisa+`;
    } else if (['prova', 'trabalho', 'apresentacao'].includes(eventDetails.tipo)) {
        const tipoLabel = eventDetails.tipo.charAt(0).toUpperCase() + eventDetails.tipo.slice(1);
        description += `📝 ${tipoLabel}\n${materiaInfo}\n${topicoInfo}`.trim();
        if (eventDetails.peso) description += `\n⚖️ Peso: ${eventDetails.peso}`;
        if (eventDetails.descricao) description += `\n\n📌 Observações:\n${eventDetails.descricao}`;
        description += `\n\n✨ Criado pelo Revisa+`;
    } else {
        if (eventDetails.descricao) description += eventDetails.descricao + '\n\n';
        if (materiaInfo) description += `${materiaInfo}\n`;
        description += `✨ Criado pelo Revisa+ (Tipo: ${eventDetails.tipo || 'Evento'})`;
    }

    // Add reminders overrides based on type
    let reminders: any = { useDefault: true };
    if (!eventDetails.dia_inteiro) {
      if (['prova', 'trabalho', 'apresentacao'].includes(eventDetails.tipo)) {
         reminders = {
            useDefault: false,
            overrides: [
               { method: 'popup', minutes: 24 * 60 }, // 1 day before
               { method: 'popup', minutes: 3 * 24 * 60 }, // 3 days before
               { method: 'popup', minutes: 7 * 24 * 60 }, // 1 week before
            ]
         };
      } else if (eventDetails.tipo === 'revisao' || eventDetails.tipo === 'lembrete' || eventDetails.tipo === 'tarefa' || eventDetails.tipo === 'sessao_estudo') {
         reminders = {
            useDefault: false,
            overrides: [
               { method: 'popup', minutes: 30 } // 30 mins before
            ]
         };
      }
    }

    let summary = eventDetails.titulo;
    if (eventDetails.materia_nome) {
      summary = `[Revisa+] ${eventDetails.materia_nome} - ${eventDetails.titulo}`;
    } else {
      summary = `[Revisa+] ${eventDetails.titulo}`;
    }

    return {
      summary,
      description: description.trim(),
      location: eventDetails.local || '',
      start: eventDetails.dia_inteiro 
        ? { date: eventDetails.data_inicio.split('T')[0] }
        : { dateTime: new Date(eventDetails.data_inicio).toISOString(), timeZone: TIMEZONE },
      end: eventDetails.dia_inteiro 
        ? { date: endDateForGoogle }
        : { dateTime: new Date(eventDetails.data_fim).toISOString(), timeZone: TIMEZONE },
      colorId: this.appColorToGoogleColorId(eventDetails.cor),
      reminders
    };
  },

  async createEvent(eventDetails: any) {
    if (!auth.currentUser) throw new Error('Not auth');
    const token = this.ensureTokenOrThrow();
    const gcalEvent = this.buildGoogleEventPayload(eventDetails);

    const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(gcalEvent)
    });

    await this.handleGoogleApiResponse(response, auth.currentUser.uid, 'createEvent');

    const data = await response.json();
    return { id: data.id, htmlLink: data.htmlLink };
  },

  async updateEvent(googleEventId: string, eventDetails: any) {
    if (!auth.currentUser) throw new Error('Not auth');
    const token = this.ensureTokenOrThrow();
    const gcalEvent = this.buildGoogleEventPayload(eventDetails);

    const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${googleEventId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(gcalEvent)
    });

    await this.handleGoogleApiResponse(response, auth.currentUser.uid, 'updateEvent');
    
    const data = await response.json();
    return { htmlLink: data.htmlLink };
  },

  async deleteEvent(googleEventId: string) {
    if (!auth.currentUser) throw new Error('Not auth');
    const token = this.getToken(); // Don't throw, just ignore if not connected when deleting
    if (!token) return;

    const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${googleEventId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.status === 404 || response.status === 410) {
      return; // Already deleted
    }

    await this.handleGoogleApiResponse(response, auth.currentUser.uid, 'deleteEvent');
  },

  async upsertEvent(localEvent: any) {
     if (localEvent.google_event_id) {
         const res = await this.updateEvent(localEvent.google_event_id, localEvent);
         return {
            google_event_id: localEvent.google_event_id,
            htmlLink: res.htmlLink,
            sync_status: 'sincronizado',
            last_sync_at: new Date().toISOString()
         };
     } else {
         const res = await this.createEvent(localEvent);
         return {
            google_event_id: res.id,
            htmlLink: res.htmlLink,
            sync_status: 'sincronizado',
            last_sync_at: new Date().toISOString()
         };
     }
  },

  async deleteGoogleEventIfExists(localEvent: any) {
     if (!localEvent.google_event_id) return 'nao_sincronizado';
     try {
         await this.deleteEvent(localEvent.google_event_id);
         return 'excluido';
     } catch (e: any) {
         if (e.message && e.message.includes('expirou')) throw e; // bubble up for UI
         return 'erro_ignorado';
     }
  },

  async fetchEvents(timeMin: Date, timeMax: Date) {
    if (!auth.currentUser) return [];
    let token = this.getToken();
    if (!token) return [];

    // TODO: A integração com Google Tasks (Tarefas) requer a Google Tasks API e escopos próprios (https://www.googleapis.com/auth/tasks.readonly).
    // O Google Calendar API retorna eventos gerados por tarefas, mas apenas se o calendário oculto "Tarefas" for sincronizado 
    // ou requisições à Google Tasks API forem implementadas. Atualmente, exibimos apenas eventos nativos do Google Calendar.

    const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin.toISOString()}&timeMax=${timeMax.toISOString()}&singleEvents=true&maxResults=500`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    await this.handleGoogleApiResponse(response, auth.currentUser.uid, 'fetchEvents');
    
    const data = await response.json();
    return data.items || [];
  },

  async syncToLocalDatabase(options?: { timeMin?: Date; timeMax?: Date; userId?: string }) {
    const activeUserId = options?.userId || auth.currentUser?.uid;
    if (!activeUserId) return;
    
    const isConn = await this.isConnected();
    if (!isConn) return;

    try {
      const now = new Date();
      const timeMin = options?.timeMin || new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const timeMax = options?.timeMax || new Date(now.getFullYear(), now.getMonth() + 3, 0); // ~3 months
      
      const { userPreferencesService } = await import('./userPreferencesService');
      const prefs = await userPreferencesService.getPreferences(activeUserId);
      const autoImport = prefs?.googleCalendar?.autoImportExternalEvents !== false;

      const items = await this.fetchEvents(timeMin, timeMax);
      
      const { collection, query, where, getDocs, writeBatch, doc } = await import('firebase/firestore');
      
      // Fetch all local events of the user to handle both Timestamp and String dates in memory
      const eventsQuery = query(collection(db, 'eventos_academicos'), where('user_id', '==', activeUserId));
      const localEventsSnap = await getDocs(eventsQuery);
      
      const { eventDateToDate } = await import('@/lib/utils');
      
      const localEvents = localEventsSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      
      // Filter in memory to avoid mixed Timestamp vs String errors
      const timeMinMs = timeMin.getTime();
      const timeMaxMs = timeMax.getTime();
      
      const rangeEvents = localEvents.filter(e => {
         const start = eventDateToDate(e.data_inicio).getTime();
         return start >= timeMinMs && start <= timeMaxMs;
      });
      
      const localSyncedGoogleIds = new Set(
         rangeEvents
            .filter(e => e.google_event_id && e.origem !== 'google_external')
            .map(e => e.google_event_id)
      );
      
      const externalLocalEvents = rangeEvents.filter(e => e.origem === 'google_external');
      const googleIdsFromApi = new Set(items.map((i: any) => i.id));

      const batch = writeBatch(db);
      let batchCount = 0;
      
      // Mark missing external events as deleted
      externalLocalEvents.forEach(extEvent => {
          if (extEvent.google_event_id && !googleIdsFromApi.has(extEvent.google_event_id)) {
              const eventRef = doc(db, 'eventos_academicos', extEvent.id);
              batch.update(eventRef, {
                 sync_status: 'removido_google',
                 google_deleted: true,
                 updated_at: new Date().toISOString()
              });
              batchCount++;
          }
      });

      if (items.length > 0 && autoImport) {
        items.forEach((item: any) => {
          if (!item.start || (!item.start.dateTime && !item.start.date)) return;
          if (localSyncedGoogleIds.has(item.id)) return; // Prevents duplication of Revisa+ events
          
          function sanitizeGoogleId(id: string) { return id.replace(/[^a-zA-Z0-9]/g, ''); }
          
          const eventRef = doc(db, 'eventos_academicos', `external_gcal_${sanitizeGoogleId(item.id)}`);
          const isAllDay = !!item.start.date;
          
          let dataInicio = item.start.dateTime || `${item.start.date}T00:00:00`;
          let dataFim = item.end?.dateTime || item.end?.date ? (item.end.dateTime || `${item.end.date}T23:59:59`) : dataInicio;
          
          if (isAllDay && item.end?.date) {
              const dStart = new Date(`${item.start.date}T12:00:00`);
              const dEnd = new Date(`${item.end.date}T12:00:00`);
              if (dEnd > dStart) {
                  dEnd.setDate(dEnd.getDate() - 1);
                  dataFim = `${dEnd.toISOString().split('T')[0]}T23:59:59`;
              }
          }
          
          batch.set(eventRef, {
            user_id: activeUserId,
            titulo: item.summary || 'Evento (Google)',
            descricao: item.description || '',
            tipo: 'evento_google',
            origem: 'google_external',
            data_inicio: dataInicio,
            data_fim: dataFim,
            dia_inteiro: isAllDay,
            local: item.location || '',
            cor: this.googleColorIdToAppColor(item.colorId),
            concluido: false,
            google_event_id: item.id,
            google_calendar_id: 'primary',
            htmlLink: item.htmlLink || null,
            google_status: item.status || null,
            source_calendar_id: 'primary',
            sync_enabled: true,
            sync_status: 'externo',
            imported_from_google: true,
            google_deleted: false,
            updated_at: new Date().toISOString(),
            created_at: new Date().toISOString(), // Required by Firestore Rules
            last_google_sync_at: new Date().toISOString()
          }, { merge: true });
          batchCount++;
        });
      }

      if (batchCount > 0) {
         await batch.commit();
      }

      await setDoc(doc(db, 'users', activeUserId), {
         gcal_last_sync: new Date().toISOString()
      }, { merge: true });

    } catch (e) {
      console.error("Failed to sync GCal", e);
      throw e;
    }
  },

  appColorToGoogleColorId(appColor: string): string {
    if (!appColor) return '3'; // Grape/Roxo default
    const token = appColor.toLowerCase().trim();
    const map: Record<string, string> = {
      'azul': '1',     // Lavender
      'verde': '2',    // Sage
      'roxo': '3',     // Grape
      'rosa': '4',     // Flamingo
      'amarelo': '5',  // Banana
      'laranja': '6',  // Tangerine
      'ciano': '7',    // Peacock
      'cinza': '8',    // Graphite
      'azul-escuro': '9', // Blueberry
      'verde-escuro': '10', // Basil
      'vermelho': '11',  // Tomato
      '#3b82f6': '1', // azul
      '#0284c7': '9', // azul-escuro
      '#10b981': '2', // verde
      '#8b5cf6': '3', // roxo
      '#ec4899': '4', // rosa
      '#eab308': '5', // amarelo
      '#f59e0b': '6', // laranja
      '#f97316': '6', // laranja
      '#06b6d4': '7', // ciano
      '#64748b': '8', // cinza
      '#6b7280': '8', // cinza
      '#1d4ed8': '9', // azul escuro
      '#047857': '10', // verde-escuro
      '#ef4444': '11', // vermelho
    };
    return map[token] || '3';
  },

  googleColorIdToAppColor(colorId?: string): string {
    if (!colorId) return 'azul';
    const map: Record<string, string> = {
      '1': 'azul',
      '2': 'verde',
      '3': 'roxo',
      '4': 'rosa',
      '5': 'amarelo',
      '6': 'laranja',
      '7': 'ciano',
      '8': 'cinza',
      '9': 'azul-escuro',
      '10': 'verde-escuro',
      '11': 'vermelho'
    };
    return map[colorId] || 'azul';
  }
};
