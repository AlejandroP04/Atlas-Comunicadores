const API_URL = "/api";
let currentView = 'grid';
let simulacionActual = null;
let allCreators = [];

// Almacén global de opciones para los selectores desplegables modernos
const opcionesSelectoresAdmin = {
    adminPlataforma: [],
    adminTematicas: [],
    adminFuncion: [],
    adminMultimedia: [],
    adminTipo: []
};

// Normaliza cada elemento separado por comas y separa palabras si vienen en CamelCase
function capitalizarTexto(texto) {
    if (!texto) return '';
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

// Normaliza nombres propios conservando espacios y separando CamelCase si ocurre
function capitalizarNombre(texto) {
    if (!texto) return '';
    return String(texto)
        .replace(/([a-záéíóúñ])([A-ZÁÉÍÓÚÑ])/g, '$1 $2')
        .trim()
        .replace(/\s+/g, ' ')
        .split(' ')
        .map(palabra => palabra.charAt(0).toUpperCase() + palabra.slice(1).toLowerCase())
        .join(' ');
}

// Genera el badge visual de actividad en redes sociales
function generarBadgeEstado(estado) {
    if (estado === 'Inactivo') {
        return `<span class="badge rounded-pill d-inline-flex align-items-center gap-1" style="background-color: #f3f4f6; color: #4b5563; border: 1px solid #e5e7eb; font-size: 0.72rem; font-weight: 600;">
            <span class="status-dot inactive"></span>Inactivo
        </span>`;
    }
    return `<span class="badge rounded-pill d-inline-flex align-items-center gap-1" style="background-color: #dcfce7; color: #166534; border: 1px solid #bbf7d0; font-size: 0.72rem; font-weight: 600;">
        <span class="status-dot active"></span>Activo
    </span>`;
}

// 1. CARGAR PERSONAS (Filtro Inteligente en el Frontend)
function cargarPersonas() {
    let dataFiltrada = [...allCreators];

    // --- A. Lógica de la Barra de Búsqueda ---
    const inputBusqueda = document.getElementById('input-busqueda').value;

    if (inputBusqueda) {
        const limpiarTexto = (texto) => {
            return (texto || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        };

        const busqueda = limpiarTexto(inputBusqueda);

        dataFiltrada = dataFiltrada.filter(p => 
            limpiarTexto(p.nombre).includes(busqueda) ||
            limpiarTexto(p.categoria).includes(busqueda) ||
            limpiarTexto(p.pais).includes(busqueda) ||
            limpiarTexto(p.perfil).includes(busqueda) ||
            limpiarTexto(p.canal).includes(busqueda) ||
            limpiarTexto(p.activo).includes(busqueda)
        );
    }

    // --- B. Lógica de Filtros por Checkboxes ---
    const checkboxes = document.querySelectorAll('.filter-checkbox:checked');
    const filtrosActivos = {};

    checkboxes.forEach(cb => {
        const grupo = cb.getAttribute('data-grupo'); 
        if (!filtrosActivos[grupo]) filtrosActivos[grupo] = [];
        filtrosActivos[grupo].push(cb.value);
    });

    Object.keys(filtrosActivos).forEach(grupo => {
        const valoresSeleccionados = filtrosActivos[grupo];
        if (valoresSeleccionados.length > 0) {
            dataFiltrada = dataFiltrada.filter(p => {
                const valoresCreador = p[grupo] ? String(p[grupo]).split(',').map(s => s.trim()) : [];
                return valoresSeleccionados.some(seleccionado => valoresCreador.includes(seleccionado));
            });
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

// 2. RENDER GRID (Tarjetas Responsivas con Material Icons a color e indicador de actividad)
function renderGrid(data, container) {
    container.className = "row g-3";
    container.innerHTML = data.map(p => {

        const avatarHtml = p.foto_url 
            ? `<img src="${p.foto_url}" class="avatar-circle me-3 shadow-sm flex-shrink-0" style="width: 48px; height: 48px; border-radius: 50%; object-fit: cover;" alt="Foto de ${p.nombre}">`
            : `<div class="avatar-circle me-3 flex-shrink-0" style="width: 48px; height: 48px; border-radius: 50%; display: flex; align-items: center; justify-content: center;">${p.nombre.substring(0,2).toUpperCase()}</div>`;

        const nombreHtml = p.perfil_url
            ? `<a href="${p.perfil_url}" target="_blank" rel="noopener noreferrer" class="text-dark text-decoration-none text-break" style="transition: color 0.2s;" onmouseover="this.style.color='#005b96'" onmouseout="this.style.color='#212529'">${p.nombre} <span class="material-icons align-middle" style="font-size: 14px; color: #005b96;">open_in_new</span></a>`
            : `<span class="text-break">${p.nombre}</span>`;

        const badgesPerfil = (p.perfil || '')
            .split(',')
            .map(item => item.trim())
            .filter(Boolean)
            .map(item => `<span class="badge bg-light text-dark border text-wrap text-start lh-sm"># ${item}</span>`)
            .join(' ');

        return `
        <div class="col-12 col-sm-6 col-xl-4">
            <div class="card h-100 border-0 shadow-sm creator-card overflow-hidden">
                <div class="card-body d-flex flex-column justify-content-between">
                    <div>
                        <div class="d-flex align-items-start mb-3">
                            ${avatarHtml}
                            <div class="min-w-0 flex-grow-1">
                                <h6 class="mb-0 fw-bold text-break">${nombreHtml}</h6>
                                <small class="text-muted d-block text-break">${p.canal || 'Independiente'}</small>
                                <div class="mt-1">${generarBadgeEstado(p.activo)}</div>
                            </div>
                        </div>
                        <p class="small mb-1 d-flex align-items-start gap-1 text-break">
                            <span class="material-icons flex-shrink-0" style="font-size: 16px; margin-top: 2px; color: #dc3545;">location_on</span>
                            <span>${p.pais}</span>
                        </p>
                        <p class="small mb-3 d-flex align-items-start gap-1 text-break">
                            <span class="material-icons flex-shrink-0" style="font-size: 16px; margin-top: 2px; color: #d97706;">label</span>
                            <span>${p.categoria}</span>
                        </p>
                    </div>
                    <div class="d-flex flex-wrap gap-1 mt-auto">
                        ${badgesPerfil}
                    </div>
                </div>
            </div>
        </div>
        `;
    }).join('');
}

// Generador compartido de tabla con el estilo oficial de Lista
function generarTablaEstiloLista(lista) {
    return `
        <div class="table-responsive bg-white rounded shadow-sm">
            <table class="table mb-0 align-middle custom-list-table">
                <thead>
                    <tr>
                        <th scope="col" class="py-3 px-4" style="background-color: #002F6C; color: #ffffff; border: none; border-top-left-radius: 8px;">Nombre</th>
                        <th scope="col" class="py-3 px-4" style="background-color: #002F6C; color: #ffffff; border: none;">Canal</th>
                        <th scope="col" class="py-3 px-4" style="background-color: #002F6C; color: #ffffff; border: none;">País</th>
                        <th scope="col" class="py-3 px-4" style="background-color: #002F6C; color: #ffffff; border: none;">Categoría</th>
                        <th scope="col" class="py-3 px-4" style="background-color: #002F6C; color: #ffffff; border: none;">Grupo</th>
                        <th scope="col" class="py-3 px-4" style="background-color: #002F6C; color: #ffffff; border: none; border-top-right-radius: 8px;">Estado</th>
                    </tr>
                </thead>
                <tbody>
                    ${lista.map(p => `
                        <tr>
                            <td class="py-3 px-4 fw-bold text-dark">${p.nombre || '-'}</td>
                            <td class="py-3 px-4">${p.canal || '-'}</td>
                            <td class="py-3 px-4">${p.pais || '-'}</td>
                            <td class="py-3 px-4">${p.categoria || '-'}</td>
                            <td class="py-3 px-4">${p.perfil || '-'}</td>
                            <td class="py-3 px-4">${generarBadgeEstado(p.activo)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// 3. RENDER LIST (Tabla)
function renderList(data, container) {
    container.className = "col-12";
    container.innerHTML = generarTablaEstiloLista(data);
}

// 4. RENDER BUBBLES (D3.js) - TEMÁTICA -> CREADORES (Colores de la Rueda)
function renderBubbles(data, container) {
    container.className = "col-12";
    container.innerHTML = `
        <div id="canvas-contenedor" class="shadow-sm border rounded bg-white" style="position: relative; min-height: 600px;">
            <button id="btn-back-bubbles" class="btn btn-sm btn-dark fw-bold position-absolute d-none d-inline-flex align-items-center gap-1" style="top: 15px; left: 15px; z-index: 10;">
                <span class="material-icons" style="font-size: 16px;">arrow_back</span>
                <span>Volver a Categorías</span>
            </button>
        </div>
    `;

    const datosPorCategoria = {};
    data.forEach(p => {
        const cat = p.categoria ? String(p.categoria).split(',')[0].trim() : 'Sin categoría';

        if (!datosPorCategoria[cat]) {
            datosPorCategoria[cat] = { total: 0, creadoresLista: [] };
        }
        datosPorCategoria[cat].total += 1;

        datosPorCategoria[cat].creadoresLista.push({
            nombre: p.nombre || 'Sin nombre',
            perfil_url: p.perfil_url
        });
    });

    const fuenteDatos = Object.keys(datosPorCategoria)
        .map((cat, index) => ({
            id: 'cat-' + index,
            etiqueta: cat.length > 12 ? cat.substring(0, 10) + '...' : cat,
            nombreOriginal: cat,
            valor: datosPorCategoria[cat].total,
            creadores: datosPorCategoria[cat].creadoresLista 
        }))
        .sort((a, b) => b.valor - a.valor);

    if (fuenteDatos.length === 0) {
        document.getElementById('canvas-contenedor').innerHTML = '<p class="text-center mt-5 text-muted">No hay datos para mostrar</p>';
        return;
    }

    const color = d3.scaleOrdinal(d3.schemeTableau10)
        .domain(fuenteDatos.map(d => d.nombreOriginal));

    const canvasContenedor = document.getElementById('canvas-contenedor');
    const ancho = canvasContenedor.clientWidth || 800;
    const alto = 600;
    let nodoSeleccionado = null; 

    if (typeof simulacionActual !== 'undefined' && simulacionActual) simulacionActual.stop();

    const svg = d3.select("#canvas-contenedor").select("svg").empty() 
        ? d3.select("#canvas-contenedor").append("svg").attr("viewBox", `0 0 ${ancho} ${alto}`).attr("width", "100%").attr("height", "100%")
        : d3.select("#canvas-contenedor").select("svg");

    svg.selectAll("*").remove(); 
    svg.append("rect")
        .attr("class", "fondo-lienzo")
        .attr("width", ancho)
        .attr("height", alto)
        .attr("fill", "#ffffff")
        .on("click", reiniciarVista); 

    const capaInteractiva = svg.append("g");
    const manejadorZoom = d3.zoom().scaleExtent([0.5, 4]).on("zoom", (evento) => capaInteractiva.attr("transform", evento.transform));
    svg.call(manejadorZoom);

    const maxValor = d3.max(fuenteDatos, d => d.valor) || 1;
    const escalaRadio = d3.scaleSqrt().domain([0, maxValor]).range([45, 120]); 
    const nodosDatos = fuenteDatos.map(d => ({ ...d, radio: escalaRadio(d.valor) }));

    const simulacion = d3.forceSimulation(nodosDatos)
        .force("centroX", d3.forceX(ancho / 2).strength(0.08))
        .force("centroY", d3.forceY(alto / 2).strength(0.08))
        .force("colision", d3.forceCollide().radius(d => d.radio + 3).iterations(5)); 

    window.simulacionActual = simulacion; 

    const grupoCategorias = capaInteractiva.append("g").attr("class", "grupo-categorias");
    const nodosDOM = grupoCategorias.selectAll("g")
        .data(nodosDatos)
        .join("g")
        .style("cursor", "pointer")
        .on("click", manejarClicNodo); 

    nodosDOM.append("circle")
        .attr("class", "nodo-burbuja")
        .attr("r", 0)
        .attr("fill", d => color(d.nombreOriginal))
        .attr("fill-opacity", 0.9)
        .attr("stroke", "#ffffff")
        .attr("stroke-width", 2.5)
        .transition().duration(1000).delay((d, i) => i * 100).ease(d3.easeElastic)
        .attr("r", d => d.radio);

    nodosDOM.append("text")
        .attr("class", "nodo-valor")
        .attr("text-anchor", "middle")
        .attr("dy", "-0.2em")
        .style("font-weight", "bold")
        .style("font-size", "16px")
        .style("fill", "#ffffff")
        .style("text-shadow", "0px 1px 3px rgba(0,0,0,0.35)")
        .style("opacity", 0)
        .text(d => d.valor)
        .transition().duration(800).delay((d, i) => (i * 100) + 400)
        .style("opacity", 1);

    nodosDOM.append("text")
        .attr("class", "nodo-etiqueta")
        .attr("text-anchor", "middle")
        .attr("dy", "1.4em")
        .style("font-size", "12px")
        .style("fill", "#ffffff")
        .style("font-weight", "600")
        .style("text-shadow", "0px 1px 3px rgba(0,0,0,0.35)")
        .style("opacity", 0)
        .text(d => d.etiqueta)
        .transition().duration(800).delay((d, i) => (i * 100) + 500)
        .style("opacity", 1);

    simulacion.on("tick", () => nodosDOM.attr("transform", d => `translate(${d.x},${d.y})`));

    let nodosCreadoresDOM = null;
    let simulacionCreadores = null;

    function manejarClicNodo(evento, datosNodo) {
        evento.stopPropagation(); 
        if (nodoSeleccionado === datosNodo) return;
        nodoSeleccionado = datosNodo;

        nodosDOM.style("pointer-events", "none").selectAll("circle").transition().duration(400).attr("r", 0);
        nodosDOM.selectAll("text").transition().duration(300).style("opacity", 0);

        document.getElementById('btn-back-bubbles').classList.remove('d-none');
        mostrarCreadores(datosNodo);
    }

    function mostrarCreadores(nodoPadre) {
        capaInteractiva.selectAll(".grupo-creadores").remove();
        if (simulacionCreadores) simulacionCreadores.stop();

        const colorCategoria = color(nodoPadre.nombreOriginal);
        const creadoresData = nodoPadre.creadores;
        const nodosDatosCreadores = creadoresData.map((c, i) => ({
            id: `creador-${i}`,
            nombre: c.nombre.length > 14 ? c.nombre.substring(0, 12) + '...' : c.nombre,
            perfil_url: c.perfil_url,
            radio: 45,
            x: nodoPadre.x, 
            y: nodoPadre.y
        }));

        const grupoCreadores = capaInteractiva.append("g").attr("class", "grupo-creadores");

        nodosCreadoresDOM = grupoCreadores.selectAll("g")
            .data(nodosDatosCreadores)
            .join("g")
            .style("cursor", "pointer")
            .on("click", (e, d) => {
                e.stopPropagation();
                if (d.perfil_url) window.open(d.perfil_url, '_blank');
            });

        nodosCreadoresDOM.append("circle")
            .attr("class", "nodo-burbuja-creador")
            .attr("r", 0)
            .attr("fill", colorCategoria)
            .attr("fill-opacity", 0.65)
            .attr("stroke", colorCategoria)
            .attr("stroke-width", 2.5)
            .transition().duration(800).ease(d3.easeElastic)
            .attr("r", d => d.radio);

        nodosCreadoresDOM.append("text")
            .attr("class", "nodo-iniciales")
            .attr("text-anchor", "middle")
            .attr("dy", "0.35em")
            .style("font-weight", "bold")
            .style("font-size", "15px")
            .style("fill", "#ffffff")
            .style("text-shadow", "0px 1px 3px rgba(0,0,0,0.35)")
            .style("opacity", 0)
            .text(d => d.nombre.substring(0, 2).toUpperCase())
            .transition().duration(800).delay(200)
            .style("opacity", 1);

        nodosCreadoresDOM.append("text")
            .attr("class", "nodo-etiqueta")
            .attr("text-anchor", "middle")
            .attr("dy", d => d.radio + 16)
            .style("font-size", "11px")
            .style("font-weight", "600")
            .style("fill", "#212529")
            .style("opacity", 0)
            .text(d => d.nombre)
            .transition().duration(800).delay(300)
            .style("opacity", 1);

        simulacionCreadores = d3.forceSimulation(nodosDatosCreadores)
            .force("centroX", d3.forceX(ancho / 2).strength(0.08))
            .force("centroY", d3.forceY(alto / 2).strength(0.08))
            .force("colision", d3.forceCollide().radius(d => d.radio + 22).iterations(5))
            .on("tick", () => nodosCreadoresDOM.attr("transform", d => `translate(${d.x},${d.y})`));

        svg.transition().duration(750).call(manejadorZoom.transform, d3.zoomIdentity);
    }

    function reiniciarVista() {
        if (!nodoSeleccionado) return; 
        nodoSeleccionado = null;

        document.getElementById('btn-back-bubbles').classList.add('d-none');

        if (nodosCreadoresDOM) {
            nodosCreadoresDOM.selectAll("circle").transition().duration(300).attr("r", 0);
            nodosCreadoresDOM.selectAll("text").transition().duration(200).style("opacity", 0);
            setTimeout(() => capaInteractiva.selectAll(".grupo-creadores").remove(), 350);
        }
        if (simulacionCreadores) simulacionCreadores.stop();

        nodosDOM.style("pointer-events", "all");
        nodosDOM.selectAll("circle").transition().duration(1000).delay((d, i) => i * 40).ease(d3.easeElastic).attr("r", d => d.radio);
        nodosDOM.selectAll("text").transition().duration(600).delay((d, i) => (i * 40) + 200).style("opacity", 1);

        svg.transition().duration(750).call(manejadorZoom.transform, d3.zoomIdentity);
    }

    document.getElementById('btn-back-bubbles').addEventListener('click', reiniciarVista);
}

// 5. RENDER DISCOVERY WHEEL CON TABLA ESTILO LISTA
function renderWheel(data, container) {
    container.className = "col-12";
    container.innerHTML = `
        <div class="text-center mb-4">
            <h2 class="fw-bold mb-1">Rueda del Descubrimiento</h2>
            <p class="text-muted small mb-3">Categorías (interior) → Creadores (exterior) • Haz clic para explorar</p>
            <button id="btn-reset-wheel" class="btn btn-sm btn-dark fw-bold px-4 py-2 rounded-pill mb-2">Todo el Atlas</button>
        </div>
        <div id="wheel-contenedor" class="d-flex justify-content-center bg-white rounded shadow-sm py-4 overflow-hidden mb-4" style="min-height: 350px;"></div>
        <div id="wheel-table-container"></div>
    `;

    const rootData = { name: "ATLAS", children: [] };
    const agrupado = d3.group(data, d => d.categoria ? String(d.categoria).split(',')[0].trim() : 'Sin categoría');

    for (const [categoria, creadores] of agrupado) {
        rootData.children.push({ name: categoria, children: creadores.map(c => ({ ...c, name: c.nombre, value: 1 })) });
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
        .style("font", "9px sans-serif").style("max-width", "100%").style("height", "auto");

    const centerGroup = svg.append("g").attr("text-anchor", "middle");
    centerGroup.append("circle").attr("r", radius * 0.9).attr("fill", "#ffffff").style("filter", "drop-shadow(0px 6px 10px rgba(0,0,0,0.08))");
    centerGroup.append("text").attr("y", -10).attr("class", "fw-bold text-muted").style("letter-spacing", "1px").style("font-size", "9px").text("ATLAS");
    const totalText = centerGroup.append("text").attr("y", 15).attr("class", "fw-bolder").style("font-size", "28px").style("fill", "#111").text(data.length); 
    centerGroup.append("text").attr("y", 30).attr("class", "text-muted fw-bold").style("font-size", "9px").text("creadores");

    const path = svg.append("g").selectAll("path").data(root.descendants().slice(1)).join("path")
        .attr("fill", d => { while (d.depth > 1) d = d.parent; return color(d.data.name); })
        .attr("fill-opacity", d => arcVisible(d.current) ? (d.children ? 0.9 : 0.6) : 0)
        .attr("pointer-events", d => arcVisible(d.current) ? "auto" : "none")
        .attr("d", d => arc(d.current)).style("cursor", "pointer").style("transition", "filter 0.2s")
        .on("mouseover", function() { d3.select(this).style("filter", "brightness(1.1)"); })
        .on("mouseout", function() { d3.select(this).style("filter", "none"); })
        .on("click", clicked);

    const text = svg.append("g").attr("pointer-events", "none").attr("text-anchor", "middle").style("user-select", "none")
        .selectAll("text").data(root.descendants().slice(1)).join("text")
        .attr("dy", "0.35em").attr("fill", "#ffffff").style("font-weight", "600")
        .attr("fill-opacity", d => +labelVisible(d.current)).attr("transform", d => labelTransform(d.current))
        .text(d => { const maxLen = d.depth === 1 ? 12 : 8; return d.data.name.length > maxLen ? d.data.name.substring(0, maxLen) + '...' : d.data.name; });

    const parent = svg.append("circle").datum(root).attr("r", radius).attr("fill", "none").attr("pointer-events", "all").style("cursor", "pointer").on("click", clicked);

    document.getElementById("btn-reset-wheel").addEventListener("click", () => clicked(null, root));

    function actualizarTabla(nodoD3) {
        const contenedorTabla = document.getElementById("wheel-table-container");
        const creadores = nodoD3.leaves().map(leaf => leaf.data);
        const titulo = nodoD3.depth === 0 ? "Todos los Creadores" : nodoD3.data.name;

        contenedorTabla.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-3">
                <h5 class="fw-bold mb-0 text-dark">${titulo}</h5>
                <span class="text-muted small fw-bold">${creadores.length} Creadores</span>
            </div>
            ${generarTablaEstiloLista(creadores)}
        `;
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
        path.transition(t).tween("data", d => { const i = d3.interpolate(d.current, d.target); return t => d.current = i(t); })
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

// 6. RENDER TREEMAP (Mapa de Árbol D3.js - Con colores de la Rueda y tabla estilo Lista)
function renderTreemap(data, container) {
    container.className = "col-12";
    container.innerHTML = `
        <div class="text-center mb-4">
            <h2 class="fw-bold mb-1">Temas por Grupo</h2>
            <p class="text-muted small mb-3">El Tamaño Representa el Número de Creadores • Haz Clic para Explorar</p>
            <div class="d-flex justify-content-start mb-2 px-3">
                <button id="btn-reset-treemap" class="btn btn-sm fw-bold px-4 py-2 rounded" style="background-color: #99ACC4; color: #000; border: none;">Todos los Grupos</button>
            </div>
        </div>
        <div id="treemap-contenedor" class="bg-white rounded shadow-sm overflow-hidden px-2 pb-2 mb-4" style="min-height: 500px;"></div>
        <div id="treemap-table-container"></div>
    `;

    const rootData = { name: "Root", children: [] };
    const agrupado = d3.group(
        data,
        d => d.perfil ? String(d.perfil).split(',')[0].trim() : 'General',
        d => d.categoria ? String(d.categoria).split(',')[0].trim() : 'Variado'
    );

    for (const [perfil, categorias] of agrupado) {
        const hijosPerfil = [];
        for (const [categoria, creadores] of categorias) {
            hijosPerfil.push({ name: categoria, value: creadores.length, creadoresLista: creadores });
        }
        rootData.children.push({ name: perfil, children: hijosPerfil });
    }

    if (rootData.children.length === 0) return;

    const contenedor = document.getElementById("treemap-contenedor");
    const width = contenedor.clientWidth || 900;
    const height = 550;
    const color = d3.scaleOrdinal(d3.schemeTableau10);

    const svg = d3.select("#treemap-contenedor").append("svg")
        .attr("viewBox", [0, 0, width, height])
        .style("font", "10px sans-serif")
        .style("width", "100%")
        .style("height", "auto");

    const root = d3.hierarchy(rootData)
        .sum(d => d.value)
        .sort((a, b) => b.value - a.value);

    d3.treemap()
        .size([width, height])
        .paddingTop(25)
        .paddingRight(3)
        .paddingInner(3)(root);

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

    const nodos = svg.selectAll("g")
        .data(root.leaves())
        .join("g")
        .attr("transform", d => `translate(${d.x0},${d.y0})`)
        .style("cursor", "pointer"); 

    nodos.append("rect")
        .attr("width", d => d.x1 - d.x0)
        .attr("height", d => d.y1 - d.y0)
        .attr("fill", d => color(d.parent.data.name)) 
        .style("opacity", 0.9)
        .on("mouseover", function() { if(!d3.select(this.parentNode).classed("zoomed")) d3.select(this).style("opacity", 1); })
        .on("mouseout", function() { if(!d3.select(this.parentNode).classed("zoomed")) d3.select(this).style("opacity", 0.9); });

    nodos.append("text")
        .attr("class", "texto-normal")
        .attr("x", 4)
        .attr("y", 14)
        .style("pointer-events", "none")
        .style("text-shadow", "0px 1px 2px rgba(0,0,0,0.4)")
        .text(d => {
            const anchoDisponible = d.x1 - d.x0;
            if (anchoDisponible < 40) return "";
            return d.data.name.length > 12 ? d.data.name.substring(0, 10) + '...' : d.data.name;
        })
        .attr("font-size", "11px")
        .attr("font-weight", "bold")
        .attr("fill", "#ffffff");

    nodos.append("text")
        .attr("class", "texto-normal")
        .attr("x", 4)
        .attr("y", 28)
        .style("pointer-events", "none")
        .style("text-shadow", "0px 1px 2px rgba(0,0,0,0.4)")
        .text(d => (d.x1 - d.x0 > 30 && d.y1 - d.y0 > 30) ? d.data.value : "")
        .attr("font-size", "10px")
        .attr("fill", "#f8f9fa");

    function actualizarTablaTreemap(creadoresAMostrar, titulo) {
        const contenedorTabla = document.getElementById("treemap-table-container");

        contenedorTabla.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-3 mt-2">
                <h5 class="fw-bold mb-0 text-dark">${titulo}</h5>
                <span class="text-muted small fw-bold">${creadoresAMostrar.length} Creadores</span>
            </div>
            ${generarTablaEstiloLista(creadoresAMostrar)}
        `;
    }

    actualizarTablaTreemap(data, "Todos los Creadores");
    let vistaActualNode = null;

    nodos.on("click", function(event, d) {
        const isZoomed = d3.select(this).classed("zoomed");
        if (isZoomed) return; 

        vistaActualNode = this;
        const t = svg.transition().duration(750).ease(d3.easeCubicOut);
        svg.selectAll(".grupo-titulo").transition(t).style("opacity", 0);
        nodos.filter(function() { return this !== vistaActualNode; }).transition(t).style("opacity", 0).style("pointer-events", "none");

        const clickedNode = d3.select(this);
        clickedNode.raise();
        clickedNode.classed("zoomed", true);
        clickedNode.transition(t).attr("transform", `translate(0, 0)`);
        clickedNode.select("rect").transition(t).attr("width", width).attr("height", height).style("opacity", 1);
        clickedNode.selectAll(".texto-normal").transition(t).style("opacity", 0);

        let largeGroup = clickedNode.select(".texto-grande");
        if (largeGroup.empty()) {
            largeGroup = clickedNode.append("g").attr("class", "texto-grande").style("opacity", 0);
            largeGroup.append("text")
                .attr("x", width / 2).attr("y", height / 2 - 10)
                .attr("text-anchor", "middle").attr("font-size", "64px")
                .attr("font-family", "Inter, sans-serif").attr("font-weight", "bold")
                .attr("fill", "#ffffff").style("text-shadow", "0px 2px 6px rgba(0,0,0,0.35)")
                .text(d.data.name);
            largeGroup.append("text")
                .attr("x", width / 2).attr("y", height / 2 + 50)
                .attr("text-anchor", "middle").attr("font-size", "32px")
                .attr("font-family", "Inter, sans-serif").attr("fill", "#f8f9fa")
                .style("text-shadow", "0px 2px 6px rgba(0,0,0,0.35)")
                .text(`${d.data.value} creadores`);
        }
        largeGroup.transition(t).style("opacity", 1);
        actualizarTablaTreemap(d.data.creadoresLista, `Categoría: ${d.data.name}`);
    });

    document.getElementById("btn-reset-treemap").addEventListener("click", () => {
        if (!vistaActualNode) return; 
        const t = svg.transition().duration(750).ease(d3.easeCubicOut);
        svg.selectAll(".grupo-titulo").transition(t).style("opacity", 1);
        nodos.classed("zoomed", false).style("pointer-events", "all").transition(t).style("opacity", 1).attr("transform", d => `translate(${d.x0},${d.y0})`);
        nodos.selectAll("rect").transition(t).attr("width", d => d.x1 - d.x0).attr("height", d => d.y1 - d.y0).style("opacity", 0.9);
        nodos.selectAll(".texto-normal").transition(t).style("opacity", 1);
        nodos.selectAll(".texto-grande").transition(t).style("opacity", 0).remove();
        vistaActualNode = null;
        actualizarTablaTreemap(data, "Todos los Creadores");
    });
}

// 7. CARGAR FILTROS DINÁMICOS Y OPCIONES PARA SELECTORES MODERNOS
async function cargarFiltros() {
    try {
        const res = await fetch(`${API_URL}/personas`);
        const rawData = await res.json(); 

        allCreators = rawData.map(c => ({
            nombre: capitalizarNombre(c.nombre),
            canal: capitalizarTexto(c.plataforma),
            categoria: capitalizarTexto(c.tematicas),
            perfil: capitalizarTexto(c.funcion),
            pais: "México",
            multimedia: capitalizarTexto(c.multimedia),
            foto_url: c.foto_url || null,        
            perfil_url: c.perfil_url || null,    
            tipo: capitalizarTexto(c.tipo) || 'Individual',
            activo: (c.activo === 0 || c.activo === false) ? 'Inactivo' : 'Activo'
        }));

        const conteos = { perfil: {}, categoria: {}, pais: {}, canal: {}, multimedia: {}, tipo: {}, activo: {} };

        const separarComas = (texto) => {
            if (!texto) return [];
            return String(texto).split(',').map(item => item.trim()).filter(item => item !== '');
        };

        allCreators.forEach(p => {
            separarComas(p.perfil).forEach(item => conteos.perfil[item] = (conteos.perfil[item] || 0) + 1);
            separarComas(p.categoria).forEach(item => conteos.categoria[item] = (conteos.categoria[item] || 0) + 1);
            separarComas(p.pais).forEach(item => conteos.pais[item] = (conteos.pais[item] || 0) + 1);
            separarComas(p.canal).forEach(item => conteos.canal[item] = (conteos.canal[item] || 0) + 1);
            separarComas(p.multimedia).forEach(item => conteos.multimedia[item] = (conteos.multimedia[item] || 0) + 1);
            separarComas(p.tipo).forEach(item => conteos.tipo[item] = (conteos.tipo[item] || 0) + 1);
            separarComas(p.activo).forEach(item => conteos.activo[item] = (conteos.activo[item] || 0) + 1);
        });

        // Guardar listas ordenadas alfabéticamente para los selectores modernos del Admin
        opcionesSelectoresAdmin.adminPlataforma = Object.keys(conteos.canal).sort((a, b) => a.localeCompare(b, 'es'));
        opcionesSelectoresAdmin.adminTematicas = Object.keys(conteos.categoria).sort((a, b) => a.localeCompare(b, 'es'));
        opcionesSelectoresAdmin.adminFuncion = Object.keys(conteos.perfil).sort((a, b) => a.localeCompare(b, 'es'));
        opcionesSelectoresAdmin.adminMultimedia = Object.keys(conteos.multimedia).sort((a, b) => a.localeCompare(b, 'es'));
        opcionesSelectoresAdmin.adminTipo = Object.keys(conteos.tipo).sort((a, b) => a.localeCompare(b, 'es'));

        // Filtros laterales usando Google Material Icons con colores distintivos
        const misFiltros = [
            { id: 'activo', titulo: 'Estado', icono: 'sensors', color: '#16a34a', opciones: conteos.activo },
            { id: 'perfil', titulo: 'Perfil', icono: 'person', color: '#002F6C', opciones: conteos.perfil },
            { id: 'categoria', titulo: 'Categoría', icono: 'label', color: '#d97706', opciones: conteos.categoria },
            { id: 'canal', titulo: 'Plataforma', icono: 'devices', color: '#6f42c1', opciones: conteos.canal },
            { id: 'pais', titulo: 'País', icono: 'location_on', color: '#dc3545', opciones: conteos.pais }
        ];

        const container = document.getElementById('filters-container');
        container.innerHTML = misFiltros.map(grupo => `
            <div class="filter-group mb-2 border rounded overflow-hidden">
                <div class="filter-group-header p-2 bg-light d-flex justify-content-between align-items-center" style="cursor: pointer;" data-bs-toggle="collapse" data-bs-target="#collapse-${grupo.id}">
                    <span class="small fw-bold text-uppercase d-flex align-items-center gap-1">
                        <span class="material-icons" style="font-size: 18px; color: ${grupo.color};">${grupo.icono}</span>
                        <span>${grupo.titulo}</span>
                    </span>
                    <span class="material-icons text-muted" style="font-size: 18px;">expand_more</span>
                </div>
                <div id="collapse-${grupo.id}" class="collapse show bg-white p-2">
                    ${Object.entries(grupo.opciones).sort((a, b) => b[1] - a[1]).map(([nombre, count]) => `
                        <label class="d-flex justify-content-between align-items-center w-100 py-1 mb-1 gap-2" style="cursor: pointer; border-bottom: 1px solid #f8f9fa;">
                            <div class="d-flex align-items-center min-w-0 flex-grow-1">
                                <input class="filter-checkbox me-2 flex-shrink-0" type="checkbox" data-grupo="${grupo.id}" value="${nombre}" style="width: 16px; height: 16px; cursor: pointer; display: block !important; opacity: 1 !important; appearance: auto !important;">
                                <span class="small text-dark text-truncate">${nombre}</span>
                            </div>
                            <span class="text-muted small flex-shrink-0">(${count})</span>
                        </label>
                    `).join('')}
                </div>
            </div>
        `).join('');

        document.querySelectorAll('.filter-checkbox').forEach(cb => cb.addEventListener('change', () => cargarPersonas()));

    } catch (err) { console.error("Error cargando filtros dinámicos:", err); }
}

// EVENT LISTENERS DE VISTA Y BÚSQUEDA
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

// ==========================================
// CONTROLADOR DE LISTAS DESPLEGABLES MODERNAS
// ==========================================
function inicializarSelectoresModernos() {
    const wrappers = document.querySelectorAll('.modern-select-wrapper');

    const cerrarTodos = (excepcion = null) => {
        wrappers.forEach(w => {
            if (w !== excepcion) w.classList.remove('open');
        });
    };

    const normalizar = (str) => String(str || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    wrappers.forEach(wrapper => {
        const selectId = wrapper.getAttribute('data-select-id');
        const esMultiple = wrapper.getAttribute('data-multi') === 'true';
        const input = wrapper.querySelector('.modern-select-input');
        const arrow = wrapper.querySelector('.modern-select-arrow');
        const menu = wrapper.querySelector('.modern-dropdown-menu');

        const renderOpciones = (terminoFiltro = '') => {
            const opciones = opcionesSelectoresAdmin[selectId] || [];
            const valoresActuales = input.value
                .split(',')
                .map(v => v.trim())
                .filter(Boolean);

            const filtroLimpio = normalizar(terminoFiltro.trim());
            const filtradas = filtroLimpio
                ? opciones.filter(opt => normalizar(opt).includes(filtroLimpio))
                : opciones;

            let html = `
                <div class="modern-dropdown-header">
                    <span class="material-icons" style="font-size: 14px;">search</span>
                    <span>${esMultiple ? 'Elige una o varias opciones' : 'Elige una opción'}</span>
                </div>
            `;

            if (filtradas.length > 0) {
                html += filtradas.map(opt => {
                    const estaSeleccionada = valoresActuales.some(v => normalizar(v) === normalizar(opt));
                    return `
                        <div class="modern-dropdown-item ${estaSeleccionada ? 'selected' : ''}" data-value="${opt}">
                            <span>${opt}</span>
                            ${estaSeleccionada ? '<span class="material-icons" style="font-size: 18px; color: #002F6C;">check</span>' : ''}
                        </div>
                    `;
                }).join('');
            } else if (!filtroLimpio) {
                html += `<div class="modern-dropdown-empty">No hay opciones registradas aún</div>`;
            }

            const nuevoValorFormateado = capitalizarTexto(terminoFiltro);
            const yaExisteExacta = opciones.some(opt => normalizar(opt) === normalizar(nuevoValorFormateado));

            if (nuevoValorFormateado && !yaExisteExacta) {
                html += `
                    <div class="modern-dropdown-create" data-create-value="${nuevoValorFormateado}">
                        <span class="material-icons" style="font-size: 18px;">add_circle_outline</span>
                        <span>Agregar "${nuevoValorFormateado}"</span>
                    </div>
                `;
            }

            menu.innerHTML = html;

            menu.querySelectorAll('.modern-dropdown-item').forEach(item => {
                item.addEventListener('mousedown', (e) => {
                    e.preventDefault();
                    const valorElegido = item.getAttribute('data-value');

                    if (!esMultiple) {
                        input.value = valorElegido;
                        wrapper.classList.remove('open');
                        return;
                    }

                    let partes = input.value.split(',').map(p => p.trim());
                    if (terminoFiltro.trim() !== '') {
                        partes.pop();
                    }
                    partes = partes.filter(Boolean);

                    const indice = partes.findIndex(p => normalizar(p) === normalizar(valorElegido));
                    if (indice > -1) {
                        partes.splice(indice, 1);
                    } else {
                        partes.push(valorElegido);
                    }

                    input.value = partes.join(', ');
                    renderOpciones('');
                });
            });

            const btnCrear = menu.querySelector('.modern-dropdown-create');
            if (btnCrear) {
                btnCrear.addEventListener('mousedown', (e) => {
                    e.preventDefault();
                    const nuevoValor = btnCrear.getAttribute('data-create-value');

                    if (!opciones.includes(nuevoValor)) {
                        opciones.push(nuevoValor);
                        opciones.sort((a, b) => a.localeCompare(b, 'es'));
                    }

                    if (!esMultiple) {
                        input.value = nuevoValor;
                        wrapper.classList.remove('open');
                        return;
                    }

                    let partes = input.value.split(',').map(p => p.trim());
                    partes.pop();
                    partes = partes.filter(Boolean);
                    if (!partes.some(p => normalizar(p) === normalizar(nuevoValor))) {
                        partes.push(nuevoValor);
                    }
                    input.value = partes.join(', ');
                    renderOpciones('');
                });
            }
        };

        input.addEventListener('focus', () => {
            cerrarTodos(wrapper);
            renderOpciones('');
            wrapper.classList.add('open');
        });

        input.addEventListener('input', () => {
            const partes = input.value.split(',');
            const ultimoTermino = esMultiple ? partes[partes.length - 1] : input.value;
            renderOpciones(ultimoTermino);
            wrapper.classList.add('open');
        });

        arrow.addEventListener('click', (e) => {
            e.stopPropagation();
            const estabaAbierto = wrapper.classList.contains('open');
            cerrarTodos();
            if (!estabaAbierto) {
                renderOpciones('');
                wrapper.classList.add('open');
                input.focus();
            }
        });
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.modern-select-wrapper')) {
            cerrarTodos();
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') cerrarTodos();
    });
}

// ==========================================
// FUNCIONALIDAD DEL PANEL ADMIN (LOGIN + DATA ENTRY)
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const loginSection = document.getElementById('adminLoginSection');
    const formSection = document.getElementById('adminFormSection');
    const formLogin = document.getElementById('formLoginAdmin');
    const loginError = document.getElementById('loginError');
    const btnLogout = document.getElementById('btnLogoutAdmin');
    const formAdmin = document.getElementById('formAgregarCreador');

    inicializarSelectoresModernos();

    function actualizarEstadoSesionAdmin() {
        const user = sessionStorage.getItem('atlas_admin_user');
        const pass = sessionStorage.getItem('atlas_admin_pass');
        if (user && pass) {
            loginSection.classList.add('d-none');
            formSection.classList.remove('d-none');
        } else {
            formSection.classList.add('d-none');
            loginSection.classList.remove('d-none');
        }
    }

    actualizarEstadoSesionAdmin();

    if (formLogin) {
        formLogin.addEventListener('submit', async (e) => {
            e.preventDefault();
            loginError.classList.add('d-none');

            const user = document.getElementById('loginUser').value.trim();
            const pass = document.getElementById('loginPass').value;

            try {
                const response = await fetch(`${API_URL}/admin/login`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-admin-user': user,
                        'x-admin-password': pass
                    }
                });

                if (response.ok) {
                    sessionStorage.setItem('atlas_admin_user', user);
                    sessionStorage.setItem('atlas_admin_pass', pass);
                    formLogin.reset();
                    actualizarEstadoSesionAdmin();
                } else {
                    loginError.classList.remove('d-none');
                }
            } catch (error) {
                console.error('Error al validar acceso:', error);
                alert('No se pudo conectar con el servidor para validar el acceso.');
            }
        });
    }

    if (btnLogout) {
        btnLogout.addEventListener('click', () => {
            sessionStorage.removeItem('atlas_admin_user');
            sessionStorage.removeItem('atlas_admin_pass');
            actualizarEstadoSesionAdmin();
        });
    }

    document.querySelectorAll('.val-letras').forEach(input => {
        input.addEventListener('input', function() {
            this.value = this.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s,]/g, '');
        });
    });

    if (formAdmin) {
        formAdmin.addEventListener('submit', async (e) => {
            e.preventDefault(); 

            const fotoValue = document.getElementById('adminFotoUrl').value.trim();
            const perfilValue = document.getElementById('adminPerfilUrl').value.trim();
            const tipoValue = document.getElementById('adminTipo').value.trim();
            const activoSeleccionado = document.querySelector('input[name="adminActivo"]:checked');

            const nuevoCreador = {
                nombre: capitalizarNombre(document.getElementById('adminNombre').value),
                plataforma: capitalizarTexto(document.getElementById('adminPlataforma').value),
                tematicas: capitalizarTexto(document.getElementById('adminTematicas').value),
                funcion: capitalizarTexto(document.getElementById('adminFuncion').value),
                multimedia: capitalizarTexto(document.getElementById('adminMultimedia').value),
                foto_url: fotoValue || null,        
                perfil_url: perfilValue || null,    
                tipo: capitalizarTexto(tipoValue) || 'Individual',
                activo: activoSeleccionado ? Number(activoSeleccionado.value) : 1
            };

            try {
                const response = await fetch(`${API_URL}/creadores`, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'x-admin-user': sessionStorage.getItem('atlas_admin_user') || '',
                        'x-admin-password': sessionStorage.getItem('atlas_admin_pass') || ''
                    },
                    body: JSON.stringify(nuevoCreador)
                });

                if (response.ok) {
                    alert('¡Registro guardado con éxito!');
                    formAdmin.reset();
                    const modalInstancia = bootstrap.Modal.getInstance(document.getElementById('modalAdmin'));
                    modalInstancia.hide();
                    window.location.reload(); 
                } else if (response.status === 401) {
                    sessionStorage.removeItem('atlas_admin_user');
                    sessionStorage.removeItem('atlas_admin_pass');
                    actualizarEstadoSesionAdmin();
                    alert('Tu sesión expiró o las credenciales no son válidas.');
                } else {
                    const errorData = await response.json();
                    alert(`Error al guardar: ${errorData.error}`);
                }
            } catch (error) {
                console.error('Error en la petición POST:', error);
                alert('No se pudo conectar con el servidor.');
            }
        });
    }
});

// INICIAR APLICACIÓN
cargarFiltros().then(() => cargarPersonas());