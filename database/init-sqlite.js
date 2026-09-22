const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

async function main() {
  const SQL = await initSqlJs();
  const db = new SQL.Database();

  console.log('Creando esquema en SQLite (Wasm)...');

  const ddl = `
    CREATE TABLE IF NOT EXISTS Rol (
      ID_Rol INTEGER PRIMARY KEY AUTOINCREMENT,
      Nombre_Rol TEXT NOT NULL UNIQUE,
      Descripcion TEXT,
      Activo INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS Usuario (
      ID_Usuario INTEGER PRIMARY KEY AUTOINCREMENT,
      ID_Rol INTEGER NOT NULL,
      Nombres TEXT NOT NULL,
      Correo_Institucional TEXT NOT NULL UNIQUE,
      Password_Hash TEXT NOT NULL,
      Estado_Activo INTEGER DEFAULT 1,
      Fecha_Creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (ID_Rol) REFERENCES Rol(ID_Rol)
    );

    CREATE TABLE IF NOT EXISTS Devoto (
      ID_Devoto INTEGER PRIMARY KEY AUTOINCREMENT,
      DPI TEXT NOT NULL UNIQUE,
      Nombres TEXT NOT NULL,
      Apellidos TEXT NOT NULL,
      Telefono TEXT NOT NULL,
      Correo_Electronico TEXT NOT NULL,
      Estatura_Hombro_cm INTEGER NOT NULL,
      Password_Hash TEXT,
      Cuenta_Activada INTEGER DEFAULT 0,
      Primer_Ingreso INTEGER DEFAULT 1,
      Token_Activacion TEXT,
      Fecha_Expiracion_Token DATETIME,
      Ultimo_Acceso DATETIME,
      Estado_Activo INTEGER DEFAULT 1,
      Fecha_Registro DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS Anda_Procesional (
      ID_Anda INTEGER PRIMARY KEY AUTOINCREMENT,
      Nombre_Anda TEXT NOT NULL,
      Brazos_Por_Lado INTEGER NOT NULL CHECK (Brazos_Por_Lado > 0),
      Cantidad_Total_Brazos INTEGER GENERATED ALWAYS AS (Brazos_Por_Lado * 2),
      Rango_Estatura_Min REAL NOT NULL,
      Rango_Estatura_Max REAL NOT NULL,
      Activa INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS Asignacion_Turno (
      ID_Asignacion INTEGER PRIMARY KEY AUTOINCREMENT,
      ID_Devoto INTEGER NOT NULL,
      ID_Anda INTEGER NOT NULL,
      ID_Usuario_Asigno INTEGER NOT NULL,
      Anio_Cuaresma INTEGER NOT NULL,
      Numero_Turno INTEGER NOT NULL,
      Lado_Brazo TEXT NOT NULL,
      Numero_Brazo INTEGER NOT NULL,
      Fecha_Asignacion DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (ID_Devoto) REFERENCES Devoto(ID_Devoto),
      FOREIGN KEY (ID_Anda) REFERENCES Anda_Procesional(ID_Anda),
      FOREIGN KEY (ID_Usuario_Asigno) REFERENCES Usuario(ID_Usuario)
    );

    CREATE TABLE IF NOT EXISTS Transaccion_Financiera (
      ID_Transaccion INTEGER PRIMARY KEY AUTOINCREMENT,
      Numero_Recibo TEXT NOT NULL UNIQUE,
      ID_Usuario_Cajero INTEGER NOT NULL,
      ID_Devoto INTEGER,
      Tipo_Movimiento TEXT NOT NULL,
      Concepto_Descripcion TEXT NOT NULL,
      Monto_Quetzales REAL NOT NULL,
      Metodo_Pago TEXT DEFAULT 'Efectivo',
      Fecha_Transaccion DATETIME DEFAULT CURRENT_TIMESTAMP,
      Codigo_Validacion_Recibo TEXT NOT NULL UNIQUE,
      FOREIGN KEY (ID_Usuario_Cajero) REFERENCES Usuario(ID_Usuario),
      FOREIGN KEY (ID_Devoto) REFERENCES Devoto(ID_Devoto)
    );

    CREATE TABLE IF NOT EXISTS Catalogo_Enseres (
      ID_Enser INTEGER PRIMARY KEY AUTOINCREMENT,
      Nombre_Articulo TEXT NOT NULL,
      Descripcion TEXT,
      Total_Existencias INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS Movimiento_Kardex (
      ID_Movimiento INTEGER PRIMARY KEY AUTOINCREMENT,
      ID_Enser INTEGER NOT NULL,
      ID_Usuario_Responsable INTEGER NOT NULL,
      Tipo_Operacion TEXT NOT NULL,
      Cantidad INTEGER NOT NULL,
      Estado_Conservacion TEXT NOT NULL,
      Fecha_Movimiento DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (ID_Enser) REFERENCES Catalogo_Enseres(ID_Enser),
      FOREIGN KEY (ID_Usuario_Responsable) REFERENCES Usuario(ID_Usuario)
    );

    CREATE TABLE IF NOT EXISTS Bitacora_Auditoria (
      ID_Bitacora INTEGER PRIMARY KEY AUTOINCREMENT,
      ID_Usuario INTEGER NOT NULL,
      Fecha_Hora DATETIME DEFAULT CURRENT_TIMESTAMP,
      Modulo_Afectado TEXT NOT NULL,
      Accion_Realizada TEXT NOT NULL,
      Descripcion_Detalle TEXT,
      IP_Origen TEXT,
      FOREIGN KEY (ID_Usuario) REFERENCES Usuario(ID_Usuario)
    );
  `;

  db.run(ddl);

  const data = db.export();
  const buffer = Buffer.from(data);
  const dbPath = path.join(__dirname, 'hermandad.sqlite');
  fs.writeFileSync(dbPath, buffer);

  console.log('✅ Base de datos SQLite creada exitosamente en database/hermandad.sqlite');
}

main().catch(console.error);
