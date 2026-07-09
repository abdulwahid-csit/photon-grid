import type { TemplateRef, Type } from '@angular/core';

import type {
    ColumnDef as coreColumnDef,
    DisplayRendererParams,
    EditorRendererParams,
    FilterRendererParams,
    GroupRendererParams,
    HeaderRendererParams,
    OptionRendererParams,
    RendererOutput,
    SummaryRendererParams,
    TooltipRendererParams,
} from 'photon-grid-core';
 
/**
 * Renders `params` through a `@Component`.
 *
 * A **new** component instance is created every time the core invokes the
 * renderer (it has no concept of "update", only "produce output for these
 * params"). `inputs` is re-evaluated on every mount and applied via
 * `ComponentRef.setInput` before the first change-detection pass, so the
 * component sees the current params as its initial `@Input()`s.
 */
export interface ComponentRendererSpec<TParams, TComponent = unknown> {
    readonly kind: 'component';
    readonly component: Type<TComponent>;
    /** Maps renderer params to the component's `@Input()` bag. */
    readonly inputs?: (params: TParams) => Partial<TComponent> & Record<string, unknown>;
}

/** Context handed to an `<ng-template>` used as a renderer. */
export interface RendererContext<TParams> {
    /** Enables `let-x` / implicit `let-params` template syntax. */
    $implicit: TParams;
    params: TParams;
    [key: string]: unknown;
}

/**
 * Renders `params` through an `<ng-template>` (obtained via `@ViewChild`).
 *
 * Prefer a single root element in the template for `editor` / `filter`
 * slots: the core treats the returned `HTMLElement` as the interactive
 * control itself (e.g. it may call `.focus()` on it), and a multi-root
 * template gets wrapped in a synthetic `<div>` host that breaks that
 * assumption.
 */
export interface TemplateRendererSpec<TParams> {
    readonly kind: 'template';
    readonly template: TemplateRef<RendererContext<TParams>>;
    readonly context?: (params: TParams) => Record<string, unknown>;
}

/**
 * A renderer slot accepts either:
 * - a declarative spec (`{ kind: 'component' | 'template', ... }`), or
 * - a plain function, for consumers who want to keep producing raw
 *   `HTMLElement`/`string` output (identical to the framework-agnostic core API).
 */
export type CellRenderer<TParams, TOutput> =
    | ComponentRendererSpec<TParams>
    | TemplateRendererSpec<TParams>
    | Type<unknown>
    | TemplateRef<RendererContext<TParams>>
    | ((params: TParams) => TOutput);

export interface ColumnRendererMap {
    display?: CellRenderer<DisplayRendererParams, RendererOutput>;
    editor?: CellRenderer<EditorRendererParams, HTMLElement>;
    option?: Type<any> | TemplateRef<any> | ((params: OptionRendererParams) => HTMLElement);
    filter?: CellRenderer<FilterRendererParams, HTMLElement>;
    tooltip?: CellRenderer<TooltipRendererParams, RendererOutput>;
    group?: CellRenderer<GroupRendererParams, RendererOutput>;
    header?: CellRenderer<HeaderRendererParams, RendererOutput>;
    summary?: CellRenderer<SummaryRendererParams, RendererOutput>;
}

/**
 * Drop-in replacement for `ColumnDef`: identical shape, except `renderer`
 * (and `renderer` on any nested `children`) accepts the declarative
 * component/template specs above in addition to plain functions.
 */
export type ColumnDef = Omit<coreColumnDef, 'renderer' | 'children'> & {
    renderer?: ColumnRendererMap;
    children?: ColumnDef[];
};

/** Narrowing helpers used by the adapter (and usable by consumers/tests). */
export function isComponentRendererSpec(
    value: unknown,
): value is ComponentRendererSpec<unknown> {
    return !!value && typeof value === 'object' && (value as { kind?: unknown }).kind === 'component';
}

export function isTemplateRendererSpec(
    value: unknown,
): value is TemplateRendererSpec<unknown> {
    return !!value && typeof value === 'object' && (value as { kind?: unknown }).kind === 'template';
}