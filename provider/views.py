#################################################################################################
## API'S
#################################################################################################
import os
import json
import geojson
from geojson import Point, Feature, FeatureCollection
from django.conf import settings

#### Set some global variables
dir_root          = '/home/vburgos/dataApp'
hoursRun          = 24*7              # Total hours of the simulation
startHour         = 4                 # Start hour of the simulation
endHour           = hoursRun - 1      # End hour of the simulation
optionLocalTime   = True              # Use local time or not
ref_dt            = 15                # Time step of the data (minutes)
domains           = ['antucoya', 'codelconorte', 'pelambres']  # List of domains available. Usually only one domain is used.
filter_variables  = 'species'         # Filter variables that end with this string
pointSerieDefault = {'lon':-69.666, 'lat':-22.350}
places = {
    'points': {
        'Minera Antucoya': (-69.865, -22.627),
        'Maria Elena'    : (-69.666, -22.350),

        'Minera Los Pelambres': (-70.490, -31.717),
        'Salamanca': (-70.965, -31.776),
        'Cuncumen':  (-70.629, -31.898),

    },
}

geoCollection = FeatureCollection([])
for place_name, (lon, lat) in places['points'].items():
    geoElement = Point((lon, lat))
    properties = {'name': place_name}
    geoFeature = Feature(geometry=geoElement, properties=properties)
    geoCollection.features.append(geoFeature)

def instances_info(domain):
    instances = [i for i in os.listdir(dir_root) if i.startswith('20')]
    instances_per_domain = [i for i in instances if os.path.exists(os.path.join(dir_root, i, domain))]
    return instances_per_domain

def variables_info(domain, instance):
    dir_visor  = os.path.join(dir_root, instance, domain, 'visor')
    variables  = [v for v in os.listdir(dir_visor) if os.path.isdir(os.path.join(dir_visor, v))]
    return variables

from django.views import View
from django.http import JsonResponse
class ContextAPI(View):
    def get(self, request, *args, **kwargs):
        """
        API para obtener un contexto: Dominos
        URL Ejemplo:
        /api/context/
        """
        dict_context = {
            "hoursRun" : hoursRun,
            "startHour": startHour,
            "endHour"  : endHour,
            "optionLocalTime": optionLocalTime,
            "ref_dt"  : ref_dt,
            "domains" : domains,
            "places"  : geoCollection,
            'pointSerieDefault' : pointSerieDefault,
        }
        return JsonResponse(dict_context, safe=False)
    
from django.views import View
from django.http import JsonResponse
class InstancesAPI(View):
    def get(self, request, *args, **kwargs):
        """
        API para obtener las instancias del dominio
        URL Ejemplo:
        /api/instances/?domain=antucoya
        """
        domain   = request.GET.get("domain")
        ## Check si domain es valido
        if domain not in domains:
            return JsonResponse({"error": "Dominio no valido"}, status=400)

        dict_variable = {
            "domain"   : domain,
            "instances": instances_info(domain),
        }
        return JsonResponse(dict_variable, safe=False)

from django.views import View
from django.http import JsonResponse
class VariablesAPI(View):
    def get(self, request, *args, **kwargs):
        """
        API para obtener las variables de la instancia del dominio
        URL Ejemplo:
        /api/variables/?domain=antucoya&instance=2025-07-24_00
        """
        domain   = request.GET.get("domain")
        instance = request.GET.get("instance")
        if domain not in domains:
            return JsonResponse({"error": "Dominio no valido"}, status=400)
        
        dict_variable = {
            "domains"  : domain,
            "variables": variables_info(domain, instance),
        }
        return JsonResponse(dict_variable, safe=False)

class PlacesAPI(View):
    def get(self, request, *args, **kwargs):
        """
        API para obtener lugares de interes para un dominio en una instancia particular
        URL Ejemplo:
        /api/places/?domain=antucoya&instance=2025-07-24_00
        """
        domain   = request.GET.get("domain")
        instance = request.GET.get("instance")    
        if domain not in domains:
            return JsonResponse({"error": "Dominio no valido"}, status=400)    
        
        places_geojson_path = os.path.join(dir_root, instance, domain, 'visor', f'places.geojson')
        if not os.path.exists(places_geojson_path):
            return {"error": "places.geojson no encontrado"}
        with open(places_geojson_path, 'r') as f:
            places_geojson = geojson.load(f)
        return JsonResponse(places_geojson, safe=False)

class SourcesAPI(View):
    def get(self, request, *args, **kwargs):
        """
        API para obtener fuentes de emisiones para un dominio en una instancia particular
        URL Ejemplo:
        /api/sources/?domain=antucoya&instance=2025-07-24_00&species=mp10
        """

        domain   = request.GET.get("domain")
        instance = request.GET.get("instance")
        species  = request.GET.get("species")
        if domain not in domains:
            return JsonResponse({"error": "Dominio no valido"}, status=400)

        sources_geojson_path = os.path.join(dir_root, instance, domain, 'visor', f'{species}.geojson')
        if not os.path.exists(sources_geojson_path):
            return {"error": "sources.geojson no encontrado"}
        with open(sources_geojson_path, 'r') as f:
            sources_geojson = geojson.load(f)        
        return JsonResponse(sources_geojson, safe=False)

import gzip
import numpy as np
from django.http import HttpResponse
class DataAPI(View):
    def get(self, request, *args, **kwargs):
        """
        API optimizada para obtener raster preprocesado desde archivo .npz.
        Ejemplo de URL:
        /api/data/?domain=antucoya&instance=2025-07-24_00&variable=mp10_hd_lat
        """

        ## Encode with gzip. 
        # Mas liviano, pero mas lento de leer en el cliente
        encode = False
       
        instance = request.GET.get("instance")
        domain   = request.GET.get("domain")
        variable = request.GET.get("variable")

        if domain not in domains:
            return JsonResponse({"error": "Dominio no valido"}, status=400)

        dir_visor = os.path.join(dir_root, instance, domain, 'visor')

        try:
            npz_file = os.path.join(dir_visor, variable, "data.npz")
            if not os.path.exists(npz_file):
                return JsonResponse({"error": f"Archivo completo no encontrado: {npz_file}"}, status=400)
            
            npz      = np.load(npz_file, allow_pickle=True)
            values   = npz["values"]
            nt       = int(npz["nt"])
            nz       = int(npz["nz"])
            ny       = int(npz["ny"])
            nx       = int(npz["nx"])
            attrs    = npz["attrs"].item()
            compress = str(npz["compress"])

        except Exception as e:
            return JsonResponse({"error": f"Error leyendo archivo completo: {str(e)}"}, status=500)

        values_bytes = values.tobytes()
        header = {
            "variable": variable,
            "nt": nt,
            "nz": nz,
            "ny": ny,
            "nx": nx,
            "attrs": attrs,
            "compress": compress,
        }

        if encode == True:
            values_bytes = gzip.compress(values_bytes)
            response = HttpResponse(values_bytes, content_type='application/octet-stream')
            response['Content-Encoding'] = 'gzip'
        else:
            response = HttpResponse(values_bytes, content_type='application/octet-stream')

        response['X-Header'] = json.dumps(header)
        
        return response
    
import numpy as np
from django.http import HttpResponse
class DataJsonAPI(View):
    def get(self, request, *args, **kwargs):
        """
        (json version)
        API optimizada para obtener raster preprocesado desde archivo .npz.
        Ejemplo de URL:
        /api/datajson/?domain=antucoya&instance=2025-07-24_00&variable=mp10_hd_lat
        """
     
        instance = request.GET.get("instance")
        domain   = request.GET.get("domain")
        variable = request.GET.get("variable")
        if domain not in domains:
            return JsonResponse({"error": "Dominio no valido"}, status=400)

        dir_visor = os.path.join(dir_root, instance, domain, 'visor')

        try:
            npz_file = os.path.join(dir_visor, variable, "data.npz")
            if not os.path.exists(npz_file):
                return JsonResponse({"error": f"Archivo completo no encontrado: {npz_file}"}, status=404)
            
            npz      = np.load(npz_file, allow_pickle=True)
            values   = npz["values"]
            nt       = int(npz["nt"])
            nz       = int(npz["nz"])
            ny       = int(npz["ny"])
            nx       = int(npz["nx"])
            attrs    = npz["attrs"].item()
            compress = str(npz["compress"])

        except Exception as e:
            return JsonResponse({"error": f"Error leyendo archivo completo: {str(e)}"}, status=500)

        header = {
            "variable": variable,
            "nt": nt,
            "nz": nz,
            "ny": ny,
            "nx": nx,
            "attrs": attrs,
            "compress": compress,
        }

        values_list = values.flatten().tolist()
        response_data = {
            "header": header,
            "values": values_list
        }
        return JsonResponse(response_data, safe=False)
