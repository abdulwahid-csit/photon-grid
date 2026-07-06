import type { IconRegistry } from './icon-registry';
export interface IconOptions {
    size?: number;
    color?: string;
    className?: string;
    title?: string;
    rotate?: number;
    spin?: boolean;
}
export declare class IconRenderer {
    private registry;
    constructor(registry: IconRegistry);
    render(name: string, options?: IconOptions): HTMLElement;
    renderToString(name: string, size?: number): string;
    updateIcon(el: HTMLElement, name: string, options?: IconOptions): void;
    injectSpinKeyframes(): void;
}
//# sourceMappingURL=icon-renderer.d.ts.map