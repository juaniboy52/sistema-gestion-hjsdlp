require('dotenv').config();
const app = require('./src/app');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(` Servidor de la Hermandad corriendo en el puerto ${PORT}`);
  console.log(` Healthcheck: http://localhost:${PORT}/api/health`);
  console.log(` API Devotos: http://localhost:${PORT}/api/devotos`);
});
