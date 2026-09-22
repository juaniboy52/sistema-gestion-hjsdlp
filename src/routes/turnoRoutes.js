const express = require('express');
const router = express.Router();
const TurnoController = require('../controllers/turnoController');
const { verificarToken, permitirRoles } = require('../middlewares/authMiddleware');

// Asignación automática balanceada (Roles 1 y 2)
router.post('/asignar-automatico', verificarToken, permitirRoles(1, 2), TurnoController.asignarAutomatico);

// Consultas
router.get('/anda/:idAnda/:anio', verificarToken, TurnoController.consultarPorAnda);
router.get('/recibo/:codigoValidacion', TurnoController.obtenerRecibo);

module.exports = router;
