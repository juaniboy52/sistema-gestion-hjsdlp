const express = require('express');
const router = express.Router();
const EnseresController = require('../controllers/enseresController');

router.get('/', EnseresController.listar);
router.post('/', EnseresController.crear);
router.post('/kardex/movimiento', EnseresController.registrarMovimiento);
router.get('/:idEnser/kardex', EnseresController.verHistorial);

module.exports = router;
