import {
    AfterViewInit,
    ChangeDetectionStrategy,
    Component,
    ElementRef,
    EventEmitter,
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
    ColumnDef,
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
} from 'photon-grid-core';

/**
 * Angular wrapper around the framework-agnostic Photon Grid core.
 *
 * The component owns a single {@link GridCore} instance, keeps it in sync with
 * the `columns`, `dataSet` and `options` inputs, and re-emits the grid's
 * internal events as strongly-typed Angular `@Output`s. All business logic
 * lives in the core; this class only bridges Angular's binding system to the
 * core's imperative API.
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
 */
@Component({
    selector: 'photon-grid',
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
     */
    @Input()
    columns: ColumnDef[] = [];

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
     */
    @Input()
    options: Partial<GridOptions> = {};

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

    /** The live core instance, created in {@link ngAfterViewInit}. */
    private grid?: GridCore;

    /** Unsubscribe callbacks for every wired core event; drained on teardown. */
    private readonly disposers: Array<() => void> = [];

    ngAfterViewInit(): void {
        this.createGrid();
    }

    ngOnChanges(changes: SimpleChanges): void {
        // Initial inputs are consumed by createGrid() in ngAfterViewInit.
        if (!this.grid) {
            return;
        }

        // An options change cannot be applied incrementally (no core setter),
        // so recreate; this already re-seeds columns and data.
        if (changes['options'] && !changes['options'].firstChange) {
            this.recreateGrid();
            return;
        }

        if (changes['columns'] && !changes['columns'].firstChange) {
            this.grid.api.setColumns(this.columns);
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
        const mergedOptions: GridOptions = {
            ...this.options,
            columns: this.columns,
            data: this.dataSet,
        };

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

    /** Disposes event subscriptions and the core instance, if any. */
    private teardownGrid(): void {
        for (const dispose of this.disposers) {
            dispose();
        }
        this.disposers.length = 0;

        this.grid?.destroy();
        this.grid = undefined;
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
