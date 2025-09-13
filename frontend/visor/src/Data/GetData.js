import ndarray from 'ndarray'
import interpolate from 'ndarray-linear-interpolate/interp.js';

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

export async function getData(domain, instance, var_name) {
    const apiUrl = `/api/data/?domain=${domain}&instance=${instance}&variable=${var_name}`;
    let response = await fetch(apiUrl);
    if (!response.ok) {
        return null
    }
    const buffer = await response.arrayBuffer();
    const headerJSON = response.headers.get('X-Header');
    const metadata = JSON.parse(headerJSON);

    //Destructurar los valores
    const {
        nt,
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
    const responseXX = await fetch(apiUrlXX);
    const bufferXX = await responseXX.arrayBuffer();
    const headerJSONXX = response.headers.get('X-Header');
    const metadataXX = JSON.parse(headerJSONXX);
    const valuesToReturnXX = new Float32Array(bufferXX)

    const apiUrlYY = `/api/data/?domain=${domain}&instance=${instance}&variable=${attrs['coordy']}`;
    const responseYY = await fetch(apiUrlYY);
    const bufferYY = await responseYY.arrayBuffer();
    const headerJSONYY = response.headers.get('X-Header');
    const metadataYY = JSON.parse(headerJSONYY);
    const valuesToReturnYY = new Float32Array(bufferYY)

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
        // Si x e y superar los extremos, cambiar por el extremo
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

    // Función para obtener un slice 2D de los datos (t, z) -> (ny, nx)
    function valuesApi(t, z) {
        const start = (t * nz * ny * nx) + (z * ny * nx);
        const end = start + (ny * nx);
        return valuesToReturn.subarray(start, end);
    }

    /////////////// Variables Espaciales "species"
    let geoJsonSources;
    const regularExpressionFilter = new RegExp("species");
    if (var_name.match(regularExpressionFilter)) {
        let species = var_name.split('_')[0]
        let dataSources = await fetch(`/api/sources/?&domain=${domain}&instance=${instance}&species=${species}`);
        geoJsonSources = await dataSources.json();
    } else {
        // Generamos geojson vacio
        geoJsonSources = {
            "type": "FeatureCollection",
            "features": []
        };
    }
    // Obtener los project existentes como properties de cada feature
    let projects = [...new Set(geoJsonSources.features.map(f => f.properties.project))];    
    let abVector =
        compress == 'uint8' ? new Uint8Array(nz) :
            compress == 'float16' ? new Float16Array(nz) :
                new Float32Array(nz);
    let emVector =
        compress == 'uint8' ? new Uint8Array(nz) :
            compress == 'float16' ? new Float16Array(nz) :
                new Float32Array(nz);
    // Dafault Values. A simple linear combination
    if (var_name.match(regularExpressionFilter)) {
        abVector[0] = 0;
        emVector[0] = 5000;
    } else {
        abVector[0] = 0;
        emVector[0] = 1;
    }
    /////////////// Variables Espaciales-End

    return {
        nt: nt,
        nz: nz,
        ny: ny,
        nx: nx,
        attrs: attrs,
        values: valuesToReturn,
        compress,
        valuesApi: valuesApi,
        proj_ij_to_lonlat: proj_ij_to_lonlat,
        proj_lonlat_to_ij: proj_lonlat_to_ij,
        valuesXX: valuesToReturnXX,
        valuesYY: valuesToReturnYY,
        geoJsonSources: geoJsonSources,
        projects: projects,
        abVector: abVector,
        emVector: emVector,
    };
}