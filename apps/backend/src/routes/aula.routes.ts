import { Router } from 'express';
import { aulaController } from '../controllers/resource.controller';
import { requireAuth } from '../middlewares/auth';

const router = Router();
router.use(requireAuth);

router.get('/', aulaController.list);
router.get('/:id', aulaController.getById);
router.post('/', aulaController.create);
router.patch('/:id', aulaController.update);
router.put('/:id', aulaController.update);
router.delete('/:id', aulaController.remove);

export default router;
