const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middlewares/auth.middleware');
const {
  getUserCategories,
  createUserCategory,
  deleteUserCategory,
  getCategoryCards,
  createCategoryCard,
  updateCategoryCard,
  deleteCategoryCard
} = require('../controllers/userCategories.controller');

// Todas las rutas están protegidas
router.use(requireAuth);

// Rutas de mazos (categorías)
router.get('/', getUserCategories);
router.post('/', createUserCategory);
router.delete('/:id', deleteUserCategory);

// Rutas de cartas dentro de un mazo
router.get('/:categoryId/cards', getCategoryCards);
router.post('/:categoryId/cards', createCategoryCard);
router.put('/:categoryId/cards/:cardId', updateCategoryCard);
router.delete('/:categoryId/cards/:cardId', deleteCategoryCard);

module.exports = router;
