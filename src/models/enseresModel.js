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
    // Consultar historial Kardex con datos del usuario responsable
      async obtenerHistorialKardex(idEnser = null) {
    let sql = `
      SELECT 
        K.ID_Movimiento,
        K.ID_Enser,
        COALESCE(C.Nombre_Articulo, 'Enser #' || K.ID_Enser) AS Nombre_Articulo,
        K.Tipo_Operacion,
        K.Cantidad,
        COALESCE(K.Estado_Conservacion, 'Bueno') AS Estado_Conservacion,
        K.Fecha_Movimiento,
        TRIM(COALESCE(U.Nombres, 'Usuario') || ' ' || COALESCE(U.Apellidos, '')) AS RegistradoPor,
        U.Correo_Institucional,
        CASE 
          WHEN U.ID_Rol = 1 THEN 'Administrador General'
          WHEN U.ID_Rol = 2 THEN 'Secretaría'
          WHEN U.ID_Rol = 3 THEN 'Tesorero'
          WHEN U.ID_Rol = 4 THEN 'Enseres'
          WHEN U.ID_Rol = 5 THEN 'Cajero'
          ELSE 'Colaborador'
        END AS Nombre_Rol
      FROM Movimiento_Kardex K
      LEFT JOIN Catalogo_Enseres C ON K.ID_Enser = C.ID_Enser
      LEFT JOIN Usuario U ON K.ID_Usuario_Responsable = U.ID_Usuario
    `;

    const idNum = parseInt(idEnser, 10);
    if (!isNaN(idNum) && idNum > 0) {
      sql += ` WHERE K.ID_Enser = ? ORDER BY K.Fecha_Movimiento DESC, K.ID_Movimiento DESC`;
      return await allQuery(sql, [idNum]);
    }

    sql += ` ORDER BY K.Fecha_Movimiento DESC, K.ID_Movimiento DESC`;
    return await allQuery(sql);
  }
};

module.exports = EnseresModel;
