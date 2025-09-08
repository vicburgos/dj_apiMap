const dictVarNames = {
    'HEIGHT': 'Altura',
    'TEMP': 'Temperatura',
    'HYSP': 'MP10',
}

function variableSelector(context, state) {
    const icon = document.createElement('i');
    icon.classList.add('bi', 'bi-cloud-haze2');
    Object.assign(icon.style, {
        marginLeft: '5px',
    });
    
    const defaultPlaceholder = '-- Variable';

    const select = document.createElement('select');
    select.id = 'variable-selector';
    select.title = 'Selecciona una variable';
    Object.assign(select.style, {
        width: '90px',
        userSelect: 'none',
    });
    select.addEventListener('change', (event) => {
        const optionChoice = event.target.value;
        if(optionChoice !== defaultPlaceholder) {
            state.variable = optionChoice;
        } else {
            state.variable = null;
        }
    });

    state.addEventListener('change:variable', () => {
        if (state.variable) {
            select.value = state.variable;
        } else {
            select.value = defaultPlaceholder;
        }
    });

    const wrapper = document.createElement('div');
    Object.assign(wrapper.style, {
        display: 'flex',
        flexDirection: 'row',
        gap: '10px',
        alignItems: 'center',
        userSelect: 'none',
    });
    wrapper.appendChild(icon);
    wrapper.appendChild(select);

    // Update Variable Option according to the selected domain
    function updateVariableOptions() {
        const currentSelectedVariable = select.value;
        const variables = state.variables;
        select.innerHTML = '';
        // Usamos un placeholder
        const placeholderOption = document.createElement('option');
        placeholderOption.textContent = defaultPlaceholder;
        // placeholderOption.disabled = true;
        placeholderOption.selected = true;
        select.appendChild(placeholderOption);
        variables.forEach(variable => {
            const option = document.createElement('option');
            option.value = variable;
            option.textContent = dictVarNames[variable] || variable;
            select.appendChild(option);
        });
        if (!variables.includes(currentSelectedVariable) ) {
            placeholderOption.selected = true;
            select.dispatchEvent(new Event('change'));
        } else {
            select.value = currentSelectedVariable; 
        }
    }

    state.addEventListener('options:variables', async () => {
        updateVariableOptions();
    });
    updateVariableOptions();
    state.variable
        ?select.value = state.variable
        : null;
        
    return wrapper;
}
export { variableSelector };