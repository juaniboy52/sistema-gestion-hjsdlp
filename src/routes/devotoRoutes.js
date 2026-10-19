const express = require('express');
const router = express.Router();
const DevotoController = require('../controllers/devotoController');
const { verificarToken, permitirRoles } = require('../middlewares/authMiddleware');

router.get('/', DevotoController.obtenerDevotos);
router.get('/:dpi', DevotoController.obtenerPorDPI);
router.post('/', DevotoController.registrarDevoto);
router.put('/:id', verificarToken, (req, res, next) => {
  // Administradores y directivos (roles 1 y 2) tienen acceso global
  if ([1, 2].includes(req.usuario.idRol || req.usuario.ID_Rol)) {
    return next();
  }
  // Devoto autenticado: solo puede actualizar su propio registro
  if (req.usuario.rol === 'Devoto' && String(req.usuario.id) === String(req.params.id)) {
    return next();
  }
  return res.status(403).json({ mensaje: 'Acceso no autorizado a este registro de devoto' });
}, DevotoController.actualizarDevoto);

module.exports = router;
