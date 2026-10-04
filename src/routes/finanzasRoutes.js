const express = require('express');
const router = express.Router();
const FinanzasController = require('../controllers/finanzasController');
const { verificarToken, permitirRoles } = require('../middlewares/authMiddleware');

// Permitir Roles 1 (Admin), 2 (Secretaría), 3 (Tesorero) y 5 (Cajero)
router.post('/ofrenda', verificarToken, permitirRoles(1, 2, 3, 5), FinanzasController.registrarOfrenda);

// Exclusivo Tesorería y Admin (el Cajero queda bloqueado)
router.post('/egreso', verificarToken, permitirRoles(1, 3), FinanzasController.registrarEgreso);

// Reporte de cobros propios por día para Cajero (5) y Admin (1)
router.get('/mis-cobros-dia', verificarToken, permitirRoles(1, 5), FinanzasController.misCobrosDelDia);

module.exports = router;
