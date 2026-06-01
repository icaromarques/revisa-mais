import { Router } from 'express';
import { integrationController } from '../controllers/integration.controller';
import { requireAuth } from '../middlewares/auth';

const router = Router();
router.use(requireAuth);

router.get('/google/status', integrationController.getGoogleStatus);
router.get('/google/calendars', integrationController.listGoogleCalendars);
router.post('/google/calendars/refresh', integrationController.refreshGoogleCalendars);
router.patch('/google/calendars/selection', integrationController.updateGoogleCalendarSelection);
router.post('/google/sync', integrationController.forceSyncGoogle);
router.delete('/google/disconnect', integrationController.disconnectGoogle);

export default router;
