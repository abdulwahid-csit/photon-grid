import type { GridApi } from '../../core/grid-api';
import type { FilterOperator } from '../../types/filter.types';
import type { IntentDefinition, ResolvedEntities } from '../photon-ai.types';
import type { PhotonAICommandRegistry } from '../photon-ai-registry';
import {
  buildConditionForColumn,
  buildConditionForGuessedValue,
  toColumnFilter,
  describeValue,
  type BuiltCondition,
} from './filter.commands';

/** Selects the full grid as one cell range — the shared "all cells" target for select/copy/cut. */
function selectEveryCell(api: GridApi): boolean {
  const cols = api.getVisibleColumns();
  const rows = api.getVisibleRows();
  if (cols.length === 0 || rows.length === 0) return false;
  api.setCellRange({ startRowIndex: 0, endRowIndex: rows.length - 1, startColIndex: 0, endColIndex: cols.length - 1 });
  return true;
}

/** Position words that anchor a range at the top (first N) or bottom (last N) of the grid. */
const RANGE_FIRST: ReadonlySet<string> = new Set(['first', 'top', 'earliest']);
const RANGE_LAST: ReadonlySet<string> = new Set(['last', 'bottom', 'latest']);

const selectRow: IntentDefinition = {
  key: 'selectRow',
  aliases: [['select', 'row']],
  description: 'Selects a single row by its (1-based) position — e.g. "select row 5".',
  resolveEntities: (tokens, resolver) => ({ index: resolver.resolveIndex(tokens) ?? undefined }),
  validate: (entities: ResolvedEntities) =>
    entities.index != null ? null : 'Tell me which row number to select, e.g. "select row 5".',
  buildCommand: (entities) => ({ type: 'selectRow', params: { index: entities.index } }),
  execute: (command, api) => {
    const oneBasedIndex = command.params.index as number;
    const row = api.getRowByIndex(oneBasedIndex - 1);
    if (!row) return `There's no row ${oneBasedIndex}.`;
    api.selectRow(row.nodeId);
    api.scrollToRow(oneBasedIndex - 1);
    return `Selected row ${oneBasedIndex}.`;
  },
};

const selectAllRows: IntentDefinition = {
  key: 'selectAllRows',
  aliases: [['select', 'all', 'row'], ['highlight', 'all', 'row'], ['select', 'all', 'record']],
  description: 'Selects every row in the grid — e.g. "select all rows".',
  resolveEntities: () => ({}),
  buildCommand: () => ({ type: 'selectAllRows', params: {} }),
  execute: (_command, api) => {
    api.selectAll();
    const count = api.getSelectedCount();
    return count > 0 ? `Selected all ${count} rows.` : 'There are no rows to select.';
  },
};

const selectRowRange: IntentDefinition = {
  key: 'selectRowRange',
  aliases: [
    ['select', 'first', 'row'], ['select', 'top', 'row'],
    ['select', 'last', 'row'], ['select', 'bottom', 'row'],
    ['select', 'row', 'between'], ['select', 'row', 'through'],
    ['highlight', 'first', 'row'], ['highlight', 'last', 'row'],
  ],
  description:
    'Selects a block of rows by position — e.g. "select the first 10 rows", "select last 5 rows", "select rows between 3 and 7".',
  resolveEntities: (tokens) => {
    const words = tokens.map((t) => t.toLowerCase());
    const numbers = tokens.filter((t) => /^\d+$/.test(t)).map((t) => parseInt(t, 10));
    if (words.some((w) => RANGE_FIRST.has(w))) return { value: 'first', index: numbers[0] };
    if (words.some((w) => RANGE_LAST.has(w))) return { value: 'last', index: numbers[0] };
    if (numbers.length >= 2) return { value: 'range', index: numbers[0], coercedValue: numbers[1] };
    return {};
  },
  validate: (entities: ResolvedEntities) => {
    if (!entities.value) return 'Tell me a row range, e.g. "select rows between 3 and 7" or "select the first 10 rows".';
    if (entities.index == null) return 'How many rows? e.g. "select the first 10 rows".';
    return null;
  },
  buildCommand: (entities) => ({
    type: 'selectRowRange',
    params: { mode: entities.value, from: entities.index, to: entities.coercedValue ?? null },
  }),
  execute: (command, api) => {
    const total = api.getDisplayedRowCount();
    if (total === 0) return 'There are no rows to select.';

    const mode = command.params.mode as 'first' | 'last' | 'range';
    let start = 0;
    let end = 0;
    if (mode === 'first') {
      start = 0;
      end = Math.min(command.params.from as number, total) - 1;
    } else if (mode === 'last') {
      start = Math.max(0, total - (command.params.from as number));
      end = total - 1;
    } else {
      // Explicit range — user values are 1-based, inclusive.
      const a = command.params.from as number;
      const b = command.params.to as number;
      start = Math.min(a, b) - 1;
      end = Math.max(a, b) - 1;
    }
    start = Math.max(0, start);
    end = Math.min(total - 1, end);
    if (end < start) return 'That row range is empty.';

    api.selectRowRange(start, end);
    api.scrollToRow(start);
    return `Selected ${end - start + 1} rows.`;
  },
};

const selectRowsWhere: IntentDefinition = {
  key: 'selectRowsWhere',
  aliases: [
    ['select', 'row', 'where'], ['select', 'row', 'match'], ['select', 'row', 'matching'],
    ['select', 'matching', 'row'], ['highlight', 'row', 'where'],
    ['select', 'row', 'over'], ['select', 'row', 'above'], ['select', 'row', 'under'], ['select', 'row', 'below'],
    ['select', 'row', 'than'], ['select', 'row', 'contain'], ['select', 'row', 'equal'],
  ],
  description:
    'Selects (highlights) every row matching a column condition, without hiding the rest — e.g. "select all rows where status is active", "highlight rows where salary is over 50000".',
  resolveEntities: (tokens, resolver, columns, api): ResolvedEntities => {
    const column = resolver.resolveColumn(tokens, columns) ?? undefined;
    if (column) {
      const valueTokens = resolver.stripColumnTokens(tokens, column);
      const built = buildConditionForColumn(column, valueTokens, resolver);
      return built
        ? { column, operator: built.operator, coercedValue: built.value, coercedValueTo: built.valueTo }
        : { column };
    }

    const { negated, remaining } = resolver.resolveNegation(tokens);
    const guess = resolver.resolveColumnByValue(remaining, columns, api);
    if (!guess) return {};
    const built = buildConditionForGuessedValue(guess.column, guess.rawValue, negated);
    return { column: guess.column, operator: built.operator, coercedValue: built.value, coercedValueTo: built.valueTo };
  },
  validate: (entities) => {
    if (!entities.column) return "I couldn't find a column or a matching value for that in the grid.";
    const noValueNeeded = entities.operator === 'blank' || entities.operator === 'notBlank';
    if (entities.coercedValue === undefined && !noValueNeeded) {
      return `What value should I match "${entities.column.header}" by?`;
    }
    return null;
  },
  buildCommand: (entities) => ({
    type: 'selectRowsWhere',
    params: {
      colId: entities.column!.colId,
      header: entities.column!.header,
      operator: entities.operator,
      value: entities.coercedValue,
      valueTo: entities.coercedValueTo,
    },
  }),
  execute: (command, api) => {
    const colId = command.params.colId as string;
    const column = api.getColumn(colId);
    if (!column) return `"${command.params.header}" is no longer a valid column.`;

    const condition: BuiltCondition = {
      operator: command.params.operator as FilterOperator,
      value: command.params.value,
      valueTo: command.params.valueTo,
    };
    const count = api.selectRowsMatchingFilter(colId, toColumnFilter(column, condition));
    if (count === 0) return `No rows match that — nothing selected.`;

    // Reveal the first match so the selection is visible.
    const firstId = api.getSelectedRowIds()[0];
    if (firstId) api.ensureNodeVisible(firstId);

    const noValueNeeded = condition.operator === 'blank' || condition.operator === 'notBlank';
    const valueLabel = noValueNeeded
      ? ''
      : condition.valueTo !== undefined
        ? ` between "${describeValue(condition.value)}" and "${describeValue(condition.valueTo)}"`
        : ` = "${describeValue(condition.value)}"`;
    return `Selected ${count} row${count === 1 ? '' : 's'} where "${command.params.header}"${valueLabel}.`;
  },
};

const selectColumn: IntentDefinition = {
  key: 'selectColumn',
  aliases: [['select', 'column']],
  description: 'Selects every cell in a column.',
  resolveEntities: (tokens, resolver, columns) => ({
    column: resolver.resolveColumn(tokens, columns) ?? undefined,
  }),
  validate: (entities: ResolvedEntities) =>
    entities.column ? null : "I couldn't find a column matching your request.",
  buildCommand: (entities) => ({
    type: 'selectColumn',
    params: { colId: entities.column!.colId, header: entities.column!.header },
  }),
  execute: (command, api) => {
    const colId = command.params.colId as string;
    const visibleCols = api.getVisibleColumns();
    const colIndex = visibleCols.findIndex((c) => c.colId === colId);
    const rowCount = api.getVisibleRows().length;
    if (colIndex < 0 || rowCount === 0) return `"${command.params.header}" isn't visible right now.`;
    api.setCellRange({ startRowIndex: 0, endRowIndex: rowCount - 1, startColIndex: colIndex, endColIndex: colIndex });
    return `Selected the "${command.params.header}" column.`;
  },
};

const clearSelection: IntentDefinition = {
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

const selectAllCells: IntentDefinition = {
  key: 'selectAllCells',
  aliases: [['select', 'all', 'cell'], ['select', 'every', 'cell']],
  description: 'Selects every cell in the grid.',
  resolveEntities: () => ({}),
  buildCommand: () => ({ type: 'selectAllCells', params: {} }),
  execute: (_command, api) => (selectEveryCell(api) ? 'Selected all cells.' : 'There are no cells to select.'),
};

const copyAllCells: IntentDefinition = {
  key: 'copyAllCells',
  // The 4-word variant must outrank selectAllCells's ["select","all","cell"] alias when both "select" and "copy" are
  // present together with "all"/"cell" (e.g. "select and copy all the cells") — otherwise the longer alias would win
  // and silently drop the copy action, only selecting.
  aliases: [['copy'], ['select', 'copy'], ['select', 'copy', 'all', 'cell']],
  description: 'Selects and copies every cell to the clipboard — e.g. "copy all cells", "select and copy all the cells".',
  resolveEntities: () => ({}),
  buildCommand: () => ({ type: 'copyAllCells', params: {} }),
  execute: (_command, api) => {
    if (!selectEveryCell(api)) return 'There are no cells to copy.';
    void api.copySelectedCellsToClipboard();
    return 'Copied all cells to the clipboard.';
  },
};

const cutAllCells: IntentDefinition = {
  key: 'cutAllCells',
  aliases: [['cut'], ['select', 'cut'], ['select', 'cut', 'all', 'cell']],
  description:
    'Selects every cell and copies it to the clipboard — "cut" never deletes grid data via a command, to avoid irreversible data loss from a misheard instruction.',
  resolveEntities: () => ({}),
  buildCommand: () => ({ type: 'cutAllCells', params: {} }),
  execute: (_command, api) => {
    if (!selectEveryCell(api)) return 'There are no cells to cut.';
    void api.copySelectedCellsToClipboard();
    return "Cutting isn't supported, since it would permanently delete data — copied all cells instead.";
  },
};

/** Registers all row/cell selection Photon AI intents. */
export function registerSelectionCommands(registry: PhotonAICommandRegistry): void {
  registry.registerAll([
    selectRow,
    selectAllRows,
    selectRowRange,
    selectRowsWhere,
    selectColumn,
    selectAllCells,
    copyAllCells,
    cutAllCells,
    clearSelection,
  ]);
}
