import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import Collection from 'ol/Collection';
import Feature from 'ol/Feature';
import { Icon, Style } from 'ol/style';
import { fromLonLat } from 'ol/proj';
import { SwitchFactory } from '../../utils/SwitchOnOFF/0_SwitchContainer.js';
import { Point } from 'ol/geom';

function triangleGenerator(colorWind) {
    let triangleUrl = 'data:image/svg+xml;utf8,' + encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20">
            <polygon points="10,20 6,0 14,0" fill="${colorWind}"/>
        </svg>
    `);
    return triangleUrl;
}

function windGenerator(context, state) {
    //
    const scaleTriangle = 0.8;
    //// OL
    const features = new Collection();
    const vectorSource = new VectorSource();
    vectorSource.addFeatures(features);

    const vectorLayerWind = new VectorLayer({
        source: vectorSource,
        visible: false,
        opacity: 0.7,
        updateWhileInteracting: true,
        updateWhileAnimating: true,
    });

    let LoadWind = true;
    async function setGrid(active=true) {
        if (!active) {
            features.clear();
            return;
        }
        // TODO: Hard Code
        const codeSubStringName = "ld_v10"; // Como referencia
        let varReference = state.variables.find(
            v => v.includes(codeSubStringName)
        );
        const Data = await state.loadData(state.domain, state.instance, varReference);
        if (!Data) {
            LoadWind = false;
            return;
        }
        LoadWind = true;
        const LON = Data.valuesXX
        const LAT = Data.valuesYY
        features.clear();
        LON.map((_, index) => {
            const feature = new Feature({
                geometry: new Point(fromLonLat([LON[index], LAT[index]])),
            });
            features.push(feature);
        });
    }

    let colorWind = 'rgba(255, 255, 255, 1)';
    async function setWind(active=true) {
        if (!active || !LoadWind) {
            vectorSource.clear();
            return;
        }
        // TODO: Hard Code
        const varReference_v10 = "ld_v10"; 
        const varReference_u10 = "ld_u10";
        let windx = state.variables.find(
            v => v.includes(varReference_v10)
        );
        let windy = state.variables.find(
            v => v.includes(varReference_u10)
        );
        const windxData = await state.loadData(state.domain, state.instance, windx);
        const windyData = await state.loadData(state.domain, state.instance, windy);

        if (!windxData || !windyData) {
            switchWindHtml.querySelector('input').checked = false;
            console.warn("La variable de viento no se encuentra disponible");
        }

        let maxExpectedSpeed = Math.sqrt(
            Math.pow(windxData.attrs.vmax, 2) +
            Math.pow(windyData.attrs.vmax, 2)
        );
        maxExpectedSpeed = 10;

        const U = windxData.valuesApi(state.frame, 0, state.level);
        const V = windyData.valuesApi(state.frame, 0, state.level);

        vectorSource.clear();
        U.map((_, index) => {
            const angle = Math.atan2(-U[index], -V[index]);
            const magnitude = Math.sqrt(U[index] * U[index] + V[index] * V[index]);
            const scale = 0.05 + 0.95 * Math.min(magnitude / maxExpectedSpeed, 1);
            let feature = features.array_[index];
            
            feature.setStyle(new Style({
                image: new Icon({
                    src: triangleGenerator(colorWind),
                    rotation: angle,
                    rotateWithView: true,
                    scale: scale*scaleTriangle,
                })
            }));
            vectorSource.addFeature(feature);
        });
    }

    // state.addEventListener('change:instance', async () => {
    //     switchWindHtml.querySelector('input').checked
    //         ? await (setGrid, setWind()) :
    //         null
    // });

    // state.addEventListener('change:frame', async () => {
    //     switchWindHtml.querySelector('input').checked
    //         ? await setWind() :
    //         null
    // });

    //// HTML
    const switchWindHtml = SwitchFactory.create('switch-wind', 'Viento');
    switchWindHtml.querySelector('input').addEventListener('click', async () => {
        switchWindHtml.querySelector('input').checked
            ? (await setGrid(), await setWind(), vectorLayerWind.setVisible(true))
            : vectorLayerWind.setVisible(false);
    });

    window.addEventListener('darkMode', async  (event) => {
        if (event.detail === true) {
            colorWind = 'white';
            switchWindHtml.querySelector('input').checked
                ? await setWind()
                : null;
        } else {
            colorWind = 'dodgerblue';
            switchWindHtml.querySelector('input').checked
                ? await setWind()
                : null;
        }
    });

    return [switchWindHtml, vectorLayerWind, setWind, setGrid];
}

export { windGenerator };