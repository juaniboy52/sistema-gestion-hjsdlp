const bcrypt = require('bcryptjs');
const { runQuery, allQuery } = require('../src/config/database');

async function seed() {
  console.log('Sembrando datos base en HermandadDB...');

  // 1. Roles iniciales
  await runQuery(`INSERT OR IGNORE INTO Rol (ID_Rol, Nombre_Rol, Descripcion) VALUES (1, 'Administrador General', 'Acceso total al sistema de la Hermandad')`);
  await runQuery(`INSERT OR IGNORE INTO Rol (ID_Rol, Nombre_Rol, Descripcion) VALUES (2, 'Tesorero / Cajero', 'Emisión de recibos y control de inscripciones')`);

  // 2. Usuario Administrador (Password: Admin2026!)
  const passwordHash = await bcrypt.hash('Admin2026!', 10);
  await runQuery(`
    INSERT OR IGNORE INTO Usuario (ID_Usuario, ID_Rol, Nombres, Correo_Institucional, Password_Hash) 
    VALUES (1, 1, 'Encargado General', 'admin@hermandadpaz.gt', ?)
  `, [passwordHash]);

  // 3. Anda Procesional (40 brazos por lado = 80 cargadores)
  await runQuery(`
    INSERT OR IGNORE INTO Anda_Procesional (ID_Anda, Nombre_Anda, Brazos_Por_Lado, Rango_Estatura_Min, Rango_Estatura_Max)
    VALUES (1, 'Paso de Jesús Sepultado de la Paz', 40, 1.65, 1.85)
  `);

  console.log('✅ Datos base sembrados correctamente.');

  // Verificación en consola
  const roles = await allQuery('SELECT * FROM Rol');
  console.log('Roles en BD:', roles);

  const andas = await allQuery('SELECT ID_Anda, Nombre_Anda, Cantidad_Total_Brazos, Rango_Estatura_Min, Rango_Estatura_Max FROM Anda_Procesional');
  console.log('Andas registradas:', andas);
}

seed().catch(console.error);
