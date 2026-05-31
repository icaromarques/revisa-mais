import { Router } from 'express';
import { ocorrenciaController } from '../controllers/ocorrencia.controller';
import { requireAuth } from '../middlewares/auth';

const router = Router();
router.use(requireAuth);

router.get('/', ocorrenciaController.list);
router.post('/', ocorrenciaController.create);
router.patch('/:id', ocorrenciaController.update);
router.delete('/:id', ocorrenciaController.remove);

export default router;
