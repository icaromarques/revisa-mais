import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { requireAuth } from '../middlewares/auth';

const router = Router();

router.get('/google', authController.getAuthUrl);
router.get('/google/callback', authController.googleCallback);
router.get('/session', requireAuth, authController.getSession);
router.get('/ws-token', requireAuth, authController.getWsToken);
router.post('/logout', requireAuth, authController.logout);

export default router;