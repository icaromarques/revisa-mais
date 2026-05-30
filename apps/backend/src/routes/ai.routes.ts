import { Router } from 'express';
import { aiController } from '../controllers/ai.controller';
import { requireAuth } from '../middlewares/auth';

const router = Router();

router.use(requireAuth);

router.post('/summary', aiController.generateSummary);

export default router;