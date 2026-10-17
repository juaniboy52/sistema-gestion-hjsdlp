const AndaModel = require('../models/andaModel');

const AndaController = {
  async listar(req, res) {
    try {
      const fn = typeof AndaModel.listarTodas === 'function' ? AndaModel.listarTodas : AndaModel.listarAndas;
      const andas = await fn.call(AndaModel, true);
      return res.status(200).json({ andas: andas || [] });
    } catch (error) {
      console.error("Error al listar andas:", error);
      return res.status(500).json({ mensaje: "Error al obtener lista de andas" });
    }
  },


  async crear(req, res) {
    try {
      const { nombreAnda, descripcion, cantidadBrazos, cantidadTurnos, anioTemporada } = req.body;
      if (!nombreAnda || !cantidadBrazos || !cantidadTurnos) {
        return res.status(400).json({ mensaje: 'Faltan campos obligatorios para el anda' });
      }

      const nueva = await AndaModel.crearAnda({
        nombreAnda,
        descripcion,
        cantidadBrazos: parseInt(cantidadBrazos, 10),
        cantidadTurnos: parseInt(cantidadTurnos, 10),
        anioTemporada: parseInt(anioTemporada || 2026, 10)
      });

      res.status(201).json({ mensaje: 'Anda configurada exitosamente', anda: nueva });
    } catch (err) {
      res.status(500).json({ mensaje: 'Error al crear anda', error: err.message });
    }
  },

  
  async actualizar(req, res) {
    try {
      const idAnda = parseInt(req.params.id, 10);
      const { nombreAnda, descripcion, cantidadBrazos, cantidadTurnos } = req.body;
      if (!nombreAnda || !cantidadBrazos || !cantidadTurnos) {
        return res.status(400).json({ mensaje: "Todos los campos obligatorios deben completarse" });
      }

      const actualizada = await AndaModel.actualizarAnda(idAnda, {
        nombreAnda,
        descripcion,
        cantidadBrazos: parseInt(cantidadBrazos, 10),
        cantidadTurnos: parseInt(cantidadTurnos, 10)
      });

      res.json({ mensaje: "Configuración del anda actualizada con éxito", anda: actualizada });
    } catch (err) {
      res.status(500).json({ mensaje: "Error al actualizar anda", error: err.message });
    }
  },

  
  async toggleEstado(req, res) {
    try {
      const idAnda = parseInt(req.params.id, 10);
      const activo = req.body && req.body.activo !== undefined ? req.body.activo : 0;
      const nuevoEstado = (activo === 1 || activo === true || activo === "1") ? 1 : 0;

      await AndaModel.cambiarEstadoAnda(idAnda, nuevoEstado);
      res.json({ 
        mensaje: `Anda ${nuevoEstado === 1 ? "activada" : "desactivada"} exitosamente.`,
        idAnda,
        estado: nuevoEstado
      });
    } catch (err) {
      console.error("Error en toggleEstado:", err);
      res.status(500).json({ mensaje: "Error al cambiar estado del anda", error: err.message });
    }
  },


  async ejecutarSorteo(req, res) {
    try {
      const idAnda = parseInt(req.params.id, 10);
      const resultado = await AndaModel.ejecutarSorteoPorAltura(idAnda, 2026);
      res.json({ mensaje: 'Sorteo y asignación ejecutados con éxito', resultado });
    } catch (err) {
      res.status(400).json({ mensaje: err.message });
    }
  }
};

module.exports = AndaController;
