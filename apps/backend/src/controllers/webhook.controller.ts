import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { googleCalendarService } from '../services/googleCalendar.service';

export const googleWebhookController = {
  // Rota que o Google chamará quando houver atualização na agenda do usuário
  async handleCalendarWebhook(req: Request, res: Response) {
    try {
      // O Google envia headers específicos, incluindo o ID do canal que criamos
      const channelId = req.headers['x-goog-channel-id'] as string;
      const resourceState = req.headers['x-goog-resource-state'] as string; // 'sync' ou 'exists'

      console.log(`[Webhook Calendar] Recebido push para o canal ${channelId}. Estado: ${resourceState}`);

      // Responde ao Google rapidamente (Timeout de 3s obrigatório pela API deles)
      res.status(200).send('OK');

      // Se for apenas o "sync" inicial de quando registramos o webhook, ignorar.
      if (resourceState === 'sync') return;

      if (!channelId) return;

      // 1. Procurar no nosso banco de dados a qual usuário esse webhook pertence
      const user = await prisma.user.findFirst({ where: { gcalChannelId: channelId } });
      
      if (!user) {
        console.log(`[Webhook Calendar] Canal ${channelId} não encontrado em nenhum usuário.`);
        return;
      }

      console.log(`[Webhook Calendar] Iniciando sincronização offline para usuário ${user.id}...`);
      
      // Roda em background
      googleCalendarService.syncUserCalendar(user.id).catch(err => {
        console.error(`[Webhook Calendar] Erro no background job para user ${user.id}:`, err);
      });

    } catch (error) {
      console.error('[Webhook Calendar] Erro:', error);
    }
  }
};