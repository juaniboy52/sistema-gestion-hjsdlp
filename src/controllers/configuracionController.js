const { runQuery, getQuery } = require('../config/database');

const ConfiguracionController = {
  // GET /api/configuracion/:anio
  async obtenerConfiguracion(req, res) {
    try {
      const { anio } = req.params;
      const config = await getQuery('SELECT * FROM Configuracion_Temporada WHERE Anio_Cuaresma = ?', [anio]);
      if (!config) {
        return res.status(404).json({ mensaje: 'Configuración no encontrada para el año especificado' });
      }
      return res.status(200).json(config);
    } catch (error) {
      return res.status(500).json({ mensaje: 'Error al obtener configuración' });
    }
  },

  // PUT /api/configuracion/:anio
  async actualizarConfiguracion(req, res) {
    try {
      const { anio } = req.params;
      const {
        totalTurnosProcesion = 10,
        inscripcionesAbiertas,
        fechaInicioInscripcion,
        fechaFinInscripcion,
        permitirMultiplesTurnos = 1,
        maximoTurnosPorDevoto = 3
      } = req.body;

      // Cálculo automático: 10 turnos * 40 brazos = 400 devotos
      const capacidadMaxima = parseInt(totalTurnosProcesion, 10) * 40;

      await runQuery(`
        UPDATE Configuracion_Temporada 
        SET Total_Turnos_Procesion = ?,
            Capacidad_Maxima_Devotos = ?,
            Inscripciones_Abiertas = ?,
            Fecha_Inicio_Inscripcion = ?,
            Fecha_Fin_Inscripcion = ?,
            Permitir_Multiples_Turnos = ?,
            Maximo_Turnos_Por_Devoto = ?
        WHERE Anio_Cuaresma = ?
      `, [
        totalTurnosProcesion,
        capacidadMaxima,
        inscripcionesAbiertas,
        fechaInicioInscripcion,
        fechaFinInscripcion,
        permitirMultiplesTurnos,
        maximoTurnosPorDevoto,
        anio
      ]);

      return res.status(200).json({
        mensaje: 'Configuración de temporada actualizada exitosamente',
        resumen: {
          anio,
          turnosTotales: totalTurnosProcesion,
          capacidadTotalCupos: capacidadMaxima,
          inscripcionesAbiertas: inscripcionesAbiertas === 1 ? 'Sí' : 'No'
        }
      });
    } catch (error) {
      return res.status(500).json({ mensaje: 'Error al actualizar configuración' });
    }
  }
};

module.exports = ConfiguracionController;
