import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { queryString } from '../utils/responseMapper';

type ResetModule =
  | 'materias'
  | 'sessoes'
  | 'revisoes'
  | 'faltas'
  | 'planner'
  | 'materiais'
  | 'flashcards'
  | 'questoes'
  | 'resumos'
  | 'agenda'
  | 'total';

async function countForUser(userId: string, module: ResetModule) {
  const counts: Record<string, number> = {};

  const add = async (key: string, fn: () => Promise<number>) => {
    counts[key] = await fn();
  };

  switch (module) {
    case 'materias':
      await add('materias', () => prisma.materia.count({ where: { userId } }));
      await add('topicos', () => prisma.topico.count({ where: { materia: { userId } } }));
      await add('aulas', () => prisma.aula.count({ where: { userId } }));
      await add('materiais', () => prisma.materialEstudo.count({ where: { userId } }));
      await add('revisoes', () => prisma.revisao.count({ where: { userId } }));
      await add('ocorrencias_grade', () => prisma.ocorrenciaGrade.count({ where: { userId } }));
      await add('eventos_academicos', () => prisma.eventoAcademico.count({ where: { userId } }));
      break;
    case 'sessoes':
      await add('sessoes', () => prisma.sessaoEstudo.count({ where: { userId } }));
      break;
    case 'revisoes':
      await add('revisoes', () => prisma.revisao.count({ where: { userId } }));
      break;
    case 'faltas':
      await add('ocorrencias_grade', () => prisma.ocorrenciaGrade.count({ where: { userId } }));
      break;
    case 'planner':
      await add('eventos_academicos', () => prisma.eventoAcademico.count({ where: { userId } }));
      break;
    case 'materiais':
      await add('materiais', () => prisma.materialEstudo.count({ where: { userId } }));
      break;
    case 'flashcards':
      await add('decks', () => prisma.deck.count({ where: { userId } }));
      await add('flashcards', () => prisma.flashcard.count({ where: { deck: { userId } } }));
      break;
    case 'questoes':
      await add('cadernos', () => prisma.caderno.count({ where: { userId } }));
      await add('questoes', () => prisma.questao.count({ where: { caderno: { userId } } }));
      await add('tentativas', () => prisma.tentativaQuestao.count({ where: { userId } }));
      break;
    case 'resumos':
      await add('resumos', () => prisma.resumo.count({ where: { userId } }));
      break;
    case 'agenda':
      await add('grade_faculdade', () => prisma.gradeFaculdade.count({ where: { userId } }));
      await add('bloqueios_agenda', () => prisma.bloqueioAgenda.count({ where: { userId } }));
      break;
    case 'total':
      await add('materias', () => prisma.materia.count({ where: { userId } }));
      await add('sessoes', () => prisma.sessaoEstudo.count({ where: { userId } }));
      await add('revisoes', () => prisma.revisao.count({ where: { userId } }));
      await add('resumos', () => prisma.resumo.count({ where: { userId } }));
      await add('decks', () => prisma.deck.count({ where: { userId } }));
      await add('cadernos', () => prisma.caderno.count({ where: { userId } }));
      await add('eventos_academicos', () => prisma.eventoAcademico.count({ where: { userId } }));
      await add('grade_faculdade', () => prisma.gradeFaculdade.count({ where: { userId } }));
      await add('bloqueios_agenda', () => prisma.bloqueioAgenda.count({ where: { userId } }));
      await add('notificacoes', () => prisma.notificacao.count({ where: { userId } }));
      break;
  }

  const totalCount = Object.values(counts).reduce((a, b) => a + b, 0);
  return { counts, totalCount };
}

async function resetForUser(userId: string, module: ResetModule) {
  switch (module) {
    case 'materias':
      await prisma.materia.deleteMany({ where: { userId } });
      break;
    case 'sessoes':
      await prisma.sessaoEstudo.deleteMany({ where: { userId } });
      break;
    case 'revisoes':
      await prisma.revisao.deleteMany({ where: { userId } });
      break;
    case 'faltas':
      await prisma.ocorrenciaGrade.deleteMany({ where: { userId } });
      break;
    case 'planner':
      await prisma.eventoAcademico.deleteMany({ where: { userId } });
      break;
    case 'materiais':
      await prisma.materialEstudo.deleteMany({ where: { userId } });
      break;
    case 'flashcards':
      await prisma.deck.deleteMany({ where: { userId } });
      break;
    case 'questoes':
      await prisma.caderno.deleteMany({ where: { userId } });
      break;
    case 'resumos':
      await prisma.resumo.deleteMany({ where: { userId } });
      break;
    case 'agenda':
      await prisma.gradeFaculdade.deleteMany({ where: { userId } });
      await prisma.bloqueioAgenda.deleteMany({ where: { userId } });
      break;
    case 'total':
      await prisma.materia.deleteMany({ where: { userId } });
      await prisma.sessaoEstudo.deleteMany({ where: { userId } });
      await prisma.revisao.deleteMany({ where: { userId } });
      await prisma.resumo.deleteMany({ where: { userId } });
      await prisma.deck.deleteMany({ where: { userId } });
      await prisma.caderno.deleteMany({ where: { userId } });
      await prisma.eventoAcademico.deleteMany({ where: { userId } });
      await prisma.gradeFaculdade.deleteMany({ where: { userId } });
      await prisma.bloqueioAgenda.deleteMany({ where: { userId } });
      await prisma.ocorrenciaGrade.deleteMany({ where: { userId } });
      await prisma.notificacao.deleteMany({ where: { userId } });
      break;
  }
}

export const adminController = {
  async getResetImpact(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const module = (queryString(req.query as Record<string, unknown>, 'module') || 'total') as ResetModule;
      const impact = await countForUser(userId, module);
      res.json(impact);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao calcular impacto' });
    }
  },

  async resetData(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const module = (req.body.module === 'total' ? 'total' : req.body.module) as ResetModule;
      await resetForUser(userId, module);
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao resetar dados' });
    }
  },

  async exportData(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const [
        user, materias, sessoes, revisoes, resumos, decks, cadernos,
        eventos, grade, bloqueios, ocorrencias, notificacoes
      ] = await Promise.all([
        prisma.user.findUnique({ where: { id: userId }, include: { profile: true, preferences: true } }),
        prisma.materia.findMany({ where: { userId }, include: { topicos: true, aulas: true, materiais: true } }),
        prisma.sessaoEstudo.findMany({ where: { userId } }),
        prisma.revisao.findMany({ where: { userId } }),
        prisma.resumo.findMany({ where: { userId } }),
        prisma.deck.findMany({ where: { userId }, include: { flashcards: true } }),
        prisma.caderno.findMany({ where: { userId }, include: { questoes: { include: { alternativas: true } } } }),
        prisma.eventoAcademico.findMany({ where: { userId } }),
        prisma.gradeFaculdade.findMany({ where: { userId } }),
        prisma.bloqueioAgenda.findMany({ where: { userId } }),
        prisma.ocorrenciaGrade.findMany({ where: { userId } }),
        prisma.notificacao.findMany({ where: { userId } })
      ]);

      res.json({
        exportedAt: new Date().toISOString(),
        user, materias, sessoes, revisoes, resumos, decks, cadernos,
        eventos, grade, bloqueios, ocorrencias, notificacoes
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao exportar dados' });
    }
  }
};
