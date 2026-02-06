// 1. Inicialización del Mapa
let map = L.map('map').setView([28.6353, -106.0889], 6);

// Capa Base de OpenStreetMap
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

// 2. Configuración de Colores por Día
function getColor(dia) {
    switch (dia) {
        case 'Lun': return '#FF5733'; // Naranja
        case 'Mar': return '#33FF57'; // Verde
        case 'Mie': return '#3357FF'; // Azul
        case 'Jue': return '#F3FF33'; // Amarillo
        case 'Vie': return '#FF33F6'; // Rosa
        case 'Sab': return '#33FFF6'; // Cian
        case 'Dom': return '#8D33FF'; // Morado
        default:    return '#3388ff'; // Azul por defecto
    }
}

// 3. Capas Dinámicas
// Capa GeoJSON para los polígonos
var capaPoligonos = L.geoJSON(null, {
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

// Icono personalizado para el buscador (Pin Rojo)
var redIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

var marcadorBusqueda = null;

// 4. Función para las Ventanas Emergentes (Popups) con Ruta Espejo y Día Espejo
function popup(feature, layer) {
    if (feature.properties && feature.properties.Ruta){
        // Extraemos las propiedades del GeoJSON
        let rutaEspejo = feature.properties["RUTA ESPEJO"] || "No asignada";
        let diaNormal = feature.properties.Dia || "N/A";
        let diaEspejo = feature.properties["Dia espejo"] || "No asignado"; // Esta es la nueva columna

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

// 5. Lógica del Filtro de Divisiones (Soporta agrupación 230 y 231)
document.getElementById('Divisiones').addEventListener('change', function(e) {
    let idDivision = e.target.value;
    capaPoligonos.clearLayers();

    if (idDivision !== "0") {
        if (typeof poligonos !== 'undefined') {
            let filtrados = poligonos.features.filter(f => {
                // Filtramos usando la propiedad DIVISION en mayúsculas del GeoJSON
                if (idDivision === "230") {
                    return f.properties.DIVISION == "230" || f.properties.DIVISION == "231";
                }
                return f.properties.DIVISION == idDivision;
            });
            
            capaPoligonos.addData(filtrados);
        }

        // Mover el mapa a la ubicación de la división
        let selectedOption = e.target.options[e.target.selectedIndex];
        let coordsString = selectedOption.getAttribute('data-coords');
        if (coordsString) {
            let coordenadas = coordsString.split(',').map(Number);
            map.flyTo(coordenadas, 8);
        }
    }
});

// 6. Lógica del Buscador de Coordenadas (Acepta puntos y comas)
document.getElementById('btnBuscar').addEventListener('click', function() {
    // Leemos el valor y reemplazamos la coma por punto inmediatamente
    let latRaw = document.getElementById('latitud').value.replace(',', '.');
    let lngRaw = document.getElementById('longitud').value.replace(',', '.');

    let lat = parseFloat(latRaw);
    let lng = parseFloat(lngRaw);

    if (!isNaN(lat) && !isNaN(lng)) {
        if (marcadorBusqueda) map.removeLayer(marcadorBusqueda);
        
        marcadorBusqueda = L.marker([lat, lng], {icon: redIcon}).addTo(map);
        marcadorBusqueda.bindPopup("Coordenadas buscadas:<br>" + lat + ", " + lng).openPopup();
        
        map.flyTo([lat, lng], 15);
    } else {
        alert("Por favor, ingresa coordenadas válidas (usa puntos o comas).");
    }
});

document.getElementById('btnLimpiar').addEventListener('click', function() {
    if (marcadorBusqueda) map.removeLayer(marcadorBusqueda);
    document.getElementById('latitud').value = "";
    document.getElementById('longitud').value = "";
});

// 7. Leyenda de Colores
var legend = L.control({position: 'bottomright'});

legend.onAdd = function (map) {
    var div = L.DomUtil.create('div', 'info legend');
    var dias = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'];
    
    div.style.backgroundColor = 'white';
    div.style.padding = '10px';
    div.style.border = '2px solid rgba(0,0,0,0.2)';
    div.style.borderRadius = '5px';
    div.style.lineHeight = '20px';
    div.style.fontFamily = 'Arial, sans-serif';

    div.innerHTML = '<h4 style="margin: 0 0 5px;">Día de Ruta</h4>';

    for (var i = 0; i < dias.length; i++) {
        div.innerHTML +=
            '<div><i style="background:' + getColor(dias[i]) + '; width: 18px; height: 18px; float: left; margin-right: 8px; border: 1px solid #999;"></i> ' +
            dias[i] + '</div>';
    }
    return div;
};

legend.addTo(map);