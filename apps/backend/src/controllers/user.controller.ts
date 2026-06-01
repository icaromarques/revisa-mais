import { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { prisma } from '../config/prisma';
import { bodyField, parseDate, toSnakeCase } from '../utils/responseMapper';
import { mapNotificacoesToApi } from '../utils/notificationMapper';
import { notificationEngine } from '../services/notificationEngine.service';

async function getOrCreateProfile(userId: string) {
  let profile = await prisma.userProfile.findUnique({ where: { userId } });
  if (!profile) {
    profile = await prisma.userProfile.create({ data: { userId } });
  }
  return profile;
}

function buildProfileResponse(user: any, profile: any) {
  const goals = Array.isArray(profile.goalsJson) ? profile.goalsJson : [];
  return {
    nome: user.nome,
    email: user.email,
    bio: profile.bio,
    instituicao: profile.instituicao,
    curso: profile.curso,
    semestre: profile.semestre,
    turno: profile.turno,
    foto_url: profile.fotoUrl,
    rotina: profile.rotina,
    plano: profile.plano || 'free',
    goals,
    created_at: profile.createdAt?.toISOString?.() || profile.createdAt,
    updated_at: profile.updatedAt?.toISOString?.() || profile.updatedAt
  };
}

export const userController = {
  async getMe(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
      res.json(toSnakeCase(user));
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao buscar usuário' });
    }
  },

  async getPerfil(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
      const profile = await getOrCreateProfile(userId);
      res.json(buildProfileResponse(user, profile));
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao buscar perfil' });
    }
  },

  async updatePerfil(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const body = req.body;
      const profile = await getOrCreateProfile(userId);

      if (bodyField(body, 'nome')) {
        await prisma.user.update({
          where: { id: userId },
          data: { nome: String(bodyField(body, 'nome')) }
        });
      }

      const updated = await prisma.userProfile.update({
        where: { id: profile.id },
        data: {
          bio: bodyField<string>(body, 'bio') ?? profile.bio,
          instituicao: bodyField<string>(body, 'instituicao') ?? profile.instituicao,
          curso: bodyField<string>(body, 'curso') ?? profile.curso,
          semestre: bodyField<string>(body, 'semestre') ?? profile.semestre,
          turno: bodyField<string>(body, 'turno') ?? profile.turno,
          fotoUrl: bodyField<string>(body, 'fotoUrl', 'foto_url') ?? profile.fotoUrl,
          rotina: bodyField<string>(body, 'rotina') ?? profile.rotina
        }
      });

      const user = await prisma.user.findUnique({ where: { id: userId } });
      res.json(buildProfileResponse(user, updated));
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao atualizar perfil' });
    }
  },

  async getPreferencias(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      let prefs = await prisma.userPreferences.findUnique({ where: { userId } });
      if (!prefs) {
        prefs = await prisma.userPreferences.create({
          data: { userId, preferencesJson: {} }
        });
      }
      res.json(prefs.preferencesJson || {});
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao buscar preferências' });
    }
  },

  async updatePreferencias(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const prefs = await prisma.userPreferences.upsert({
        where: { userId },
        create: { userId, preferencesJson: req.body },
        update: { preferencesJson: req.body }
      });

      notificationEngine.syncUserNotifications(userId).catch(console.error);

      res.json(prefs.preferencesJson);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao salvar preferências' });
    }
  },

  async updateSettings(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const profile = await getOrCreateProfile(userId);
      const current = (profile.settingsJson as Record<string, unknown>) || {};
      const updated = await prisma.userProfile.update({
        where: { id: profile.id },
        data: { settingsJson: { ...current, ...req.body } }
      });
      res.json(updated.settingsJson);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao atualizar configurações' });
    }
  },

  async addGoal(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const profile = await getOrCreateProfile(userId);
      const goals = Array.isArray(profile.goalsJson) ? [...profile.goalsJson as any[]] : [];
      const goal = { id: randomUUID(), status: 'active', ...req.body };
      goals.push(goal);
      await prisma.userProfile.update({ where: { id: profile.id }, data: { goalsJson: goals } });
      res.status(201).json(goal);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao criar meta' });
    }
  },

  async updateGoal(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const { goalId } = req.params;
      const profile = await getOrCreateProfile(userId);
      const goals = Array.isArray(profile.goalsJson) ? [...profile.goalsJson as any[]] : [];
      const idx = goals.findIndex((g: any) => g.id === goalId);
      if (idx === -1) return res.status(404).json({ error: 'Meta não encontrada' });
      goals[idx] = { ...goals[idx], ...req.body };
      await prisma.userProfile.update({ where: { id: profile.id }, data: { goalsJson: goals } });
      res.json(goals[idx]);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao atualizar meta' });
    }
  },

  async deleteGoal(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const { goalId } = req.params;
      const profile = await getOrCreateProfile(userId);
      const goals = Array.isArray(profile.goalsJson) ? [...profile.goalsJson as any[]] : [];
      const filtered = goals.filter((g: any) => g.id !== goalId);
      await prisma.userProfile.update({ where: { id: profile.id }, data: { goalsJson: filtered } });
      res.status(204).send();
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao excluir meta' });
    }
  },

  async getAnalytics(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const sessoes = await prisma.sessaoEstudo.findMany({
        where: { userId },
        include: { materia: { select: { nome: true } } },
        orderBy: { createdAt: 'desc' }
      });
      const revisoesConcluidas = await prisma.revisao.count({
        where: { userId, status: 'concluida' }
      });
      const totalRevisoes = await prisma.revisao.count({ where: { userId } });

      const totalMinutos = sessoes.reduce((acc, s) => acc + Math.round(s.tempoEstudadoSegundos / 60), 0);
      const questoesResolvidas = sessoes.reduce((acc, s) => acc + (s.totalQuestoes || 0), 0);

      const materiaCount: Record<string, number> = {};
      sessoes.forEach((s) => {
        const nome = s.materia?.nome || 'Sem matéria';
        materiaCount[nome] = (materiaCount[nome] || 0) + s.tempoEstudadoSegundos;
      });
      const materiaMaisEstudada = Object.entries(materiaCount).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

      res.json({
        totalSessoes: sessoes.length,
        totalMinutos,
        revisoesConcluidas,
        questoesResolvidas,
        streakDias: 0,
        mediaPorSessao: sessoes.length ? Math.round(totalMinutos / sessoes.length) : 0,
        materiaMaisEstudada,
        melhorHorario: null,
        taxaRevisao: totalRevisoes ? Math.round((revisoesConcluidas / totalRevisoes) * 100) : null,
        rotinaInsight: null
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao calcular analytics' });
    }
  },

  async listNotificacoes(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const items = await prisma.notificacao.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' }
      });
      res.json(mapNotificacoesToApi(items));
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao buscar notificações' });
    }
  }
};
