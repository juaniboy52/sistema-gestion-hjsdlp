const { runQuery, getQuery, allQuery } = require('../config/database');

const EnseresModel = {
  // Crear un nuevo artículo en el catálogo
  async crearEnser({ nombreArticulo, descripcion }) {
    await runQuery(
      `INSERT INTO Catalogo_Enseres (Nombre_Articulo, Descripcion, Total_Existencias)
       VALUES (?, ?, 0)`,
      [nombreArticulo, descripcion]
    );
    return await getQuery('SELECT * FROM Catalogo_Enseres WHERE Nombre_Articulo = ?', [nombreArticulo]);
  },

  // Obtener todos los enseres con sus existencias actuales
  async listarCatalogo() {
    return await allQuery('SELECT * FROM Catalogo_Enseres ORDER BY Nombre_Articulo ASC');
  },

  // Buscar un enser por ID
  async findById(idEnser) {
    return await getQuery('SELECT * FROM Catalogo_Enseres WHERE ID_Enser = ?', [idEnser]);
  },

  // Registrar movimiento en el Kardex y actualizar stock
  async registrarMovimiento({ idEnser, idUsuarioResponsable, tipoOperacion, cantidad, estadoConservacion }) {
    // 1. Registrar fila en el historial Kardex
    await runQuery(
      `INSERT INTO Movimiento_Kardex (ID_Enser, ID_Usuario_Responsable, Tipo_Operacion, Cantidad, Estado_Conservacion)
       VALUES (?, ?, ?, ?, ?)`,
      [idEnser, idUsuarioResponsable, tipoOperacion, cantidad, estadoConservacion]
    );

    // 2. Calcular nuevo balance
    const delta = tipoOperacion === 'ENTRADA' ? cantidad : -cantidad;
    await runQuery(
      `UPDATE Catalogo_Enseres 
       SET Total_Existencias = Total_Existencias + ? 
       WHERE ID_Enser = ?`,
      [delta, idEnser]
    );

    return await this.findById(idEnser);
  },

  // Consultar el historial de movimientos de un enser
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
