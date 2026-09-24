const { runQuery, getQuery } = require('../config/database');
const crypto = require('crypto');

const FinanzasController = {
  // POST /api/finanzas/ofrenda
  async registrarOfrenda(req, res) {
    try {
      const {
        nombreBienhechor = 'Devoto Anónimo / Fiel General',
        conceptoDescripcion,
        montoQuetzales,
        metodoPago = 'Efectivo',
        anioCuaresma = 2026
      } = req.body;

      const idUsuarioCajero = req.usuario ? req.usuario.idUsuario : 1;

      if (!conceptoDescripcion || !montoQuetzales) {
        return res.status(400).json({ 
          mensaje: 'El concepto de la ofrenda y el monto en Quetzales son obligatorios' 
        });
      }

      const monto = parseFloat(montoQuetzales);
      if (isNaN(monto) || monto <= 0) {
        return res.status(400).json({ mensaje: 'El monto debe ser un valor numérico mayor a 0' });
      }

      const timestamp = Date.now().toString().slice(-6) + Math.floor(Math.random() * 10);
      const numeroRecibo = `OFR-${anioCuaresma}-${timestamp}`;
      const codigoValidacion = crypto.randomBytes(16).toString('hex').toUpperCase();

      await runQuery(`
        INSERT INTO Transaccion_Financiera (
          Numero_Recibo,
          ID_Usuario_Cajero,
          ID_Devoto,
          Tipo_Movimiento,
          Concepto_Descripcion,
          Monto_Quetzales,
          Metodo_Pago,
          Codigo_Validacion_Recibo
        ) VALUES (?, ?, NULL, 'Ingreso', ?, ?, ?, ?)
      `, [
        numeroRecibo,
        idUsuarioCajero,
        `[OFRENDA/DONATIVO: ${nombreBienhechor}] ${conceptoDescripcion}`,
        monto,
        metodoPago,
        codigoValidacion
      ]);

      return res.status(201).json({
        mensaje: 'Ofrenda / Ingreso extraordinario registrado exitosamente en caja',
        comprobante: {
          numeroRecibo,
          codigoValidacion,
          donante: nombreBienhechor,
          concepto: conceptoDescripcion,
          montoQuetzales: monto,
          metodoPago,
          fecha: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error al registrar ofrenda:', error);
      return res.status(500).json({ mensaje: 'Error interno al registrar la ofrenda en el sistema' });
    }
  },

  // POST /api/finanzas/egreso
  async registrarEgreso(req, res) {
    try {
      const {
        proveedorBeneficiario,
        conceptoGasto,
        montoQuetzales,
        categoriaGasto = 'Operativo Procesional',
        metodoPago = 'Efectivo',
        numeroFacturaComprobante = 'S/F',
        anioCuaresma = 2026
      } = req.body;

      const idUsuarioCajero = req.usuario ? req.usuario.idUsuario : 1;

      // 1. Validaciones requeridas
      if (!proveedorBeneficiario || !conceptoGasto || !montoQuetzales) {
        return res.status(400).json({
          mensaje: 'El proveedor/beneficiario, el concepto del gasto y el monto son obligatorios'
        });
      }

      const monto = parseFloat(montoQuetzales);
      if (isNaN(monto) || monto <= 0) {
        return res.status(400).json({ mensaje: 'El monto del egreso debe ser un número mayor a 0' });
      }

      // 2. Control contable: Verificar que haya liquidez en caja antes de autorizar el desembolso
      const balanceActual = await getQuery(`
        SELECT 
          (COALESCE(SUM(CASE WHEN Tipo_Movimiento = 'Ingreso' THEN Monto_Quetzales ELSE 0 END), 0) -
           COALESCE(SUM(CASE WHEN Tipo_Movimiento = 'Egreso' THEN Monto_Quetzales ELSE 0 END), 0)) AS Disponible_Caja_Q
        FROM Transaccion_Financiera
      `);

      if (balanceActual.Disponible_Caja_Q < monto) {
        return res.status(409).json({
          mensaje: `Fondos insuficientes en caja. Saldo actual disponible: Q${parseFloat(balanceActual.Disponible_Caja_Q).toFixed(2)}, monto solicitado: Q${monto.toFixed(2)}`
        });
      }

      // 3. Generar identificadores de comprobante
      const timestamp = Date.now().toString().slice(-6) + Math.floor(Math.random() * 10);
      const numeroComprobante = `EGR-${anioCuaresma}-${timestamp}`;
      const codigoValidacion = crypto.randomBytes(16).toString('hex').toUpperCase();

      // 4. Inserción del egreso
      await runQuery(`
        INSERT INTO Transaccion_Financiera (
          Numero_Recibo,
          ID_Usuario_Cajero,
          ID_Devoto,
          Tipo_Movimiento,
          Concepto_Descripcion,
          Monto_Quetzales,
          Metodo_Pago,
          Codigo_Validacion_Recibo
        ) VALUES (?, ?, NULL, 'Egreso', ?, ?, ?, ?)
      `, [
        numeroComprobante,
        idUsuarioCajero,
        `[EGRESO / ${categoriaGasto}] Pagado a: ${proveedorBeneficiario} | Ref: ${numeroFacturaComprobante} | Detalle: ${conceptoGasto}`,
        monto,
        metodoPago,
        codigoValidacion
      ]);

      return res.status(201).json({
        mensaje: 'Egreso de caja registrado y liquidado con éxito',
        comprobanteEgreso: {
          numeroComprobante,
          codigoValidacion,
          beneficiario: proveedorBeneficiario,
          concepto: conceptoGasto,
          categoria: categoriaGasto,
          montoDesembolsado: `Q${monto.toFixed(2)}`,
          saldoRestanteEnCaja: `Q${(balanceActual.Disponible_Caja_Q - monto).toFixed(2)}`,
          metodoPago,
          fecha: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error al registrar egreso:', error);
      return res.status(500).json({ mensaje: 'Error interno al registrar el egreso contable' });
    }
  }
};

module.exports = FinanzasController;
