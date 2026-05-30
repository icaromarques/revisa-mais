import { Router } from 'express';
import { sessaoController } from '../controllers/sessao.controller';
import { requireAuth } from '../middlewares/auth';

const router = Router();

router.use(requireAuth);

router.post('/', sessaoController.registerSessao);
router.get('/historico', sessaoController.getHistoricoSessoes);

export default router;