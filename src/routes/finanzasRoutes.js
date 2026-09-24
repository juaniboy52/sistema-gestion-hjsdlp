const express = require('express');
const router = express.Router();
const FinanzasController = require('../controllers/finanzasController');
const { verificarToken, permitirRoles } = require('../middlewares/authMiddleware');

// Ingresos y Ofrendas extraordinarias (Roles 1 y 2)
router.post('/ofrenda', verificarToken, permitirRoles(1, 2), FinanzasController.registrarOfrenda);

// Egresos y Liquidación de gastos de caja (Roles 1 y 2)
router.post('/egreso', verificarToken, permitirRoles(1, 2), FinanzasController.registrarEgreso);

module.exports = router;
