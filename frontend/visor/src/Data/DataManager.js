import { getData } from './GetData.js';

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
            const response = await fetch('/api/context');
            if (response.ok) {
                const data               = await response.json();
                this.hoursRun            = data.hoursRun;
                this.startHour           = data.startHour;
                this.endHour             = data.endHour;
                this.optionLocalTime     = data.optionLocalTime;
                this.ref_dt              = data.ref_dt;
                this.domains             = data.domains;
                this.places              = data.places;
                this.pointSerieDefault   = data.pointSerieDefault;
                this.instanceDefaultFail = null

            } else {
                //Default values
                this.hoursRun            = 24;
                this.startHour           = 0;
                this.endHour             = 24;
                this.optionLocalTime     = false,
                this.ref_dt              = 15;
                this.domains             = ['northamerica'];
                this.places              = {};
                this.pointSerieDefault   = null;
                this.instanceDefaultFail = "1949-01-05_00"
            }
        } catch (error) {
            console.error('Error loading context:', error);
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
        this.#domain     = context.domains[0];
        this.#instance   = null;
        this.#variable   = null;
        this.#frame      = null;
        this.#level      = null;

        this.cache       = {};   // para guardar datos precargados con clave _cacheKey
        this.currentData = null; // data actual (estara en cache)

        // NUEVO: listas de opciones disponibles
        this.domains             = context.domains || [];
        this.instances           = this.instanceDefault? [context.instanceDefault] : [];
        this.variables           = [];
        this.instanceDefaultFail = context.instanceDefaultFail;
    }

    _cacheKey(domain, instance, variable) {
        return `${domain}__${instance}__${variable}`;
    }

    // Getters para referenciar los parametros
    get instance() { return this.#instance;}
    get domain()   { return this.#domain;  }
    get variable() { return this.#variable;}
    get frame()    { return this.#frame;   }
    get level()    { return this.#level;   }

    async init() {
        // Default values
        let dafaultInstance = null;
        let dafaultVariable = null;
        dafaultVariable = "mp10_hd_species";
        await this.loadInstances(dafaultInstance);
        await this.loadVariables(dafaultVariable);
    }
    
    async loadInstances(dafaultDate=null) {
        if (!this.#domain) {
            this.#instance = null;
            this.#variable = null;
        } else {
            try {
                const res = await fetch(`/api/instances/?domain=${this.#domain}`);
                const json = await res.json();
                this.instances = json.instances? json.instances : [this.instanceDefaultFail];
            } catch(err) {
                console.error(`Error loading instances for ${this.#domain}:`, err);
                this.instances = [this.instanceDefaultFail];
            }

            // Atencion! Actualizacion interna sin evento
            // En la lista de instancias debe estar la instancia por defecto si existe
            if (dafaultDate && this.instances.includes(dafaultDate)) {
                this.#instance = dafaultDate;
            }
            else {
                // Poner la ultima de la lista o null
                if (!this.instances.includes(this.#instance)) {
                    this.#instance = this.instances.sort()[this.instances.length-1] || null;
                }
            }
        }
        this.dispatchEvent(new CustomEvent("options:instances", { detail: this.instances }));
    }


    async loadVariables(dafaultVariable=null) {
        if (!this.#domain || !this.#instance) {
            this.#variable = null;
            this.variables = [];
        } else {
            try {
                const res = await fetch(`/api/variables/?domain=${this.#domain}&instance=${this.#instance}`);
                const json = await res.json();
                this.variables = json.variables? json.variables : [];
            } catch(err) {
                console.error(`Error loading variables for ${this.#domain} ${this.#instance}:`, err);
                this.variables = [];
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
            const data      = await getData(domain, instance, variable);
            this.cache[key] = data;
        } catch (err) {
            console.error(`Error loading all frames for ${this.#variable}:`, err);
            this.cache[key] = null;
        }
        document.dispatchEvent(new CustomEvent('loading:end'));

        return this.cache[key];
    }

    async setCurrentData() {
        this.currentData = await this.loadData(this.#domain, this.#instance,  this.#variable);
        this.dispatchEvent(new CustomEvent('change:currentData', { detail: this.currentData }));
    }

    // Emitir cambios 
    #emitChange(key, oldValue, newValue) {
        this.dispatchEvent(new CustomEvent("change", { detail: { key, oldValue, newValue } }));
        this.dispatchEvent(new CustomEvent(`change:${key}`, { detail: { oldValue, newValue } }));
    }
}
