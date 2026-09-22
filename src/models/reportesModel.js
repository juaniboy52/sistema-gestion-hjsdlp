const { getQuery, allQuery } = require('../config/database');

const ReportesModel = {
  // 1. Reporte Contable y Financiero
  async balanceFinanciero({ fechaInicio, fechaFin }) {
    let whereFechas = '';
    const params = [];

    if (fechaInicio && fechaFin) {
      whereFechas = 'WHERE Fecha_Transaccion BETWEEN ? AND ?';
      params.push(fechaInicio, fechaFin);
    }

    // Totales generales
    const totales = await getQuery(`
      SELECT 
        COUNT(ID_Transaccion) AS Total_Transacciones,
        COALESCE(SUM(CASE WHEN Tipo_Movimiento = 'Ingreso' THEN Monto_Quetzales ELSE 0 END), 0) AS Total_Ingresos_Q,
        COALESCE(SUM(CASE WHEN Tipo_Movimiento = 'Egreso' THEN Monto_Quetzales ELSE 0 END), 0) AS Total_Egresos_Q,
        (COALESCE(SUM(CASE WHEN Tipo_Movimiento = 'Ingreso' THEN Monto_Quetzales ELSE 0 END), 0) -
         COALESCE(SUM(CASE WHEN Tipo_Movimiento = 'Egreso' THEN Monto_Quetzales ELSE 0 END), 0)) AS Balance_Neto_Q
      FROM Transaccion_Financiera
      ${whereFechas}
    `, params);

    // Desglose por método de pago
    const porMetodo = await allQuery(`
      SELECT 
        Metodo_Pago,
        COUNT(ID_Transaccion) AS Cantidad_Operaciones,
        COALESCE(SUM(Monto_Quetzales), 0) AS Subtotal_Q
      FROM Transaccion_Financiera
      ${whereFechas}
      GROUP BY Metodo_Pago
    `, params);

    // Arqueo consolidado por cajero
    const porCajero = await allQuery(`
      SELECT 
        U.ID_Usuario,
        U.Nombres AS Cajero,
        COUNT(T.ID_Transaccion) AS Total_Recibos,
        COALESCE(SUM(T.Monto_Quetzales), 0) AS Total_Cobrado_Q
      FROM Transaccion_Financiera T
      INNER JOIN Usuario U ON T.ID_Usuario_Cajero = U.ID_Usuario
      ${whereFechas ? whereFechas.replace('Fecha_Transaccion', 'T.Fecha_Transaccion') : ''}
      GROUP BY U.ID_Usuario, U.Nombres
    `, params);

    return {
      totales,
      porMetodo,
      porCajero
    };
  },

  // 2. Reporte de Inventarios y Estado de Enseres
  async inventarioKardexResumen() {
    // Existencias actuales y estado general
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

    // Distribución por estado de conservación reportado en Kardex
    const estadoPiezas = await allQuery(`
      SELECT 
        Estado_Conservacion,
        COUNT(ID_Movimiento) AS Conteo_Operaciones,
        SUM(Cantidad) AS Unidades_Afectadas
      FROM Movimiento_Kardex
      GROUP BY Estado_Conservacion
    `);

    return {
      totalArticulosDistintos: catalogo.length,
      catalogo,
      distribucionConservacion: estadoPiezas
    };
  },

  // 3. Estadísticas Procesionales y Ocupación del Anda
  async estadisticasProcesion(idAnda = 1, anioCuaresma = 2026) {
    // Datos del anda
    const anda = await getQuery('SELECT * FROM Anda_Procesional WHERE ID_Anda = ?', [idAnda]);
    if (!anda) return null;

    const brazosTotalesPorTurno = anda.Brazos_Por_Lado * 2; // 40 brazos

    // Totales de cargadores y métricas físicas
    const metricasCargadores = await getQuery(`
      SELECT 
        COUNT(A.ID_Asignacion) AS Total_Asignados,
        COUNT(DISTINCT A.Numero_Turno) AS Turnos_Con_Cargadores,
        COUNT(DISTINCT A.ID_Devoto) AS Devotos_Unicos,
        ROUND(AVG(D.Estatura_Hombro_cm), 1) AS Estatura_Promedio_Hombro_cm,
        MIN(D.Estatura_Hombro_cm) AS Estatura_Minima_cm,
        MAX(D.Estatura_Hombro_cm) AS Estatura_Maxima_cm
      FROM Asignacion_Turno A
      INNER JOIN Devoto D ON A.ID_Devoto = D.ID_Devoto
      WHERE A.ID_Anda = ? AND A.Anio_Cuaresma = ?
    `, [idAnda, anioCuaresma]);

    // Ocupación por cada turno
    const ocupacionTurnos = await allQuery(`
      SELECT 
        A.Numero_Turno,
        COUNT(A.ID_Asignacion) AS Cargadores_Asignados,
        SUM(CASE WHEN A.Lado_Brazo = 'DERECHO' THEN 1 ELSE 0 END) AS Flanco_Derecho,
        SUM(CASE WHEN A.Lado_Brazo = 'IZQUIERDO' THEN 1 ELSE 0 END) AS Flanco_Izquierdo,
        ROUND(AVG(D.Estatura_Hombro_cm), 1) AS Promedio_Altura_Turno_cm
      FROM Asignacion_Turno A
      INNER JOIN Devoto D ON A.ID_Devoto = D.ID_Devoto
      WHERE A.ID_Anda = ? AND A.Anio_Cuaresma = ?
      GROUP BY A.Numero_Turno
      ORDER BY A.Numero_Turno ASC
    `, [idAnda, anioCuaresma]);

    return {
      anda: {
        idAnda: anda.ID_Anda,
        nombre: anda.Nombre_Anda,
        capacidadPorTurno: brazosTotalesPorTurno
      },
      anioCuaresma,
      resumenGeneral: metricasCargadores,
      detalleTurnos: ocupacionTurnos.map(t => ({
        ...t,
        capacidadTurno: brazosTotalesPorTurno,
        porcentajeOcupacion: `${Math.round((t.Cargadores_Asignados / brazosTotalesPorTurno) * 100)}%`
      }))
    };
  }
};

module.exports = ReportesModel;
