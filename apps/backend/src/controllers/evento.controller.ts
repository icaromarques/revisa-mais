import { Request, Response } from 'express';
import { prisma } from '../config/prisma';

export const eventoController = {
  async getEventos(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      // Idealmente, recebe `start` e `end` para filtrar o calendário
      const { start, end } = req.query;

      const whereClause: any = { userId };
      
      if (start && end) {
        whereClause.dataInicio = { gte: new Date(start as string) };
        whereClause.dataFim = { lte: new Date(end as string) };
      }

      const eventos = await prisma.eventoAcademico.findMany({
        where: whereClause,
        include: { materia: { select: { nome: true, cor: true } } }
      });

      res.json(eventos);
    } catch (error) {
      res.status(500).json({ error: 'Erro ao buscar eventos' });
    }
  },

  async createEvento(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const data = req.body;

      // 1. Criar evento no nosso banco
      const evento = await prisma.eventoAcademico.create({
        data: {
          userId,
          titulo: data.titulo,
          descricao: data.descricao,
          tipo: data.tipo || 'evento',
          dataInicio: new Date(data.dataInicio),
          dataFim: new Date(data.dataFim),
          diaInteiro: data.diaInteiro || false,
          materiaId: data.materiaId || null,
          cor: data.cor || null
        }
      });

      // 2. Acionar a sincronização com Google Calendar se o usuário tiver autorizado
      // (Isso chamaria nosso worker/webhook configurado na fase de Integração Google)

      res.status(201).json(evento);
    } catch (error) {
      res.status(500).json({ error: 'Erro ao criar evento' });
    }
  },

  async deleteEvento(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const { id } = req.params;

      const evento = await prisma.eventoAcademico.findFirst({
        where: { id, userId }
      });

      if (!evento) return res.status(404).json({ error: 'Evento não encontrado' });

      // 1. Acionar exclusão no Google Calendar (se existir googleEventId)
      // ...

      // 2. Deletar do banco
      await prisma.eventoAcademico.delete({ where: { id } });

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Erro ao excluir evento' });
    }
  }
};