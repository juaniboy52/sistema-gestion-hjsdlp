const express = require('express');
const router = express.Router();
const DevotoController = require('../controllers/devotoController');
const { verificarToken, permitirRoles } = require('../middlewares/authMiddleware');

router.get('/', DevotoController.obtenerDevotos);
router.get('/:dpi', DevotoController.obtenerPorDPI);
router.post('/', DevotoController.registrarDevoto);
router.put('/:id', verificarToken, permitirRoles(1, 2), DevotoController.actualizarDevoto);

module.exports = router;
