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

      if (!dpi || !nombres || !apellidos || !telefono || !correo || estaturaHombroCm === undefined) {
        return res.status(400).json({ mensaje: 'Todos los campos son obligatorios' });
      }

      // Validación de DPI: 13 dígitos numéricos
      const dpiRegex = /^[0-9]{13}$/;
      if (!dpiRegex.test(dpi)) {
        return res.status(400).json({ mensaje: 'El DPI debe contener exactamente 13 dígitos numéricos' });
      }

      // Validación de Estatura: Entero estricto en centímetros
      const estatura = Number(estaturaHombroCm);
      if (!Number.isInteger(estatura) || estatura < 120 || estatura > 210) {
        return res.status(400).json({ 
          mensaje: 'La estatura de hombro debe ser un número entero en centímetros entre 120 y 210 (sin decimales)' 
        });
      }

      // Evitar duplicidad de DPI
      const existeDevoto = await DevotoModel.findByDPI(dpi);
      if (existeDevoto) {
        return res.status(409).json({ mensaje: 'Ya existe un devoto registrado con este número de DPI' });
      }

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
