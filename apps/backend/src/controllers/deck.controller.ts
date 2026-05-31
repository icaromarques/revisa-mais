import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { asString, bodyField, queryString, toSnakeCase } from '../utils/responseMapper';

export const deckController = {
  async listDecks(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const q = req.query as Record<string, unknown>;
      const materia_id = queryString(q, 'materia_id');
      const where: any = { userId };
      if (materia_id) where.materiaId = materia_id;

      const decks = await prisma.deck.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { flashcards: true } } }
      });
      res.json(decks.map((d) => toSnakeCase(d)));
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao listar decks' });
    }
  },

  async createDeck(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const body = req.body;
      const deck = await prisma.deck.create({
        data: {
          userId,
          nome: String(bodyField(body, 'nome') || 'Deck'),
          descricao: bodyField<string>(body, 'descricao') || null,
          origem: bodyField<string>(body, 'origem') || 'manual',
          materiaId: bodyField<string>(body, 'materiaId', 'materia_id') || null,
          aulaId: bodyField<string>(body, 'aulaId', 'aula_id') || null,
          topicoId: bodyField<string>(body, 'topicoId', 'topico_id') || null
        }
      });
      res.status(201).json(toSnakeCase(deck));
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao criar deck' });
    }
  },

  async updateDeck(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const id = asString(req.params.deckId || req.params.id);
      const body = req.body;
      const existing = await prisma.deck.findFirst({ where: { id, userId } });
      if (!existing) return res.status(404).json({ error: 'Deck não encontrado' });

      const deck = await prisma.deck.update({
        where: { id },
        data: {
          nome: bodyField<string>(body, 'nome') ?? existing.nome,
          descricao: bodyField<string>(body, 'descricao') ?? existing.descricao
        }
      });
      res.json(toSnakeCase(deck));
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao atualizar deck' });
    }
  },

  async deleteDeck(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const id = asString(req.params.deckId || req.params.id);
      const existing = await prisma.deck.findFirst({ where: { id, userId } });
      if (!existing) return res.status(404).json({ error: 'Deck não encontrado' });
      await prisma.deck.delete({ where: { id } });
      res.status(204).send();
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao excluir deck' });
    }
  },

  async listCards(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const deckId = asString(req.params.deckId);
      const deck = await prisma.deck.findFirst({ where: { id: deckId, userId } });
      if (!deck) return res.status(404).json({ error: 'Deck não encontrado' });

      const cards = await prisma.flashcard.findMany({
        where: { deckId },
        orderBy: { createdAt: 'asc' }
      });
      res.json(cards.map((c) => toSnakeCase(c)));
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao listar cards' });
    }
  },

  async createCard(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const deckId = asString(req.params.deckId);
      const body = req.body;
      const deck = await prisma.deck.findFirst({ where: { id: deckId, userId } });
      if (!deck) return res.status(404).json({ error: 'Deck não encontrado' });

      const card = await prisma.flashcard.create({
        data: {
          deckId,
          frente: String(bodyField(body, 'frente') || ''),
          verso: String(bodyField(body, 'verso') || '')
        }
      });
      res.status(201).json(toSnakeCase(card));
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao criar card' });
    }
  },

  async updateCard(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const deckId = asString(req.params.deckId);
      const cardId = asString(req.params.cardId);
      const body = req.body;
      const deck = await prisma.deck.findFirst({ where: { id: deckId, userId } });
      if (!deck) return res.status(404).json({ error: 'Deck não encontrado' });

      const existing = await prisma.flashcard.findFirst({ where: { id: cardId, deckId } });
      if (!existing) return res.status(404).json({ error: 'Card não encontrado' });

      const card = await prisma.flashcard.update({
        where: { id: cardId },
        data: {
          frente: bodyField<string>(body, 'frente') ?? existing.frente,
          verso: bodyField<string>(body, 'verso') ?? existing.verso
        }
      });
      res.json(toSnakeCase(card));
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao atualizar card' });
    }
  },

  async deleteCard(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const deckId = asString(req.params.deckId);
      const cardId = asString(req.params.cardId);
      const deck = await prisma.deck.findFirst({ where: { id: deckId, userId } });
      if (!deck) return res.status(404).json({ error: 'Deck não encontrado' });

      await prisma.flashcard.deleteMany({ where: { id: cardId, deckId } });
      res.status(204).send();
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao excluir card' });
    }
  }
};
