const express = require('express');
const { register, login, getProfile, updateProfile, adminLogin } = require('../controllers/auth.controller');
const { requireAuth } = require('../middlewares/auth.middleware');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', requireAuth, getProfile);
router.put('/me', requireAuth, updateProfile);
router.post('/admin-login', adminLogin);

module.exports = router;
