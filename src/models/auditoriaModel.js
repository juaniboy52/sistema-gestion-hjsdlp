const { runQuery, allQuery } = require('../config/database');

const AuditoriaModel = {
  // Registrar evento de auditoría
  async registrar({ idUsuario = 1, moduloAfectado, accionRealizada, descripcionDetalle, ipOrigen }) {
    await runQuery(
      `INSERT INTO Bitacora_Auditoria (ID_Usuario, Modulo_Afectado, Accion_Realizada, Descripcion_Detalle, IP_Origen)
       VALUES (?, ?, ?, ?, ?)`,
      [idUsuario, moduloAfectado, accionRealizada, descripcionDetalle, ipOrigen]
    );
  },

  // Consultar últimos eventos de auditoría
  async listarUltimos(limite = 50) {
    return await allQuery(
      `SELECT B.ID_Bitacora, B.Fecha_Hora, B.Modulo_Afectado, B.Accion_Realizada, 
              B.Descripcion_Detalle, B.IP_Origen, U.Nombres AS UsuarioResponsable
       FROM Bitacora_Auditoria B
       LEFT JOIN Usuario U ON B.ID_Usuario = U.ID_Usuario
       ORDER BY B.Fecha_Hora DESC
       LIMIT ?`,
      [limite]
    );
  }
};

module.exports = AuditoriaModel;
