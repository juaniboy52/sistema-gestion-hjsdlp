const { allQuery, getQuery, runQuery } = require('../config/database');

const AndaModel = {
  async listarTodas(soloActivas = true) {
    let sql = `
      SELECT 
        CA.ID_Anda,
        CA.Nombre_Anda,
        CA.Descripcion,
        CA.Cantidad_Brazos,
        CA.Cantidad_Turnos,
        CA.Anio_Temporada,
        CA.Estado_Activo,
        (CA.Cantidad_Brazos * CA.Cantidad_Turnos) AS Cupo_Maximo,
        (
          SELECT COUNT(*) 
          FROM Asignacion_Turno A 
          WHERE A.ID_Anda = CA.ID_Anda 
            AND A.Anio_Cuaresma = CA.Anio_Temporada
            AND A.Estado_Inscripcion = 'PAGADO'
        ) AS Total_Inscritos
      FROM Configuracion_Anda CA
    `;
    if (soloActivas) {
      sql += ` WHERE CA.Estado_Activo = 1`;
    }
    sql += ` ORDER BY CA.ID_Anda ASC`;
    return await allQuery(sql);
  },

  async listarAndas() {
    return await this.listarTodas(true);
  },

  async obtenerPorId(idAnda) {
    return await getQuery(`
      SELECT 
        ID_Anda,
        Nombre_Anda,
        Descripcion,
        Cantidad_Brazos,
        Cantidad_Turnos,
        Anio_Temporada,
        Estado_Activo
      FROM Configuracion_Anda 
      WHERE ID_Anda = ?
    `, [idAnda]);
  },

  async crearAnda(datos) {
    const { nombreAnda, descripcion, cantidadBrazos, cantidadTurnos, anioTemporada } = datos;
    const res = await runQuery(`
      INSERT INTO Configuracion_Anda (Nombre_Anda, Descripcion, Cantidad_Brazos, Cantidad_Turnos, Anio_Temporada, Estado_Activo)
      VALUES (?, ?, ?, ?, ?, 1)
    `, [nombreAnda, descripcion || '', cantidadBrazos, cantidadTurnos, anioTemporada || 2026]);
    return await this.obtenerPorId(res.lastID);
  },

  async actualizarAnda(idAnda, datos) {
    const { nombreAnda, descripcion, cantidadBrazos, cantidadTurnos } = datos;
    await runQuery(`
      UPDATE Configuracion_Anda
      SET 
        Nombre_Anda = COALESCE(?, Nombre_Anda),
        Descripcion = COALESCE(?, Descripcion),
        Cantidad_Brazos = COALESCE(?, Cantidad_Brazos),
        Cantidad_Turnos = COALESCE(?, Cantidad_Turnos)
      WHERE ID_Anda = ?
    `, [nombreAnda, descripcion, cantidadBrazos, cantidadTurnos, idAnda]);
    return await this.obtenerPorId(idAnda);
  },

  async cambiarEstadoAnda(idAnda, nuevoEstado) {
    return await runQuery(`
      UPDATE Configuracion_Anda
      SET Estado_Activo = ?
      WHERE ID_Anda = ?
    `, [nuevoEstado, idAnda]);
  },

    async ejecutarSorteoPorAltura(idAnda, anioTemporada = 2026) {
    // 1. Obtener configuración del anda
    const anda = await getQuery(
      'SELECT ID_Anda, Nombre_Anda, Cantidad_Brazos, Cantidad_Turnos, Anio_Temporada FROM Configuracion_Anda WHERE ID_Anda = ?',
      [idAnda]
    );
    if (!anda) throw new Error('El anda procesional no existe.');

    const totalBrazos = Number(anda.Cantidad_Brazos) || 40;
    const totalTurnos = Number(anda.Cantidad_Turnos) || 1;
    const capacidadMaxima = totalBrazos * totalTurnos;

    // 2. Obtener devotos inscritos y pagados
    const devotosInscritos = await allQuery(
      `SELECT a.ID_Asignacion, a.ID_Devoto, d.Nombres, d.Apellidos, d.DPI, 
              COALESCE(d.Estatura_Hombro_cm, 165.0) AS Estatura
       FROM Asignacion_Turno a
       JOIN Devoto d ON a.ID_Devoto = d.ID_Devoto
       WHERE a.ID_Anda = ? AND a.Anio_Cuaresma = ?
         AND (a.Estado_Inscripcion = 'PAGADO' OR a.Estado_Inscripcion = 'Asignado' OR a.Estado_Inscripcion = 'ASIGNADO')`,
      [idAnda, anioTemporada]
    );

    if (!devotosInscritos || devotosInscritos.length === 0) {
      throw new Error('No hay devotos con pago registrado para sortear en este cortejo procesional.');
    }

    // 3. Histórico de turnos previos para evitar repetir el turno del año anterior
    const historico = await allQuery(
      'SELECT ID_Devoto, Numero_Turno FROM Asignacion_Turno WHERE ID_Anda = ? AND Anio_Cuaresma < ?',
      [idAnda, anioTemporada]
    );
    const turnosPrevios = new Map();
    historico.forEach(h => {
      if (!turnosPrevios.has(h.ID_Devoto)) {
        turnosPrevios.set(h.ID_Devoto, new Set());
      }
      turnosPrevios.get(h.ID_Devoto).add(h.Numero_Turno);
    });

    // 4. Distribuir a los devotos entre los turnos con rotación interanual
    // Mezcla aleatoria inicial (Fisher-Yates) para que los turnos varíen cada año
    const devotosAleatorios = [...devotosInscritos];
    for (let i = devotosAleatorios.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [devotosAleatorios[i], devotosAleatorios[j]] = [devotosAleatorios[j], devotosAleatorios[i]];
    }

    const turnosBuckets = Array.from({ length: totalTurnos }, () => []);

    // Repartir en turnos priorizando no repetir turnos previos
    for (const devoto of devotosAleatorios) {
      // Buscar el turno con cupo disponible donde el devoto no haya cargado previamente
      let mejorTurnoIdx = -1;
      let mejorPrioridad = Infinity;

      for (let t = 0; t < totalTurnos; t++) {
        if (turnosBuckets[t].length < totalBrazos) {
          const yaCargoEsteTurno = turnosPrevios.get(devoto.ID_Devoto)?.has(t + 1) ? 1 : 0;
          if (yaCargoEsteTurno < mejorPrioridad) {
            mejorPrioridad = yaCargoEsteTurno;
            mejorTurnoIdx = t;
          }
        }
      }

      if (mejorTurnoIdx !== -1) {
        turnosBuckets[mejorTurnoIdx].push(devoto);
      }
    }

    // 5. En cada turno, ordenar de MENOR A MAYOR (pequeños adelante, altos atrás)
    const asignaciones = [];

    for (let t = 0; t < totalTurnos; t++) {
      const grupoTurno = turnosBuckets[t];
      if (grupoTurno.length === 0) continue;

      // Orden ASCENDENTE: menor estatura a mayor estatura
      grupoTurno.sort((a, b) => a.Estatura - b.Estatura);

      // Asignar brazos progresivamente:
      // Brazo 1 (frente izq) y Brazo 2 (frente der) reciben las estaturas más bajas
      // Brazo N-1 y Brazo N (cola) reciben las estaturas más altas
      for (let b = 0; b < grupoTurno.length; b++) {
        asignaciones.push({
          idAsignacion: grupoTurno[b].ID_Asignacion,
          idDevoto: grupoTurno[b].ID_Devoto,
          numeroTurno: t + 1,
          brazoAsignado: b + 1 // 1 hasta totalBrazos
        });
      }
    }

    // 6. Actualizar las asignaciones en la base de datos
    for (const item of asignaciones) {
      await runQuery(
        `UPDATE Asignacion_Turno 
         SET Numero_Turno = ?, Brazo_Asignado = ?, Estado_Inscripcion = 'PAGADO'
         WHERE ID_Asignacion = ?`,
        [item.numeroTurno, item.brazoAsignado, item.idAsignacion]
      );
    }

    return {
      totalAsignados: asignaciones.length,
      turnosGenerados: turnosBuckets.filter(b => b.length > 0).length,
      capacidadMaxima
    };
  },

};

module.exports = AndaModel;
