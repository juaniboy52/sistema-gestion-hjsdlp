const express = require('express');
const router = express.Router();
const AuditoriaModel = require('../models/auditoriaModel');

router.get('/', async (req, res) => {
  try {
    const bitacora = await AuditoriaModel.listarUltimos(50);
    return res.status(200).json({
      totalRegistros: bitacora.length,
      bitacora
    });
  } catch (error) {
    console.error('Error al consultar bitácora:', error);
    return res.status(500).json({ mensaje: 'Error interno al consultar la bitácora' });
  }
});

module.exports = router;
