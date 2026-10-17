const { allQuery, getQuery, runQuery } = require('../config/database');

const AndaModel = {
  async listarTodas(soloActivas = true) {
    let sql = `
      SELECT 
        ID_Anda,
        Nombre_Anda,
        Descripcion,
        Cantidad_Brazos,
        Cantidad_Turnos,
        Anio_Temporada,
        Estado_Activo
      FROM Configuracion_Anda
    `;
    if (soloActivas) {
      sql += ` WHERE Estado_Activo = 1`;
    }
    sql += ` ORDER BY ID_Anda ASC`;
    return await allQuery(sql);
  },

  async listarAndas() {
    return await this.listarTodas(true);
  },

  async obtenerPorId(idAnda) {
    return await getQuery(`
      SELECT 
        ID_Anda,
        Nombre_Anda,
        Descripcion,
        Cantidad_Brazos,
        Cantidad_Turnos,
        Anio_Temporada,
        Estado_Activo
      FROM Configuracion_Anda 
      WHERE ID_Anda = ?
    `, [idAnda]);
  },

  async crearAnda(datos) {
    const { nombreAnda, descripcion, cantidadBrazos, cantidadTurnos, anioTemporada } = datos;
    const res = await runQuery(`
      INSERT INTO Configuracion_Anda (Nombre_Anda, Descripcion, Cantidad_Brazos, Cantidad_Turnos, Anio_Temporada, Estado_Activo)
      VALUES (?, ?, ?, ?, ?, 1)
    `, [nombreAnda, descripcion || '', cantidadBrazos, cantidadTurnos, anioTemporada || 2026]);
    return await this.obtenerPorId(res.lastID);
  },

  async actualizarAnda(idAnda, datos) {
    const { nombreAnda, descripcion, cantidadBrazos, cantidadTurnos } = datos;
    await runQuery(`
      UPDATE Configuracion_Anda
      SET 
        Nombre_Anda = COALESCE(?, Nombre_Anda),
        Descripcion = COALESCE(?, Descripcion),
        Cantidad_Brazos = COALESCE(?, Cantidad_Brazos),
        Cantidad_Turnos = COALESCE(?, Cantidad_Turnos)
      WHERE ID_Anda = ?
    `, [nombreAnda, descripcion, cantidadBrazos, cantidadTurnos, idAnda]);
    return await this.obtenerPorId(idAnda);
  },

  async cambiarEstadoAnda(idAnda, nuevoEstado) {
    return await runQuery(`
      UPDATE Configuracion_Anda
      SET Estado_Activo = ?
      WHERE ID_Anda = ?
    `, [nuevoEstado, idAnda]);
  }
};

module.exports = AndaModel;
