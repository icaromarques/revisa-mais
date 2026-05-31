import { Request, Response } from 'express';
import { prisma } from '../config/prisma';

export const sessaoController = {
  async registerSessao(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const { materiaId, materia_id, topicoId, topico_id, tipo, tempoEstudadoSegundos, tempo_estudado_segundos, titulo, origem_sessao, dificuldade, professor, total_questoes, acertos, notas } = req.body;

      const finalMateriaId = materiaId || materia_id || null;
      let finalTopicoId = topicoId || topico_id || null;
      if (finalTopicoId === '') finalTopicoId = null;

      // Cria a sessão de estudo
      const sessao = await prisma.sessaoEstudo.create({
        data: {
          userId,
          materiaId: finalMateriaId,
          topicoId: finalTopicoId,
          tipo: tipo || 'pomodoro',
          origemSessao: origem_sessao,
          titulo,
          tempoEstudadoSegundos: tempoEstudadoSegundos || tempo_estudado_segundos || 0,
          dificuldade,
          professor,
          totalQuestoes: total_questoes,
          acertos,
          notas
        }
      });

      // Se houver uma revisão futura vinculada, devemos disparar um gatilho para concluí-la?
      // (Isso depende da lógica exata do Revisa+, mas por enquanto só registra)

      res.status(201).json(sessao);
    } catch (error) {
      console.error('Erro em registerSessao:', error);
      res.status(500).json({ error: 'Erro ao registrar sessão de estudo' });
    }
  },

  async getSessoes(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const { start, end, materia_id } = req.query;

      const whereClause: any = { userId };
      
      if (start || end) {
        whereClause.createdAt = {};
        if (start) whereClause.createdAt.gte = new Date(start as string);
        if (end) whereClause.createdAt.lte = new Date(end as string);
      }
      
      if (materia_id) {
        whereClause.materiaId = materia_id;
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
      console.error(error);
      res.status(500).json({ error: 'Erro ao buscar sessões' });
    }
  },

  async getSessaoById(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const { id } = req.params;
      
      const sessao = await prisma.sessaoEstudo.findUnique({
        where: { id },
        include: {
          materia: { select: { id: true, nome: true } },
          topico: { select: { id: true, nome: true } }
        }
      });

      if (!sessao || sessao.userId !== userId) {
        return res.status(404).json({ error: 'Sessão não encontrada' });
      }

      res.json(sessao);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao buscar sessão' });
    }
  },

  async deleteSessao(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const { id } = req.params;

      const sessao = await prisma.sessaoEstudo.findUnique({ where: { id } });
      if (!sessao || sessao.userId !== userId) {
        return res.status(404).json({ error: 'Sessão não encontrada' });
      }

      await prisma.sessaoEstudo.delete({ where: { id } });
      res.status(204).send();
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao deletar sessão' });
    }
  },

  async updateSessao(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const { id } = req.params;
      const { materia_id, topico_id, titulo, tipo, tempo_estudado_segundos, dificuldade, professor, total_questoes, acertos, notas } = req.body;

      const sessao = await prisma.sessaoEstudo.findUnique({ where: { id } });
      if (!sessao || sessao.userId !== userId) {
        return res.status(404).json({ error: 'Sessão não encontrada' });
      }

      const updatedSessao = await prisma.sessaoEstudo.update({
        where: { id },
        data: {
          materiaId: materia_id,
          topicoId: topico_id === '' ? null : topico_id,
          titulo,
          tipo,
          tempoEstudadoSegundos: tempo_estudado_segundos,
          dificuldade,
          professor,
          totalQuestoes: total_questoes,
          acertos,
          notas
        }
      });

      res.json(updatedSessao);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao atualizar sessão' });
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