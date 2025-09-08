import flatpickr from 'flatpickr';
import 'flatpickr/dist/flatpickr.min.css';

function builder(input, allowedDates, defaultInstance) {
    flatpickr(input, {
        enable: allowedDates.map(d => {
            const [year, month, day] = d.split('_')[0].split('-').map(Number);
            return new Date(year, month - 1, day); // Date en zona horaria local
        }),
        defaultDate: defaultInstance,
        allowInput: false,
    });
}

function dateSelector(context, state) {

    const icon = document.createElement('i');
    icon.classList.add('bi', 'bi-calendar');

    const input = document.createElement('input');
    input.type = 'date';
    input.id = 'date-selector';
    input.title = 'Selecciona una fecha';
    Object.assign(input.style, {
        userSelect: 'none',
        width: '100px',
        border: '0px',
        backgroundColor: 'transparent',
        paddingLeft: '12px',
    });
    
    // Set date
    let allowedDates = state.instances || [];
    builder(input, allowedDates, state.instance);

    input.addEventListener('change', (event) => {
        const selectedDate = event.target.value;
        const instances = state.instances;
        const matchedInstance = instances.find(inst => inst.startsWith(selectedDate));
        state.instance = matchedInstance;
    });

    state.addEventListener('options:instances', async () => {
        allowedDates = state.instances || [];
        // Limpiamos input
        input.value = '';
        builder(input, allowedDates, state.instance);
    });

    icon.addEventListener('click', () => {
        input.click();
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
    wrapper.appendChild(icon);
    wrapper.appendChild(input);

    return wrapper;
}

export { dateSelector };