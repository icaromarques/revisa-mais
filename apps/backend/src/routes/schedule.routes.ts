import { Router } from 'express';
import { scheduleController } from '../controllers/schedule.controller';
import { requireAuth } from '../middlewares/auth';

const router = Router();

router.use(requireAuth);

router.post('/suggest', scheduleController.suggestTimeSlot);

export default router;