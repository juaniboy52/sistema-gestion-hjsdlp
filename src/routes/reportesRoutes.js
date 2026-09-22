const express = require('express');
const router = express.Router();
const ReportesController = require('../controllers/reportesController');
const { verificarToken, permitirRoles } = require('../middlewares/authMiddleware');

// Reporte Contable: Solo Administrador General (1) y Tesorero (2)
router.get('/financiero', verificarToken, permitirRoles(1, 2), ReportesController.reporteFinanciero);

// Reporte de Inventarios: Administrador General (1) y Encargado de Enseres (3)
router.get('/inventario', verificarToken, permitirRoles(1, 3), ReportesController.reporteInventario);

// Estadísticas de Procesión y Anda: Disponible para todo el personal directivo (1, 2, 3)
router.get('/procesion/:idAnda/:anio', verificarToken, permitirRoles(1, 2, 3), ReportesController.estadisticasProcesion);

module.exports = router;
