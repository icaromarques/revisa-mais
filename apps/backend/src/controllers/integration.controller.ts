import { Request, Response } from 'express';
import { prisma } from '../config/prisma';

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

  async disconnectGoogle(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      await prisma.user.update({
        where: { id: userId },
        data: {
          gcalConnected: false,
          gcalEmail: null,
          googleRefreshToken: null,
          gcalTokenStatus: 'disconnected',
          gcalLastError: null
        }
      });
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao desconectar Google' });
    }
  }
};
