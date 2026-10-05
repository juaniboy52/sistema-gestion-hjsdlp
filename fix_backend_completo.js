const fs = require('fs');

// 1. src/models/devotoModel.js - Asegurar update y getById
let devotoModel = fs.readFileSync('src/models/devotoModel.js', 'utf8');
if (!devotoModel.includes('actualizarDevoto')) {
  devotoModel += `

exports.actualizarDevoto = async (id, { dpi, nombres, apellidos, telefono, correo, estaturaHombroCm, estadoActivo }) => {
  const { runQuery } = require('../config/database');
  const sql = \`
    UPDATE Devoto 
    SET DPI = ?, Nombres = ?, Apellidos = ?, Telefono = ?, Correo_Electronico = ?, Estatura_Hombro_cm = ?, Estado_Activo = ?
    WHERE ID_Devoto = ?
  \`;
  return await runQuery(sql, [dpi, nombres, apellidos, telefono, correo, estaturaHombroCm, estadoActivo, id]);
};
`;
  fs.writeFileSync('src/models/devotoModel.js', devotoModel, 'utf8');
}

// 2. src/controllers/devotoController.js - Asegurar actualizar
let devotoCtrl = fs.readFileSync('src/controllers/devotoController.js', 'utf8');
if (!devotoCtrl.includes('actualizarDevoto')) {
  devotoCtrl += `

exports.actualizarDevoto = async (req, res) => {
  try {
    const { id } = req.params;
    const { dpi, nombres, apellidos, telefono, correo, estaturaHombroCm, estadoActivo } = req.body;
    await devotoModel.actualizarDevoto(id, { dpi, nombres, apellidos, telefono, correo, estaturaHombroCm, estadoActivo });
    res.json({ mensaje: 'Devoto actualizado exitosamente' });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al actualizar devoto', error: error.message });
  }
};
`;
  fs.writeFileSync('src/controllers/devotoController.js', devotoCtrl, 'utf8');
}

// 3. src/routes/devotoRoutes.js - Ruta PUT /:id
let devotoRoutes = fs.readFileSync('src/routes/devotoRoutes.js', 'utf8');
if (!devotoRoutes.includes("router.put('/:id'")) {
  devotoRoutes = devotoRoutes.replace(
    "module.exports = router;",
    "router.put('/:id', devotoController.actualizarDevoto);\nmodule.exports = router;"
  );
  fs.writeFileSync('src/routes/devotoRoutes.js', devotoRoutes, 'utf8');
}

// 4. src/models/usuarioModel.js - Asegurar update y restablecer pass
let userModel = fs.readFileSync('src/models/usuarioModel.js', 'utf8');
if (!userModel.includes('actualizarUsuario')) {
  userModel += `

exports.actualizarUsuario = async (id, { nombres, correo, idRol, estadoActivo }) => {
  const { runQuery } = require('../config/database');
  const sql = \`
    UPDATE Usuario 
    SET Nombres = ?, Correo_Institucional = ?, ID_Rol = ?, Estado_Activo = ?
    WHERE ID_Usuario = ?
  \`;
  return await runQuery(sql, [nombres, correo, idRol, estadoActivo, id]);
};

exports.actualizarPassword = async (id, passwordHash) => {
  const { runQuery } = require('../config/database');
  const sql = \`UPDATE Usuario SET Password_Hash = ? WHERE ID_Usuario = ?\`;
  return await runQuery(sql, [passwordHash, id]);
};
`;
  fs.writeFileSync('src/models/usuarioModel.js', userModel, 'utf8');
}

// 5. src/controllers/usuarioController.js - Métodos de actualización y reset pass
let userCtrl = fs.readFileSync('src/controllers/usuarioController.js', 'utf8');
if (!userCtrl.includes('actualizarUsuario')) {
  const bcryptReq = userCtrl.includes("require('bcryptjs')") ? "" : "const bcrypt = require('bcryptjs');\n";
  userCtrl = bcryptReq + userCtrl + `

exports.actualizarUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombres, correo, idRol, estadoActivo } = req.body;
    await usuarioModel.actualizarUsuario(id, { nombres, correo, idRol, estadoActivo });
    res.json({ mensaje: 'Usuario actualizado exitosamente' });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al actualizar usuario', error: error.message });
  }
};

exports.restablecerPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { nuevaPassword } = req.body;
    if (!nuevaPassword || nuevaPassword.length < 6) {
      return res.status(400).json({ mensaje: 'La contraseña debe tener al menos 6 caracteres' });
    }
    const hash = await bcrypt.hash(nuevaPassword, 10);
    await usuarioModel.actualizarPassword(id, hash);
    res.json({ mensaje: 'Contraseña restablecida exitosamente' });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al restablecer contraseña', error: error.message });
  }
};
`;
  fs.writeFileSync('src/controllers/usuarioController.js', userCtrl, 'utf8');
}

// 6. src/routes/usuarioRoutes.js - Rutas PUT y PATCH
let userRoutes = fs.readFileSync('src/routes/usuarioRoutes.js', 'utf8');
if (!userRoutes.includes("router.put('/:id'")) {
  userRoutes = userRoutes.replace(
    "module.exports = router;",
    "router.put('/:id', usuarioController.actualizarUsuario);\nrouter.patch('/:id/password', usuarioController.restablecerPassword);\nmodule.exports = router;"
  );
  fs.writeFileSync('src/routes/usuarioRoutes.js', userRoutes, 'utf8');
}

console.log("✅ Backend configurado con soporte para devotos y usuarios.");
