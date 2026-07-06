import type { RowNode } from '../../types/row.types';
import type { ColumnDef } from '../../types/column.types';
import type { EditingConfig } from '../../types/grid.types';
import type { GridStore } from '../../core/grid-store';
import type { EventBus } from '../../event-bus/event-bus';
export interface EditSession {
    rowNode: RowNode;
    colDef: ColumnDef;
    originalValue: unknown;
    currentValue: unknown;
    editorEl: HTMLElement | null;
    cellEl: HTMLElement | null;
}
export declare class CellEditorEngine {
    private store;
    private eventBus;
    private activeSession;
    private config;
    /**
     * Optional callback invoked when Tab is pressed while a native editor is
     * active.  Receives `shiftKey` so the caller can navigate forwards or
     * backwards.  Registered by `wireEditing` in `GridCore`.
     */
    private tabHandler;
    /** Register a callback to be called when Tab is pressed inside a native editor. */
    setTabHandler(fn: (shiftKey: boolean) => void): void;
    constructor(store: GridStore, eventBus: EventBus);
    configure(config: Partial<EditingConfig>): void;
    startEditing(rowNode: RowNode, colDef: ColumnDef, cellEl: HTMLElement): boolean;
    updateValue(value: unknown): void;
    stopEditing(cancel?: boolean): void;
    isEditing(): boolean;
    getActiveSession(): EditSession | null;
    isCellEditing(rowNodeId: string, colId: string): boolean;
    /**
     * Builds and mounts the appropriate native editor widget into `container` based
     * on `colDef.type`.  Returns the root editor element.
     *
     * Editor types:
     * - `boolean`            → styled checkbox
     * - `dropdown` / `object`→ single-select `<select>` from `dropdownOptions`
     * - `array`              → custom multi-select panel with checkboxes
     * - `number` / `currency`/ `percentage` → number `<input>`
     * - `date`               → date `<input>`
     * - `time`               → time `<input>`
     * - default              → text `<input>`
     */
    buildNativeEditor(colDef: ColumnDef, value: unknown, container: HTMLElement): HTMLElement;
    /**
     * Builds a custom multi-select dropdown panel for `array` column type.
     * The stored value is always `string[]` of selected option values.
     */
    private buildMultiSelectEditor;
    /**
     * Resolves the key used to match a cell value against `dropdownOptions`
     * for `object` type columns.  Supports primitive values and plain objects.
     */
    private resolveObjectKey;
    /** Returns the active `EditingConfig` (read-only). */
    getConfig(): Readonly<EditingConfig>;
}
//# sourceMappingURL=cell-editor-engine.d.ts.map