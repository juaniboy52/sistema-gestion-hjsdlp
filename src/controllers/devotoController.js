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

      const existe = await DevotoModel.findByDPI(dpi);
      if (existe) {
        return res.status(409).json({ mensaje: 'Ya existe un devoto registrado con este DPI' });
      }

      const nuevoDevoto = await DevotoModel.create({
        dpi,
        nombres,
        apellidos,
        telefono,
        correo,
        estaturaHombroCm
      });

      return res.status(201).json({
        mensaje: 'Devoto registrado exitosamente',
        devoto: nuevoDevoto
      });
    } catch (error) {
      console.error('Error al registrar devoto:', error);
      return res.status(500).json({ mensaje: 'Error interno al registrar el devoto' });
    }
  },

  // PUT /api/devotos/:id
  async actualizarDevoto(req, res) {
    try {
      const { id } = req.params;
      const { dpi, nombres, apellidos, telefono, correo, estaturaHombroCm, estadoActivo } = req.body;

      if (!dpi || !nombres || !apellidos || !telefono || !correo || estaturaHombroCm === undefined) {
        return res.status(400).json({ mensaje: 'Todos los campos son obligatorios' });
      }

      const existe = await DevotoModel.findById(id);
      if (!existe) {
        return res.status(404).json({ mensaje: 'Devoto no encontrado' });
      }

      const actualizado = await DevotoModel.update(id, {
        dpi,
        nombres,
        apellidos,
        telefono,
        correo,
        estaturaHombroCm,
        estadoActivo: estadoActivo !== undefined ? estadoActivo : existe.Estado_Activo
      });

      return res.status(200).json({ mensaje: 'Datos del devoto actualizados exitosamente', devoto: actualizado });
    } catch (error) {
      console.error('Error al actualizar devoto:', error);
      return res.status(500).json({ mensaje: 'Error al actualizar el devoto en el servidor' });
    }
  }
};

module.exports = DevotoController;
