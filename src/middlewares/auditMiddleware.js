const AuditoriaModel = require('../models/auditoriaModel');

function auditMiddleware(req, res, next) {
  // Interceptar la finalización del ciclo de respuesta HTTP
  res.on('finish', () => {
    const metodosAuditables = ['POST', 'PUT', 'PATCH', 'DELETE'];

    // Registrar únicamente operaciones de mutación exitosas
    if (metodosAuditables.includes(req.method) && res.statusCode >= 200 && res.statusCode < 300) {
      const ruta = req.baseUrl || req.path;

      // Determinar módulo afectado según la ruta base
      let modulo = 'GENERAL';
      if (ruta.includes('devotos')) modulo = 'DEVOTOS';
      else if (ruta.includes('turnos')) modulo = 'TURNOS_Y_FINANZAS';
      else if (ruta.includes('enseres')) modulo = 'KARDEX_ENSERES';
      else if (ruta.includes('auth')) modulo = 'SEGURIDAD';

      // Identificar usuario (desde autenticación JWT o cuerpo de la petición)
      const idUsuario = (req.usuario && req.usuario.id) ||
                        req.body.idUsuarioAsigno ||
                        req.body.idUsuarioResponsable ||
                        1;

      // Sanitizar cuerpo para evitar registrar contraseñas en texto plano
      const cuerpoSanitizado = { ...req.body };
      delete cuerpoSanitizado.password;
      delete cuerpoSanitizado.passwordHash;

      const ipOrigen = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';

      AuditoriaModel.registrar({
        idUsuario,
        moduloAfectado: modulo,
        accionRealizada: `${req.method} ${req.originalUrl}`,
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
