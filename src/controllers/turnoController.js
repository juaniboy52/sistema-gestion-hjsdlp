const TurnoModel = require('../models/turnoModel');
const { getQuery } = require('../config/database');

// Función auxiliar para barajar aleatoriamente un array (Fisher-Yates shuffle)
function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const TurnoController = {
  // POST /api/turnos/asignar-automatico
  async asignarAutomatico(req, res) {
    try {
      const {
        idAnda = 1,
        anioCuaresma = 2026,
        cantidadTurnosProcesion = 10,
        montoQuetzales = 50.00
      } = req.body;

      const idUsuario = req.usuario ? req.usuario.idUsuario : 1;

      // 1. Obtener información del Anda
      const anda = await getQuery('SELECT * FROM Anda_Procesional WHERE ID_Anda = ?', [idAnda]);
      if (!anda) {
        return res.status(404).json({ mensaje: 'Anda procesional no encontrada' });
      }

      const brazosPorLado = anda.Brazos_Por_Lado; // 20 brazos
      const totalBrazosPorTurno = brazosPorLado * 2; // 40 cargadores

      // 2. Obtener devotos pendientes ordenados por estatura
      const devotos = await TurnoModel.obtenerDevotosPendientes(idAnda, anioCuaresma);
      if (devotos.length === 0) {
        return res.status(400).json({ mensaje: 'No hay devotos pendientes de asignación para este año' });
      }

      // 3. Cargar historial de años previos para cada devoto
      const historialDevotos = new Map();
      for (const d of devotos) {
        const turnosPrevios = await TurnoModel.obtenerHistorialTurnosDevoto(d.ID_Devoto, idAnda, anioCuaresma);
        historialDevotos.set(d.ID_Devoto, new Set(turnosPrevios));
      }

      // 4. Mapear brazos ya ocupados este año
      const asignadosActuales = await TurnoModel.obtenerTurnosAsignadosAnio(idAnda, anioCuaresma);
      const matrizOcupados = new Set(
        asignadosActuales.map(a => `${a.Numero_Turno}-${a.Lado_Brazo}-${a.Numero_Brazo}`)
      );

      const asignacionesRealizadas = [];
      const devotosAsignadosIds = new Set();

      // 5. Asignación turno por turno por bloques de altura
      for (let turno = 1; turno <= cantidadTurnosProcesion; turno++) {
        // Filtrar devotos candidatos para este turno que NO lo hayan cargado antes
        const candidatos = devotos.filter(
          d => !devotosAsignadosIds.has(d.ID_Devoto) && !historialDevotos.get(d.ID_Devoto).has(turno)
        );

        if (candidatos.length === 0) continue;

        // Armar la lista de espacios disponibles para este turno
        const espaciosDisponibles = [];
        for (let b = 1; b <= brazosPorLado; b++) {
          if (!matrizOcupados.has(`${turno}-DERECHO-${b}`)) {
            espaciosDisponibles.push({ lado: 'DERECHO', brazo: b });
          }
          if (!matrizOcupados.has(`${turno}-IZQUIERDO-${b}`)) {
            espaciosDisponibles.push({ lado: 'IZQUIERDO', brazo: b });
          }
        }

        if (espaciosDisponibles.length === 0) continue;

        // Tomar el lote de devotos más cercanos en estatura para llenar los espacios
        const loteTurno = candidatos.slice(0, espaciosDisponibles.length);

        // Agrupar en pares de altura similar y aleatorizar lados
        // Ordenamos los espacios por número de brazo para que el peso baje proporcionalmente
        espaciosDisponibles.sort((a, b) => a.brazo - b.brazo);

        // Introducimos aleatoriedad controlada dentro de devotos de estaturas muy similares
        const loteAleatorizado = shuffleArray(loteTurno);

        for (let i = 0; i < loteAleatorizado.length; i++) {
          const devoto = loteAleatorizado[i];
          const espacio = espaciosDisponibles[i];

          const comprobante = await TurnoModel.registrarAsignacionAutomatica({
            idDevoto: devoto.ID_Devoto,
            idAnda,
            idUsuarioAsigno: idUsuario,
            anioCuaresma,
            numeroTurno: turno,
            ladoBrazo: espacio.lado,
            numeroBrazo: espacio.brazo,
            montoQuetzales
          });

          devotosAsignadosIds.add(devoto.ID_Devoto);
          matrizOcupados.add(`${turno}-${espacio.lado}-${espacio.brazo}`);

          asignacionesRealizadas.push({
            devoto: `${devoto.Nombres} ${devoto.Apellidos}`,
            estaturaCm: devoto.Estatura_Hombro_cm,
            turno,
            lado: espacio.lado,
            brazo: espacio.brazo,
            recibo: comprobante.numeroRecibo
          });
        }
      }

      return res.status(200).json({
        mensaje: 'Asignación automática y balanceada completada con éxito',
        totalAsignados: asignacionesRealizadas.length,
        devotosRestantesSinAsignar: devotos.length - asignacionesRealizadas.length,
        asignaciones: asignacionesRealizadas
      });

    } catch (error) {
      console.error('Error en asignación automática:', error);
      return res.status(500).json({ mensaje: 'Error al procesar la asignación automática balanceada' });
    }
  },

  // GET /api/turnos/anda/:idAnda/:anio
  async consultarPorAnda(req, res) {
    try {
      const { idAnda, anio } = req.params;
      const turnos = await TurnoModel.listarTurnosPorAnda(idAnda, anio);
      return res.status(200).json({
        idAnda,
        anioCuaresma: anio,
        totalAsignados: turnos.length,
        turnos
      });
    } catch (error) {
      console.error('Error al listar turnos:', error);
      return res.status(500).json({ mensaje: 'Error al consultar turnos' });
    }
  },

  // GET /api/turnos/recibo/:codigoValidacion
  async obtenerRecibo(req, res) {
    try {
      const { codigoValidacion } = req.params;
      const recibo = await TurnoModel.buscarComprobantePorCodigo(codigoValidacion);
      if (!recibo) {
        return res.status(404).json({ mensaje: 'Comprobante no encontrado' });
      }
      return res.status(200).json({ valido: true, recibo });
    } catch (error) {
      return res.status(500).json({ mensaje: 'Error al consultar comprobante' });
    }
  }
};

module.exports = TurnoController;
