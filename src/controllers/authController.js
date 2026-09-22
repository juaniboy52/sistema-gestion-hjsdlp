const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getQuery } = require('../config/database');

const AuthController = {
  // POST /api/auth/login
  async login(req, res) {
    try {
      const { correo, password } = req.body;

      if (!correo || !password) {
        return res.status(400).json({ 
          mensaje: 'El correo institucional y la contraseña son obligatorios' 
        });
      }

      // Buscar usuario activo con su rol
      const usuario = await getQuery(`
        SELECT U.ID_Usuario, U.ID_Rol, U.Nombres, U.Correo_Institucional, 
               U.Password_Hash, U.Estado_Activo, R.Nombre_Rol
        FROM Usuario U
        INNER JOIN Rol R ON U.ID_Rol = R.ID_Rol
        WHERE U.Correo_Institucional = ?
      `, [correo.trim().toLowerCase()]);

      if (!usuario) {
        return res.status(401).json({ mensaje: 'Credenciales inválidas' });
      }

      if (usuario.Estado_Activo !== 1) {
        return res.status(403).json({ mensaje: 'La cuenta de usuario se encuentra inactiva' });
      }

      // Comparar contraseña con el hash bcrypt
      const passwordValida = await bcrypt.compare(password, usuario.Password_Hash);
      if (!passwordValida) {
        return res.status(401).json({ mensaje: 'Credenciales inválidas' });
      }

      // Generar JWT
      const secreto = process.env.JWT_SECRET || 'secreto_hermandad_paz_2026_seguro';
      const expiresIn = process.env.JWT_EXPIRES_IN || '8h';

      const token = jwt.sign(
        {
          idUsuario: usuario.ID_Usuario,
          correo: usuario.Correo_Institucional,
          idRol: usuario.ID_Rol,
          nombreRol: usuario.Nombre_Rol,
          nombres: usuario.Nombres
        },
        secreto,
        { expiresIn }
      );

      return res.status(200).json({
        mensaje: 'Inicio de sesión exitoso',
        token,
        usuario: {
          idUsuario: usuario.ID_Usuario,
          nombres: usuario.Nombres,
          correo: usuario.Correo_Institucional,
          idRol: usuario.ID_Rol,
          rol: usuario.Nombre_Rol
        }
      });
    } catch (error) {
      console.error('Error en autenticación:', error);
      return res.status(500).json({ mensaje: 'Error interno del servidor en el inicio de sesión' });
    }
  },

  // GET /api/auth/perfil (Ruta de verificación de token)
  async obtenerPerfil(req, res) {
    return res.status(200).json({
      mensaje: 'Token verificado correctamente',
      usuario: req.usuario
    });
  }
};

module.exports = AuthController;
