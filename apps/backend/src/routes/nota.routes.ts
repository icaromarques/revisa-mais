import { Router } from 'express';
import { notaController } from '../controllers/resource.controller';
import { requireAuth } from '../middlewares/auth';

const router = Router();
router.use(requireAuth);

router.post('/', notaController.create);
router.put('/:id', notaController.update);
router.delete('/:id', notaController.remove);

export default router;
