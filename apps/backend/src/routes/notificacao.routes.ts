import { Router } from 'express';
import { notificacaoController } from '../controllers/resource.controller';
import { requireAuth } from '../middlewares/auth';

const router = Router();
router.use(requireAuth);

router.get('/', notificacaoController.list);
router.patch('/:id/read', notificacaoController.markRead);
router.post('/mark-all-read', notificacaoController.markAllRead);
router.delete('/:id', notificacaoController.remove);
router.patch('/:id/archive', notificacaoController.archive);

export default router;
