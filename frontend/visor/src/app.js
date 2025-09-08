//// Layout
import { createApp } from 'vue'
import App from './VueElements/Layout.vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'

const root   = document.getElementById('root')
const Layout = createApp(App).use(ElementPlus).mount(root);

// Get elements from layout
const panelMap   = document.getElementById('vue-panel-map');
const panelTable = document.getElementById('vue-panel-table');
const panelSerie = document.getElementById('vue-panel-serie');

//// Main
import { Context, State } from './Data/DataManager.js';
import { mapGenerator } from './Map/BaseMap.js'
import { tableGenerator } from './Functions/Table.js'
import { serieGenerator } from './Functions/Serie.js'
import { reproductorGenerator } from './Controls/Reproductor/Wrapper.js'
import { selectorGenerator } from './Controls/Selector/Wrapper.js';
import { Variable4SpecieSelector } from './Controls/Selector/Variable4Specie.js';


async function main() {
  // Generamos el contexto
  const context = new Context();
  await context.init();
  const state = new State(context);
  await state.init();
  window.context = context;
  window.state = state;

  // Agregamos el mapa
  const { mapContainer, map, wrapperSelectLayer } = await mapGenerator(context, state);
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
  

  // Agregamos Selector de Variable4Specie
  const variable4SpecieContainer = Variable4SpecieSelector(context, state);
  panelTable.appendChild(variable4SpecieContainer);

  // Agregamos el selector
  const selectorContainer = selectorGenerator(context, state);
  Object.assign(selectorContainer.style, {
    position: 'absolute',
    top: '10px',
    left: '10px',
  });
  mapContainer.appendChild(selectorContainer);  

  // Agregamos tabla
  const [tableHtml, loadButton, downloadButton] = await tableGenerator(context, state, map);
  const titleTable = document.createElement('h6');
  titleTable.textContent = "Fuentes Emisoras";
  titleTable.style.userSelect = 'none';
  panelTable.appendChild(titleTable);
  panelTable.appendChild(tableHtml);
  panelTable.appendChild(downloadButton);

  // Agregamos serie
  serieGenerator(context, state, map, panelSerie);

  // Agregamos el reproductor
  const reproductorContainer = reproductorGenerator(context, state);
  Object.assign(reproductorContainer.style, {
    position: 'absolute',
    bottom: '10px',
    left: '10px',
    right: '10px',
  });
  mapContainer.appendChild(reproductorContainer);
}
main();