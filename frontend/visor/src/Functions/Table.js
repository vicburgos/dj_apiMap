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
    // Primera letra con mayuscula y separar palabras por _
    let words = text.split('_');
    for (let i = 0; i < words.length; i++) {
        words[i] = words[i].charAt(0).toUpperCase() + words[i].slice(1);
    }
    return words.join(' ');
}

function tableGenerator(context, state, map) {
    const styleButton = {
        fontSize: '10px',
        fontWeight: 'bold',
        userSelect: 'none',
        fontFamily: 'Arial, sans-serif',
        height: '30px',
        minWidth: '110px',
        maxWidth: '300px',
        width: '100%',
        marginTop: '5px',
        marginBottom: '5px',
        alignSelf: 'center',
    };
    const buttonApplySetDataSources = document.createElement('button');
    buttonApplySetDataSources.textContent = "Aplicar Datos";
    buttonApplySetDataSources.title = "Actualiza los datos de la tabla para generar un escenario";
    buttonApplySetDataSources.classList.add('btn', 'btn-secondary')
    Object.assign(buttonApplySetDataSources.style, styleButton);
    const buttonLoad = document.createElement('button');
    buttonLoad.textContent = "Cargar Datos**";
    buttonLoad.title = "Carga datos desde un archivo CSV";
    buttonLoad.id = "load-data";
    buttonLoad.classList.add('btn', 'btn-secondary')
    Object.assign(buttonLoad.style, styleButton);
    const buttonDownload = document.createElement('button');
    buttonDownload.textContent = "Descargar Tabla";
    buttonDownload.title = "Descarga los datos de la tabla en un archivo CSV";
    buttonDownload.id = "download-csv";
    buttonDownload.classList.add('btn', 'btn-secondary')
    Object.assign(buttonDownload.style, styleButton);

    const tableContainer = document.createElement('div');
    Object.assign(tableContainer.style, {
        width: "100%",
        fontSize: "14px",
        userSelect: "none",
    });

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
    const table = new Tabulator(tableContainer, {
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
            { title: "Faena",  field: "project", width: 80},
            { title: "Fuente", field: "emisid",  width: 70, headerSort: false},
            { title: "Tipo",   field: "type",    width: 70, headerSort: false},
            { title: "Abatimiento (%)", field: "abatimiento", sorter: "number", hozAlign: "left", editor: "input", editor: true, validator: ["min:0", "max:100", "numeric"] },
            { title: "Emisión (kg/día)", field: "emision", sorter: "number", hozAlign: "left", editor: "input", editor: true, validator: ["min:0", "max:10000"] },
        ],
    });

    function setTableAndMapSources(active = true) {
        // Limpiar tabla y mapa
        table.setData([]);
        tableData = [];
        vectorSource.clear();
        if (!active) {
            return;
        }
        // Generar tabla y mapa si active es true
        let geojson = state.currentData.geoJsonSources;
        let abVector = state.currentData.abVector;
        let emVector = state.currentData.emVector;
        geojson.features.forEach((feature, idx) => {
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
                id_inner: idx,
                project: formaterText(properties.project),
                emisid: formaterText(properties.emisid),
                type: formaterText(properties.emission),
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
    }

    function setDataSources() {
        table.getRows().forEach((row) => {
            const data = row.getData();
            const id_inner = data.id_inner;
            const abValue = parseFloat(data.abatimiento);
            const emValue = parseFloat(data.emision);
            state.currentData.abVector[id_inner] = isNaN(abValue) ? 0 : abValue;
            state.currentData.emVector[id_inner] = isNaN(emValue) ? 0 : emValue;
        });
    }

    return { 
        tableContainer,
        table,
        buttonApplySetDataSources,
        buttonLoad,
        buttonDownload, 
        setTableAndMapSources, 
        setDataSources 
    };
}

export { tableGenerator };

