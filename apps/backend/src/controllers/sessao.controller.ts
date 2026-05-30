import { Request, Response } from 'express';
import { prisma } from '../config/prisma';

export const sessaoController = {
  async registerSessao(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const { materiaId, topicoId, tipo, tempoEstudadoSegundos } = req.body;

      // Cria a sessão de estudo
      const sessao = await prisma.sessaoEstudo.create({
        data: {
          userId,
          materiaId: materiaId || null,
          topicoId: topicoId || null,
          tipo: tipo || 'pomodoro',
          tempoEstudadoSegundos: tempoEstudadoSegundos || 0
        }
      });

      // Se houver uma revisão futura vinculada, devemos disparar um gatilho para concluí-la?
      // (Isso depende da lógica exata do Revisa+, mas por enquanto só registra)

      res.status(201).json(sessao);
    } catch (error) {
      res.status(500).json({ error: 'Erro ao registrar sessão de estudo' });
    }
  },

  async getHistoricoSessoes(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      // Podemos aceitar range de datas (timeMin, timeMax) na query
      const { start, end } = req.query;

      const whereClause: any = { userId };
      
      if (start || end) {
        whereClause.createdAt = {};
        if (start) whereClause.createdAt.gte = new Date(start as string);
        if (end) whereClause.createdAt.lte = new Date(end as string);
      }

      const sessoes = await prisma.sessaoEstudo.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        include: {
          materia: { select: { nome: true, cor: true } },
          topico: { select: { nome: true } }
        }
      });

      res.json(sessoes);
    } catch (error) {
      res.status(500).json({ error: 'Erro ao buscar histórico de sessões' });
    }
  }
};