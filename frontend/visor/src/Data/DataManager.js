import { getDataPowerV } from './GetData.js';
import { safeFetch } from '../utils/Fetch.js';

//Default values
const instanceFail = "1949-01-05_00";
const defaultContext = {
    hoursRun: 24,
    startHour: 0,
    endHour: 24,
    optionLocalTime: false,
    ref_dt: 15,
    domains: ['northamerica'],
    places: {},
    variableSelector: false,
    auxiliaryVairbales: {},
    pointSerieDefault: null,
    failMode: true,
};

export class Context {
    constructor() {
        this.hoursRun;
        this.startHour
        this.endHour;
        this.optionLocalTime;
        this.domains;
    }
    async init() {
        try {
            const response = await safeFetch('/api/context/');
            const data = await response.json();
            this.hoursRun           = data.hoursRun;
            this.startHour          = data.startHour;
            this.endHour            = data.endHour;
            this.optionLocalTime    = data.optionLocalTime;
            this.ref_dt             = data.ref_dt;
            this.domains            = data.domains;
            this.variableSelector   = data.variableSelector;
            this.auxiliaryVairbales = data.auxiliaryVairbales;
            this.pointSerieDefault  = data.pointSerieDefault;
            this.places             = data.places;
            this.failMode           = false;
        } catch (error) {
            console.error("Error cargando contexto");
            Object.assign(this, defaultContext);
        }
    }
}

// EventTarget sera util para utilizar this.dispatchEvent como objeto state
export class State extends EventTarget {
    // Parametros que definen el state
    // Son definidas como variables privadas para emitir eventos al modificarlas
    // Seran gerarcias. Es decir, segun el siguiente orden,
    // una variable depende que la anterior este definida,
    // En caso contrario, queda como null.
    #domain;
    #instance;
    #variable;
    #frame;
    #level;

    constructor(context) {
        super();
        // Inicializacion de parametros desde el context
        this.#domain = context.domains[0];
        this.#instance = null;
        this.#variable = null;
        this.#frame    = null;
        this.#level    = 0;

        this.cache = {};   // para guardar datos precargados con clave _cacheKey
        this.currentData = null; // data actual (estara en cache)

        // NUEVO: listas de opciones disponibles
        this.domains = context.domains || [];
        this.instances = [];
        this.variables = [];
        this.failMode = context.failMode;
    }

    _cacheKey(domain, instance, variable) {
        return `${domain}__${instance}__${variable}`;
    }

    // Getters para referenciar los parametros
    get instance() { return this.#instance; }
    get domain() { return this.#domain; }
    get variable() { return this.#variable; }
    get frame() { return this.#frame; }
    get level() { return this.#level; }

    async init() {
        // Default values
        let dafaultInstance = null;
        let dafaultVariable = null;
        await this.loadInstances(dafaultInstance);
        await this.loadVariables(dafaultVariable);
    }

    async loadInstances(dafaultDate = null) {
        if (this.failMode) {
            this.instances = [instanceFail];
            this.#instance = instanceFail;
            this.dispatchEvent(new CustomEvent("options:instances", { detail: this.instances }));
            this.failMode = true;
            return;
        }
        try {
            const res = await safeFetch(`/api/instances/?domain=${this.#domain}`);
            const json = await res.json();
            this.instances = json.instances;
        } catch (err) {
            console.error(`Error loading instances for ${this.#domain}:`);
            this.instances = [instanceFail];
            this.#instance = instanceFail;
            this.dispatchEvent(new CustomEvent("options:instances", { detail: this.instances }));
            return;
        }

        // Atencion! Actualizacion interna sin evento
        // En la lista de instancias debe estar la instancia por defecto si existe
        if (dafaultDate && this.instances.includes(dafaultDate)) {
            this.#instance = dafaultDate;
        }
        else {
            // Poner la ultima de la lista o null
            if (!this.instances.includes(this.#instance)) {
                this.#instance = this.instances.sort()[this.instances.length - 1] || null;
            }
        }
        this.dispatchEvent(new CustomEvent("options:instances", { detail: this.instances }));
    }


    async loadVariables(dafaultVariable = null) {
        if (this.failMode) {
            this.variables = [];
            this.#variable = null;
            this.dispatchEvent(new CustomEvent("options:variables", { detail: this.variables }));
            this.failMode = true;
            return;
        }
        try {
            const res = await safeFetch(`/api/variables/?domain=${this.#domain}&instance=${this.#instance}`);
            const json = await res.json();
            this.variables = json.variables;
        } catch (err) {
            console.error(`Error loading variables for ${this.#domain} ${this.#instance}:`);
            this.variables = [];
            this.#variable = null;
            this.dispatchEvent(new CustomEvent("options:variables", { detail: this.variables }));
            return;
        }

        // Atnencion! Actualizacion interna sin evento
        if (dafaultVariable && this.variables.includes(dafaultVariable)) {
            this.#variable = dafaultVariable;
        }
        else {
            if (!this.variables.includes(this.#variable)) {
                this.#variable = null;
            }
        }
        this.dispatchEvent(new CustomEvent("options:variables", { detail: this.variables }));
    }

    set domain(value) {
        if (this.#domain !== value) {
            const oldValue = this.#domain;
            this.#domain = value;
            this.#emitChange("domain", oldValue, value);
        }
    }

    set instance(value) {
        if (this.#instance !== value) {
            const oldValue = this.#instance;
            this.#instance = value;
            this.#emitChange("instance", oldValue, value);
        }
    }

    set variable(value) {
        if (this.#variable !== value) {
            const oldValue = this.#variable;
            this.#variable = value;
            this.#emitChange("variable", oldValue, value);
        }
    }

    set frame(value) {
        if (this.#frame !== value) {
            const oldValue = this.#frame;
            this.#frame = value;
            this.#emitChange("frame", oldValue, value);
        }
    }

    set level(value) {
        if (this.#level !== value) {
            const oldValue = this.#level;
            this.#level = value;
            this.#emitChange("level", oldValue, value);
        }
    }

    async loadData(domain, instance, variable) {
        if (!domain || !instance || !variable) {
            return null;
        }

        const key = this._cacheKey(domain, instance, variable);

        // Si ya esta en cache, devolver
        if (this.cache[key]) {
            return this.cache[key];
        }

        // Si no esta en cache. Iniciar carga con evento
        document.dispatchEvent(new CustomEvent('loading:start'));
        try {
            const data = await getDataPowerV(domain, instance, variable);
            this.cache[key] = data;
        } catch (err) {
            console.error(`Error loading all frames for ${this.#variable}:`, err);
            this.cache[key] = null;
        }
        document.dispatchEvent(new CustomEvent('loading:end'));

        return this.cache[key];
    }

    async setCurrentData() {
        this.currentData = await this.loadData(this.#domain, this.#instance, this.#variable);
        this.dispatchEvent(new CustomEvent('change:currentData', { detail: this.currentData }));
    }

    // Emitir cambios 
    #emitChange(key, oldValue, newValue) {
        this.dispatchEvent(new CustomEvent("change", { detail: { key, oldValue, newValue } }));
        this.dispatchEvent(new CustomEvent(`change:${key}`, { detail: { oldValue, newValue } }));
    }
}
