import {
  startOfDay,
  endOfDay,
  addDays,
  format
} from 'date-fns';
import { prisma } from '../config/prisma';
import { emitNotificationCreated } from '../ws/emit';
import { mapNotificacaoToApi } from '../utils/notificationMapper';

export type NotificationChannel =
  | 'revisoes_automaticas'
  | 'lembretes_estudo'
  | 'avaliacoes_provas'
  | 'metas_streaks';

export interface NotificationPrefs {
  min_priority?: 'baixa' | 'media' | 'alta' | 'critica';
  revisoes_automaticas?: boolean;
  lembretes_estudo?: boolean;
  avaliacoes_provas?: boolean;
  metas_streaks?: boolean;
}

const DEFAULT_NOTIFICATION_PREFS: Required<NotificationPrefs> = {
  min_priority: 'baixa',
  revisoes_automaticas: true,
  lembretes_estudo: true,
  avaliacoes_provas: true,
  metas_streaks: true
};

const PRIORITY_SCORE: Record<string, number> = {
  baixa: 1,
  media: 2,
  alta: 3,
  critica: 4
};

const AVALIACAO_TIPOS = new Set([
  'avaliacao',
  'prova',
  'trabalho',
  'apresentacao',
  'exame'
]);

interface CreateNotificationInput {
  tipo: string;
  titulo: string;
  mensagem: string;
  channel: NotificationChannel;
  prioridade: 'baixa' | 'media' | 'alta' | 'critica';
  category: string;
  dedupeKey: string;
  rotaDestino?: string;
  revisaoId?: string;
  eventoId?: string;
  materiaId?: string;
}

async function getNotificationPrefs(userId: string): Promise<Required<NotificationPrefs>> {
  const prefs = await prisma.userPreferences.findUnique({ where: { userId } });
  const json = (prefs?.preferencesJson as { notifications?: NotificationPrefs } | null) || {};
  return {
    ...DEFAULT_NOTIFICATION_PREFS,
    ...json.notifications
  };
}

function isChannelEnabled(channel: NotificationChannel, prefs: Required<NotificationPrefs>): boolean {
  return prefs[channel] !== false;
}

function meetsMinPriority(
  prioridade: string,
  minPriority: string
): boolean {
  return (PRIORITY_SCORE[prioridade] || 1) >= (PRIORITY_SCORE[minPriority] || 1);
}

async function createIfAllowed(
  userId: string,
  prefs: Required<NotificationPrefs>,
  input: CreateNotificationInput
) {
  if (!isChannelEnabled(input.channel, prefs)) return null;
  if (!meetsMinPriority(input.prioridade, prefs.min_priority)) return null;

  const existing = await prisma.notificacao.findFirst({
    where: {
      userId,
      metadataJson: {
        path: ['dedupe_key'],
        equals: input.dedupeKey
      }
    }
  });

  if (existing) return null;

  const created = await prisma.notificacao.create({
    data: {
      userId,
      tipo: input.tipo,
      titulo: input.titulo,
      mensagem: input.mensagem,
      metadataJson: {
        category: input.category,
        prioridade: input.prioridade,
        channel: input.channel,
        dedupe_key: input.dedupeKey,
        rota_destino: input.rotaDestino,
        revisao_id: input.revisaoId,
        evento_id: input.eventoId,
        materia_id: input.materiaId
      }
    }
  });

  emitNotificationCreated(userId, {
    notificationId: created.id,
    action: 'created',
    notification: mapNotificacaoToApi(created)
  });

  return created;
}

export const notificationEngine = {
  async syncUserNotifications(userId: string): Promise<number> {
    const prefs = await getNotificationPrefs(userId);
    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    let created = 0;

    if (isChannelEnabled('revisoes_automaticas', prefs)) {
      const revisoesHoje = await prisma.revisao.findMany({
        where: {
          userId,
          status: 'pendente',
          dataPrevista: { gte: todayStart, lte: todayEnd }
        },
        include: { materia: { select: { nome: true } } }
      });

      for (const rev of revisoesHoje) {
        const item = await createIfAllowed(userId, prefs, {
          tipo: 'revisao_hoje',
          titulo: 'Revisão para hoje',
          mensagem: `${rev.nome} (${rev.materia?.nome || 'Matéria'}) está agendada para hoje.`,
          channel: 'revisoes_automaticas',
          prioridade: 'media',
          category: 'revisao',
          dedupeKey: `revisao_hoje:${rev.id}:${format(todayStart, 'yyyy-MM-dd')}`,
          rotaDestino: '/revisoes',
          revisaoId: rev.id,
          materiaId: rev.materiaId
        });
        if (item) created += 1;
      }

      const overdue = await prisma.revisao.findMany({
        where: {
          userId,
          status: 'pendente',
          dataPrevista: { lt: todayStart }
        },
        include: { materia: { select: { nome: true } } },
        take: 30
      });

      for (const rev of overdue) {
        const item = await createIfAllowed(userId, prefs, {
          tipo: 'revisao_atrasada',
          titulo: 'Revisão atrasada',
          mensagem: `${rev.nome} (${rev.materia?.nome || 'Matéria'}) está pendente.`,
          channel: 'revisoes_automaticas',
          prioridade: 'alta',
          category: 'revisao',
          dedupeKey: `revisao_atrasada:${rev.id}`,
          rotaDestino: '/revisoes',
          revisaoId: rev.id,
          materiaId: rev.materiaId
        });
        if (item) created += 1;
      }
    }

    if (isChannelEnabled('lembretes_estudo', prefs)) {
      const dayOfWeek = now.getDay();
      const gradeItems = await prisma.gradeFaculdade.findMany({
        where: { userId, ativo: true },
        include: { materia: { select: { nome: true } } }
      });

      for (const g of gradeItems) {
        const appliesToday =
          g.recorrente !== false &&
          Array.isArray(g.diasSemana) &&
          g.diasSemana.includes(dayOfWeek);

        if (!appliesToday) continue;

        const [hh, mm] = g.horaInicio.split(':').map(Number);
        const startAt = new Date(now);
        startAt.setHours(hh, mm ?? 0, 0, 0);

        const diffMin = (startAt.getTime() - now.getTime()) / 60000;
        if (diffMin < -10 || diffMin > 45) continue;

        const item = await createIfAllowed(userId, prefs, {
          tipo: 'lembrete_grade',
          titulo: 'Horário na grade',
          mensagem: `${g.titulo}${g.materia?.nome ? ` (${g.materia.nome})` : ''} começa às ${g.horaInicio}.`,
          channel: 'lembretes_estudo',
          prioridade: 'media',
          category: 'agenda',
          dedupeKey: `lembrete_grade:${g.id}:${format(todayStart, 'yyyy-MM-dd')}`,
          rotaDestino: '/grade',
          materiaId: g.materiaId || undefined
        });
        if (item) created += 1;
      }
    }

    if (isChannelEnabled('avaliacoes_provas', prefs)) {
      const horizon = addDays(todayEnd, 7);
      const eventos = await prisma.eventoAcademico.findMany({
        where: {
          userId,
          dataInicio: { gte: todayStart, lte: horizon },
          tipo: { in: [...AVALIACAO_TIPOS] }
        },
        take: 20
      });

      for (const ev of eventos) {
        const tipo =
          ev.tipo === 'prova'
            ? 'prova_proxima'
            : ev.tipo === 'apresentacao'
              ? 'apresentacao_proxima'
              : ev.tipo === 'trabalho'
                ? 'trabalho_proximo'
                : 'prova_proxima';

        const item = await createIfAllowed(userId, prefs, {
          tipo,
          titulo: 'Compromisso acadêmico próximo',
          mensagem: `${ev.titulo} em ${format(ev.dataInicio, 'dd/MM/yyyy HH:mm')}.`,
          channel: 'avaliacoes_provas',
          prioridade: ev.tipo === 'prova' ? 'alta' : 'media',
          category: 'avaliacao',
          dedupeKey: `${tipo}:${ev.id}`,
          rotaDestino: '/calendario',
          eventoId: ev.id,
          materiaId: ev.materiaId || undefined
        });
        if (item) created += 1;
      }
    }

    if (isChannelEnabled('metas_streaks', prefs) && now.getHours() >= 18) {
      const yesterdayStart = startOfDay(addDays(now, -1));
      const yesterdayEnd = endOfDay(addDays(now, -1));

      const [sessionsYesterday, sessionsToday] = await Promise.all([
        prisma.sessaoEstudo.count({
          where: {
            userId,
            createdAt: { gte: yesterdayStart, lte: yesterdayEnd }
          }
        }),
        prisma.sessaoEstudo.count({
          where: {
            userId,
            createdAt: { gte: todayStart, lte: todayEnd }
          }
        })
      ]);

      if (sessionsYesterday > 0 && sessionsToday === 0) {
        const item = await createIfAllowed(userId, prefs, {
          tipo: 'streak_lembrete',
          titulo: 'Mantenha sua sequência',
          mensagem: 'Você estudou ontem, mas ainda não registrou sessão hoje. Não quebre o ritmo!',
          channel: 'metas_streaks',
          prioridade: 'baixa',
          category: 'sistema',
          dedupeKey: `streak_lembrete:${format(todayStart, 'yyyy-MM-dd')}`,
          rotaDestino: '/dashboard'
        });
        if (item) created += 1;
      }
    }

    return created;
  }
};
