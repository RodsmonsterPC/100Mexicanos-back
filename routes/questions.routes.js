const express = require('express');
const router = express.Router();
const { getAllQuestions, getCategories, getRandomQuestion, createQuestion, deleteQuestion, updateQuestion } = require('../controllers/questions.controller');
const { requireAdmin } = require('../middlewares/auth.middleware');

router.get('/', getAllQuestions);
router.get('/categories', getCategories);
router.get('/random', getRandomQuestion);
router.post('/', requireAdmin, createQuestion);
router.put('/:id', requireAdmin, updateQuestion);
router.delete('/:id', requireAdmin, deleteQuestion);

module.exports = router;
