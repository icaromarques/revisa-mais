import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { GoogleGenAI } from '@google/genai';

// Instância usando a chave global (Master Key) do sistema (Plano Free)
const masterGenAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const aiController = {
  async generateSummary(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const { text, context } = req.body;

      if (!text) {
        return res.status(400).json({ error: 'Texto base é obrigatório para o resumo' });
      }

      // 1. Busca o usuário para checar se ele tem uma BYOK (Bring Your Own Key)
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { geminiApiKey: true }
      });

      let aiClient = masterGenAI;
      let usedByok = false;

      // 2. Se o usuário configurou a chave dele, usamos a chave dele
      if (user?.geminiApiKey) {
        aiClient = new GoogleGenAI({ apiKey: user.geminiApiKey });
        usedByok = true;
      } else {
        // Lógica de Rate Limit do Plano Free iria aqui (ex: checar Redis ou Postgres)
        // Se excedeu, return res.status(429).json({ error: 'Limite grátis excedido. Insira sua própria chave.' });
      }

      // 3. Chamada à API
      const response = await aiClient.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Faça um resumo bem estruturado do seguinte texto. Contexto: ${context || 'Nenhum'}\n\nTexto: ${text}`
      });

      res.json({
        summary: response.text,
        metadata: {
          usedByok,
          model: 'gemini-2.5-flash'
        }
      });

    } catch (error) {
      console.error('[Gemini API] Erro:', error);
      res.status(500).json({ error: 'Falha ao processar IA' });
    }
  }
};