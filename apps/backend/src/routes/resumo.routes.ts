import { Router } from 'express';
import { resumoController } from '../controllers/resource.controller';
import { requireAuth } from '../middlewares/auth';

const router = Router();
router.use(requireAuth);

router.get('/', resumoController.list);
router.post('/', resumoController.create);
router.put('/:id', resumoController.update);
router.delete('/:id', resumoController.remove);

export default router;
