const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const auditMiddleware = require('./middlewares/auditMiddleware');
const authRoutes = require('./routes/authRoutes');
const devotoRoutes = require('./routes/devotoRoutes');
const turnoRoutes = require('./routes/turnoRoutes');
const enseresRoutes = require('./routes/enseresRoutes');
const auditoriaRoutes = require('./routes/auditoriaRoutes');

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

// Registro global de auditoría en mutaciones
app.use(auditMiddleware);

// Rutas base
app.get('/api/health', (req, res) => {
  res.status(200).json({
    estado: 'OK',
    sistema: 'Hermandad de Jesús Sepultado de la Paz',
    timestamp: new Date().toISOString()
  });
});

// Enrutadores
app.use('/api/auth', authRoutes);
app.use('/api/devotos', devotoRoutes);
app.use('/api/turnos', turnoRoutes);
app.use('/api/enseres', enseresRoutes);
app.use('/api/auditoria', auditoriaRoutes);

// Manejador 404
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint no encontrado' });
});

module.exports = app;
