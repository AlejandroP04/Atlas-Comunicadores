const express = require('express');
const router = express.Router();
const atlasController = require('../controllers/atlasController');

// Solo las rutas que SÍ existen en tu atlasController.js
router.get('/filtros', atlasController.getFilters);
router.get('/personas', atlasController.getAllPersonas);
router.get('/red', atlasController.getNetworkData);

module.exports = router;