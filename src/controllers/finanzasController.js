const { runQuery, getQuery, allQuery } = require('../config/database');
const crypto = require('crypto');

const FinanzasController = {
  // GET /api/finanzas/transacciones (Historial enriquecido para Admin y Tesorero)
  async listarTransacciones(req, res) {
    try {
      const { fechaInicio, fechaFin, tipo, buscar } = req.query;

      let condiciones = [];
      let params = [];

      // Filtro por tipo de movimiento (Ingreso / Egreso)
      if (tipo && (tipo === 'Ingreso' || tipo === 'Egreso')) {
        condiciones.push('T.Tipo_Movimiento = ?');
        params.push(tipo);
      }

      // Filtro por rango de fechas
      if (fechaInicio) {
        condiciones.push('DATE(T.Fecha_Transaccion) >= DATE(?)');
        params.push(fechaInicio);
      }
      if (fechaFin) {
        condiciones.push('DATE(T.Fecha_Transaccion) <= DATE(?)');
        params.push(fechaFin);
      }

      // Filtro por texto (No. Recibo, Devoto o Encargado del gasto)
      if (buscar && buscar.trim() !== '') {
        const termino = `%${buscar.trim()}%`;
        condiciones.push(`(
          T.Numero_Recibo LIKE ? OR
          T.Encargado_Gasto LIKE ? OR
          T.Concepto_Descripcion LIKE ? OR
          (D.Nombres || ' ' || D.Apellidos) LIKE ? OR
          D.DPI LIKE ?
        )`);
        params.push(termino, termino, termino, termino, termino);
      }

      const whereClause = condiciones.length > 0 ? 'WHERE ' + condiciones.join(' AND ') : '';

      // Consulta con cruce a Devoto, Cajero, Asignación y Anda Procesional
      const query = `
        SELECT 
          T.ID_Transaccion,
          T.Numero_Recibo,
          T.Tipo_Movimiento,
          T.Concepto_Descripcion,
          T.Monto_Quetzales,
          T.Metodo_Pago,
          T.Codigo_Validacion_Recibo,
          T.Encargado_Gasto,
          T.Fecha_Transaccion,
          U.Nombres AS Cajero_Nombres,
          U.Apellidos AS Cajero_Apellidos,
          D.ID_Devoto,
          D.DPI AS Devoto_DPI,
          D.Nombres AS Devoto_Nombres,
          D.Apellidos AS Devoto_Apellidos,
          D.Estatura_Hombro_cm AS Devoto_Estatura,
          CA.ID_Anda,
          CA.Nombre_Anda,
          A.Numero_Turno,
          A.Brazo_Asignado,
          A.Estado_Inscripcion
        FROM Transaccion_Financiera T
        LEFT JOIN Usuario U ON T.ID_Usuario_Cajero = U.ID_Usuario
        LEFT JOIN Devoto D ON T.ID_Devoto = D.ID_Devoto
        LEFT JOIN Asignacion_Turno A ON T.Codigo_Validacion_Recibo = A.Codigo_Verificacion
        LEFT JOIN Configuracion_Anda CA ON A.ID_Anda = CA.ID_Anda
        ${whereClause}
        ORDER BY T.Fecha_Transaccion DESC, T.ID_Transaccion DESC
        LIMIT 200
      `;

      const transacciones = await allQuery(query, params);

      return res.status(200).json({
        total: transacciones.length,
        transacciones
      });
    } catch (error) {
      console.error('Error al listar transacciones financieras:', error);
      return res.status(500).json({ mensaje: 'Error al consultar historial de transacciones' });
    }
  },

  // POST /api/finanzas/cobro-turno (Inscripción a Anda)
  async registrarCobroInscripcion(req, res) {
    try {
      const {
        idDevoto,
        idAnda,
        montoQuetzales = 50.00,
        metodoPago = 'Efectivo',
        anioCuaresma = 2026
      } = req.body;

      const idUsuarioCajero = req.usuario ? req.usuario.idUsuario : 1;

      if (!idDevoto || !idAnda) {
        return res.status(400).json({ mensaje: 'Debe seleccionar el devoto y el anda procesional' });
      }

      const monto = parseFloat(montoQuetzales);
      if (isNaN(monto) || monto <= 0) {
        return res.status(400).json({ mensaje: 'El monto ingresado no es válido' });
      }

      // 1. Consultar devoto
      const devoto = await getQuery(
        'SELECT ID_Devoto, Nombres, Apellidos, DPI, Estatura_Hombro_cm FROM Devoto WHERE ID_Devoto = ?',
        [idDevoto]
      );
      if (!devoto) {
        return res.status(404).json({ mensaje: 'Devoto no encontrado' });
      }

      // 2. Consultar anda
      const anda = await getQuery(
        'SELECT ID_Anda, Nombre_Anda, Anio_Temporada, Inscripciones_Abiertas FROM Configuracion_Anda WHERE ID_Anda = ?',
        [idAnda]
      );
      if (!anda) {
        return res.status(404).json({ mensaje: 'Anda procesional no encontrada' });
      }

      // Validar periodo de inscripciones activo
      if (Number(anda.Inscripciones_Abiertas) !== 1) {
        return res.status(403).json({
          mensaje: `El periodo de inscripciones para el cortejo "${anda.Nombre_Anda}" se encuentra CERRADO temporalmente.`
        });
      }

      // 3. Validar si ya cuenta con inscripción pagada en esa anda este año
      const yaInscrito = await getQuery(
        'SELECT ID_Asignacion FROM Asignacion_Turno WHERE ID_Devoto = ? AND ID_Anda = ? AND Anio_Cuaresma = ?',
        [idDevoto, idAnda, anioCuaresma]
      );
      if (yaInscrito) {
        return res.status(409).json({
          mensaje: `El devoto ${devoto.Nombres} ${devoto.Apellidos} ya se encuentra inscrito en ${anda.Nombre_Anda} para la temporada ${anioCuaresma}.`
        });
      }

      const timestamp = Date.now().toString().slice(-6) + Math.floor(Math.random() * 10);
      const numeroRecibo = `REC-${anioCuaresma}-${timestamp}`;
      const codigoValidacion = crypto.randomBytes(16).toString('hex').toUpperCase();

      // 4. Registrar inscripción en estado PAGADO (turno y brazo pendientes para algoritmo automático)
      await runQuery(
        `INSERT INTO Asignacion_Turno (
          ID_Devoto, ID_Anda, Anio_Cuaresma, Numero_Turno, Brazo_Asignado, Codigo_Verificacion, Estado_Inscripcion, Fecha_Asignacion
        ) VALUES (?, ?, ?, 0, NULL, ?, 'PAGADO', CURRENT_TIMESTAMP)`,
        [idDevoto, idAnda, anioCuaresma, codigoValidacion]
      );

      // 4.1 Actualizar estado y vinculación del devoto
      await runQuery(
        'UPDATE Devoto SET ID_Anda = ?, Turno_Pagado = 1 WHERE ID_Devoto = ?',
        [idAnda, idDevoto]
      );

      // 5. Registrar transacción financiera de ingreso
      const concepto = `Inscripción Anda: ${anda.Nombre_Anda} - Temporada ${anioCuaresma}`;
      await runQuery(
        `INSERT INTO Transaccion_Financiera (
          Numero_Recibo, ID_Usuario_Cajero, ID_Devoto, Tipo_Movimiento, Concepto_Descripcion, Monto_Quetzales, Metodo_Pago, Codigo_Validacion_Recibo
        ) VALUES (?, ?, ?, 'Ingreso', ?, ?, ?, ?)`,
        [numeroRecibo, idUsuarioCajero, idDevoto, concepto, monto, metodoPago, codigoValidacion]
      );

      return res.status(201).json({
        mensaje: `Inscripción registrada y cobrada con éxito para ${anda.Nombre_Anda}`,
        comprobante: {
          numeroRecibo,
          fecha: new Date().toISOString(),
          devoto: `${devoto.Nombres} ${devoto.Apellidos}`,
          dpi: devoto.DPI || 'N/A',
          estatura: devoto.Estatura_Hombro_cm || 0,
          anda: anda.Nombre_Anda,
          concepto,
          montoQuetzales: monto,
          metodoPago,
          codigoValidacion,
          estadoAsignacion: 'PENDIENTE DE ASIGNACIÓN AUTOMÁTICA POR ESTATURA'
        }
      });
    } catch (error) {
      console.error('Error al registrar cobro de inscripción:', error);
      return res.status(500).json({ mensaje: 'Error interno al registrar cobro de inscripción' });
    }
  },

  // POST /api/finanzas/ofrenda
  async registrarOfrenda(req, res) {
    try {
      const {
        nombreBienhechor = 'Devoto Anónimo / Fiel General',
        conceptoDescripcion,
        montoQuetzales,
        metodoPago = 'Efectivo',
        anioCuaresma = 2026
      } = req.body;

      const idUsuarioCajero = req.usuario ? req.usuario.idUsuario : 1;

      if (!conceptoDescripcion || !montoQuetzales) {
        return res.status(400).json({ 
          mensaje: 'El concepto de la ofrenda y el monto en Quetzales son obligatorios' 
        });
      }

      const monto = parseFloat(montoQuetzales);
      if (isNaN(monto) || monto <= 0) {
        return res.status(400).json({ mensaje: 'El monto debe ser un valor numérico mayor a 0' });
      }

      const timestamp = Date.now().toString().slice(-6) + Math.floor(Math.random() * 10);
      const numeroRecibo = `OFR-${anioCuaresma}-${timestamp}`;
      const codigoValidacion = crypto.randomBytes(16).toString('hex').toUpperCase();

      await runQuery(`
        INSERT INTO Transaccion_Financiera (
          Numero_Recibo,
          ID_Usuario_Cajero,
          ID_Devoto,
          Tipo_Movimiento,
          Concepto_Descripcion,
          Monto_Quetzales,
          Metodo_Pago,
          Codigo_Validacion_Recibo
        ) VALUES (?, ?, NULL, 'Ingreso', ?, ?, ?, ?)
      `, [
        numeroRecibo,
        idUsuarioCajero,
        `[OFRENDA/DONATIVO: ${nombreBienhechor}] ${conceptoDescripcion}`,
        monto,
        metodoPago,
        codigoValidacion
      ]);

      return res.status(201).json({
        mensaje: 'Ofrenda / Ingreso extraordinario registrado exitosamente en caja',
        comprobante: {
          numeroRecibo,
          codigoValidacion,
          donante: nombreBienhechor,
          concepto: conceptoDescripcion,
          montoQuetzales: monto,
          metodoPago,
          fecha: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error al registrar ofrenda:', error);
      return res.status(500).json({ mensaje: 'Error interno al registrar la ofrenda en el sistema' });
    }
  },

  // POST /api/finanzas/egreso
  async registrarEgreso(req, res) {
    try {
      const {
        proveedorBeneficiario,
        conceptoGasto,
        montoQuetzales,
        encargadoGasto = 'Comisión de Finanzas',
        categoriaGasto = 'Operativo Procesional',
        metodoPago = 'Efectivo',
        numeroFacturaComprobante = 'S/F',
        anioCuaresma = 2026
      } = req.body;

      const idUsuarioCajero = req.usuario ? req.usuario.idUsuario : 1;

      if (!proveedorBeneficiario || !conceptoGasto || !montoQuetzales) {
        return res.status(400).json({
          mensaje: 'El proveedor/beneficiario, el concepto del gasto y el monto son obligatorios'
        });
      }

      const monto = parseFloat(montoQuetzales);
      if (isNaN(monto) || monto <= 0) {
        return res.status(400).json({ mensaje: 'El monto del egreso debe ser un número mayor a 0' });
      }

      const balanceActual = await getQuery(`
        SELECT 
          (COALESCE(SUM(CASE WHEN Tipo_Movimiento = 'Ingreso' THEN Monto_Quetzales ELSE 0 END), 0) -
           COALESCE(SUM(CASE WHEN Tipo_Movimiento = 'Egreso' THEN Monto_Quetzales ELSE 0 END), 0)) AS Disponible_Caja_Q
        FROM Transaccion_Financiera
      `);

      if (balanceActual.Disponible_Caja_Q < monto) {
        return res.status(409).json({
          mensaje: `Fondos insuficientes en caja. Saldo actual disponible: Q${parseFloat(balanceActual.Disponible_Caja_Q).toFixed(2)}, monto solicitado: Q${monto.toFixed(2)}`
        });
      }

      const timestamp = Date.now().toString().slice(-6) + Math.floor(Math.random() * 10);
      const numeroComprobante = `EGR-${anioCuaresma}-${timestamp}`;
      const codigoValidacion = crypto.randomBytes(16).toString('hex').toUpperCase();

      await runQuery(`
        INSERT INTO Transaccion_Financiera (
          Numero_Recibo,
          ID_Usuario_Cajero,
          ID_Devoto,
          Tipo_Movimiento,
          Concepto_Descripcion,
          Monto_Quetzales,
          Metodo_Pago,
          Codigo_Validacion_Recibo,
          Encargado_Gasto
        ) VALUES (?, ?, NULL, 'Egreso', ?, ?, ?, ?, ?)
      `, [
        numeroComprobante,
        idUsuarioCajero,
        `[EGRESO / ${categoriaGasto}] Pagado a: ${proveedorBeneficiario} | Encargado: ${encargadoGasto} | Ref: ${numeroFacturaComprobante} | Detalle: ${conceptoGasto}`,
        monto,
        metodoPago,
        codigoValidacion,
        encargadoGasto
      ]);

      return res.status(201).json({
        mensaje: 'Egreso de caja registrado y liquidado con éxito',
        comprobanteEgreso: {
          numeroComprobante,
          codigoValidacion,
          beneficiario: proveedorBeneficiario,
          encargadoGasto,
          concepto: conceptoGasto,
          categoria: categoriaGasto,
          montoDesembolsado: `Q${monto.toFixed(2)}`,
          saldoRestanteEnCaja: `Q${(balanceActual.Disponible_Caja_Q - monto).toFixed(2)}`,
          metodoPago,
          fecha: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error al registrar egreso:', error);
      return res.status(500).json({ mensaje: 'Error interno al registrar el egreso contable' });
    }
  },

  // GET /api/finanzas/mis-cobros-dia
  async misCobrosDelDia(req, res) {
    try {
      const idUsuarioCajero = req.usuario ? req.usuario.idUsuario : 1;
      const { fecha } = req.query; // Formato YYYY-MM-DD
      const filtroFecha = fecha || new Date().toISOString().split('T')[0];

      const cobros = await allQuery(`
        SELECT 
          T.ID_Transaccion,
          T.Numero_Recibo,
          T.Tipo_Movimiento,
          T.Concepto_Descripcion,
          T.Monto_Quetzales,
          T.Metodo_Pago,
          T.Fecha_Transaccion,
          D.Nombres AS Devoto_Nombres,
          D.Apellidos AS Devoto_Apellidos
        FROM Transaccion_Financiera T
        LEFT JOIN Devoto D ON T.ID_Devoto = D.ID_Devoto
        WHERE T.ID_Usuario_Cajero = ? 
          AND DATE(T.Fecha_Transaccion) = DATE(?)
          AND T.Tipo_Movimiento = 'Ingreso'
        ORDER BY T.Fecha_Transaccion DESC
      `, [idUsuarioCajero, filtroFecha]);

      const totalDia = cobros.reduce((acc, curr) => acc + (parseFloat(curr.Monto_Quetzales) || 0), 0);

      return res.status(200).json({
        fecha: filtroFecha,
        cajero: req.usuario ? req.usuario.nombres : 'Cajero General',
        totalRecaudado: totalDia.toFixed(2),
        cantidadTransacciones: cobros.length,
        cobros
      });
    } catch (error) {
      console.error('Error al obtener cobros del cajero:', error);
      return res.status(500).json({ mensaje: 'Error al obtener cobros diarios' });
    }
  }
};

module.exports = FinanzasController;
