const AuditoriaModel = require('../models/auditoriaModel');

function auditMiddleware(req, res, next) {
  // Capturar el cuerpo de respuesta (para extraer el usuario logueado en /auth/login)
  const originalJson = res.json;
  let resBody = null;

  res.json = function (body) {
    resBody = body;
    return originalJson.apply(this, arguments);
  };

  // Interceptar la finalización del ciclo de respuesta HTTP
  res.on('finish', () => {
    const metodosAuditables = ['POST', 'PUT', 'PATCH', 'DELETE'];

    // Registrar únicamente operaciones de mutación exitosas
    if (metodosAuditables.includes(req.method) && res.statusCode >= 200 && res.statusCode < 300) {
      const ruta = req.baseUrl || req.path || '';
      const originalUrl = req.originalUrl || req.url || '';

      // Determinar módulo afectado según la ruta base
      let modulo = 'GENERAL';
      if (ruta.includes('devotos') || originalUrl.includes('devotos')) modulo = 'DEVOTOS';
      else if (ruta.includes('turnos') || ruta.includes('finanzas') || originalUrl.includes('turnos') || originalUrl.includes('finanzas')) modulo = 'FINANZAS';
      else if (ruta.includes('enseres') || originalUrl.includes('enseres')) modulo = 'KARDEX_ENSERES';
      else if (ruta.includes('auth') || originalUrl.includes('auth')) modulo = 'SEGURIDAD';

      // 1. Identificar el ID del usuario correctamente
      let idUsuario = null;

      // Si es un inicio de sesión exitoso, extraer el ID del usuario devuelto por el login
      if (originalUrl.includes('/auth/login') && resBody && resBody.usuario) {
        idUsuario = resBody.usuario.idUsuario || resBody.usuario.id || resBody.usuario.ID_Usuario || null;
      }

      // Si no fue login o no vino en body, buscar en req.usuario (JWT)
      if (!idUsuario && req.usuario) {
        idUsuario = req.usuario.idUsuario || req.usuario.id || req.usuario.ID_Usuario || null;
      }

      // Buscar en parámetros explícitos de la solicitud
      if (!idUsuario) {
        idUsuario = req.body?.idUsuarioAsigno || 
                    req.body?.idUsuarioResponsable || 
                    req.body?.idUsuario || 
                    null;
      }

      // Sanitizar cuerpo para evitar registrar contraseñas en texto plano
      const cuerpoSanitizado = { ...req.body };
      delete cuerpoSanitizado.password;
      delete cuerpoSanitizado.passwordHash;
      delete cuerpoSanitizado.contrasena;

      const ipOrigen = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';

      AuditoriaModel.registrar({
        idUsuario: idUsuario, // Enviamos el ID real o null, sin forzar 1
        moduloAfectado: modulo,
        accionRealizada: `${req.method} ${originalUrl}`,
        descripcionDetalle: JSON.stringify({
          status: res.statusCode,
          parametros: cuerpoSanitizado
        }),
        ipOrigen: typeof ipOrigen === 'string' ? ipOrigen.split(',')[0].trim() : '127.0.0.1'
      }).catch((err) => {
        console.error('Error al registrar evento de auditoría:', err.message);
      });
    }
  });

  next();
}

module.exports = auditMiddleware;
