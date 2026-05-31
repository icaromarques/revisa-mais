import { Router } from 'express';
import { materialController } from '../controllers/resource.controller';
import { requireAuth } from '../middlewares/auth';

const router = Router();
router.use(requireAuth);

router.get('/', materialController.list);
router.post('/', materialController.create);
router.put('/:id', materialController.update);
router.patch('/:id', materialController.update);
router.delete('/:id', materialController.remove);

export default router;
