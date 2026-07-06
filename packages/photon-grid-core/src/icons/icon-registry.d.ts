export interface IconRegistryOptions {
    defaultSize?: number;
    defaultColor?: string;
}
export declare class IconRegistry {
    private icons;
    private options;
    constructor(options?: IconRegistryOptions);
    register(name: string, svgContent: string): void;
    registerAll(iconSet: Record<string, string>): void;
    has(name: string): boolean;
    get(name: string): string | undefined;
    getAll(): Map<string, string>;
    remove(name: string): void;
    clear(): void;
    loadCoreIcons(): void;
    getNames(): string[];
}
//# sourceMappingURL=icon-registry.d.ts.map