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
  }
};

module.exports = DevotoModel;
