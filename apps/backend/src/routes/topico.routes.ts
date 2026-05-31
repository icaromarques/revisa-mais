import { Router } from 'express';
import { topicoController } from '../controllers/topico.controller';
import { requireAuth } from '../middlewares/auth';

const router = Router({ mergeParams: true }); // mergeParams para pegar materiaId da URL pai se necessário

router.use(requireAuth);

router.get('/', topicoController.getTopicos);
router.post('/', topicoController.createTopicoDirect);
router.get('/materia/:materiaId', topicoController.getTopicosByMateria);
router.post('/materia/:materiaId', topicoController.createTopico);
router.put('/:id', topicoController.updateTopico);
router.delete('/:id', topicoController.deleteTopico);
router.patch('/:id/dominio', topicoController.updateDominio);

export default router;