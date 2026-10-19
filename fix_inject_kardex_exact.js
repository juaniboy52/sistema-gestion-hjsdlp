const fs = require('fs');
const file = 'public/index.html';
let content = fs.readFileSync(file, 'utf8');

// 1. Bloque a buscar: desde la tabla de enseres hasta </section>
const bloqueViejo = `          <div class="table-responsive">
            <table class="table table-hover align-middle mb-0">
              <thead class="table-light">
                <tr>
                  <th style="width: 70px;">ID</th>
                  <th>Artículo</th>
                  <th>Descripción</th>
                  <th class="text-center" style="width: 130px;">Existencias</th>
                  <th class="text-end" style="width: 220px;">Acciones</th>
                </tr>
              </thead>
              <tbody id="tabla-enseres-body">
                <tr>
                  <td colspan="5" class="text-center text-muted py-4">Cargando inventario...</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>`;

// 2. Bloque nuevo: cierra subvista-enseres-catalogo y añade subvista-enseres-kardex
const bloqueNuevo = `          <div class="table-responsive">
            <table class="table table-hover align-middle mb-0">
              <thead class="table-light">
                <tr>
                  <th style="width: 70px;">ID</th>
                  <th>Artículo</th>
                  <th>Descripción</th>
                  <th class="text-center" style="width: 130px;">Existencias</th>
                  <th class="text-end" style="width: 220px;">Acciones</th>
                </tr>
              </thead>
              <tbody id="tabla-enseres-body">
                <tr>
                  <td colspan="5" class="text-center text-muted py-4">Cargando inventario...</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
      </div> <!-- Fin #subvista-enseres-catalogo -->

      <!-- SUBVISTA 2: AUDITORÍA Y KARDEX DETALLADO -->
      <div id="subvista-enseres-kardex" class="d-none">
        <div class="card card-custom shadow-sm border-0 bg-white rounded-4 mb-4">
          <div class="card-body p-4">
            <div class="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
              <div>
                <h5 class="fw-bold text-morado font-cinzel mb-1"><i class="bi bi-journal-check me-2"></i>Historial de Movimientos de Kardex</h5>
                <p class="text-muted small mb-0">Detalle de ingresos, salidas, responsables de los movimientos y conservación</p>
              </div>
              <div class="d-flex gap-2">
                <select class="form-select form-select-sm" id="filtro-kardex-articulo" style="min-width: 220px;" onchange="filtrarKardexPorArticulo(this.value)">
                  <option value="">Todos los artículos</option>
                </select>
                <button class="btn btn-sm btn-outline-secondary" onclick="cargarKardexGeneral()" title="Actualizar">
                  <i class="bi bi-arrow-clockwise"></i>
                </button>
              </div>
            </div>

            <div class="table-responsive">
              <table class="table table-hover align-middle mb-0">
                <thead class="table-light small text-uppercase">
                  <tr>
                    <th>Fecha / Hora</th>
                    <th>Artículo</th>
                    <th>Tipo</th>
                    <th class="text-center">Cantidad</th>
                    <th>Estado / Detalle</th>
                    <th>Responsable del Movimiento</th>
                  </tr>
                </thead>
                <tbody id="tabla-kardex-general-body">
                  <tr><td colspan="6" class="text-center text-muted py-4">Cargando movimientos de Kardex...</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </section>`;

if (content.includes(bloqueViejo)) {
  content = content.replace(bloqueViejo, bloqueNuevo);
  console.log('✅ Contenedor subvista-enseres-kardex inyectado correctamente.');
} else {
  console.log('⚠️ Buscando alternativa tolerante de reemplazo...');
  const idx = content.indexOf('<div id="subvista-enseres-catalogo">');
  const idxFin = content.indexOf('</section>', idx);
  if (idx !== -1 && idxFin !== -1) {
    const sub = content.substring(idx, idxFin);
    const posTable = sub.lastIndexOf('</div>\n      </div>');
    if (posTable !== -1) {
      const parte1 = content.substring(0, idx + posTable + 19);
      const parte2 = content.substring(idxFin);
      const kardexHtml = `\n      </div> <!-- Fin #subvista-enseres-catalogo -->\n\n      <!-- SUBVISTA 2: AUDITORÍA Y KARDEX DETALLADO -->\n      <div id="subvista-enseres-kardex" class="d-none">\n        <div class="card card-custom shadow-sm border-0 bg-white rounded-4 mb-4">\n          <div class="card-body p-4">\n            <div class="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">\n              <div>\n                <h5 class="fw-bold text-morado font-cinzel mb-1"><i class="bi bi-journal-check me-2"></i>Historial de Movimientos de Kardex</h5>\n                <p class="text-muted small mb-0">Detalle de ingresos, salidas, responsables de los movimientos y conservación</p>\n              </div>\n              <div class="d-flex gap-2">\n                <select class="form-select form-select-sm" id="filtro-kardex-articulo" style="min-width: 220px;" onchange="filtrarKardexPorArticulo(this.value)">\n                  <option value="">Todos los artículos</option>\n                </select>\n                <button class="btn btn-sm btn-outline-secondary" onclick="cargarKardexGeneral()" title="Actualizar">\n                  <i class="bi bi-arrow-clockwise"></i>\n                </button>\n              </div>\n            </div>\n\n            <div class="table-responsive">\n              <table class="table table-hover align-middle mb-0">\n                <thead class="table-light small text-uppercase">\n                  <tr>\n                    <th>Fecha / Hora</th>\n                    <th>Artículo</th>\n                    <th>Tipo</th>\n                    <th class="text-center">Cantidad</th>\n                    <th>Estado / Detalle</th>\n                    <th>Responsable del Movimiento</th>\n                  </tr>\n                </thead>\n                <tbody id="tabla-kardex-general-body">\n                  <tr><td colspan="6" class="text-center text-muted py-4">Cargando movimientos de Kardex...</td></tr>\n                </tbody>\n              </table>\n            </div>\n          </div>\n        </div>\n      </div>\n    `;
      content = parte1 + kardexHtml + parte2;
      console.log('✅ Inyección tolerante completada.');
    }
  }
}

// 3. Modal individual si no existe
if (!content.includes('id="modal-historial-kardex"')) {
  const modalIndividual = `
  <!-- MODAL HISTORIAL KARDEX INDIVIDUAL -->
  <div class="modal fade" id="modal-historial-kardex" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
      <div class="modal-content rounded-4 border-0 shadow">
        <div class="modal-header card-header-morado text-white">
          <h5 class="modal-title font-cinzel"><i class="bi bi-clock-history me-2"></i>Kardex: <span id="modal-kardex-titulo-articulo">Artículo</span></h5>
          <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body p-4">
          <div class="d-flex justify-content-between align-items-center mb-3 p-3 bg-light rounded-3">
            <div>
              <span class="text-muted small d-block">Existencias actuales:</span>
              <span class="fs-4 fw-bold text-morado" id="modal-kardex-stock-actual">0 unids</span>
            </div>
            <button class="btn btn-sm btn-morado text-white" id="modal-btn-nuevo-movimiento">
              <i class="bi bi-plus-circle me-1"></i>Nuevo Movimiento
            </button>
          </div>

          <div class="table-responsive">
            <table class="table table-sm table-hover align-middle">
              <thead class="table-light small text-uppercase">
                <tr>
                  <th>Fecha</th>
                  <th>Operación</th>
                  <th class="text-center">Cantidad</th>
                  <th>Conservación</th>
                  <th>Responsable</th>
                </tr>
              </thead>
              <tbody id="modal-tabla-kardex-body">
                <tr><td colspan="5" class="text-center text-muted py-3">Cargando movimientos...</td></tr>
              </tbody>
            </table>
          </div>
        </div>
        <div class="modal-footer border-top-0">
          <button type="button" class="btn btn-secondary px-4" data-bs-dismiss="modal">Cerrar</button>
        </div>
      </div>
    </div>
  </div>`;
  content = content.replace('</body>', `${modalIndividual}\n</body>`);
}

// Actualizar versión de cache
const v = Date.now();
content = content.replace(/src=["\x27]js\/app\.js(\?v=[0-9]+)?["\x27]/g, `src="js/app.js?v=${v}"`);

fs.writeFileSync(file, content, 'utf8');
console.log('🚀 Archivo public/index.html guardado exitosamente.');
