const ReportesModel = require('../models/reportesModel');

const ReportesController = {
  // GET /api/reportes/financiero
  async reporteFinanciero(req, res) {
    try {
      const { fechaInicio, fechaFin } = req.query;
      const data = await ReportesModel.balanceFinanciero({ fechaInicio, fechaFin });

      return res.status(200).json({
        periodo: {
          fechaInicio: fechaInicio || 'Desde el inicio',
          fechaFin: fechaFin || 'Hasta la fecha'
        },
        ...data
      });
    } catch (error) {
      console.error('Error al generar reporte financiero:', error);
      return res.status(500).json({ mensaje: 'Error interno al generar balance financiero' });
    }
  },

  // GET /api/reportes/inventario
  async reporteInventario(req, res) {
    try {
      const data = await ReportesModel.inventarioKardexResumen();
      return res.status(200).json(data);
    } catch (error) {
      console.error('Error al generar reporte de inventario:', error);
      return res.status(500).json({ mensaje: 'Error interno al generar reporte de inventarios' });
    }
  },

  // GET /api/reportes/procesion/:idAnda/:anio
  async estadisticasProcesion(req, res) {
    try {
      const { idAnda = 1, anio = 2026 } = req.params;
      const data = await ReportesModel.estadisticasProcesion(parseInt(idAnda, 10), parseInt(anio, 10));

      if (!data) {
        return res.status(404).json({ mensaje: 'Anda procesional no encontrada' });
      }

      return res.status(200).json(data);
    } catch (error) {
      console.error('Error al generar estadísticas procesionales:', error);
      return res.status(500).json({ mensaje: 'Error interno al calcular estadísticas procesionales' });
    }
  }
};

module.exports = ReportesController;
