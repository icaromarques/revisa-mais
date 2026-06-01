import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { asString, bodyField, parseDate, queryString, toSnakeCase } from '../utils/responseMapper';
import { emitNotificationCreated } from '../ws/emit';

async function assertMateria(materiaId: string, userId: string) {
  return prisma.materia.findFirst({ where: { id: materiaId, userId } });
}

export const materialController = {
  async list(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const q = req.query as Record<string, unknown>;
      const materia_id = queryString(q, 'materia_id');
      const aula_id = queryString(q, 'aula_id');
      const where: any = { userId };
      if (materia_id) where.materiaId = materia_id;
      if (aula_id) where.aulaId = aula_id;

      const items = await prisma.materialEstudo.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: { materia: { select: { nome: true } }, aula: { select: { titulo: true } } }
      });
      res.json(items.map((i) => toSnakeCase(i)));
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao buscar materiais' });
    }
  },

  async create(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const body = req.body;
      const materiaId = bodyField<string>(body, 'materiaId', 'materia_id');
      if (!materiaId) return res.status(400).json({ error: 'materia_id é obrigatório' });
      const materia = await assertMateria(materiaId, userId);
      if (!materia) return res.status(404).json({ error: 'Matéria não encontrada' });

      const item = await prisma.materialEstudo.create({
        data: {
          userId,
          materiaId,
          aulaId: bodyField<string>(body, 'aulaId', 'aula_id') || null,
          topicoId: bodyField<string>(body, 'topicoId', 'topico_id') || null,
          titulo: String(bodyField(body, 'titulo') || 'Material'),
          tipo: bodyField<string>(body, 'tipo') || 'link',
          url: bodyField<string>(body, 'url') || null,
          conteudo: bodyField<string>(body, 'conteudo') || null,
          metadataJson: body.metadata || body.metadata_json || null
        }
      });
      res.status(201).json(toSnakeCase(item));
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao criar material' });
    }
  },

  async update(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const id = asString(req.params.id);
      const body = req.body;
      const existing = await prisma.materialEstudo.findFirst({ where: { id, userId } });
      if (!existing) return res.status(404).json({ error: 'Material não encontrado' });

      const item = await prisma.materialEstudo.update({
        where: { id },
        data: {
          titulo: bodyField<string>(body, 'titulo') ?? existing.titulo,
          tipo: bodyField<string>(body, 'tipo') ?? existing.tipo,
          url: bodyField<string>(body, 'url') ?? existing.url,
          conteudo: bodyField<string>(body, 'conteudo') ?? existing.conteudo,
          aulaId: bodyField<string>(body, 'aulaId', 'aula_id') ?? existing.aulaId,
          topicoId: bodyField<string>(body, 'topicoId', 'topico_id') ?? existing.topicoId,
          metadataJson: body.metadata || body.metadata_json || existing.metadataJson
        }
      });
      res.json(toSnakeCase(item));
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao atualizar material' });
    }
  },

  async remove(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const id = asString(req.params.id);
      const existing = await prisma.materialEstudo.findFirst({ where: { id, userId } });
      if (!existing) return res.status(404).json({ error: 'Material não encontrado' });
      await prisma.materialEstudo.delete({ where: { id } });
      res.status(204).send();
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao excluir material' });
    }
  }
};

export const aulaController = {
  async list(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const q = req.query as Record<string, unknown>;
      const materia_id = queryString(q, 'materia_id');
      const data = queryString(q, 'data');
      const where: any = { userId };
      if (materia_id) where.materiaId = materia_id;
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

      const items = await prisma.aula.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: { materia: { select: { nome: true, cor: true } }, topico: { select: { nome: true } } }
      });
      res.json(items.map((i) => toSnakeCase(i)));
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao buscar aulas' });
    }
  },

  async getById(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const id = asString(req.params.id);
      const item = await prisma.aula.findFirst({
        where: { id, userId },
        include: { materia: true, topico: true, materiais: true }
      });
      if (!item) return res.status(404).json({ error: 'Aula não encontrada' });
      res.json(toSnakeCase(item));
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao buscar aula' });
    }
  },

  async create(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const body = req.body;
      const materiaId = bodyField<string>(body, 'materiaId', 'materia_id');
      if (!materiaId) return res.status(400).json({ error: 'materia_id é obrigatório' });
      const materia = await assertMateria(materiaId, userId);
      if (!materia) return res.status(404).json({ error: 'Matéria não encontrada' });

      const item = await prisma.aula.create({
        data: {
          userId,
          materiaId,
          topicoId: bodyField<string>(body, 'topicoId', 'topico_id') || null,
          titulo: String(bodyField(body, 'titulo') || 'Aula'),
          status: bodyField<string>(body, 'status') || 'agendada',
          data: parseDate(bodyField(body, 'data')),
          professor: bodyField<string>(body, 'professor') || null,
          observacoes: bodyField<string>(body, 'observacoes') || null,
          reposicaoOcorrenciaId: bodyField<string>(body, 'reposicaoOcorrenciaId', 'reposicao_ocorrencia_id') || null,
          metadataJson: body.metadata || body.metadata_json || null
        }
      });
      res.status(201).json(toSnakeCase(item));
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao criar aula' });
    }
  },

  async update(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const id = asString(req.params.id);
      const body = req.body;
      const existing = await prisma.aula.findFirst({ where: { id, userId } });
      if (!existing) return res.status(404).json({ error: 'Aula não encontrada' });

      const item = await prisma.aula.update({
        where: { id },
        data: {
          titulo: bodyField<string>(body, 'titulo') ?? existing.titulo,
          status: bodyField<string>(body, 'status') ?? existing.status,
          data: parseDate(bodyField(body, 'data')) ?? existing.data,
          topicoId: bodyField<string>(body, 'topicoId', 'topico_id') ?? existing.topicoId,
          professor: bodyField<string>(body, 'professor') ?? existing.professor,
          observacoes: bodyField<string>(body, 'observacoes') ?? existing.observacoes,
          reposicaoOcorrenciaId: bodyField<string>(body, 'reposicaoOcorrenciaId', 'reposicao_ocorrencia_id') ?? existing.reposicaoOcorrenciaId,
          metadataJson: body.metadata || body.metadata_json || existing.metadataJson
        }
      });
      res.json(toSnakeCase(item));
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao atualizar aula' });
    }
  },

  async remove(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const id = asString(req.params.id);
      const existing = await prisma.aula.findFirst({ where: { id, userId } });
      if (!existing) return res.status(404).json({ error: 'Aula não encontrada' });
      await prisma.aula.delete({ where: { id } });
      res.status(204).send();
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao excluir aula' });
    }
  }
};

export const resumoController = {
  async list(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const q = req.query as Record<string, unknown>;
      const materia_id = queryString(q, 'materia_id');
      const where: any = { userId };
      if (materia_id) where.materiaId = materia_id;

      const items = await prisma.resumo.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: { materia: { select: { nome: true } }, topico: { select: { nome: true } } }
      });
      res.json(items.map((i) => toSnakeCase(i)));
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao buscar resumos' });
    }
  },

  async create(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const body = req.body;
      const item = await prisma.resumo.create({
        data: {
          userId,
          materiaId: bodyField<string>(body, 'materiaId', 'materia_id') || null,
          topicoId: bodyField<string>(body, 'topicoId', 'topico_id') || null,
          titulo: String(bodyField(body, 'titulo') || 'Resumo'),
          conteudo: String(bodyField(body, 'conteudo') || ''),
          origem: bodyField<string>(body, 'origem') || 'manual'
        }
      });
      res.status(201).json(toSnakeCase(item));
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao criar resumo' });
    }
  },

  async update(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const id = asString(req.params.id);
      const body = req.body;
      const existing = await prisma.resumo.findFirst({ where: { id, userId } });
      if (!existing) return res.status(404).json({ error: 'Resumo não encontrado' });

      const item = await prisma.resumo.update({
        where: { id },
        data: {
          titulo: bodyField<string>(body, 'titulo') ?? existing.titulo,
          conteudo: bodyField<string>(body, 'conteudo') ?? existing.conteudo,
          materiaId: bodyField<string>(body, 'materiaId', 'materia_id') ?? existing.materiaId,
          topicoId: bodyField<string>(body, 'topicoId', 'topico_id') ?? existing.topicoId
        }
      });
      res.json(toSnakeCase(item));
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao atualizar resumo' });
    }
  },

  async remove(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const id = asString(req.params.id);
      const existing = await prisma.resumo.findFirst({ where: { id, userId } });
      if (!existing) return res.status(404).json({ error: 'Resumo não encontrado' });
      await prisma.resumo.delete({ where: { id } });
      res.status(204).send();
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao excluir resumo' });
    }
  }
};

export const notaController = {
  async create(req: Request, res: Response) {
    try {
      const body = req.body;
      const materiaId = bodyField<string>(body, 'materiaId', 'materia_id');
      if (!materiaId) return res.status(400).json({ error: 'materia_id é obrigatório' });

      const item = await prisma.notaMateria.create({
        data: {
          materiaId,
          nome: String(bodyField(body, 'nome') || 'Avaliação'),
          notaMaxima: Number(bodyField(body, 'notaMaxima', 'nota_maxima') || 10),
          notaObtida: bodyField<number>(body, 'notaObtida', 'nota_obtida') ?? null
        }
      });
      res.status(201).json(toSnakeCase(item));
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao criar nota' });
    }
  },

  async update(req: Request, res: Response) {
    try {
      const id = asString(req.params.id);
      const body = req.body;
      const item = await prisma.notaMateria.update({
        where: { id },
        data: {
          nome: bodyField<string>(body, 'nome'),
          notaMaxima: bodyField<number>(body, 'notaMaxima', 'nota_maxima'),
          notaObtida: bodyField<number>(body, 'notaObtida', 'nota_obtida')
        }
      });
      res.json(toSnakeCase(item));
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao atualizar nota' });
    }
  },

  async remove(req: Request, res: Response) {
    try {
      const id = asString(req.params.id);
      await prisma.notaMateria.delete({ where: { id } });
      res.status(204).send();
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao excluir nota' });
    }
  }
};

export const notificacaoController = {
  async list(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const items = await prisma.notificacao.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' }
      });
      res.json(items.map((n) => toSnakeCase(n)));
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao buscar notificações' });
    }
  },

  async markRead(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const id = asString(req.params.id);
      const item = await prisma.notificacao.updateMany({
        where: { id, userId },
        data: { lida: true }
      });
      if (!item.count) return res.status(404).json({ error: 'Notificação não encontrada' });
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao marcar notificação' });
    }
  },

  async markAllRead(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      await prisma.notificacao.updateMany({ where: { userId }, data: { lida: true } });
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao marcar notificações' });
    }
  },

  async remove(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const id = asString(req.params.id);
      await prisma.notificacao.deleteMany({ where: { id, userId } });
      res.status(204).send();
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao excluir notificação' });
    }
  },

  async archive(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const id = asString(req.params.id);
      await prisma.notificacao.updateMany({
        where: { id, userId },
        data: { status: 'archived' }
      });
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao arquivar notificação' });
    }
  },

  async updateStatus(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const id = asString(req.params.id);
      const { status } = req.body;
      await prisma.notificacao.updateMany({
        where: { id, userId },
        data: { status: String(status) }
      });
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao atualizar status' });
    }
  },

  async syncFromModules(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const now = new Date();
      const overdue = await prisma.revisao.findMany({
        where: { userId, status: 'pendente', dataPrevista: { lt: now } },
        include: { materia: { select: { nome: true } } },
        take: 20
      });

      for (const rev of overdue) {
        const existing = await prisma.notificacao.findFirst({
          where: {
            userId,
            tipo: 'revisao_atrasada',
            metadataJson: { path: ['revisao_id'], equals: rev.id }
          }
        });
        if (!existing) {
          const created = await prisma.notificacao.create({
            data: {
              userId,
              tipo: 'revisao_atrasada',
              titulo: 'Revisão atrasada',
              mensagem: `${rev.nome} (${rev.materia?.nome || 'Matéria'}) está pendente.`,
              metadataJson: { revisao_id: rev.id }
            }
          });
          emitNotificationCreated(userId, {
            notificationId: created.id,
            action: 'created'
          });
        }
      }
      res.json({ success: true, synced: overdue.length });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao sincronizar notificações' });
    }
  },

  async removeOld(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 30);
      await prisma.notificacao.deleteMany({
        where: {
          userId,
          createdAt: { lt: cutoff },
          OR: [{ lida: true }, { status: 'archived' }]
        }
      });
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao remover notificações antigas' });
    }
  }
};
