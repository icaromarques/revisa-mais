import { Request, Response } from 'express';
import { prisma } from '../config/prisma';

export const scheduleController = {
  // Substitui a chamada pesada que o navegador fazia. Agora o banco processa.
  async suggestTimeSlot(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const { dataInicio, durationMinutes } = req.body;

      // 1. Busca todos os eventos, aulas e bloqueios do usuário no Prisma (muito mais rápido que Firestore)
      // const bloqueios = await prisma.bloqueioAgenda.findMany({ where: { userId } });
      // const grade = await prisma.gradeFaculdade.findMany({ where: { userId } });
      
      // 2. Lógica do Smart Schedule processada aqui (mockada para estrutura base)
      // Executa o algoritmo com base em timeMin e timeMax

      const suggestedSlot = {
        start: new Date().toISOString(),
        end: new Date(new Date().getTime() + 30 * 60000).toISOString()
      };

      res.json({ slot: suggestedSlot });
    } catch (error) {
      res.status(500).json({ error: 'Erro ao sugerir horário' });
    }
  }
};