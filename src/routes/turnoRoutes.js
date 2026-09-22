const express = require('express');
const router = express.Router();
const TurnoController = require('../controllers/turnoController');
const { verificarToken, permitirRoles } = require('../middlewares/authMiddleware');

// Asignar turno: Solo Administrador (1) y Tesorero/Cajero (2)
router.post('/asignar', verificarToken, permitirRoles(1, 2), TurnoController.asignar);

// Consultar lista de cargadores del anda: Solo usuarios autenticados
router.get('/anda/:idAnda/:anio', verificarToken, TurnoController.consultarPorAnda);

// Consultar comprobante: Ruta pública (validada por el código de seguridad)
router.get('/recibo/:codigoValidacion', TurnoController.obtenerRecibo);

module.exports = router;
