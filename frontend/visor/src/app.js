//// Layout
import { createApp } from 'vue'
import App from './VueElements/Layout.vue'

import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'

const root = document.getElementById('root')
const Layout = createApp(App).use(ElementPlus).mount(root);

// Get elements from layout
const panelMap = document.getElementById('vue-panel-map');
const panelTable = document.getElementById('vue-panel-table');
const panelSerie = document.getElementById('vue-panel-serie');

//// Main
import { Context, State } from './Data/DataManager.js';
import { mapGenerator } from './Map/BaseMap.js'
import { tableGenerator } from './Functions/Table.js'
import { serieGenerator } from './Functions/Serie.js'
import { reproductorGenerator } from './Controls/Reproductor/Reproductor.js'
import { selectorGenerator } from './Controls/Selector/Wrapper.js';
import { Variable4SpecieSelector } from './Controls/Selector/Variable4Specie.js';

async function main() {
  /// Carga de elementos

  // Generamos el contexto
  const context = new Context();
  await context.init();
  const state = new State(context);
  await state.init();
  // TODO: para debugging, se expone context y state
  window.context = context;
  window.state = state;

  // Agregamos el mapa
  const {
    mapContainer,
    map,
    wrapperSelectLayer,
    setContour,
    setColorbar,
    setWind,
    setGrid,
    setBorder,
    switchLabelsHtml,
    switchWindHtml,
  } = await mapGenerator(context, state);

  Object.assign(mapContainer.style, {
    position: "relative",
    height: "100%",
    width: "100%",
  });
  Object.assign(wrapperSelectLayer.style, {
    position: 'absolute',
    top: '10px',
    right: '10px',
  });
  panelMap.appendChild(mapContainer);
  mapContainer.appendChild(wrapperSelectLayer);

  // Agregamos los selectores
  const variable4SpecieContainer = Variable4SpecieSelector(context, state);
  panelTable.appendChild(variable4SpecieContainer);
  const selectorContainer = selectorGenerator(context, state);
  Object.assign(selectorContainer.style, {
    position: 'absolute',
    top: '10px',
    left: '10px',
  });
  mapContainer.appendChild(selectorContainer);

  // Agregamos Table
  const {
    tableContainer,
    table,
    buttonApplySetDataSources,
    buttonLoad,
    buttonDownload,
    setTableAndMapSources,
    setDataSources
  } = tableGenerator(context, state, map);
  const titleTable = document.createElement('h6');
  titleTable.textContent = "Fuentes Emisoras";
  titleTable.style.userSelect = 'none';
  panelTable.appendChild(titleTable);
  panelTable.appendChild(tableContainer);
  const wrapperButtons = document.createElement('div');
  Object.assign(wrapperButtons.style, {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '10px',
    paddingRight: '5px',
  });
  wrapperButtons.appendChild(buttonApplySetDataSources);
  wrapperButtons.appendChild(buttonLoad);
  wrapperButtons.appendChild(buttonDownload);
  panelTable.appendChild(wrapperButtons);

  // Agregamos Serie
  const { setSerie } = serieGenerator(context, state, map, mapContainer, panelSerie);

  // Agregamos el reproductor
  const reproductorContainer = reproductorGenerator(context, state);
  Object.assign(reproductorContainer.style, {
    position: 'absolute',
    bottom: '10px',
    left: '10px',
    right: '10px',
  });
  mapContainer.appendChild(reproductorContainer);

  //// Manego de estados
  // The statement with "await" are related to load data from api server
  state.addEventListener('change:domain', async () => {
    await state.loadInstances();
    setColorbar(false);
    setContour(false);
    setGrid(false);
    setWind(false);
    setSerie(false, null, null);
    await setBorder({ waitOption: true });
    state.dispatchEvent(new CustomEvent('change:instance'));
  });
  state.addEventListener('change:instance', async () => {
    await state.loadVariables();
    switchWindHtml.querySelector('input').checked
      ? (await setGrid(), await setWind())
      : null;
    state.dispatchEvent(new CustomEvent('change:variable'));
  });
  state.addEventListener('change:variable', async () => {
    await state.setCurrentData();
    if (state.variable && state.currentData) {
      setContour();
      setColorbar();
      setSerie();
      switchWindHtml.querySelector('input').checked
        ? (await setGrid(), await setWind())
        : null;
      setTableAndMapSources();
    } else {
      setColorbar(false);
      setContour(false);
      setTableAndMapSources(false);
      setSerie(false);
    }
  });
  state.addEventListener('change:frame', async () => {
    if (state.variable && state.currentData) {
      setContour();
    } else {
      setContour(false);
    }
    switchWindHtml.querySelector('input').checked
      ? await setWind() :
      null
  });
  //Funcionalidad par aplicar cambios en tabla y mapa
  buttonApplySetDataSources.onclick = () => {
    if (state.variable && state.currentData) {
      setDataSources();
      setContour();
      setSerie();
    }
    else {
      alert("Debe seleccione una especie para generar el escenario");
    }
  };
  // Redirige el Enter al boton buttonApplySetDataSources
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Enter') {
      event.preventDefault();
      buttonApplySetDataSources.click();
    }
  });
  // Funcionalidad para descargar CSV
  buttonDownload.addEventListener('click', async () => {
    if (state.variable && state.currentData) {
      table.download("csv", "table_data.csv");
    } else {
      alert("Primero seleccione una especie");
    }
  });
  // TODO: Funcionalidad para cargar CSV
  buttonLoad.addEventListener('click', async () => {
    alert("Se implementará pronto...");
  });

  //// Inicializacion
  map.once('postrender', async () => {
    if (state.failMode) {
      return;
    }
    await setBorder();
    state.variable = context.auxiliaryVairbales["default"] || null;
    if (context.pointSerieDefault) {
      const { lon, lat } = context.pointSerieDefault;
      setSerie(true, lon, lat)
    }
    // Seteamos switches auxiliares
    switchLabelsHtml.querySelector('input').click();
  });
}

main();