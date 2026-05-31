import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { asString, bodyField, parseDate } from '../utils/responseMapper';

function buildMateriaData(userId: string, body: Record<string, unknown>) {
  return {
    userId,
    nome: String(bodyField(body, 'nome') || ''),
    cor: String(bodyField(body, 'cor') || 'roxo'),
    descricao: bodyField<string>(body, 'descricao') || null,
    professor: bodyField<string>(body, 'professor') || null,
    prioridade: bodyField<string>(body, 'prioridade') || null,
    metaSemanalHoras: bodyField<number>(body, 'metaSemanalHoras', 'meta_semanal_horas') ?? null,
    pesoImportancia: bodyField<string>(body, 'pesoImportancia', 'peso_importancia') || null,
    status: bodyField<string>(body, 'status') || 'em_andamento',
    periodoInicio: parseDate(bodyField(body, 'periodoInicio', 'periodo_inicio')),
    periodoFim: parseDate(bodyField(body, 'periodoFim', 'periodo_fim')),
    tipoPeriodo: bodyField<string>(body, 'tipoPeriodo', 'tipo_periodo') || null,
    numeroPeriodo: bodyField<number>(body, 'numeroPeriodo', 'numero_periodo') ?? null,
    limiteFaltasPercentual: bodyField<number>(body, 'limiteFaltasPercentual', 'limite_faltas_percentual') ?? null,
    revisaoAutomaticaAtiva: bodyField<boolean>(body, 'revisaoAutomaticaAtiva', 'revisao_automatica_ativa') ?? true,
    exibirNoCalendario: bodyField<boolean>(body, 'exibirNoCalendario', 'exibir_no_calendario') ?? true,
    iaHabilitada: bodyField<boolean>(body, 'iaHabilitada', 'ia_habilitada') ?? false
  };
}

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