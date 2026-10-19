const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getQuery, allQuery } = require('../config/database');

const AuthController = {
  // 1. LOGIN COLABORADORES (ADMIN, TESORERÍA, CAJERO, ENSERES)
  async login(req, res) {
    try {
      let { correo, password } = req.body;

      if (!correo || !password) {
        return res.status(400).json({ 
          mensaje: 'El correo institucional y la contraseña son obligatorios' 
        });
      }

      correo = correo.trim().toLowerCase();

      const usuario = await getQuery(`
        SELECT U.ID_Usuario, U.ID_Rol, U.Nombres, U.Correo_Institucional, 
               U.Password_Hash, U.Estado_Activo, R.Nombre_Rol
        FROM Usuario U
        INNER JOIN Rol R ON U.ID_Rol = R.ID_Rol
        WHERE LOWER(TRIM(U.Correo_Institucional)) = ?
      `, [correo]);

      if (!usuario) {
        return res.status(401).json({ mensaje: 'Correo o contraseña incorrecta' });
      }

      if (usuario.Estado_Activo !== 1) {
        return res.status(403).json({ mensaje: 'La cuenta se encuentra dada de baja o inactiva' });
      }

      const passwordValida = await bcrypt.compare(password, usuario.Password_Hash);
      if (!passwordValida) {
        return res.status(401).json({ mensaje: 'Correo o contraseña incorrecta' });
      }

      const secreto = process.env.JWT_SECRET || 'secreto_hermandad_paz_2026_seguro';
      const expiresIn = process.env.JWT_EXPIRES_IN || '8h';

      const token = jwt.sign(
        {
          id: usuario.ID_Usuario,
          idRol: usuario.ID_Rol,
          rol: usuario.Nombre_Rol,
          nombre: usuario.Nombres,
          correo: usuario.Correo_Institucional
        },
        secreto,
        { expiresIn }
      );

      return res.status(200).json({
        mensaje: 'Inicio de sesión exitoso',
        token,
        usuario: {
          id: usuario.ID_Usuario,
          nombre: usuario.Nombres,
          correo: usuario.Correo_Institucional,
          rol: usuario.Nombre_Rol,
          idRol: usuario.ID_Rol
        }
      });
    } catch (error) {
      console.error('Error en login:', error);
      return res.status(500).json({ mensaje: 'Error interno en el servidor' });
    }
  },

  // 2. LOGIN DEVOTO CARGADOR (CU006: DPI + CORREO ELECTRÓNICO)
  async loginDevoto(req, res) {
    try {
      let { dpi, correo } = req.body;

      if (!dpi || !correo) {
        return res.status(400).json({ 
          mensaje: 'Debe ingresar su DPI y el correo electrónico registrado' 
        });
      }

      dpi = dpi.toString().trim().replace(/[\s-]/g, '');
      correo = correo.trim().toLowerCase();

      // Buscar devoto activo que coincida en DPI y Correo
      const devoto = await getQuery(`
        SELECT ID_Devoto, DPI, Nombres, Apellidos, Telefono, Correo_Electronico,
               Estatura_Hombro_cm, Fecha_Registro, Estado_Activo
        FROM Devoto
        WHERE REPLACE(REPLACE(DPI, '-', ''), ' ', '') = ?
          AND LOWER(TRIM(Correo_Electronico)) = ?
      `, [dpi, correo]);

      if (!devoto) {
        return res.status(401).json({ 
          mensaje: 'Credenciales no coincidentes: El DPI o correo no corresponden a ningún registro activo' 
        });
      }

      if (devoto.Estado_Activo !== 1) {
        return res.status(403).json({ 
          mensaje: 'El registro del devoto se encuentra inactivo. Comuníquese con secretaría' 
        });
      }

      // Historial de turnos asignados con esquema real
      const turnosHistorial = await allQuery(`
        SELECT A.ID_Asignacion, A.Anio_Cuaresma, A.Numero_Turno, A.Brazo_Asignado,
               A.Codigo_Verificacion, A.Estado_Inscripcion, A.Fecha_Asignacion,
               CA.Nombre_Anda, CA.Cantidad_Brazos, CA.Descripcion
        FROM Asignacion_Turno A
        LEFT JOIN Configuracion_Anda CA ON A.ID_Anda = CA.ID_Anda
        WHERE A.ID_Devoto = ?
        ORDER BY A.Anio_Cuaresma DESC, A.Numero_Turno ASC
      `, [devoto.ID_Devoto]);

      // Verificar inscripción o pagos para la temporada actual (2026)
      const anioActual = new Date().getFullYear();
      let inscripcionActual = null;
      try {
        inscripcionActual = await getQuery(`
          SELECT T.ID_Transaccion, T.Numero_Recibo, T.Monto_Quetzales, T.Fecha_Transaccion, T.Codigo_Validacion_Recibo
          FROM Transaccion_Financiera T
          WHERE T.ID_Devoto = ? AND (T.Anio_Cuaresma = ? OR T.Fecha_Transaccion LIKE ?)
          ORDER BY T.ID_Transaccion DESC LIMIT 1
        `, [devoto.ID_Devoto, anioActual, `%${anioActual}%`]);
      } catch (e) {
        // En caso de que no tenga columna Anio_Cuaresma en Transaccion_Financiera
        inscripcionActual = await getQuery(`
          SELECT T.ID_Transaccion, T.Numero_Recibo, T.Monto_Quetzales, T.Fecha_Transaccion, T.Codigo_Validacion_Recibo
          FROM Transaccion_Financiera T
          WHERE T.ID_Devoto = ?
          ORDER BY T.ID_Transaccion DESC LIMIT 1
        `, [devoto.ID_Devoto]);
      }

      const secreto = process.env.JWT_SECRET || 'secreto_hermandad_paz_2026_seguro';
      const token = jwt.sign(
        {
          id: devoto.ID_Devoto,
          idDevoto: devoto.ID_Devoto,
          nombre: `${devoto.Nombres} ${devoto.Apellidos}`,
          dpi: devoto.DPI,
          correo: devoto.Correo_Electronico,
          rol: 'Devoto'
        },
        secreto,
        { expiresIn: '8h' }
      );

      return res.status(200).json({
        mensaje: 'Bienvenido al Portal del Devoto',
        token,
        devoto: {
          id: devoto.ID_Devoto,
          dpi: devoto.DPI,
          nombres: devoto.Nombres,
          apellidos: devoto.Apellidos,
          nombreCompleto: `${devoto.Nombres} ${devoto.Apellidos}`,
          telefono: devoto.Telefono,
          correo: devoto.Correo_Electronico,
          estaturaHombroCm: devoto.Estatura_Hombro_cm,
          fechaRegistro: devoto.Fecha_Registro,
          antiguedadAnios: devoto.Fecha_Registro 
            ? Math.max(0, anioActual - new Date(devoto.Fecha_Registro).getFullYear()) 
            : 0
        },
        inscripcionActual: inscripcionActual || null,
        turnosHistorial: turnosHistorial || []
      });
    } catch (error) {
      console.error('Error en loginDevoto:', error);
      return res.status(500).json({ mensaje: 'Error interno al autenticar devoto' });
    }
  },

  // 3. CONSULTAR PERFIL DEL USUARIO AUTENTICADO
  async obtenerPerfil(req, res) {
    try {
      const usuario = await getQuery(`
        SELECT U.ID_Usuario, U.ID_Rol, U.Nombres, U.Correo_Institucional, R.Nombre_Rol
        FROM Usuario U
        INNER JOIN Rol R ON U.ID_Rol = R.ID_Rol
        WHERE U.ID_Usuario = ?
      `, [req.usuario.id]);

      if (!usuario) {
        return res.status(404).json({ mensaje: 'Usuario no encontrado' });
      }

      return res.status(200).json({
        usuario: {
          id: usuario.ID_Usuario,
          nombre: usuario.Nombres,
          correo: usuario.Correo_Institucional,
          rol: usuario.Nombre_Rol,
          idRol: usuario.ID_Rol
        }
      });
    } catch (error) {
      console.error('Error en obtenerPerfil:', error);
      return res.status(500).json({ mensaje: 'Error interno en el servidor' });
    }
  }
};

module.exports = AuthController;
