// SwitchFactory.js
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap/dist/js/bootstrap.bundle.min.js'
import './style.css';

export class SwitchFactory {
    static create(id, labelText) {
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.role = 'switch';
        input.id = id;
        input.classList.add('form-check-input');
        Object.assign(input.style, {
            minHeight: 'unset',
            minWidth: 'unset',
            margin: 'unset',
            border: 'unset',
            padding: 'unset',
            height: '13px',
            width: '30px',
            borderRadius: '5px',
            border: '1.5px solid rgb(118, 118, 118)',
        });

        const label = document.createElement('label');
        label.id = `${id}-label`;
        label.setAttribute('for', id);
        label.textContent = labelText;
        label.classList.add('form-check-label', 'switch-label');
        Object.assign(label.style, {
            fontSize: '9px',
            color: 'black',
        })

        window.addEventListener('darkMode', (event) => {
            if (event.detail === true) {
                label.style.color = 'white';
            } else {
                label.style.color = 'black';
            }
        });

        const wrapper_div = document.createElement('div');
        wrapper_div.classList.add('form-check', 'form-switch');
        Object.assign(wrapper_div.style, {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            userSelect: 'none',
            color: 'white',
            minHeight: 'unset',
            minWidth: 'unset',
            margin: 'unset',
            border: 'unset',
            padding: 'unset',
        });
        wrapper_div.appendChild(input);
        wrapper_div.appendChild(label);

        return wrapper_div;
    }
}