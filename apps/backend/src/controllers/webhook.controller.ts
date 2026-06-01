import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { googleCalendarService } from '../services/googleCalendar.service';

export const googleWebhookController = {
  async handleCalendarWebhook(req: Request, res: Response) {
    try {
      const channelId = req.headers['x-goog-channel-id'] as string;
      const resourceState = req.headers['x-goog-resource-state'] as string;

      console.log(`[Webhook Calendar] Channel ${channelId}. State: ${resourceState}`);

      res.status(200).send('OK');

      if (resourceState === 'sync') return;
      if (!channelId) return;

      const cal = await prisma.userGoogleCalendar.findFirst({
        where: { channelId }
      });

      if (!cal) {
        const legacyUser = await prisma.user.findFirst({ where: { gcalChannelId: channelId } });
        if (legacyUser) {
          googleCalendarService.syncUserCalendar(legacyUser.id).catch(console.error);
        }
        return;
      }

      googleCalendarService
        .syncSingleCalendar(cal.userId, cal.googleCalendarId)
        .catch((err: Error) => {
          console.error(`[Webhook Calendar] Sync error for user ${cal.userId}:`, err);
        });
    } catch (error) {
      console.error('[Webhook Calendar] Erro:', error);
    }
  }
};
