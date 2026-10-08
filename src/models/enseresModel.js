const { runQuery, getQuery, allQuery } = require('../config/database');

const EnseresModel = {
  // Crear un nuevo artículo en el catálogo
  async crearEnser({ nombreArticulo, descripcion }) {
    await runQuery(
      `INSERT INTO Catalogo_Enseres (Nombre_Articulo, Descripcion, Total_Existencias, Estado_Activo)
       VALUES (?, ?, 0, 1)`,
      [nombreArticulo, descripcion]
    );
    return await getQuery('SELECT * FROM Catalogo_Enseres WHERE Nombre_Articulo = ?', [nombreArticulo]);
  },

  // Obtener enseres (filtra solo activos si soloActivos = true)
  async listarCatalogo(soloActivos = false) {
    let sql = `
      SELECT 
        ID_Enser,
        Nombre_Articulo,
        Descripcion,
        Total_Existencias,
        COALESCE(Estado_Activo, 1) AS Estado_Activo
      FROM Catalogo_Enseres
    `;
    if (soloActivos) {
      sql += " WHERE COALESCE(Estado_Activo, 1) = 1";
    }
    sql += " ORDER BY Nombre_Articulo ASC";
    return await allQuery(sql);
  },

  // Buscar un enser por ID
  async findById(idEnser) {
    return await getQuery('SELECT * FROM Catalogo_Enseres WHERE ID_Enser = ?', [idEnser]);
  },

  // Modificar datos de un enser (Admin)
  async actualizarEnser(id, { nombreArticulo, descripcion, estadoActivo }) {
    const sql = `
      UPDATE Catalogo_Enseres 
      SET Nombre_Articulo = ?, Descripcion = ?, Estado_Activo = ?
      WHERE ID_Enser = ?
    `;
    await runQuery(sql, [nombreArticulo.trim(), descripcion ? descripcion.trim() : '', estadoActivo, id]);
    return await this.findById(id);
  },

  // Alternar estado activo / baja (Admin)
  async alternarEstadoEnser(id, nuevoEstado) {
    const sql = `UPDATE Catalogo_Enseres SET Estado_Activo = ? WHERE ID_Enser = ?`;
    await runQuery(sql, [nuevoEstado, id]);
    return await this.findById(id);
  },

  // Registrar movimiento en el Kardex y actualizar stock
  async registrarMovimiento({ idEnser, idUsuarioResponsable, tipoOperacion, cantidad, estadoConservacion }) {
    await runQuery(
      `INSERT INTO Movimiento_Kardex (ID_Enser, ID_Usuario_Responsable, Tipo_Operacion, Cantidad, Estado_Conservacion)
       VALUES (?, ?, ?, ?, ?)`,
      [idEnser, idUsuarioResponsable, tipoOperacion, cantidad, estadoConservacion]
    );

    const delta = tipoOperacion === 'ENTRADA' ? cantidad : -cantidad;
    await runQuery(
      `UPDATE Catalogo_Enseres 
       SET Total_Existencias = Total_Existencias + ? 
       WHERE ID_Enser = ?`,
      [delta, idEnser]
    );

    return await this.findById(idEnser);
  },

  // Consultar historial Kardex
  async obtenerHistorialKardex(idEnser) {
    return await allQuery(
      `SELECT K.ID_Movimiento, K.Tipo_Operacion, K.Cantidad, K.Estado_Conservacion, K.Fecha_Movimiento,
              U.Nombres AS RegistradoPor
       FROM Movimiento_Kardex K
       INNER JOIN Usuario U ON K.ID_Usuario_Responsable = U.ID_Usuario
       WHERE K.ID_Enser = ?
       ORDER BY K.Fecha_Movimiento DESC`,
      [idEnser]
    );
  }
};

module.exports = EnseresModel;
