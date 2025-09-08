import './colorTable.css';
import VectorLayer from 'ol/layer/Vector.js';
import VectorSource from 'ol/source/Vector.js'
import Feature from 'ol/Feature.js';
import { Style, Stroke, Fill } from 'ol/style.js';
import { fromLonLat } from 'ol/proj.js';

import { TabulatorFull as Tabulator } from 'tabulator-tables';
import 'tabulator-tables/dist/css/tabulator_simple.css';

import { LineString, Polygon, Point } from 'ol/geom.js';

function formaterText(text) {
    // Primera letra den mayuscula y separar palabras por _
    let words = text.split('_');
    for (let i = 0; i < words.length; i++) {
        words[i] = words[i].charAt(0).toUpperCase() + words[i].slice(1);
    }
    return words.join(' ');
}

async function tableGenerator(context, state, map) {

    const loadButton = document.createElement('button');
    loadButton.textContent = "Generar escenario";
    loadButton.classList.add('btn', 'btn-secondary')
    Object.assign(loadButton.style, {
        fontSize: '12px',
        fontWeight: 'bold',
        userSelect: 'none',
        fontFamily: 'Arial, sans-serif',
        height: '30px',
        maxWidth: '1000px',
        width: '98%',
        marginTop: '5px',
        marginBottom: '5px',
        alignSelf: 'center',
    });

    const downloadButton = document.createElement('button');
    downloadButton.textContent = "Descargar CSV";
    downloadButton.id = "download-csv";
    downloadButton.classList.add('btn', 'btn-secondary')
    Object.assign(downloadButton.style, {
        fontSize: '12px',
        fontWeight: 'bold',
        userSelect: 'none',
        fontFamily: 'Arial, sans-serif',
        height: '30px',
        maxWidth: '1000px',
        width: '98%',
        marginTop: '5px',
        marginBottom: '5px',
        alignSelf: 'center',
    });


    const tableHtml = document.createElement('div');
    tableHtml.style.width = "100%";
    tableHtml.style.fontSize = "10px";
    tableHtml.style.fontSize = "14px";
    tableHtml.style.userSelect = "none";

    const styleDeactive = new Style({
        stroke: new Stroke({
            color: 'rgba(255, 140, 0, 0.2)',
            width: 1,
        }),
        fill: new Fill({
            color: 'rgba(255, 140, 0, 0.2)'
        }),
    });

    const styleActive = new Style({
        stroke: new Stroke({
            color: 'darkorange',
            width: 2,
        }),
        fill: new Fill({
            color: 'rgba(255, 140, 0, 0.5)'
        }),
    });

    const vectorSource = new VectorSource();
    const vectorLayer = new VectorLayer({
        source: vectorSource,
        zIndex: 10,
    });
    map.addLayer(vectorLayer);

    let tableData = [];
    const table = new Tabulator(tableHtml, {
        data: tableData,           //load row data from array
        height: "100%",
        pagination: true,          //enable pagination
        layout: "fitColumns",      // ajusta columnas al ancho del contenedor
        selectableRows: true,
        columnDefaults: {
            headerHozAlign: "center",
            resizable: "header",
        },
        columns: [
            { title: "Id", field: "id_inner", headerSort: false, hozAlign: "center", width: 50, resizable: false },
            { title: "Fuente", field: "emisid", width: 120 },
            { title: "Faena", field: "project", width: 80 },
            { title: "Abatimiento (%)", field: "abatimiento", sorter: "number", hozAlign: "left", editor: "input", editor: true, validator: ["min:0", "max:100", "numeric"] },
            { title: "Emisión (kg/día)", field: "emision", sorter: "number", hozAlign: "left", editor: "input", editor: true, validator: ["min:0", "max:10000"] },
        ],
    });    

    function setSources(geojson, abVector, emVector) {
        // Now read data from geojson and populate a tabledata
        geojson.features.forEach((feature) => {
            const properties = feature.properties;
            const geometry = feature.geometry;
            const type_geom = geometry.type;
            const coords = geometry.coordinates.map(c => fromLonLat(c));
            let olgeo;
            if (type_geom == "Point") {
                olgeo = new Point(coords);
            } else if (type_geom == "LineString") {
                olgeo = new LineString(coords);
            }
            else if (type_geom == "Polygon") {
                olgeo = new Polygon([coords]);
            }
            const olFeature = new Feature({
                geometry: olgeo,
                ...properties
            });
            olFeature.setStyle(styleDeactive);
            vectorSource.addFeature(olFeature);

            tableData.push({
                id_inner: properties.id_inner,
                project: formaterText(properties.project),
                emisid: formaterText(properties.emisid),
                abatimiento: abVector[properties.id_inner] || 0,
                emision: emVector[properties.id_inner] || 0,
                type_geom: type_geom,
                coords: coords,
                olFeature: olFeature,
            });
            table.setData(tableData);
        });

        // Click en row
        table.on("rowSelected", (row) => {
            const id_inner = row.getData().id_inner;
            const feature = tableData.find(f => f.id_inner === id_inner).olFeature;
            feature.setStyle(styleActive);
        });
        table.on("rowDeselected", (row) => {
            const id_inner = row.getData().id_inner;
            const feature = tableData.find(f => f.id_inner === id_inner).olFeature;
            feature.setStyle(styleDeactive);
        });

        // // Click en la tabla pero NO en una fila
        // tableHtml.addEventListener("click", function (e) {
        //     // Elemento dom clickeado e sobre el target html para un ancestro mas cercano
        //     if (!e.target.closest(".tabulator-row")) {
        //         table.deselectRow();
        //         vectorSource.forEachFeature((feature) => {
        //             feature.setStyle(styleDeactive);
        //         });
        //     }
        // });
    }

    // Funcionalidad para cargar datos
    loadButton.addEventListener('click', async () => {
        if (state.variable) {
            table.getRows().forEach((row) => {
                const data = row.getData();
                const id_inner = data.id_inner;
                const abValue = parseFloat(data.abatimiento);
                const emValue = parseFloat(data.emision);
                state.currentData.abVector[id_inner] = isNaN(abValue) ? 0 : abValue;
                state.currentData.emVector[id_inner] = isNaN(emValue) ? 0 : emValue;
            });
            state.dispatchEvent(new CustomEvent('change:frame'));
            document.dispatchEvent(new CustomEvent('serie:start'));
        } else {
            alert("Seleccione una especie para generar el escenario");
        }
        
    });
    // Funcionalidad para descargar CSV
    downloadButton.addEventListener('click', async () => {
        if (state.variable) {
            table.download("csv", "table_data.csv");
        } else {
            alert("Primero seleccione una especie");
        }
    });
    // Funcionalidad con Enter
    document.addEventListener('keydown', function (event) {
        if (event.key === 'Enter') {
            event.preventDefault(); 
            loadButton.click();
        }
    });
    
    document.addEventListener('table:clean', () => {
        table.setData([]);
        tableData = [];
        vectorSource.clear();
    });
    
    document.addEventListener('table:start', () => {
        table.setData([]);
        tableData = [];
        vectorSource.clear();
        if (state.variable) {
            let geoJsonSources = state.currentData.geoJsonSources;
            let abVector = state.currentData.abVector;
            let emVector = state.currentData.emVector;
            setSources(geoJsonSources, abVector, emVector);
        }
    });

    return [tableHtml, loadButton, downloadButton];
}

export { tableGenerator };

