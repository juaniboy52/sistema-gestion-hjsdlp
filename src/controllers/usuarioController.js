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
      console.error('Error al listar usuarios:', error);
      return res.status(500).json({ mensaje: 'Error al listar usuarios' });
    }
  },

  // POST /api/usuarios
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
      console.error('Error al crear usuario:', error);
      return res.status(500).json({ mensaje: 'Error interno al crear usuario' });
    }
  },

  // PATCH /api/usuarios/:id/estado
  async alternarEstado(req, res) {
    try {
      const { id } = req.params;
      const user = await getQuery('SELECT Estado_Activo FROM Usuario WHERE ID_Usuario = ?', [id]);
      if (!user) {
        return res.status(404).json({ mensaje: 'Usuario no encontrado' });
      }

      const nuevoEstado = user.Estado_Activo === 1 ? 0 : 1;
      await runQuery('UPDATE Usuario SET Estado_Activo = ? WHERE ID_Usuario = ?', [nuevoEstado, id]);

      return res.status(200).json({ mensaje: `Usuario ${nuevoEstado === 1 ? 'activado' : 'desactivado'} con éxito`, nuevoEstado });
    } catch (error) {
      console.error('Error al alternar estado:', error);
      return res.status(500).json({ mensaje: 'Error al cambiar estado' });
    }
  },

  // PUT /api/usuarios/:id
  async actualizarUsuario(req, res) {
    try {
      const { id } = req.params;
      const { nombres, correo, idRol, estadoActivo } = req.body;

      if (!nombres || !correo || !idRol) {
        return res.status(400).json({ mensaje: 'Nombres, correo y rol son requeridos' });
      }

      const duplicado = await getQuery(
        'SELECT ID_Usuario FROM Usuario WHERE Correo_Institucional = ? AND ID_Usuario != ?',
        [correo.trim().toLowerCase(), id]
      );
      if (duplicado) {
        return res.status(409).json({ mensaje: 'El correo ya pertenece a otro usuario' });
      }

      await runQuery(
        `UPDATE Usuario 
         SET Nombres = ?, Correo_Institucional = ?, ID_Rol = ?, Estado_Activo = ?
         WHERE ID_Usuario = ?`,
        [nombres.trim(), correo.trim().toLowerCase(), idRol, estadoActivo !== undefined ? estadoActivo : 1, id]
      );

      return res.status(200).json({ mensaje: 'Usuario actualizado exitosamente' });
    } catch (error) {
      console.error('Error al actualizar usuario:', error);
      return res.status(500).json({ mensaje: 'Error al actualizar datos del usuario' });
    }
  },

  // PATCH /api/usuarios/:id/password
  async restablecerPassword(req, res) {
    try {
      const { id } = req.params;
      const { nuevaPassword } = req.body;

      if (!nuevaPassword || nuevaPassword.trim().length < 6) {
        return res.status(400).json({ mensaje: 'La contraseña debe contener al menos 6 caracteres' });
      }

      const hash = await bcrypt.hash(nuevaPassword.trim(), 10);
      await runQuery(
        'UPDATE Usuario SET Password_Hash = ? WHERE ID_Usuario = ?',
        [hash, id]
      );

      return res.status(200).json({ mensaje: 'Contraseña restablecida correctamente' });
    } catch (error) {
      console.error('Error al restablecer contraseña:', error);
      return res.status(500).json({ mensaje: 'Error al restablecer contraseña' });
    }
  }
};

module.exports = UsuarioController;
