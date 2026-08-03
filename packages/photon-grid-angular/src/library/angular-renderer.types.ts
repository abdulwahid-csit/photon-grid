import type { TemplateRef, Type } from '@angular/core';

import type {
    ColumnDefInput as CoreColumnDefInput,
    ColumnRenderer as CoreColumnRenderer,
    DetailContext,
    DetailRenderer as CoreDetailRenderer,
    DisplayRendererParams,
    EditorRendererParams,
    FilterRendererParams,
    GridOptions as CoreGridOptions,
    GroupRendererParams,
    HeaderRendererParams,
    MasterDetailConfig as CoreMasterDetailConfig,
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
 * Drop-in replacement for the core column definition, built on the core's
 * {@link CoreColumnDefInput} so it mirrors the same relaxed contract: **only
 * `field` is required**; `colId`, `header` and `type` are optional and filled
 * in by the core (auto `colId`, header defaulting to the field in Title Case,
 * `type` defaulting to `'string'`). This wrapper additionally lets `renderer`
 * (and `renderer` on any nested `children`) accept the declarative
 * component/template specs above in addition to plain functions.
 */
export type ColumnDef = Omit<CoreColumnDefInput, 'renderer' | 'children'> & {
    /**
     * Accepts everything the core does — a built-in renderer by name
     * (`'country'`), a configured one (`{ name, options }`), a bare display
     * function — plus the Angular-flavoured component/template specs in the
     * slot map below, which the adapter converts to plain functions.
     */
    renderer?: ColumnRendererMap | CoreColumnRenderer;
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

// ── Master/Detail: custom detail renderers ───────────────────────────────────

/**
 * Context handed to an `<ng-template>` used as a Master/Detail renderer.
 *
 * `data` and `props` are **live accessors** onto the core's `DetailContext`,
 * not snapshots — the same guarantee the core makes. A template bound with
 * `let-data` therefore keeps showing current row data across row transactions
 * and `ctx.refresh()` without the view being rebuilt.
 *
 * @example
 * ```html
 * <ng-template #detailTpl let-ctx let-data="data" let-props="props">
 *   <h2>{{ data['account'] }}</h2>
 *   <button type="button" (click)="ctx.emit('save', data)">Save</button>
 * </ng-template>
 * ```
 */
export interface DetailTemplateContext {
    /** Enables the implicit `let-ctx` binding. Same object as {@link ctx}. */
    $implicit: DetailContext;
    /** The core detail context: `emit`, `refresh`, `updateHeight`, `collapse`, `api`, `rowNode`. */
    ctx: DetailContext;
    /** Live master-row data. */
    readonly data: Record<string, unknown>;
    /** Live resolved output of `masterDetail.props`. */
    readonly props: Record<string, unknown>;
    [key: string]: unknown;
}

/**
 * Renders a detail row through an Angular `@Component`.
 *
 * Pass the component class directly to `masterDetail.renderer` — there is no
 * wrapper object. It receives `ctx`, `data` and `props` as `@Input()`s; add
 * more by returning them from `masterDetail.props`.
 *
 * Unlike cell renderers, the instance is created **once per expanded row** and
 * reused: the core's detail lifecycle gives us real `refresh` and `destroy`
 * hooks, so there is no mount-per-invocation and no `MutationObserver`.
 *
 * `masterDetail.renderer` as accepted by the Angular wrapper. Everything the
 * core accepts still works verbatim; the Angular forms are additive and are
 * likewise passed directly:
 *
 * ```ts
 * renderer: this.detailTpl        // an <ng-template>'s TemplateRef
 * renderer: OrderDetailComponent  // an Angular component class
 * renderer: (ctx) => `<h2>${ctx.data['account']}</h2>`   // core: HTML from a function
 * renderer: '<h2>Details</h2>'                           // core: a static HTML string
 * ```
 */
export type AngularDetailRenderer =
    | TemplateRef<DetailTemplateContext>
    | Type<unknown>
    | CoreDetailRenderer;

/** Core `MasterDetailConfig` with `renderer` widened to the Angular forms above. */
export type PhotonMasterDetailConfig = Omit<CoreMasterDetailConfig, 'renderer'> & {
    renderer?: AngularDetailRenderer;
};

/**
 * Core `GridOptions` with `masterDetail.renderer` widened to accept Angular
 * templates and components. Assignment-compatible with the core type, so an
 * existing `GridOptions` object binds to `[options]` unchanged.
 */
export type PhotonGridOptions = Omit<CoreGridOptions, 'masterDetail'> & {
    masterDetail?: PhotonMasterDetailConfig;
};