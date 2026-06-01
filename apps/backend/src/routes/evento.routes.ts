import { Router } from 'express';
import { eventoController } from '../controllers/evento.controller';
import { requireAuth } from '../middlewares/auth';

const router = Router();

router.use(requireAuth);

router.post('/', eventoController.createEvento);
router.get('/', eventoController.getEventos);
router.post('/sync-range', eventoController.syncRange);
router.post('/:id/sync-google', eventoController.syncIndividual);
router.patch('/:id', eventoController.updateEvento);
router.delete('/:id', eventoController.deleteEvento);

export default router;