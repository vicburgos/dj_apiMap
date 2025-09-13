import Highcharts from 'highcharts';

function parseInstanceToDate(instance, context) {
    if (!instance) return null;
    const date = new Date(instance.replace("_", " ") + ":00:00Z");
    if (context.optionLocalTime) {
        const localOffset = date.getTimezoneOffset();
        date.setMinutes(date.getMinutes() - localOffset);
    }
    return date;
}

function updateStartDateAxis(instance, context, units='') {
    const startDate = parseInstanceToDate(instance, context);
    if (!startDate) return {};
    return {
        xAxis:{
            type: 'datetime',
            min: startDate.getTime() + context.startHour * 60 * 60 * 1000,
            max: startDate.getTime() + context.endHour * 60 * 60 * 1000,
        },
        yAxis: {
            title: { text: units, rotation: 0, useHTML: true, offset: 65 },
        }
    };
}

export function serieGenerator(context, state, map, panelSerie) {
    const Chart = Highcharts.chart(panelSerie, {
        chart: { 
            type: "area", 
            zoomType: "x" ,
            animation: false,
            // Alineacion de serie con reproductor
            // Elementos de reproductor desde izquierda
            // 10px   position-left
            // 1.5    border-left
            // 2px    padding-left
            // 20px   icon (x3)
            // 3px    gap  (x3)
            // 7.5px  medio radio de thumb circular
            marginLeft:  10 + 1.5 + 2 + 20*3 + 3*3 + 7.5,
            marginRight: 10 + 1.5 + 2 + 7.5,
            marginBottom: 80,
        },
        title: { text: '' },
        xAxis: updateStartDateAxis(state.instance, context).xAxis,
        yAxis: updateStartDateAxis(state.instance, context).yAxis,
        plotOptions: { area: { stacking: false }, series: { animation: false } },
        tooltip: {
            formatter: function () {
                return `<b>${this.series.name}</b>: ${Highcharts.numberFormat(this.y, 2)}<br>` +
                    `<b>${Highcharts.dateFormat('%Y-%m-%d %H:%M', this.x)}</b>`;
            }
        },
        accessibility: { enabled: false },
        credits: { enabled: false },
        // Generar una serie vacia
        series: [{}],
    });

    // Remover inicialmente. Esto para generar un grafico vacio 
    while (Chart.series.length > 0) {
        Chart.series[0].remove(false);
    }

    // Actualiza el plot line del frame
    function updateIndicator() {
        if (!state.instance) return;
        const startDate = parseInstanceToDate(state.instance, context);
        
        Chart.xAxis[0].removePlotLine('time-indicator');
        Chart.xAxis[0].addPlotLine({
            id: 'time-indicator',
            color: 'dodgerblue',
            width: 1,
            value: startDate.getTime() + state.frame * context.ref_dt * 60 * 1000,
        });
    }
 
    // Actualiza el eje X cuando cambia la instancia
    function updateAxis() {
        let units;
        if (state.variable){
            units = state.currentData.attrs.unit || '';
        } else {
            units = '';
        }
        if (!state.instance) return;
        Chart.update({
            xAxis: updateStartDateAxis(state.instance, context).xAxis,
            yAxis: updateStartDateAxis(state.instance, context, units).yAxis,
        });
    }
    
    updateIndicator();
    state.addEventListener('change:frame', () => {
        updateIndicator();
    });
    state.addEventListener('change:instance', () => {
        while (Chart.series.length > 0) {
            Chart.series[0].remove(false);
        }
        updateAxis();
        updateIndicator();
    });

    let lonSerie = null;
    let latSerie = null;

    document.addEventListener('serie:start', (e) => {
        if (e.detail?.lon && e.detail?.lat) {
            lonSerie = e.detail.lon;
            latSerie = e.detail.lat;
        }

        if (!state.domain || !state.instance || !state.variable) return;

        if (!lonSerie || !latSerie) return;

        updateAxis();
        const startDate = parseInstanceToDate(state.instance, context);
        const data = state.currentData;
        const geoJsonSources = state.currentData.geoJsonSources;
        const totalProjects = 'total';
        const projectsAndTotal = [...state.currentData.projects, totalProjects];
        const [i, j] = data.proj_lonlat_to_ij(lonSerie, latSerie);
        const { nx, nz, nt, emVector, abVector } = data;

        // generate a object with keys given by projects and empty array as value   
        const SeriePerProjects = {};
        projectsAndTotal.forEach(p => SeriePerProjects[p] = []);
        
        for (let t = 0; t < nt; t++) {
            const framePerProject = {};
            projectsAndTotal.forEach(p => framePerProject[p] = 0);
              for (let z = 0; z < nz; z++) {
                let project = geoJsonSources.features[z]?.properties.project || ''; // Si se tiene projects
                let value= data.valuesApi(t, z)[j * nx + i] * emVector[z] * (1-abVector[z]/100);
                framePerProject[project]       += value;
                framePerProject[totalProjects] += value;
            }
            const timestamp = startDate.getTime() + t * context.ref_dt * 60 * 1000;
            projectsAndTotal.forEach(p => {
                SeriePerProjects[p].push([timestamp, framePerProject[p]]);
            });
        }

        while (Chart.series.length > 0) {
            Chart.series[0].remove(false);
        }
        projectsAndTotal.forEach((p, idx) => {
            (p==totalProjects)
                ?Chart.addSeries({
                    name: p.toUpperCase(),
                    data: SeriePerProjects[p],
                    color: "black",
                    dashStyle: 'ShortDash',
                    fillOpacity: 0
                }, false)
                :Chart.addSeries({
                    name: p.toUpperCase(),
                    data: SeriePerProjects[p],
                    color: Highcharts.getOptions().colors[idx % Highcharts.getOptions().colors.length],
                    fillOpacity: 0.5
                }, false)
        }); 
        Chart.redraw(); // dibuja todas las series juntas
        document.dispatchEvent(new CustomEvent('serie:end'));
    });

    document.addEventListener('serie:clean', (event) => {
        while (Chart.series.length > 0) {
            Chart.series[0].remove(false); // false = no redibujar inmediatamente
        }
        Chart.update({
            yAxis: updateStartDateAxis(state.instance, context, '').yAxis,
        });
        if (event?.cleanFull) {
            lonSerie = null;
            latSerie = null;
        }
    });
}

// // src/Functions/Serie.js
// import Highcharts from 'highcharts';

// function updateStartDateAxis(instance){
//     const startDate = new Date(instance.replace("_", " ") + ":00:00Z");
//     if (context.optionLocalTime) {
//         const localOffset = startDate.getTimezoneOffset();
//         startDate.setMinutes(startDate.getMinutes() - localOffset);
//     }
//     const xAxis = {
//         type: 'datetime',
//         min: startDate.getTime() + context.startHour * 60 * 60 * 1000,
//         max: startDate.getTime() + context.endHour * 60 * 60 * 1000,
//     }
//     return xAxis;
// }

// export function serieGenerator(context, state, map, panelSerie) {
//     const Chart = Highcharts.chart(panelSerie, {
//         chart: { type: "area", zoomType: "x" },
//         title: { text: '' },
//         // xAxis: {
//         //     type: 'datetime',
//         //     min: startDate.getTime() + context.startHour * 60 * 60 * 1000,
//         //     max: startDate.getTime() + context.endHour * 60 * 60 * 1000,
//         // },
//         yAxis: { title: { text: 'µg/m³', rotation: 0, x: -25, useHTML: true }
//             , min: 0, max: 250 
//         },
//         plotOptions: { area: { stacking: "normal" } },
//         tooltip: {
//             formatter: function() {
//                 return `<b>${this.series.name}</b>: ${Highcharts.numberFormat(this.y, 2)} µg/m³<br>` +
//                        `<b>${Highcharts.dateFormat('%Y-%m-%d %H:%M', this.x)}</b>`;
//             }
//         },
//         accessibility: { enabled: false },
//         credits: {enabled: false},
//         series: [{ name: 'MP10', data: [], color: 'red', fillOpacity: 0.5 }],
//     });

//     function updateIndicator() {
//         if (!state.instance){
//             return;
//         }
//         const startDate = new Date(state.instance.replace("_", " ") + ":00:00Z");
//         if (context.optionLocalTime) {
//             const localOffset = startDate.getTimezoneOffset();
//             startDate.setMinutes(startDate.getMinutes() - localOffset);
//         }
//         Chart.xAxis[0].removePlotLine('time-indicator');
//         Chart.xAxis[0].addPlotLine({
//             id: 'time-indicator',
//             color: 'dodgerblue',
//             width: 1,
//             value: startDate.getTime() + state.frame * context.ref_dt * 60 * 1000,
//         });
//     }
//     state.addEventListener('change:frame', updateIndicator);
//     state.addEventListener('change:instance', updateIndicator);

//     let lonSerie = null
//     let latSerie = null;
//     // Escuchar evento para generar serie
//     document.addEventListener('serie:start', async (e) => {
//         Chart.update({
//             xAxis: updateStartDateAxis(state.instance)
//         });
//         // Revisamos si hay lat lon en e
//         if (e.detail && e.detail.lon && e.detail.lat) {
//             //Update lonSerie and latSerie
//             lonSerie = e.detail.lon;
//             latSerie = e.detail.lat;
//         }
//         if (!lonSerie || !latSerie) {
//             return;
//         }
//         if (!state.variable){
//             return;
//         }
//         const data = state.currentData;
//         const [i, j] = data.proj_lonlat_to_ij(lonSerie, latSerie);
//         const { nx, nz, nt, emVector } = data;
//         const serieData = [];
//         // Generar serie de manera asincrónica para no bloquear la UI
//         for (let t = 0; t < nt; t++) {
//             let val = 0;
//             for (let z = 0; z < nz; z++) {
//                 val += data.valuesApi(t, z)[j * nx + i] * emVector[z];
//             }
//             const timestamp = startDate.getTime() + t * context.ref_dt * 60 * 1000;
//             serieData.push([timestamp, val]);

//             // // cada 10 iteraciones dejamos que el browser refresque UI
//             // if (t % 10 === 0) {
//             //     await new Promise(resolve => setTimeout(resolve, 0));
//             // }
//         }
//         Chart.series[0].setData(serieData, true);
//         document.dispatchEvent(new CustomEvent('serie:end'));
//     });
//     document.addEventListener('serie:clean', async (e) => {
//         // lonSerie = null;
//         // latSerie = null;
//         Chart.series[0].setData([], true);
//     });
// }
