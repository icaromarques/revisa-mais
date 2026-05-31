import { Router } from 'express';
import { adminController } from '../controllers/admin.controller';
import { requireAuth } from '../middlewares/auth';

const router = Router();
router.use(requireAuth);

router.get('/reset-impact', adminController.getResetImpact);
router.post('/reset', adminController.resetData);
router.get('/export', adminController.exportData);

export default router;
