const express = require('express');
const router = express.Router();
const DevotoController = require('../controllers/devotoController');

router.get('/', DevotoController.obtenerDevotos);
router.get('/:dpi', DevotoController.obtenerPorDPI);
router.post('/', DevotoController.registrarDevoto);

module.exports = router;
