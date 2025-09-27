import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import Feature from 'ol/Feature';
import MultiPolygon from 'ol/geom/Polygon';
import { Fill, Stroke, Style, Text } from 'ol/style';
import { fromLonLat, transformExtent } from 'ol/proj';
import { range, select } from 'd3';
import { blur2 } from 'd3';
import { scaleLinear, axisBottom, format, scaleBand, axisLeft, axisRight } from 'd3';
import { contours } from 'd3-contour';
import { colorsMap } from '../../Data/ColorsMap.js';
import katex from 'katex';

function contourGenerator(context, state, map) {
    // COLORBAR
    const colorMapContainer = document.createElement('div');
    colorMapContainer.id = 'colorbar';
    Object.assign(colorMapContainer.style, {
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        userSelect: 'none',
    });
    let currentOptionColor = state.colorMapOption || 1;
    function setColorbar(active=true, interpolate=colorsMap[currentOptionColor].interpolate) {
        if (!active) {
            colorMapContainer.innerHTML = '';
            return;
        }
        const height = 23;
        const width = 450;
        const extra = 50;
        colorMapContainer.innerHTML = '';
        const colorbar = select("#colorbar")
            .style("width", `${width + extra}px`)
            .style("height", `${height}px`)

        // Crear el div para el gradiente (canvas)
        const grad = colorbar.append("div")
            .attr("id", "grad")
            .style("position", "absolute")
            .style("display", "flex")
            .style("align-items", "center")
            .style("justify-content", "center");

        // Crear el div para los ticks (svg)
        const tick = grad.append("div")
            .attr("id", "tick")
            .style("position", "absolute")

        // Crear el canvas en el div grad
        const canvas = grad.append("canvas")
            .attr("width", width + extra)
            .attr("height", 1)
            .style("width", `${width + extra}px`)
            .style("height", `${height}px`)
            .style("border-radius", "10px");

        const data = state.currentData;
        const thresholds = data.attrs.thresholds;
        const interpolateDiscrete = (t) => {
            const idx = Math.floor(t * thresholds.length);
            return interpolate(idx / thresholds.length);
        }

        const canvasContext = canvas.node().getContext("2d");
        for (let i = 0; i < width + extra; ++i) {
            if (i < extra) {
                canvasContext.fillStyle = interpolateDiscrete(0)
            }
            else {
                canvasContext.fillStyle = interpolateDiscrete((i - extra) / width);
            }
            canvasContext.fillRect(i, 0, 1, 1);
        }

        // Crear el SVG para los ticks en el div tick
        const svg = tick.append("svg")
            .attr("width", width + extra)
            .attr("height", height)
            .style("color", "white");

        const gx = svg.append("g")

        const scale = scaleBand()
            .domain(thresholds)
            .range([0, width]);

        const ticks = gx.selectAll("text")
            .data(thresholds)
            .join("text")
            .attr("x", d => extra + scale(d) + scale.bandwidth() * 0.5)
            .attr("y", height * 0.6)
            .attr("text-anchor", "middle")
            .style("font-size", "12px")
            .style("fill", "white")
            .style("text-shadow", "0px 0px 6px rgba(0, 0, 0, 1)")
            .style("font-weight", "bold")
            .style("font-family", "Arial")
            .text(d => d);

        ticks.transition()
            .duration(600)
            .attr("x", d => extra + scale(d) + scale.bandwidth() * 0.5)
            .attr("opacity", 1);

        // Agregar unidad (si existe)
        const unit = state.currentData?.attrs?.unit || '';
        const unitToShow = colorbar.append("div")
            .attr("id", "unit")
            .style("position", "absolute")
            .style("left", extra / 2 - 12 + "px")
            .style("font-size", "12px")
            .style("color", 'white')
            .style("text-shadow", "0px 0px 6px rgba(0, 0, 0, 1)")
            .style("font-weight", "bold")
            .style("font-family", "Arial")
            .style("opacity", 0)
            .html(`${unit}`);

        unitToShow.transition()
            .duration(600)
            .style("opacity", 1);
    }

    // CONTOUR
    const contourSource = new VectorSource()
    const contourLayer = new VectorLayer({
        source: contourSource,
        updateWhileInteracting: true,
        updateWhileAnimating: true,
    });
    function setContour(active=true, interpolate = colorsMap[currentOptionColor].interpolate) {
        if (!active) {
            contourSource.clear();
            return;
        }
        const data = state.currentData;
        const { nx, ny, nv, nt, valuesApi, emVector, abVector } = data;
        let values = valuesApi(0, 0, 0).map(() => 0); // values to format (ny, nx)
        for (let v = 0; v < nv; v++) {
            const valuesZ = valuesApi(state.frame, v, state.level);
            for (let i = 0; i < ny * nx; i++) {
                values[i] += valuesZ[i] * emVector[v] * (1-abVector[v]/100);
            }
        }

        const thresholds = colorsMap['default']?.thresholds || data.attrs.thresholds;
        const interpolateDiscrete = (t) => {
            const idx = Math.floor(t * thresholds.length);
            return interpolate(idx / thresholds.length);
        }

        // Aplicar blur para suavizar los datos antes de calcular los contornos
        blur2({ data: values, width: nx, height: ny }, 0.2);

        let contourData = contours()
            .size([nx, ny])
            .thresholds(thresholds)(values);

        let vectorSource = contourSource;
        vectorSource.clear();

        contourData.forEach((contour, idx) => {
            const coordinates = contour.coordinates.map(rings =>
                rings.map(ring => ring.map(([x, y]) => {
                    let [lon, lat] = data.proj_ij_to_lonlat(x, y);
                    return fromLonLat([lon, lat]);
                }))
            );

            const cmap = interpolateDiscrete(idx / thresholds.length);
            coordinates.forEach(rings => {
                const feature = new Feature({ geometry: new MultiPolygon(rings) });
                feature.setStyle(new Style({
                    // stroke: new Stroke({
                    //     color: 'grey',
                    //     width: 0.1,
                    // }),
                    fill: new Fill({
                        color: cmap,
                    })
                }));
                vectorSource.addFeature(feature);
            });
        });
    }

    // Candy! Change color of interpolation if colorMapContainer is clicked
    const totalOptions = Object.keys(colorsMap).length;
    colorMapContainer.addEventListener('click', () => {
        currentOptionColor = (currentOptionColor % totalOptions) + 1;
        setColorbar();
        setContour();
    });

    return [contourLayer, colorMapContainer, setContour, setColorbar];
}
export { contourGenerator };




//// COLORBAR VERTICAL
// async function setColorbar() {
//     const size = map.getSize();
//     const height= size[1]*0.45>100 ? size[1]*0.45 : 100;
//     const width = 35;
//     const extra = 40;
//     colorMapContainer.innerHTML = '';
//     const colorbar = select("#colorbar")
//         .style("width", `${width}px`)
//         .style("height", `${height + extra}px`)

//     // Crear el div para el gradiente (canvas)
//     const grad = colorbar.append("div")
//         .attr("id", "grad")
//         .style("position", "absolute")
//         .style("display", "flex")
//         .style("align-items", "center")
//         .style("justify-content", "center");

//     // Crear el div para los ticks (svg)
//     const tick = grad.append("div")
//         .attr("id", "tick")
//         .style("position", "absolute")

//     // Crear el canvas en el div grad
//     const canvas = grad.append("canvas")
//         .attr("width", 1)
//         .attr("height", height+ extra)
//         .style("width", `${width}px`)
//         .style("height", `${height+extra}px`)
//         .style("background", "white")
//         .style("border-radius", "10px");

//     const data = state.currentData;
//     let interpolate = colorsMap['default'].interpolate;
//     const thresholds = data.attrs.thresholds;
//     const interpolateDiscrete = (t) => {
//         const idx = Math.floor(t*thresholds.length);
//         return interpolate(idx/thresholds.length);
//     }

//     const canvasContext = canvas.node().getContext("2d");
//     for (let i = 0; i < height + extra; ++i) {
//         if (i < extra) {
//             canvasContext.fillStyle = interpolateDiscrete(0)
//         }
//         else {
//             canvasContext.fillStyle = interpolateDiscrete((i - extra) / height);
//         }
//         canvasContext.fillRect(0, height + extra - i, 1, 1);
//     }

//     // Crear el SVG para los ticks en el div tick
//     const svg = tick.append("svg")
//         .attr("width", width )
//         .attr("height",height + extra)

//     const gx = svg.append("g")

//     const scale = scaleBand()
//         .domain(thresholds)
//         .range([height, 0]);

//     const ticks = gx.selectAll("text")
//         .data(thresholds)
//         .join("text")
//         .attr("x", width / 2)
//         .attr("y", d => scale(d) + scale.bandwidth())
//         .attr("text-anchor", "middle")
//         .style("font-size", "10px")
//         .style("font-weight", "bold")
//         .style("font-family", "Arial")
//         .text(d => d);

//     ticks.transition()
//         .duration(600)
//         .attr("y", d => scale(d) + scale.bandwidth()*0.9)
//         .attr("opacity", 1);

//     // Agregar unidad (si existe)
//     const unit = state.currentData?.attrs?.unit || '';
//     // Crear y seleccionar el texto de unidad
//     if (unit) {
//         const latexRender = katex.renderToString(unit, {
//             throwOnError: false,
//             displayMode: true,
//         });
//         // Al final pero 10px arriba
//         const unitToShow = colorbar.append("div")
//             .attr("id", "unit")
//             .style("position", "absolute")
//             .style("top", `${height + extra*0.5 - 13}px`)
//             .style("left", "0")
//             .style("right", "0")
//             .style("font-size", "14px")
//             .style("text-shadow", "1px 1px 1px rgba(0, 0, 0, 0.2)")
//             .style("font-family", "Arial")
//             .style("color", 'black')
//             .style("opacity", 0)
//             .html(latexRender);         

//         unitToShow.transition()
//             .duration(600)
//             .style("opacity", 1);
//     }
// }