const jwt = require('jsonwebtoken');

function verificarToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Formato: Bearer <token>

  if (!token) {
    return res.status(401).json({ 
      mensaje: 'Acceso no autorizado: No se proporcionó token de sesión' 
    });
  }

  try {
    const secreto = process.env.JWT_SECRET || 'secreto_hermandad_paz_2026_seguro';
    const payload = jwt.verify(token, secreto);
    req.usuario = payload; // Contiene: { idUsuario, correo, idRol, nombreRol, nombres }
    next();
  } catch (error) {
    return res.status(403).json({ 
      mensaje: 'Token inválido, expirado o manipulado' 
    });
  }
}

// Middleware de orden superior para validar uno o varios roles
function permitirRoles(...rolesPermitidos) {
  return (req, res, next) => {
    if (!req.usuario || !rolesPermitidos.includes(req.usuario.idRol)) {
      return res.status(403).json({
        mensaje: 'Acceso denegado: Tu perfil no cuenta con los permisos requeridos para esta acción'
      });
    }
    next();
  };
}

module.exports = {
  verificarToken,
  permitirRoles
};
