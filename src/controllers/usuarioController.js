const bcrypt = require('bcryptjs');
const { runQuery, getQuery, allQuery } = require('../config/database');

const UsuarioController = {
  // GET /api/usuarios
  async listar(req, res) {
    try {
      const usuarios = await allQuery(`
        SELECT U.ID_Usuario, U.Nombres, U.Correo_Institucional, U.Estado_Activo, U.Fecha_Creacion,
               R.ID_Rol, R.Nombre_Rol
        FROM Usuario U
        INNER JOIN Rol R ON U.ID_Rol = R.ID_Rol
        ORDER BY U.ID_Usuario ASC
      `);
      return res.status(200).json({ total: usuarios.length, usuarios });
    } catch (error) {
      return res.status(500).json({ mensaje: 'Error al listar usuarios' });
    }
  },

  // POST /api/usuarios (Alta de nuevo usuario)
  async crear(req, res) {
    try {
      const { nombres, correo, password, idRol } = req.body;
      if (!nombres || !correo || !password || !idRol) {
        return res.status(400).json({ mensaje: 'Todos los campos son obligatorios' });
      }

      const existe = await getQuery('SELECT ID_Usuario FROM Usuario WHERE Correo_Institucional = ?', [correo.trim().toLowerCase()]);
      if (existe) {
        return res.status(409).json({ mensaje: 'El correo ya está registrado' });
      }

      const hash = await bcrypt.hash(password, 10);
      await runQuery(
        `INSERT INTO Usuario (ID_Rol, Nombres, Correo_Institucional, Password_Hash, Estado_Activo)
         VALUES (?, ?, ?, ?, 1)`,
        [idRol, nombres, correo.trim().toLowerCase(), hash]
      );

      return res.status(201).json({ mensaje: 'Usuario creado exitosamente' });
    } catch (error) {
      return res.status(500).json({ mensaje: 'Error al registrar usuario' });
    }
  },

  // PATCH /api/usuarios/:id/estado (Alta / Baja lógica)
  async alternarEstado(req, res) {
    try {
      const { id } = req.params;
      const { estadoActivo } = req.body; // 1 = Activo, 0 = Inactivo

      if (estadoActivo !== 0 && estadoActivo !== 1) {
        return res.status(400).json({ mensaje: 'El estado debe ser 1 (activo) o 0 (inactivo)' });
      }

      // Evitar que el administrador se desactive a sí mismo
      if (req.usuario && req.usuario.idUsuario === parseInt(id, 10)) {
        return res.status(400).json({ mensaje: 'No puedes desactivar tu propia cuenta de administrador' });
      }

      await runQuery('UPDATE Usuario SET Estado_Activo = ? WHERE ID_Usuario = ?', [estadoActivo, id]);
      return res.status(200).json({ 
        mensaje: `Usuario ${estadoActivo === 1 ? 'activado' : 'desactivado (baja lógica)'} correctamente` 
      });
    } catch (error) {
      return res.status(500).json({ mensaje: 'Error al actualizar estado del usuario' });
    }
  }
};

module.exports = UsuarioController;
