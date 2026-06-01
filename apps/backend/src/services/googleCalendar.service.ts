import { google, calendar_v3 } from 'googleapis';
import { prisma } from '../config/prisma';
import { emitCalendarUpdated } from '../ws/emit';

type CalendarSyncOptions = {
  /** Incremental sync via syncToken. Disabled when timeMin/timeMax is set. */
  incremental?: boolean;
  timeMin?: Date;
  timeMax?: Date;
};

export const googleCalendarService = {
  async getClient(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.googleRefreshToken) {
      throw new Error('Google Calendar is not connected for this user.');
    }

    const client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
    client.setCredentials({ refresh_token: user.googleRefreshToken });
    return client;
  },

  async getPrimaryCalendarId(userId: string): Promise<string> {
    const primary = await prisma.userGoogleCalendar.findFirst({
      where: { userId, primary: true }
    });
    if (primary) return primary.googleCalendarId;

    const any = await prisma.userGoogleCalendar.findFirst({ where: { userId } });
    return any?.googleCalendarId || 'primary';
  },

  /** Ensures at least the primary calendar exists when calendarList API is unavailable. */
  async ensureDefaultCalendars(userId: string): Promise<void> {
    const existing = await prisma.userGoogleCalendar.findFirst({ where: { userId } });
    if (existing) return;

    await prisma.userGoogleCalendar.create({
      data: {
        userId,
        googleCalendarId: 'primary',
        summary: 'Principal',
        primary: true,
        selected: true
      }
    });
  },

  /**
   * Fetches calendar list from Google and upserts into user_google_calendars.
   * On first insert, `selected` mirrors Google's sidebar visibility.
   */
  async refreshCalendarList(userId: string): Promise<void> {
    const client = await this.getClient(userId);
    const calendarApi = google.calendar({ version: 'v3', auth: client });

    const googleIds: string[] = [];
    let pageToken: string | undefined;

    do {
      const response = await calendarApi.calendarList.list({
        maxResults: 250,
        pageToken
      });
      const items = response.data.items || [];

      for (const item of items) {
        if (!item.id) continue;
        googleIds.push(item.id);

        const existing = await prisma.userGoogleCalendar.findUnique({
          where: {
            userId_googleCalendarId: { userId, googleCalendarId: item.id }
          }
        });

        const summary = item.summaryOverride || item.summary || 'Sem nome';

        if (existing) {
          await prisma.userGoogleCalendar.update({
            where: { id: existing.id },
            data: {
              summary,
              description: item.description || null,
              backgroundColor: item.backgroundColor || null,
              foregroundColor: item.foregroundColor || null,
              accessRole: item.accessRole || null,
              primary: item.primary === true
            }
          });
        } else {
          await prisma.userGoogleCalendar.create({
            data: {
              userId,
              googleCalendarId: item.id,
              summary,
              description: item.description || null,
              backgroundColor: item.backgroundColor || null,
              foregroundColor: item.foregroundColor || null,
              accessRole: item.accessRole || null,
              primary: item.primary === true,
              selected: item.selected !== false
            }
          });
        }
      }

      pageToken = response.data.nextPageToken || undefined;
    } while (pageToken);

    if (googleIds.length > 0) {
      await prisma.userGoogleCalendar.deleteMany({
        where: {
          userId,
          googleCalendarId: { notIn: googleIds }
        }
      });
    }
  },

  async upsertEvent(userId: string, eventoId: string) {
    try {
      const evento = await prisma.eventoAcademico.findUnique({
        where: { id: eventoId, userId }
      });

      if (!evento) return;

      const calendarId =
        evento.googleCalendarId || (await this.getPrimaryCalendarId(userId));

      const client = await this.getClient(userId);
      const calendar = google.calendar({ version: 'v3', auth: client });

      const googleEvent: calendar_v3.Schema$Event = {
        summary: `Revisa+ | ${evento.titulo}`,
        description: evento.descricao || '',
        start: evento.diaInteiro
          ? { date: evento.dataInicio.toISOString().split('T')[0] }
          : { dateTime: evento.dataInicio.toISOString() },
        end: evento.diaInteiro
          ? { date: evento.dataFim.toISOString().split('T')[0] }
          : { dateTime: evento.dataFim.toISOString() },
        location: evento.local || '',
        colorId: '9'
      };

      if (evento.googleEventId) {
        await calendar.events.update({
          calendarId,
          eventId: evento.googleEventId,
          requestBody: googleEvent
        });
      } else {
        const response = await calendar.events.insert({
          calendarId,
          requestBody: googleEvent
        });

        if (response.data.id) {
          await prisma.eventoAcademico.update({
            where: { id: eventoId },
            data: {
              googleEventId: response.data.id,
              googleCalendarId: calendarId,
              htmlLink: response.data.htmlLink,
              syncStatus: 'sincronizado',
              lastSyncAt: new Date()
            }
          });
        }
      }
    } catch (error) {
      console.error(`Failed to upsert event ${eventoId} to Google Calendar:`, error);
      await prisma.eventoAcademico.update({
        where: { id: eventoId },
        data: { syncStatus: 'erro', lastSyncAt: new Date() }
      });
    }
  },

  async deleteEvent(userId: string, googleEventId: string, googleCalendarId?: string | null) {
    if (!googleEventId) return;
    try {
      const calendarId = googleCalendarId || (await this.getPrimaryCalendarId(userId));
      const client = await this.getClient(userId);
      const calendar = google.calendar({ version: 'v3', auth: client });

      await calendar.events.delete({
        calendarId,
        eventId: googleEventId
      });
    } catch (error: any) {
      if (error.code !== 404) {
        console.error(`Failed to delete Google event ${googleEventId}:`, error);
      }
    }
  },

  async syncSingleCalendar(
    userId: string,
    googleCalendarId: string,
    options: CalendarSyncOptions = {}
  ): Promise<number> {
    const calRecord = await prisma.userGoogleCalendar.findUnique({
      where: {
        userId_googleCalendarId: { userId, googleCalendarId }
      }
    });
    if (!calRecord) return 0;

    const client = await this.getClient(userId);
    const calendar = google.calendar({ version: 'v3', auth: client });

    const useIncremental =
      options.incremental !== false &&
      !options.timeMin &&
      !options.timeMax &&
      Boolean(calRecord.syncToken);

    const requestOptions: calendar_v3.Params$Resource$Events$List = {
      calendarId: googleCalendarId,
      maxResults: 250,
      singleEvents: true
    };

    if (useIncremental) {
      requestOptions.syncToken = calRecord.syncToken!;
      requestOptions.showDeleted = true;
    } else {
      const dateMin = options.timeMin ?? new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      requestOptions.timeMin = dateMin.toISOString();
      if (options.timeMax) {
        requestOptions.timeMax = options.timeMax.toISOString();
      }
    }

    let syncTokenToSave: string | null | undefined = null;
    let pageToken: string | undefined;
    let imported = 0;

    do {
      if (pageToken) requestOptions.pageToken = pageToken;

      try {
        const response = await calendar.events.list(requestOptions);
        const items = response.data.items || [];

        for (const item of items) {
          await this.handleIncomingGoogleEvent(userId, googleCalendarId, item);
          if (item.status !== 'cancelled' && !item.summary?.startsWith('Revisa+ |')) {
            imported += 1;
          }
        }

        pageToken = response.data.nextPageToken || undefined;
        if (response.data.nextSyncToken) {
          syncTokenToSave = response.data.nextSyncToken;
        }
      } catch (err: any) {
        if (err.code === 410) {
          await prisma.userGoogleCalendar.update({
            where: { id: calRecord.id },
            data: { syncToken: null }
          });
          return this.syncSingleCalendar(userId, googleCalendarId, {
            ...options,
            incremental: false
          });
        }
        throw err;
      }
    } while (pageToken);

    if (syncTokenToSave) {
      await prisma.userGoogleCalendar.update({
        where: { id: calRecord.id },
        data: { syncToken: syncTokenToSave }
      });
    }

    console.log(
      `[GCal Sync] user=${userId} calendar=${googleCalendarId} mode=${useIncremental ? 'incremental' : 'window'} imported=${imported}`
    );

    return imported;
  },

  /**
   * Syncs all calendars the user chose to display (selected = true).
   */
  async syncUserCalendar(userId: string, options: CalendarSyncOptions = {}): Promise<void> {
    try {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user || !user.googleRefreshToken) return;

      try {
        await this.refreshCalendarList(userId);
      } catch (refreshError) {
        console.error(`refreshCalendarList failed for user ${userId}:`, refreshError);
        await this.ensureDefaultCalendars(userId);
      }

      let calendars = await prisma.userGoogleCalendar.findMany({
        where: { userId, selected: true }
      });

      if (calendars.length === 0) {
        await this.ensureDefaultCalendars(userId);
        calendars = await prisma.userGoogleCalendar.findMany({
          where: { userId, selected: true }
        });
      }

      if (calendars.length === 0) {
        await prisma.user.update({
          where: { id: userId },
          data: {
            gcalLastSync: new Date(),
            gcalTokenStatus: 'active',
            gcalLastError: null
          }
        });
        return;
      }

      let totalImported = 0;

      for (const cal of calendars) {
        try {
          const imported = await this.syncSingleCalendar(userId, cal.googleCalendarId, options);
          totalImported += imported;
          await this.registerWatchChannel(userId, cal.googleCalendarId);
        } catch (calError) {
          console.error(
            `Sync failed for calendar ${cal.googleCalendarId} (user ${userId}):`,
            calError
          );
        }
      }

      await prisma.user.update({
        where: { id: userId },
        data: {
          gcalLastSync: new Date(),
          gcalTokenStatus: 'active',
          gcalLastError: null
        }
      });

      emitCalendarUpdated(userId, {
        source: options.timeMin || options.incremental === false ? 'manual' : 'sync',
        imported: totalImported
      });
    } catch (error: any) {
      console.error(`Error during calendar sync for user ${userId}:`, error);
      await prisma.user.update({
        where: { id: userId },
        data: {
          gcalTokenStatus: 'error',
          gcalLastError: error.message || 'Unknown error'
        }
      });
    }
  },

  async handleIncomingGoogleEvent(
    userId: string,
    googleCalendarId: string,
    item: calendar_v3.Schema$Event
  ) {
    if (item.summary?.startsWith('Revisa+ |')) return;

    if (item.status === 'cancelled') {
      await prisma.eventoAcademico.deleteMany({
        where: {
          userId,
          googleEventId: item.id as string
        }
      });
      return;
    }

    const start = item.start?.dateTime
      ? new Date(item.start.dateTime)
      : item.start?.date
        ? new Date(item.start.date)
        : null;
    const end = item.end?.dateTime
      ? new Date(item.end.dateTime)
      : item.end?.date
        ? new Date(item.end.date)
        : start;

    if (!start || !end) return;

    const existing = await prisma.eventoAcademico.findFirst({
      where: {
        userId,
        googleEventId: item.id as string
      }
    });

    const calMeta = await prisma.userGoogleCalendar.findUnique({
      where: {
        userId_googleCalendarId: { userId, googleCalendarId }
      }
    });

    const data: {
      titulo: string;
      descricao: string | null | undefined;
      local: string | null | undefined;
      dataInicio: Date;
      dataFim: Date;
      diaInteiro: boolean;
      origem: 'google_external';
      htmlLink: string | null | undefined;
      googleCalendarId: string;
      syncStatus: string;
      lastSyncAt: Date;
      cor?: string | null;
    } = {
      titulo: item.summary || 'Evento sem título',
      descricao: item.description,
      local: item.location,
      dataInicio: start,
      dataFim: end,
      diaInteiro: !!item.start?.date,
      origem: 'google_external',
      htmlLink: item.htmlLink,
      googleCalendarId,
      syncStatus: 'sincronizado',
      lastSyncAt: new Date()
    };

    if (calMeta?.backgroundColor) {
      data.cor = calMeta.backgroundColor;
    }

    if (existing) {
      await prisma.eventoAcademico.update({ where: { id: existing.id }, data });
    } else {
      await prisma.eventoAcademico.create({
        data: {
          ...data,
          userId,
          googleEventId: item.id as string,
          tipo: 'evento_google'
        }
      });
    }
  },

  async registerWatchChannel(userId: string, googleCalendarId: string) {
    try {
      const calRecord = await prisma.userGoogleCalendar.findUnique({
        where: {
          userId_googleCalendarId: { userId, googleCalendarId }
        }
      });
      if (!calRecord) return;

      const client = await this.getClient(userId);
      const calendar = google.calendar({ version: 'v3', auth: client });

      const channelId = `revisa-${userId}-${googleCalendarId.replace(/[^a-zA-Z0-9]/g, '_')}-${Date.now()}`;
      const baseUrl =
        process.env.RENDER_EXTERNAL_URL ||
        process.env.BACKEND_URL ||
        'https://revisa-backend-v0ik.onrender.com';

      const response = await calendar.events.watch({
        calendarId: googleCalendarId,
        requestBody: {
          id: channelId,
          type: 'web_hook',
          address: `${baseUrl}/api/webhooks/google-calendar`
        }
      });

      if (response.data) {
        await prisma.userGoogleCalendar.update({
          where: { id: calRecord.id },
          data: {
            channelId: response.data.id || channelId,
            channelExpiresAt: response.data.expiration
              ? new Date(Number(response.data.expiration))
              : null
          }
        });
      }
    } catch (error) {
      console.error(
        `Failed to register watch channel for user ${userId} calendar ${googleCalendarId}:`,
        error
      );
    }
  }
};
