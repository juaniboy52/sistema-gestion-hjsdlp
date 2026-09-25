const { getQuery, allQuery } = require('../config/database');

const ReportesModel = {
  // 1. Reporte Contable y Financiero Detallado
  async balanceFinanciero({ fechaInicio, fechaFin }) {
    let whereFechas = '';
    const params = [];

    if (fechaInicio && fechaFin) {
      whereFechas = 'WHERE T.Fecha_Transaccion BETWEEN ? AND ?';
      params.push(fechaInicio, fechaFin);
    }

    // Totales agregados
    const totales = await getQuery(`
      SELECT 
        COUNT(ID_Transaccion) AS Total_Transacciones,
        COALESCE(SUM(CASE WHEN Tipo_Movimiento = 'Ingreso' THEN Monto_Quetzales ELSE 0 END), 0) AS Total_Ingresos_Q,
        COALESCE(SUM(CASE WHEN Tipo_Movimiento = 'Egreso' THEN Monto_Quetzales ELSE 0 END), 0) AS Total_Egresos_Q,
        (COALESCE(SUM(CASE WHEN Tipo_Movimiento = 'Ingreso' THEN Monto_Quetzales ELSE 0 END), 0) -
         COALESCE(SUM(CASE WHEN Tipo_Movimiento = 'Egreso' THEN Monto_Quetzales ELSE 0 END), 0)) AS Balance_Neto_Q
      FROM Transaccion_Financiera
      ${whereFechas ? whereFechas.replace('T.', '') : ''}
    `, params);

    // Listado cronológico de TODOS los movimientos individuales
    const movimientos = await allQuery(`
      SELECT 
        T.ID_Transaccion,
        T.Numero_Recibo,
        T.Tipo_Movimiento,
        T.Concepto_Descripcion,
        T.Monto_Quetzales,
        T.Metodo_Pago,
        T.Fecha_Transaccion,
        T.Codigo_Validacion_Recibo,
        U.Nombres AS Nombre_Cajero,
        COALESCE(D.Nombres || ' ' || D.Apellidos, 'N/A') AS Devoto_Asociado
      FROM Transaccion_Financiera T
      INNER JOIN Usuario U ON T.ID_Usuario_Cajero = U.ID_Usuario
      LEFT JOIN Devoto D ON T.ID_Devoto = D.ID_Devoto
      ${whereFechas}
      ORDER BY T.ID_Transaccion DESC
    `, params);

    // Arqueo por cajero
    const porCajero = await allQuery(`
      SELECT 
        U.ID_Usuario,
        U.Nombres AS Cajero,
        COUNT(T.ID_Transaccion) AS Total_Recibos,
        COALESCE(SUM(CASE WHEN T.Tipo_Movimiento = 'Ingreso' THEN T.Monto_Quetzales ELSE -T.Monto_Quetzales END), 0) AS Balance_Cajero_Q
      FROM Transaccion_Financiera T
      INNER JOIN Usuario U ON T.ID_Usuario_Cajero = U.ID_Usuario
      ${whereFechas}
      GROUP BY U.ID_Usuario, U.Nombres
    `, params);

    return {
      totales,
      movimientos,
      porCajero
    };
  },

  async inventarioKardexResumen() {
    const catalogo = await allQuery(`
      SELECT 
        C.ID_Enser,
        C.Nombre_Articulo,
        C.Descripcion,
        C.Total_Existencias,
        COUNT(K.ID_Movimiento) AS Total_Movimientos_Kardex,
        COALESCE(MAX(K.Fecha_Movimiento), 'Sin movimientos') AS Ultimo_Movimiento
      FROM Catalogo_Enseres C
      LEFT JOIN Movimiento_Kardex K ON C.ID_Enser = K.ID_Enser
      GROUP BY C.ID_Enser
      ORDER BY C.Total_Existencias ASC
    `);

    return { totalArticulosDistintos: catalogo.length, catalogo };
  },

  async estadisticasProcesion(idAnda = 1, anioCuaresma = 2026) {
    const metricasCargadores = await getQuery(`
      SELECT 
        COUNT(A.ID_Asignacion) AS Total_Asignados,
        COUNT(DISTINCT A.Numero_Turno) AS Turnos_Con_Cargadores,
        COUNT(DISTINCT A.ID_Devoto) AS Devotos_Unicos,
        ROUND(AVG(D.Estatura_Hombro_cm), 1) AS Estatura_Promedio_Hombro_cm
      FROM Asignacion_Turno A
      INNER JOIN Devoto D ON A.ID_Devoto = D.ID_Devoto
      WHERE A.ID_Anda = ? AND A.Anio_Cuaresma = ?
    `, [idAnda, anioCuaresma]);

    return { anioCuaresma, resumenGeneral: metricasCargadores };
  }
};

module.exports = ReportesModel;
