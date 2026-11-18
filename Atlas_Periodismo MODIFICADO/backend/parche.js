const mysql = require('mysql2');
require('dotenv').config();

const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    ssl: { rejectUnauthorized: false }
});

const query = `ALTER TABLE creadores MODIFY COLUMN foto_url TEXT, MODIFY COLUMN perfil_url TEXT;`;

db.query(query, (err, results) => {
    if (err) {
        console.error("Error al modificar la tabla:", err.message);
    } else {
        console.log("¡Éxito! Las columnas foto_url y perfil_url ahora son de tipo TEXT.");
    }
    process.exit(); // Cierra el script automáticamente
});