const express = require('express');
const router = express.Router();
const UsuarioController = require('../controllers/usuarioController');
const { verificarToken, permitirRoles } = require('../middlewares/authMiddleware');

router.get('/', verificarToken, permitirRoles(1), UsuarioController.listar);
router.post('/', verificarToken, permitirRoles(1), UsuarioController.crear);
router.put('/:id', verificarToken, permitirRoles(1), UsuarioController.actualizarUsuario);
router.patch('/:id/estado', verificarToken, permitirRoles(1), UsuarioController.alternarEstado);
router.patch('/:id/password', verificarToken, permitirRoles(1), UsuarioController.restablecerPassword);

module.exports = router;
