import { Router } from 'express';
import { userController } from '../controllers/user.controller';
import { notificacaoController } from '../controllers/resource.controller';
import { requireAuth } from '../middlewares/auth';

const router = Router();
router.use(requireAuth);

router.get('/me', userController.getMe);
router.get('/perfil', userController.getPerfil);
router.patch('/perfil', userController.updatePerfil);
router.patch('/perfil/settings', userController.updateSettings);
router.get('/perfil/analytics', userController.getAnalytics);
router.post('/perfil/goals', userController.addGoal);
router.patch('/perfil/goals/:goalId', userController.updateGoal);
router.delete('/perfil/goals/:goalId', userController.deleteGoal);
router.get('/preferencias', userController.getPreferencias);
router.put('/preferencias', userController.updatePreferencias);

router.get('/notificacoes', notificacaoController.list);
router.post('/notificacoes/sync', notificacaoController.syncFromModules);
router.patch('/notificacoes/read-all', notificacaoController.markAllRead);
router.patch('/notificacoes/:id/read', notificacaoController.markRead);
router.patch('/notificacoes/:id/status', notificacaoController.updateStatus);
router.delete('/notificacoes/old', notificacaoController.removeOld);

export default router;
