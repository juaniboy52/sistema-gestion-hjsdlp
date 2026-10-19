const express = require('express');
const router = express.Router();
const AuditoriaModel = require('../models/auditoriaModel');
const { verificarToken, permitirRoles } = require('../middlewares/authMiddleware');

// Exclusivo Administrador General (Rol 1)
router.get('/', verificarToken, permitirRoles(1), async (req, res) => {
  try {
    const { fechaInicio, fechaFin, buscar } = req.query;

    const bitacora = await AuditoriaModel.listarFiltrado({
      fechaInicio,
      fechaFin,
      buscar
    });

    return res.status(200).json({
      totalRegistros: bitacora.length,
      bitacora
    });
  } catch (error) {
    console.error('Error al consultar bitácora de auditoría:', error);
    return res.status(500).json({ mensaje: 'Error interno al consultar la bitácora' });
  }
});

module.exports = router;
