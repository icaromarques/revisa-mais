import { Router } from 'express';
import { integrationController } from '../controllers/integration.controller';
import { requireAuth } from '../middlewares/auth';

const router = Router();
router.use(requireAuth);

router.get('/google/status', integrationController.getGoogleStatus);
router.delete('/google/disconnect', integrationController.disconnectGoogle);

export default router;
