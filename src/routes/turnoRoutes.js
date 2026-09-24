const express = require('express');
const router = express.Router();
const TurnoController = require('../controllers/turnoController');
const { verificarToken, permitirRoles } = require('../middlewares/authMiddleware');
const validarInscripcionesAbiertas = require('../middlewares/inscripcionMiddleware');

// Asignar turno: Requiere Token, Rol 1 o 2, y que las inscripciones estén abiertas
router.post('/asignar', verificarToken, permitirRoles(1, 2), validarInscripcionesAbiertas, TurnoController.asignar);

router.get('/anda/:idAnda/:anio', verificarToken, TurnoController.consultarPorAnda);
router.get('/recibo/:codigoValidacion', TurnoController.obtenerRecibo);

module.exports = router;
