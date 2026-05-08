const db = require('../config/db');

// 1. Obtener filtros dinámicos con conteos
exports.getFilters = async (req, res) => {
    try {
        // Consultamos categorías y países con sus respectivos conteos
        const [categorias] = await db.query(`
            SELECT c.nombre, COUNT(p.id) as count 
            FROM categorias_persona c 
            LEFT JOIN personas p ON p.categoria_id = c.id 
            GROUP BY c.id
        `);

        const [paises] = await db.query(`
            SELECT pa.nombre, COUNT(p.id) as count 
            FROM paises pa 
            LEFT JOIN personas p ON p.pais_id = pa.id 
            GROUP BY pa.id
        `);

        // Formateamos para el frontend
        const filters = [
            { id: 'categoria', nombre: 'TOPIC / GROUP', icono: '📁', opciones: categorias },
            { id: 'pais', nombre: 'LOCATION', icono: '📍', opciones: paises }
        ];

        res.json(filters);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 2. Obtener personas (con soporte para búsqueda y filtros)
exports.getAllPersonas = async (req, res) => {
    try {
        const { q, filtros } = req.query;
        
        let query = `
            SELECT p.id, p.nombre, p.canal, pa.nombre AS pais, c.nombre AS categoria, prof.nombre AS perfil
            FROM personas p
            LEFT JOIN paises pa ON p.pais_id = pa.id
            LEFT JOIN categorias_persona c ON p.categoria_id = c.id
            LEFT JOIN perfiles_profesionales prof ON p.perfil_id = prof.id
            WHERE 1=1
        `;
        
        const params = [];

        // Filtro de búsqueda por texto
        if (q) {
            query += ` AND (p.nombre LIKE ? OR p.canal LIKE ?)`;
            params.push(`%${q}%`, `%${q}%`);
        }

        // Filtro por categorías/países/perfiles (Checkboxes)
        if (filtros) {
            const listaFiltros = filtros.split(','); // Convertimos "Politica,Mexico" en array
            // Creamos los placeholders (?, ?, ?) para el IN
            const placeholders = listaFiltros.map(() => '?').join(',');
            
            query += ` AND (
                c.nombre IN (${placeholders}) OR 
                pa.nombre IN (${placeholders}) OR 
                prof.nombre IN (${placeholders})
            )`;
            
            // Añadimos los valores tres veces (uno por cada columna del OR)
            params.push(...listaFiltros, ...listaFiltros, ...listaFiltros);
        }

        const [rows] = await db.query(query, params);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 3. Endpoint para D3.js (Red)
exports.getNetworkData = async (req, res) => {
    try {
        const [personas] = await db.query('SELECT CONCAT("p", id) as id, nombre, "persona" as type FROM personas');
        const [grupos] = await db.query('SELECT CONCAT("g", id) as id, nombre, "grupo" as type FROM grupos');
        const [links] = await db.query('SELECT CONCAT("p", persona_id) AS source, CONCAT("g", grupo_id) AS target FROM persona_grupo');
        res.json({ nodes: [...personas, ...grupos], links });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};