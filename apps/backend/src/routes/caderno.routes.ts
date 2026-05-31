import { Router } from 'express';
import { cadernoController } from '../controllers/caderno.controller';
import { requireAuth } from '../middlewares/auth';

const router = Router();
router.use(requireAuth);

router.get('/', cadernoController.list);
router.post('/', cadernoController.create);
router.put('/:id', cadernoController.update);
router.delete('/:id', cadernoController.remove);
router.post('/:id/questoes', cadernoController.createQuestao);
router.put('/:id/questoes/:questaoId', cadernoController.updateQuestao);
router.delete('/:id/questoes/:questaoId', cadernoController.removeQuestao);

export default router;
