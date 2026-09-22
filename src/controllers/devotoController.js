const DevotoModel = require('../models/devotoModel');

const DevotoController = {
  // GET /api/devotos
  async obtenerDevotos(req, res) {
    try {
      const devotos = await DevotoModel.findAll();
      return res.status(200).json({
        total: devotos.length,
        devotos
      });
    } catch (error) {
      console.error('Error al listar devotos:', error);
      return res.status(500).json({ mensaje: 'Error interno del servidor al consultar devotos' });
    }
  },

  // GET /api/devotos/:dpi
  async obtenerPorDPI(req, res) {
    try {
      const { dpi } = req.params;
      const devoto = await DevotoModel.findByDPI(dpi);

      if (!devoto) {
        return res.status(404).json({ mensaje: 'Devoto no encontrado con el DPI proporcionado' });
      }

      return res.status(200).json(devoto);
    } catch (error) {
      console.error('Error al buscar devoto:', error);
      return res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
  },

  // POST /api/devotos
  async registrarDevoto(req, res) {
    try {
      const { dpi, nombres, apellidos, telefono, correo, estaturaHombroCm } = req.body;

      // 1. Validaciones básicas
      if (!dpi || !nombres || !apellidos || !telefono || !correo || !estaturaHombroCm) {
        return res.status(400).json({ mensaje: 'Todos los campos son obligatorios' });
      }

      // 2. Validación de formato de DPI (13 dígitos numéricos de Guatemala)
      const dpiRegex = /^[0-9]{13}$/;
      if (!dpiRegex.test(dpi)) {
        return res.status(400).json({ mensaje: 'El DPI debe contener exactamente 13 dígitos numéricos' });
      }

      // 3. Validación de estatura lógica en centímetros
      const estatura = parseFloat(estaturaHombroCm);
      if (isNaN(estatura) || estatura < 120 || estatura > 210) {
        return res.status(400).json({ mensaje: 'La estatura de hombro debe ser un valor válido entre 120 cm y 210 cm' });
      }

      // 4. Verificar duplicidad de DPI
      const existeDevoto = await DevotoModel.findByDPI(dpi);
      if (existeDevoto) {
        return res.status(409).json({ mensaje: 'Ya existe un devoto registrado con este número de DPI' });
      }

      // 5. Inserción
      const nuevoDevoto = await DevotoModel.create({
        dpi,
        nombres,
        apellidos,
        telefono,
        correo,
        estaturaHombroCm: estatura
      });

      return res.status(201).json({
        mensaje: 'Devoto registrado exitosamente en el padrón',
        devoto: nuevoDevoto
      });
    } catch (error) {
      console.error('Error al registrar devoto:', error);
      return res.status(500).json({ mensaje: 'Error al registrar devoto en la base de datos' });
    }
  }
};

module.exports = DevotoController;
