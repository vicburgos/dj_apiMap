import ndarray from 'ndarray'
import interpolate from 'ndarray-linear-interpolate/interp.js';
import { safeFetch } from '../utils/Fetch.js';

function structureArray(nx, ny, Z) {
    // Interpolates a curve defined by a collection of points.
    // point_collection is an array of points defining the curve.
    const grid = ndarray(new Float64Array(nx * ny), [nx, ny]);
    for (let i = 0; i < nx; i++) {
        for (let j = 0; j < ny; j++) {
            grid.set(i, j, Z[j * nx + i]);
        }
    }
    return grid;
}

async function getData(domain, instance, var_name) {
    const apiUrl = `/api/data/?domain=${domain}&instance=${instance}&variable=${var_name}`;

    let response;
    try {
        response = await safeFetch(apiUrl);
    } catch (error) {
        console.error("Error fetching data:", error);
        return null;
    }

    const buffer = await response.arrayBuffer();
    const headerJSON = response.headers.get('X-Header');
    const metadata = JSON.parse(headerJSON);

    //Descomponemos metadata
    const {
        nt,
        nv,
        nz,
        ny,
        nx,
        attrs,
        compress,
    } = metadata;

    // Decodificamos el buffer segun tipo
    const valuesToReturn =
        compress == 'uint8' ? new Uint8Array(buffer) :
            compress == 'float16' ? new Float16Array(buffer) :
                new Float32Array(buffer);

    // Coordenadas
    const apiUrlXX = `/api/data/?domain=${domain}&instance=${instance}&variable=${attrs['coordx']}`;
    const responseXX = await safeFetch(apiUrlXX);
    const bufferXX   = await responseXX.arrayBuffer();
    const headersXX  = responseXX.headers.get('X-Header');
    const metadataXX = JSON.parse(headersXX);
    const valuesToReturnXX =
        metadataXX.compress == 'uint8' ? new Uint8Array(bufferXX).slice(0, metadataXX.nx * metadataXX.ny) :
            metadataXX.compress == 'float16' ? new Float16Array(bufferXX).slice(0, metadataXX.nx * metadataXX.ny) :
                new Float32Array(bufferXX).slice(0, metadataXX.nx * metadataXX.ny);

    const apiUrlYY = `/api/data/?domain=${domain}&instance=${instance}&variable=${attrs['coordy']}`;
    const responseYY = await safeFetch(apiUrlYY);
    const bufferYY   = await responseYY.arrayBuffer();
    const headersYY  = responseYY.headers.get('X-Header');
    const metadataYY = JSON.parse(headersYY);
    const valuesToReturnYY =
        metadataYY.compress == 'uint8' ? new Uint8Array(bufferYY).slice(0, metadataYY.nx * metadataYY.ny) :
            metadataYY.compress == 'float16' ? new Float16Array(bufferYY).slice(0, metadataYY.nx * metadataYY.ny) :
                new Float32Array(bufferYY).slice(0, metadataYY.nx * metadataYY.ny);

    // Creamos proyeccion
    const ZLON = structureArray(
        nx,
        ny,
        [...valuesToReturnXX]
    );
    const ZLAT = structureArray(
        nx,
        ny,
        [...valuesToReturnYY]
    );

    const proj_ij_to_lonlat = (x, y) => {
        // Si x e y superan los extremos, cambiar por el extremo
        if (x < 0) x = 0;
        if (x > nx - 1) x = nx - 1;
        if (y < 0) y = 0;
        if (y > ny - 1) y = ny - 1;
        return [interpolate(ZLON, x, y), interpolate(ZLAT, x, y)]
    }

    const proj_lonlat_to_ij = (lon, lat) => {
        // Buscamos entre todas las posibilidades 
        let x = 0;
        let y = 0;
        let minDist = Infinity;
        for (let i = 0; i < nx; i++) {
            for (let j = 0; j < ny; j++) {
                const [lon_i, lat_i] = proj_ij_to_lonlat(i, j);
                const dist = Math.sqrt(Math.pow(lon - lon_i, 2) + Math.pow(lat - lat_i, 2));
                if (dist < minDist) {
                    minDist = dist;
                    x = i;
                    y = j;
                }
            }
        }
        return [x, y];
    }

    // Función para obtener un slice 2D de los datos (t, v, z) -> (ny, nx)
    function valuesApi(t, v, z) {
        const start = (t * nv * nz * ny * nx) + (v * nz * ny * nx) + (z * ny * nx);
        const end = start + (ny * nx);
        return valuesToReturn.subarray(start, end);
    }

    /////////////// Variables Espaciales-End
    // Vectores para combinacion lineal en [v]
    let abVector =
        compress == 'uint8' ? new Uint8Array(nv) :
            compress == 'float16' ? new Float16Array(nv) :
                new Float32Array(nv);
    let emVector =
        compress == 'uint8' ? new Uint8Array(nv) :
            compress == 'float16' ? new Float16Array(nv) :
                new Float32Array(nv);
    // Valores basicos para combinacion lineal
    // Esta eleccion permite mostrar solo la primera variable por defecto (v=0) 
    abVector[0] = 0;
    emVector[0] = 1;

    let geoJsonSources = {
        "type": "FeatureCollection",
        "features": []
    };
    if (var_name.match(new RegExp("species"))) {
        let species = var_name.split('_')[0];
        let dataSources = await safeFetch(`
            /api/sources/?&domain=${domain}&instance=${instance}&species=${species}
        `);
        // Agregamos los features al geoJsonSources
        let dataSourcesJSON = await dataSources.json();
        geoJsonSources.features = dataSourcesJSON.features;
        abVector[0] = 0;
        emVector[0] = 2000;
    }
    /////////////// Variables Espaciales-End

    return {
        nt: nt,
        nv: nv,
        nz: nz,
        ny: ny,
        nx: nx,
        compress: compress,
        attrs: attrs,
        values: valuesToReturn,
        valuesApi: valuesApi,
        valuesXX: valuesToReturnXX,
        valuesYY: valuesToReturnYY,
        proj_ij_to_lonlat: proj_ij_to_lonlat,
        proj_lonlat_to_ij: proj_lonlat_to_ij,

        // Variables Espaciales
        abVector: abVector,
        emVector: emVector,
        geoJsonSources: geoJsonSources,
    };
}

/**
 * Esta funcion extiende a getData para agregar data sobre el eje [v] 
 */
async function getDataPowerV(domain, instance, var_name) {

    const data = await getData(domain, instance, var_name);
    if (!var_name.match(new RegExp("species"))) {
        // Si no es species, no hacemos nada especial
        return data;
    }
    const {
        nt,
        nv,
        nz,
        ny,
        nx,
        compress,
        attrs,
        values: valuesToReturn,
        valuesApi,
        valuesXX,
        valuesYY,
        proj_ij_to_lonlat,
        proj_lonlat_to_ij,

        // Variables Espaciales
        abVector,
        emVector,
        geoJsonSources,
    } = data;

    // Agregamos emisiones por cada Fuente
    // Es decir, nv debe actualizarse en funcion de la cantidad de emisiones
    // Las emisiones por fuente las obtenemos en 
    // /api/emissions/?&domain=${domain}&instance=${instance}&species=${species}&source=${source}

    const geoJsonSources_new = {
        "type": "FeatureCollection",
        "features": []
    };

    let indexCounter = 0;
    geoJsonSources.features.forEach(async (feature) => {
        const source = feature.properties.emisid;
        // Obtenemos las emisiones para esta fuente
        // Notar que la respuesta es un array de emisiones
        // let dataEmissions = await safeFetch(`
        //     /api/emissions/?&domain=${domain}&instance=${instance}&species=${species}&source=${source}
        // `);
        // let dataEmissionsJSON = await dataEmissions.json();
        // let emissions = dataEmissionsJSON.emissions;

        // TODO: Quitar esta linea cuando este el API
        // Emulamos respuesta
        let emissions = ['descarga', 'combustion']; 

        if (emissions.length > 0) {
            emissions.forEach((emission) => {
                // Agregamos al nuevo geoJsonSources la misma feature pero con id_inner distinto
                // sera id_inner_new = indexCounter
                let newFeature = JSON.parse(JSON.stringify(feature)); // TODO: Revisar si es necesario
                newFeature.properties.id_inner_new = indexCounter;
                newFeature.properties.emission = emission;
                geoJsonSources_new.features.push(newFeature);
                indexCounter += 1;
            });
        } else {
            // Si no hay emisiones, agregamos la fuente original simplemente
            let newFeature = JSON.parse(JSON.stringify(feature)); 
            newFeature.properties.id_inner_new = indexCounter;
            newFeature.properties.emission = "unknown";
            geoJsonSources_new.features.push(newFeature);
            indexCounter += 1;
        }
    });

    // Generamos los nuevos parametros
    const nv_new = indexCounter;
    function valuesApi_new(t, v, z) {
        const v_old = geoJsonSources_new.features[v].properties.id_inner;
        return valuesApi(t, v_old, z);
    }
    let abVector_new =
        compress == 'uint8' ? new Uint8Array(nv_new) :
            compress == 'float16' ? new Float16Array(nv_new) :
                new Float32Array(nv_new);
    let emVector_new =
        compress == 'uint8' ? new Uint8Array(nv_new) :
            compress == 'float16' ? new Float16Array(nv_new) :
                new Float32Array(nv_new);

    abVector_new[0] = 0;
    emVector_new[0] = 2000;

    return {
        nt: nt,
        nv: nv_new,
        nz: nz,
        ny: ny,
        nx: nx,
        compress: compress,
        attrs: attrs,
        values: valuesToReturn,
        valuesApi: valuesApi_new,
        valuesXX: valuesXX,
        valuesYY: valuesYY,
        proj_ij_to_lonlat: proj_ij_to_lonlat,
        proj_lonlat_to_ij: proj_lonlat_to_ij,
        
        // Variables Espaciales
        abVector: abVector_new,
        emVector: emVector_new,
        geoJsonSources: geoJsonSources_new,
    }
}


export { getData, getDataPowerV };
