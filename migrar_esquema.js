const { db, allQuery, runQuery } = require('./src/config/database');

async function migrar() {
  console.log("Iniciando migración de llaves foráneas hacia Configuracion_Anda...");

  try {
    // 1. Desactivar temporalmente revisión de foreign keys para permitir la reestructuración
    await runQuery("PRAGMA foreign_keys = OFF;");
    await runQuery("BEGIN TRANSACTION;");

    // ==========================================
    // 2. REESTRUCTURAR TABLA: Turno
    // ==========================================
    console.log("-> Recreando tabla Turno con FK hacia Configuracion_Anda...");
    await runQuery("ALTER TABLE Turno RENAME TO Turno_temp_viejo;");

    await runQuery(`
      CREATE TABLE Turno (
        ID_Turno INTEGER PRIMARY KEY AUTOINCREMENT,
        ID_Anda INTEGER NOT NULL,
        Numero_Turno INTEGER NOT NULL,
        Anio_Cuaresma INTEGER NOT NULL,
        Descripcion_Marcha TEXT,
        Precio_Turno REAL DEFAULT 0.00,
        FOREIGN KEY (ID_Anda) REFERENCES Configuracion_Anda(ID_Anda)
      );
    `);

    await runQuery(`
      INSERT INTO Turno (ID_Turno, ID_Anda, Numero_Turno, Anio_Cuaresma, Descripcion_Marcha, Precio_Turno)
      SELECT ID_Turno, ID_Anda, Numero_Turno, Anio_Cuaresma, Descripcion_Marcha, Precio_Turno
      FROM Turno_temp_viejo;
    `);

    await runQuery("DROP TABLE Turno_temp_viejo;");

    // ==========================================
    // 3. REESTRUCTURAR TABLA: Asignacion_Turno
    // ==========================================
    console.log("-> Recreando tabla Asignacion_Turno con FK hacia Configuracion_Anda...");
    await runQuery("ALTER TABLE Asignacion_Turno RENAME TO Asignacion_Turno_temp_viejo;");

    await runQuery(`
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
        FOREIGN KEY (ID_Anda) REFERENCES Configuracion_Anda(ID_Anda)
      );
    `);

    await runQuery(`
      INSERT INTO Asignacion_Turno (ID_Asignacion, ID_Devoto, ID_Anda, Anio_Cuaresma, Numero_Turno, Brazo_Asignado, Codigo_Verificacion, Estado_Inscripcion, Fecha_Asignacion)
      SELECT ID_Asignacion, ID_Devoto, ID_Anda, Anio_Cuaresma, Numero_Turno, Brazo_Asignado, Codigo_Verificacion, Estado_Inscripcion, Fecha_Asignacion
      FROM Asignacion_Turno_temp_viejo;
    `);

    await runQuery("DROP TABLE Asignacion_Turno_temp_viejo;");

    // ==========================================
    // 4. ELIMINAR LA TABLA Anda OBSOLETA
    // ==========================================
    console.log("-> Eliminando la tabla 'Anda'...");
    await runQuery("DROP TABLE IF EXISTS Anda;");

    // 5. Confirmar transacción y reactivar foreign keys
    await runQuery("COMMIT;");
    await runQuery("PRAGMA foreign_keys = ON;");

    console.log("✅ Migración completada con éxito. Tabla 'Anda' eliminada.");
  } catch (err) {
    await runQuery("ROLLBACK;");
    await runQuery("PRAGMA foreign_keys = ON;");
    console.error("❌ Error en la migración. Se aplicó ROLLBACK:", err);
  }
}

migrar().then(() => process.exit(0));
