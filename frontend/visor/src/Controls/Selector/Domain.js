function domainSelector(context, state) {

    const domains = context.domains || {};

    const icon = document.createElement('i');
    icon.classList.add('bi', 'bi-globe-americas');
    Object.assign(icon.style, {
        marginLeft: '5px',
    });

    const select = document.createElement('select');
    select.id = 'variable-selector';
    select.title = 'Selecciona una variable';
    Object.assign(select.style, {
        width: '150px',
        userSelect: 'none',
    });
    // Agregamos opciones:
    Object.entries(domains).forEach(([key, value]) => {
        const option = document.createElement('option');
        option.value = key;
        option.textContent = `(${key.toLocaleUpperCase()}) ${value.name.toUpperCase()}`;
        select.appendChild(option);
    });
    // Agregames change
    select.addEventListener('change', (event) => {
        const selectedDomain = event.target.value;
        // Actualizar el state
        if (state) {
            state.domain = selectedDomain;
        } else {
            console.warn('state no está definido.');
        }
    });
    // Select default variable
    select.value = state.domain

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

    return wrapper;
}

export { domainSelector }