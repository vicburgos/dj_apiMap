import TileLayer from 'ol/layer/Tile';
import XYZ from 'ol/source/XYZ';
import OSM from 'ol/source/OSM';
import TileJSON from 'ol/source/TileJSON';

export const background = {
    openStreet: new TileLayer({
        source: new XYZ({
            zIndex: 0,
            url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
        }),
        visible: false,
        properties: {name: 'Mapa OpenStreet'},
    }),
    satellite: new TileLayer({
        zIndex: 0, 
        source: new XYZ({
            zIndex: 0,
            url: 'https://api.maptiler.com/maps/satellite/{z}/{x}/{y}.jpg?key=KodJ2pXyedqbOntUbdzg',
        }),
        visible: false,
        properties: {name: 'Satelital', dark:true},
    }),
    black: new TileLayer({
        source: new XYZ({
            url: 'http://basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}.png',
        }),
        zIndex: 0,
        visible: false,
        properties: {name: 'Topográfico (Modo Oscuro)', dark:true},
    }),
    white: new TileLayer({
        zIndex: 0,
        source: new XYZ({
            url: 'http://basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}.png',
        }),
        visible: false,
        properties: {name: 'Topográfico'},
    }),
    topo: new TileLayer({
        source: new TileJSON({
            url: `https://api.maptiler.com/tiles/hillshade/tiles.json?key=KodJ2pXyedqbOntUbdzg`,
            tileSize: 256,
        }),
        zIndex: 1,
        opacity: 0.5,
        visible: true,
        properties: {name: 'Topográfico'},
    }),
};