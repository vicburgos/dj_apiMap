function domainSelector(context, state) {
    const domains = context.domains;
    const select = document.createElement('select');
    select.id = 'domain-selector';
    select.title = 'Selecciona un dominio';
    Object.assign(select.style, {
        userSelect: 'none',
        width: '100px',
        border: '0px',
        backgroundColor: 'transparent',
    });
    // Agregamos opciones:
    domains.forEach((value) => {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = `${value.toUpperCase()}`;
        select.appendChild(option);
    });
    // Agregames change
    select.addEventListener('change', (event) => {
        const selectedDomain = event.target.value;
        state.domain = selectedDomain;
    });
    // Select default variable
    select.value = state.domain

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
    icon.classList.add('bi', 'bi-globe-americas');
    wrapper.appendChild(icon);
    wrapper.appendChild(select);

    return wrapper;
}

export { domainSelector }