const API_URL = "/api";
let currentView = 'grid'; // Vista por defecto
let simulacionActual = null; // Para limpiar animaciones de D3
let allCreators = []; // Aquí guardaremos la base de datos en memoria

// 1. CARGAR PERSONAS (Filtro Inteligente en el Frontend)
function cargarPersonas() {
    // Empezamos con la lista completa de creadores
    let dataFiltrada = [...allCreators];

    // --- A. Lógica de la Barra de Búsqueda ---
    const inputBusqueda = document.getElementById('input-busqueda').value;
    
    if (inputBusqueda) {
        // Función mágica para ignorar mayúsculas y quitar acentos (tildes)
        const limpiarTexto = (texto) => {
            return (texto || '')
                .toLowerCase()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "");
        };

        const busqueda = limpiarTexto(inputBusqueda);

        dataFiltrada = dataFiltrada.filter(p => 
            limpiarTexto(p.nombre).includes(busqueda) ||
            limpiarTexto(p.categoria).includes(busqueda) ||
            limpiarTexto(p.pais).includes(busqueda) ||
            limpiarTexto(p.perfil).includes(busqueda)
        );
    }

    // --- B. Lógica de Filtros por Checkboxes (AND entre grupos, OR dentro del grupo) ---
    const checkboxes = document.querySelectorAll('.filter-checkbox:checked');
    const filtrosActivos = {};

    // Agrupamos qué casillas están marcadas según su categoría (perfil, categoria o pais)
    checkboxes.forEach(cb => {
        const grupo = cb.getAttribute('data-grupo'); 
        if (!filtrosActivos[grupo]) filtrosActivos[grupo] = [];
        filtrosActivos[grupo].push(cb.value);
    });

    // Aplicamos los filtros grupo por grupo
    Object.keys(filtrosActivos).forEach(grupo => {
        const valoresSeleccionados = filtrosActivos[grupo];
        if (valoresSeleccionados.length > 0) {
            // Filtramos la data para que solo queden los que coincidan con los seleccionados de este grupo
            dataFiltrada = dataFiltrada.filter(p => valoresSeleccionados.includes(p[grupo]));
        }
    });

    // --- C. Renderizar la Vista ---
    const container = document.getElementById('lista-personas');
    document.getElementById('counter-text').innerText = `Mostrando ${dataFiltrada.length} creadores`;

    if (currentView === 'grid') renderGrid(dataFiltrada, container);
    else if (currentView === 'list') renderList(dataFiltrada, container);
    else if (currentView === 'bubbles') renderBubbles(dataFiltrada, container);
    else if (currentView === 'wheel') renderWheel(dataFiltrada, container);
    else if (currentView === 'treemap') renderTreemap(dataFiltrada, container);
}

// 2. RENDER GRID (Tarjetas)
function renderGrid(data, container) {
    container.className = "row g-3";
    container.innerHTML = data.map(p => `
        <div class="col-md-6 col-xl-4">
            <div class="card h-100 border-0 shadow-sm creator-card">
                <div class="card-body">
                    <div class="d-flex align-items-center mb-3">
                        <div class="avatar-circle me-3">${p.nombre.substring(0,2).toUpperCase()}</div>
                        <div>
                            <h6 class="mb-0 fw-bold">${p.nombre}</h6>
                            <small class="text-muted">${p.canal || 'Independent'}</small>
                        </div>
                    </div>
                    <p class="small mb-1">📍 ${p.pais}</p>
                    <p class="small mb-2">🏷️ ${p.categoria}</p>
                    <span class="badge bg-light text-dark border"># ${p.perfil}</span>
                </div>
            </div>
        </div>
    `).join('');
}

// 3. RENDER LIST (Tabla estilo DataTable)
function renderList(data, container) {
    container.className = "col-12";
    let tablaHTML = `
        <div class="table-responsive bg-white rounded shadow-sm">
            <table class="table mb-0 align-middle custom-list-table">
                <thead>
                    <tr>
                        <th scope="col" class="py-3 px-4" style="background-color: #002F6C; color: #ffffff; border: none; border-top-left-radius: 8px;">Nombre ↕</th>
                        <th scope="col" class="py-3 px-4" style="background-color: #002F6C; color: #ffffff; border: none;">Canal ↕</th>
                        <th scope="col" class="py-3 px-4" style="background-color: #002F6C; color: #ffffff; border: none;">País ↕</th>
                        <th scope="col" class="py-3 px-4" style="background-color: #002F6C; color: #ffffff; border: none;">Categoría ↕</th>
                        <th scope="col" class="py-3 px-4" style="background-color: #002F6C; color: #ffffff; border: none; border-top-right-radius: 8px;">Grupo ↕</th>
                    </tr>
                </thead>
                <tbody>
    `;
    tablaHTML += data.map(p => `
        <tr>
            <td class="py-3 px-4 fw-bold text-dark">${p.nombre}</td>
            <td class="py-3 px-4">${p.canal || '-'}</td>
            <td class="py-3 px-4">${p.pais || '-'}</td>
            <td class="py-3 px-4">${p.categoria || '-'}</td>
            <td class="py-3 px-4">${p.perfil || '-'}</td>
        </tr>
    `).join('');
    tablaHTML += `</tbody></table></div>`;
    container.innerHTML = tablaHTML;
}

// 4. RENDER BUBBLES (D3.js)
function renderBubbles(data, container) {
    container.className = "col-12";
    container.innerHTML = '<div id="canvas-contenedor" class="shadow-sm border"></div>';
    
    const conteoPorCategoria = {};
    data.forEach(p => {
        const cat = p.categoria || 'Sin categoría';
        conteoPorCategoria[cat] = (conteoPorCategoria[cat] || 0) + 1;
    });
    
    const fuenteDatos = Object.keys(conteoPorCategoria).map((cat, index) => ({
        id: 'cat-' + index,
        etiqueta: cat.length > 12 ? cat.substring(0, 10) + '...' : cat,
        valor: conteoPorCategoria[cat]
    }));

    if (fuenteDatos.length === 0) {
        document.getElementById('canvas-contenedor').innerHTML = '<p class="text-center mt-5 text-muted">No hay datos para mostrar</p>';
        return;
    }

    const canvasContenedor = document.getElementById('canvas-contenedor');
    const ancho = canvasContenedor.clientWidth || 800;
    const alto = 600;
    let nodoSeleccionado = null; 

    if (simulacionActual) simulacionActual.stop();

    const svg = d3.select("#canvas-contenedor")
        .append("svg")
        .attr("viewBox", `0 0 ${ancho} ${alto}`) 
        .attr("width", "100%") 
        .attr("height", "100%")
        .on("click", reiniciarVista);

    svg.append("rect")
        .attr("class", "fondo-lienzo")
        .attr("width", ancho)
        .attr("height", alto)
        .attr("fill", "#ffffff"); 

    const capaInteractiva = svg.append("g");

    const manejadorZoom = d3.zoom()
        .scaleExtent([0.5, 4]) 
        .on("zoom", (evento) => capaInteractiva.attr("transform", evento.transform));

    svg.call(manejadorZoom);

    const maxValor = d3.max(fuenteDatos, d => d.valor) || 1;
    const escalaRadio = d3.scaleSqrt().domain([0, maxValor]).range([35, 120]); 
    const nodosDatos = fuenteDatos.map(d => ({ ...d, radio: escalaRadio(d.valor) }));

    const simulacion = d3.forceSimulation(nodosDatos)
        .force("centroX", d3.forceX(ancho / 2).strength(0.08))
        .force("centroY", d3.forceY(alto / 2).strength(0.08))
        .force("colision", d3.forceCollide().radius(d => d.radio + 2).iterations(5)); 
    
    simulacionActual = simulacion;

    const nodosDOM = capaInteractiva.append("g")
        .selectAll("g")
        .data(nodosDatos)
        .join("g")
        .on("click", manejarClicNodo); 

    nodosDOM.append("circle")
        .attr("class", "nodo-burbuja")
        .attr("r", 0)
        .attr("fill", "#99ACC4") 
        .attr("stroke", "#002F6C") 
        .attr("stroke-width", 3)
        .transition().duration(1000).delay((d, i) => i * 100).ease(d3.easeElastic)
        .attr("r", d => d.radio);

    nodosDOM.append("text")
        .attr("class", "nodo-valor")
        .attr("text-anchor", "middle")
        .attr("dy", "-0.2em")
        .style("opacity", 0)
        .text(d => d.valor)
        .transition().duration(800).delay((d, i) => (i * 100) + 400)
        .style("opacity", 1);

    nodosDOM.append("text")
        .attr("class", "nodo-etiqueta")
        .attr("text-anchor", "middle")
        .attr("dy", "1.2em")
        .style("opacity", 0)
        .text(d => d.etiqueta)
        .transition().duration(800).delay((d, i) => (i * 100) + 500)
        .style("opacity", 1);

    simulacion.on("tick", () => nodosDOM.attr("transform", d => `translate(${d.x},${d.y})`));

    function manejarClicNodo(evento, datosNodo) {
        evento.stopPropagation(); 
        if (nodoSeleccionado === datosNodo) {
            reiniciarVista();
            return;
        }
        nodoSeleccionado = datosNodo;

        nodosDOM.filter(n => n !== datosNodo)
            .style("pointer-events", "none")
            .selectAll("circle").transition().duration(400).attr("r", 0);
            
        nodosDOM.filter(n => n !== datosNodo)
            .selectAll("text").transition().duration(300).style("opacity", 0);

        nodosDOM.filter(n => n === datosNodo)
            .style("pointer-events", "all")
            .selectAll("circle").transition().duration(400).attr("r", d => d.radio);
            
        nodosDOM.filter(n => n === datosNodo)
            .selectAll("text").transition().duration(400).style("opacity", 1);

        const destX = ancho / 2 - datosNodo.x;
        const destY = alto / 2 - datosNodo.y;
        svg.transition().duration(750).call(manejadorZoom.transform, d3.zoomIdentity.translate(destX, destY));
    }

    function reiniciarVista() {
        nodoSeleccionado = null;
        nodosDOM.style("pointer-events", "all");

        nodosDOM.selectAll("circle")
            .transition().duration(1000).delay((d, i) => i * 40).ease(d3.easeElastic)
            .attr("r", d => d.radio);

        nodosDOM.selectAll("text")
            .transition().duration(600).delay((d, i) => (i * 40) + 200)
            .style("opacity", 1);

        svg.transition().duration(750).call(manejadorZoom.transform, d3.zoomIdentity);
    }
}

// 5. RENDER DISCOVERY WHEEL CON TABLA DINÁMICA
function renderWheel(data, container) {
    container.className = "col-12";
    
    container.innerHTML = `
        <div class="text-center mb-4">
            <h2 class="fw-bold mb-1">Rueda del Descubrimiento</h2>
            <p class="text-muted small mb-3">Categorías (interior) → Creadores (exterior) • Haz clic para explorar</p>
            <button id="btn-reset-wheel" class="btn btn-sm btn-dark fw-bold px-4 py-2 rounded-pill mb-2">🌍 Todo el Atlas</button>
        </div>
        <div id="wheel-contenedor" class="d-flex justify-content-center bg-white rounded-top shadow-sm py-4 overflow-hidden border-bottom" style="min-height: 350px;"></div>
        
        <div id="wheel-table-container" class="bg-white rounded-bottom shadow-sm p-4 px-5"></div>
    `;

    const rootData = { name: "ATLAS", children: [] };
    const agrupado = d3.group(data, d => d.categoria || 'Sin Categoría');
    
    for (const [categoria, creadores] of agrupado) {
        rootData.children.push({
            name: categoria,
            children: creadores.map(c => ({ ...c, name: c.nombre, value: 1 }))
        });
    }

    if (rootData.children.length === 0) return;

    const width = 430; 
    const radius = width / 6;
    const color = d3.scaleOrdinal(d3.schemeTableau10);

    const hierarchy = d3.hierarchy(rootData).sum(d => d.value).sort((a, b) => b.value - a.value);
    const root = d3.partition().size([2 * Math.PI, hierarchy.height + 1])(hierarchy);
    root.each(d => d.current = d);

    const arc = d3.arc()
        .startAngle(d => d.x0).endAngle(d => d.x1)
        .padAngle(d => Math.min((d.x1 - d.x0) / 2, 0.005)).padRadius(radius * 1.5)
        .innerRadius(d => d.y0 * radius).outerRadius(d => Math.max(d.y0 * radius, d.y1 * radius - 1));

    const svg = d3.select("#wheel-contenedor").append("svg")
        .attr("viewBox", [-width / 2, -width / 2, width, width])
        .style("font", "9px sans-serif")
        .style("max-width", "100%").style("height", "auto");

    const centerGroup = svg.append("g").attr("text-anchor", "middle");
    centerGroup.append("circle").attr("r", radius * 0.9).attr("fill", "#ffffff").style("filter", "drop-shadow(0px 6px 10px rgba(0,0,0,0.08))");
    
    centerGroup.append("text").attr("y", -10).attr("class", "fw-bold text-muted").style("letter-spacing", "1px").style("font-size", "9px").text("ATLAS");
    const totalText = centerGroup.append("text").attr("y", 15).attr("class", "fw-bolder").style("font-size", "28px").style("fill", "#111").text(data.length); 
    centerGroup.append("text").attr("y", 30).attr("class", "text-muted fw-bold").style("font-size", "9px").text("creators");

    const path = svg.append("g").selectAll("path").data(root.descendants().slice(1)).join("path")
        .attr("fill", d => { while (d.depth > 1) d = d.parent; return color(d.data.name); })
        .attr("fill-opacity", d => arcVisible(d.current) ? (d.children ? 0.9 : 0.6) : 0)
        .attr("pointer-events", d => arcVisible(d.current) ? "auto" : "none")
        .attr("d", d => arc(d.current))
        .style("cursor", "pointer").style("transition", "filter 0.2s")
        .on("mouseover", function() { d3.select(this).style("filter", "brightness(1.1)"); })
        .on("mouseout", function() { d3.select(this).style("filter", "none"); })
        .on("click", clicked);

    const text = svg.append("g").attr("pointer-events", "none").attr("text-anchor", "middle").style("user-select", "none")
        .selectAll("text").data(root.descendants().slice(1)).join("text")
        .attr("dy", "0.35em").attr("fill", "#ffffff").style("font-weight", "600")
        .attr("fill-opacity", d => +labelVisible(d.current)).attr("transform", d => labelTransform(d.current))
        .text(d => {
            const maxLen = d.depth === 1 ? 12 : 8;
            return d.data.name.length > maxLen ? d.data.name.substring(0, maxLen) + '...' : d.data.name;
        });

    const parent = svg.append("circle").datum(root).attr("r", radius).attr("fill", "none").attr("pointer-events", "all").style("cursor", "pointer").on("click", clicked);

    document.getElementById("btn-reset-wheel").addEventListener("click", () => clicked(null, root));

    function actualizarTabla(nodoD3) {
        const contenedorTabla = document.getElementById("wheel-table-container");
        
        const creadores = nodoD3.leaves().map(leaf => leaf.data);
        const titulo = nodoD3.depth === 0 ? "Todos los Creadores" : nodoD3.data.name;
        
        let tablaHTML = `
            <div class="d-flex justify-content-between align-items-end mb-3 border-bottom pb-3">
                <h5 class="fw-bold mb-0 text-dark">${titulo}</h5>
                <span class="text-muted small">${creadores.length} Creadores</span>
            </div>
            <div class="table-responsive">
                <table class="table table-borderless align-middle" style="font-size: 0.9rem;">
                    <thead class="text-muted" style="border-bottom: 1px solid #dee2e6;">
                        <tr>
                            <th class="fw-semibold py-2">Nombre</th>
                            <th class="fw-semibold py-2">Canal</th>
                            <th class="fw-semibold py-2">País</th>
                            <th class="fw-semibold py-2">Categoría</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        tablaHTML += creadores.map(c => `
            <tr style="border-bottom: 1px solid #f8f9fa;">
                <td class="py-3 text-dark fw-medium">${c.nombre || '-'}</td>
                <td class="py-3 text-muted">${c.canal || '-'}</td>
                <td class="py-3 text-muted">${c.pais || '-'}</td>
                <td class="py-3 text-muted">${c.categoria || '-'}</td>
            </tr>
        `).join('');

        tablaHTML += `</tbody></table></div>`;
        contenedorTabla.innerHTML = tablaHTML;
    }

    actualizarTabla(root);

    function clicked(event, p) {
        parent.datum(p.parent || root);
        
        actualizarTabla(p);

        root.each(d => d.target = {
            x0: Math.max(0, Math.min(1, (d.x0 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
            x1: Math.max(0, Math.min(1, (d.x1 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
            y0: Math.max(0, d.y0 - p.depth), y1: Math.max(0, d.y1 - p.depth)
        });

        const t = svg.transition().duration(750).ease(d3.easeCubicInOut);

        path.transition(t).tween("data", d => {
            const i = d3.interpolate(d.current, d.target);
            return t => d.current = i(t);
        })
        .attr("fill-opacity", d => arcVisible(d.target) ? (d.children ? 0.9 : 0.6) : 0)
        .attr("pointer-events", d => arcVisible(d.target) ? "auto" : "none")
        .attrTween("d", d => () => arc(d.current));

        text.transition(t).attr("fill-opacity", d => +labelVisible(d.target)).attrTween("transform", d => () => labelTransform(d.current));
            
        const numeroObjetivo = p === root ? data.length : p.value;
        d3.select(totalText.node()).transition().duration(750).tween("text", function() {
            const i = d3.interpolateRound(parseInt(this.textContent) || 0, numeroObjetivo);
            return function(t) { this.textContent = i(t); };
        });
    }

    function arcVisible(d) { return d.y1 <= 3 && d.y0 >= 1 && d.x1 > d.x0; }
    function labelVisible(d) { return d.y1 <= 3 && d.y0 >= 1 && (d.y1 - d.y0) * (d.x1 - d.x0) > 0.05; }
    function labelTransform(d) {
        const x = (d.x0 + d.x1) / 2 * 180 / Math.PI;
        const y = (d.y0 + d.y1) / 2 * radius;
        return `rotate(${x - 90}) translate(${y},0) rotate(${x < 180 ? 0 : 180})`;
    }
}

// ==========================================
// 6. RENDER TREEMAP (Mapa de Árbol D3.js)
// ==========================================
function renderTreemap(data, container) {
    container.className = "col-12";
    
    // 1. Estructura HTML
    container.innerHTML = `
        <div class="text-center mb-4">
            <h2 class="fw-bold mb-1">Temas por Grupo</h2>
            <p class="text-muted small mb-3">El Tamaño Representa el Número de Creadores • Haz Clic para Explorar</p>
            <div class="d-flex justify-content-start mb-2 px-3">
                <button id="btn-reset-treemap" class="btn btn-sm fw-bold px-4 py-2 rounded" style="background-color: #99ACC4; color: #000; border: none;">Todos los Grupos</button>
            </div>
        </div>
        <div id="treemap-contenedor" class="bg-white rounded-top shadow-sm overflow-hidden px-2 pb-2" style="min-height: 500px;"></div>
        <div id="treemap-table-container" class="bg-white rounded-bottom shadow-sm p-4 px-5 border-top"></div>
    `;

    // 2. Preparar Datos
    const rootData = { name: "Root", children: [] };
    const agrupado = d3.group(data, d => d.perfil || 'General', d => d.categoria || 'Variado');
    
    for (const [perfil, categorias] of agrupado) {
        const hijosPerfil = [];
        for (const [categoria, creadores] of categorias) {
            hijosPerfil.push({ 
                name: categoria, 
                value: creadores.length, 
                creadoresLista: creadores 
            });
        }
        rootData.children.push({ name: perfil, children: hijosPerfil });
    }

    if (rootData.children.length === 0) return;

    // 3. Configuración SVG y Paleta de Colores Personalizada
    const contenedor = document.getElementById("treemap-contenedor");
    const width = contenedor.clientWidth || 900;
    const height = 550;
    
    const coloresPersonalizados = [
        "#002F6C", "#99ACC4", "#005b96", "#6497b1", 
        "#b3cde0", "#2E4053", "#5D6D7E", "#85929E"
    ];
    const color = d3.scaleOrdinal(coloresPersonalizados);

    const svg = d3.select("#treemap-contenedor").append("svg")
        .attr("viewBox", [0, 0, width, height])
        .style("font", "10px sans-serif")
        .style("width", "100%")
        .style("height", "auto");

    const root = d3.hierarchy(rootData).sum(d => d.value).sort((a, b) => b.value - a.value);

    d3.treemap()
        .size([width, height])
        .paddingTop(25).paddingRight(3).paddingInner(3)(root);

    // 4. Dibujar Títulos (con clase para poder ocultarlos)
    svg.selectAll("titles")
        .data(root.descendants().filter(d => d.depth === 1))
        .join("text")
        .attr("class", "grupo-titulo")
        .attr("x", d => d.x0 + 4)
        .attr("y", d => d.y0 + 18)
        .text(d => d.data.name)
        .attr("font-size", "13px")
        .attr("font-weight", "bold")
        .attr("fill", d => color(d.data.name)); 

    // 5. Dibujar Cuadros
    const nodos = svg.selectAll("g")
        .data(root.leaves())
        .join("g")
        .attr("transform", d => `translate(${d.x0},${d.y0})`)
        .style("cursor", "pointer"); 

    nodos.append("rect")
        .attr("width", d => d.x1 - d.x0)
        .attr("height", d => d.y1 - d.y0)
        .attr("fill", d => color(d.parent.data.name)) 
        .style("opacity", 0.85)
        .on("mouseover", function() { if(!d3.select(this.parentNode).classed("zoomed")) d3.select(this).style("opacity", 1); })
        .on("mouseout", function() { if(!d3.select(this.parentNode).classed("zoomed")) d3.select(this).style("opacity", 0.85); });

    nodos.append("text")
        .attr("class", "texto-normal")
        .attr("x", 4).attr("y", 14).style("pointer-events", "none") 
        .text(d => {
            const anchoDisponible = d.x1 - d.x0;
            if (anchoDisponible < 40) return ""; 
            return d.data.name.length > 12 ? d.data.name.substring(0, 10) + '...' : d.data.name;
        })
        .attr("font-size", "11px").attr("font-weight", "bold").attr("fill", "#ffffff");

    nodos.append("text")
        .attr("class", "texto-normal")
        .attr("x", 4).attr("y", 28).style("pointer-events", "none")
        .text(d => (d.x1 - d.x0 > 30 && d.y1 - d.y0 > 30) ? d.data.value : "")
        .attr("font-size", "10px").attr("fill", "#f8f9fa");

    // 6. FUNCIONES DE TABLA DINÁMICA
    function actualizarTablaTreemap(creadoresAMostrar, titulo) {
        const contenedorTabla = document.getElementById("treemap-table-container");
        let tablaHTML = `
            <div class="d-flex justify-content-between align-items-end mb-3 border-bottom pb-3 mt-2">
                <h5 class="fw-bold mb-0 text-dark">${titulo}</h5>
                <span class="text-muted small">${creadoresAMostrar.length} Creadores</span>
            </div>
            <div class="table-responsive">
                <table class="table table-borderless align-middle" style="font-size: 0.9rem;">
                    <thead class="text-dark" style="border-bottom: 1px solid #dee2e6;">
                        <tr>
                            <th class="fw-bold py-2">Nombre</th><th class="fw-bold py-2">Canal</th>
                            <th class="fw-bold py-2">País</th><th class="fw-bold py-2">Categoría</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        tablaHTML += creadoresAMostrar.map(c => `
            <tr style="border-bottom: 1px solid #f8f9fa;">
                <td class="py-3 text-dark">${c.nombre || '-'}</td><td class="py-3 text-muted">${c.canal || '-'}</td>
                <td class="py-3 text-muted">${c.pais || '-'}</td><td class="py-3 text-muted">${c.categoria || '-'}</td>
            </tr>
        `).join('');
        tablaHTML += `</tbody></table></div>`;
        contenedorTabla.innerHTML = tablaHTML;
    }

    actualizarTablaTreemap(data, "Todos los Creadores");

    // 7. LÓGICA DE ANIMACIÓN AL HACER CLIC
    let vistaActualNode = null;

    nodos.on("click", function(event, d) {
        const isZoomed = d3.select(this).classed("zoomed");
        if (isZoomed) return; 

        vistaActualNode = this;
        const t = svg.transition().duration(750).ease(d3.easeCubicOut);

        svg.selectAll(".grupo-titulo").transition(t).style("opacity", 0);

        nodos.filter(function() { return this !== vistaActualNode; })
             .transition(t).style("opacity", 0).style("pointer-events", "none");

        const clickedNode = d3.select(this);
        clickedNode.raise(); 
        clickedNode.classed("zoomed", true);
        clickedNode.transition(t).attr("transform", `translate(0, 0)`);

        clickedNode.select("rect").transition(t)
                   .attr("width", width).attr("height", height).style("opacity", 1);

        clickedNode.selectAll(".texto-normal").transition(t).style("opacity", 0);

        let largeGroup = clickedNode.select(".texto-grande");
        if (largeGroup.empty()) {
            largeGroup = clickedNode.append("g").attr("class", "texto-grande").style("opacity", 0);
            
            largeGroup.append("text")
                      .attr("x", width / 2).attr("y", height / 2 - 10).attr("text-anchor", "middle")
                      .attr("font-size", "64px").attr("font-family", "Inter, sans-serif")
                      .attr("font-weight", "bold").attr("fill", "#ffffff")
                      .text(d.data.name);

            largeGroup.append("text")
                      .attr("x", width / 2).attr("y", height / 2 + 50).attr("text-anchor", "middle")
                      .attr("font-size", "32px").attr("font-family", "Inter, sans-serif")
                      .attr("fill", "#f8f9fa")
                      .text(`${d.data.value} creadores`);
        }
        largeGroup.transition(t).style("opacity", 1);

        actualizarTablaTreemap(d.data.creadoresLista, `Categoría: ${d.data.name}`);
    });

    // 8. BOTÓN PARA REGRESAR A LA VISTA NORMAL
    document.getElementById("btn-reset-treemap").addEventListener("click", () => {
        if (!vistaActualNode) return; 
        
        const t = svg.transition().duration(750).ease(d3.easeCubicOut);

        svg.selectAll(".grupo-titulo").transition(t).style("opacity", 1);

        nodos.classed("zoomed", false).style("pointer-events", "all")
             .transition(t).style("opacity", 1).attr("transform", d => `translate(${d.x0},${d.y0})`);

        nodos.selectAll("rect").transition(t)
             .attr("width", d => d.x1 - d.x0).attr("height", d => d.y1 - d.y0).style("opacity", 0.85);

        nodos.selectAll(".texto-normal").transition(t).style("opacity", 1);
        nodos.selectAll(".texto-grande").transition(t).style("opacity", 0).remove();
        
        vistaActualNode = null;
        actualizarTablaTreemap(data, "Todos los Creadores");
    });
}

// 7. CARGAR FILTROS DINÁMICOS (CONSTRUIDOS DESDE CERO EN EL FRONTEND)
async function cargarFiltros() {
    try {
        const res = await fetch(`${API_URL}/personas`);
        const rawData = await res.json(); 

        // TRADUCTOR: Convertimos las columnas de SQL al formato del Frontend
        allCreators = rawData.map(c => ({
            nombre: c.nombre,
            canal: c.plataforma,      // Traduce 'plataforma' (SQL) a 'canal' (JS)
            categoria: c.tematicas,   // Traduce 'tematicas' (SQL) a 'categoria' (JS)
            perfil: c.funcion,        // Traduce 'funcion' (SQL) a 'perfil' (JS)
            pais: "México",           // País por defecto
            multimedia: c.multimedia
        }));

        const conteos = {
            perfil: {},
            categoria: {},
            pais: {}
        };

        allCreators.forEach(p => {
            if (p.perfil) conteos.perfil[p.perfil] = (conteos.perfil[p.perfil] || 0) + 1;
            if (p.categoria) conteos.categoria[p.categoria] = (conteos.categoria[p.categoria] || 0) + 1;
            if (p.pais) conteos.pais[p.pais] = (conteos.pais[p.pais] || 0) + 1;
        });

        const misTresFiltros = [
            { id: 'perfil', titulo: 'Perfil', icono: '👤', opciones: conteos.perfil },
            { id: 'categoria', titulo: 'Categoría', icono: '🏷️', opciones: conteos.categoria },
            { id: 'pais', titulo: 'País', icono: '📍', opciones: conteos.pais }
        ];

        const container = document.getElementById('filters-container');

        container.innerHTML = misTresFiltros.map(grupo => `
            <div class="filter-group mb-2 border rounded overflow-hidden">
                <div class="filter-group-header p-2 bg-light d-flex justify-content-between align-items-center" style="cursor: pointer;" data-bs-toggle="collapse" data-bs-target="#collapse-${grupo.id}">
                    <span class="small fw-bold text-uppercase">${grupo.icono} ${grupo.titulo}</span>
                    <span class="small">↓</span>
                </div>
                
                <div id="collapse-${grupo.id}" class="collapse show bg-white p-2">
                    ${Object.entries(grupo.opciones)
                        .sort((a, b) => b[1] - a[1])
                        .map(([nombre, count]) => `
                        <div class="form-check small d-flex justify-content-between">
                            <label class="form-check-label text-truncate" style="max-width: 80%;">
                                <input class="form-check-input filter-checkbox" type="checkbox" data-grupo="${grupo.id}" value="${nombre}"> ${nombre}
                            </label>
                            <span class="text-muted">(${count})</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `).join('');

        document.querySelectorAll('.filter-checkbox').forEach(cb => cb.addEventListener('change', () => cargarPersonas()));
        
    } catch (err) { console.error("Error cargando filtros dinámicos:", err); }
}

// EVENT LISTENERS
document.querySelectorAll('#view-controls .btn').forEach(btn => {
    btn.addEventListener('click', function() {
        document.querySelectorAll('#view-controls .btn').forEach(b => b.classList.remove('active', 'btn-dark'));
        document.querySelectorAll('#view-controls .btn').forEach(b => b.classList.add('btn-outline-dark'));
        this.classList.add('active', 'btn-dark');
        this.classList.remove('btn-outline-dark');
        currentView = this.getAttribute('data-view');
        cargarPersonas();
    });
});

document.getElementById('input-busqueda').addEventListener('input', () => cargarPersonas());
document.getElementById('btn-clear-all').addEventListener('click', () => {
    document.querySelectorAll('.filter-checkbox').forEach(cb => cb.checked = false);
    document.getElementById('input-busqueda').value = '';
    cargarPersonas();
});

// INICIAR APLICACIÓN
cargarFiltros().then(() => cargarPersonas());