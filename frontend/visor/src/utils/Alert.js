import "./stylePopup.css";
import { Popover } from 'bootstrap';

function generatePopup(root, text, timeout=null) {
    // Popup
    const popupContainer = document.createElement('div');
    popupContainer.classList.add('alert-popup');
    popupContainer.style.minWidth = '200px';
    Object.assign(popupContainer.style, {
        position: 'absolute',
        left: '50%',
        right: '50%',
        top: '0%',
        transform: 'translate(-50%, 0%)',
        width: "300px",
        userSelect: 'none',
    });
    root.appendChild(popupContainer);
    const contentPopup = document.createElement('div');
    Object.assign(contentPopup.style, {
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: "100%",
        userSelect: 'none',
    });
    const closePopupButton = document.createElement('button');
    closePopupButton.className = 'btn-close';
    Object.assign(closePopupButton.style, {
        position: 'absolute',
        top: '-12px',
        right: '-12px',
        width: '6px',
        height: '6px',
        userSelect: 'none',
    });
    const popover = new Popover(popupContainer, {
        animation: true,
        trigger: 'manual',
        container: popupContainer,
        content: contentPopup,
        html: true,
        delay: { "show": 200, "hide": 200 },
    });

    closePopupButton.onclick = () => {
        popover.hide();
        setTimeout(() => {
            root.removeChild(popupContainer);
        }, 200);
    };

    const textNode = document.createElement('div');
    Object.assign(textNode.style, {
        textAlign: 'center',
        // fontWeight: 'bold',
        fontFamily: 'Arial, sans-serif',
        fontSize: '12px',
    });
    // Generar ssplit por salto linea para text
    text.split('\n').forEach(line => {
        const p = document.createElement('div');
        p.textContent = line;
        textNode.appendChild(p);
    });
    
    timeout? null : contentPopup.appendChild(closePopupButton);
    contentPopup.appendChild(textNode);
    popupContainer.appendChild(contentPopup);

    timeout? setTimeout(() => {
        closePopupButton.click();
    }, timeout) : null;

    return { popupContainer, popover }
}

export { generatePopup }
