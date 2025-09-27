import os
import json
import numpy as np
import xarray as xr
from pyproj import Proj, Transformer
from scipy.ndimage import zoom
from scipy.ndimage import gaussian_filter1d
from scipy.interpolate import RegularGridInterpolator
from geojson import Point, LineString, Polygon, Feature, FeatureCollection, dumps

## Load Instances
dir_root = os.listdir('.')
instances = [i for i in dir_root if os.path.isdir(i) and i.startswith('20')]

## Antucoya
domains = [
    'antucoya', 
    'codelconorte'
]

structure_template = {
    'grids':{
        'hd': { 
            'cut':{
                'x':0,
                'y':0,
            },
            'scale': {
                'dt':4,
                'dz':1,
                'dy':1.3,
                'dx':1.3,
            },
            'vars'  :['lat', 'lon', 'species'],
            'coordy' : 'lat',
            'coordx' : 'lon',
        },
        'ld': {
            'cut':{
                'x':1,
                'y':1,
            },
            'scale':{
                'dt':4,
                'dz':1,
                'dy':0.5,
                'dx':0.5,
            },
            'vars'  :['lat', 'lon', 'v10', 'u10'],
            'coordy' : 'lat',
            'coordx' : 'lon',
        },
    },
    'attrs':{
        'dt' : 60,
        'dz' : None,
        'dy' : None,
        'dx' : None,
        'map_proj': 'explicit',
        'lat_1'      : None,
        'lat_2'      : None,
        'ref_lat'    : None,
        'ref_lon'    : None,
        'coordy'     : None,
        'coordx'     : None,
        'human_name' : None,
        'unit'       : None,
        'vmin'       : None,
        'vmax'       : None,
    },
}

def projWRFGenerator(
    map_proj:str,
    ref_lat:float,
    ref_lon:float,
    lat_1: float,
    lat_2: float,
):
    if 'lambert' in map_proj.lower():
        myProj = Proj(
            proj='lcc', 
            lat_1 = lat_1,
            lat_2 = lat_2,
            lat_0 = ref_lat,
            lon_0 = ref_lon,
            a     = 6370000,
            b     = 6370000,
        )
    elif 'mercator' in map_proj.lower():
        myProj = Proj(
            proj='merc', 
            lat_ts = ref_lat,
            lon_0  = ref_lon,
            a      = 6370000,
            b      = 6370000,
        )
    else:
        print('Projecion no soportada')
        myProj = None
    
    return myProj


def save_data(dir_base, variable, values, attrs, compress='float32'):
        
        output_path = os.path.join(dir_base, variable)
        if not os.path.exists(output_path):
            os.makedirs(output_path)

        ## Tipo de dato
        if compress == 'uint8':
            vmin = attrs['vmin']
            vmax = attrs['vmax']
            values = np.clip(((values - vmin) / (vmax - vmin)) * 255, vmin, vmax).astype(np.uint8)
        elif compress == 'float16':
            values = values.astype(np.float16)
        else:
            values = values.astype(np.float32)

        np.savez(os.path.join(output_path, "data.npz"),
            values   = values,
            nt       = values.shape[0],
            nv       = values.shape[1],
            nz       = values.shape[2],
            ny       = values.shape[3],
            nx       = values.shape[4],
            attrs    = attrs,
            compress = compress,
        )
        print(f"[OK] {variable} - frames guardados en {dir_base}")

for instance in instances:
    for domain in domains:

        dir_domain = os.path.join(instance, domain)
        if not dir_domain:
            print(f"[SKIP] El dominio {domain} no se encuentra para la instancia {instance}")
            continue

        dir_calpuff = os.path.join(instance, domain, 'calpuff')
        if not os.path.exists(dir_calpuff):
            print(f"[ALERT] No existe el directorio {dir_calpuff} para el dominio {domain}")
            continue

        dir_visor = os.path.join(dir_domain, 'visor')
        if not os.path.exists(dir_visor):
            os.makedirs(dir_visor)
        
        ## Read directories in dir_calpuff  (eg. ['as', 'mp10', 'so2', 'tron'])
        species = os.listdir(dir_calpuff)
        for a_species in species:

            nc_files_source = [f for f in os.listdir(os.path.join(dir_calpuff, a_species)) if f.endswith('.nc')]

            ## Geojson-Resumen-Fuentes
            sources = []
            for ncFile in nc_files_source:
                source_name = ncFile.split('.')[0]
                sources.append(source_name)
            geoCollection = FeatureCollection([])
            sources.sort()
            for id, source in enumerate(sources):
                ds = xr.open_dataset(os.path.join(dir_calpuff, a_species, source + '.nc'), engine="netcdf4")
                plat = [float(number) for number in ds.plat.values]
                plon = [float(number) for number in ds.plon.values]
                if ds.attrs['geom'] == 'P':
                    geoElement = Polygon([(lon, lat) for lon, lat in zip(plon, plat)])
                elif ds.attrs['geom'] == 'L':
                    geoElement = LineString([(lon, lat) for lon, lat in zip(plon, plat)])
                else:
                    geoElement = Point((plon[0], plat[0]))
                properties = {'id_inner': id, 'name_file': source}
                properties['emisid']   = ds.attrs['emisid']
                properties['project']  = ds.attrs['project']
                properties['species']  = ds.attrs['species']
                properties['geom']     = ds.attrs['geom']
                properties['emission'] = ds.attrs['emission']
                geoFeature = Feature(geometry=geoElement, properties=properties)
                geoCollection.features.append(geoFeature)
            geojson_path = os.path.join(dir_visor, f"{a_species}.geojson")
            with open(geojson_path, 'w') as f:
                f.write(dumps(geoCollection, indent=2))
                print(f"[OK] Se ha generado el geojson de la especie {a_species}")
            ## End-Geojson-Resumen-Fuentes

            for type_grid, _ in structure_template['grids'].items():
                ## Grillas base (se asume que todos los .nc de una especie tienen la misma grilla y se usa una arbitraria)
                dsCalpuff  = xr.open_dataset(os.path.join(dir_calpuff, a_species, nc_files_source[-1]), engine="netcdf4")
                data_shape = dsCalpuff['PM10_cn'].shape  # (nt, ny, nx)

                # (1) LAT LON
                cutx = structure_template['grids'][type_grid]['cut']['x']
                cuty = structure_template['grids'][type_grid]['cut']['y']
                GRID_LON = zoom(dsCalpuff['lon'].values[cuty:-cuty if cuty>0 else None, cutx:-cutx if cutx>0 else None],
                    (structure_template['grids'][type_grid]['scale']['dy'], structure_template['grids'][type_grid]['scale']['dx']), order=1
                )
                GRID_LAT = zoom(dsCalpuff['lat'].values[cuty:-cuty if cuty>0 else None, cutx:-cutx if cutx>0 else None],
                    (structure_template['grids'][type_grid]['scale']['dy'], structure_template['grids'][type_grid]['scale']['dx']), order=1
                )
            
                # (2) WRF XX and YY
                wrf_nc = [f for f in os.listdir(dir_domain) if f.startswith('wrf_d') and f.endswith('.nc')][0]
                dsWRF = xr.open_dataset(os.path.join(dir_domain, wrf_nc), engine="netcdf4")
                projWRF = projWRFGenerator(
                    map_proj= dsWRF.attrs['MAP_PROJ_CHAR'],
                    ref_lat = dsWRF.attrs['MOAD_CEN_LAT'],
                    ref_lon = dsWRF.attrs['STAND_LON'], 
                    lat_1   = dsWRF.attrs['TRUELAT1'], 
                    lat_2   = dsWRF.attrs['TRUELAT2'],
                )
                projWGS = Proj(proj='latlong', datum='WGS84')

                transformer_WGS_WRF = Transformer.from_proj(projWGS, projWRF, always_xy=True)

                dx = dsWRF.attrs['DX']
                dy = dsWRF.attrs['DY']
                ny = dsWRF.XLAT.shape[1]
                nx = dsWRF.XLAT.shape[2]
                cen_lat = dsWRF.attrs['CEN_LAT']
                cen_lon = dsWRF.attrs['CEN_LON']
                e, n = transformer_WGS_WRF.transform(cen_lon, cen_lat)
                x0 = -(nx-1) * dx / 2 + e
                y0 = -(ny-1) * dy / 2 + n
                
                GRID_XX, GRID_YY = transformer_WGS_WRF.transform(
                    GRID_LON, GRID_LAT
                )

                ## Render first attrs (adjust according to the grid scale)
                attrs_render = structure_template['attrs'].copy()
                keys_attrs = ['dt', 'dz', 'dy', 'dx']
                for key in keys_attrs:
                        if attrs_render[key]:
                            attrs_render[key] = attrs_render[key] / structure_template['grids'][type_grid]['scale'][key]

                ## Indicamos la variables de coordenada
                coordy = '_'.join([a_species, type_grid, 'lon'])
                coordx = '_'.join([a_species, type_grid, 'lat'])

                attrs_render['coordy'] = coordy
                attrs_render['coordx'] = coordx

                attrs_render['windx'] = '_'.join([a_species, 'ld', 'u10'])
                attrs_render['windy'] = '_'.join([a_species, 'ld', 'v10'])
                
                for var in structure_template['grids'][type_grid]['vars']:

                    if var == 'lon':
                        values = GRID_LON #(ny,nx)
                        values = np.expand_dims(np.expand_dims(np.expand_dims(values, axis=0), axis=0), axis=0) #(nt,nv,nz,ny,nx)
                        attrs_render['human_name'] = 'Longitud'
                        attrs_render['unit']       = 'deg'
                        attrs_render['vmin']       = float(values.min())
                        attrs_render['vmax']       = float(values.max())
                        attrs_render['thresholds'] = np.round(np.linspace(attrs_render['vmin'], attrs_render['vmax'], 8),2).tolist()
                        save_data(dir_visor, coordx, values, attrs=attrs_render)

                    elif var == 'lat':
                        values = GRID_LAT #(ny,nx)
                        values = np.expand_dims(np.expand_dims(np.expand_dims(values, axis=0), axis=0), axis=0) #(nt,nv,nz,ny,nx)
                        var_name = '_'.join([a_species, type_grid, var])
                        attrs_render['human_name'] = 'Latitud'
                        attrs_render['unit']       = 'deg'
                        attrs_render['vmin']       = float(values.min())
                        attrs_render['vmax']       = float(values.max())
                        attrs_render['thresholds'] = np.round(np.linspace(attrs_render['vmin'], attrs_render['vmax'], 8),2).tolist()
                        save_data(dir_visor, coordy, values, attrs=attrs_render)

                    elif var == 'u10':
                        COSALPHA = dsWRF['COSALPHA'].values
                        SINALPHA = dsWRF['SINALPHA'].values
                        U10 = dsWRF['U10'].values
                        V10 = dsWRF['V10'].values
                        U10_earth = U10 * COSALPHA - V10 * SINALPHA
                        V10_earth = U10 * SINALPHA + V10 * COSALPHA

                        values = np.zeros((U10_earth.shape[0], GRID_LAT.shape[0], GRID_LAT.shape[1]), dtype=np.float32)
                        for t in range(U10_earth.shape[0]):
                            Interpolator = RegularGridInterpolator(
                                (np.arange(y0, y0 + ny * dy, dy),np.arange(x0, x0 + nx * dx, dx)),
                                U10_earth[t,:,:],
                                bounds_error=False,
                                fill_value=0
                            )
                            values[t, :, :] = Interpolator((GRID_YY.flatten(), GRID_XX.flatten())).reshape(GRID_LAT.shape)

                        values = gaussian_filter1d(values, sigma=3, axis=0) #(nt,ny,nx)
                        values = np.expand_dims(values, axis=1) # (nt,nz,ny,nx)
                        values = np.expand_dims(values, axis=1) # (nt,nv,nz,ny,nx)
                        var_name = '_'.join([a_species, type_grid, var])
                        attrs_render['human_name'] = 'u10'
                        attrs_render['unit']       = "m/s"
                        attrs_render['vmin']       = float(values.min())
                        attrs_render['vmax']       = float(values.max())
                        attrs_render['thresholds'] = [-10, -8 , -5, -2, -1, 0, 1, 2, 5, 8, 10]
                        save_data(dir_visor, var_name, values, attrs=attrs_render, compress='float16')

                    elif var == 'v10':
                        COSALPHA = dsWRF['COSALPHA'].values
                        SINALPHA = dsWRF['SINALPHA'].values
                        U10 = dsWRF['U10'].values
                        V10 = dsWRF['V10'].values
                        U10_earth = U10 * COSALPHA - V10 * SINALPHA
                        V10_earth = U10 * SINALPHA + V10 * COSALPHA
                        
                        values = np.zeros((V10_earth.shape[0], GRID_LAT.shape[0], GRID_LAT.shape[1]), dtype=np.float32)
                        for t in range(V10_earth.shape[0]):
                            Interpolator = RegularGridInterpolator(
                                (np.arange(y0, y0 + ny * dy, dy),np.arange(x0, x0 + nx * dx, dx)),
                                V10_earth[t,:,:],
                                bounds_error=False,
                                fill_value=0
                            )
                            values[t, :, :] = Interpolator((GRID_YY.flatten(), GRID_XX.flatten())).reshape(GRID_LAT.shape)
                            
                        values = gaussian_filter1d(values, sigma=3, axis=0) #(nt,ny,nx)
                        values = np.expand_dims(values, axis=1) # (nt,nz,ny,nx)
                        values = np.expand_dims(values, axis=1) # (nt,nv,nz,ny,nx)
                        var_name = '_'.join([a_species, type_grid, var])
                        attrs_render['human_name'] = 'v10'
                        attrs_render['unit']       = "m/s"
                        attrs_render['vmin']       = float(values.min())
                        attrs_render['vmax']       = float(values.max())
                        attrs_render['thresholds'] = [-10, -8 , -5, -2, -1, 0, 1, 2, 5, 8, 10]
                        save_data(dir_visor, var_name, values, attrs=attrs_render, compress='float16')

                    elif var == 'species': 
                        geojson_path = os.path.join(dir_visor, f"{a_species}.geojson")
                        with open(geojson_path, 'r') as f:
                            geoCollection = json.load(f)
                            
                        values = np.zeros((data_shape[0], len(nc_files_source), data_shape[1], data_shape[2]), dtype=np.float32)
                        for id in range(len(geoCollection['features'])):
                            current_feature = [f for f in geoCollection['features'] if f['properties']['id_inner'] == id][0]
                            dsSpecies = xr.open_dataset(
                                os.path.join(dir_calpuff, a_species, current_feature['properties']['name_file'] + '.nc'), 
                                engine="netcdf4",
                            )
                            values[:, id, :, :] = dsSpecies['PM10_cn'].values

                        values = values*1000*365*0.25
                        scale = structure_template['grids'][type_grid]['scale']
                        values = zoom(values, (scale['dt'], 1, scale['dy'], scale['dx']), order=1) #(nt,nv,ny,nx)
                        values = np.expand_dims(values, axis=2) # (nt,nv,nz,ny,nx)
                        var_name = '_'.join([a_species, type_grid, var])
                        attrs_render['human_name'] = f"Concentración de {a_species}"
                        attrs_render['unit']       = "µg/m³"
                        attrs_render['vmin']       = float(values.min())
                        attrs_render['vmax']       = float(values.max())
                        attrs_render['thresholds'] = [0.5, 1, 2, 5, 10, 20, 30, 40, 50, 75, 100, 125, 150, 300, 500, 1000]
                        save_data(dir_visor, var_name, values, attrs=attrs_render, compress='float16')

    ## Marcamos el directorio como listo
    flag_path = os.path.join(instance, 'READY')
    with open(flag_path, 'w') as f:
        f.write('')
