import { Request, Response } from 'express';
import { prisma } from '../config/prisma';

export const topicoController = {
  async getTopicosByMateria(req: Request, res: Response) {
    try {
      const { materiaId } = req.params;
      // Valida se a matéria é do usuário
      const materia = await prisma.materia.findFirst({
        where: { id: materiaId, userId: (req as any).user.id }
      });
      if (!materia) return res.status(404).json({ error: 'Matéria não encontrada' });

      const topicos = await prisma.topico.findMany({
        where: { materiaId },
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { revisoes: true, resumos: true } }
        }
      });
      res.json(topicos);
    } catch (error) {
      res.status(500).json({ error: 'Erro ao buscar tópicos' });
    }
  },

  async createTopico(req: Request, res: Response) {
    try {
      const { materiaId } = req.params;
      const { nome } = req.body;

      // Validação de propriedade
      const materia = await prisma.materia.findFirst({
        where: { id: materiaId, userId: (req as any).user.id }
      });
      if (!materia) return res.status(404).json({ error: 'Matéria não encontrada' });

      const topico = await prisma.topico.create({
        data: {
          materiaId,
          nome,
          statusDominio: 'iniciante'
        }
      });
      res.status(201).json(topico);
    } catch (error) {
      res.status(500).json({ error: 'Erro ao criar tópico' });
    }
  },

  async deleteTopico(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      const topico = await prisma.topico.findUnique({
        where: { id },
        include: { materia: true }
      });

      if (!topico || topico.materia.userId !== (req as any).user.id) {
         return res.status(404).json({ error: 'Tópico não encontrado' });
      }

      await prisma.topico.delete({ where: { id } });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Erro ao deletar tópico' });
    }
  },

  async updateDominio(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { statusDominio } = req.body;

      const topico = await prisma.topico.findUnique({
        where: { id },
        include: { materia: true }
      });

      if (!topico || topico.materia.userId !== (req as any).user.id) {
         return res.status(404).json({ error: 'Tópico não encontrado' });
      }

      const updated = await prisma.topico.update({
        where: { id },
        data: { statusDominio }
      });

      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: 'Erro ao atualizar domínio' });
    }
  }
};