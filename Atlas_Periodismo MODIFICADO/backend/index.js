const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
const path = require('path'); // 1. AGREGADO: Módulo para manejar rutas de carpetas
require('dotenv').config(); // Esto carga tus secretos del archivo .env

const app = express();
app.use(cors());
app.use(express.json());

// 2. AGREGADO: Le dice a Express dónde están tus archivos CSS, JS e imágenes.
// Usamos '../frontend' para salir de la carpeta backend y entrar a frontend.
app.use(express.static(path.join(__dirname, '../frontend')));

// Creación de la conexión segura a MariaDB
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT
});

// Prueba de conexión para detectar errores
db.connect((err) => {
    if (err) {
        console.error('Error conectando a MariaDB:', err.message);
        return;
    }
    console.log('Conexión exitosa a la base de datos atlas_fes');
});

// Ruta de tu API para enviar los creadores al Frontend
app.get('/api/personas', (req, res) => {
    const query = 'SELECT * FROM creadores';
    db.query(query, (err, results) => {
        if (err) {
            console.error('Error al consultar la base de datos:', err);
            res.status(500).send('Error interno del servidor');
            return;
        }
        res.json(results);
    });
});

// 3. AGREGADO: Cuando alguien entre a la raíz (/), le enviamos el index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});