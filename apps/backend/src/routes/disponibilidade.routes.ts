import { Router } from 'express';
import { disponibilidadeController } from '../controllers/disponibilidade.controller';
import { requireAuth } from '../middlewares/auth';

const router = Router();
router.use(requireAuth);

router.get('/grade_faculdade', disponibilidadeController.listGrade);
router.post('/grade_faculdade', disponibilidadeController.createGrade);
router.put('/grade_faculdade/:id', disponibilidadeController.updateGrade);
router.delete('/grade_faculdade/:id', disponibilidadeController.deleteGrade);

router.get('/bloqueios', disponibilidadeController.listBloqueios);
router.post('/bloqueios', disponibilidadeController.createBloqueio);
router.put('/bloqueios/:id', disponibilidadeController.updateBloqueio);
router.delete('/bloqueios/:id', disponibilidadeController.deleteBloqueio);

export default router;
