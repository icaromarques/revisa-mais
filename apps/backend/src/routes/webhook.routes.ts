import { Router } from 'express';
import { googleWebhookController } from '../controllers/webhook.controller';

const router = Router();

// Esta rota deve ser pública e estar em HTTPS (exigência do Google)
router.post('/google-calendar', googleWebhookController.handleCalendarWebhook);

export default router;