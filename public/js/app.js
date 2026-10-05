const API_URL = '/api';

// Usar sessionStorage para que la sesión muera al cerrar las pestañas/navegador
let tokenActual = sessionStorage.getItem('token_hermandad') || null;
let usuarioActual = JSON.parse(sessionStorage.getItem('usuario_hermandad') || '{}');

document.addEventListener('DOMContentLoaded', () => {
  if (tokenActual) {
    iniciarSesionEnFrontend(tokenActual, usuarioActual);
  } else {
    navegarA('vista-bienvenida');
  }

  // Formularios
  document.getElementById('form-login').addEventListener('submit', manejarLogin);
  document.getElementById('form-nuevo-devoto').addEventListener('submit', manejarRegistroDevoto);
  const formAsignar = document.getElementById('form-asignar-turno') || document.getElementById('form-cobro-turno');
  if (formAsignar && typeof manejarCobroTurno === 'function') formAsignar.addEventListener('submit', manejarCobroTurno);
  else if (formAsignar && typeof manejarAsignarTurno === 'function') formAsignar.addEventListener('submit', manejarAsignarTurno);
  document.getElementById('form-ofrenda').addEventListener('submit', manejarOfrenda);
  document.getElementById('form-egreso').addEventListener('submit', manejarEgreso);
  document.getElementById('form-nuevo-usuario').addEventListener('submit', manejarCrearUsuario);
});

// 1. Navegación SPA

function navegarA(vistaId) {
  // 1. Ocultar todas las secciones SPA
  document.querySelectorAll('.seccion-spa, section').forEach(s => s.classList.add('d-none'));

  // 2. Mostrar la sección seleccionada
  const destino = document.getElementById(vistaId);
  if (destino) {
    destino.classList.remove('d-none');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // 3. Resaltar enlace activo en navbar
  document.querySelectorAll('.navbar-nav .nav-link').forEach(link => {
    link.classList.remove('active');
  });
  const linkActivo = document.querySelector(`[onclick="navegarA('${vistaId}')"]`);
  if (linkActivo) linkActivo.classList.add('active');

  // 4. Cargar datos correspondientes
  if (vistaId === 'vista-devotos' && typeof cargarDevotos === 'function') cargarDevotos();
  if (vistaId === 'vista-caja' && typeof cargarSelectDevotos === 'function') cargarSelectDevotos();
  if (vistaId === 'vista-corte-diario' && typeof cargarMisCobrosDia === 'function') cargarMisCobrosDia();
  if (vistaId === 'vista-anda' && typeof cargarDistribucionAnda === 'function') cargarDistribucionAnda();
  if (vistaId === 'vista-reportes') {
    if (typeof cargarReporteFinanciero === 'function') cargarReporteFinanciero();
    else if (typeof cargarReportes === 'function') cargarReportes();
  }
  if (vistaId === 'vista-usuarios' && typeof cargarUsuarios === 'function') cargarUsuarios();
  if (vistaId === 'vista-auditoria' && typeof cargarAuditoria === 'function') cargarAuditoria();
}

// 2. Autenticación y Cierre de Sesión
async function manejarLogin(e) {
  e.preventDefault();
  const correoEl = document.getElementById('login-correo');
  const passEl = document.getElementById('login-password');
  const alerta = document.getElementById('login-alerta');

  const correo = correoEl ? correoEl.value.trim() : '';
  const password = passEl ? passEl.value : '';

  try {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ correo, password })
    });
    const data = await res.json();

    if (!res.ok) {
      if (alerta) {
        alerta.textContent = data.mensaje || 'Credenciales incorrectas';
        alerta.classList.remove('d-none');
      } else {
        alert(data.mensaje || 'Credenciales incorrectas');
      }
      return;
    }

    tokenActual = data.token;
    usuarioActual = data.usuario;

    sessionStorage.setItem('token_hermandad', tokenActual);
    sessionStorage.setItem('usuario_hermandad', JSON.stringify(usuarioActual));
    sessionStorage.setItem('usuario', JSON.stringify(usuarioActual));
    localStorage.setItem('usuario', JSON.stringify(usuarioActual));

    if (correoEl) correoEl.value = '';
    if (passEl) passEl.value = '';
    if (alerta) alerta.classList.add('d-none');

    iniciarSesionEnFrontend(tokenActual, usuarioActual);
  } catch (error) {
    console.error('Error durante el login:', error);
    if (alerta) {
      alerta.textContent = 'Error de conexión con el servidor';
      alerta.classList.remove('d-none');
    } else {
      alert('Error de conexión con el servidor');
    }
  }
}

function iniciarSesionEnFrontend(token, usuario) {
  sessionStorage.setItem("usuario", JSON.stringify(usuario));
  sessionStorage.setItem("usuario_hermandad", JSON.stringify(usuario));
  

  const modalEl = document.getElementById("modalLogin");
  if (modalEl && typeof bootstrap !== "undefined") {
    const modalInstancia = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
    modalInstancia.hide();
  }

  document.querySelectorAll(".modal-backdrop").forEach(b => b.remove());
  document.body.classList.remove("modal-open");
  document.body.style.removeProperty("padding-right");

  if (typeof actualizarNavPorSesion === "function") {
    actualizarNavPorSesion();
  }

  const idRol = Number(usuario.idRol || usuario.ID_Rol || 0);
  navegarA("vista-bienvenida");
}

function cerrarSesion() {
  sessionStorage.clear();
  localStorage.clear();
  tokenActual = null;
  usuarioActual = {};

  const formLogin = document.getElementById("form-login");
  if (formLogin) formLogin.reset();

  if (typeof actualizarNavPorSesion === "function") {
    actualizarNavPorSesion();
  } else {
    location.reload();
  }
  navegarA("vista-bienvenida");
  const inputCorreo = document.getElementById('login-correo');
  if (inputCorreo) inputCorreo.value = '';
  const inputPass = document.getElementById('login-password');
  if (inputPass) inputPass.value = '';

  const alerta = document.getElementById('login-alerta');
  if (alerta) {
    alerta.textContent = '';
    alerta.classList.add('d-none');
  }

  document.getElementById('navbar-principal').classList.add('d-none');
  navegarA('vista-bienvenida');
}

async function fetchAutenticado(endpoint, opciones = {}) {
  const headers = {
    ...opciones.headers,
    'Authorization': `Bearer ${tokenActual}`,
    'Content-Type': 'application/json'
  };
  return await fetch(`${API_URL}${endpoint}`, { ...opciones, headers });
}

// 3. Devotos
async function cargarDevotos() {
  const tbody = document.getElementById('tabla-devotos-body');
  try {
    const res = await fetch(`${API_URL}/devotos`);
    const data = await res.json();
    tbody.innerHTML = '';

    if (!data.devotos || data.devotos.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-3">No hay devotos registrados</td></tr>';
      return;
    }

    data.devotos.forEach(d => {
      tbody.innerHTML += `
        <tr>
          <td><span class="badge bg-light text-dark font-monospace">${d.DPI}</span></td>
          <td class="fw-semibold">${d.Nombres} ${d.Apellidos}</td>
          <td>${d.Telefono}</td>
          <td>${d.Correo_Electronico}</td>
          <td><span class="badge bg-info text-dark">${d.Estatura_Hombro_cm} cm</span></td>
          <td><span class="badge bg-success">Activo</span></td>
          ${usuarioActual && (usuarioActual.idRol === 1 || usuarioActual.idRol === 2) ? 
            `<td class="text-end"><button class="btn btn-sm btn-outline-morado" onclick="abrirEditarDevoto(${d.ID_Devoto})"><i class="bi bi-pencil-square me-1"></i>Editar</button></td>` : 
            '<td class="text-end"></td>'}
        </tr>
      `;
    });
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-danger text-center">Error al cargar devotos</td></tr>';
  }
}

async function manejarRegistroDevoto(e) {
  e.preventDefault();
  const dpi = document.getElementById('devoto-dpi').value;
  const nombres = document.getElementById('devoto-nombres').value;
  const apellidos = document.getElementById('devoto-apellidos').value;
  const telefono = document.getElementById('devoto-telefono').value;
  const correo = document.getElementById('devoto-correo').value;
  const elAlt = document.getElementById("devoto-altura") || document.getElementById("devoto-estatura");
  const estaturaHombroCm = elAlt ? parseFloat(elAlt.value) : 0;

  const res = await fetchAutenticado('/devotos', {
    method: 'POST',
    body: JSON.stringify({ dpi, nombres, apellidos, telefono, correo, estaturaHombroCm })
  });
  const data = await res.json();

  if (!res.ok) {
    alert(data.mensaje || 'Error al guardar devoto');
    return;
  }

  alert('Devoto registrado con éxito en el padrón');
  document.getElementById('form-nuevo-devoto').reset();
  bootstrap.Modal.getInstance(document.getElementById('modalNuevoDevoto')).hide();
  cargarDevotos();
}

// 4. Operaciones de Caja
async function cargarSelectDevotos() {
  const select = document.getElementById('cobro-devoto-select') || document.getElementById('devoto-select');
  if (!select) return;
  const res = await fetch(`${API_URL}/devotos`);
  const data = await res.json();
  select.innerHTML = '<option value="">Seleccione un cargador...</option>';
  (data.devotos || []).forEach(d => {
    select.innerHTML += `<option value="${d.ID_Devoto}">${d.Nombres} ${d.Apellidos} (${d.Estatura_Hombro_cm} cm)</option>`;
  });
}

async function manejarAsignarTurno(e) {
  e.preventDefault();
  const idDevoto = document.getElementById('turno-devoto-select').value;
  const numeroTurno = parseInt(document.getElementById('turno-numero').value, 10);
  const ladoBrazo = document.getElementById('turno-lado').value;
  const numeroBrazo = parseInt(document.getElementById('turno-brazo').value, 10);
  const montoQuetzales = parseFloat(document.getElementById('turno-monto').value);

  const res = await fetchAutenticado('/turnos/asignar', {
    method: 'POST',
    body: JSON.stringify({ idDevoto, numeroTurno, ladoBrazo, numeroBrazo, montoQuetzales })
  });
  const data = await res.json();

  if (!res.ok) {
    alert(data.mensaje || 'Error al asignar turno');
    return;
  }

  alert(`Turno asignado con éxito. Recibo emitido: ${data.comprobante.numeroRecibo}`);
}

async function manejarOfrenda(e) {
  e.preventDefault();
  const nombreBienhechor = document.getElementById('ofrenda-donante').value;
  const conceptoDescripcion = document.getElementById('ofrenda-concepto').value;
  const montoQuetzales = parseFloat(document.getElementById('ofrenda-monto').value);
  const metodoPago = document.getElementById('ofrenda-metodo').value;

  const res = await fetchAutenticado('/finanzas/ofrenda', {
    method: 'POST',
    body: JSON.stringify({ nombreBienhechor, conceptoDescripcion, montoQuetzales, metodoPago })
  });
  const data = await res.json();

  if (!res.ok) {
    alert(data.mensaje || 'Error al registrar ofrenda');
    return;
  }

  alert(`Ofrenda asentada correctamente. Comprobante: ${data.comprobante.numeroRecibo}`);
  document.getElementById('form-ofrenda').reset();
}

async function manejarEgreso(e) {
  e.preventDefault();
  const proveedorBeneficiario = document.getElementById('egreso-proveedor').value;
  const encargadoGasto = document.getElementById('egreso-encargado').value;
  const conceptoGasto = document.getElementById('egreso-concepto').value;
  const montoQuetzales = parseFloat(document.getElementById('egreso-monto').value);
  const numeroFacturaComprobante = document.getElementById('egreso-factura').value || 'S/F';

  const res = await fetchAutenticado('/finanzas/egreso', {
    method: 'POST',
    body: JSON.stringify({ 
      proveedorBeneficiario,
      encargadoGasto,
      conceptoGasto, 
      montoQuetzales, 
      numeroFacturaComprobante 
    })
  });
  const data = await res.json();

  if (!res.ok) {
    alert(data.mensaje || 'Error al liquidar egreso');
    return;
  }

  alert(`Egreso liquidado con éxito. Comprobante: ${data.comprobanteEgreso.numeroComprobante}\nSaldo restante en caja: ${data.comprobanteEgreso.saldoRestanteEnCaja}`);
  document.getElementById('form-egreso').reset();
}

// 5. Visualizador del Anda
async function cargarDistribucionAnda() {
  const turno = document.getElementById('select-turno-inspeccionar').value;
  const res = await fetchAutenticado(`/turnos/anda/1/2026`);
  const data = await res.json();

  const contenedorIzq = document.getElementById('contenedor-brazos-izq');
  const contenedorDer = document.getElementById('contenedor-brazos-der');
  contenedorIzq.innerHTML = '';
  contenedorDer.innerHTML = '';

  const cargadoresTurno = (data.turnos || []).filter(t => t.Numero_Turno == turno);

  for (let b = 1; b <= 20; b++) {
    const izq = cargadoresTurno.find(c => c.Lado_Brazo === 'IZQUIERDO' && c.Numero_Brazo === b);
    contenedorIzq.innerHTML += `
      <div class="brazo-slot ${izq ? 'brazo-ocupado' : ''}">
        <span class="fw-bold">Brazo ${b}</span>
        <span>${izq ? `${izq.Nombres} (${izq.Estatura_Hombro_cm} cm)` : '<span class="text-muted">Disponible</span>'}</span>
      </div>
    `;

    const der = cargadoresTurno.find(c => c.Lado_Brazo === 'DERECHO' && c.Numero_Brazo === b);
    contenedorDer.innerHTML += `
      <div class="brazo-slot ${der ? 'brazo-ocupado' : ''}">
        <span class="fw-bold">Brazo ${b}</span>
        <span>${der ? `${der.Nombres} (${der.Estatura_Hombro_cm} cm)` : '<span class="text-muted">Disponible</span>'}</span>
      </div>
    `;
  }
}

// 6. Reportes
async function cargarReportes() {
  const res = await fetchAutenticado('/reportes/financiero');
  const data = await res.json();
  
  if (data.totales) {
    document.getElementById('card-ingresos').textContent = `Q ${(data.totales.Total_Ingresos_Q || 0).toFixed(2)}`;
    document.getElementById('card-egresos').textContent = `Q ${(data.totales.Total_Egresos_Q || 0).toFixed(2)}`;
    document.getElementById('card-saldo').textContent = `Q ${(data.totales.Balance_Neto_Q || 0).toFixed(2)}`;
  }

  const tbody = document.getElementById('tabla-movimientos-body');
  tbody.innerHTML = '';

  if (!data.movimientos || data.movimientos.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-3">No hay movimientos registrados</td></tr>';
    return;
  }

  data.movimientos.forEach(m => {
    const esIngreso = m.Tipo_Movimiento === 'Ingreso';
    tbody.innerHTML += `
      <tr>
        <td><span class="badge bg-light text-dark font-monospace">${m.Numero_Recibo}</span></td>
        <td class="small text-muted">${m.Fecha_Transaccion}</td>
        <td>
          <span class="badge ${esIngreso ? 'bg-success' : 'bg-danger'}">
            ${m.Tipo_Movimiento}
          </span>
        </td>
        <td class="small">
          <div class="fw-semibold">${m.Concepto_Descripcion}</div>
          ${m.Devoto_Asociado !== 'N/A' ? `<span class="text-muted">Devoto: ${m.Devoto_Asociado}</span>` : ''}
        </td>
        <td class="small">${m.Nombre_Cajero}</td>
        <td><span class="badge bg-secondary">${m.Metodo_Pago}</span></td>
        <td class="text-end fw-bold ${esIngreso ? 'text-success' : 'text-danger'}">
          ${esIngreso ? '+' : '-'} Q ${parseFloat(m.Monto_Quetzales).toFixed(2)}
        </td>
      </tr>
    `;
  });
}

// 7. Gestión de Usuarios y Roles (Admin)
async function cargarUsuarios() {
  const tbody = document.getElementById('tabla-usuarios-body');
  try {
    const res = await fetchAutenticado('/usuarios');
    const data = await res.json();
    tbody.innerHTML = '';

    if (!data.usuarios || data.usuarios.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-3">No hay colaboradores registrados</td></tr>';
      return;
    }

    data.usuarios.forEach(u => {
      const esActivo = u.Estado_Activo === 1;
      const badgeRol = u.ID_Rol === 1 ? 'bg-danger' : (u.ID_Rol === 2 ? 'bg-primary' : 'bg-warning text-dark');
      
      tbody.innerHTML += `
        <tr>
          <td><span class="badge bg-light text-dark font-monospace">${u.ID_Usuario}</span></td>
          <td class="fw-semibold">${u.Nombres}</td>
          <td>${u.Correo_Institucional}</td>
          <td><span class="badge ${badgeRol}">${u.Nombre_Rol}</span></td>
          <td>
            <span class="badge ${esActivo ? 'bg-success' : 'bg-secondary'}">
              ${esActivo ? 'Activo' : 'Inactivo (Baja)'}
            </span>
          </td>
          <td class="text-end">
            ${u.ID_Usuario === usuarioActual.idUsuario ? `<div class="btn-group btn-group-sm"><button class="btn btn-outline-primary" onclick="abrirEditarUsuario(${u.ID_Usuario})" title="Modificar"><i class="bi bi-pencil"></i></button><button class="btn btn-outline-warning text-dark" onclick="abrirRestablecerPassword(${u.ID_Usuario}, '${u.Nombres.replace(/'/g, "\\'")}')" title="Restablecer Clave"><i class="bi bi-key-fill"></i></button></div>` : 
              `<div class="btn-group btn-group-sm me-1">
       <button class="btn btn-outline-primary" onclick="abrirEditarUsuario(${u.ID_Usuario})" title="Modificar"><i class="bi bi-pencil"></i></button>
       <button class="btn btn-outline-warning text-dark" onclick="abrirRestablecerPassword(${u.ID_Usuario}, '${u.Nombres}')" title="Restablecer Clave"><i class="bi bi-key-fill"></i></button>
     </div>
     <button class="btn btn-sm ${esActivo ? 'btn-outline-danger' : 'btn-outline-success'}" 
                onclick="alternarEstadoUsuario(${u.ID_Usuario},${esActivo ? 0 : 1})">
                <i class="bi ${esActivo ? 'bi-person-slash' : 'bi-person-check'} me-1"></i>${esActivo ? 'Dar de Baja' : 'Reactivar'}
              </button>`
            }
          </td>
        </tr>
      `;
    });
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-danger text-center">Error al cargar usuarios</td></tr>';
  }
}

async function manejarCrearUsuario(e) {
  e.preventDefault();
  const nombres = document.getElementById('usuario-nombres-input').value;
  const correo = document.getElementById('usuario-correo-input').value;
  const password = document.getElementById('usuario-password-input').value;
  const idRol = parseInt(document.getElementById('usuario-rol-select').value, 10);

  const res = await fetchAutenticado('/usuarios', {
    method: 'POST',
    body: JSON.stringify({ nombres, correo, password, idRol })
  });
  const data = await res.json();

  if (!res.ok) {
    alert(data.mensaje || 'Error al registrar usuario');
    return;
  }

  alert('Colaborador registrado exitosamente');
  document.getElementById('form-nuevo-usuario').reset();
  bootstrap.Modal.getInstance(document.getElementById('modalNuevoUsuario')).hide();
  cargarUsuarios();
}

async function alternarEstadoUsuario(idUsuario, nuevoEstado) {
  const confirmacion = confirm(`¿Estás seguro de que deseas ${nuevoEstado === 1 ? 'reactivar' : 'dar de baja'} a este usuario?`);
  if (!confirmacion) return;

  const res = await fetchAutenticado(`/usuarios/${idUsuario}/estado`, {
    method: 'PATCH',
    body: JSON.stringify({ estadoActivo: nuevoEstado })
  });
  const data = await res.json();

  if (!res.ok) {
    alert(data.mensaje || 'Error al actualizar estado del usuario');
    return;
  }

  alert(data.mensaje);
  cargarUsuarios();
}

// 8. Auditoría
async function cargarAuditoria() {
  const tbody = document.getElementById('tabla-auditoria-body');
  const res = await fetchAutenticado('/auditoria');
  const data = await res.json();
  tbody.innerHTML = '';
  (data.bitacora || []).forEach(b => {
    tbody.innerHTML += `
      <tr>
        <td class="small text-muted">${b.Fecha_Hora}</td>
        <td><span class="badge bg-secondary">${b.Modulo_Afectado}</span></td>
        <td class="fw-semibold">${b.Accion_Realizada}</td>
        <td class="small">${b.Descripcion_Detalle || ''}</td>
        <td class="font-monospace small">${b.IP_Origen}</td>
      </tr>
    `;
  });
}





// --- LÓGICA EXCLUSIVA DEL CAJERO (ROL 5) ---

// Función de impresión / PDF de ofrendas
function generarReciboPDF(recibo) {
  const ventana = window.open('', '_blank', 'width=600,height=700');
  const contenido = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>Recibo de Ofrenda - ${recibo.numeroRecibo || 'Recibo'}</title>
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
          <div class="detalle-fila"><span><strong>No. Recibo:</strong></span><span>${recibo.numeroRecibo || 'N/A'}</span></div>
          <div class="detalle-fila"><span><strong>Fecha:</strong></span><span>${recibo.fecha ? new Date(recibo.fecha).toLocaleString() : new Date().toLocaleString()}</span></div>
          <div class="detalle-fila"><span><strong>Bienhechor:</strong></span><span>${recibo.donante || 'Devoto Anónimo'}</span></div>
          <div class="detalle-fila"><span><strong>Concepto:</strong></span><span>${recibo.concepto || 'Ofrenda'}</span></div>
          <div class="detalle-fila"><span><strong>Método:</strong></span><span>${recibo.metodoPago || 'Efectivo'}</span></div>
          <div class="monto-total">TOTAL: Q${parseFloat(recibo.montoQuetzales || 0).toFixed(2)}</div>
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
  `;
  ventana.document.write(contenido);
  ventana.document.close();
}

// Cargar cobros del cajero en su pestaña dedicada
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
    if (!data.cobros || data.cobros.length === 0) {
      cuerpo.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">No has registrado cobros en la fecha seleccionada</td></tr>';
      return;
    }

    cuerpo.innerHTML = data.cobros.map(c => `
      <tr>
        <td class="fw-bold text-morado small">${c.Numero_Recibo}</td>
        <td class="small text-muted">${new Date(c.Fecha_Transaccion).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
        <td class="small">${c.Concepto_Descripcion}</td>
        <td><span class="badge bg-light text-dark border">${c.Metodo_Pago}</span></td>
        <td class="text-end fw-bold text-success">Q${parseFloat(c.Monto_Quetzales).toFixed(2)}</td>
        <td class="text-center">
          <button class="btn btn-sm btn-outline-danger py-0 px-2" title="Descargar / Imprimir PDF" onclick="generarReciboPDF({
            numeroRecibo: '${c.Numero_Recibo}',
            fecha: '${c.Fecha_Transaccion}',
            donante: 'Devoto / Fiel',
            concepto: '${(c.Concepto_Descripcion || '').replace(/'/g, '')}',
            montoQuetzales: ${c.Monto_Quetzales},
            metodoPago: '${c.Metodo_Pago}'
          })">
            <i class="bi bi-file-earmark-pdf"></i> PDF
          </button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Error al cargar cobros:', err);
  }
}

// Aplicar permisos visuales para Cajero
function aplicarPermisosCajero() {
  // Identificar si es cajero por variable usuarioActual, sessionStorage, localStorage o badge visible
  let esCajero = false;
  
  if (typeof usuarioActual !== 'undefined' && (usuarioActual.idRol === 5 || usuarioActual.ID_Rol === 5 || usuarioActual.rol === 'Cajero')) {
    esCajero = true;
  }
  
  const sesionStr = sessionStorage.getItem('usuario') || localStorage.getItem('usuario') || localStorage.getItem('sesion_hermandad');
  if (sesionStr) {
    try {
      const u = JSON.parse(sesionStr);
      if (u.idRol === 5 || u.ID_Rol === 5 || u.rol === 'Cajero' || (u.usuario && (u.usuario.idRol === 5 || u.usuario.ID_Rol === 5))) {
        esCajero = true;
      }
    } catch(e) {}
  }

  // Comprobar también el texto del badge superior derecho
  const badges = document.querySelectorAll('.badge');
  badges.forEach(b => {
    if (b.textContent.trim().toLowerCase() === 'cajero') {
      esCajero = true;
    }
  });

  if (esCajero) {
    // 1. Ocultar Visualizador Anda y Reportes Contables del navbar
    const navAnda = document.getElementById('nav-item-anda');
    const navReportes = document.getElementById('nav-item-reportes');
    const navUsuarios = document.getElementById('nav-item-usuarios');
    const navAuditoria = document.getElementById('nav-item-auditoria');
    if (navAnda) navAnda.style.setProperty('display', 'none', 'important');
    if (navReportes) navReportes.style.setProperty('display', 'none', 'important');
    if (navUsuarios) navUsuarios.style.setProperty('display', 'none', 'important');
    if (navAuditoria) navAuditoria.style.setProperty('display', 'none', 'important');

    // 2. Mostrar la pestaña "Mi Corte Diario"
    const navCorte = document.getElementById('nav-item-corte');
    if (navCorte) {
      navCorte.classList.remove('d-none');
      navCorte.style.removeProperty('display');
    }

    // 3. Ocultar la tarjeta de Salida de Efectivo (Egreso)
    const formEgreso = document.getElementById('form-egreso');
    if (formEgreso) {
      const colEgreso = formEgreso.closest('.col-12, .col-lg-4');
      if (colEgreso) colEgreso.style.setProperty('display', 'none', 'important');
    }
  }
}

// Vincular al envío de ofrendas para emitir PDF automático
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

// Ejecutar revisión continua al cargar y en intervalos cortos para asegurar el DOM

window.addEventListener('DOMContentLoaded', () => {
  const token = sessionStorage.getItem('token_hermandad');
  const usuarioGuardado = sessionStorage.getItem('usuario_hermandad') || sessionStorage.getItem('usuario');

  if (token && usuarioGuardado) {
    try {
      tokenActual = token;
      usuarioActual = JSON.parse(usuarioGuardado);
      actualizarNavPorSesion();
      const idRol = Number(usuarioActual.idRol || usuarioActual.ID_Rol || 0);
      navegarA("vista-bienvenida");
    } catch (e) {
      sessionStorage.clear();
      actualizarNavPorSesion();
      navegarA('vista-bienvenida');
    }
  } else {
    sessionStorage.clear();
    actualizarNavPorSesion();
    navegarA('vista-bienvenida');
  }

  // Formularios con verificación de existencia
  document.getElementById('form-login')?.addEventListener('submit', manejarLogin);
  document.getElementById('form-nuevo-devoto')?.addEventListener('submit', manejarRegistroDevoto);
  document.getElementById('form-cobro-turno')?.addEventListener('submit', (e) => {
    if (typeof manejarCobroTurno === 'function') manejarCobroTurno(e);
    else if (typeof manejarAsignarTurno === 'function') manejarAsignarTurno(e);
  });
  document.getElementById('form-ofrenda')?.addEventListener('submit', manejarOfrenda);
  document.getElementById('form-egreso')?.addEventListener('submit', manejarEgreso);
  document.getElementById('form-nuevo-usuario')?.addEventListener('submit', manejarCrearUsuario);
});

// setInterval removido



function actualizarNavPorSesion() {
  const sesionStr = sessionStorage.getItem("usuario_hermandad") || sessionStorage.getItem("usuario");
  
  let sesion = null;
  if (sesionStr) {
    try { sesion = JSON.parse(sesionStr); } catch (e) { sesion = null; }
  }

  if (!sesion && typeof usuarioActual !== 'undefined' && usuarioActual && (usuarioActual.idRol || usuarioActual.ID_Rol)) {
    sesion = usuarioActual;
  }

  const btnLogin = document.getElementById('btn-abrir-login');
  const btnSalir = document.getElementById('btn-cerrar-sesion');
  const infoSesion = document.getElementById('info-sesion');
  const nombreTxt = document.getElementById('nombre-usuario-sesion');
  const badgeRol = document.getElementById('badge-rol-sesion');

  if (sesion) {
    const rolId = Number(sesion.idRol || sesion.ID_Rol || (sesion.usuario ? (sesion.usuario.idRol || sesion.usuario.ID_Rol) : 0));
    const nombre = sesion.nombres || (sesion.usuario ? sesion.usuario.nombres : 'Administrador');
    let rolNombre = sesion.nombreRol || (sesion.usuario ? sesion.usuario.nombreRol : '');

    if (!rolNombre) {
      if (rolId === 1) rolNombre = 'Administrador General';
      else if (rolId === 2) rolNombre = 'Secretaría';
      else if (rolId === 3) rolNombre = 'Tesorero';
      else if (rolId === 4) rolNombre = 'Enseres';
      else if (rolId === 5) rolNombre = 'Cajero';
      else rolNombre = 'Colaborador';
    }

    if (btnLogin) btnLogin.classList.add('d-none');
    if (btnSalir) btnSalir.classList.remove('d-none');
    if (infoSesion) infoSesion.classList.remove('d-none');
    if (nombreTxt) nombreTxt.textContent = nombre;
    if (badgeRol) badgeRol.textContent = rolNombre;

    // Accesos globales
    document.getElementById('nav-item-devotos')?.classList.remove('d-none');
    document.getElementById('nav-item-caja')?.classList.remove('d-none');

    
    const esAdminOEnseres = (rolId === 1 || rolId === 4);
    document.getElementById('nav-item-enseres')?.classList.toggle('d-none', !esAdminOEnseres);

    if (rolId === 1) {
      // ADMINISTRADOR: Acceso TOTAL a todos los módulos
      document.getElementById('nav-item-anda')?.classList.remove('d-none');
      document.getElementById('nav-item-reportes')?.classList.remove('d-none');
      document.getElementById('nav-item-usuarios')?.classList.remove('d-none');
      
      document.getElementById('nav-item-auditoria')?.classList.remove('d-none');
      document.getElementById('columna-egreso')?.classList.remove('d-none');
      
      // Ocultar pestaña individual de corte diario (exclusiva del cajero de ventanilla)
      document.getElementById('nav-item-corte')?.classList.add('d-none');

      // Limpiar propiedades display: none forzadas por style inline
      ['nav-item-anda', 'nav-item-reportes', 'nav-item-enseres', 'nav-item-usuarios', 'nav-item-auditoria', 'columna-egreso'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.removeProperty('display');
      });
    } else if (rolId === 4) {
      // ENCARGADO DE ENSERES: Acceso exclusivo a inventario y Kardex
      document.getElementById('nav-item-anda')?.classList.add('d-none');
      document.getElementById('nav-item-reportes')?.classList.add('d-none');
      document.getElementById('nav-item-usuarios')?.classList.add('d-none');
      document.getElementById('nav-item-auditoria')?.classList.add('d-none');
      document.getElementById('nav-item-caja')?.classList.add('d-none');
      document.getElementById('nav-item-corte')?.classList.add('d-none');
      document.getElementById('nav-item-devotos')?.classList.add('d-none');
      document.getElementById('columna-egreso')?.classList.add('d-none');
      navegarA('vista-enseres');
    } else if (rolId === 5) {
      // CAJERO: Solo cobros, corte diario e inscripciones
      document.getElementById('nav-item-corte')?.classList.remove('d-none');
      document.getElementById('nav-item-anda')?.classList.add('d-none');
      document.getElementById('nav-item-reportes')?.classList.add('d-none');
      document.getElementById('nav-item-usuarios')?.classList.add('d-none');
      
      document.getElementById('nav-item-auditoria')?.classList.add('d-none');
      document.getElementById('columna-egreso')?.classList.add('d-none');
    } else {
      // Otros roles (Secretaría / Tesorería)
      document.getElementById('nav-item-anda')?.classList.remove('d-none');
      document.getElementById('nav-item-reportes')?.classList.remove('d-none');
      document.getElementById('nav-item-usuarios')?.classList.add('d-none');
      document.getElementById('nav-item-auditoria')?.classList.add('d-none');
      document.getElementById('nav-item-corte')?.classList.add('d-none');
      if (rolId === 3) {
        document.getElementById('columna-egreso')?.classList.remove('d-none');
      }
    }
  } else {
    // Sesión cerrada
    if (btnLogin) btnLogin.classList.remove('d-none');
    if (btnSalir) btnSalir.classList.add('d-none');
    if (infoSesion) infoSesion.classList.add('d-none');

    ['nav-item-devotos','nav-item-caja','nav-item-corte','nav-item-anda','nav-item-reportes','nav-item-enseres','nav-item-usuarios','nav-item-auditoria'].forEach(id => {
      document.getElementById(id)?.classList.add('d-none');
    });
  }
}


window.addEventListener('DOMContentLoaded', () => {
  actualizarNavPorSesion();
});

// ==============================================================
// FUNCIONES ADMINISTRATIVAS: EDICIÓN DE USUARIOS Y DEVOTOS
// ==============================================================
window.abrirEditarDevoto = async function(id) {
  try {
    const res = await fetch(`${API_URL}/devotos`);
    const data = await res.json();
    const devoto = (data.devotos || []).find(d => d.ID_Devoto === id || d.id === id);
    if (!devoto) return alert('Devoto no encontrado');

    document.getElementById('edit-devoto-id').value = devoto.ID_Devoto || devoto.id;
    document.getElementById('edit-devoto-dpi').value = devoto.DPI || '';
    document.getElementById('edit-devoto-nombres').value = devoto.Nombres || '';
    document.getElementById('edit-devoto-apellidos').value = devoto.Apellidos || '';
    document.getElementById('edit-devoto-telefono').value = devoto.Telefono || '';
    document.getElementById('edit-devoto-altura').value = devoto.Estatura_Hombro_cm || '';
    document.getElementById('edit-devoto-correo').value = devoto.Correo_Electronico || '';
    document.getElementById('edit-devoto-activo').checked = (devoto.Estado_Activo === 1);

    new bootstrap.Modal(document.getElementById('modalEditarDevoto')).show();
  } catch (e) {
    alert('Error al cargar datos del devoto');
  }
};

window.abrirEditarUsuario = async function(id) {
  try {
    const res = await fetchAutenticado('/usuarios');
    const data = await res.json();
    const usuario = (data.usuarios || []).find(u => u.ID_Usuario === id || u.id === id);
    if (!usuario) return alert('Usuario no encontrado');

    document.getElementById('edit-user-id').value = usuario.ID_Usuario;
    document.getElementById('edit-user-nombres').value = usuario.Nombres || '';
    document.getElementById('edit-user-correo').value = usuario.Correo_Institucional || '';
    document.getElementById('edit-user-rol').value = usuario.ID_Rol;
    document.getElementById('edit-user-activo').checked = (usuario.Estado_Activo === 1);

    new bootstrap.Modal(document.getElementById('modalEditarUsuario')).show();
  } catch (e) {
    alert('Error al cargar datos del usuario');
  }
};

window.abrirRestablecerPassword = function(id, nombre) {
  document.getElementById('reset-user-id').value = id;
  document.getElementById('reset-user-nombre').textContent = nombre;
  document.getElementById('reset-user-newpass').value = '';
  new bootstrap.Modal(document.getElementById('modalRestablecerPass')).show();
};

// Eventos de envío para los formularios de edición
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('form-editar-devoto')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('edit-devoto-id').value;
    const body = {
      dpi: document.getElementById('edit-devoto-dpi').value.trim(),
      nombres: document.getElementById('edit-devoto-nombres').value.trim(),
      apellidos: document.getElementById('edit-devoto-apellidos').value.trim(),
      telefono: document.getElementById('edit-devoto-telefono').value.trim(),
      correo: document.getElementById('edit-devoto-correo').value.trim(),
      estaturaHombroCm: parseFloat(document.getElementById('edit-devoto-altura').value),
      estadoActivo: document.getElementById('edit-devoto-activo').checked ? 1 : 0
    };
    const res = await fetchAutenticado(`/devotos/${id}`, { method: 'PUT', body: JSON.stringify(body) });
    const data = await res.json();
    if (!res.ok) return alert(data.mensaje || 'Error al actualizar');
    alert('Devoto actualizado');
    bootstrap.Modal.getInstance(document.getElementById('modalEditarDevoto'))?.hide();
    cargarDevotos();
  });

  document.getElementById('form-editar-usuario')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('edit-user-id').value;
    const body = {
      nombres: document.getElementById('edit-user-nombres').value.trim(),
      correo: document.getElementById('edit-user-correo').value.trim(),
      idRol: parseInt(document.getElementById('edit-user-rol').value),
      estadoActivo: document.getElementById('edit-user-activo').checked ? 1 : 0
    };
    const res = await fetchAutenticado(`/usuarios/${id}`, { method: 'PUT', body: JSON.stringify(body) });
    const data = await res.json();
    if (!res.ok) return alert(data.mensaje || 'Error al actualizar');
    alert('Usuario actualizado');
    bootstrap.Modal.getInstance(document.getElementById('modalEditarUsuario'))?.hide();
    cargarUsuarios();
  });

  document.getElementById('form-restablecer-pass')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('reset-user-id').value;
    const nuevaPassword = document.getElementById('reset-user-newpass').value;
    const res = await fetchAutenticado(`/usuarios/${id}/password`, {
      method: 'PATCH',
      body: JSON.stringify({ nuevaPassword })
    });
    const data = await res.json();
    if (!res.ok) return alert(data.mensaje || 'Error al restablecer');
    alert('Contraseña restablecida exitosamente');
    bootstrap.Modal.getInstance(document.getElementById('modalRestablecerPass'))?.hide();
  });
});

// ==============================================================
// GESTIÓN DE INVENTARIO DE ENSERES Y KARDEX (ADMIN)
// ==============================================================
let listaEnseresLocal = [];

async function cargarEnseres() {
  const tbody = document.getElementById('tabla-enseres-body');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-4"><div class="spinner-border spinner-border-sm me-2"></div>Cargando inventario...</td></tr>';

  try {
    const res = await fetchAutenticado('/enseres');
    const data = await res.json();
    listaEnseresLocal = data.catalogo || [];

    document.getElementById('total-enseres-badge').textContent = `${listaEnseresLocal.length} artículo(s) registrados`;
    renderizarTablaEnseres(listaEnseresLocal);
  } catch (err) {
    console.error('Error al cargar enseres:', err);
    tbody.innerHTML = '<tr><td colspan="5" class="text-center text-danger py-4">Error al cargar el inventario de enseres.</td></tr>';
  }
}

function renderizarTablaEnseres(articulos) {
  const tbody = document.getElementById('tabla-enseres-body');
  if (!tbody) return;

  if (articulos.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-4">No hay enseres registrados en el catálogo.</td></tr>';
    return;
  }

  tbody.innerHTML = articulos.map(a => {
    const stock = a.Total_Existencias ?? 0;
    const stockBadge = stock > 5 
      ? `<span class="badge bg-success">${stock} unids</span>` 
      : (stock > 0 
          ? `<span class="badge bg-warning text-dark">${stock} unids</span>` 
          : `<span class="badge bg-danger">Agotado (0)</span>`);

    return `
      <tr>
        <td><span class="badge bg-light text-dark font-monospace">${a.ID_Enser}</span></td>
        <td class="fw-semibold text-morado">${a.Nombre_Articulo}</td>
        <td class="text-muted small">${a.Descripcion || '<span class="fst-italic text-secondary">Sin descripción</span>'}</td>
        <td class="text-center">${stockBadge}</td>
        <td class="text-end">
          <div class="btn-group btn-group-sm">
            <button class="btn btn-outline-success" onclick="abrirMovimientoKardex(${a.ID_Enser}, '${a.Nombre_Articulo.replace(/'/g, "\\'")}', ${stock})" title="Registrar Movimiento">
              <i class="bi bi-arrow-left-right me-1"></i>Kardex
            </button>
            <button class="btn btn-outline-secondary" onclick="abrirHistorialKardex(${a.ID_Enser})" title="Ver Historial">
              <i class="bi bi-clock-history"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

window.abrirNuevoEnser = function() {
  document.getElementById('form-nuevo-enser').reset();
  new bootstrap.Modal(document.getElementById('modalNuevoEnser')).show();
};

window.abrirMovimientoKardex = function(id, nombre, stock) {
  document.getElementById('form-movimiento-kardex').reset();
  document.getElementById('kardex-enser-id').value = id;
  document.getElementById('kardex-enser-nombre').textContent = nombre;
  document.getElementById('kardex-stock-actual').textContent = stock + ' unidades';
  new bootstrap.Modal(document.getElementById('modalMovimientoKardex')).show();
};

window.abrirHistorialKardex = async function(id) {
  const tbody = document.getElementById('historial-kardex-body');
  tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-3">Cargando bitácora...</td></tr>';
  const modal = new bootstrap.Modal(document.getElementById('modalHistorialKardex'));
  modal.show();

  try {
    const res = await fetchAutenticado('/enseres/' + id + '/kardex');
    const data = await res.json();
    document.getElementById('historial-articulo-nombre').textContent = data.articulo || 'Artículo #' + id;
    document.getElementById('historial-stock-badge').textContent = (data.existenciasActuales ?? 0) + ' unidades';

    if (!data.movimientos || data.movimientos.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-3">Sin movimientos registrados para este artículo.</td></tr>';
      return;
    }

    tbody.innerHTML = data.movimientos.map(m => {
      const esEntrada = m.Tipo_Operacion === 'ENTRADA';
      const badge = esEntrada ? '<span class="badge bg-success">ENTRADA</span>' : '<span class="badge bg-danger">SALIDA</span>';
      const fecha = m.Fecha_Movimiento ? new Date(m.Fecha_Movimiento).toLocaleString() : 'N/A';
      return `
        <tr>
          <td class="small font-monospace">${fecha}</td>
          <td>${badge}</td>
          <td class="text-center fw-bold">${m.Cantidad}</td>
          <td><span class="badge bg-light text-dark">${m.Estado_Conservacion || 'Bueno'}</span></td>
          <td class="small text-muted">${m.Responsable || 'Admin'}</td>
        </tr>
      `;
    }).join('');
  } catch (e) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-center text-danger py-3">Error al consultar el historial.</td></tr>';
  }
};

document.addEventListener('DOMContentLoaded', () => {
  // Buscador en tiempo real de enseres
  document.getElementById('buscar-enser')?.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase().trim();
    const filtrados = listaEnseresLocal.filter(a => 
      a.Nombre_Articulo.toLowerCase().includes(q) || 
      (a.Descripcion && a.Descripcion.toLowerCase().includes(q))
    );
    renderizarTablaEnseres(filtrados);
  });

  // Guardar nuevo enser
  document.getElementById('form-nuevo-enser')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nombreArticulo = document.getElementById('enser-nombre').value.trim();
    const descripcion = document.getElementById('enser-descripcion').value.trim();

    try {
      const res = await fetchAutenticado('/enseres', {
        method: 'POST',
        body: JSON.stringify({ nombreArticulo, descripcion })
      });
      const data = await res.json();
      if (!res.ok) return alert(data.mensaje || 'Error al registrar el enser');

      alert('Enser registrado exitosamente');
      bootstrap.Modal.getInstance(document.getElementById('modalNuevoEnser'))?.hide();
      cargarEnseres();
    } catch (err) {
      alert('Error de conexión al registrar el enser');
    }
  });

  // Procesar movimiento de kardex
  document.getElementById('form-movimiento-kardex')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const idEnser = parseInt(document.getElementById('kardex-enser-id').value, 10);
    const tipoOperacion = document.getElementById('kardex-tipo').value;
    const cantidad = parseInt(document.getElementById('kardex-cantidad').value, 10);
    const estadoConservacion = document.getElementById('kardex-conservacion').value;

    try {
      const res = await fetchAutenticado('/enseres/kardex/movimiento', {
        method: 'POST',
        body: JSON.stringify({
          idEnser,
          idUsuarioResponsable: usuarioActual?.idUsuario || 1,
          tipoOperacion,
          cantidad,
          estadoConservacion
        })
      });
      const data = await res.json();
      if (!res.ok) return alert(data.mensaje || 'Error al procesar el movimiento');

      alert(data.mensaje || 'Movimiento registrado exitosamente');
      bootstrap.Modal.getInstance(document.getElementById('modalMovimientoKardex'))?.hide();
      cargarEnseres();
    } catch (err) {
      alert('Error de conexión al procesar el movimiento en Kardex');
    }
  });
});
