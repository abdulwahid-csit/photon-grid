import { coreIcons } from './icon-sets/core-icons';
export class IconRegistry {
    constructor(options = {}) {
        this.icons = new Map(Object.entries(coreIcons));
        this.options = { defaultSize: 16, defaultColor: 'currentColor', ...options };
    }
    register(name, svgContent) {
        this.icons.set(name, svgContent);
    }
    registerAll(iconSet) {
        for (const [name, svg] of Object.entries(iconSet)) {
            this.icons.set(name, svg);
        }
    }
    has(name) {
        return this.icons.has(name);
    }
    get(name) {
        return this.icons.get(name);
    }
    getAll() {
        return new Map(this.icons);
    }
    remove(name) {
        this.icons.delete(name);
    }
    clear() {
        this.icons.clear();
    }
    loadCoreIcons() {
        this.registerAll(coreIcons);
    }
    getNames() {
        return Array.from(this.icons.keys());
    }
}
//# sourceMappingURL=icon-registry.js.map