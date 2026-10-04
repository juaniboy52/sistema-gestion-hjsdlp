const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const initSqlJs = require('sql.js');

async function initDB() {
  const dbDir = path.join(__dirname, 'database');
  const dbPath = path.join(dbDir, 'hermandad.sqlite');

  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
  }

  const SQL = await initSqlJs();
  const db = new SQL.Database();

  console.log('📦 Creando esquema con todas las columnas...');

  db.run(`
    -- 1. Roles y Usuarios
    CREATE TABLE Rol (
      ID_Rol INTEGER PRIMARY KEY AUTOINCREMENT,
      Nombre_Rol TEXT NOT NULL UNIQUE,
      Descripcion TEXT
    );

    CREATE TABLE Usuario (
      ID_Usuario INTEGER PRIMARY KEY AUTOINCREMENT,
      ID_Rol INTEGER NOT NULL,
      Nombres TEXT NOT NULL,
      Apellidos TEXT,
      Correo_Institucional TEXT NOT NULL UNIQUE,
      Password_Hash TEXT NOT NULL,
      Estado_Activo INTEGER DEFAULT 1,
      Fecha_Creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (ID_Rol) REFERENCES Rol(ID_Rol)
    );

    -- 2. Devotos
    CREATE TABLE Devoto (
      ID_Devoto INTEGER PRIMARY KEY AUTOINCREMENT,
      DPI TEXT NOT NULL UNIQUE,
      Nombres TEXT NOT NULL,
      Apellidos TEXT NOT NULL,
      Telefono TEXT,
      Correo_Electronico TEXT,
      Estatura_Hombro_cm REAL,
      Cuenta_Activada INTEGER DEFAULT 1,
      Estado_Activo INTEGER DEFAULT 1,
      Fecha_Registro DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 3. Andas, Turnos y Asignaciones
    CREATE TABLE Anda (
      ID_Anda INTEGER PRIMARY KEY AUTOINCREMENT,
      Nombre_Mueble TEXT NOT NULL,
      Capacidad_Brazos INTEGER NOT NULL,
      Genero TEXT DEFAULT 'Mixto'
    );

    CREATE TABLE Turno (
      ID_Turno INTEGER PRIMARY KEY AUTOINCREMENT,
      ID_Anda INTEGER NOT NULL,
      Numero_Turno INTEGER NOT NULL,
      Anio_Cuaresma INTEGER NOT NULL,
      Descripcion_Marcha TEXT,
      Precio_Turno REAL DEFAULT 0.00,
      FOREIGN KEY (ID_Anda) REFERENCES Anda(ID_Anda)
    );

    CREATE TABLE Asignacion_Turno (
      ID_Asignacion INTEGER PRIMARY KEY AUTOINCREMENT,
      ID_Devoto INTEGER NOT NULL,
      ID_Anda INTEGER NOT NULL,
      Anio_Cuaresma INTEGER NOT NULL,
      Numero_Turno INTEGER NOT NULL,
      Brazo_Asignado INTEGER,
      Codigo_Verificacion TEXT,
      Estado_Inscripcion TEXT DEFAULT 'Asignado',
      Fecha_Asignacion DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (ID_Devoto) REFERENCES Devoto(ID_Devoto),
      FOREIGN KEY (ID_Anda) REFERENCES Anda(ID_Anda)
    );

    -- 4. Enseres e Inventario
    CREATE TABLE Catalogo_Enseres (
      ID_Enser INTEGER PRIMARY KEY AUTOINCREMENT,
      Nombre_Articulo TEXT NOT NULL,
      Descripcion TEXT,
      Total_Existencias INTEGER DEFAULT 0
    );

    CREATE TABLE Kardex_Enseres (
      ID_Kardex INTEGER PRIMARY KEY AUTOINCREMENT,
      ID_Enser INTEGER NOT NULL,
      ID_Usuario INTEGER NOT NULL,
      Tipo_Operacion TEXT NOT NULL,
      Cantidad INTEGER NOT NULL,
      Estado_Conservacion TEXT,
      Fecha_Movimiento DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (ID_Enser) REFERENCES Catalogo_Enseres(ID_Enser),
      FOREIGN KEY (ID_Usuario) REFERENCES Usuario(ID_Usuario)
    );

    -- 5. Finanzas
    CREATE TABLE Transaccion_Financiera (
      ID_Transaccion INTEGER PRIMARY KEY AUTOINCREMENT,
      Numero_Recibo TEXT UNIQUE,
      ID_Usuario_Cajero INTEGER,
      ID_Devoto INTEGER,
      Tipo_Movimiento TEXT NOT NULL,
      Concepto_Descripcion TEXT NOT NULL,
      Monto_Quetzales REAL NOT NULL,
      Metodo_Pago TEXT DEFAULT 'Efectivo',
      Codigo_Validacion_Recibo TEXT,
      Encargado_Gasto TEXT,
      Fecha_Transaccion DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (ID_Usuario_Cajero) REFERENCES Usuario(ID_Usuario),
      FOREIGN KEY (ID_Devoto) REFERENCES Devoto(ID_Devoto)
    );

    -- 6. Auditoría
    CREATE TABLE Bitacora_Auditoria (
      ID_Bitacora INTEGER PRIMARY KEY AUTOINCREMENT,
      ID_Usuario INTEGER NOT NULL,
      Modulo_Afectado TEXT NOT NULL,
      Accion_Realizada TEXT NOT NULL,
      Descripcion_Detalle TEXT,
      IP_Origen TEXT,
      Fecha_Hora DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (ID_Usuario) REFERENCES Usuario(ID_Usuario)
    );
  `);

  console.log('🌱 Insertando roles, admin y registros iniciales...');

  db.run(`
    INSERT INTO Rol (ID_Rol, Nombre_Rol, Descripcion) VALUES 
    (1, 'Administrador', 'Acceso global y configuración'),
    (2, 'Secretaría', 'Gestión de devotos e inscripciones'),
    (3, 'Tesorería', 'Control contable y financiero'),
    (4, 'Enseres', 'Inventario y resguardo procesional');
  `);

  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash('Admin1234!*', salt);

  db.run(`
    INSERT INTO Usuario (ID_Rol, Nombres, Apellidos, Correo_Institucional, Password_Hash, Estado_Activo)
    VALUES (1, 'Administrador', 'General', 'admin@hermandadpaz.gt', ?, 1);
  `, [hash]);

  db.run(`
    INSERT INTO Anda (ID_Anda, Nombre_Mueble, Capacidad_Brazos, Genero)
    VALUES (1, 'Mueble Jesús Nazareno de la Paz', 80, 'Masculino');
  `);

  const data = db.export();
  fs.writeFileSync(dbPath, Buffer.from(data));

  console.log('✅ Base de datos generada exitosamente.');
  console.log('🔑 Credenciales admin: admin@hermandadpaz.gt / Admin1234!*');
}

initDB().catch(console.error);
