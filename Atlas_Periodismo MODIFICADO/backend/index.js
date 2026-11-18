const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const app = express();
app.use(cors());
app.use(express.json());

// Archivos estáticos del frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// Conexión segura a MariaDB en Aiven
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    ssl: { rejectUnauthorized: false }
});

db.connect((err) => {
    if (err) {
        console.error('Error conectando a MariaDB:', err.message);
        return;
    }
    console.log('Conexión exitosa a la base de datos atlas_fes');
});

// Middleware de seguridad para el Panel Admin
function verificarAdmin(req, res, next) {
    const user = (req.headers['x-admin-user'] || '').trim();
    const pass = (req.headers['x-admin-password'] || '').trim();

    const validUser = (process.env.ADMIN_USER || 'admin').trim();
    const validPass = (process.env.ADMIN_PASSWORD || 'atlas2026').trim();

    if (user === validUser && pass === validPass) {
        return next();
    }

    console.warn(`Acceso denegado. Usuario enviado: "${user}" | Origen: ${process.env.ADMIN_USER ? '.env' : 'por defecto'}`);
    return res.status(401).json({ error: 'Usuario o contraseña incorrectos.' });
}

function capitalizarTexto(texto) {
    if (!texto) return null;
    return String(texto)
        .replace(/([a-záéíóúñ])([A-ZÁÉÍÓÚÑ])/g, '$1 $2')
        .split(',')
        .map(parte => {
            const limpio = parte.trim().replace(/\s+/g, ' ');
            if (!limpio) return '';
            return limpio.charAt(0).toUpperCase() + limpio.slice(1).toLowerCase();
        })
        .filter(Boolean)
        .join(', ');
}

function capitalizarNombre(texto) {
    if (!texto) return null;
    return String(texto)
        .replace(/([a-záéíóúñ])([A-ZÁÉÍÓÚÑ])/g, '$1 $2')
        .trim()
        .replace(/\s+/g, ' ')
        .split(' ')
        .map(palabra => palabra.charAt(0).toUpperCase() + palabra.slice(1).toLowerCase())
        .join(' ');
}

// Endpoint para validar inicio de sesión
app.post('/api/admin/login', verificarAdmin, (req, res) => {
    res.json({ ok: true, message: 'Acceso concedido' });
});

// Obtener todos los creadores ordenados alfabéticamente
app.get('/api/personas', (req, res) => {
    const query = 'SELECT * FROM creadores ORDER BY nombre ASC';
    db.query(query, (err, results) => {
        if (err) {
            console.error('Error al consultar la base de datos:', err);
            res.status(500).send('Error interno del servidor');
            return;
        }
        res.json(results);
    });
});

// Ruta raíz
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend', 'index.html'));
});

// Insertar un nuevo creador (incluyendo indicador de actividad)
app.post('/api/creadores', verificarAdmin, (req, res) => {
    const { nombre, plataforma, tematicas, funcion, multimedia, foto_url, perfil_url, tipo, activo } = req.body;

    const esActivo = (activo === 0 || activo === false || String(activo).toLowerCase() === 'inactivo') ? 0 : 1;

    const datosFormateados = [
        capitalizarNombre(nombre),
        capitalizarTexto(plataforma),
        capitalizarTexto(tematicas),
        capitalizarTexto(funcion),
        capitalizarTexto(multimedia),
        foto_url ? String(foto_url).trim() : null,
        perfil_url ? String(perfil_url).trim() : null,
        capitalizarTexto(tipo) || 'Individual',
        esActivo
    ];

    const query = `INSERT INTO creadores 
        (nombre, plataforma, tematicas, funcion, multimedia, foto_url, perfil_url, tipo, activo) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    db.query(query, datosFormateados, (err, results) => {
        if (err) {
            if (err.code === 'ER_DUP_ENTRY') {
                res.status(409).json({ error: 'Ese creador ya se encuentra registrado en el Atlas.' });
                return;
            }
            console.error('Error al insertar en la base de datos:', err);
            res.status(500).json({ error: 'Error al guardar el registro' });
            return;
        }
        res.json({ message: 'Registro creado con éxito', id: results.insertId });
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});