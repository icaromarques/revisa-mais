import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { oauth2Client } from '../config/google';
import { google } from 'googleapis';

export const googleWebhookController = {
  // Rota que o Google chamará quando houver atualização na agenda do usuário
  async handleCalendarWebhook(req: Request, res: Response) {
    try {
      // O Google envia headers específicos, incluindo o ID do canal que criamos
      const channelId = req.headers['x-goog-channel-id'] as string;
      const resourceId = req.headers['x-goog-resource-id'] as string;
      const resourceState = req.headers['x-goog-resource-state'] as string; // 'sync' ou 'exists'

      console.log(`[Webhook Calendar] Recebido push para o canal ${channelId}. Estado: ${resourceState}`);

      // Responde ao Google rapidamente (Timeout de 3s obrigatório pela API deles)
      res.status(200).send('OK');

      // Se for apenas o "sync" inicial de quando registramos o webhook, ignorar.
      if (resourceState === 'sync') return;

      // 1. Procurar no nosso banco de dados a qual usuário esse webhook pertence
      // (Para fazer isso, ao registrar o webhook, devemos salvar o channelId ligado ao user.id)
      // Aqui usamos um mock para a lógica de encontrar o usuário
      // const user = await prisma.user.findFirst({ where: { gcalChannelId: channelId } });
      
      // Se fosse um sistema real rodando agora, pegaríamos o googleRefreshToken do usuário
      // faríamos oauth2Client.setCredentials({ refresh_token: user.googleRefreshToken })
      // chamaríamos a API do Google Calendar solicitando apenas o que mudou (usando syncToken)
      // e atualizaríamos a tabela eventosAcademicos no PostgreSQL via Socket.io ou Server-Sent Events

      console.log('[Webhook Calendar] Sincronização offline em andamento...');

    } catch (error) {
      console.error('[Webhook Calendar] Erro:', error);
      // O Google já recebeu 200, então apenas logamos o erro do background worker
    }
  }
};