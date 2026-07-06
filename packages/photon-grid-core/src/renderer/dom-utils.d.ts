export declare function createElement<K extends keyof HTMLElementTagNameMap>(tag: K, attrs?: Record<string, string | number | boolean>, cssText?: string): HTMLElementTagNameMap[K];
export declare function createDiv(className?: string, cssText?: string): HTMLDivElement;
export declare function setStyles(el: HTMLElement, styles: Partial<CSSStyleDeclaration>): void;
export declare function clearChildren(el: HTMLElement): void;
export declare function replaceChildren(el: HTMLElement, ...children: Node[]): void;
export declare function addClasses(el: HTMLElement, ...classes: string[]): void;
export declare function removeClasses(el: HTMLElement, ...classes: string[]): void;
export declare function toggleClass(el: HTMLElement, cls: string, condition: boolean): void;
export declare function getScrollbarWidth(): number;
export declare function measureTextWidth(text: string, font: string): number;
export declare function clamp(value: number, min: number, max: number): number;
export declare function getElementOffset(el: HTMLElement): {
    top: number;
    left: number;
};
export declare function isScrolledIntoView(el: HTMLElement, container: HTMLElement): boolean;
export declare function scrollIntoViewIfNeeded(el: HTMLElement, container: HTMLElement): void;
export declare function debounce<T extends (...args: unknown[]) => void>(fn: T, delay: number): (...args: Parameters<T>) => void;
export declare function throttle<T extends (...args: unknown[]) => void>(fn: T, interval: number): (...args: Parameters<T>) => void;
export declare function raf(fn: () => void): () => void;
export declare function rafLoop(fn: (dt: number) => void): () => void;
//# sourceMappingURL=dom-utils.d.ts.map