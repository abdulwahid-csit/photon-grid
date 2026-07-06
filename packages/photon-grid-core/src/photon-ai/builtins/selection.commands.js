/** Selects the full grid as one cell range — the shared "all cells" target for select/copy/cut. */
function selectEveryCell(api) {
    const cols = api.getVisibleColumns();
    const rows = api.getVisibleRows();
    if (cols.length === 0 || rows.length === 0)
        return false;
    api.setCellRange({ startRowIndex: 0, endRowIndex: rows.length - 1, startColIndex: 0, endColIndex: cols.length - 1 });
    return true;
}
const selectRow = {
    key: 'selectRow',
    aliases: [['select', 'row']],
    description: 'Selects a row by its (1-based) position.',
    resolveEntities: (tokens, resolver) => ({ index: resolver.resolveIndex(tokens) ?? undefined }),
    validate: (entities) => entities.index != null ? null : 'Tell me which row number to select, e.g. "select row 5".',
    buildCommand: (entities) => ({ type: 'selectRow', params: { index: entities.index } }),
    execute: (command, api) => {
        const oneBasedIndex = command.params.index;
        const row = api.getRowByIndex(oneBasedIndex - 1);
        if (!row)
            return `There's no row ${oneBasedIndex}.`;
        api.selectRow(row.nodeId);
        return `Selected row ${oneBasedIndex}.`;
    },
};
const selectColumn = {
    key: 'selectColumn',
    aliases: [['select', 'column']],
    description: 'Selects every cell in a column.',
    resolveEntities: (tokens, resolver, columns) => ({
        column: resolver.resolveColumn(tokens, columns) ?? undefined,
    }),
    validate: (entities) => entities.column ? null : "I couldn't find a column matching your request.",
    buildCommand: (entities) => ({
        type: 'selectColumn',
        params: { colId: entities.column.colId, header: entities.column.header },
    }),
    execute: (command, api) => {
        const colId = command.params.colId;
        const visibleCols = api.getVisibleColumns();
        const colIndex = visibleCols.findIndex((c) => c.colId === colId);
        const rowCount = api.getVisibleRows().length;
        if (colIndex < 0 || rowCount === 0)
            return `"${command.params.header}" isn't visible right now.`;
        api.setCellRange({ startRowIndex: 0, endRowIndex: rowCount - 1, startColIndex: colIndex, endColIndex: colIndex });
        return `Selected the "${command.params.header}" column.`;
    },
};
const clearSelection = {
    key: 'clearSelection',
    aliases: [['clear', 'selection'], ['clear', 'select'], ['deselect']],
    description: 'Clears row and cell selection.',
    resolveEntities: () => ({}),
    buildCommand: () => ({ type: 'clearSelection', params: {} }),
    execute: (_command, api) => {
        api.deselectAll();
        api.clearCellSelection();
        return 'Cleared selection.';
    },
};
const selectAllCells = {
    key: 'selectAllCells',
    aliases: [['select', 'all', 'cell'], ['select', 'every', 'cell']],
    description: 'Selects every cell in the grid.',
    resolveEntities: () => ({}),
    buildCommand: () => ({ type: 'selectAllCells', params: {} }),
    execute: (_command, api) => (selectEveryCell(api) ? 'Selected all cells.' : 'There are no cells to select.'),
};
const copyAllCells = {
    key: 'copyAllCells',
    // The 4-word variant must outrank selectAllCells's ["select","all","cell"] alias when both "select" and "copy" are
    // present together with "all"/"cell" (e.g. "select and copy all the cells") — otherwise the longer alias would win
    // and silently drop the copy action, only selecting.
    aliases: [['copy'], ['select', 'copy'], ['select', 'copy', 'all', 'cell']],
    description: 'Selects and copies every cell to the clipboard — e.g. "copy all cells", "select and copy all the cells".',
    resolveEntities: () => ({}),
    buildCommand: () => ({ type: 'copyAllCells', params: {} }),
    execute: (_command, api) => {
        if (!selectEveryCell(api))
            return 'There are no cells to copy.';
        void api.copySelectedCellsToClipboard();
        return 'Copied all cells to the clipboard.';
    },
};
const cutAllCells = {
    key: 'cutAllCells',
    aliases: [['cut'], ['select', 'cut'], ['select', 'cut', 'all', 'cell']],
    description: 'Selects every cell and copies it to the clipboard — "cut" never deletes grid data via a command, to avoid irreversible data loss from a misheard instruction.',
    resolveEntities: () => ({}),
    buildCommand: () => ({ type: 'cutAllCells', params: {} }),
    execute: (_command, api) => {
        if (!selectEveryCell(api))
            return 'There are no cells to cut.';
        void api.copySelectedCellsToClipboard();
        return "Cutting isn't supported, since it would permanently delete data — copied all cells instead.";
    },
};
/** Registers all row/cell selection Photon AI intents. */
export function registerSelectionCommands(registry) {
    registry.registerAll([selectRow, selectColumn, selectAllCells, copyAllCells, cutAllCells, clearSelection]);
}
//# sourceMappingURL=selection.commands.js.map