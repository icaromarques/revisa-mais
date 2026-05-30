import { Router } from 'express';
import { revisaoController } from '../controllers/revisao.controller';
import { requireAuth } from '../middlewares/auth';

const router = Router();

router.use(requireAuth);

router.post('/', revisaoController.agendarRevisao);
router.get('/', revisaoController.getRevisoes);
router.patch('/:id/status', revisaoController.updateStatus);
router.delete('/:id', revisaoController.deleteRevisao);

export default router;