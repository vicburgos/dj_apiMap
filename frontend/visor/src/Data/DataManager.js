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
                const data             = await response.json();
                this.hoursRun          = data.hoursRun;
                this.startHour         = data.startHour;
                this.endHour           = data.endHour;
                this.optionLocalTime   = data.optionLocalTime;
                this.ref_dt            = data.ref_dt;
                this.domains           = data.domains;
                this.places            = data.places;
                this.pointSerieDefault = data.pointSerieDefault;

            } else {
                //Default values
                this.hoursRun        = 24*7+6;
                this.startHour       = 0;
                this.endHour         = 24*7+6;
                this.optionLocalTime = false,
                this.domains         = ['MyDomain'];
            }
        } catch (error) {
            console.error('Error loading context:', error);
        }
    }
}

export class State extends EventTarget {
    #domain;
    #instance;
    #variable;
    #frame;
    #level;

    constructor(context) {
        super();
        this.#domain     = context.domains[0];
        this.#instance   = null;
        this.#variable   = null;
        this.#frame      = Math.floor(context.startHour * (60 / context.ref_dt))
        this.#level      = 0;

        this.cache       = {};   // para guardar datos precargados
        this.currentData = null; // data actual

        // NUEVO: listas de opciones disponibles
        this.domains     = context.domains || [];
        this.instances   = [];
        this.variables   = [];
    }

    get instance() { return this.#instance;}
    get domain()   { return this.#domain;  }
    get variable() { return this.#variable;}
    get frame()    { return this.#frame;   }
    get level()    { return this.#level;   }

    async init() {
        // Default values
        const dafaultInstance = null;
        // const dafaultVariable = 'mp10_hd_species';
        const dafaultVariable = null;
        await this.loadInstances(dafaultInstance);
        await this.loadVariables(dafaultVariable);
    }
    
    async loadInstances(dafaultDate=null) {
        if (!this.#domain) {
            this.#instance = null;
            this.instances = [];
        } else {
            const res = await fetch(`/api/instances/?domain=${this.#domain}`);
            const json = await res.json();
            this.instances = json.instances || [];
            
            // Atnencion! Actualizacion interna sin evento
            if (dafaultDate && this.instances.includes(dafaultDate)) {
                this.#instance = dafaultDate;
            }
            else {
                if (!this.instances.includes(this.#instance)) {
                    this.#instance = this.instances.sort()[this.instances.length-1] || null;
                }
            }
        }
        this.dispatchEvent(new CustomEvent("options:instances", { detail: this.instances }));
    }


    async loadVariables(dafaultVariable=null) {
        if (!this.#domain || !this.#instance) {
            this.variables = [];
        } else {
            const res = await fetch(`/api/variables/?domain=${this.#domain}&instance=${this.#instance}`);
            const json = await res.json();
            this.variables = json.variables || [];

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

    _cacheKey(domain, instance, variable) {
        return `${domain}__${instance}__${variable}`;
    }

    async loadData(domain, instance, variable) {
        const key = this._cacheKey(domain, instance,  variable);
        if (this.cache[key]) {
            return this.cache[key];
        }
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

    async getData(domain, instance, variable) {
        const data = await this.loadData(domain, instance, variable);
        return data;
    }

    async setCurrentData() {
        this.currentData = await this.loadData(this.#domain, this.#instance,  this.#variable);
    }

    // Emitir cambios 
    #emitChange(key, oldValue, newValue) {
        this.dispatchEvent(new CustomEvent("change", { detail: { key, oldValue, newValue } }));
        this.dispatchEvent(new CustomEvent(`change:${key}`, { detail: { oldValue, newValue } }));
    }
}
