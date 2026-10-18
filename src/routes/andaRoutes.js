const express = require('express');
const router = express.Router();
const AndaController = require('../controllers/andaController');
const { verificarToken, permitirRoles } = require('../middlewares/authMiddleware');

router.get('/', verificarToken, AndaController.listar);
router.post('/', verificarToken, permitirRoles(1), AndaController.crear);
router.put('/:id', verificarToken, permitirRoles(1), AndaController.actualizar);
router.patch('/:id/estado', verificarToken, permitirRoles(1), AndaController.toggleEstado);
router.post('/:id/sorteo', verificarToken, permitirRoles(1), AndaController.ejecutarSorteo);

module.exports = router;
