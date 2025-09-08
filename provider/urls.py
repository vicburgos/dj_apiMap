from django.urls import path
from django.views.generic import TemplateView, RedirectView

from .views import ContextAPI, InstancesAPI, VariablesAPI, PlacesAPI, SourcesAPI, DataAPI, DataJsonAPI
urlpatterns = [
    path('context/', ContextAPI.as_view(), name='context_api'),
    path('instances/', InstancesAPI.as_view(), name='instances_api'),
    path('variables/', VariablesAPI.as_view(), name='variables_api'),
    path('places/', PlacesAPI.as_view(), name='places_api'),
    path('sources/', SourcesAPI.as_view(), name='sources_api'),
    path('data/', DataAPI.as_view(), name='data_api'),
    path('datajson/', DataJsonAPI.as_view(), name='data_json_api'),
]