const express = require('express');
const router = express.Router();
const UsuarioController = require('../controllers/usuarioController');
const { verificarToken, permitirRoles } = require('../middlewares/authMiddleware');

router.get('/', verificarToken, permitirRoles(1), UsuarioController.listar);
router.post('/', verificarToken, permitirRoles(1), UsuarioController.crear);
router.patch('/:id/estado', verificarToken, permitirRoles(1), UsuarioController.alternarEstado);

module.exports = router;
