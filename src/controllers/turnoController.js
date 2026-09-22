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
        idUsuarioAsigno = 1,
        anioCuaresma = 2026,
        numeroTurno,
        ladoBrazo,
        numeroBrazo,
        montoQuetzales = 50.00
      } = req.body;

      if (!idDevoto || !numeroTurno || !ladoBrazo || !numeroBrazo) {
        return res.status(400).json({ mensaje: 'Faltan parámetros obligatorios para asignar el turno' });
      }

      const flanco = ladoBrazo.toUpperCase();
      if (flanco !== 'DERECHO' && flanco !== 'IZQUIERDO') {
        return res.status(400).json({ mensaje: 'El lado del brazo debe ser DERECHO o IZQUIERDO' });
      }

      const devoto = await DevotoModel.findById(idDevoto);
      if (!devoto) {
        return res.status(404).json({ mensaje: 'El devoto indicado no existe en el sistema' });
      }

      const anda = await getQuery('SELECT * FROM Anda_Procesional WHERE ID_Anda = ?', [idAnda]);
      if (!anda) {
        return res.status(404).json({ mensaje: 'El anda procesional no existe' });
      }

      const brazoNum = parseInt(numeroBrazo, 10);
      if (brazoNum < 1 || brazoNum > anda.Brazos_Por_Lado) {
        return res.status(400).json({
          mensaje: `Número de brazo inválido. El anda posee ${anda.Brazos_Por_Lado} brazos por flanco (1 a ${anda.Brazos_Por_Lado})`
        });
      }

      const turnoExistenteDevoto = await TurnoModel.verificarDevotoEnTurno(idDevoto, idAnda, anioCuaresma, numeroTurno);
      if (turnoExistenteDevoto) {
        return res.status(409).json({ mensaje: 'El devoto ya tiene un brazo asignado en este mismo turno' });
      }

      const brazoOcupado = await TurnoModel.verificarBrazoOcupado(idAnda, anioCuaresma, numeroTurno, flanco, brazoNum);
      if (brazoOcupado) {
        return res.status(409).json({
          mensaje: `El brazo número ${brazoNum} (${flanco}) ya se encuentra asignado a otro cargador en el Turno ${numeroTurno}`
        });
      }

      const resultado = await TurnoModel.asignarTurnoConRecibo({
        idDevoto,
        idAnda,
        idUsuarioAsigno,
        anioCuaresma,
        numeroTurno,
        ladoBrazo: flanco,
        numeroBrazo: brazoNum,
        montoQuetzales: parseFloat(montoQuetzales)
      });

      return res.status(201).json({
        mensaje: 'Turno asignado e inscripción procesada con éxito',
        comprobante: resultado
      });
    } catch (error) {
      console.error('Error al procesar asignación:', error);
      return res.status(500).json({ mensaje: 'Error interno al asignar el turno procesional' });
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
      return res.status(500).json({ mensaje: 'Error al consultar los turnos del anda' });
    }
  },

  // GET /api/turnos/recibo/:codigoValidacion
  async obtenerRecibo(req, res) {
    try {
      const { codigoValidacion } = req.params;

      if (!codigoValidacion || codigoValidacion.trim().length < 10) {
        return res.status(400).json({ mensaje: 'Código de validación no válido' });
      }

      const recibo = await TurnoModel.buscarComprobantePorCodigo(codigoValidacion.trim().toUpperCase());

      if (!recibo) {
        return res.status(404).json({
          valido: false,
          mensaje: 'No se encontró ningún comprobante emitido con el código ingresado'
        });
      }

      // Estructura lista para impresión térmica o comprobante en pantalla
      return res.status(200).json({
        valido: true,
        institucion: {
          nombre: 'Hermandad de Jesús Sepultado de la Paz',
          sede: 'Parroquia Nuestra Señora de los Remedios, Iglesia Cristo Rey',
          ciudad: 'Guatemala, C.A.'
        },
        recibo: {
          numeroRecibo: recibo.Numero_Recibo,
          codigoValidacion: recibo.Codigo_Validacion_Recibo,
          fechaEmision: recibo.Fecha_Transaccion,
          cajero: recibo.Cajero_Responsable,
          concepto: recibo.Concepto_Descripcion,
          monto: `Q${parseFloat(recibo.Monto_Quetzales).toFixed(2)}`,
          metodoPago: recibo.Metodo_Pago
        },
        devoto: {
          idDevoto: recibo.ID_Devoto,
          dpi: recibo.DPI,
          nombreCompleto: `${recibo.Devoto_Nombres} ${recibo.Devoto_Apellidos}`,
          telefono: recibo.Devoto_Telefono,
          correo: recibo.Devoto_Correo,
          estaturaHombroCm: `${recibo.Estatura_Hombro_cm} cm`
        },
        detalleTurno: {
          anda: recibo.Nombre_Anda,
          totalBrazosAnda: recibo.Cantidad_Total_Brazos,
          anioCuaresma: recibo.Anio_Cuaresma,
          numeroTurno: recibo.Numero_Turno,
          ladoBrazo: recibo.Lado_Brazo,
          numeroBrazo: recibo.Numero_Brazo,
          fechaAsignacion: recibo.Fecha_Asignacion
        }
      });
    } catch (error) {
      console.error('Error al recuperar comprobante:', error);
      return res.status(500).json({ mensaje: 'Error interno al consultar el comprobante' });
    }
  }
};

module.exports = TurnoController;
