import {
    interpolatePlasma,
    interpolateCividis,
    interpolateViridis,
    interpolateRainbow,
} from 'd3';

// Con remapMidpoint podemos modificar el centro de la escala de colores (e.g. isoterma 0)
function remapMidpoint(t, mid = 0.5) {
  if (t <= mid) {
    return (t / mid) * 0.5;
  } else {
    return 0.5 + ((t - mid) / (1 - mid)) * 0.5;
  }
}

function TransformHexToRGB(hex) {
    const bigint = parseInt(hex.replace('#', ''), 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return [r, g, b];
}

function trasparencyFunction(t) {
    let trasparency;
    (t < 0.6)
        ? trasparency=0.2 + 0.8 * (t / 0.6) // De 0.4 a 1
        : trasparency=1
    return trasparency;
}

// COLORS MAP
export const colorsMap = {
    1: {
        interpolate: (t) => {
          const rgbValue = interpolateRainbow(1-(0.1 + 0.9 * t))
          // '\\d+' digitos 1 o mas. 'g' todas la ocurrencias, y queda en array
          const rgbsplit = rgbValue.match(new RegExp('\\d+', 'g')); 
          const transparency = trasparencyFunction(t);
          return `rgba(${rgbsplit[0]}, ${rgbsplit[1]}, ${rgbsplit[2]}, ${transparency})`;
        },
    },
    2: {
        interpolate: (t) => {
          const rgbValue = interpolatePlasma(0.2 + 0.8 * t)
          const rgbsplit = TransformHexToRGB(rgbValue);
          const transparency = trasparencyFunction(t);
          return `rgba(${rgbsplit[0]}, ${rgbsplit[1]}, ${rgbsplit[2]}, ${transparency})`;
        },
    },
    3: {
        interpolate: (t) => {
          const rgbValue = interpolateCividis(0.3 + 0.7 * t)
          const rgbsplit = rgbValue.match(/\d+/g);
          const transparency = trasparencyFunction(t);
          return `rgba(${rgbsplit[0]}, ${rgbsplit[1]}, ${rgbsplit[2]}, ${transparency})`;
        },
    },
}