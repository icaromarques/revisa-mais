import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { asString, queryString, toSnakeCase } from '../utils/responseMapper';
import { addDays } from 'date-fns';

export const revisaoController = {
  // Gera uma revisão automaticamente após uma aula ou sessão
  async agendarRevisao(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const { materiaId, materia_id, topicoId, topico_id, aulaId, aula_id, nome, diasParaFrente, dataPrevista: dp, data_prevista, status } = req.body;
      
      const finalMateriaId = materiaId || materia_id;
      let finalTopicoId = topicoId || topico_id || null;
      if (finalTopicoId === '') finalTopicoId = null;
      const finalAulaId = aulaId || aula_id || null;

      // Valida propriedade
      const materia = await prisma.materia.findFirst({
        where: { id: finalMateriaId, userId }
      });
      if (!materia) return res.status(404).json({ error: 'Matéria não encontrada' });

      const finalDataPrevista = dp || data_prevista ? new Date(dp || data_prevista) : addDays(new Date(), diasParaFrente || 1);

      const revisao = await prisma.revisao.create({
        data: {
          userId,
          materiaId: finalMateriaId,
          topicoId: finalTopicoId,
          aulaId: finalAulaId,
          nome: nome || 'Revisão Automática',
          dataPrevista: finalDataPrevista,
          status: status || 'pendente'
        }
      });

      res.status(201).json(toSnakeCase(revisao));
    } catch (error) {
      console.error('Erro em agendarRevisao:', error);
      res.status(500).json({ error: 'Erro ao agendar revisão' });
    }
  },

  async getRevisoes(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const q = req.query as Record<string, unknown>;
      const status = queryString(q, 'status');
      const materia_id = queryString(q, 'materia_id');
      const aula_id = queryString(q, 'aula_id');

      const whereClause: any = { userId };
      if (status) whereClause.status = status;
      if (materia_id) whereClause.materiaId = materia_id;
      if (aula_id) whereClause.aulaId = aula_id;

      const revisoes = await prisma.revisao.findMany({
        where: whereClause,
        orderBy: { dataPrevista: 'asc' },
        include: {
          materia: { select: { nome: true, cor: true } },
          topico: { select: { nome: true } }
        }
      });

      res.json(revisoes.map((r) => toSnakeCase(r)));
    } catch (error) {
      res.status(500).json({ error: 'Erro ao listar revisões' });
    }
  },

  async updateRevisao(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const id = asString(req.params.id);
      const body = req.body;

      const revisao = await prisma.revisao.findFirst({ where: { id, userId } });
      if (!revisao) return res.status(404).json({ error: 'Revisão não encontrada' });

      const updated = await prisma.revisao.update({
        where: { id },
        data: {
          nome: body.nome ?? revisao.nome,
          status: body.status ?? revisao.status,
          dataPrevista: body.data_prevista || body.dataPrevista
            ? new Date(body.data_prevista || body.dataPrevista)
            : revisao.dataPrevista,
          topicoId: body.topico_id || body.topicoId || revisao.topicoId,
          aulaId: body.aula_id || body.aulaId || revisao.aulaId
        }
      });
      res.json(toSnakeCase(updated));
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao atualizar revisão' });
    }
  },

  async updateStatus(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const id = asString(req.params.id);
      const { status } = req.body;

      const revisao = await prisma.revisao.findFirst({
        where: { id, userId }
      });

      if (!revisao) return res.status(404).json({ error: 'Revisão não encontrada' });

      const updated = await prisma.revisao.update({
        where: { id },
        data: { status }
      });

      res.json(toSnakeCase(updated));
    } catch (error) {
      res.status(500).json({ error: 'Erro ao atualizar revisão' });
    }
  },

  async deleteByOrigin(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const { originType, originId } = req.params;

      const where: any = { userId };
      if (originType === 'aula_id') where.aulaId = asString(originId);
      else if (originType === 'materia_id') where.materiaId = asString(originId);
      else if (originType === 'deck_id') {
        await prisma.deck.deleteMany({ where: { id: asString(originId), userId } });
        return res.json({ success: true });
      } else if (originType === 'session_id') {
        return res.json({ success: true });
      } else {
        return res.status(400).json({ error: 'Tipo de origem inválido' });
      }

      await prisma.revisao.deleteMany({ where });
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao excluir revisões por origem' });
    }
  },

  async deleteRevisao(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const id = asString(req.params.id);

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