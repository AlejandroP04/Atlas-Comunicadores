const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
require('dotenv').config(); // Esto carga tus secretos del archivo .env

const app = express();
app.use(cors());
app.use(express.json());

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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo protegido en http://localhost:${PORT}`);
});