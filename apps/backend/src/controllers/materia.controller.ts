import { Request, Response } from 'express';
import { prisma } from '../config/prisma';

export const materiaController = {
  // Criar Matéria
  async createMateria(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const { nome, cor } = req.body;

      if (!nome || !cor) {
        return res.status(400).json({ error: 'Nome e cor são obrigatórios' });
      }

      const materia = await prisma.materia.create({
        data: {
          userId,
          nome,
          cor
        }
      });

      res.status(201).json(materia);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao criar matéria' });
    }
  },

  // Buscar uma única Matéria pelo ID (Detalhe)
  async getMateriaById(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const { id } = req.params;

      const materia = await prisma.materia.findUnique({
        where: { id },
        include: {
          topicos: true,
          aulas: true,
          materiais: true,
          notas: true,
          _count: {
            select: { topicos: true, aulas: true, materiais: true, revisoes: true }
          }
        }
      });

      if (!materia || materia.userId !== userId) {
        return res.status(404).json({ error: 'Matéria não encontrada' });
      }

      res.json(materia);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao buscar matéria' });
    }
  },

  // Listar todas as Matérias do Usuário (com quantidade de tópicos e revisões)
  async getMaterias(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;

      const materias = await prisma.materia.findMany({
        where: { userId },
        include: {
          _count: {
            select: { topicos: true, revisoes: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      res.json(materias);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao buscar matérias' });
    }
  },

  // Deletar Matéria (A cascata do Prisma excluirá Tópicos, Revisões, Flashcards e Faltas ligados a ela)
  async deleteMateria(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const { id } = req.params;

      // Verifica se a matéria pertence ao usuário
      const materia = await prisma.materia.findUnique({
        where: { id }
      });

      if (!materia || materia.userId !== userId) {
        return res.status(404).json({ error: 'Matéria não encontrada' });
      }

      await prisma.materia.delete({
        where: { id }
      });

      res.json({ success: true, message: 'Matéria e todos os dados relacionados excluídos com sucesso' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao excluir matéria' });
    }
  }
};