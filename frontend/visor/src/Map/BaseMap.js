import 'ol/ol.css';
import Map from 'ol/Map';
import View from 'ol/View';
import { fromLonLat } from 'ol/proj';
import { Attribution, Control } from 'ol/control';
import { MouseWheelZoom, DragPan } from 'ol/interaction';
import { platformModifierKeyOnly } from 'ol/events/condition';

import { background } from './Layers/Background.js';
import { placesGenerator } from './Layers/Places.js';
import { contourGenerator } from './Layers/Contour.js';
import { windGenerator } from './Layers/Wind.js';
import { domainGenerator } from './Layers/Domain.js';
import { setupMousePosition } from './Widget/MousePosition.js';
import { setupPopup } from './Widget/Popup.js';


async function mapGenerator(context, state) {

    const mapContainer = document.createElement('div');
    mapContainer.id = 'map';
    const layersBackground = [
        background.white,
        background.black,
        background.satellite,
        background.openStreet,
    ]

    const map = new Map({
        target: mapContainer,
        layers: layersBackground.concat([background.topo]),
        controls: [],
    });

    // Remove Atributtions
    map.getControls().forEach(function (control) {
        if (control instanceof Attribution) {
            map.removeControl(control);
        }
    });
    // // Remove Interaction
    // map.getInteractions().forEach(function (interaction) {
    //     if (interaction instanceof MouseWheelZoom || interaction instanceof DragPan) {
    //         map.removeInteraction(interaction);
    //     }
    // });
    // // Agregamos un MouseWheelZoom que solo se activa con Ctrl
    // map.addInteraction(new MouseWheelZoom({
    //     condition: platformModifierKeyOnly,
    //     duration: 250
    // }));
    // // Agregamos un DragPan que solo se activa con Ctrl
    // map.addInteraction(new DragPan({
    //     condition: platformModifierKeyOnly,
    //     kinetic: null, // Desactivamos la inercia
    // }));

    // Agregamos domainLayer
    const [domainLayer, setBorder] = await domainGenerator(context, state, map);
    map.addLayer(domainLayer);
    domainLayer.setZIndex(1);
    
    // Agregamos contourLayer and colormap
    const [contourLayer, colorMapContainer, setContour, setColorbar] = contourGenerator(context, state, map);
    Object.assign(colorMapContainer.style, {
        position: 'absolute',
        bottom: '40px',
        right: '10px',
    });
    mapContainer.appendChild(colorMapContainer);
    map.addLayer(contourLayer);
    contourLayer.setZIndex(2);   

    // Agregamos Switch-Places
    const [switchLabelsHtml, vectorLayerLabels] = placesGenerator(context, map);
    map.addLayer(vectorLayerLabels);
    vectorLayerLabels.setZIndex(4);
    switchLabelsHtml.querySelector('input').click();

    // Agregamos Switch-Viento
    const [switchWindHtml, vectorLayerWind, setWind, setGrid] = windGenerator(context, state);
    map.addLayer(vectorLayerWind);
    vectorLayerWind.setZIndex(3);

    // Switches Wrap
    const wrapperSwitch = document.createElement('div');
    Object.assign(wrapperSwitch.style, {
        position: 'absolute',
        bottom: '120px',
        right: '10px',
        color: 'black',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        gap: '8px',
    });
    wrapperSwitch.id = 'switches';
    mapContainer.appendChild(wrapperSwitch);
    wrapperSwitch.appendChild(switchWindHtml);
    wrapperSwitch.appendChild(switchLabelsHtml);

    // Agregamos Mouse
    const mouseContainer = setupMousePosition(map)
    Object.assign(mouseContainer.style, {
        width: '100px',
        position: 'absolute',
        bottom: '70px',
        right: '10px',
    });
    mapContainer.appendChild(mouseContainer);
    
    // Agregamos Popup
    const [pointSerieTrigger] = setupPopup(context, state, map);

    //// TODO: Modular
    // Agregamos selector de capa
    const select = document.createElement('select');
    select.id = 'layer-selector';
    select.title = 'Selecciona una capa';
    Object.assign(select.style, {
        userSelect: 'none',
        width: '100px',
        border: '0px',
        backgroundColor: 'transparent',
    });
    // Agregamos opciones segun layersBackground
    layersBackground.forEach((layer, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.dark = layer.get('dark') || false; // Agregamos dark si existe
        option.textContent = layer.get('name') || `Layer ${index + 1}`;
        select.appendChild(option);
    });
    // Agregamos change
    select.addEventListener('change', (event) => {
        const selectedLayerIndex = parseInt(event.target.value);
        const darkModeOption = event.target.selectedOptions[0].dark;
        window.dispatchEvent(new CustomEvent('darkMode', { detail: darkModeOption }));
        layersBackground.forEach((layer, index) => {
            index === selectedLayerIndex 
                ? layer.setVisible(true)
                : layer.setVisible(false);
        });
    });
    // Select default layer
    select.dispatchEvent(new Event('change'));
    const wrapperSelectLayer = document.createElement('div');
    Object.assign(wrapperSelectLayer.style, {
        display: 'flex',
        flexDirection: 'row',
        gap: '5px',
        alignItems: 'center',
        paddingLeft: '5px',
        paddingRight: '5px',
        fontSize: '13px',
        height: '25px',

        backgroundColor: 'rgba(255, 255, 255, 1)',
        userSelect: 'none',
        borderRadius: "5px",
        border: "1.5px solid rgb(118, 118, 118)",
    });
    const iconSelect = document.createElement('i');
    iconSelect.classList.add("bi", "bi-stack");
    wrapperSelectLayer.appendChild(iconSelect);
    wrapperSelectLayer.appendChild(select);
    ////End-TODO: Modular


    //// Manejo de Estados del tipo set
    state.addEventListener('change:domain', async () => {
        await state.loadInstances();
        await setBorder({waitOption:true});
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
        if (state.variable) {
            await state.setCurrentData();
            document.dispatchEvent(new CustomEvent('table:start'));
            document.dispatchEvent(new CustomEvent('serie:start'));
            setContour();
            setColorbar();
        } else {
            setColorbar(false);
            setContour(false);
            document.dispatchEvent(new CustomEvent('table:clean'));
            document.dispatchEvent(new CustomEvent('serie:clean'));
        }
    });
    state.addEventListener('change:frame', async () => {
        if (state.variable) {
            setContour();
        } else {
            setContour(false);
        }
        switchWindHtml.querySelector('input').checked
            ? await setWind() :
            null
    });

    //Inicializacion
    // Ahora renderizar el mapa
    map.render();
    map.once('postrender', async () => {
        await setBorder();
        await state.setCurrentData();
        setContour();
        setColorbar();
        const {lon, lat} = context.pointSerieDefault;
        pointSerieTrigger(lon, lat);
        document.dispatchEvent(new CustomEvent('table:start'));
    });
    
    return { mapContainer, map, wrapperSelectLayer }
}

export { mapGenerator };



