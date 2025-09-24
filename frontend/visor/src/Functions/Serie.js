import { toLonLat, fromLonLat } from 'ol/proj.js';
import Overlay from 'ol/Overlay';
import { Popover } from 'bootstrap';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { Feature } from 'ol';
import { Point } from 'ol/geom';
import { Select, Modify } from 'ol/interaction';
import { altKeyOnly, click, pointerMove } from 'ol/events/condition.js';
import { Circle, Fill, Stroke, Style } from 'ol/style.js';
import { polygonContains } from 'd3-polygon';

import {generatePopup} from '../utils/Alert.js';


// Draw ol
const vectorSource = new VectorSource();
const vectorLayer = new VectorLayer({
    source: vectorSource,
    zIndex: 10,
});
const pointSerie = new Feature();
const stylePoint = new Style({
    image: new Circle({
        radius: 7,
        fill: new Fill({ color: 'rgba(255, 0, 0, 0.3)' }),
        stroke: new Stroke({ color: 'rgba(255, 0, 0, 1)', width: 2 }),
    }),
});
pointSerie.setStyle(stylePoint);
vectorSource.addFeature(pointSerie);
const modify = new Modify({
    source: vectorSource,
    condition: () => true,              // permite el arrastre
    insertVertexCondition: () => false, // evita insertar nuevos vertices
    deleteCondition: () => false,       // evita borrar vertices
    style: stylePoint,
});
const select = new Select({
    condition: click,
    layers: [vectorLayer],
    style: stylePoint,
});

// Popup
const popupContainer = document.createElement('div');
popupContainer.style.minWidth = '200px';
popupContainer.className = 'ol-popup';
Object.assign(popupContainer.style, {
    userSelect: 'none',
});
const contentPopup = document.createElement('div');
Object.assign(contentPopup.style, {
    position: 'relative',
    fontSize: '12px',
    display: 'flex',
    flexDirection: 'column',
    height: '50px',
});
const closePopupButton = document.createElement('button'); //Boton de cerrar
closePopupButton.className = 'btn-close';
Object.assign(closePopupButton.style, {
    position: 'absolute',
    top: '-12px',
    right: '-12px',
    width: '6px',
    height: '6px',
});
// Overlay ol
const overlay = new Overlay({
    element: popupContainer,
    offset: [-10, 0],
    updateWhileAnimating: true,
    updateWhileInteracting: true,
});



import Highcharts from 'highcharts';
function parseInstanceToDate(instance, context) {
    if (!instance) return null;
    const date = new Date(instance.replace("_", " ") + ":00:00Z");
    if (context.optionLocalTime) {
        const localOffset = date.getTimezoneOffset();
        date.setMinutes(date.getMinutes() - localOffset);
    }
    return date;
}

function updateStartDateAxis(instance, context, units = '') {
    const startDate = parseInstanceToDate(instance, context);
    if (!startDate) return {};
    return {
        xAxis: {
            type: 'datetime',
            min: startDate.getTime() + context.startHour * 60 * 60 * 1000,
            max: startDate.getTime() + context.endHour * 60 * 60 * 1000,
        },
        yAxis: {
            title: { 
                text: units, 
                rotation: 0, 
                useHTML: true, 
                offset: 56,
            },
        }
    };
}

function serieGenerator(context, state, map, mapContainer, panelSerie) {
    const Chart = Highcharts.chart(panelSerie, {
        chart: {
            type: "area",
            zoomType: "x",
            animation: false,
            // Alineacion de serie con reproductor
            // Elementos de reproductor desde izquierda
            // 10px   position-left
            // 1.5    border-left
            // 2px    padding-left
            // 18px   icon (x3)
            // 2px    gap  (x3)
            // 7.5px  medio radio de thumb circular
            marginLeft: 10 + 1.5 + 2 + 18 * 3 + 3 * 2 + 7.5,
            marginRight: 10 + 1.5 + 2 + 7.5,
            marginBottom: 80,
        },
        title: { text: '' },
        xAxis: updateStartDateAxis(state.instance, context).xAxis,
        yAxis: updateStartDateAxis(state.instance, context).yAxis,
        plotOptions: { area: { stacking: false }, series: { animation: false } },
        tooltip: {
            formatter: function () {
                return `<b>${this.series.name}</b>: ${Highcharts.numberFormat(this.y, 2)}<br>` +
                    `<b>${Highcharts.dateFormat('%Y-%m-%d %H:%M', this.x)}</b>`;
            }
        },
        accessibility: { enabled: false },
        credits: { enabled: false },
        // Generar una serie vacia
        series: [{}],
    });

    // Remover inicialmente. Esto para generar un grafico vacio 
    while (Chart.series.length > 0) {
        Chart.series[0].remove(false);
    }

    // Actualiza el plot line del frame
    function updateIndicator() {
        if (!state.instance) return;
        const startDate = parseInstanceToDate(state.instance, context);
        const dt = state.currentData?.attrs.dt || context.ref_dt;

        Chart.xAxis[0].removePlotLine('time-indicator');
        Chart.xAxis[0].addPlotLine({
            id: 'time-indicator',
            color: 'dodgerblue',
            width: 1,
            value: startDate.getTime() + state.frame * dt * 60 * 1000,
        });
    }

    // Actualiza el eje X cuando cambia la instancia
    function updateAxis() {
        let units;
        if (state.variable) {
            units = state.currentData.attrs.unit || '';
        } else {
            units = '';
        }
        if (!state.instance) return;
        Chart.update({
            xAxis: updateStartDateAxis(state.instance, context).xAxis,
            yAxis: updateStartDateAxis(state.instance, context, units).yAxis,
        });
    }

    updateIndicator();
    state.addEventListener('change:frame', () => {
        updateIndicator();
    });
    state.addEventListener('change:instance', () => {
        while (Chart.series.length > 0) {
            Chart.series[0].remove(false);
        }
        updateAxis();
        updateIndicator();
    });


    //Nuevo 22/09
    /**
     * Activa o desactiva la serie temporal en el punto (lonNew, latNew).
     * Si active es false, se limpia el gráfico.
     * Si lonNew o latNew son null, se desactiva el feature del mapa.
    */
    let lonSerie = null;
    let latSerie = null;
    function setSerie(active = true, lonNew = lonSerie, latNew = latSerie) {
        //Limpiamos grafico previo
        while (Chart.series.length > 0) {
            Chart.series[0].remove(false);
        }
        Chart.update({
            yAxis: updateStartDateAxis(state.instance, context, '').yAxis,
        });
        // Vinculacion con pointSerie
        if (lonNew == null || latNew == null) {
            lonSerie = null;
            latSerie = null;
            pointSerie.setGeometry(null);
            return;
        } else {
            // Ambos son no nulos
            lonSerie = lonNew;
            latSerie = latNew;
            pointSerie.setGeometry(new Point(fromLonLat([lonSerie, latSerie])));
        }
        if (!active || !state.currentData) {
            return;
        }

        updateAxis();
        const startDate = parseInstanceToDate(state.instance, context);
        const data = state.currentData;
        const geoJsonSources = state.currentData.geoJsonSources;
        const totalProjects = 'total';
        const projectsAndTotal = [...state.currentData.projects, totalProjects];
        const [i, j] = data.proj_lonlat_to_ij(lonSerie, latSerie);
        const { nx, nz, nt, emVector, abVector } = data;

        // generate a object with keys given by projects and empty array as value   
        const SeriePerProjects = {};
        projectsAndTotal.forEach(p => SeriePerProjects[p] = []);

        for (let t = 0; t < nt; t++) {
            const framePerProject = {};
            projectsAndTotal.forEach(p => framePerProject[p] = 0);
            for (let z = 0; z < nz; z++) {
                let project = geoJsonSources.features[z]?.properties.project || ''; // Si se tiene projects
                let value = data.valuesApi(t, z)[j * nx + i] * emVector[z] * (1 - abVector[z] / 100);
                framePerProject[project] += value;
                framePerProject[totalProjects] += value;
            }
            const dt = state.currentData?.attrs.dt || context.ref_dt;
            const timestamp = startDate.getTime() + t * dt * 60 * 1000;
            projectsAndTotal.forEach(p => {
                SeriePerProjects[p].push([timestamp, framePerProject[p]]);
            });
        }

        projectsAndTotal.forEach((p, idx) => {
            (p == totalProjects)
                ? Chart.addSeries({
                    name: p.toUpperCase(),
                    data: SeriePerProjects[p],
                    color: "black",
                    dashStyle: 'ShortDash',
                    fillOpacity: 0
                }, false)
                : Chart.addSeries({
                    name: p.toUpperCase(),
                    data: SeriePerProjects[p],
                    color: Highcharts.getOptions().colors[idx % Highcharts.getOptions().colors.length],
                    fillOpacity: 0.5
                }, false)
        });
        Chart.redraw(); // dibuja todas las series juntas
    }

    //// Ol elements
    map.addLayer(vectorLayer);
    map.addInteraction(modify);
    map.addInteraction(select);
    map.addOverlay(overlay);
    map.getViewport().addEventListener('contextmenu', (e) => e.preventDefault());

    map.on('contextmenu', (event) => {
        closePopupButton.click();
        let coordinate = event.coordinate;
        let [lon, lat] = toLonLat(coordinate);
        if (polygonContains(context.borderCoords, [lon, lat])) {
            setSerie(true, lon, lat);
        } else {
            const {popover} = generatePopup(
                mapContainer,
                "Seleccione un punto dentro del dominio",
                1300
            );
            popover.show();
            setSerie(true, lonSerie, latSerie);
        }
    });

    modify.on('modifyend', async (event) => {
        closePopupButton.click();
        let coordinate = event.features.item(0).getGeometry().getCoordinates();
        let [lon, lat] = toLonLat(coordinate);
        closePopupButton.click();
        if (polygonContains(context.borderCoords, [lon, lat])) {
            setSerie(true, lon, lat);
        } else {
            const {popover} = generatePopup(
                mapContainer,
                "Seleccione un punto dentro del dominio",
                1300
            );
            popover.show();
            setSerie(true, lonSerie, latSerie);
        }
    });

    select.on('select', () => {
        // Limpiamos el select de los features selecionados (problema de togle)
        select.getFeatures().clear();
        let coordinate = pointSerie.getGeometry().getCoordinates();
        generatePopover(coordinate);
    });

    function generatePopover(coordinate) {
        //// Destruir popover previo
        contentPopup.innerHTML = '';
        overlay.setPosition(coordinate);
        let existingPopover = Popover.getInstance(popupContainer);
        if (existingPopover) {
            existingPopover.dispose();
        }

        //// Generamos el nuevo Popover
        const popover = new Popover(popupContainer, {
            animation: true,
            trigger: 'manual',
            container: popupContainer,
            content: contentPopup,
            placement: 'left',  // aparece arriba
            html: true,
            delay: { "show": 200, "hide": 200 },
        });

        //// Generamos el contenido
        closePopupButton.onclick = () => {
            popover.hide();
            setTimeout(() => {
                overlay.setPosition(undefined);
            }, 200);
        };
        contentPopup.appendChild(closePopupButton);
        const title = document.createElement('span'); //Titulo: Serie puntual
        title.style.fontWeight = 'bold';
        title.textContent = 'Serie de tiempo';
        contentPopup.appendChild(title);
        const [lon, lat] = toLonLat(coordinate); //Span: coordenadas
        const coordSpan = document.createElement('span');
        coordSpan.innerHTML = `
            <i class="bi bi-crosshair" aria-hidden="true"></i> (${lat.toFixed(3)}, ${lon.toFixed(3)})
        `;
        contentPopup.appendChild(coordSpan);

        // Agregamos boton para quitar la feature
        const removeButton = document.createElement('span');
        Object.assign(removeButton.style, {
            backgroundColor: 'transparent',
            border: 'none',
            userSelect: 'none',
            color: 'dodgerblue',
            cursor: 'pointer',
        });
        removeButton.textContent = 'Quitar selección';
        removeButton.onclick = () => {
            closePopupButton.click();
            setSerie(false, null, null);
        };
        contentPopup.appendChild(removeButton);
        //// Mostramos el popover
        popover.show();
    }
    //// ol-fin

    return {setSerie};
}

export { serieGenerator };