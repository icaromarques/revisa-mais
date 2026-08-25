import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { mapGrade } from '../mappers/grade.mapper';
import { buildMateriaData } from '../mappers/materia.mapper';
import { faltasService } from '../services/faltas.service';
import {
  MateriaGradeValidationError,
  materiaGradeService,
  parseGradeSlotsFromBody,
  parseMateriaBodyFromRequest
} from '../services/materiaGrade.service';
import { asString, bodyField, parseDate, toSnakeCase } from '../utils/responseMapper';

export const materiaController = {
  async createMateria(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const data = buildMateriaData(userId, req.body);
      if (!data.nome || !data.cor) {
        return res.status(400).json({ error: 'Nome e cor são obrigatórios' });
      }

      const materia = await prisma.materia.create({ data });
      res.status(201).json(materia);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao criar matéria' });
    }
  },

  async createMateriaWithGrade(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const materiaBody = parseMateriaBodyFromRequest(req.body as Record<string, unknown>);
      const slots = parseGradeSlotsFromBody(req.body as Record<string, unknown>);
      const result = await materiaGradeService.createMateriaWithGrade(userId, materiaBody, slots);

      res.status(201).json({
        materia: result.materia,
        grade: result.grade.map(mapGrade)
      });
    } catch (error) {
      if (error instanceof MateriaGradeValidationError) {
        return res.status(error.statusCode).json({ error: error.message });
      }
      console.error(error);
      res.status(500).json({ error: 'Erro ao criar matéria com grade' });
    }
  },

  // Buscar uma única Matéria pelo ID (Detalhe)
  async getMateriaById(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const id = asString(req.params.id);

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

  async updateMateria(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const id = asString(req.params.id);
      const materia = await prisma.materia.findFirst({ where: { id, userId } });
      if (!materia) return res.status(404).json({ error: 'Matéria não encontrada' });

      const updated = await prisma.materia.update({
        where: { id },
        data: buildMateriaData(userId, { ...materia, ...req.body })
      });
      res.json(updated);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao atualizar matéria' });
    }
  },

  async patchMateria(req: Request, res: Response) {
    return materiaController.updateMateria(req, res);
  },

  async getFaltasResumo(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const id = asString(req.params.id);

      const resumo = await faltasService.getFaltasResumoForMateria(userId, id);
      if (!resumo) {
        return res.status(404).json({ error: 'Matéria não encontrada' });
      }

      res.json(toSnakeCase(resumo));
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao calcular resumo de faltas' });
    }
  },

  async getFaltasResumos(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const resumos = await faltasService.getFaltasResumosForUser(userId);

      res.json(
        resumos.map(({ materiaId, ...resumo }) => ({
          materia_id: materiaId,
          ...(toSnakeCase(resumo) as Record<string, unknown>)
        }))
      );
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao calcular resumos de faltas' });
    }
  },

  // Deletar Matéria (A cascata do Prisma excluirá Tópicos, Revisões, Flashcards e Faltas ligados a ela)
  async getAulasByMateria(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const id = asString(req.params.id);
      const materia = await prisma.materia.findFirst({ where: { id, userId } });
      if (!materia) return res.status(404).json({ error: 'Matéria não encontrada' });

      const aulas = await prisma.aula.findMany({
        where: { materiaId: id, userId },
        orderBy: { createdAt: 'desc' }
      });
      res.json(aulas);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao buscar aulas da matéria' });
    }
  },

  async deleteMateria(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const id = asString(req.params.id);

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