const express = require('express');
const router = express.Router();
const EnseresController = require('../controllers/enseresController');
const { verificarToken, permitirRoles } = require('../middlewares/authMiddleware');

router.use(verificarToken);

// Consulta y movimientos permitidos para Admin (1) y Enseres (4)
router.get('/', permitirRoles(1, 4), EnseresController.listar);
router.post('/kardex/movimiento', permitirRoles(1, 4), EnseresController.registrarMovimiento);
router.get('/:idEnser/kardex', permitirRoles(1, 4), EnseresController.verHistorial);

// Modificación y bajas exclusivo para Administradores (1)
router.post('/', permitirRoles(1), EnseresController.crear);
router.put('/:id', permitirRoles(1), EnseresController.actualizar);
router.patch('/:id/estado', permitirRoles(1), EnseresController.alternarEstado);

module.exports = router;
