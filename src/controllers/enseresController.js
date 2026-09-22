const EnseresModel = require('../models/enseresModel');

const EnseresController = {
  // GET /api/enseres
  async listar(req, res) {
    try {
      const catalogo = await EnseresModel.listarCatalogo();
      return res.status(200).json({
        totalArticulos: catalogo.length,
        catalogo
      });
    } catch (error) {
      console.error('Error al listar catálogo:', error);
      return res.status(500).json({ mensaje: 'Error al obtener el catálogo de enseres' });
    }
  },

  // POST /api/enseres
  async crear(req, res) {
    try {
      const { nombreArticulo, descripcion } = req.body;
      if (!nombreArticulo) {
        return res.status(400).json({ mensaje: 'El nombre del artículo es obligatorio' });
      }

      const nuevo = await EnseresModel.crearEnser({ nombreArticulo, descripcion });
      return res.status(201).json({
        mensaje: 'Enser registrado en el catálogo',
        articulo: nuevo
      });
    } catch (error) {
      console.error('Error al crear enser:', error);
      return res.status(500).json({ mensaje: 'Error interno al registrar el artículo' });
    }
  },

  // POST /api/enseres/kardex/movimiento
  async registrarMovimiento(req, res) {
    try {
      const {
        idEnser,
        idUsuarioResponsable = 1,
        tipoOperacion,
        cantidad,
        estadoConservacion = 'Bueno'
      } = req.body;

      if (!idEnser || !tipoOperacion || !cantidad) {
        return res.status(400).json({ mensaje: 'Faltan parámetros obligatorios (idEnser, tipoOperacion, cantidad)' });
      }

      const tipo = tipoOperacion.toUpperCase();
      if (tipo !== 'ENTRADA' && tipo !== 'SALIDA') {
        return res.status(400).json({ mensaje: 'El tipo de operación debe ser ENTRADA o SALIDA' });
      }

      const cant = parseInt(cantidad, 10);
      if (isNaN(cant) || cant <= 0) {
        return res.status(400).json({ mensaje: 'La cantidad debe ser un entero positivo' });
      }

      const enser = await EnseresModel.findById(idEnser);
      if (!enser) {
        return res.status(404).json({ mensaje: 'El artículo indicado no existe' });
      }

      // Regla de inventario: No permitir existencias negativas
      if (tipo === 'SALIDA' && enser.Total_Existencias < cant) {
        return res.status(409).json({
          mensaje: `Stock insuficiente. Existencias actuales: ${enser.Total_Existencias}, cantidad solicitada: ${cant}`
        });
      }

      const enserActualizado = await EnseresModel.registrarMovimiento({
        idEnser,
        idUsuarioResponsable,
        tipoOperacion: tipo,
        cantidad: cant,
        estadoConservacion
      });

      return res.status(201).json({
        mensaje: `Movimiento de ${tipo} registrado exitosamente`,
        articulo: enserActualizado
      });
    } catch (error) {
      console.error('Error al registrar movimiento Kardex:', error);
      return res.status(500).json({ mensaje: 'Error interno al procesar el movimiento de inventario' });
    }
  },

  // GET /api/enseres/:idEnser/kardex
  async verHistorial(req, res) {
    try {
      const { idEnser } = req.params;
      const enser = await EnseresModel.findById(idEnser);

      if (!enser) {
        return res.status(404).json({ mensaje: 'Artículo no encontrado' });
      }

      const movimientos = await EnseresModel.obtenerHistorialKardex(idEnser);
      return res.status(200).json({
        articulo: enser.Nombre_Articulo,
        existenciasActuales: enser.Total_Existencias,
        totalMovimientos: movimientos.length,
        movimientos
      });
    } catch (error) {
      console.error('Error al consultar historial Kardex:', error);
      return res.status(500).json({ mensaje: 'Error al consultar el historial del Kardex' });
    }
  }
};

module.exports = EnseresController;
