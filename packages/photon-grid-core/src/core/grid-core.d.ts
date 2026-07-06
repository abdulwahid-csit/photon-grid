import type { GridOptions } from '../types/grid.types';
import { GridApi } from './grid-api';
export declare class GridCore {
    readonly api: GridApi;
    private ctx;
    /** Set during `buildContext` when any top-level `ColumnDef` has `children`. */
    private columnGroupModel;
    private groupHeaderBuilder;
    /** New Display Group Engine — replaces `columnGroupModel` for group rendering. */
    private displayGroupEngine;
    /** Set in `initialize` when `photonAI.enabled` — needs the live `GridApi`, so it cannot be built in `buildContext`. */
    private photonAIService;
    constructor(containerEl: HTMLElement, options: GridOptions);
    private buildContext;
    private initialize;
    private wireEventHandlers;
    /**
     * Backs `CellSelectionEngine.setTreeToggleHandler` — ArrowLeft collapses a
     * node (or jumps focus to its parent if already collapsed/leaf), ArrowRight
     * expands a node (or jumps focus to its first child if already expanded).
     * Returns `false` when Tree Data isn't enabled or the row has no children,
     * letting normal column navigation take over.
     */
    private handleTreeToggleKey;
    /**
     * Wires cell-editing activation and teardown based on the configured
     * `editing.singleClickEdit` flag.
     *
     * - `singleClickEdit: true`  → edit starts on the first click (CELL_CLICKED)
     * - `singleClickEdit: false` → edit starts on double-click (CELL_DOUBLE_CLICKED, default)
     *
     * On `CELL_EDIT_STOP` the cell's inner DOM is immediately restored with the
     * committed (or cancelled) value — no full grid refresh required.
     */
    private wireEditing;
    /**
     * Re-renders the display content of a cell's inner element after an edit
     * session ends, using the current value from `row.data`.
     *
     * Rendering priority:
     * 1. `colDef.renderer.display` — custom renderer function (e.g. flag icons)
     * 2. `colDef.renderHtml`       — raw HTML string
     * 3. Built-in type rendering   — boolean, dropdown, array, formatted text
     */
    private renderCellValue;
    private loadState;
    destroy(): void;
}
//# sourceMappingURL=grid-core.d.ts.map