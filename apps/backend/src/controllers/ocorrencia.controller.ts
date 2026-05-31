import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { asString, bodyField, formatDateOnly, parseDate, queryString, toSnakeCase } from '../utils/responseMapper';

function mapOcorrencia(item: any) {
  const mapped = toSnakeCase(item) as Record<string, unknown>;
  mapped.data = formatDateOnly(item.data);
  return mapped;
}

async function assertMateriaOwnership(materiaId: string, userId: string) {
  return prisma.materia.findFirst({ where: { id: materiaId, userId } });
}

export const ocorrenciaController = {
  async list(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const q = req.query as Record<string, unknown>;
      const materia_id = queryString(q, 'materia_id');
      const status = queryString(q, 'status');
      const data = queryString(q, 'data');
      const where: any = { userId };

      if (materia_id) where.materiaId = materia_id;
      if (status) where.status = status;
      if (data) {
        const d = parseDate(data);
        if (d) {
          const start = new Date(d);
          start.setHours(0, 0, 0, 0);
          const end = new Date(d);
          end.setHours(23, 59, 59, 999);
          where.data = { gte: start, lte: end };
        }
      }

      const items = await prisma.ocorrenciaGrade.findMany({
        where,
        orderBy: { data: 'desc' },
        include: { materia: { select: { nome: true, cor: true } } }
      });
      res.json(items.map(mapOcorrencia));
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao buscar ocorrências' });
    }
  },

  async create(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const body = req.body;
      const materiaId = bodyField<string>(body, 'materiaId', 'materia_id');
      if (!materiaId) return res.status(400).json({ error: 'materia_id é obrigatório' });

      const materia = await assertMateriaOwnership(materiaId, userId);
      if (!materia) return res.status(404).json({ error: 'Matéria não encontrada' });

      const dataValue = parseDate(bodyField(body, 'data'));
      if (!dataValue) return res.status(400).json({ error: 'data inválida' });

      const item = await prisma.ocorrenciaGrade.create({
        data: {
          userId,
          materiaId,
          gradeId: bodyField<string>(body, 'gradeId', 'grade_id') || null,
          data: dataValue,
          status: bodyField<string>(body, 'status') || 'pendente_confirmacao',
          aulaId: bodyField<string>(body, 'aulaId', 'aula_id') || null,
          quantidadeOcorrencias: bodyField<number>(body, 'quantidadeOcorrencias', 'quantidade_ocorrencias') || 1,
          origem: bodyField<string>(body, 'origem') || null,
          tipoFalta: bodyField<string>(body, 'tipoFalta', 'tipo_falta') || null,
          topicoId: bodyField<string>(body, 'topicoId', 'topico_id') || null,
          observacoes: bodyField<string>(body, 'observacoes') || null,
          statusReposicao: bodyField<string>(body, 'statusReposicao', 'status_reposicao') || 'pendente',
          reposicaoAulaId: bodyField<string>(body, 'reposicaoAulaId', 'reposicao_aula_id') || null,
          reposicaoSessaoId: bodyField<string>(body, 'reposicaoSessaoId', 'reposicao_sessao_id') || null,
          reposicaoObservacao: bodyField<string>(body, 'reposicaoObservacao', 'reposicao_observacao') || null
        }
      });
      res.status(201).json(mapOcorrencia(item));
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao criar ocorrência' });
    }
  },

  async update(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const id = asString(req.params.id);
      const body = req.body;

      const existing = await prisma.ocorrenciaGrade.findFirst({ where: { id, userId } });
      if (!existing) return res.status(404).json({ error: 'Ocorrência não encontrada' });

      const item = await prisma.ocorrenciaGrade.update({
        where: { id },
        data: {
          status: bodyField<string>(body, 'status') ?? existing.status,
          quantidadeOcorrencias: bodyField<number>(body, 'quantidadeOcorrencias', 'quantidade_ocorrencias') ?? existing.quantidadeOcorrencias,
          observacoes: bodyField<string>(body, 'observacoes') ?? existing.observacoes,
          statusReposicao: bodyField<string>(body, 'statusReposicao', 'status_reposicao') ?? existing.statusReposicao,
          reposicaoAulaId: bodyField<string>(body, 'reposicaoAulaId', 'reposicao_aula_id') ?? existing.reposicaoAulaId,
          reposicaoSessaoId: bodyField<string>(body, 'reposicaoSessaoId', 'reposicao_sessao_id') ?? existing.reposicaoSessaoId,
          reposicaoObservacao: bodyField<string>(body, 'reposicaoObservacao', 'reposicao_observacao') ?? existing.reposicaoObservacao,
          topicoId: bodyField<string>(body, 'topicoId', 'topico_id') ?? existing.topicoId,
          tipoFalta: bodyField<string>(body, 'tipoFalta', 'tipo_falta') ?? existing.tipoFalta,
          data: parseDate(bodyField(body, 'data')) || existing.data
        }
      });
      res.json(mapOcorrencia(item));
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao atualizar ocorrência' });
    }
  },

  async remove(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const id = asString(req.params.id);
      const existing = await prisma.ocorrenciaGrade.findFirst({ where: { id, userId } });
      if (!existing) return res.status(404).json({ error: 'Ocorrência não encontrada' });
      await prisma.ocorrenciaGrade.delete({ where: { id } });
      res.status(204).send();
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao excluir ocorrência' });
    }
  }
};
