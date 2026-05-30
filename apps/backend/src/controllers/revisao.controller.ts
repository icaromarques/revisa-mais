import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { addDays } from 'date-fns';

export const revisaoController = {
  // Gera uma revisão automaticamente após uma aula ou sessão
  async agendarRevisao(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const { materiaId, topicoId, nome, diasParaFrente } = req.body;

      // Valida propriedade
      const materia = await prisma.materia.findFirst({
        where: { id: materiaId, userId }
      });
      if (!materia) return res.status(404).json({ error: 'Matéria não encontrada' });

      const dataPrevista = addDays(new Date(), diasParaFrente || 1);

      const revisao = await prisma.revisao.create({
        data: {
          userId,
          materiaId,
          topicoId: topicoId || null,
          nome: nome || 'Revisão Automática',
          dataPrevista,
          status: 'pendente'
        }
      });

      res.status(201).json(revisao);
    } catch (error) {
      res.status(500).json({ error: 'Erro ao agendar revisão' });
    }
  },

  async getRevisoes(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const { status } = req.query; // pendente, concluida, atrasada

      const whereClause: any = { userId };
      if (status) whereClause.status = status;

      const revisoes = await prisma.revisao.findMany({
        where: whereClause,
        orderBy: { dataPrevista: 'asc' },
        include: {
          materia: { select: { nome: true, cor: true } },
          topico: { select: { nome: true } }
        }
      });

      res.json(revisoes);
    } catch (error) {
      res.status(500).json({ error: 'Erro ao listar revisões' });
    }
  },

  async updateStatus(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const { id } = req.params;
      const { status } = req.body;

      const revisao = await prisma.revisao.findFirst({
        where: { id, userId }
      });

      if (!revisao) return res.status(404).json({ error: 'Revisão não encontrada' });

      const updated = await prisma.revisao.update({
        where: { id },
        data: { status }
      });

      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: 'Erro ao atualizar revisão' });
    }
  },

  async deleteRevisao(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const { id } = req.params;

      const revisao = await prisma.revisao.findFirst({
        where: { id, userId }
      });

      if (!revisao) return res.status(404).json({ error: 'Revisão não encontrada' });

      await prisma.revisao.delete({ where: { id } });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Erro ao excluir revisão' });
    }
  }
};