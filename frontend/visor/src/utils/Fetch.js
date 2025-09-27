import { generatePopup } from './Alert.js';

// funcion generica para mostrar errores
function showPopupError(title = "", message = "") {
    const { popover } = generatePopup(
        document.getElementById('vue-panel-map'),
        `
            ${title}
            ${message}
        `
    );
    popover.show();
}

// manejador de errores por status
function handleHttpError(status, fetchContext = "") {
    if (fetchContext) {
        fetchContext = `(${fetchContext})`;
    }
    switch (status) {
        case 400:
            showPopupError(`La solicitud fue inválida. ${fetchContext}`);
            break;
        case 401:
            showPopupError(`La autenticación ha fallado. ${fetchContext}`);
            break;
        case 403:
            showPopupError(`No se tienen permisos para acceder a este recurso. ${fetchContext}`);
            break;
        case 404:
            showPopupError(`El recurso solicitado no fue encontrado. ${fetchContext}`);
            break;
        case 500:
        default:
            showPopupError(
                `
                    La carga de datos ha fallado. 
                    Es posible que el servidor no se encuentre disponible. ${fetchContext}
                `
            );
    }
}

// wrapper global de fetch
async function safeFetch(input, init = {}, fetchContext = "") {
    try {
        const response = await fetch(input, init);

        if (!response.ok) {
            handleHttpError(response.status, fetchContext);
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return response;
    } catch (err) {
        throw err;
    }
}

export { safeFetch };
