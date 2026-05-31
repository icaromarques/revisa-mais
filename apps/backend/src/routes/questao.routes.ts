import { Router } from 'express';
import { questaoController } from '../controllers/caderno.controller';
import { requireAuth } from '../middlewares/auth';

const router = Router();
router.use(requireAuth);

router.post('/', questaoController.createStandalone);

export default router;
