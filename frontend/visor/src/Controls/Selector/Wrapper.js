import { dateSelector } from './Date.js';
import { variableSelector } from './Variable.js';
import { domainSelector } from './Domain.js';

function selectorGenerator(context, state){

    const dateSelectorInstance     = dateSelector(context, state);

    const wrapper = document.createElement('div');
    wrapper.id = 'selector-container';
    Object.assign(wrapper.style, {
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: '5px',
        userSelect: 'none',
        fontSize: '12px',
        paddingLeft: '5px',
        paddingRight: '5px',
        backgroundColor: 'rgba(255, 255, 255, 1)',
        borderRadius: "5px",
        border: "1.5px solid rgb(118, 118, 118)",
    });

    wrapper.appendChild(dateSelectorInstance);

    return wrapper;
}

export { selectorGenerator };