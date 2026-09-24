const TurnoModel = require('../models/turnoModel');
const DevotoModel = require('../models/devotoModel');
const { getQuery } = require('../config/database');

const TurnoController = {
  // POST /api/turnos/asignar
  async asignar(req, res) {
    try {
      const {
        idDevoto,
        idAnda = 1,
        anioCuaresma = 2026,
        numeroTurno,
        ladoBrazo,
        numeroBrazo,
        montoQuetzales = 50.00
      } = req.body;

      const idUsuarioAsigno = req.usuario ? req.usuario.idUsuario : 1;
      const config = req.configTemporada;

      if (!idDevoto || !numeroTurno || !ladoBrazo || !numeroBrazo) {
        return res.status(400).json({ mensaje: 'Faltan parámetros obligatorios' });
      }

      // 1. Validar que el turno esté dentro del total permitido (ej: 1 al 10)
      const turnoNum = parseInt(numeroTurno, 10);
      if (turnoNum < 1 || turnoNum > config.Total_Turnos_Procesion) {
        return res.status(400).json({
          mensaje: `Número de turno inválido. La procesión cuenta con ${config.Total_Turnos_Procesion} turnos en total (1 a ${config.Total_Turnos_Procesion}).`
        });
      }

      // 2. Validar regla de múltiples turnos por devoto
      const conteoTurnosDevoto = await getQuery(
        'SELECT COUNT(ID_Asignacion) as total FROM Asignacion_Turno WHERE ID_Devoto = ? AND ID_Anda = ? AND Anio_Cuaresma = ?',
        [idDevoto, idAnda, anioCuaresma]
      );

      if (config.Permitir_Multiples_Turnos === 1 && conteoTurnosDevoto.total >= config.Maximo_Turnos_Por_Devoto) {
        return res.status(409).json({
          mensaje: `Límite alcanzado: El devoto ya cuenta con ${conteoTurnosDevoto.total} turnos asignados (máximo permitido: ${config.Maximo_Turnos_Por_Devoto})`
        });
      }

      // 3. Prohibir dos brazos en el MISMO turno
      const enMismoTurno = await TurnoModel.verificarDevotoEnTurno(idDevoto, idAnda, anioCuaresma, turnoNum);
      if (enMismoTurno) {
        return res.status(409).json({
          mensaje: `El devoto ya tiene un brazo asignado en el Turno No. ${turnoNum}. Debe elegir un turno diferente.`
        });
      }

      // 4. Validar colisión física del brazo solicitado
      const flanco = ladoBrazo.toUpperCase();
      const brazoOcupado = await TurnoModel.verificarBrazoOcupado(idAnda, anioCuaresma, turnoNum, flanco, numeroBrazo);
      if (brazoOcupado) {
        return res.status(409).json({
          mensaje: `El brazo ${numeroBrazo} (${flanco}) del Turno ${turnoNum} ya se encuentra ocupado.`
        });
      }

      // 5. Asignar y generar recibo
      const comprobante = await TurnoModel.asignarTurnoConRecibo({
        idDevoto,
        idAnda,
        idUsuarioAsigno,
        anioCuaresma,
        numeroTurno: turnoNum,
        ladoBrazo: flanco,
        numeroBrazo,
        montoQuetzales
      });

      return res.status(201).json({
        mensaje: `Turno No. ${turnoNum} asignado exitosamente al devoto`,
        comprobante
      });
    } catch (error) {
      console.error('Error al asignar turno:', error);
      return res.status(500).json({ mensaje: 'Error interno al asignar turno' });
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
      return res.status(500).json({ mensaje: 'Error al consultar recibo' });
    }
  }
};

module.exports = TurnoController;
