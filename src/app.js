const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');

const auditMiddleware = require('./middlewares/auditMiddleware');
const authRoutes = require('./routes/authRoutes');
const usuarioRoutes = require('./routes/usuarioRoutes');
const configuracionRoutes = require('./routes/configuracionRoutes');
const devotoRoutes = require('./routes/devotoRoutes');
const turnoRoutes = require('./routes/turnoRoutes');
const enseresRoutes = require('./routes/enseresRoutes');
const auditoriaRoutes = require('./routes/auditoriaRoutes');
const reportesRoutes = require('./routes/reportesRoutes');
const finanzasRoutes = require('./routes/finanzasRoutes');

const app = express();

// Configuración de cabeceras permitiendo recursos externos (Bootstrap CDN e Icons)
app.use(helmet({
  contentSecurityPolicy: false
}));
app.use(cors());
app.use(express.json());
app.use(auditMiddleware);

// Servir archivos estáticos del frontend
app.use(express.static(path.join(__dirname, '../public')));

// Endpoints API
app.get('/api/health', (req, res) => {
  res.status(200).json({
    estado: 'OK',
    sistema: 'Hermandad de Jesús Sepultado de la Paz',
    timestamp: new Date().toISOString()
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/usuarios', usuarioRoutes);
app.use('/api/configuracion', configuracionRoutes);
app.use('/api/devotos', devotoRoutes);
app.use('/api/turnos', turnoRoutes);
app.use('/api/enseres', enseresRoutes);
app.use('/api/auditoria', auditoriaRoutes);
app.use('/api/reportes', reportesRoutes);
app.use('/api/finanzas', finanzasRoutes);

// Fallback compatible con Express 5 para Single Page Application (SPA)
// Si la petición no coincide con la API, entrega el index.html
app.use((req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

module.exports = app;
