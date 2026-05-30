import { Router } from 'express';
import { eventoController } from '../controllers/evento.controller';
import { requireAuth } from '../middlewares/auth';

const router = Router();

router.use(requireAuth);

router.post('/', eventoController.createEvento);
router.get('/', eventoController.getEventos);
router.delete('/:id', eventoController.deleteEvento);

export default router;