const { runQuery, getQuery, allQuery } = require('../config/database');

const DevotoModel = {
  // Buscar devoto por DPI
  async findByDPI(dpi) {
    return await getQuery('SELECT * FROM Devoto WHERE DPI = ?', [dpi]);
  },

  // Buscar devoto por ID
  async findById(id) {
    return await getQuery('SELECT * FROM Devoto WHERE ID_Devoto = ?', [id]);
  },

  // Registrar nuevo devoto
  async create(data) {
    const { dpi, nombres, apellidos, telefono, correo, estaturaHombroCm } = data;
    await runQuery(
      `INSERT INTO Devoto (DPI, Nombres, Apellidos, Telefono, Correo_Electronico, Estatura_Hombro_cm)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [dpi, nombres, apellidos, telefono, correo, estaturaHombroCm]
    );
    return await this.findByDPI(dpi);
  },

  // Listar todos los devotos activos
  async findAll() {
    return await allQuery(
      'SELECT ID_Devoto, DPI, Nombres, Apellidos, Telefono, Correo_Electronico, Estatura_Hombro_cm, Cuenta_Activada, Estado_Activo, Fecha_Registro FROM Devoto ORDER BY Fecha_Registro DESC'
    );
  },

  // Actualizar datos del devoto
  async update(id, data) {
    const { dpi, nombres, apellidos, telefono, correo, estaturaHombroCm, estadoActivo } = data;
    await runQuery(
      `UPDATE Devoto 
       SET DPI = ?, Nombres = ?, Apellidos = ?, Telefono = ?, Correo_Electronico = ?, Estatura_Hombro_cm = ?, Estado_Activo = ?
       WHERE ID_Devoto = ?`,
      [dpi, nombres, apellidos, telefono, correo, estaturaHombroCm, estadoActivo !== undefined ? estadoActivo : 1, id]
    );
    return await this.findById(id);
  }
};

module.exports = DevotoModel;


exports.actualizarDevoto = async (id, { dpi, nombres, apellidos, telefono, correo, estaturaHombroCm, estadoActivo }) => {
  const { runQuery } = require('../config/database');
  const sql = `
    UPDATE Devoto 
    SET DPI = ?, Nombres = ?, Apellidos = ?, Telefono = ?, Correo_Electronico = ?, Estatura_Hombro_cm = ?, Estado_Activo = ?
    WHERE ID_Devoto = ?
  `;
  return await runQuery(sql, [dpi, nombres, apellidos, telefono, correo, estaturaHombroCm, estadoActivo, id]);
};
