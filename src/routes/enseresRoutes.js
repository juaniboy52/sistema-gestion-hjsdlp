const express = require('express');
const router = express.Router();
const EnseresController = require('../controllers/enseresController');
const { verificarToken, permitirRoles } = require('../middlewares/authMiddleware');

// Solo Administrador (1) y Encargado de Enseres (4) tienen acceso
router.use(verificarToken, permitirRoles(1, 4));

router.get('/', EnseresController.listar);
router.post('/', EnseresController.crear);
router.post('/kardex/movimiento', EnseresController.registrarMovimiento);
router.get('/:idEnser/kardex', EnseresController.verHistorial);

module.exports = router;
