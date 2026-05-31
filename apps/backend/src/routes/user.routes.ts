import { Router } from 'express';
import { requireAuth } from '../middlewares/auth';
import { prisma } from '../config/prisma';

const router = Router();

router.use(requireAuth);

router.get('/perfil', async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
    
    // Default payload para não dar crash
    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      picture: user.picture,
      preferences: {},
      goals: []
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar perfil' });
  }
});

router.get('/preferencias', async (req, res) => {
  try {
    const userId = (req as any).user.id;
    // Default mock preferences
    res.json({
      theme: 'system',
      notifications: true,
      studyTimer: { pomodoro: 25, shortBreak: 5, longBreak: 15 }
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar preferências' });
  }
});

router.get('/me', async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar me' });
  }
});

router.get('/notificacoes', async (req, res) => {
  res.json([]);
});

router.patch('/perfil', async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const updated = await prisma.user.update({
      where: { id: userId },
      data: req.body
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar perfil' });
  }
});

export default router;
