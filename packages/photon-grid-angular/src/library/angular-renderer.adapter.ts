import {
    ApplicationRef,
    ComponentRef,
    EmbeddedViewRef,
    EnvironmentInjector,
    Injector,
    TemplateRef,
    createComponent,
} from '@angular/core';

import type { ColumnDef, RendererOutput } from 'photon-grid-core';

import {
    CellRenderer,
    ColumnRendererMap,
    ColumnDef as GridColumnDef,
    RendererContext,
    isComponentRendererSpec,
    isTemplateRendererSpec,
} from './angular-renderer.types';

type RendererMount =
    | { readonly kind: 'component'; readonly ref: ComponentRef<unknown> }
    | { readonly kind: 'template'; readonly ref: EmbeddedViewRef<unknown> };

type GridLifecycleMethod = 'pgGridInit' | 'pgGridRefresh' | 'pgGridDestroy';

/**
 * Bridges the framework-agnostic `ColumnRendererMap` (plain functions
 * returning `HTMLElement | string`) to Angular components and templates.
 *
 * One instance is owned per `<photon-grid>` and lives for the component's
 * lifetime: {@link adaptColumns} is called whenever columns are (re)supplied,
 * and {@link dispose} is called once, in `ngOnDestroy`, to guarantee nothing
 * outlives the host component.
 *
 * ### Why a MutationObserver
 * The core owns cell/row virtualization and recycling; it has no lifecycle
 * hook that tells us "this cell's DOM node is gone, destroy whatever you
 * mounted into it". Since every renderer invocation mounts a *fresh*
 * component/embedded view (the core's contract is "produce output for these
 * params", not "patch existing output"), the only reliable place to catch
 * disposal is watching the DOM itself: when the core removes/replaces a
 * mounted host element, a MutationObserver on the grid root sees it and we
 * destroy the corresponding Angular view right then. This is what keeps
 * scrolling/virtualized grids from leaking components.
 */
export class RendererAdapter {
    /** Host element -> live Angular view mounted into it. */
    private readonly mounts = new Map<HTMLElement, RendererMount>();

    private observer?: MutationObserver;

    constructor(
        private readonly appRef: ApplicationRef,
        private readonly environmentInjector: EnvironmentInjector,
        private readonly elementInjector: Injector,
    ) {}

    /**
     * Starts watching `root` for node removals so mounted views can be torn
     * down as soon as the core discards their host element. Safe to call
     * repeatedly (e.g. across grid recreation) — any previous observer is
     * disconnected first, but existing mounts are left untouched.
     */
    observe(root: HTMLElement): void {
        this.observer?.disconnect();

        this.observer = new MutationObserver((mutations) => {
            // Bounded by the number of *currently mounted* renderer views
            // (i.e. visible custom cells), not by row/data-set size, because
            // virtualization keeps that number small regardless of grid size.
            if (this.mounts.size === 0) {
                return;
            }
            for (const mutation of mutations) {
                mutation.removedNodes.forEach((node) => this.cleanupRemovedNode(node));
            }
        });

        this.observer.observe(root, { childList: true, subtree: true });
    }

    /** Recursively converts `GridColumnDef[]` into plain `ColumnDef[]`. */
    adaptColumns(columns: readonly GridColumnDef[]): ColumnDef[] {
        return columns.map((column) => this.adaptColumn(column));
    }

    /**
     * Destroys every currently-mounted component/embedded view and stops
     * observing. Call exactly once, when the owning grid is torn down.
     * Deliberately unconditional (does not wait on the MutationObserver):
     * `disconnect()` drops any in-flight mutation records, so relying on it
     * for final teardown would risk leaking whatever hadn't been flushed yet.
     */
    dispose(): void {
        this.observer?.disconnect();
        this.observer = undefined;

        for (const [element, mount] of this.mounts) {
            this.destroyMount(mount);
            this.mounts.delete(element);
        }
    }

    private adaptColumn(column: GridColumnDef): ColumnDef {
        const { renderer, children, ...rest } = column;
        const adapted = { ...rest } as ColumnDef;

        if (renderer) {
            // Adapted per-slot (rather than via a generic loop over the
            // slot names) so each call keeps its own TParams/TOutput pair —
            // looping over a union of keys would force `adaptRenderer` to
            // accept the union of every slot's renderer type at once, which
            // doesn't type-check (an EditorRendererParams renderer isn't
            // assignable where a TooltipRendererParams renderer is expected).
            const adaptedRenderer: Partial<ColumnRendererMap> = {
                display: this.adaptRenderer(renderer.display),
                editor: this.adaptRenderer(renderer.editor),
                option: this.adaptRenderer(renderer.option),
                filter: this.adaptRenderer(renderer.filter),
                tooltip: this.adaptRenderer(renderer.tooltip),
                group: this.adaptRenderer(renderer.group),
                header: this.adaptRenderer(renderer.header),
                summary: this.adaptRenderer(renderer.summary),
            };
            adapted.renderer = adaptedRenderer as any;
        }

        if (children) {
            adapted.children = children.map((child) => this.adaptColumn(child));
        }

        return adapted;
    }

    private adaptRenderer<TParams, TOutput extends RendererOutput | HTMLElement>(
        renderer: CellRenderer<TParams, TOutput> | undefined,
    ): ((params: TParams) => TOutput) | undefined {
        if (!renderer) {
            return undefined;
        }

        if (isComponentRendererSpec(renderer)) {
            return (params: TParams) => this.mountComponent(renderer, params) as unknown as TOutput;
        }

        if (isTemplateRendererSpec(renderer)) {
            return (params: TParams) => this.mountTemplate(renderer, params) as unknown as TOutput;
        }

        if (renderer instanceof TemplateRef) {
            return (params: TParams) => this.mountTemplate({ template: renderer }, params) as unknown as TOutput;
        }

        if (this.isComponentType(renderer)) {
            return (params: TParams) => this.mountComponent({ component: renderer }, params) as unknown as TOutput;
        }

        if (typeof renderer === 'function') {
            return renderer;
        }

        return undefined;
    }

    private isComponentType(value: unknown): value is import('@angular/core').Type<unknown> {
        return typeof value === 'function' && !!(value as { readonly ɵcmp?: unknown }).ɵcmp;
    }

    private mountComponent<TParams>(
        spec: { component: import('@angular/core').Type<unknown>; inputs?: (params: TParams) => Record<string, unknown> },
        params: TParams,
    ): HTMLElement {
        const componentRef = createComponent(spec.component, {
            environmentInjector: this.environmentInjector,
            elementInjector: this.elementInjector,
        });

        const normalizedParams = this.normalizeRendererParams(params);
        const inputs = spec.inputs ? spec.inputs(normalizedParams) : this.inferInputs(componentRef, normalizedParams);
        for (const [key, value] of Object.entries(inputs)) {
            this.setComponentInput(componentRef, key, value);
        }

        this.setComponentInput(componentRef, 'params', normalizedParams);

        // Attaching to ApplicationRef is what makes this component
        // participate in normal change detection (zone triggers, async
        // pipe, etc.) for as long as it stays mounted — required for any
        // interactivity inside the component itself (clicks, forms, ...).
        this.appRef.attachView(componentRef.hostView);
        componentRef.changeDetectorRef.detectChanges();

        this.invokeLifecycle(componentRef.instance, 'pgGridInit', normalizedParams);
        this.invokeLifecycle(componentRef.instance, 'pgGridRefresh', normalizedParams);

        const element = componentRef.location.nativeElement as HTMLElement;
        this.mounts.set(element, { kind: 'component', ref: componentRef });
        return element;
    }

    private setComponentInput<TComponent>(
        componentRef: ComponentRef<TComponent>,
        key: string,
        value: unknown,
    ): void {
        try {
            componentRef.setInput(key, value);
            return;
        } catch {
            const instance = componentRef.instance as Record<string, unknown>;
            instance[key] = value;
        }
    }

    private normalizeRendererParams<TParams>(params: TParams): TParams & { value?: unknown; rawValue?: unknown } {
        const normalized = { ...(params as Record<string, unknown>) };
        const option = normalized['option'];

        if (normalized['value'] === undefined && option && typeof option === 'object') {
            const optionValue = (option as { value?: unknown }).value;
            normalized['value'] = optionValue;
            normalized['rawValue'] = optionValue;
        }

        return normalized as TParams & { value?: unknown; rawValue?: unknown };
    }

    private inferInputs<TComponent, TParams>(
        componentRef: ComponentRef<TComponent>,
        params: TParams,
    ): Record<string, unknown> {
        const instance = componentRef.instance as Record<string, unknown>;
        const inputs: Record<string, unknown> = {};
        const paramBag = params as Record<string, unknown>;
        const row = paramBag['row'] && typeof paramBag['row'] === 'object'
            ? paramBag['row'] as Record<string, unknown>
            : undefined;

        for (const key of Object.keys(instance)) {
            if (key === '__ngContext__' || key === 'constructor') {
                continue;
            }

            if (paramBag[key] !== undefined) {
                inputs[key] = paramBag[key];
                continue;
            }

            if (row && row[key] !== undefined) {
                inputs[key] = row[key];
                continue;
            }

            if (key === 'seed' && row && row['id'] !== undefined) {
                inputs[key] = row['id'];
                continue;
            }

            if (key === 'value' && paramBag['value'] !== undefined) {
                inputs[key] = paramBag['value'];
            }
        }

        return inputs;
    }

    private invokeLifecycle<TParams>(
        instance: unknown,
        lifecycle: GridLifecycleMethod,
        params: TParams,
    ): void {
        const candidate = (instance as Record<string, unknown> | null)?.[lifecycle];
        if (typeof candidate === 'function') {
            (candidate as (params: TParams) => void).call(instance, params);
        }
    }

    private mountTemplate<TParams>(
        spec: {
            template: import('@angular/core').TemplateRef<RendererContext<TParams>>;
            context?: (params: TParams) => Record<string, unknown>;
        },
        params: TParams,
    ): HTMLElement {
        const normalizedParams = this.normalizeRendererParams(params);
        const context = {
            $implicit: normalizedParams,
            params: normalizedParams,
            ...(spec.context ? spec.context(normalizedParams) : {}),
        };

        const viewRef = spec.template.createEmbeddedView(context);
        this.appRef.attachView(viewRef);
        viewRef.detectChanges();

        const host = this.resolveTemplateHost(viewRef);
        this.mounts.set(host, { kind: 'template', ref: viewRef });
        return host;
    }

    /**
     * Uses the template's single root element directly when possible (so
     * `editor`/`filter` slots that expect the returned element to *be* the
     * control keep working); falls back to a wrapper `<div>` for templates
     * with multiple root nodes or text-only content.
     */
    private resolveTemplateHost(viewRef: EmbeddedViewRef<unknown>): HTMLElement {
        const [singleRoot] = viewRef.rootNodes;
        if (viewRef.rootNodes.length === 1 && singleRoot instanceof HTMLElement) {
            return singleRoot;
        }

        const host = document.createElement('div');
        host.classList.add('photon-grid__template-host');
        host.append(...viewRef.rootNodes);
        return host;
    }

    private cleanupRemovedNode(node: Node): void {
        if (!(node instanceof HTMLElement)) {
            return;
        }

        const directMount = this.mounts.get(node);
        if (directMount) {
            this.mounts.delete(node);
            this.destroyMount(directMount);
        }

        // The core may remove an ancestor (e.g. an entire recycled row)
        // rather than the mounted element itself; sweep for any tracked
        // host contained in the removed subtree.
        if (node.childElementCount === 0) {
            return;
        }
        for (const [element, mount] of this.mounts) {
            if (node.contains(element)) {
                this.mounts.delete(element);
                this.destroyMount(mount);
            }
        }
    }

    private destroyMount(mount: RendererMount): void {
        if (mount.kind === 'component') {
            this.invokeLifecycle(mount.ref.instance, 'pgGridDestroy', undefined);
            const viewRef = mount.ref.hostView;
            this.appRef.detachView(viewRef);
            mount.ref.destroy();
            return;
        }

        const viewRef = mount.ref;
        this.appRef.detachView(viewRef);
        mount.ref.destroy();
    }
}