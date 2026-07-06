import type { ColumnDef } from '../../types/column.types';
import type { ColumnFilter, FilterSetOption } from '../../types/filter.types';
export type { FilterSetOption } from '../../types/filter.types';
/**
 * Full configuration object passed to {@link FilterPanel} on construction.
 * The caller is responsible for supplying the unique-value list and wiring the
 * change and close callbacks.
 */
export interface FilterPanelConfig {
    /** Column definition for which the filter is being applied. */
    colDef: ColumnDef;
    /**
     * Element the panel anchors to (the filter-icon button in the column header).
     * Used for positioning the panel directly below the clicked button.
     */
    anchorEl: HTMLElement;
    /**
     * Grid wrapper element (`pg-grid`).  The panel is appended here so it clips
     * to the grid boundary and participates in its z-index stacking context.
     */
    containerEl: HTMLElement;
    /** Currently-applied filter, or `null` when no filter is active on this column. */
    currentFilter: ColumnFilter | null;
    /**
     * Pre-extracted unique value/label pairs for set-type (dropdown / array)
     * columns.  Passed in rather than derived here so the caller can cache or
     * sort them once instead of on every panel open.
     */
    uniqueOptions: FilterSetOption[];
    /** Called immediately when the user changes any filter state. */
    onFilterChange: (filter: ColumnFilter | null) => void;
    /** Called when the panel is closed by any means (click-outside, Escape, Clear). */
    onClose: () => void;
}
/**
 * Floating filter panel rendered below a column header cell.
 *
 * The panel is appended to the grid's wrapper element (`pg-grid`) so that it
 * clips correctly and participates in the grid's z-index context.
 *
 * ### Lifecycle
 * ```
 * const panel = new FilterPanel(config);
 * panel.open();       // renders + positions + attaches global listeners
 * // ... user interacts, onFilterChange is called in real-time ...
 * panel.destroy();    // unmounts and calls onClose
 * ```
 *
 * The caller should keep track of the open panel instance and call `destroy()`
 * before opening a new panel for another column.
 */
export declare class FilterPanel {
    private readonly config;
    private panelEl;
    private op1;
    private val1;
    private val1To;
    private logicMode;
    private op2;
    private val2;
    private val2To;
    private allOptions;
    private displayOptions;
    private selectedValues;
    private setSearchTerm;
    private vsContainerEl;
    private vsInnerEl;
    private logicRowEl;
    private cond2RowEl;
    private selectAllCbEl;
    private debounceTimer;
    private readonly boundClickOutside;
    private readonly boundEscapeKey;
    constructor(config: FilterPanelConfig);
    /**
     * Renders the panel DOM, appends it to the container, positions it below the
     * anchor element, and attaches global click-outside / Escape listeners.
     */
    open(): void;
    /** Removes the panel from the DOM and fires the `onClose` callback. */
    destroy(): void;
    private buildConditionFilter;
    private buildConditionRow;
    private hasConditionValue;
    private buildSetFilter;
    private buildDivider;
    private applySetSearch;
    private renderVirtualList;
    private buildSetItem;
    private updateSelectAllState;
    private get searchTerm();
    private buildFooter;
    private buildColumnFilter;
    private buildConditionObject;
    private getFilterDataType;
    private scheduleEmit;
    private emitFilter;
    private clearDebounce;
    private position;
    private handleClickOutside;
    private handleEscapeKey;
}
//# sourceMappingURL=filter-panel.d.ts.map