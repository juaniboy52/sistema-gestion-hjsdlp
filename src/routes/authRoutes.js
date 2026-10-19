const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');
const { verificarToken } = require('../middlewares/authMiddleware');

router.post('/login', AuthController.login);
router.post('/login-devoto', AuthController.loginDevoto);
router.get('/perfil', verificarToken, AuthController.obtenerPerfil);

module.exports = router;
