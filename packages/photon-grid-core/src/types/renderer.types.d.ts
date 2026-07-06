import type { AggFunc, ColumnDef, ColumnDropdownOption } from './column.types';
import type { ColumnFilter, FilterSetOption } from './filter.types';
import type { RowNode } from './row.types';
/**
 * Identifies one customizable rendering concern on a column.
 *
 * Used internally wherever a slot needs to be looked up generically (e.g.
 * {@link resolveColumnRenderer}) instead of by a hardcoded property access,
 * so new slots can be added without touching every call site.
 */
export declare enum RendererSlot {
    Display = "display",
    Editor = "editor",
    Option = "option",
    Filter = "filter",
    Tooltip = "tooltip",
    Group = "group",
    Header = "header",
    Summary = "summary"
}
/**
 * Anything a renderer slot may return: a ready-made element to append, or an
 * HTML string to be assigned via `innerHTML` (mirrors how the grid has always
 * accepted string output from custom renderers).
 */
export type RendererOutput = HTMLElement | string;
/** Params passed to {@link ColumnRendererMap.display} — how a data cell's value is drawn. */
export interface DisplayRendererParams {
    value: unknown;
    rawValue: unknown;
    row: Record<string, unknown>;
    colDef: ColumnDef;
    rowIndex: number;
    colIndex: number;
    api: unknown;
}
/**
 * Params passed to {@link ColumnRendererMap.editor} — how a cell's edit widget is built.
 *
 * The renderer owns its own input element(s) entirely; it must call
 * `onValueChange` as the user edits and `onEditStop` to commit and close the
 * editor (e.g. on blur or Enter). The grid handles validation, undo/redo, and
 * DOM teardown the same way it does for built-in editors.
 */
export interface EditorRendererParams {
    value: unknown;
    row: Record<string, unknown>;
    colDef: ColumnDef;
    rowIndex: number;
    onValueChange: (newValue: unknown) => void;
    onEditStop: () => void;
}
/**
 * Params passed to {@link ColumnRendererMap.option} — one row in a dropdown/select
 * option list. Used both by the cell editor's option list and by the default
 * filter panel's set-filter checkbox list, so one `option` renderer covers
 * both surfaces consistently (e.g. a flag icon next to a country name).
 */
export interface OptionRendererParams {
    option: ColumnDropdownOption;
    index: number;
    selected: boolean;
    highlighted: boolean;
    colDef: ColumnDef;
    api: unknown;
}
/**
 * Params passed to {@link ColumnRendererMap.filter} — the full filter panel body for a column.
 *
 * A custom filter renderer is responsible for its own apply/clear affordances;
 * it should call `onFilterChange` whenever the effective filter changes (or
 * `null` to clear it) and `onClose` when it should be dismissed.
 */
export interface FilterRendererParams {
    colDef: ColumnDef;
    anchorEl: HTMLElement;
    currentFilter: ColumnFilter | null;
    uniqueOptions: FilterSetOption[];
    onFilterChange: (filter: ColumnFilter | null) => void;
    onClose: () => void;
    api: unknown;
}
/** Params passed to {@link ColumnRendererMap.tooltip} — content shown when hovering a cell. */
export interface TooltipRendererParams {
    value: unknown;
    rawValue: unknown;
    row: Record<string, unknown>;
    colDef: ColumnDef;
    rowIndex: number;
    colIndex: number;
    api: unknown;
}
/**
 * Params passed to {@link ColumnRendererMap.group} — the label content of a
 * group-header row for the column currently being grouped by.
 *
 * Only the label is replaced; the expand/collapse toggle button remains the
 * grid's default so grouping interaction always keeps working.
 */
export interface GroupRendererParams {
    row: RowNode;
    colDef: ColumnDef;
    groupValue: unknown;
    childCount: number;
    collapsed: boolean;
    api: unknown;
}
/** Params passed to {@link ColumnRendererMap.header} — a column header cell's content. */
export interface HeaderRendererParams {
    colDef: ColumnDef;
    sortOrder: 'asc' | 'desc' | null;
    filterActive: boolean;
    api: unknown;
}
/** Params passed to {@link ColumnRendererMap.summary} — an aggregate/summary cell's content. */
export interface SummaryRendererParams {
    colDef: ColumnDef;
    value: unknown;
    aggregation: AggFunc;
    label?: string;
    api: unknown;
}
/**
 * Per-column rendering overrides, grouped by concern.
 *
 * Every slot is independently optional — an absent slot falls back to Photon
 * Grid's built-in rendering for that concern, so columns can override just
 * one aspect (e.g. only `display`) without having to reimplement the rest.
 *
 * Each slot's contract is a plain function returning `HTMLElement | string`,
 * which keeps the core framework-agnostic: a future React/Angular/Vue wrapper
 * package can implement any slot by mounting a component/template into a
 * detached container and returning it, with no changes required here.
 *
 * @example
 * ```ts
 * const countryColumn: ColumnDef = {
 *   colId: 'country', field: 'country', header: 'Country', type: 'dropdown',
 *   renderer: {
 *     display: ({ value }) => `<span class="flag">${value}</span>`,
 *     option: ({ option }) => `<span class="flag">${option.label}</span>`,
 *   },
 * };
 * ```
 */
export interface ColumnRendererMap {
    display?: (params: DisplayRendererParams) => RendererOutput;
    editor?: (params: EditorRendererParams) => HTMLElement;
    option?: (params: OptionRendererParams) => RendererOutput;
    filter?: (params: FilterRendererParams) => HTMLElement;
    tooltip?: (params: TooltipRendererParams) => RendererOutput;
    group?: (params: GroupRendererParams) => RendererOutput;
    header?: (params: HeaderRendererParams) => RendererOutput;
    summary?: (params: SummaryRendererParams) => RendererOutput;
}
//# sourceMappingURL=renderer.types.d.ts.map