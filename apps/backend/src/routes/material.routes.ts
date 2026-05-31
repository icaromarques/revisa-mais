import { Router } from 'express';
import { requireAuth } from '../middlewares/auth';
import { prisma } from '../config/prisma';

const router = Router();

router.use(requireAuth);

router.get('/', async (req, res) => {
  try {
    const { materia_id } = req.query;
    // Retorna array vazio por enquanto (stub)
    res.json([]);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar materiais' });
  }
});

router.post('/', async (req, res) => {
  res.status(201).json({ id: 'dummy_material' });
});

router.patch('/:id', async (req, res) => {
  res.json({ success: true });
});

router.delete('/:id', async (req, res) => {
  res.status(204).send();
});

export default router;