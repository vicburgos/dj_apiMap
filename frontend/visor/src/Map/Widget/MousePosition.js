import './styleMouse.css';

import { toLonLat } from 'ol/proj';

const mouseContainer = document.createElement('div');
mouseContainer.id = 'mouse-container';
const customSpaces = '    ';
mouseContainer.innerHTML = `
    <table>
        <tr>
            <td >Lat:</td>
            <td  id="sign-lat-position"></td>
            <td  id="int-lat-position">${customSpaces}</td>
            <td  id="frac-lat-position">${customSpaces}</td>
        </tr>
        <tr>
            <td >Lon:</td>
            <td  id="sign-lon-position"></td>
            <td  id="int-lon-position">${customSpaces}</td>
            <td  id="frac-lon-position">${customSpaces}</td>
        </tr>
    </table>
`;
Object.assign(mouseContainer.style, {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    alignItems: 'center',
    justifyContent: 'center',
});

function setupMousePosition(map) {
    map.on('pointermove', function (event) {
        const [lon, lat] = toLonLat(event.coordinate);
        const signLat = lat < 0 ? '-' : '+';
        const signLon = lon < 0 ? '-' : '+';

        const absLat = Math.abs(lat);
        const absLon = Math.abs(lon);

        const intLat = Math.floor(absLat);
        let hundreds = Math.floor((intLat % 1000) / 100);
        let tens = Math.floor((intLat % 100) / 10);
        let units = intLat % 10;
        const fracLat = (absLat - intLat).toFixed(3).substring(1, 5);

        document.getElementById(`sign-lat-position`).textContent = signLat;
        document.getElementById(`frac-lat-position`).textContent = fracLat;
        if (hundreds == 0 && tens == 0) {
            document.getElementById(`int-lat-position`).textContent = `  ${units}`;
        } else if (hundreds == 0) {
            document.getElementById(`int-lat-position`).textContent = ` ${tens}${units}`;
        } else {
            document.getElementById(`int-lat-position`).textContent = `${hundreds}${tens}${units}`;
        }

        const intLon = Math.floor(absLon);
        hundreds = Math.floor((intLon % 1000) / 100);
        tens = Math.floor((intLon % 100) / 10);
        units = intLon % 10;
        const fracLon = (absLon - intLon).toFixed(3).substring(1, 5);
        document.getElementById(`sign-lon-position`).textContent = signLon;
        document.getElementById(`frac-lon-position`).textContent = fracLon;
        if (hundreds == 0 && tens == 0) {
            document.getElementById(`int-lon-position`).textContent = `  ${units}`;
        } else if (hundreds == 0) {
            document.getElementById(`int-lon-position`).textContent = ` ${tens}${units}`;
        } else {
            document.getElementById(`int-lon-position`).textContent = `${hundreds}${tens}${units}`;
        }
    });

    return mouseContainer;
}

export { setupMousePosition };
