import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { asString, bodyField, toSnakeCase } from '../utils/responseMapper';

export const cadernoController = {
  async list(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const items = await prisma.caderno.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { questoes: true } } }
      });
      res.json(items.map((i) => toSnakeCase(i)));
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao listar cadernos' });
    }
  },

  async create(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const body = req.body;
      const item = await prisma.caderno.create({
        data: {
          userId,
          nome: String(bodyField(body, 'nome') || 'Caderno'),
          descricao: bodyField<string>(body, 'descricao') || null
        }
      });
      res.status(201).json(toSnakeCase(item));
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao criar caderno' });
    }
  },

  async update(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const id = asString(req.params.id);
      const body = req.body;
      const existing = await prisma.caderno.findFirst({ where: { id, userId } });
      if (!existing) return res.status(404).json({ error: 'Caderno não encontrado' });

      const item = await prisma.caderno.update({
        where: { id },
        data: {
          nome: bodyField<string>(body, 'nome') ?? existing.nome,
          descricao: bodyField<string>(body, 'descricao') ?? existing.descricao
        }
      });
      res.json(toSnakeCase(item));
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao atualizar caderno' });
    }
  },

  async remove(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const id = asString(req.params.id);
      const existing = await prisma.caderno.findFirst({ where: { id, userId } });
      if (!existing) return res.status(404).json({ error: 'Caderno não encontrado' });
      await prisma.caderno.delete({ where: { id } });
      res.status(204).send();
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao excluir caderno' });
    }
  },

  async createQuestao(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const cadernoId = asString(req.params.id);
      const body = req.body;
      const caderno = await prisma.caderno.findFirst({ where: { id: cadernoId, userId } });
      if (!caderno) return res.status(404).json({ error: 'Caderno não encontrado' });

      const alternativas = Array.isArray(body.alternativas) ? body.alternativas : [];
      const questao = await prisma.questao.create({
        data: {
          cadernoId,
          enunciado: String(bodyField(body, 'enunciado') || ''),
          tipo: bodyField<string>(body, 'tipo') || 'multipla_escolha',
          dificuldade: bodyField<string>(body, 'dificuldade') || 'media',
          origem: bodyField<string>(body, 'origem') || 'manual',
          alternativas: {
            create: alternativas.map((alt: any) => ({
              texto: String(alt.texto || alt.text || ''),
              correta: Boolean(alt.correta ?? alt.correct)
            }))
          }
        },
        include: { alternativas: true }
      });

      await prisma.caderno.update({
        where: { id: cadernoId },
        data: { questoesCount: { increment: 1 } }
      });

      res.status(201).json(toSnakeCase(questao));
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao criar questão' });
    }
  },

  async updateQuestao(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const cadernoId = asString(req.params.id);
      const questaoId = asString(req.params.questaoId);
      const body = req.body;
      const caderno = await prisma.caderno.findFirst({ where: { id: cadernoId, userId } });
      if (!caderno) return res.status(404).json({ error: 'Caderno não encontrado' });

      const existing = await prisma.questao.findFirst({ where: { id: questaoId, cadernoId } });
      if (!existing) return res.status(404).json({ error: 'Questão não encontrada' });

      const questao = await prisma.questao.update({
        where: { id: questaoId },
        data: {
          enunciado: bodyField<string>(body, 'enunciado') ?? existing.enunciado,
          tipo: bodyField<string>(body, 'tipo') ?? existing.tipo,
          dificuldade: bodyField<string>(body, 'dificuldade') ?? existing.dificuldade
        },
        include: { alternativas: true }
      });
      res.json(toSnakeCase(questao));
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao atualizar questão' });
    }
  },

  async removeQuestao(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const cadernoId = asString(req.params.id);
      const questaoId = asString(req.params.questaoId);
      const caderno = await prisma.caderno.findFirst({ where: { id: cadernoId, userId } });
      if (!caderno) return res.status(404).json({ error: 'Caderno não encontrado' });

      await prisma.questao.deleteMany({ where: { id: questaoId, cadernoId } });
      await prisma.caderno.update({
        where: { id: cadernoId },
        data: { questoesCount: { decrement: 1 } }
      });
      res.status(204).send();
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao excluir questão' });
    }
  }
};

export const questaoController = {
  async createStandalone(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const body = req.body;
      const cadernoId = bodyField<string>(body, 'cadernoId', 'caderno_id');
      if (!cadernoId) return res.status(400).json({ error: 'caderno_id é obrigatório' });

      req.params.id = cadernoId;
      return cadernoController.createQuestao(req, res);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao criar questão' });
    }
  }
};
