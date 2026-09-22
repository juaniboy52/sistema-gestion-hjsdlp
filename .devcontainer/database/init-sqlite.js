const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'hermandad.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('Creando base de datos y tablas...');

db.serialize(() => {
  // 1. Rol
  db.run(`CREATE TABLE IF NOT EXISTS Rol (
    ID_Rol INTEGER PRIMARY KEY AUTOINCREMENT,
    Nombre_Rol TEXT NOT NULL UNIQUE,
    Descripcion TEXT,
    Activo INTEGER DEFAULT 1
  )`);

  // 2. Usuario
  db.run(`CREATE TABLE IF NOT EXISTS Usuario (
    ID_Usuario INTEGER PRIMARY KEY AUTOINCREMENT,
    ID_Rol INTEGER NOT NULL,
    Nombres TEXT NOT NULL,
    Correo_Institucional TEXT NOT NULL UNIQUE,
    Password_Hash TEXT NOT NULL,
    Estado_Activo INTEGER DEFAULT 1,
    Fecha_Creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ID_Rol) REFERENCES Rol(ID_Rol)
  )`);

  // 3. Devoto
  db.run(`CREATE TABLE IF NOT EXISTS Devoto (
    ID_Devoto INTEGER PRIMARY KEY AUTOINCREMENT,
    DPI TEXT NOT NULL UNIQUE,
    Nombres TEXT NOT NULL,
    Apellidos TEXT NOT NULL,
    Telefono TEXT NOT NULL,
    Correo_Electronico TEXT NOT NULL,
    Estatura_Hombro_cm REAL NOT NULL,
    Password_Hash TEXT,
    Cuenta_Activada INTEGER DEFAULT 0,
    Primer_Ingreso INTEGER DEFAULT 1,
    Token_Activacion TEXT,
    Fecha_Expiracion_Token DATETIME,
    Ultimo_Acceso DATETIME,
    Estado_Activo INTEGER DEFAULT 1,
    Fecha_Registro DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // 4. Anda Procesional
  db.run(`CREATE TABLE IF NOT EXISTS Anda_Procesional (
    ID_Anda INT IDENTITY(1,1) PRIMARY KEY,
    Nombre_Anda VARCHAR(100) NOT NULL,
    Brazos_Por_Lado INT NOT NULL,
    Cantidad_Total_Brazos AS (Brazos_Por_Lado * 2) PERSISTED,
    Rango_Estatura_Min DECIMAL(5,2) NOT NULL,
    Rango_Estatura_Max DECIMAL(5,2) NOT NULL,
    Activa BIT NOT NULL DEFAULT 1,
    CONSTRAINT CK_Brazos_Validos CHECK (Brazos_Por_Lado > 0)
  )`);

  // 5. Asignacion Turno
  db.run(`CREATE TABLE IF NOT EXISTS Asignacion_Turno (
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
  )`);

  // 6. Transaccion Financiera
  db.run(`CREATE TABLE IF NOT EXISTS Transaccion_Financiera (
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
  )`);

  // 7. Enseres y Kardex
  db.run(`CREATE TABLE IF NOT EXISTS Catalogo_Enseres (
    ID_Enser INTEGER PRIMARY KEY AUTOINCREMENT,
    Nombre_Articulo TEXT NOT NULL,
    Descripcion TEXT,
    Total_Existencias INTEGER DEFAULT 0
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS Movimiento_Kardex (
    ID_Movimiento INTEGER PRIMARY KEY AUTOINCREMENT,
    ID_Enser INTEGER NOT NULL,
    ID_Usuario_Responsable INTEGER NOT NULL,
    Tipo_Operacion TEXT NOT NULL,
    Cantidad INTEGER NOT NULL,
    Estado_Conservacion TEXT NOT NULL,
    Fecha_Movimiento DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ID_Enser) REFERENCES Catalogo_Enseres(ID_Enser),
    FOREIGN KEY (ID_Usuario_Responsable) REFERENCES Usuario(ID_Usuario)
  )`);

  // 8. Bitacora Auditoria
  db.run(`CREATE TABLE IF NOT EXISTS Bitacora_Auditoria (
    ID_Bitacora INTEGER PRIMARY KEY AUTOINCREMENT,
    ID_Usuario INTEGER NOT NULL,
    Fecha_Hora DATETIME DEFAULT CURRENT_TIMESTAMP,
    Modulo_Afectado TEXT NOT NULL,
    Accion_Realizada TEXT NOT NULL,
    Descripcion_Detalle TEXT,
    IP_Origen TEXT,
    FOREIGN KEY (ID_Usuario) REFERENCES Usuario(ID_Usuario)
  )`);
});

db.close((err) => {
  if (err) return console.error('Error cerrando la base:', err.message);
  console.log('✅ Base de datos SQLite creada exitosamente en database/hermandad.sqlite');
});