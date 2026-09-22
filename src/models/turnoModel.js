const { runQuery, getQuery, allQuery } = require('../config/database');
const crypto = require('crypto');

const TurnoModel = {
  // 1. Obtener devotos inscritos activos que aún no tienen turno en el año actual
  async obtenerDevotosPendientes(idAnda, anioCuaresma) {
    return await allQuery(
      `SELECT D.ID_Devoto, D.DPI, D.Nombres, D.Apellidos, D.Estatura_Hombro_cm
       FROM Devoto D
       WHERE D.Estado_Activo = 1
         AND D.ID_Devoto NOT IN (
           SELECT ID_Devoto FROM Asignacion_Turno 
           WHERE ID_Anda = ? AND Anio_Cuaresma = ?
         )
       ORDER BY D.Estatura_Hombro_cm DESC`,
      [idAnda, anioCuaresma]
    );
  },

  // 2. Obtener historial de números de turnos cargados por un devoto en años anteriores
  async obtenerHistorialTurnosDevoto(idDevoto, idAnda, anioCuaresmaActual) {
    const filas = await allQuery(
      `SELECT DISTINCT Numero_Turno 
       FROM Asignacion_Turno 
       WHERE ID_Devoto = ? AND ID_Anda = ? AND Anio_Cuaresma < ?`,
      [idDevoto, idAnda, anioCuaresmaActual]
    );
    return filas.map(f => f.Numero_Turno);
  },

  // 3. Consultar los turnos ya ocupados en el año actual para no sobreescribir
  async obtenerTurnosAsignadosAnio(idAnda, anioCuaresma) {
    return await allQuery(
      `SELECT Numero_Turno, Lado_Brazo, Numero_Brazo 
       FROM Asignacion_Turno 
       WHERE ID_Anda = ? AND Anio_Cuaresma = ?`,
      [idAnda, anioCuaresma]
    );
  },

  // 4. Asignación masiva dentro de una transacción con generación de recibo
  async registrarAsignacionAutomatica({ idDevoto, idAnda, idUsuarioAsigno, anioCuaresma, numeroTurno, ladoBrazo, numeroBrazo, montoQuetzales = 50.00 }) {
    await runQuery(
      `INSERT INTO Asignacion_Turno (ID_Devoto, ID_Anda, ID_Usuario_Asigno, Anio_Cuaresma, Numero_Turno, Lado_Brazo, Numero_Brazo)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [idDevoto, idAnda, idUsuarioAsigno, anioCuaresma, numeroTurno, ladoBrazo, numeroBrazo]
    );

    const timestamp = Date.now().toString().slice(-6) + Math.floor(Math.random() * 100);
    const numeroRecibo = `REC-${anioCuaresma}-${timestamp}`;
    const codigoValidacion = crypto.randomBytes(16).toString('hex').toUpperCase();

    await runQuery(
      `INSERT INTO Transaccion_Financiera (Numero_Recibo, ID_Usuario_Cajero, ID_Devoto, Tipo_Movimiento, Concepto_Descripcion, Monto_Quetzales, Codigo_Validacion_Recibo)
       VALUES (?, ?, ?, 'Ingreso', ?, ?, ?)`,
      [
        numeroRecibo,
        idUsuarioAsigno,
        idDevoto,
        `Inscripción Automática Turno No. ${numeroTurno} (${ladoBrazo} - Brazo ${numeroBrazo}) - Cuaresma ${anioCuaresma}`,
        montoQuetzales,
        codigoValidacion
      ]
    );

    return { numeroRecibo, codigoValidacion };
  },

  // 5. Listar turnos asignados por Anda y Año
  async listarTurnosPorAnda(idAnda, anioCuaresma) {
    return await allQuery(
      `SELECT A.ID_Asignacion, A.Numero_Turno, A.Lado_Brazo, A.Numero_Brazo, A.Fecha_Asignacion,
              D.DPI, D.Nombres, D.Apellidos, D.Estatura_Hombro_cm,
              T.Numero_Recibo, T.Codigo_Validacion_Recibo
       FROM Asignacion_Turno A
       INNER JOIN Devoto D ON A.ID_Devoto = D.ID_Devoto
       LEFT JOIN Transaccion_Financiera T ON T.ID_Devoto = D.ID_Devoto AND T.Concepto_Descripcion LIKE '%' || A.Numero_Turno || '%'
       WHERE A.ID_Anda = ? AND A.Anio_Cuaresma = ?
       ORDER BY A.Numero_Turno ASC, A.Lado_Brazo ASC, A.Numero_Brazo ASC`,
      [idAnda, anioCuaresma]
    );
  },

  // 6. Consultar comprobante por código de validación
  async buscarComprobantePorCodigo(codigoValidacion) {
    return await getQuery(
      `SELECT 
         T.Numero_Recibo,
         T.Codigo_Validacion_Recibo,
         T.Tipo_Movimiento,
         T.Concepto_Descripcion,
         T.Monto_Quetzales,
         T.Metodo_Pago,
         T.Fecha_Transaccion,
         D.ID_Devoto,
         D.DPI,
         D.Nombres AS Devoto_Nombres,
         D.Apellidos AS Devoto_Apellidos,
         D.Telefono AS Devoto_Telefono,
         D.Correo_Electronico AS Devoto_Correo,
         D.Estatura_Hombro_cm,
         A.Numero_Turno,
         A.Lado_Brazo,
         A.Numero_Brazo,
         A.Anio_Cuaresma,
         A.Fecha_Asignacion,
         AP.Nombre_Anda,
         AP.Brazos_Por_Lado,
         AP.Cantidad_Total_Brazos,
         U.Nombres AS Cajero_Responsable
       FROM Transaccion_Financiera T
       INNER JOIN Devoto D ON T.ID_Devoto = D.ID_Devoto
       INNER JOIN Usuario U ON T.ID_Usuario_Cajero = U.ID_Usuario
       LEFT JOIN Asignacion_Turno A ON A.ID_Devoto = D.ID_Devoto
       LEFT JOIN Anda_Procesional AP ON A.ID_Anda = AP.ID_Anda
       WHERE T.Codigo_Validacion_Recibo = ?
       ORDER BY A.Fecha_Asignacion DESC
       LIMIT 1`,
      [codigoValidacion]
    );
  }
};

module.exports = TurnoModel;
