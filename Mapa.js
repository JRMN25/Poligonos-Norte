// 1. Definir los Mapas Base (OSM y CartoDB)
var mapaCalles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap'
});

var mapaLimpio = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; CARTO'
});
var mapaOscuro = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; CARTO'
});

// 2. Inicialización del Mapa
let map = L.map('map', {
    center: [28.6353, -106.0889],
    zoom: 6,
    layers: [mapaCalles] // Capa inicial
});

// 3. Crear el Control para cambiar entre mapas
var mapasBase = {
    "Detalle de Calles (OSM)": mapaCalles,
    "Vista Polígonos": mapaLimpio,
    "Fondo Oscuro (Dark Mode)": mapaOscuro
};
L.control.layers(mapasBase, null, {position: 'topright'}).addTo(map);

// 4. Configuración de Colores por Día
function getColor(dia) {
    switch (dia) {
        case 'Lun': return '#4F2170'; 
        case 'Mar': return '#287819'; 
        case 'Mie': return '#2D6EAA'; 
        case 'Jue': return '#E6AF23'; 
        case 'Vie': return '#A52323'; 
        case 'Sab': return '#623E23'; 
        default:    return '#757575';
    }
}

// 5. Función para las Ventanas Emergentes (Popups) - ¡CORREGIDO!
function popup(feature, layer) {
    if (feature.properties && feature.properties.Ruta){
        // Usamos los nombres EXACTOS de tu GeoJSON
        let rutaEspejo = feature.properties.RUTA_ESPEJO || "No asignada";
        let diaNormal = feature.properties.Dia || "N/A";
        let diaEspejo = feature.properties.Dia_espejo || "No asignado"; 

        layer.bindPopup(
            "<div style='font-family: Arial; font-size: 14px;'>" +
            "<strong>Ruta: </strong>" + feature.properties.Ruta + 
            "<br/><strong>Día: </strong>" + diaNormal +
            "<hr style='margin: 5px 0; border: 0; border-top: 1px solid #ccc;'>" +
            "<strong>Ruta Espejo: </strong>" + rutaEspejo +
            "<br/><strong>Día Espejo: </strong>" + diaEspejo + 
            "<hr style='margin: 5px 0; border: 0; border-top: 1px solid #ccc;'>" +
            "<strong>Sitio: </strong>" + (feature.properties.SITIO || "N/A") +
            "<br/><strong>Portafolio: </strong>" + (feature.properties.PORTAFOLIO || "N/A") +
            "</div>"
        );
    }
}

// 6. Capa GeoJSON
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
});

// 7. Icono personalizado para el buscador
var redIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

var marcadorBusqueda = null;

// 8. Lógica del Filtro de Divisiones -
document.getElementById('Divisiones').addEventListener('change', function(e) {
    let idDivision = e.target.value; 
    
    // Primero, si ya había una capa, la quitamos del mapa para limpiar
    if (map.hasLayer(capaPoligonos)) {
        map.removeLayer(capaPoligonos);
    }
    
    // Solo hacemos algo si no eligieron la opción "0"
    if (idDivision !== "0") {
        // Volvemos a crear la capa, pero filtrando los datos
        capaPoligonos = L.geoJSON(poligonos, {
            filter: function(feature) {
                let divisionPoligono = feature.properties.Division; 
                if (idDivision === "230") {
                    return divisionPoligono === "230" || divisionPoligono === "231";
                }
                return divisionPoligono === idDivision;
            },
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

        // Mover la cámara a la división seleccionada
        let selectedOption = e.target.options[e.target.selectedIndex];
        let coordsString = selectedOption.getAttribute('data-coords');
        if (coordsString) {
            let coordenadas = coordsString.split(',').map(Number);
            map.flyTo(coordenadas, 8);
        }
    }
});

// 9. Lógica del Buscador
document.getElementById('btnBuscar').addEventListener('click', function() {
    let inputVal = document.getElementById('coordenadas').value.trim();
    
    // Si está vacío, no hacemos nada
    if (!inputVal) {
        alert("Por favor, ingresa una coordenada.");
        return;
    }

    // LÓGICA DE DETECCIÓN: Cortar el texto a la mitad
    // Primero intentamos separar por coma
    let partes = inputVal.split(',');
    
    // Si no encontró una coma, intentamos separar por espacios en blanco
    if (partes.length < 2) {
        partes = inputVal.split(/\s+/); 
    }

    // Si logramos obtener 2 partes (Latitud y Longitud)
    if (partes.length >= 2) {
        // Limpiamos espacios y convertimos comas decimales europeas en puntos
        let lat = parseFloat(partes[0].trim().replace(',', '.'));
        let lng = parseFloat(partes[1].trim().replace(',', '.'));

        if (!isNaN(lat) && !isNaN(lng)) {
            if (marcadorBusqueda) map.removeLayer(marcadorBusqueda);
            
            marcadorBusqueda = L.marker([lat, lng], {icon: redIcon}).addTo(map);
            
            let puntoBuscado = turf.point([lng, lat]); 
            let rutaDetectada = "Fuera de Polígono / No asignada";
            let diaDetectado = "-";
            let rutaEspejoDetectada = "No asignada";
            let diaEspejoDetectado = "No asignado";
            let sitioDetectado = "N/A";
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
                    <strong>Portafolio:</strong> ${portafolioDetectado}
                </div>
            `;
            
            marcadorBusqueda.bindPopup(contenidoPopup).openPopup();
            map.flyTo([lat, lng], 15);
            
        } else {
            alert("Los números ingresados no son válidos. Revisa el formato.");
        }
    } else {
        alert("No se pudo detectar la Latitud y Longitud. Asegúrate de separarlas con una coma o un espacio (Ej: 28.6, -106.0)");
    }
});

// Limpiar el Pin (Actualizado para el nuevo input)
document.getElementById('btnLimpiar').addEventListener('click', function() {
    if (marcadorBusqueda) map.removeLayer(marcadorBusqueda);
    document.getElementById('coordenadas').value = "";
});

//Obtener coordenadas al hacer clic
map.on('click', function(e) {
    let lat = e.latlng.lat.toFixed(6);
    let lng = e.latlng.lng.toFixed(6);
    
    document.getElementById('latitud').value = lat;
    document.getElementById('longitud').value = lng;
    
    L.popup()
        .setLatLng(e.latlng)
        .setContent("<strong>Coordenada Ingresada:</strong><br>" + lat + ", " + lng)
        .openOn(map);
});

// 10. Leyenda de Colores
var legend = L.control({position: 'bottomright'});

legend.onAdd = function (map) {
    var div = L.DomUtil.create('div', 'info legend');
    var dias = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie','Sab'];
    
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

// ==========================================
// 11. LÓGICA DE CARGA MASIVA (PAPAPARSE)
// ==========================================

var capaCSV = L.layerGroup().addTo(map);

document.getElementById('btnCargarCSV').addEventListener('click', function() {
    document.getElementById('archivoCSV').click();
});

document.getElementById('archivoCSV').addEventListener('change', function(e) {
    let file = e.target.files[0];
    if (!file) return;

    Papa.parse(file, {
        header: true, 
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: function(results) {
            procesarDatosCSV(results.data);
            document.getElementById('btnLimpiarCSV').style.display = 'inline-block';
        }
    });
    
    this.value = '';
});

function procesarDatosCSV(datos) {
    capaCSV.clearLayers(); 
    let procesados = 0;
    let conError = 0;

    datos.forEach(fila => {
        // 1. Búsqueda de coordenadas
        let lat = parseFloat(fila.Latitud || fila.lat || fila.LAT || fila.LATITUD);
        let lng = parseFloat(fila.Longitud || fila.lon || fila.lng || fila.LON || fila.LONGITUD);

        if (!isNaN(lat) && !isNaN(lng)) {
            
            // 2. Traductor de Días (Limpieza total de acentos y mayúsculas)
            let diaOriginalCSV = String(fila.Dia || fila.DIA || fila.dia || "S/D").trim();
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

            // 3. Cruce espacial con Turf.js
            let punto = turf.point([lng, lat]);
            let rutaDetectada = "Fuera de Polígono";
            let diaDetectado = "-";

            if (typeof poligonos !== 'undefined') {
                for (let i = 0; i < poligonos.features.length; i++) {
                    let feature = poligonos.features[i];
                    if (turf.booleanPointInPolygon(punto, feature)) {
                        rutaDetectada = feature.properties.Ruta || "Sin nombre";
                        diaDetectado = feature.properties.Dia || "N/A";
                        break; 
                    }
                }
            }

            // 4. LECTURA AUTO-MÁGICA DE COLUMNAS DEL CSV
            let listaDatosCSV = "";
            for (let columna in fila) {
                let valor = fila[columna];
                // Filtramos celdas vacías o nulas para que no ensucien la vista
                if (valor !== null && valor !== "" && valor !== undefined) {
                    listaDatosCSV += `<strong>${columna}:</strong> ${valor}<br>`;
                }
            }

            // 5. Armado de la tarjeta (Con scroll interno por si hay muchas columnas)
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

    alert(`📊 Carga Masiva Completada:\n- Clientes mapeados: ${procesados}\n- Filas ignoradas (sin coordenadas válidas): ${conError}`);
}

document.getElementById('btnLimpiarCSV').addEventListener('click', function() {
    capaCSV.clearLayers();
    this.style.display = 'none';
});