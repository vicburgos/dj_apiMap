import { dateSelector } from './Date.js';
import { variableSelector } from './Variable.js';
import { domainSelector } from './Domain.js';

function selectorGenerator(context, state){

    const dateSelectorInstance     = dateSelector(context, state);
    const domainSelectorInstance   = domainSelector(context, state);
    const variableSelectorInstance = variableSelector(context, state);

    const wrapper = document.createElement('div');
    wrapper.id = 'selector-container';
    Object.assign(wrapper.style, {
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: '10px',
        userSelect: 'none',
        fontSize: '12px',
        paddingLeft: '5px',
        paddingRight: '5px',
        backgroundColor: 'rgba(255, 255, 255, 1)',
        borderRadius: "5px",
        border: "1.5px solid rgb(118, 118, 118)",
    });

    const separator = document.createElement('div');
    Object.assign(separator.style, {
        width: '1px',
        height: '20px',
        backgroundColor: 'rgb(118, 118, 118)',
    });
    wrapper.appendChild(dateSelectorInstance);
    context.domains.length > 1
        ? (
            wrapper.appendChild(separator.cloneNode()),
            wrapper.appendChild(domainSelectorInstance)
        )
        :null;
    if (context.variableSelector){
        wrapper.appendChild(separator.cloneNode());
        wrapper.appendChild(variableSelectorInstance);
    };

    return wrapper;
}

export { selectorGenerator };