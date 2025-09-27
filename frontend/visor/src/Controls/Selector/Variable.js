function variableSelector(context, state) {
    const defaultPlaceholder = '-- Variable';
    const select = document.createElement('select');
    select.id = 'variable-selector';
    select.title = 'Selecciona una variable';
    Object.assign(select.style, {
        userSelect: 'none',
        width: '100px',
        border: '0px',
        backgroundColor: 'transparent',
    });

    select.addEventListener('change', (event) => {
        const selectedVariable = event.target.value;
        if(selectedVariable !== defaultPlaceholder) {
            state.variable = selectedVariable;
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
        alignItems: 'center',
        justifyContent: 'center',
        userSelect: 'none',
        gap: '5px',
        fontSize: '13px',
        height: '25px',
    });
    const icon = document.createElement('i');
    icon.classList.add('bi', 'bi-cloud-haze2');
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
            option.textContent = variable;
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
    return wrapper;
}
export { variableSelector };