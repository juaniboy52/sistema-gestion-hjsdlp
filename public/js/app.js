const API_URL = '/api';

// Usar sessionStorage para que la sesión muera al cerrar las pestañas/navegador
let tokenActual = sessionStorage.getItem('token_hermandad') || null;
let usuarioActual = JSON.parse(sessionStorage.getItem('usuario_hermandad') || '{}');

document.addEventListener('DOMContentLoaded', () => {
  if (tokenActual) {
    iniciarSesionEnFrontend(tokenActual, usuarioActual);
  } else {
    navegarA('vista-login');
  }

  // Formularios
  document.getElementById('form-login').addEventListener('submit', manejarLogin);
  document.getElementById('form-nuevo-devoto').addEventListener('submit', manejarRegistroDevoto);
  document.getElementById('form-asignar-turno').addEventListener('submit', manejarAsignarTurno);
  document.getElementById('form-ofrenda').addEventListener('submit', manejarOfrenda);
  document.getElementById('form-egreso').addEventListener('submit', manejarEgreso);
  document.getElementById('form-nuevo-usuario').addEventListener('submit', manejarCrearUsuario);
});

// 1. Navegación SPA
function navegarA(idSeccion) {
  document.querySelectorAll('section').forEach(s => s.classList.add('d-none'));
  const target = document.getElementById(idSeccion);
  if (target) target.classList.remove('d-none');

  if (idSeccion === 'vista-devotos') cargarDevotos();
  if (idSeccion === 'vista-caja') cargarSelectDevotos();
  if (idSeccion === 'vista-anda') cargarDistribucionAnda();
  if (idSeccion === 'vista-reportes') cargarReportes();
  if (idSeccion === 'vista-usuarios') cargarUsuarios();
  if (idSeccion === 'vista-auditoria') cargarAuditoria();
}

// 2. Autenticación y Cierre de Sesión
async function manejarLogin(e) {
  e.preventDefault();
  const correo = document.getElementById('login-correo').value;
  const password = document.getElementById('login-password').value;
  const alerta = document.getElementById('login-alerta');

  try {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ correo, password })
    });
    const data = await res.json();

    if (!res.ok) {
      alerta.textContent = data.mensaje || 'Correo o contraseña incorrecta';
      alerta.classList.remove('d-none');
      return;
    }

    tokenActual = data.token;
    usuarioActual = data.usuario;

    // Guardar en sessionStorage (se borra al cerrar las pestañas)
    sessionStorage.setItem('token_hermandad', tokenActual);
    sessionStorage.setItem('usuario_hermandad', JSON.stringify(usuarioActual));

    // Limpiar campos del login para no dejarlos en memoria DOM
    document.getElementById('login-correo').value = '';
    document.getElementById('login-password').value = '';
    alerta.classList.add('d-none');

    iniciarSesionEnFrontend(tokenActual, usuarioActual);
  } catch (error) {
    alerta.textContent = 'Error de conexión con el servidor';
    alerta.classList.remove('d-none');
  }
}

function iniciarSesionEnFrontend(token, usuario) {
  document.getElementById('navbar-principal').classList.remove('d-none');
  document.getElementById('usuario-nombre').textContent = usuario.nombres || 'Usuario';
  document.getElementById('usuario-rol').textContent = usuario.rol || 'Colaborador';

  const esAdmin = usuario.idRol === 1;
  const navUsuarios = document.getElementById('nav-item-usuarios');
  const navAuditoria = document.getElementById('nav-item-auditoria');

  if (navUsuarios) navUsuarios.classList.toggle('d-none', !esAdmin);
  if (navAuditoria) navAuditoria.classList.toggle('d-none', !esAdmin);

  navegarA('vista-devotos');
}

function cerrarSesion() {
  // Limpiar almacenamiento de sesión y local
  sessionStorage.clear();
  localStorage.clear();
  tokenActual = null;
  usuarioActual = {};

  // Limpiar campos del formulario
  const formLogin = document.getElementById('form-login');
  if (formLogin) formLogin.reset();
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
  navegarA('vista-login');
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
  const estaturaHombroCm = parseInt(document.getElementById('devoto-estatura').value, 10);

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
  const select = document.getElementById('turno-devoto-select');
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
  const conceptoGasto = document.getElementById('egreso-concepto').value;
  const montoQuetzales = parseFloat(document.getElementById('egreso-monto').value);
  const numeroFacturaComprobante = document.getElementById('egreso-factura').value || 'S/F';

  const res = await fetchAutenticado('/finanzas/egreso', {
    method: 'POST',
    body: JSON.stringify({ 
      proveedorBeneficiario, 
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
            ${u.ID_Usuario === usuarioActual.idUsuario ? 
              '<span class="text-muted small">Tu cuenta</span>' : 
              `<button class="btn btn-sm ${esActivo ? 'btn-outline-danger' : 'btn-outline-success'}" 
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
