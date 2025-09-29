// Manejar Borde del dominio y Zoom

import Feature from 'ol/Feature';
import { Vector as VectorSource } from 'ol/source';
import VectorLayer from 'ol/layer/Vector';
import { fromLonLat } from 'ol/proj';
import { Fill, Style, Stroke } from 'ol/style'
import { LineString, Polygon } from 'ol/geom';
import { transformExtent } from 'ol/proj';
import { offset } from 'highcharts';


async function domainGenerator(context, state, map) {

    const vectorSource = new VectorSource();
    const lineFeature = new Feature();
    const domainLayer = new VectorLayer({
        source: vectorSource,
    });

    async function setViewDomain(waitOption=false) {
        // TODO: Hard Code
        const codeSubStringName = "lon"; // Solo como referencia para view
        let varReference = state.variables.find(
            v => v.includes(codeSubStringName)
        );
        const Data = await state.loadData(state.domain, state.instance, varReference);
        if (!Data) {
            console.warn("La carga de datos para el dominio ha fallado");
            return;
        }
        const nx = Data.nx;
        const ny = Data.ny;
        const valuesLon = Data.valuesXX;
        const valuesLat = Data.valuesYY;

        // Creamos bordes
        const borderCoords = [];
        for (let i = 0; i < nx; i++) {   //Inferior
            let j = 0;
            borderCoords.push([
                valuesLon[j*nx + i],
                valuesLat[j*nx + i], 
            ]);
        }
        for (let j = 0; j < ny; j++) {  //Derecho
            let i = nx - 1;
            borderCoords.push([
                valuesLon[j*nx + i],
                valuesLat[j*nx + i], 
            ]);
        }
        for (let i = 0; i < nx; i++) {  //Superior
            let j = ny - 1;
            borderCoords.push([
                valuesLon[j*nx  + nx - 1 - i],
                valuesLat[j*nx + nx - 1 - i], 
            ]);
        }
        for (let j = 0; j < ny; j++) {  //Izquierdo
            let i = 0;
            borderCoords.push([
                valuesLon[(ny - 1 - j)*nx + i],
                valuesLat[(ny - 1 - j)*nx + i], 
            ]);
        }

        // Crear el poligono
        let lineCoords = borderCoords.map(([lon, lat]) => fromLonLat([lon, lat]));
        lineFeature.setGeometry(new Polygon([lineCoords]));

        //Generar un poligono con fill gris
        lineFeature.setStyle(new Style({
            // stroke: new Stroke({
            //     color: 'rgba(100, 100, 100, 1)',
            //     width: 3,
            // }),
            // fill: new Fill({
            //     color: 'rgba(0, 0, 0, 0.1)',
            // }),
        }));

        vectorSource.clear();
        vectorSource.addFeature(lineFeature);

        // SET VIEW
        let minLAT     = Math.min(...borderCoords.map(coord => coord[1]));
        let minLON     = Math.min(...borderCoords.map(coord => coord[0]));
        let maxLAT     = Math.max(...borderCoords.map(coord => coord[1]));
        let maxLON     = Math.max(...borderCoords.map(coord => coord[0]));

        let extent = [minLON, minLAT, maxLON, maxLAT];

        // 2. Transformar el extent a EPSG:3857
        let extentTransformed = transformExtent(extent, 'EPSG:4326', 'EPSG:3857');

        // 3. Obtener el nivel de zoom basado en el extent
        const timeAnimation = 1000;
        map.getView().fit(extentTransformed, { 
            size: map.getSize(),
            padding: [50, 50, 70, 50],
            duration: timeAnimation,
        });

        // Generamos una pausa artificial para esperar a que termine la animacion
        if (waitOption) {
            document.dispatchEvent(new CustomEvent('domainChanged:start'));
            await new Promise(resolve => setTimeout(resolve, timeAnimation));
            document.dispatchEvent(new CustomEvent('domainChanged:end'));
        }
    }

    return {domainLayer, setViewDomain};
}
export { domainGenerator };