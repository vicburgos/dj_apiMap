import 'ol/ol.css';
import VectorLayer from 'ol/layer/Vector.js';
import VectorSource from 'ol/source/Vector.js';
import GeoJSON from 'ol/format/GeoJSON.js';
import { Style, Fill, Stroke, Circle as CircleStyle, Text } from 'ol/style.js';
import { SwitchFactory } from '../../utils/SwitchOnOFF/0_SwitchContainer.js';

function placesGenerator(context) {
    //// OL
    const data = context.places;
    const vectorSource = new VectorSource({
        features: new GeoJSON().readFeatures(data, {
            featureProjection: 'EPSG:3857' // Proyección del mapa (Web Mercator)
        })
    });
    const estiloClaro = new Style({
        image: new CircleStyle({
            radius: 4,
            fill: new Fill({ color: 'black' }),
            stroke: new Stroke({ color: 'white', width: 1 })
        }),
        text: new Text({
            font: '14px Calibri,sans-serif',
            fill: new Fill({ color: 'black' }),
            stroke: new Stroke({ color: 'white', width: 2 }),
            offsetY: -8,
            offsetX: 8,
            textAlign: 'left',
            textBaseline: 'middle',
        })
    });
    const estiloOscuro = new Style({
        image: new CircleStyle({
            radius: 4,
            fill: new Fill({ color: 'white' }),
            stroke: new Stroke({ color: 'black', width: 1 })
        }),
        text: new Text({
            font: '14px Calibri,sans-serif',
            fill: new Fill({ color: 'white' }),
            stroke: new Stroke({ color: 'black', width: 2 }),
            offsetY: -8,
            offsetX: 8,
            textAlign: 'left',
            textBaseline: 'middle',
        })
    });

    const vectorLayerLabels = new VectorLayer({
        source: vectorSource,
        style: (feature) => {
            // By default, use claro style
            const style = estiloClaro.clone();
            style.getText().setText(feature.get('name')); // cambia 'name' por la propiedad real
            return style;
        },
        visible: false,
    });
    window.addEventListener('darkMode', (event) => {
        if (event.detail === true) {
            vectorLayerLabels.setStyle((feature) => {
                const style = estiloOscuro.clone();
                style.getText().setText(feature.get('name')); // cambia 'name' por la propiedad real
                return style;
            });
        } else {
            vectorLayerLabels.setStyle((feature) => {
                const style = estiloClaro.clone();
                style.getText().setText(feature.get('name')); // cambia 'name' por la propiedad real
                return style;
            });
        }
    });

    //// HTML
    const switchLabelsHtml = SwitchFactory.create('switch-labels', 'Etiquetas');
    switchLabelsHtml.querySelector('input').addEventListener('click', () => {
        switchLabelsHtml.querySelector('input').checked
            ? vectorLayerLabels.setVisible(true)
            : vectorLayerLabels.setVisible(false);
    });

    return [switchLabelsHtml, vectorLayerLabels]
}

export { placesGenerator };
