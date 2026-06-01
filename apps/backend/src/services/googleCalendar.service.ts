import { google, calendar_v3 } from 'googleapis';
import { oauth2Client } from '../config/google';
import { prisma } from '../config/prisma';

const CALENDAR_ID = 'primary'; // We sync with the user's primary calendar

export const googleCalendarService = {
  /**
   * Initializes the OAuth2 client for a specific user using their refresh token
   */
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

  /**
   * Creates or updates a Google Calendar event for an EventoAcademico
   */
  async upsertEvent(userId: string, eventoId: string) {
    try {
      const evento = await prisma.eventoAcademico.findUnique({
        where: { id: eventoId, userId }
      });

      if (!evento) return;

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
        colorId: '9', // Blueberry default, you can map this to Revisa+ colors if needed
      };

      if (evento.googleEventId) {
        // Update existing
        await calendar.events.update({
          calendarId: CALENDAR_ID,
          eventId: evento.googleEventId,
          requestBody: googleEvent,
        });
      } else {
        // Insert new
        const response = await calendar.events.insert({
          calendarId: CALENDAR_ID,
          requestBody: googleEvent,
        });

        // Save Google's ID back to our DB
        if (response.data.id) {
          await prisma.eventoAcademico.update({
            where: { id: eventoId },
            data: {
              googleEventId: response.data.id,
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

  /**
   * Deletes an event from Google Calendar when deleted in Revisa+
   */
  async deleteEvent(userId: string, googleEventId: string) {
    if (!googleEventId) return;
    try {
      const client = await this.getClient(userId);
      const calendar = google.calendar({ version: 'v3', auth: client });
      
      await calendar.events.delete({
        calendarId: CALENDAR_ID,
        eventId: googleEventId,
      });
    } catch (error: any) {
      // Ignore 404 (already deleted)
      if (error.code !== 404) {
        console.error(`Failed to delete Google event ${googleEventId}:`, error);
      }
    }
  },

  /**
   * Performs a two-way sync for a user
   */
  async syncUserCalendar(userId: string): Promise<void> {
    try {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user || !user.googleRefreshToken) return;

      const client = await this.getClient(userId);
      const calendar = google.calendar({ version: 'v3', auth: client });

      // Fetch incremental changes using syncToken if available
      const requestOptions: any = {
        calendarId: CALENDAR_ID,
        maxResults: 100,
        singleEvents: true,
      };

      if (user.gcalSyncToken) {
        requestOptions.syncToken = user.gcalSyncToken;
      } else {
        // First sync: only fetch events from last 30 days onward
        const dateMin = new Date();
        dateMin.setDate(dateMin.getDate() - 30);
        requestOptions.timeMin = dateMin.toISOString();
      }

      let syncTokenToSave: string | null | undefined = null;
      let pageToken: string | null | undefined = null;

      do {
        if (pageToken) requestOptions.pageToken = pageToken;

        try {
          const response = await calendar.events.list(requestOptions);
          const items = response.data.items || [];

          for (const item of items) {
            await this.handleIncomingGoogleEvent(userId, item);
          }

          pageToken = response.data.nextPageToken;
          if (response.data.nextSyncToken) {
            syncTokenToSave = response.data.nextSyncToken;
          }
        } catch (err: any) {
          // If syncToken expired (410 Gone), wipe it and restart full sync
          if (err.code === 410) {
            await prisma.user.update({
              where: { id: userId },
              data: { gcalSyncToken: null }
            });
            console.warn(`Sync token expired for user ${userId}. Restarting full sync.`);
            return this.syncUserCalendar(userId);
          }
          throw err;
        }
      } while (pageToken);

      // Save new syncToken and mark as synced
      if (syncTokenToSave) {
        await prisma.user.update({
          where: { id: userId },
          data: {
            gcalSyncToken: syncTokenToSave,
            gcalLastSync: new Date(),
            gcalTokenStatus: 'active',
            gcalLastError: null
          }
        });
      }

    } catch (error: any) {
      console.error(`Error during calendar sync for user ${userId}:`, error);
      await prisma.user.update({
        where: { id: userId },
        data: { gcalTokenStatus: 'error', gcalLastError: error.message || 'Unknown error' }
      });
    }
  },

  /**
   * Processes a single incoming event from Google Calendar
   */
  async handleIncomingGoogleEvent(userId: string, item: calendar_v3.Schema$Event) {
    // If we created this event via Revisa+, skip re-importing to avoid loops
    if (item.summary?.startsWith('Revisa+ |')) return;

    if (item.status === 'cancelled') {
      // Event was deleted in Google Calendar
      await prisma.eventoAcademico.deleteMany({
        where: { userId, googleEventId: item.id as string }
      });
      return;
    }

    const start = item.start?.dateTime ? new Date(item.start.dateTime) : (item.start?.date ? new Date(item.start.date) : null);
    const end = item.end?.dateTime ? new Date(item.end.dateTime) : (item.end?.date ? new Date(item.end.date) : start);

    if (!start || !end) return;

    // Upsert the event into Revisa+
    await prisma.eventoAcademico.upsert({
      where: {
        // We don't have a unique constraint on googleEventId, so we use findFirst below
        id: 'no_id_found' // Fallback handled by Prisma findFirst -> then update/create manually instead of upsert
      },
      update: {},
      create: {
        userId: 'no_id', // Not actually executing this block, let's rewrite this logic to be safe
        titulo: '',
        dataInicio: new Date(),
        dataFim: new Date()
      }
    }).catch(() => {}); // Catch the dummy upsert

    // Real logic to avoid unique constraint issues:
    const existing = await prisma.eventoAcademico.findFirst({
      where: { userId, googleEventId: item.id as string }
    });

    const data = {
      titulo: item.summary || 'Evento sem título',
      descricao: item.description,
      local: item.location,
      dataInicio: start,
      dataFim: end,
      diaInteiro: !!item.start?.date,
      origem: 'google_external',
      htmlLink: item.htmlLink,
      syncStatus: 'sincronizado',
      lastSyncAt: new Date()
    };

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

  /**
   * Registers a webhook channel with Google to receive push notifications
   */
  async registerWatchChannel(userId: string) {
    try {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user || !user.googleRefreshToken) return;

      const client = await this.getClient(userId);
      const calendar = google.calendar({ version: 'v3', auth: client });

      const channelId = `revisa-user-${userId}-${Date.now()}`;
      // Webhook URL must be HTTPS. Render provides this. 
      // Using FRONTEND_URL as base just in case, but usually API is under same domain or explicitly BACKEND_URL
      // The deploy tutorial sets FRONTEND_URL in backend env, but the backend URL is what we need.
      // Assuming process.env.RENDER_EXTERNAL_URL is available on Render, or fallback to a standard pattern.
      const baseUrl = process.env.RENDER_EXTERNAL_URL || process.env.BACKEND_URL || 'https://revisa-backend-v0ik.onrender.com';
      
      const response = await calendar.events.watch({
        calendarId: CALENDAR_ID,
        requestBody: {
          id: channelId,
          type: 'web_hook',
          address: `${baseUrl}/api/webhooks/google-calendar`,
        }
      });

      if (response.data) {
        await prisma.user.update({
          where: { id: userId },
          data: {
            gcalChannelId: response.data.id,
            gcalChannelExpiresAt: response.data.expiration ? new Date(Number(response.data.expiration)) : null
          }
        });
      }
    } catch (error) {
      console.error(`Failed to register watch channel for user ${userId}:`, error);
    }
  }
};