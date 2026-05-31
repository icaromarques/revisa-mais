import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { bodyField, parseDate, toSnakeCase, asString, queryString } from '../utils/responseMapper';

function mapGrade(item: any) {
  const mapped = toSnakeCase(item) as Record<string, unknown>;
  if (item.dataEspecifica) mapped.data_especifica = item.dataEspecifica.toISOString().split('T')[0];
  if (item.periodoInicio) mapped.periodo_inicio = item.periodoInicio.toISOString().split('T')[0];
  if (item.periodoFim) mapped.periodo_fim = item.periodoFim.toISOString().split('T')[0];
  if (item.dataInicioVigencia) mapped.data_inicio_vigencia = item.dataInicioVigencia.toISOString();
  if (item.dataFimVigencia) mapped.data_fim_vigencia = item.dataFimVigencia.toISOString();
  return mapped;
}

function mapBloqueio(item: any) {
  const mapped = toSnakeCase(item) as Record<string, unknown>;
  if (item.dataEspecifica) mapped.data_especifica = item.dataEspecifica.toISOString().split('T')[0];
  if (item.dataInicioVigencia) mapped.data_inicio_vigencia = item.dataInicioVigencia.toISOString();
  if (item.dataFimVigencia) mapped.data_fim_vigencia = item.dataFimVigencia.toISOString();
  return mapped;
}

function buildGradeData(userId: string, body: Record<string, unknown>) {
  const dias = bodyField<number[]>(body, 'diasSemana', 'dias_semana') || [1];
  return {
    userId,
    materiaId: bodyField<string>(body, 'materiaId', 'materia_id') || null,
    titulo: String(bodyField(body, 'titulo') || 'Horário'),
    professor: bodyField<string>(body, 'professor') || null,
    local: bodyField<string>(body, 'local') || null,
    diasSemana: dias,
    horaInicio: String(bodyField(body, 'horaInicio', 'hora_inicio') || '08:00'),
    horaFim: String(bodyField(body, 'horaFim', 'hora_fim') || '10:00'),
    recorrente: bodyField<boolean>(body, 'recorrente') ?? true,
    dataEspecifica: parseDate(bodyField(body, 'dataEspecifica', 'data_especifica')),
    dataInicioVigencia: parseDate(bodyField(body, 'dataInicioVigencia', 'data_inicio_vigencia')),
    dataFimVigencia: parseDate(bodyField(body, 'dataFimVigencia', 'data_fim_vigencia')),
    periodoInicio: parseDate(bodyField(body, 'periodoInicio', 'periodo_inicio')),
    periodoFim: parseDate(bodyField(body, 'periodoFim', 'periodo_fim')),
    tipoPeriodo: bodyField<string>(body, 'tipoPeriodo', 'tipo_periodo') || null,
    numeroPeriodo: bodyField<number>(body, 'numeroPeriodo', 'numero_periodo') ?? null,
    limiteFaltasPercentual: bodyField<number>(body, 'limiteFaltasPercentual', 'limite_faltas_percentual') ?? null,
    observacoes: bodyField<string>(body, 'observacoes') || null,
    cor: bodyField<string>(body, 'cor') || null,
    ativo: bodyField<boolean>(body, 'ativo') ?? true
  };
}

function buildBloqueioData(userId: string, body: Record<string, unknown>) {
  const dias = bodyField<number[]>(body, 'diasSemana', 'dias_semana') || [];
  return {
    userId,
    titulo: String(bodyField(body, 'titulo') || 'Bloqueio'),
    tipo: bodyField<string>(body, 'tipo') || 'bloqueio',
    categoria: bodyField<string>(body, 'categoria') || 'pessoal',
    horaInicio: String(bodyField(body, 'horaInicio', 'hora_inicio') || '08:00'),
    horaFim: String(bodyField(body, 'horaFim', 'hora_fim') || '10:00'),
    recorrente: bodyField<boolean>(body, 'recorrente') ?? true,
    diasSemana: dias,
    dataEspecifica: parseDate(bodyField(body, 'dataEspecifica', 'data_especifica')),
    dataInicioVigencia: parseDate(bodyField(body, 'dataInicioVigencia', 'data_inicio_vigencia')),
    dataFimVigencia: parseDate(bodyField(body, 'dataFimVigencia', 'data_fim_vigencia')),
    observacoes: bodyField<string>(body, 'observacoes') || null,
    cor: bodyField<string>(body, 'cor') || null,
    ativo: bodyField<boolean>(body, 'ativo') ?? true
  };
}

export const disponibilidadeController = {
  async listGrade(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const { materia_id } = req.query;
      const where: any = { userId };
      if (materia_id) where.materiaId = queryString(req.query as Record<string, unknown>, 'materia_id');

      const items = await prisma.gradeFaculdade.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: { materia: { select: { nome: true, cor: true } } }
      });
      res.json(items.map(mapGrade));
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao buscar grade' });
    }
  },

  async createGrade(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const item = await prisma.gradeFaculdade.create({
        data: buildGradeData(userId, req.body)
      });
      res.status(201).json(mapGrade(item));
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao criar horário' });
    }
  },

  async updateGrade(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const id = asString(req.params.id);
      const existing = await prisma.gradeFaculdade.findFirst({ where: { id, userId } });
      if (!existing) return res.status(404).json({ error: 'Horário não encontrado' });

      const item = await prisma.gradeFaculdade.update({
        where: { id },
        data: buildGradeData(userId, { ...existing, ...req.body })
      });
      res.json(mapGrade(item));
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao atualizar horário' });
    }
  },

  async deleteGrade(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const id = asString(req.params.id);
      const existing = await prisma.gradeFaculdade.findFirst({ where: { id, userId } });
      if (!existing) return res.status(404).json({ error: 'Horário não encontrado' });
      await prisma.gradeFaculdade.delete({ where: { id } });
      res.status(204).send();
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao excluir horário' });
    }
  },

  async listBloqueios(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const items = await prisma.bloqueioAgenda.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' }
      });
      res.json(items.map(mapBloqueio));
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao buscar bloqueios' });
    }
  },

  async createBloqueio(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const item = await prisma.bloqueioAgenda.create({
        data: buildBloqueioData(userId, req.body)
      });
      res.status(201).json(mapBloqueio(item));
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao criar bloqueio' });
    }
  },

  async updateBloqueio(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const id = asString(req.params.id);
      const existing = await prisma.bloqueioAgenda.findFirst({ where: { id, userId } });
      if (!existing) return res.status(404).json({ error: 'Bloqueio não encontrado' });

      const item = await prisma.bloqueioAgenda.update({
        where: { id },
        data: buildBloqueioData(userId, { ...existing, ...req.body })
      });
      res.json(mapBloqueio(item));
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao atualizar bloqueio' });
    }
  },

  async deleteBloqueio(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const id = asString(req.params.id);
      const existing = await prisma.bloqueioAgenda.findFirst({ where: { id, userId } });
      if (!existing) return res.status(404).json({ error: 'Bloqueio não encontrado' });
      await prisma.bloqueioAgenda.delete({ where: { id } });
      res.status(204).send();
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao excluir bloqueio' });
    }
  }
};
