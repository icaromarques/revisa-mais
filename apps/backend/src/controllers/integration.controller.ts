import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { googleCalendarService } from '../services/googleCalendar.service';
import { toSnakeCase } from '../utils/responseMapper';

export const integrationController = {
  async getGoogleStatus(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

      res.json({
        hasIntegration: user.gcalConnected,
        email: user.gcalEmail,
        status: user.gcalTokenStatus,
        lastSync: user.gcalLastSync?.toISOString?.() || null
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao verificar integração Google' });
    }
  },

  async listGoogleCalendars(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user?.gcalConnected) {
        return res.json([]);
      }

      let calendars = await prisma.userGoogleCalendar.findMany({
        where: { userId },
        orderBy: [{ primary: 'desc' }, { summary: 'asc' }]
      });

      if (calendars.length === 0) {
        await googleCalendarService.refreshCalendarList(userId);
        calendars = await prisma.userGoogleCalendar.findMany({
          where: { userId },
          orderBy: [{ primary: 'desc' }, { summary: 'asc' }]
        });
      }

      res.json(calendars.map((c) => toSnakeCase(c)));
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao listar agendas do Google' });
    }
  },

  async refreshGoogleCalendars(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      await googleCalendarService.refreshCalendarList(userId);

      const calendars = await prisma.userGoogleCalendar.findMany({
        where: { userId },
        orderBy: [{ primary: 'desc' }, { summary: 'asc' }]
      });

      res.json(calendars.map((c) => toSnakeCase(c)));
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao atualizar lista de agendas' });
    }
  },

  async updateGoogleCalendarSelection(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const { google_calendar_id, selected } = req.body;

      if (!google_calendar_id || typeof selected !== 'boolean') {
        return res.status(400).json({ error: 'google_calendar_id e selected são obrigatórios' });
      }

      const updated = await prisma.userGoogleCalendar.updateMany({
        where: { userId, googleCalendarId: google_calendar_id },
        data: { selected }
      });

      if (updated.count === 0) {
        return res.status(404).json({ error: 'Agenda não encontrada' });
      }

      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao atualizar agenda' });
    }
  },

  async forceSyncGoogle(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;

      res.status(202).json({
        success: true,
        message: 'Sincronização em background iniciada.'
      });

      googleCalendarService.syncUserCalendar(userId).catch(console.error);
    } catch (error) {
      console.error('Force sync error:', error);
    }
  },

  async disconnectGoogle(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;

      await prisma.userGoogleCalendar.deleteMany({ where: { userId } });

      await prisma.user.update({
        where: { id: userId },
        data: {
          gcalConnected: false,
          gcalEmail: null,
          googleRefreshToken: null,
          gcalTokenStatus: 'disconnected',
          gcalLastError: null,
          gcalSyncToken: null,
          gcalChannelId: null,
          gcalChannelExpiresAt: null
        }
      });
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao desconectar Google' });
    }
  }
};
