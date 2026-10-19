const { runQuery, allQuery } = require('../config/database');

const AuditoriaModel = {
  // Registrar evento de auditoría
  async registrar({ idUsuario = null, moduloAfectado, accionRealizada, descripcionDetalle, ipOrigen }) {
    await runQuery(
      `INSERT INTO Bitacora_Auditoria (ID_Usuario, Modulo_Afectado, Accion_Realizada, Descripcion_Detalle, IP_Origen)
       VALUES (?, ?, ?, ?, ?)`,
      [idUsuario, moduloAfectado, accionRealizada, descripcionDetalle, ipOrigen]
    );
  },

  // Consultar últimos eventos de auditoría (retrocompatibilidad)
  async listarUltimos(limite = 50) {
    return await allQuery(
      `SELECT B.ID_Bitacora, B.Fecha_Hora, B.Modulo_Afectado, B.Accion_Realizada, 
              B.Descripcion_Detalle, B.IP_Origen, 
              (U.Nombres || ' ' || U.Apellidos) AS UsuarioResponsable
       FROM Bitacora_Auditoria B
       LEFT JOIN Usuario U ON B.ID_Usuario = U.ID_Usuario
       ORDER BY B.Fecha_Hora DESC
       LIMIT ?`,
      [limite]
    );
  },

  // Consultar con filtros avanzados (Rango de fechas y buscador)
  async listarFiltrado({ fechaInicio, fechaFin, buscar }) {
    let sql = `
      SELECT B.ID_Bitacora, B.Fecha_Hora, B.Modulo_Afectado, B.Accion_Realizada, 
             B.Descripcion_Detalle, B.IP_Origen, 
             COALESCE(U.Nombres || ' ' || U.Apellidos, 'Sistema') AS UsuarioResponsable
      FROM Bitacora_Auditoria B
      LEFT JOIN Usuario U ON B.ID_Usuario = U.ID_Usuario
      WHERE 1=1
    `;
    const params = [];

    if (fechaInicio) {
      sql += ` AND date(B.Fecha_Hora) >= date(?)`;
      params.push(fechaInicio);
    }

    if (fechaFin) {
      sql += ` AND date(B.Fecha_Hora) <= date(?)`;
      params.push(fechaFin);
    }

    if (buscar && buscar.trim() !== '') {
      const term = `%${buscar.trim()}%`;
      sql += ` AND (
        B.Modulo_Afectado LIKE ? OR 
        B.Accion_Realizada LIKE ? OR 
        B.Descripcion_Detalle LIKE ? OR 
        B.IP_Origen LIKE ? OR 
        U.Nombres LIKE ? OR 
        U.Apellidos LIKE ?
      )`;
      params.push(term, term, term, term, term, term);
    }

    sql += ` ORDER BY B.Fecha_Hora DESC`;

    // Si no hay filtros aplicados, limitar a 150 registros para velocidad de carga inicial
    if (!fechaInicio && !fechaFin && !buscar) {
      sql += ` LIMIT 150`;
    }

    return await allQuery(sql, params);
  }
};

module.exports = AuditoriaModel;
