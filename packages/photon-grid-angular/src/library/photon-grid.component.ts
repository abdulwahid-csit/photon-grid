import {
    AfterViewInit,
    ApplicationRef,
    ChangeDetectionStrategy,
    Component,
    ElementRef,
    EnvironmentInjector,
    EventEmitter,
    Injector,
    Input,
    OnChanges,
    OnDestroy,
    Output,
    SimpleChanges,
    ViewChild,
} from '@angular/core';

import { GridCore, GridEventType } from 'photon-grid-core';

import type {
    CellClickedEvent,
    CellSelectionChangedEvent,
    CellValueChangedEvent,
    ColumnMovedEvent,
    ColumnResizedEvent,
    ColumnsStateChangedEvent,
    ColumnSortedEvent,
    DataChangedEvent,
    ExportEvent,
    FilterChangedEvent,
    GridApi,
    GridEventMap,
    GridOptions,
    PageChangedEvent,
    RowClickPayload,
    RowSelectedEvent,
    ThemeChangedEvent,
    ToolbarTabChangedEvent,
    ToolbarSearchChangedEvent,
    SummaryChangedEvent,
    SummaryRowsChangedEvent,
    ServerRequestEvent,
    ServerSuccessEvent,
    ServerErrorEvent,
    ServerRefreshEvent,
    ServerRetryEvent,
    LoadingChangedEvent,
} from 'photon-grid-core';

import { RendererAdapter } from './angular-renderer.adapter';
import type { ColumnDef as GridColumnDef, PhotonGridOptions } from './angular-renderer.types';

/**
 * Angular wrapper around the framework-agnostic Photon Grid core.
 *
 * The component owns a single {@link GridCore} instance, keeps it in sync
 * with the `columns`, `dataSet` and `options` inputs, and re-emits the
 * grid's internal events as strongly-typed Angular `@Output`s.
 *
 * Cell/header/editor/etc. renderers may be plain functions (raw
 * `HTMLElement`/`string`, identical to the core's own API), or declarative
 * Angular specs — `{ kind: 'component', component: MyBadge }` or
 * `{ kind: 'template', template: myTemplateRef }` — via {@link GridColumnDef}.
 * An internal {@link RendererAdapter} mounts/unmounts those for every
 * renderer invocation and disposes them as soon as the core discards their
 * host element, so virtualization/recycling never leaks components.
 *
 * @example
 * ```html
 * <photon-grid
 *   [columns]="columns"
 *   [dataSet]="rows"
 *   [options]="{ theme: 'light', showCheckboxes: true }"
 *   (gridReady)="onReady($event)"
 *   (rowClicked)="onRowClicked($event)">
 * </photon-grid>
 * ```
 *
 * @example Component-based cell renderer
 * ```ts
 * columns: GridColumnDef[] = [{
 *   colId: 'status', field: 'status', header: 'Status', type: 'string',
 *   renderer: {
 *     display: {
 *       kind: 'component',
 *       component: StatusBadgeComponent,
 *       inputs: (params) => ({ value: params.value }),
 *     },
 *   },
 * }];
 * ```
 *
 * @example Template-based cell renderer
 * ```html
 * <ng-template #statusTpl let-params>
 *   <span class="badge">{{ params.value }}</span>
 * </ng-template>
 * ```
 * ```ts
 * @ViewChild('statusTpl') statusTpl!: TemplateRef<RendererContext<DisplayRendererParams>>;
 * columns: GridColumnDef[] = [{
 *   colId: 'status', field: 'status', header: 'Status', type: 'string',
 *   renderer: { display: { kind: 'template', template: this.statusTpl } },
 * }];
 * ```
 *
 * @example Template-based Master/Detail renderer
 * ```html
 * <ng-template #detailTpl let-ctx let-data="data">
 *   <h2>{{ data['account'] }}</h2>
 *   <button type="button" (click)="ctx.emit('save', data)">Save</button>
 * </ng-template>
 * ```
 * ```ts
 * @ViewChild('detailTpl') detailTpl!: TemplateRef<DetailTemplateContext>;
 * options: Partial<PhotonGridOptions> = {
 *   masterDetail: {
 *     enabled: true,
 *     renderer: { kind: 'template', template: this.detailTpl },
 *     props: (ctx) => ({ orders: ctx.detailData ?? [] }),
 *     events: { save: (e) => this.persist(e.payload) },
 *   },
 * };
 * ```
 */
@Component({
    selector: 'photon-grid-angular',
    standalone: true,
    template: `<div #gridHost class="photon-grid__host"></div>`,
    styleUrl: './photon-grid.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PhotonGridComponent implements AfterViewInit, OnChanges, OnDestroy {

    /** Container the grid renders into. */
    @ViewChild('gridHost', { static: true, read: ElementRef })
    private readonly gridHost!: ElementRef<HTMLDivElement>;

    /**
     * Column definitions. Bound to {@link GridApi.setColumns} on change.
     * Provided as a dedicated input rather than through `options.columns`.
     * Renderer slots accept Angular components/templates in addition to
     * plain functions — see {@link GridColumnDef}.
     */
    @Input()
    columns: GridColumnDef[] = [];

    /**
     * Row data. Bound to {@link GridApi.setData} on change. Provided as a
     * dedicated input rather than through `options.data`.
     */
    @Input()
    dataSet: Record<string, unknown>[] = [];

    /**
     * Remaining grid options (theme, selection, editing, pagination, …).
     * `columns` and `data` are supplied by the dedicated inputs above and are
     * merged in automatically. The core has no runtime options setter, so a
     * change to this input transparently recreates the grid.
     *
     * Enable the natural-language AI panel — and, optionally, its Gemini
     * generative back-end — through `options.photonAI`:
     *
     * @example Gemini-powered AI panel
     * ```ts
     * import { PhotonAIProviderType } from 'photon-grid-angular';
     *
     * options: Partial<GridOptions> = {
     *   photonAI: {
     *     enabled: true,
     *     provider: {
     *       type: PhotonAIProviderType.Gemini,
     *       apiKey: environment.geminiApiKey,
     *       model: 'gemini-flash-latest',
     *     },
     *   },
     * };
     * ```
     */
    @Input()
    options: Partial<PhotonGridOptions> = {};

    /**
     * Whether the grid shows its loading indicator.
     *
     * A dedicated input rather than an `options` field, because a change to
     * `options` recreates the grid — this routes to {@link GridApi.setLoading}
     * instead, so toggling it is a repaint, not a rebuild, and grid state
     * (scroll position, selection, column layout) survives untouched.
     *
     * Configure the indicator's appearance — spinner (default) or skeleton
     * placeholder rows — through `options.loadingOverlay`.
     *
     * @example
     * ```html
     * <photon-grid-angular
     *   [columns]="columns"
     *   [dataSet]="rows"
     *   [loading]="isLoading"
     *   [options]="{ loadingOverlay: { indicator: LoadingIndicator.Skeleton } }">
     * </photon-grid-angular>
     * ```
     */
    @Input()
    loading = false;

    /** Emitted once the grid is constructed, carrying its {@link GridApi}. */
    @Output() readonly gridReady = new EventEmitter<GridApi>();

    /** Row data changed (count delta). */
    @Output() readonly dataChanged = new EventEmitter<DataChangedEvent>();

    /** A row was clicked. */
    @Output() readonly rowClicked = new EventEmitter<RowClickPayload>();

    /** A row was double-clicked. */
    @Output() readonly rowDoubleClicked = new EventEmitter<RowClickPayload>();

    /** Row selection changed. */
    @Output() readonly rowSelected = new EventEmitter<RowSelectedEvent>();

    /** A cell was clicked. */
    @Output() readonly cellClicked = new EventEmitter<CellClickedEvent>();

    /** A cell was double-clicked. */
    @Output() readonly cellDoubleClicked = new EventEmitter<CellClickedEvent>();

    /** A cell value was committed. */
    @Output() readonly cellValueChanged = new EventEmitter<CellValueChangedEvent>();

    /** Range/cell selection changed. */
    @Output() readonly cellSelectionChanged = new EventEmitter<CellSelectionChangedEvent>();

    /** A column was resized. */
    @Output() readonly columnResized = new EventEmitter<ColumnResizedEvent>();

    /** A column was reordered. */
    @Output() readonly columnMoved = new EventEmitter<ColumnMovedEvent>();

    /** Sort state changed. */
    @Output() readonly sortChanged = new EventEmitter<ColumnSortedEvent>();

    /** Filter model changed. */
    @Output() readonly filterChanged = new EventEmitter<FilterChangedEvent>();

    /** Pagination page or size changed. */
    @Output() readonly pageChanged = new EventEmitter<PageChangedEvent>();

    /** Column state (width/visibility/pin/order) changed. */
    @Output() readonly columnsStateChanged = new EventEmitter<ColumnsStateChangedEvent>();

    /** Active theme changed. */
    @Output() readonly themeChanged = new EventEmitter<ThemeChangedEvent>();

    /** An export finished. */
    @Output() readonly exportComplete = new EventEmitter<ExportEvent>();

    /** A toolbar tab was selected (by the user or `api.setActiveToolbarTab`). */
    @Output() readonly toolbarTabChanged = new EventEmitter<ToolbarTabChangedEvent>();

    /** The toolbar's global search query changed (debounced). */
    @Output() readonly toolbarSearchChanged = new EventEmitter<ToolbarSearchChangedEvent>();

    /** Summary row values were recomputed (automatically, or via `api.refreshSummary()`). */
    @Output() readonly summaryChanged = new EventEmitter<SummaryChangedEvent>();

    /** The set of summary row *definitions* changed (`setSummaryRows` / `updateSummaryRow` / `removeSummaryRow`). */
    @Output() readonly summaryRowsChanged = new EventEmitter<SummaryRowsChangedEvent>();

    /** Server-Side Row Model: a fetch is about to be issued (or served from cache). */
    @Output() readonly serverRequest = new EventEmitter<ServerRequestEvent>();

    /** Server-Side Row Model: a fetched (or cached) slice was applied to the grid. */
    @Output() readonly serverSuccess = new EventEmitter<ServerSuccessEvent>();

    /** Server-Side Row Model: a request ultimately failed (after any retries). */
    @Output() readonly serverError = new EventEmitter<ServerErrorEvent>();

    /** Server-Side Row Model: `api.refreshServerSide()` was invoked. */
    @Output() readonly serverRefresh = new EventEmitter<ServerRefreshEvent>();

    /** Server-Side Row Model: a failed request is being retried. */
    @Output() readonly serverRetry = new EventEmitter<ServerRetryEvent>();

    /**
     * The loading state changed — emitted once per transition, whether it came
     * from the `loading` input, `GridApi.setLoading`, or a server-backed row
     * model fetching in the background.
     */
    @Output() readonly loadingChanged = new EventEmitter<LoadingChangedEvent>();

    /** The live core instance, created in {@link ngAfterViewInit}. */
    private grid?: GridCore;

    /** Unsubscribe callbacks for every wired core event; drained on teardown. */
    private readonly disposers: Array<() => void> = [];

    /**
     * Bridges Angular component/template renderer specs to the core's
     * plain-function `ColumnRendererMap`. Owned for the lifetime of this
     * component (not DI-provided) so its mounted-view tracking is scoped
     * to this grid instance alone.
     *
     * Built explicitly in the constructor body (rather than as a field
     * initializer referencing constructor-parameter properties) so it isn't
     * subject to field-initializer-vs-parameter-property ordering: at this
     * point `appRef`/`environmentInjector`/`elementInjector` are plain local
     * constructor arguments, guaranteed to already be set.
     */
    private readonly rendererAdapter: RendererAdapter;

    constructor(
        appRef: ApplicationRef,
        environmentInjector: EnvironmentInjector,
        elementInjector: Injector,
    ) {
        this.rendererAdapter = new RendererAdapter(appRef, environmentInjector, elementInjector);
    }

    ngAfterViewInit(): void {
        this.createGrid();
    }

    ngOnChanges(changes: SimpleChanges): void {
        // Initial inputs are consumed by createGrid() in ngAfterViewInit.
        if (!this.grid) {
            return;
        }

        // Handled before the `options` branch below: a loading toggle must never
        // fall through to a recreate, and it is applied even when `options`
        // changed in the same tick — the recreate seeds `loading` itself.
        if (changes['loading'] && !changes['loading'].firstChange && !changes['options']) {
            this.grid.api.setLoading(this.loading);
            return;
        }

        // An options change cannot be applied incrementally (no core setter),
        // so recreate; this already re-seeds columns and data.
        if (changes['options'] && !changes['options'].firstChange) {
            this.recreateGrid();
            return;
        }

        if (changes['columns'] && !changes['columns'].firstChange) {
            this.grid.api.setColumns(this.rendererAdapter.adaptColumns(this.columns));
        }

        if (changes['dataSet'] && !changes['dataSet'].firstChange) {
            this.grid.api.setData(this.dataSet);
        }
    }

    ngOnDestroy(): void {
        this.teardownGrid();
    }

    /** Builds the core from the current inputs and wires its events. */
    private createGrid(): void {
        // Must be observing *before* the core mounts anything, so every
        // renderer-produced element is tracked for cleanup from the start.
        this.rendererAdapter.observe(this.gridHost.nativeElement);

        const mergedOptions: GridOptions = {
            ...this.rendererAdapter.adaptOptions(this.options),
            columns: this.rendererAdapter.adaptColumns(this.columns),
            data: this.dataSet,
            // Seeded rather than applied after construction, so a grid created
            // with `[loading]="true"` paints its overlay on the first frame
            // instead of flashing an empty body.
            loading: this.loading,
        } as GridOptions;

        const grid = new GridCore(this.gridHost.nativeElement, mergedOptions);
        this.grid = grid;

        this.wireEvents(grid.api);

        // GridCore emits READY synchronously during construction (before we can
        // attach a listener), so surface the ready signal explicitly here.
        this.gridReady.emit(grid.api);
    }

    /** Destroys the current core, drops it, and builds a fresh one. */
    private recreateGrid(): void {
        this.teardownGrid();
        this.createGrid();
    }

    /**
     * Disposes event subscriptions, the renderer adapter (stopping its
     * observer and destroying every mounted component/embedded view), and
     * the core instance itself, if any.
     *
     * Order matters: the adapter is disposed *after* `grid.destroy()` so
     * any teardown-time DOM removal is irrelevant (dispose() unconditionally
     * destroys all remaining mounts rather than depending on the
     * MutationObserver having flushed).
     */
    private teardownGrid(): void {
        for (const dispose of this.disposers) {
            dispose();
        }
        this.disposers.length = 0;

        this.grid?.destroy();
        this.grid = undefined;

        this.rendererAdapter.dispose();
    }

    /** Subscribes every core event to its corresponding `@Output` emitter. */
    private wireEvents(api: GridApi): void {
        this.subscribe(api, GridEventType.DATA_CHANGED, this.dataChanged);
        this.subscribe(api, GridEventType.ROW_CLICKED, this.rowClicked);
        this.subscribe(api, GridEventType.ROW_DOUBLE_CLICKED, this.rowDoubleClicked);
        this.subscribe(api, GridEventType.ROW_SELECTED, this.rowSelected);
        this.subscribe(api, GridEventType.CELL_CLICKED, this.cellClicked);
        this.subscribe(api, GridEventType.CELL_DOUBLE_CLICKED, this.cellDoubleClicked);
        this.subscribe(api, GridEventType.CELL_VALUE_CHANGED, this.cellValueChanged);
        this.subscribe(api, GridEventType.CELL_SELECTION_CHANGED, this.cellSelectionChanged);
        this.subscribe(api, GridEventType.COLUMN_RESIZED, this.columnResized);
        this.subscribe(api, GridEventType.COLUMN_MOVED, this.columnMoved);
        this.subscribe(api, GridEventType.SORT_CHANGED, this.sortChanged);
        this.subscribe(api, GridEventType.FILTER_CHANGED, this.filterChanged);
        this.subscribe(api, GridEventType.PAGE_CHANGED, this.pageChanged);
        this.subscribe(api, GridEventType.COLUMNS_STATE_CHANGED, this.columnsStateChanged);
        this.subscribe(api, GridEventType.THEME_CHANGED, this.themeChanged);
        this.subscribe(api, GridEventType.EXPORT_COMPLETE, this.exportComplete);
        this.subscribe(api, GridEventType.TOOLBAR_TAB_CHANGED, this.toolbarTabChanged);
        this.subscribe(api, GridEventType.TOOLBAR_SEARCH_CHANGED, this.toolbarSearchChanged);
        this.subscribe(api, GridEventType.SUMMARY_CHANGED, this.summaryChanged);
        this.subscribe(api, GridEventType.SUMMARY_ROWS_CHANGED, this.summaryRowsChanged);
        this.subscribe(api, GridEventType.SERVER_REQUEST, this.serverRequest);
        this.subscribe(api, GridEventType.SERVER_SUCCESS, this.serverSuccess);
        this.subscribe(api, GridEventType.SERVER_ERROR, this.serverError);
        this.subscribe(api, GridEventType.SERVER_REFRESH, this.serverRefresh);
        this.subscribe(api, GridEventType.SERVER_RETRY, this.serverRetry);
        // Both transitions feed one emitter: the payload's `loading` flag is
        // what a host switches on, so two outputs would only duplicate it.
        this.subscribe(api, GridEventType.LOADING_STARTED, this.loadingChanged);
        this.subscribe(api, GridEventType.LOADING_STOPPED, this.loadingChanged);
    }

    /**
     * Forwards a single strongly-typed core event to an Angular emitter and
     * records its unsubscribe callback. The generic constraint guarantees the
     * emitter's payload type matches the event's payload in {@link GridEventMap}.
     */
    private subscribe<E extends keyof GridEventMap>(
        api: GridApi,
        event: E,
        emitter: EventEmitter<GridEventMap[E]>,
    ): void {
        const dispose = api.on<GridEventMap[E]>(event, (payload) => emitter.emit(payload));
        this.disposers.push(dispose);
    }
}