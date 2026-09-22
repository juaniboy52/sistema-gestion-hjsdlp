const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '../../database/hermandad.sqlite');
let dbInstance = null;

async function getDatabase() {
  if (dbInstance) return dbInstance;

  const SQL = await initSqlJs();
  if (fs.existsSync(dbPath)) {
    const filebuffer = fs.readFileSync(dbPath);
    dbInstance = new SQL.Database(filebuffer);
  } else {
    dbInstance = new SQL.Database();
  }
  return dbInstance;
}

function persistDatabase(db) {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);
}

// Ejecutar INSERT, UPDATE, DELETE
async function runQuery(sql, params = []) {
  const db = await getDatabase();
  db.run(sql, params);
  persistDatabase(db);
  return { changes: db.getRowsModified() };
}

// Consultar múltiples filas (SELECT)
async function allQuery(sql, params = []) {
  const db = await getDatabase();
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

// Consultar una fila única (SELECT LIMIT 1)
async function getQuery(sql, params = []) {
  const rows = await allQuery(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

module.exports = {
  getDatabase,
  runQuery,
  allQuery,
  getQuery
};
