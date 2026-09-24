const { getQuery } = require('../config/database');

async function validarInscripcionesAbiertas(req, res, next) {
  try {
    const anio = req.body.anioCuaresma || 2026;
    const config = await getQuery('SELECT * FROM Configuracion_Temporada WHERE Anio_Cuaresma = ?', [anio]);

    if (!config) {
      return res.status(400).json({ mensaje: `No existe configuración de procesión para el año ${anio}` });
    }

    // 1. Validar switch manual de inscripciones
    if (config.Inscripciones_Abiertas !== 1) {
      return res.status(403).json({ mensaje: 'El periodo de inscripciones se encuentra cerrado administrativamente' });
    }

    // 2. Validar rango de fechas
    const hoy = new Date().toISOString().split('T')[0];
    if (config.Fecha_Inicio_Inscripcion && hoy < config.Fecha_Inicio_Inscripcion) {
      return res.status(403).json({ 
        mensaje: `Las inscripciones aún no inician. Fecha de apertura: ${config.Fecha_Inicio_Inscripcion}` 
      });
    }
    if (config.Fecha_Fin_Inscripcion && hoy > config.Fecha_Fin_Inscripcion) {
      return res.status(403).json({ 
        mensaje: `El periodo de inscripciones finalizó el ${config.Fecha_Fin_Inscripcion}` 
      });
    }

    // 3. Validar cupo global (máximo 400 cupos para 10 turnos)
    const ocupacion = await getQuery(
      'SELECT COUNT(ID_Asignacion) as Total FROM Asignacion_Turno WHERE ID_Anda = 1 AND Anio_Cuaresma = ?',
      [anio]
    );

    if (ocupacion.Total >= config.Capacidad_Maxima_Devotos) {
      return res.status(409).json({ 
        mensaje: `Cupo agotado. Se han cubierto los ${config.Capacidad_Maxima_Devotos} brazos disponibles para este año.` 
      });
    }

    req.configTemporada = config;
    next();
  } catch (error) {
    return res.status(500).json({ mensaje: 'Error al verificar disponibilidad de inscripciones' });
  }
}

module.exports = validarInscripcionesAbiertas;
