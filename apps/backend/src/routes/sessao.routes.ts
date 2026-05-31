import { Router } from 'express';
import { sessaoController } from '../controllers/sessao.controller';
import { requireAuth } from '../middlewares/auth';

const router = Router();

router.use(requireAuth);

router.post('/', sessaoController.registerSessao);
router.post('/registrar', sessaoController.registerSessao);

router.get('/', sessaoController.getSessoes);
router.get('/historico', sessaoController.getHistoricoSessoes);
router.get('/:id', sessaoController.getSessaoById);
router.put('/:id', sessaoController.updateSessao);
router.delete('/:id', sessaoController.deleteSessao);

export default router;