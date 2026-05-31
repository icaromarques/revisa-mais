import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { asString, queryString } from '../utils/responseMapper';

export const topicoController = {
  async getTopicos(req: Request, res: Response) {
    try {
      const materia_id = queryString(req.query as Record<string, unknown>, 'materia_id');
      const userId = (req as any).user.id;

      let whereClause: any = { materia: { userId } };
      
      if (materia_id) {
        whereClause.materiaId = materia_id;
      }

      const topicos = await prisma.topico.findMany({
        where: whereClause,
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

  async getTopicosByMateria(req: Request, res: Response) {
    try {
      const materiaId = asString(req.params.materiaId);
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
      const materiaId = asString(req.params.materiaId);
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

  async createTopicoDirect(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const { nome, materia_id, materiaId } = req.body;
      const finalMateriaId = materiaId || materia_id;
      if (!finalMateriaId || !nome) {
        return res.status(400).json({ error: 'nome e materia_id são obrigatórios' });
      }

      const materia = await prisma.materia.findFirst({
        where: { id: finalMateriaId, userId }
      });
      if (!materia) return res.status(404).json({ error: 'Matéria não encontrada' });

      const topico = await prisma.topico.create({
        data: { materiaId: finalMateriaId, nome, statusDominio: 'iniciante' }
      });
      res.status(201).json(topico);
    } catch (error) {
      res.status(500).json({ error: 'Erro ao criar tópico' });
    }
  },

  async updateTopico(req: Request, res: Response) {
    try {
      const id = asString(req.params.id);
      const { nome, status_dominio, statusDominio } = req.body;

      const topico = await prisma.topico.findUnique({
        where: { id },
        include: { materia: true }
      });
      if (!topico || topico.materia.userId !== (req as any).user.id) {
        return res.status(404).json({ error: 'Tópico não encontrado' });
      }

      const updated = await prisma.topico.update({
        where: { id },
        data: {
          nome: nome ?? topico.nome,
          statusDominio: statusDominio || status_dominio || topico.statusDominio
        }
      });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: 'Erro ao atualizar tópico' });
    }
  },

  async deleteTopico(req: Request, res: Response) {
    try {
      const id = asString(req.params.id);
      
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
      const id = asString(req.params.id);
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
