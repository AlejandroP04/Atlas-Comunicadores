const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Importamos las rutas
const atlasRoutes = require('./routes/atlasRoutes');

const app = express();

// Middlewares esenciales
app.use(cors());
app.use(express.json());

// Configuración de Rutas
app.use('/api', atlasRoutes);

// Manejo de errores básico
app.use((req, res) => {
    res.status(404).json({ mensaje: "Ruta no encontrada" });
});

// Manejo de errores globales
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Algo salió mal en el servidor' });
});

// Arrancar el servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log('Servidor corriendo en puerto ' + PORT);
});