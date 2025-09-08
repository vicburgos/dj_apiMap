import 'ol/ol.css';
import './stylePopup.css';
import { toLonLat, fromLonLat } from 'ol/proj.js';
import Overlay from 'ol/Overlay';
import { Popover } from 'bootstrap';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { Modify } from 'ol/interaction';
import { Feature } from 'ol';
import { Point } from 'ol/geom';
import { Select } from 'ol/interaction';
import {altKeyOnly, click, pointerMove} from 'ol/events/condition.js';
import { Circle, Fill, Stroke } from 'ol/style.js';
import { Style } from 'ol/style.js';
import { polygonContains } from 'd3-polygon';


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

function setupPopup(context, state, map) {
  map.addLayer(vectorLayer);
  map.addInteraction(modify);
  map.addInteraction(select);
  map.addOverlay(overlay);
  map.getViewport().addEventListener('contextmenu', (e) => e.preventDefault());

  function pointSerieTrigger(lon, lat) {
    pointSerie.setGeometry(new Point(fromLonLat([lon, lat])));
    if (polygonContains(context.borderCoords, [lon, lat])) {
      document.dispatchEvent(new CustomEvent('serie:start', {detail: {lon: lon, lat: lat}}));
    } else {
      alert("El punto seleccionado no contiene datos");
      document.dispatchEvent(new CustomEvent('serie:clean'));
      closePopupButton.click();
    }
  };

  map.on('contextmenu', (event) => {
    closePopupButton.click();
    let coordinate = event.coordinate;
    let [lon, lat] = toLonLat(coordinate);
    pointSerie.setGeometry(new Point(coordinate));
    if (polygonContains(context.borderCoords, [lon, lat])) {
      document.dispatchEvent(new CustomEvent('serie:start', {detail: {lon: lon, lat: lat}}));
    } else {
      alert("El punto seleccionado no contiene datos");
      document.dispatchEvent(new CustomEvent('serie:clean'));
    }
  });

  modify.on('modifyend', async (event) => {
    closePopupButton.click();
    let coordinate = event.features.item(0).getGeometry().getCoordinates();
        let [lon, lat] = toLonLat(coordinate);
    pointSerie.setGeometry(new Point(coordinate));
    closePopupButton.click();
    if (polygonContains(context.borderCoords, [lon, lat])) {
      document.dispatchEvent(new CustomEvent('serie:start', {detail: {lon: lon,lat: lat}}));
    } else {
      alert("El punto seleccionado no contiene datos");
      document.dispatchEvent(new CustomEvent('serie:clean'));
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
    coordSpan.innerHTML = `<i class="bi bi-crosshair" aria-hidden="true"></i> (${lat.toFixed(3)}, ${lon.toFixed(3)})`
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
      pointSerie.setGeometry(null);
      closePopupButton.click();
      document.dispatchEvent(new CustomEvent('serie:clean'));
    };
    contentPopup.appendChild(removeButton);
    //// Mostramos el popover
    popover.show();    
  }

  return [pointSerieTrigger];
}

export { popupContainer, setupPopup };