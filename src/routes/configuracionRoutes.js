const express = require('express');
const router = express.Router();
const ConfiguracionController = require('../controllers/configuracionController');
const { verificarToken, permitirRoles } = require('../middlewares/authMiddleware');

router.get('/:anio', verificarToken, ConfiguracionController.obtenerConfiguracion);
router.put('/:anio', verificarToken, permitirRoles(1), ConfiguracionController.actualizarConfiguracion);

module.exports = router;
