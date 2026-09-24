const express = require('express');
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

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(auditMiddleware);

// Rutas base
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

app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint no encontrado' });
});

module.exports = app;
