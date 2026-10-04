const fs = require('fs');
const path = require('path');

// 1. ACTUALIZAR public/index.html
const htmlPath = path.join(__dirname, 'public/index.html');
if (fs.existsSync(htmlPath)) {
  let html = fs.readFileSync(htmlPath, 'utf8');

  // Asignar IDs a los ítems del menú y agregar Mi Corte Diario
  if (!html.includes('id="nav-item-corte"')) {
    html = html.replace(
      /<li class="nav-item">[\s\r\n]*<a class="nav-link" href="#" onclick="navegarA\('vista-anda'\)">[\s\r\n]*<i class="bi bi-grid-3x3 me-1"><\/i>Visualizador Anda[\s\r\n]*<\/a>[\s\r\n]*<\/li>/,
      `<li class="nav-item" id="nav-item-anda">
            <a class="nav-link" href="#" onclick="navegarA('vista-anda')"><i class="bi bi-grid-3x3 me-1"></i>Visualizador Anda</a>
          </li>
          <li class="nav-item d-none" id="nav-item-corte">
            <a class="nav-link" href="#" onclick="navegarA('vista-corte-diario')"><i class="bi bi-calendar-check me-1"></i>Mi Corte Diario</a>
          </li>`
    );
  }

  // Eliminar tarjeta vieja de corte diario dentro de vista-caja si existiera
  html = html.replace(/<!-- CORTE DIARIO DEL CAJERO -->[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*<\/div>/, '');

  // Crear la sección independiente vista-corte-diario
  const seccionCorte = `
    <!-- SECCIÓN INDEPENDIENTE: CORTE DIARIO DEL CAJERO -->
    <section id="vista-corte-diario" class="seccion-spa d-none">
      <div class="card border-0 shadow-sm rounded-4">
        <div class="card-header bg-white fw-bold py-3 d-flex flex-wrap justify-content-between align-items-center gap-2">
          <span class="fs-5 text-morado"><i class="bi bi-calendar-check me-2"></i>Mi Registro de Cobros (Corte Diario)</span>
          <div class="d-flex align-items-center gap-2">
            <label class="small fw-semibold mb-0">Fecha:</label>
            <input type="date" id="filtro-fecha-cajero" class="form-control form-control-sm" style="width: 170px;" onchange="cargarMisCobrosDia()">
            <button class="btn btn-sm btn-outline-morado" onclick="cargarMisCobrosDia()"><i class="bi bi-arrow-clockwise me-1"></i>Actualizar</button>
          </div>
        </div>
        <div class="card-body p-4">
          <div class="d-flex justify-content-between align-items-center mb-3">
            <span class="badge bg-success fs-6 px-3 py-2" id="badge-total-cajero">Total Recaudado: Q0.00</span>
            <span class="text-muted small" id="cant-recibos-cajero">0 transacciones registradas</span>
          </div>
          <div class="table-responsive">
            <table class="table table-hover align-middle mb-0">
              <thead class="table-light">
                <tr class="small text-muted">
                  <th>No. Recibo</th>
                  <th>Hora</th>
                  <th>Concepto / Detalle</th>
                  <th>Método</th>
                  <th class="text-end">Monto</th>
                  <th class="text-center">Comprobante</th>
                </tr>
              </thead>
              <tbody id="tabla-mis-cobros-cuerpo">
                <tr><td colspan="6" class="text-center text-muted py-4">Cargando cobros del día...</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
`;

  if (!html.includes('id="vista-corte-diario"')) {
    html = html.replace('<section id="vista-anda"', seccionCorte + '\n    <section id="vista-anda"');
  }

  fs.writeFileSync(htmlPath, html, 'utf8');
  console.log('✅ HTML actualizado con nueva pestaña y sección de corte');
}

// 2. ACTUALIZAR public/js/app.js
const appPath = path.join(__dirname, 'public/js/app.js');
if (fs.existsSync(appPath)) {
  let js = fs.readFileSync(appPath, 'utf8');

  // Limpiar cualquier residuo previo al final
  const marker = '// --- LÓGICA EXCLUSIVA DEL CAJERO (ROL 5) ---';
  if (js.indexOf(marker) !== -1) {
    js = js.substring(0, js.indexOf(marker));
  }

  const codigoCajero = `
// --- LÓGICA EXCLUSIVA DEL CAJERO (ROL 5) ---

function generarReciboPDF(recibo) {
  const ventana = window.open('', '_blank', 'width=600,height=700');
  const contenido = \`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>Recibo de Ofrenda - \${recibo.numeroRecibo || 'Recibo'}</title>
      <style>
        body { font-family: 'Courier New', Courier, monospace; margin: 20px; color: #222; }
        .ticket { border: 2px dashed #4b164c; padding: 25px; max-width: 440px; margin: auto; border-radius: 8px; }
        .encabezado { text-align: center; border-bottom: 2px solid #4b164c; padding-bottom: 12px; margin-bottom: 15px; }
        .encabezado h2 { margin: 0; color: #4b164c; font-size: 19px; text-transform: uppercase; }
        .encabezado p { margin: 3px 0; font-size: 12px; color: #666; }
        .detalle { font-size: 13px; line-height: 1.6; }
        .detalle-fila { display: flex; justify-content: space-between; margin: 4px 0; }
        .monto-total { text-align: right; font-size: 18px; font-weight: bold; margin-top: 15px; border-top: 1px solid #ddd; padding-top: 8px; color: #198754; }
        .firma { margin-top: 35px; text-align: center; font-size: 11px; }
        .linea-firma { border-top: 1px solid #444; width: 60%; margin: 0 auto 5px auto; }
        .btn-imprimir { display: block; width: 100%; padding: 10px; margin-top: 20px; background: #4b164c; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; }
        @media print { .btn-imprimir { display: none; } }
      </style>
    </head>
    <body>
      <div class="ticket">
        <div class="encabezado">
          <h2>Hermandad de la Paz</h2>
          <p>Consagrada Imagen de Jesús Sepultado</p>
          <p>Cuaresma y Semana Santa 2026</p>
          <p><strong>RECIBO OFICIAL DE OFRENDA</strong></p>
        </div>
        <div class="detalle">
          <div class="detalle-fila"><span><strong>No. Recibo:</strong></span><span>\${recibo.numeroRecibo || 'N/A'}</span></div>
          <div class="detalle-fila"><span><strong>Fecha:</strong></span><span>\${recibo.fecha ? new Date(recibo.fecha).toLocaleString() : new Date().toLocaleString()}</span></div>
          <div class="detalle-fila"><span><strong>Bienhechor:</strong></span><span>\${recibo.donante || 'Devoto Anónimo'}</span></div>
          <div class="detalle-fila"><span><strong>Concepto:</strong></span><span>\${recibo.concepto || 'Ofrenda'}</span></div>
          <div class="detalle-fila"><span><strong>Método:</strong></span><span>\${recibo.metodoPago || 'Efectivo'}</span></div>
          <div class="monto-total">TOTAL: Q\${parseFloat(recibo.montoQuetzales || 0).toFixed(2)}</div>
        </div>
        <div class="firma">
          <div class="linea-firma"></div>
          <p>Cajero / Comisión de Finanzas</p>
          <p style="font-size:9px; color:#777;">Dios bendiga su ofrenda</p>
        </div>
        <button class="btn-imprimir" onclick="window.print()">Imprimir / Guardar en PDF</button>
      </div>
    </body>
    </html>
  \`;
  ventana.document.write(contenido);
  ventana.document.close();
}

async function cargarMisCobrosDia() {
  const inputFecha = document.getElementById('filtro-fecha-cajero');
  if (inputFecha && !inputFecha.value) {
    inputFecha.value = new Date().toISOString().split('T')[0];
  }
  const fecha = inputFecha ? inputFecha.value : '';

  try {
    const res = await fetchAutenticado('/finanzas/mis-cobros-dia?fecha=' + fecha);
    if (!res.ok) return;
    const data = await res.json();

    const badgeTotal = document.getElementById('badge-total-cajero');
    const cantRecibos = document.getElementById('cant-recibos-cajero');
    const cuerpo = document.getElementById('tabla-mis-cobros-cuerpo');

    if (badgeTotal) badgeTotal.textContent = 'Total Recaudado: Q' + data.totalRecaudado;
    if (cantRecibos) cantRecibos.textContent = data.cantidadTransacciones + ' transacciones registradas';

    if (!cuerpo) return;
    if (data.cobros.length === 0) {
      cuerpo.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">No has registrado cobros en la fecha seleccionada</td></tr>';
      return;
    }

    cuerpo.innerHTML = data.cobros.map(c => \`
      <tr>
        <td class="fw-bold text-morado small">\${c.Numero_Recibo}</td>
        <td class="small text-muted">\${new Date(c.Fecha_Transaccion).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
        <td class="small">\${c.Concepto_Descripcion}</td>
        <td><span class="badge bg-light text-dark border">\${c.Metodo_Pago}</span></td>
        <td class="text-end fw-bold text-success">Q\${parseFloat(c.Monto_Quetzales).toFixed(2)}</td>
        <td class="text-center">
          <button class="btn btn-sm btn-outline-danger py-0 px-2" title="Descargar / Imprimir PDF" onclick="generarReciboPDF({
            numeroRecibo: '\${c.Numero_Recibo}',
            fecha: '\${c.Fecha_Transaccion}',
            donante: 'Devoto / Fiel',
            concepto: '\${(c.Concepto_Descripcion || '').replace(/'/g, '')}',
            montoQuetzales: \${c.Monto_Quetzales},
            metodoPago: '\${c.Metodo_Pago}'
          })">
            <i class="bi bi-file-earmark-pdf"></i> PDF
          </button>
        </td>
      </tr>
    \`).join('');
  } catch (err) {
    console.error('Error al cargar cobros:', err);
  }
}

function aplicarPermisosCajero() {
  const sesion = JSON.parse(localStorage.getItem('sesion_hermandad') || '{}');
  const rol = Number(sesion.idRol || (sesion.usuario ? (sesion.usuario.idRol || sesion.usuario.ID_Rol) : 0));

  if (rol === 5) {
    // 1. Ocultar Visualizador Anda y Reportes Contables del menú superior
    const navAnda = document.getElementById('nav-item-anda');
    const navReportes = document.getElementById('nav-item-reportes');
    const navUsuarios = document.getElementById('nav-item-usuarios');
    const navAuditoria = document.getElementById('nav-item-auditoria');
    if (navAnda) navAnda.classList.add('d-none');
    if (navReportes) navReportes.classList.add('d-none');
    if (navUsuarios) navUsuarios.classList.add('d-none');
    if (navAuditoria) navAuditoria.classList.add('d-none');

    // 2. Mostrar pestaña Mi Corte Diario
    const navCorte = document.getElementById('nav-item-corte');
    if (navCorte) navCorte.classList.remove('d-none');

    // 3. Ocultar tarjeta de Salida de Efectivo (Egreso)
    const formEgreso = document.getElementById('form-egreso');
    if (formEgreso) {
      const colEgreso = formEgreso.closest('.col-12, .col-lg-4');
      if (colEgreso) colEgreso.classList.add('d-none');
    }

    cargarMisCobrosDia();
  }
}

// Vincular al envío de ofrendas para emitir PDF
if (typeof manejarOfrenda === 'function') {
  manejarOfrenda = async function(e) {
    e.preventDefault();
    const nombreBienhechor = document.getElementById('ofrenda-donante')?.value || 'Devoto Anónimo';
    const conceptoDescripcion = document.getElementById('ofrenda-concepto')?.value;
    const montoQuetzales = parseFloat(document.getElementById('ofrenda-monto')?.value);
    const metodoPago = document.getElementById('ofrenda-metodo')?.value || 'Efectivo';

    try {
      const res = await fetchAutenticado('/finanzas/ofrenda', {
        method: 'POST',
        body: JSON.stringify({ nombreBienhechor, conceptoDescripcion, montoQuetzales, metodoPago })
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.mensaje || 'Error al registrar ofrenda');
        return;
      }
      alert(data.mensaje);
      document.getElementById('form-ofrenda')?.reset();

      if (data.comprobante) {
        generarReciboPDF(data.comprobante);
      }
      cargarMisCobrosDia();
    } catch (err) {
      alert('Error de conexión al registrar la ofrenda');
    }
  };
}

window.addEventListener('DOMContentLoaded', () => {
  setTimeout(aplicarPermisosCajero, 250);
});
`;

  js = js + '\n' + codigoCajero;
  fs.writeFileSync(appPath, js, 'utf8');
  console.log('✅ app.js actualizado exitosamente');
}
