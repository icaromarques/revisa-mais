import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { asString, bodyField, queryString, toSnakeCase } from '../utils/responseMapper';

export const eventoController = {
  async getEventos(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const q = req.query as Record<string, unknown>;
      const start = queryString(q, 'start');
      const end = queryString(q, 'end');
      const materiaId = queryString(q, 'materiaId') || queryString(q, 'materia_id');
      const aula_id = queryString(q, 'aula_id');

      const whereClause: any = { userId };
      
      if (start && end) {
        whereClause.dataInicio = { gte: new Date(start) };
        whereClause.dataFim = { lte: new Date(end) };
      }
      if (materiaId) whereClause.materiaId = materiaId;
      if (aula_id) whereClause.aulaId = aula_id;

      const eventos = await prisma.eventoAcademico.findMany({
        where: whereClause,
        include: { materia: { select: { nome: true, cor: true } } },
        orderBy: { dataInicio: 'asc' }
      });

      res.json(eventos.map((e) => toSnakeCase(e)));
    } catch (error) {
      res.status(500).json({ error: 'Erro ao buscar eventos' });
    }
  },

  async createEvento(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const data = req.body;

      const dataInicio = data.data_inicio || data.dataInicio;
      const dataFim = data.data_fim || data.dataFim || dataInicio;

      const evento = await prisma.eventoAcademico.create({
        data: {
          userId,
          titulo: data.titulo,
          descricao: data.descricao || null,
          tipo: data.tipo || 'evento',
          dataInicio: new Date(dataInicio),
          dataFim: new Date(dataFim),
          diaInteiro: data.dia_inteiro || data.diaInteiro || false,
          materiaId: data.materia_id || data.materiaId || null,
          aulaId: data.aula_id || data.aulaId || null,
          cor: data.cor || null,
          concluido: data.concluido ?? false
        }
      });

      // Integração: Se for evento criado manualmente ou gerado, envia para a agenda
      import('../services/googleCalendar.service').then(({ googleCalendarService }) => {
        googleCalendarService.upsertEvent(userId, evento.id).catch(console.error);
      });

      res.status(201).json(toSnakeCase(evento));
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao criar evento' });
    }
  },

  async updateEvento(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const id = asString(req.params.id);
      const body = req.body;

      const evento = await prisma.eventoAcademico.findFirst({ where: { id, userId } });
      if (!evento) return res.status(404).json({ error: 'Evento não encontrado' });

      const updated = await prisma.eventoAcademico.update({
        where: { id },
        data: {
          titulo: bodyField<string>(body, 'titulo') ?? evento.titulo,
          descricao: bodyField<string>(body, 'descricao') ?? evento.descricao,
          tipo: bodyField<string>(body, 'tipo') ?? evento.tipo,
          dataInicio: body.data_inicio || body.dataInicio
            ? new Date(body.data_inicio || body.dataInicio)
            : evento.dataInicio,
          dataFim: body.data_fim || body.dataFim
            ? new Date(body.data_fim || body.dataFim)
            : evento.dataFim,
          concluido: bodyField<boolean>(body, 'concluido') ?? evento.concluido,
          materiaId: bodyField<string>(body, 'materiaId', 'materia_id') ?? evento.materiaId,
          aulaId: bodyField<string>(body, 'aulaId', 'aula_id') ?? evento.aulaId
        }
      });

      // Integração
      import('../services/googleCalendar.service').then(({ googleCalendarService }) => {
        googleCalendarService.upsertEvent(userId, id).catch(console.error);
      });

      res.json(toSnakeCase(updated));
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao atualizar evento' });
    }
  },

  async deleteEvento(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const id = asString(req.params.id);

      const evento = await prisma.eventoAcademico.findFirst({
        where: { id, userId }
      });

      if (!evento) return res.status(404).json({ error: 'Evento não encontrado' });

      await prisma.eventoAcademico.delete({ where: { id } });

      // Integração
      if (evento.googleEventId) {
        import('../services/googleCalendar.service').then(({ googleCalendarService }) => {
          googleCalendarService
            .deleteEvent(userId, evento.googleEventId!, evento.googleCalendarId)
            .catch(console.error);
        });
      }

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Erro ao excluir evento' });
    }
  },

  async syncRange(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const body = req.body ?? {};
      const timeMinRaw = body.timeMin ?? body.time_min;
      const timeMaxRaw = body.timeMax ?? body.time_max;

      const syncOptions = {
        incremental: false as const,
        timeMin: timeMinRaw ? new Date(timeMinRaw) : undefined,
        timeMax: timeMaxRaw ? new Date(timeMaxRaw) : undefined
      };

      const { googleCalendarService } = await import('../services/googleCalendar.service');

      // Window sync in background; uses visible range from the client when provided
      googleCalendarService
        .syncUserCalendar(userId, syncOptions)
        .catch((err) => console.error(`Background sync error for user ${userId}:`, err));

      res.json({ success: true, message: 'Sincronização iniciada em segundo plano' });
    } catch (error) {
      console.error('Erro ao sincronizar range:', error);
      res.status(500).json({ error: 'Erro ao sincronizar com Google Calendar' });
    }
  },

  async syncIndividual(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const id = asString(req.params.id);

      const { googleCalendarService } = await import('../services/googleCalendar.service');
      await googleCalendarService.upsertEvent(userId, id);

      res.json({ success: true });
    } catch (error) {
      console.error('Erro ao sincronizar evento individual:', error);
      res.status(500).json({ error: 'Erro ao sincronizar evento' });
    }
  }
};
