const express = require('express');
const router = express.Router();
const TurnoController = require('../controllers/turnoController');

router.post('/asignar', TurnoController.asignar);
router.get('/anda/:idAnda/:anio', TurnoController.consultarPorAnda);
router.get('/recibo/:codigoValidacion', TurnoController.obtenerRecibo);

module.exports = router;
