import { Router } from 'express';
import { materiaController } from '../controllers/materia.controller';
import { requireAuth } from '../middlewares/auth';

const router = Router();

// Todas as rotas de matérias precisam de autenticação
router.use(requireAuth);

router.post('/', materiaController.createMateria);
router.get('/', materiaController.getMaterias);
router.get('/faltas-resumos', materiaController.getFaltasResumos);
router.get('/:id/aulas', materiaController.getAulasByMateria);
router.get('/:id/faltas-resumo', materiaController.getFaltasResumo);
router.get('/:id', materiaController.getMateriaById);
router.put('/:id', materiaController.updateMateria);
router.patch('/:id', materiaController.patchMateria);
router.delete('/:id', materiaController.deleteMateria);

export default router;