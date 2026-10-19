const fs = require('fs');

// 1. Inyectar el Modal HTML de Bienvenida en public/index.html antes del cierre de </body>
let html = fs.readFileSync('public/index.html', 'utf8');

const modalBienvenidaHTML = `
  <!-- MODAL DE BIENVENIDA INSTITUCIONAL -->
  <div class="modal fade" id="modalBienvenidaUsuario" tabindex="-1" aria-hidden="true" data-bs-backdrop="static">
    <div class="modal-dialog modal-dialog-centered" style="max-width: 420px;">
      <div class="modal-content border-0 shadow-lg rounded-4 overflow-hidden text-center">
        <div class="p-4" style="background: linear-gradient(135deg, #2b0833 0%, #4a0e4e 100%); color: #fff;">
          <div class="mb-3 d-inline-flex p-3 rounded-circle" style="background: rgba(255, 255, 255, 0.12); border: 1px solid rgba(255, 215, 0, 0.4);">
            <i class="bi bi-shield-check" style="font-size: 2.8rem; color: #ffd700;"></i>
          </div>
          <h4 class="fw-bold mb-1" style="font-family: 'Cinzel', serif, sans-serif; letter-spacing: 0.5px;">¡Bienvenido(a)!</h4>
          <p class="small text-white-50 mb-0">Hermandad de Jesús Sepultado de la Paz</p>
        </div>
        <div class="modal-body p-4 bg-white">
          <p class="text-muted small mb-2 text-uppercase fw-semibold" style="letter-spacing: 1px;">Sesión iniciada correctamente</p>
          <h5 id="bienvenida-nombre-usuario" class="fw-bold text-dark mb-2">Usuario</h5>
          <div class="mb-3">
            <span id="bienvenida-rol-usuario" class="badge px-3 py-2 text-white shadow-sm fw-bold" style="background-color: #581845; font-size: 0.85rem;">
              ROL
            </span>
          </div>
          <div class="progress mb-3" style="height: 4px;">
            <div class="progress-bar progress-bar-striped progress-bar-animated bg-warning" role="progressbar" style="width: 100%"></div>
          </div>
          <button type="button" class="btn btn-morado w-100 py-2 rounded-3 fw-bold" data-bs-dismiss="modal">
            Ingresar al Sistema
          </button>
        </div>
      </div>
    </div>
  </div>
`;

if (!html.includes('id="modalBienvenidaUsuario"')) {
  html = html.replace('</body>', `${modalBienvenidaHTML}\n</body>`);
  console.log('✅ Modal de bienvenida insertada en public/index.html');
}

// 2. Agregar la función en public/js/app.js para mostrarla con datos dinámicos
let app = fs.readFileSync('public/js/app.js', 'utf8');

const funcionBienvenida = `
// ==========================================
// VENTANA DE BIENVENIDA TRAS LOGIN EXITOSO
// ==========================================
window.mostrarBienvenidaLogin = function(usuario) {
  const nombreEl = document.getElementById('bienvenida-nombre-usuario');
  const rolEl = document.getElementById('bienvenida-rol-usuario');
  const modalEl = document.getElementById('modalBienvenidaUsuario');

  if (nombreEl) {
    const nombre = usuario?.Nombres ? (usuario.Nombres + ' ' + (usuario.Apellidos || '')).trim() : (usuario?.Usuario || 'Usuario');
    nombreEl.textContent = nombre;
  }

  if (rolEl) {
    const rolesMap = {
      1: 'Administrador General',
      2: 'Secretaría',
      3: 'Tesorero',
      4: 'Encargado de Enseres',
      5: 'Cajero Receptor'
    };
    rolEl.textContent = usuario?.Nombre_Rol || rolesMap[usuario?.ID_Rol] || 'Colaborador';
  }

  if (modalEl && typeof bootstrap !== 'undefined') {
    const modalInstancia = new bootstrap.Modal(modalEl);
    modalInstancia.show();

    // Auto-cierre opcional tras 2.2 segundos para agilizar el flujo de trabajo
    setTimeout(() => {
      try { modalInstancia.hide(); } catch (e) {}
    }, 2200);
  }
};
`;

if (!app.includes('window.mostrarBienvenidaLogin')) {
  app += '\n' + funcionBienvenida;
}

// Interceptar en app.js cuando el login es exitoso
// Normalmente guarda token y usuario en localStorage:
if (app.includes('localStorage.setItem(\'usuario\'') || app.includes('localStorage.setItem("usuario"')) {
  console.log('ℹ️ LocalStorage detectado para usuario.');
}

fs.writeFileSync(file, app, 'utf8');

// Renovar versión de caché en index.html
const v = Date.now();
html = html.replace(/src=["\x27]js\/app\.js(\?v=[0-9]+)?["\x27]/g, `src="js/app.js?v=${v}"`);
fs.writeFileSync('public/index.html', html, 'utf8');
console.log('🚀 Versión de app.js renovada en index.html:', v);
