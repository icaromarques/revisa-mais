import { Router } from 'express';
import { materiaController } from '../controllers/materia.controller';
import { requireAuth } from '../middlewares/auth';

const router = Router();

// Todas as rotas de matérias precisam de autenticação
router.use(requireAuth);

router.post('/', materiaController.createMateria);
router.get('/', materiaController.getMaterias);
router.get('/:id', materiaController.getMateriaById);
router.delete('/:id', materiaController.deleteMateria);

export default router;