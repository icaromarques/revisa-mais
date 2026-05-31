import { Router } from 'express';
import { revisaoController } from '../controllers/revisao.controller';
import { deckController } from '../controllers/deck.controller';
import { requireAuth } from '../middlewares/auth';

const router = Router();

router.use(requireAuth);

// Deck routes (must be before /:id)
router.get('/decks', deckController.listDecks);
router.post('/decks', deckController.createDeck);
router.put('/decks/:deckId', deckController.updateDeck);
router.delete('/decks/:deckId', deckController.deleteDeck);
router.get('/decks/:deckId/cards', deckController.listCards);
router.post('/decks/:deckId/cards', deckController.createCard);
router.put('/decks/:deckId/cards/:cardId', deckController.updateCard);
router.delete('/decks/:deckId/cards/:cardId', deckController.deleteCard);

router.delete('/origin/:originType/:originId', revisaoController.deleteByOrigin);

router.post('/', revisaoController.agendarRevisao);
router.get('/', revisaoController.getRevisoes);
router.put('/:id', revisaoController.updateRevisao);
router.patch('/:id/status', revisaoController.updateStatus);
router.delete('/:id', revisaoController.deleteRevisao);

export default router;
