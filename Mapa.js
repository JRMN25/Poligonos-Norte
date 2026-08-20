// =========================================================================
// 1. DEFINICIÓN DE MAPAS BASE (OSM Y CARTODB)
// =========================================================================
var mapaCalles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap'
});

var mapaLimpio = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; CARTO'
});

var mapaOscuro = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; CARTO'
});

// =========================================================================
// 2. INICIALIZACIÓN DEL MAPA
// =========================================================================
let map = L.map('map', {
    center: [28.6353, -106.0889],
    zoom: 6,
    layers: [mapaCalles] // Capa base por defecto
});

// =========================================================================
// 3. CONTROL DE CAPAS BASE
// =========================================================================
var mapasBase = {
    "Detalle de Calles (OSM)": mapaCalles,
    "Vista Polígonos": mapaLimpio,
    "Fondo Oscuro (Dark Mode)": mapaOscuro
};
L.control.layers(mapasBase, null, {position: 'topright'}).addTo(map);

// =========================================================================
// 4. CONFIGURACIÓN DE COLORES POR DÍA (RTM STANDARD)
// =========================================================================
function getColor(dia) {
    switch (dia) {
        case 'LUN': return '#4F2170'; 
        case 'MAR': return '#287819'; 
        case 'MIE': return '#2D6EAA'; 
        case 'JUE': return '#E6AF23'; 
        case 'VIE': return '#A52323'; 
        case 'SAB': return '#623E23'; 
        default:    return '#757575';
    }
}

// =========================================================================
// 5. CONFIGURACIÓN DE VENTANAS EMERGENTES (POPUPS)
// =========================================================================
function popup(feature, layer) {
    if (feature.properties && feature.properties.Ruta){
        let rutaEspejo = feature.properties.RUTA_ESPEJO || "No asignada";
        let diaNormal = feature.properties.Dia || "N/A";
        let diaEspejo = feature.properties.Dia_espejo || "No asignado"; 

        layer.bindPopup(
            "<div style='font-family: Arial, sans-serif; font-size: 14px; min-width: 180px;'> " +
            "<strong>Ruta: </strong>" + feature.properties.Ruta + 
            "<br/><strong>Día: </strong>" + diaNormal +
            "<hr style='margin: 5px 0; border: 0; border-top: 1px solid #ccc;'>" +
            "<strong>Ruta Espejo: </strong>" + rutaEspejo +
            "<br/><strong>Día Espejo: </strong>" + diaEspejo + 
            "<hr style='margin: 5px 0; border: 0; border-top: 1px solid #ccc;'>" +
            "<strong>Sitio: </strong>" + (feature.properties.Sitio || "N/A") +
            "<br/><strong>Grupo: </strong>" + (feature.properties.Grupo || "N/A") +
            "<br/><strong>Portafolio: </strong>" + (feature.properties.Portafolio || "N/A") +
            "</div>"
        );
    }
}

// =========================================================================
// 6. CAPA GEOJSON INICIAL (Montada desde el arranque para manipulación dinámica)
// =========================================================================
var capaPoligonos = L.geoJSON(poligonos, {
    onEachFeature: popup,
    style: function(feature) {
        return { 
            color: "white", 
            weight: 1.5, 
            fillOpacity: 0.6,
            fillColor: getColor(feature.properties.Dia) 
        };
    }
}).addTo(map);

// =========================================================================
// 7. ICONO PERSONALIZADO PARA EL BUSCADOR
// =========================================================================
var redIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

var marcadorBusqueda = null;

// =========================================================================
// 9. LÓGICA DEL BUSCADOR DE COORDENADAS (Regex automático)
// =========================================================================
document.getElementById('btnBuscar').addEventListener('click', function() {
    let inputVal = document.getElementById('coordenadas').value.trim();
    
    if (!inputVal) {
        alert("Por favor, ingresa una coordenada.");
        return;
    }

    let regex = /-?\d+(?:[.,]\d+)?/g;
    let coincidencias = inputVal.match(regex);

    if (coincidencias && coincidencias.length >= 2) {
        let lat = parseFloat(coincidencias[0].replace(',', '.'));
        let lng = parseFloat(coincidencias[1].replace(',', '.'));

        if (!isNaN(lat) && !isNaN(lng)) {
            if (marcadorBusqueda) map.removeLayer(marcadorBusqueda);
            
            marcadorBusqueda = L.marker([lat, lng], {icon: redIcon}).addTo(map);
            
            let puntoBuscado = turf.point([lng, lat]); 
            let rutaDetectada = "Fuera de Polígono / No asignada";
            let diaDetectado = "-";
            let rutaEspejoDetectada = "No asignada";
            let diaEspejoDetectado = "No asignado";
            let sitioDetectado = "N/A";
            let grupoDetectado = "N/A";
            let portafolioDetectado = "N/A";

            if (typeof poligonos !== 'undefined') {
                for (let i = 0; i < poligonos.features.length; i++) {
                    let feature = poligonos.features[i];
                    if (turf.booleanPointInPolygon(puntoBuscado, feature)) {
                        rutaDetectada = feature.properties.Ruta || "Sin nombre";
                        diaDetectado = feature.properties.Dia || "N/A";
                        rutaEspejoDetectada = feature.properties.RUTA_ESPEJO || "No asignada";
                        diaEspejoDetectado = feature.properties.Dia_espejo || "No asignado";
                        sitioDetectado = feature.properties.SITIO || "N/A";
                        grupoDetectado = feature.properties.GRUPO || "N/A";
                        portafolioDetectado = feature.properties.PORTAFOLIO || "N/A";
                        break; 
                    }
                }
            }

            let contenidoPopup = `
                <div style='font-family: Arial, sans-serif; font-size: 14px; min-width: 180px;'>
                    <strong style='color: #d9534f; font-size: 15px;'>Coordenada Ingresada</strong><br>
                    <strong>Coordenadas:</strong> ${lat}, ${lng}
                    <hr style='margin: 6px 0; border: 0; border-top: 1px solid #eee;'>
                    <strong>Ruta Detectada:</strong> <span style='color: #007bff; font-weight: bold;'>${rutaDetectada}</span><br>
                    <strong>Día de Visita:</strong> <strong>${diaDetectado}</strong><br>
                    <strong>Ruta Espejo:</strong> ${rutaEspejoDetectada}<br>
                    <strong>Día Espejo:</strong> ${diaEspejoDetectado}
                    <hr style='margin: 6px 0; border: 0; border-top: 1px solid #eee;'>
                    <strong>Sitio:</strong> ${sitioDetectado}<br>
                    <strong>Grupo:</strong> ${grupoDetectado}<br>
                    <strong>Portafolio:</strong> ${portafolioDetectado}
                </div>
            `;
            
            marcadorBusqueda.bindPopup(contenidoPopup).openPopup();
            map.flyTo([lat, lng], 15);
            
        } else {
            alert("Los números ingresados no son válidos. Revisa el formato.");
        }
    } else {
        alert("No se pudo detectar la Latitud y Longitud. Asegúrate de ingresar la coordenada completa.");
    }
});

document.getElementById('btnLimpiar').addEventListener('click', function() {
    if (marcadorBusqueda) map.removeLayer(marcadorBusqueda);
    document.getElementById('coordenadas').value = "";
});

// Capturar ubicación con un clic en el mapa
map.on('click', function(e) {
    let lat = e.latlng.lat.toFixed(6);
    let lng = e.latlng.lng.toFixed(6);
    
    // Corregido: Se eliminó el volcado a elementos HTML inexistentes para evitar errores en la consola
    L.popup()
        .setLatLng(e.latlng)
        .setContent("<strong>Coordenada Seleccionada:</strong><br>" + lat + ", " + lng)
        .openOn(map);
});

// =========================================================================
// 10. LEYENDA DE COLORES INTERNA
// =========================================================================
var legend = L.control({position: 'bottomright'});

legend.onAdd = function (map) {
    var div = L.DomUtil.create('div', 'info legend');
    var dias = ['LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB'];
    
    div.style.backgroundColor = 'white';
    div.style.padding = '10px';
    div.style.border = '2px solid rgba(0,0,0,0.2)';
    div.style.borderRadius = '5px';
    div.style.lineHeight = '20px';
    div.style.fontFamily = 'Arial, sans-serif';

    div.innerHTML = '<h4 style="margin: 0 0 5px;">Mapa de Colores</h4>';

    for (var i = 0; i < dias.length; i++) {
        div.innerHTML +=
            '<div><i style="background:' + getColor(dias[i]) + '; width: 18px; height: 18px; float: left; margin-right: 8px; border: 1px solid #999;"></i> ' +
            dias[i] + '</div>';
    }
    return div;
};
legend.addTo(map);

// =========================================================================
// 11. LÓGICA DE CARGA MASIVA (PAPAPARSE) E INDEXACIÓN ESPACIAL (BBOX)
// =========================================================================
var capaCSV = L.layerGroup().addTo(map);
var datosAuditados = []; 

// --- MOTOR ESPACIAL: Pre-calcular Bounding Boxes (Cajas delimitadoras) ---
if (typeof poligonos !== 'undefined') {
    poligonos.features.forEach(feature => {
        feature.properties.bbox = turf.bbox(feature); // Pre-calculado una sola vez
    });
}

function puntoEnBBox(pt, bbox) {
    return pt[0] >= bbox[0] && pt[0] <= bbox[2] &&
           pt[1] >= bbox[1] && pt[1] <= bbox[3];
}
// ------------------------------------------------------------------------

document.getElementById('btnCargarCSV').addEventListener('click', function() {
    document.getElementById('archivoCSV').click();
});

document.getElementById('archivoCSV').addEventListener('change', function(e) {
    let file = e.target.files[0];
    if (!file) return;

    // Lanzar loader visual
    document.getElementById('loader-overlay').style.display = 'flex';
    document.getElementById('loader-texto').innerText = "Leyendo archivo CSV...";

    Papa.parse(file, {
        header: true, 
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: function(results) {
            document.getElementById('loader-texto').innerText = "Calculando ubicación espacial de clientes...";
            
            // Permitir el refresco del DOM antes del cálculo intensivo
            setTimeout(() => {
                procesarDatosCSV(results.data);
                
                document.getElementById('btnLimpiarCSV').style.display = 'inline-block';
                document.getElementById('btnDescargarCSV').style.display = 'inline-block'; 
                document.getElementById('loader-overlay').style.display = 'none';
            }, 50);
        }
    });
    
    this.value = '';
});

function procesarDatosCSV(datos) {
    capaCSV.clearLayers(); 
    datosAuditados = []; 
    let procesados = 0;
    let conError = 0;

    datos.forEach(fila => {
        let latVal = String(fila.Latitud || fila.Lat || fila.lat || fila.LATITUD || "").replace(',', '.');
        let lngVal = String(fila.Longitud || fila.Lon || fila.lon || fila.LON || fila.LONGITUD || "").replace(',', '.');
        
        let lat = parseFloat(latVal);
        let lng = parseFloat(lngVal);

        if (!isNaN(lat) && !isNaN(lng)) {
            let diaOriginalCSV = String(fila.Dia || fila.DIA || fila.dia || fila.Día || "S/D").trim();
            let diaColor = "S/D";
            let diaMin = diaOriginalCSV.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            
            if (diaMin.startsWith("lu")) diaColor = "Lun";
            else if (diaMin.startsWith("ma")) diaColor = "Mar";
            else if (diaMin.startsWith("mi")) diaColor = "Mie";
            else if (diaMin.startsWith("ju")) diaColor = "Jue";
            else if (diaMin.startsWith("vi")) diaColor = "Vie";
            else if (diaMin.startsWith("sa")) diaColor = "Sab";

            let marker = L.circleMarker([lat, lng], {
                radius: 6,
                fillColor: getColor(diaColor), 
                color: "#ffffff",
                weight: 1.5,
                opacity: 1,
                fillOpacity: 0.9 
            });

            let coordPunto = [lng, lat]; 
            let puntoTurf = turf.point(coordPunto);
            let rutaDetectada = "Fuera de Polígono";
            let diaDetectado = "-";

            if (typeof poligonos !== 'undefined') {
                for (let i = 0; i < poligonos.features.length; i++) {
                    let feature = poligonos.features[i];
                    
                    // FILTRO DE ALTO RENDIMIENTO (BBox rápido antes del algoritmo complejo de Turf)
                    if (feature.properties.bbox && puntoEnBBox(coordPunto, feature.properties.bbox)) {
                        if (turf.booleanPointInPolygon(puntoTurf, feature)) {
                            rutaDetectada = feature.properties.Ruta || "Sin nombre";
                            diaDetectado = feature.properties.Dia || "N/A";
                            break; 
                        }
                    }
                }
            }

            fila.Ruta_Calculada_Mapa = rutaDetectada;
            fila.Dia_Calculado_Mapa = diaDetectado;
            datosAuditados.push(fila);

            let listaDatosCSV = "";
            for (let columna in fila) {
                let valor = fila[columna];
                if (valor !== null && valor !== "" && valor !== undefined && columna !== "Ruta_Calculada_Mapa" && columna !== "Dia_Calculado_Mapa") {
                    listaDatosCSV += `<strong>${columna}:</strong> ${valor}<br>`;
                }
            }

            let contenido = `
                <div style='font-family: Arial, sans-serif; font-size: 13px; min-width: 220px; max-height: 220px; overflow-y: auto;'>
                    <strong style='color: #D81B60; font-size: 14px;'>📍 Datos Cargados (CSV)</strong><br>
                    ${listaDatosCSV}
                    <hr style='margin: 8px 0; border: 0; border-top: 1px solid #ccc;'>
                    <strong style='color: #007bff; font-size: 14px;'>🗺️ Polígonos (Mapa)</strong><br>
                    <strong>Cae en Ruta:</strong> <span style='color: #007bff; font-weight: bold;'>${rutaDetectada}</span><br>
                    <strong>Día Real:</strong> <strong>${diaDetectado}</strong>
                </div>
            `;
            
            marker.bindPopup(contenido);
            capaCSV.addLayer(marker);
            procesados++;
        } else {
            conError++;
        }
    });

    // Lanzar el Toast en lugar del Alert nativo bloqueante
    setTimeout(() => {
        let mensaje = `
            Clientes mapeados: <strong>${procesados}</strong><br>
            Filas ignoradas: <strong>${conError}</strong>
        `;
        mostrarToast("Carga Masiva Completada", mensaje);
    }, 150);
}

document.getElementById('btnLimpiarCSV').addEventListener('click', function() {
    capaCSV.clearLayers();
    datosAuditados = []; 
    this.style.display = 'none';
    document.getElementById('btnDescargarCSV').style.display = 'none';
});

// =========================================================================
// 12. EXPORTACIÓN DE RESULTADOS AUDITADOS A CSV
// =========================================================================
document.getElementById('btnDescargarCSV').addEventListener('click', function() {
    if (datosAuditados.length === 0) {
        alert("No hay datos para descargar. Sube un archivo CSV primero.");
        return;
    }

    let csvGenerado = Papa.unparse(datosAuditados);
    let blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvGenerado], {type: "text/csv;charset=utf-8;"}); 
    
    let link = document.createElement("a");
    let url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "Validacion_Coordenadas.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
});

// =========================================================================
// 13. MOTOR DE FILTROS EN CASCADA DINÁMICOS (LECTURA EXACTA DEL GEOJSON)
// =========================================================================
const domDiv = document.getElementById('filtroDivision');
const domSitio = document.getElementById('filtroSitio');
const domGrupo = document.getElementById('filtroGrupo');
const domPortafolio = document.getElementById('filtroPortafolio');
const domRuta = document.getElementById('filtroRuta');

// Coordenadas atadas al nombre en texto (propiedad DIVISION)
const coordenadasDivisiones = {
    "210 - CHIHUAHUA": [28.6353, -106.0889],
    "220 - DURANGO": [24.0277, -104.6532],
    "230 Y 231 - MONTERREY": [25.6714, -100.3095], 
    "240 - VICTORIA": [23.7369, -99.1411]
};

const mapeoDivisiones = {
    "210": "210 - CHIHUAHUA", "CHIHUAHUA": "210 - CHIHUAHUA",
    "220": "220 - DURANGO", "DURANGO": "220 - DURANGO",
    "230": "230 - MONTERREY", "MONTERREY": "230 - MONTERREY", 
    "231": "230 - MONTERREY", "MONTERREY": "230 - MONTERREY", 
    "240": "240 - VICTORIA", "VICTORIA": "240 - VICTORIA"
};

// Función para poblar e inyectar el HTML de los selectores
function poblarSelector(selectElement, setDeValores, textoDefault) {
    selectElement.innerHTML = `<option value="TODAS">${textoDefault}</option>`;
    let arregloOrdenado = Array.from(setDeValores).filter(v => v !== "S/D" && v !== "").sort();
    
    arregloOrdenado.forEach(valor => {
        let opt = document.createElement('option');
        opt.value = valor;
        opt.textContent = valor;
        selectElement.appendChild(opt);
    });
    
    selectElement.disabled = (arregloOrdenado.length === 0);
}

function actualizarCascada(nivelCambiado) {
    if (typeof poligonos === 'undefined') return;

    let divSel = domDiv.value;
    let sitSel = domSitio.value;
    let gruSel = domGrupo.value;
    let porSel = domPortafolio.value;
    let rutSel = domRuta.value;

    // Reseteo jerárquico estricto en cadena descendente
    if (nivelCambiado === 'division') { sitSel = "TODAS"; gruSel = "TODAS"; porSel = "TODAS"; rutSel = "TODAS"; }
    if (nivelCambiado === 'sitio')    { gruSel = "TODAS"; porSel = "TODAS"; rutSel = "TODAS"; }
    if (nivelCambiado === 'grupo')    { porSel = "TODAS"; rutSel = "TODAS"; }
    if (nivelCambiado === 'portafolio') { rutSel = "TODAS"; }

    let sets = { divs: new Set(), sits: new Set(), grus: new Set(), pors: new Set(), ruts: new Set() };

    // Escaneo directo a las llaves exactas que me compartiste
    poligonos.features.forEach(f => {
        if (!f.properties) return;
        let p = f.properties;
        
        let divOriginal = p.Division ? String(p.Division).trim().toUpperCase() : "S/D";
        let d = mapeoDivisiones[divOriginal] || divOriginal;
        
        let s = p.Sitio ? String(p.Sitio).trim() : "S/D";
        let g = p.Grupo ? String(p.Grupo).trim() : "S/D";
        let pt = p.Portafolio ? String(p.Portafolio).trim() : "S/D";
        let r = p.Ruta ? String(p.Ruta).trim() : "S/D";

        sets.divs.add(d);

        if (divSel === "TODAS" || d === divSel) {
            sets.sits.add(s);
            if (sitSel === "TODAS" || s === sitSel) {
                sets.grus.add(g);
                if (gruSel === "TODAS" || g === gruSel) {
                    sets.pors.add(pt);
                    if (porSel === "TODAS" || pt === porSel) {
                        sets.ruts.add(r);
                    }
                }
            }
        }
    });

    // Inyección condicional según el nodo alterado en la interfaz
    if (nivelCambiado === 'init') poblarSelector(domDiv, sets.divs, "Todas las Divisiones");
    if (nivelCambiado === 'init' || nivelCambiado === 'division') poblarSelector(domSitio, sets.sits, "Todos los Sitios");
    if (nivelCambiado === 'init' || nivelCambiado === 'division' || nivelCambiado === 'sitio') poblarSelector(domGrupo, sets.grus, "Todos los Grupos");
    if (nivelCambiado === 'init' || nivelCambiado === 'division' || nivelCambiado === 'sitio' || nivelCambiado === 'grupo') poblarSelector(domPortafolio, sets.pors, "Todos los Portafolios");
    if (nivelCambiado === 'init' || nivelCambiado === 'division' || nivelCambiado === 'sitio' || nivelCambiado === 'grupo' || nivelCambiado === 'portafolio') poblarSelector(domRuta, sets.ruts, "Todas las Rutas");

    domDiv.value = divSel;
    domSitio.value = sitSel;
    domGrupo.value = gruSel;
    domPortafolio.value = porSel;
    domRuta.value = rutSel;

    filtrarPoligonosEnMapa(divSel, sitSel, gruSel, porSel, rutSel, nivelCambiado);
}

function filtrarPoligonosEnMapa(divSel, sitSel, gruSel, porSel, rutSel, nivelCambiado) {
    let boundsCapa = L.latLngBounds();
    let hayPoligonosVisibles = false;

    capaPoligonos.eachLayer(function(layer) {
        if (layer.feature && layer.feature.properties) {
            let p = layer.feature.properties;
            
            let divOriginal = p.Division ? String(p.Division).trim().toUpperCase() : "S/D";
            let d = mapeoDivisiones[divOriginal] || divOriginal;
            
            let s = p.Sitio ? String(p.Sitio).trim() : "S/D";
            let g = p.Grupo ? String(p.Grupo).trim() : "S/D";
            let pt = p.Portafolio ? String(p.Portafolio).trim() : "S/D";
            let r = p.Ruta ? String(p.Ruta).trim() : "S/D";

            let cumpleDiv = (divSel === "TODAS") || (d === divSel);
            let cumpleSit = (sitSel === "TODAS" || s === sitSel);
            let cumpleGru = (gruSel === "TODAS" || g === gruSel);
            let cumplePor = (porSel === "TODAS" || pt === porSel);
            let cumpleRut = (rutSel === "TODAS" || r === rutSel);

            if (cumpleDiv && cumpleSit && cumpleGru && cumplePor && cumpleRut) {
                layer.setStyle({ fillOpacity: 0.6, opacity: 1, weight: 1.5 });
                boundsCapa.extend(layer.getBounds());
                hayPoligonosVisibles = true;
            } else {
                layer.setStyle({ fillOpacity: 0, opacity: 0, weight: 0 });
            }
        }
    });

    if (nivelCambiado === 'division' && coordenadasDivisiones[divSel]) {
        map.flyTo(coordenadasDivisiones[divSel], 8);
    } else if (hayPoligonosVisibles && (divSel !== "TODAS" || sitSel !== "TODAS" || gruSel !== "TODAS" || porSel !== "TODAS" || rutSel !== "TODAS")) {
        map.flyToBounds(boundsCapa, { padding: [30, 30], duration: 1.2 });
    }
}

// Vinculación de disparadores de eventos
domDiv.addEventListener('change', () => actualizarCascada('division'));
domSitio.addEventListener('change', () => actualizarCascada('sitio'));
domGrupo.addEventListener('change', () => actualizarCascada('grupo'));
domPortafolio.addEventListener('change', () => actualizarCascada('portafolio'));
domRuta.addEventListener('change', () => actualizarCascada('ruta'));

// Ejecución inicial automática de la cascada
actualizarCascada('init');
// =========================================================================
// 14. CONTROLADOR DE NOTIFICACIONES TOAST (UI MODERNA NO BLOQUEANTE)
// =========================================================================
let toastTimeout;

function mostrarToast(titulo, mensaje) {
    let toast = document.getElementById('toast-notificacion');
    
    document.getElementById('toast-titulo').innerText = titulo;
    document.getElementById('toast-mensaje').innerHTML = mensaje; 
    
    toast.classList.remove('toast-oculto');
    toast.classList.add('toast-visible');

    if (toastTimeout) clearTimeout(toastTimeout);

    // Ocultado automático tras 6 segundos
    toastTimeout = setTimeout(() => {
        cerrarToast();
    }, 6000);
}

function cerrarToast() {
    let toast = document.getElementById('toast-notificacion');
    toast.classList.remove('toast-visible');
    toast.classList.add('toast-oculto');
}

document.getElementById('toast-cerrar').addEventListener('click', cerrarToast);
// =========================================================================
// 15. CONTROLADOR DEL PANEL COLAPSABLE (UI MÓVIL RESPONSIVA)
// =========================================================================
const btnToggle = document.getElementById('btnTogglePanel');
const btnCerrar = document.getElementById('btnCerrarPanel');
const panelControles = document.querySelector('.controles-mapa');

// Verificamos que los elementos existan en el HTML para evitar errores
if (btnToggle && btnCerrar && panelControles) {
    
    // Acción para ABRIR el panel al tocar "Filtros y Herramientas"
    btnToggle.addEventListener('click', () => {
        panelControles.classList.add('panel-abierto');
    });

    // Acción para CERRAR el panel al tocar el botón rojo de la "X"
    btnCerrar.addEventListener('click', () => {
        panelControles.classList.remove('panel-abierto');
    });
}