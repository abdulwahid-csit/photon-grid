import type { GridApi } from '../../core/grid-api';
import type { IntentDefinition } from '../photon-ai.types';
import type { PhotonAICommandRegistry } from '../photon-ai-registry';

/**
 * Read-only "question answering" intents — they report the grid's live
 * state (row/column counts, active filters, sort, pinning, grouping,
 * selection) and never call a mutating `GridApi` method. Registered exactly
 * like every other intent, so they benefit from the same fuzzy/typo-
 * tolerant matching, and a custom feature's own `registerAI()` can add more
 * questions the same way.
 */

function columnLabel(api: GridApi, colId: string): string {
  return api.getColumn(colId)?.header ?? colId;
}

const rowCount: IntentDefinition = {
  key: 'rowCount',
  // Bare ["how", "many"] is the generic fallback for "how many are there?"
  // with no domain word — safe because it only wins when nothing longer
  // matches anywhere (every other intent below out-scores it once a real
  // domain word like "column"/"select" is present).
  aliases: [['row', 'count'], ['count', 'row'], ['total', 'row'], ['how', 'many', 'row'], ['how', 'many'], ['count']],
  description: 'Reports how many rows the grid has, and how many are visible after filtering/grouping.',
  resolveEntities: () => ({}),
  buildCommand: () => ({ type: 'rowCount', params: {} }),
  execute: (_command, api) => {
    const total = api.getAllRows().filter((r) => r.type === 'data').length;
    const visible = api.getVisibleRows().filter((r) => r.type === 'data').length;
    return total === visible
      ? `There are ${total} row${total === 1 ? '' : 's'}.`
      : `There are ${total} rows total, ${visible} visible after filtering/grouping.`;
  },
};

const columnCount: IntentDefinition = {
  key: 'columnCount',
  // The 3-word ["how","many","column"] variant is required (not just
  // ["how","many"]) so it outranks `hideColumn`'s ["hide","column"] alias
  // when both "column" and "hide" appear together, e.g. "how many columns
  // are hidden" — the hidden count is already part of this intent's own
  // summary, so no separate intent is needed for that phrasing.
  aliases: [['column', 'count'], ['count', 'column'], ['total', 'column'], ['how', 'many', 'column']],
  description: 'Reports how many columns the grid has, and how many are visible vs. hidden.',
  resolveEntities: () => ({}),
  buildCommand: () => ({ type: 'columnCount', params: {} }),
  execute: (_command, api) => {
    const all = api.getAllColumns();
    const hidden = all.filter((c) => c.visible === false).length;
    return hidden === 0
      ? `There are ${all.length} columns, all visible.`
      : `There are ${all.length} columns total — ${all.length - hidden} visible, ${hidden} hidden.`;
  },
};

const selectionInfo: IntentDefinition = {
  key: 'selectionInfo',
  // ["how","many","row","select"] (4 words) is required to outrank
  // `rowCount`'s ["how","many","row"] (3 words) for "how many rows are
  // selected" — both "row" and "select" are present, so without this the
  // shorter/first-registered `rowCount` alias would win the length tie and
  // report the total row count instead of the selection.
  aliases: [
    ['select', 'count'], ['which', 'row', 'select'], ['what', 'select'],
    ['how', 'many', 'select'], ['how', 'many', 'row', 'select'],
  ],
  description: 'Reports how many rows/cells are currently selected.',
  resolveEntities: () => ({}),
  buildCommand: () => ({ type: 'selectionInfo', params: {} }),
  execute: (_command, api) => {
    const rowCount = api.getSelectedCount();
    const cellRanges = api.getCellRanges().length;
    if (rowCount === 0 && cellRanges === 0) return 'Nothing is selected.';
    const parts: string[] = [];
    if (rowCount > 0) parts.push(`${rowCount} row${rowCount === 1 ? '' : 's'}`);
    if (cellRanges > 0) parts.push(`${cellRanges} cell range${cellRanges === 1 ? '' : 's'}`);
    return `Selected: ${parts.join(', ')}.`;
  },
};

const filterInfo: IntentDefinition = {
  key: 'filterInfo',
  aliases: [['what', 'filter'], ['which', 'filter'], ['filter', 'state'], ['active', 'filter'], ['list', 'filter']],
  description: 'Lists every column that currently has an active filter, and what it\'s filtering for.',
  resolveEntities: () => ({}),
  buildCommand: () => ({ type: 'filterInfo', params: {} }),
  execute: (_command, api) => {
    const model = api.getFilterModel();
    const entries = Object.values(model);
    if (entries.length === 0) return 'No filters are active.';
    const summary = entries
      .map((f) => {
        const header = columnLabel(api, f.colId);
        if (f.selectedIds?.length) return `${header} (${f.selectedIds.join(', ')})`;
        const [condition] = f.conditions;
        return `${header} ${condition.operator} ${String(condition.value)}`;
      })
      .join('; ');
    return `Active filters: ${summary}.`;
  },
};

const sortInfo: IntentDefinition = {
  key: 'sortInfo',
  aliases: [['what', 'sort'], ['which', 'sort'], ['sort', 'state'], ['current', 'sort']],
  description: 'Reports which column(s) the grid is currently sorted by.',
  resolveEntities: () => ({}),
  buildCommand: () => ({ type: 'sortInfo', params: {} }),
  execute: (_command, api) => {
    const config = api.getSortConfig();
    if (config.length === 0) return 'No column is sorted.';
    return `Sorted by: ${config.map((s) => `${columnLabel(api, s.colId)} (${s.order})`).join(', ')}.`;
  },
};

const pinInfo: IntentDefinition = {
  key: 'pinInfo',
  aliases: [['which', 'pin'], ['what', 'pin'], ['pin', 'state'], ['list', 'pin']],
  description: 'Lists which columns are pinned left/right.',
  resolveEntities: () => ({}),
  buildCommand: () => ({ type: 'pinInfo', params: {} }),
  execute: (_command, api) => {
    const columns = api.getAllColumns();
    const left = columns.filter((c) => c.pinned === 'left').map((c) => c.header);
    const right = columns.filter((c) => c.pinned === 'right').map((c) => c.header);
    if (left.length === 0 && right.length === 0) return 'No columns are pinned.';
    const parts: string[] = [];
    if (left.length) parts.push(`left: ${left.join(', ')}`);
    if (right.length) parts.push(`right: ${right.join(', ')}`);
    return `Pinned — ${parts.join(' | ')}.`;
  },
};

const hiddenColumnsInfo: IntentDefinition = {
  key: 'hiddenColumnsInfo',
  // The 3-word variants exist because "which columns are hidden" ties in
  // alias length with `hideColumn`'s ["hide", "column"] otherwise — without
  // them, that 2-word alias (registered first) would win the tie and try to
  // hide a column named "which"/"what" instead of answering the question.
  aliases: [
    ['which', 'hide'], ['what', 'hide'], ['hide', 'state'], ['list', 'hide'],
    ['which', 'column', 'hide'], ['what', 'column', 'hide'], ['list', 'hide', 'column'],
  ],
  description: 'Lists which columns are currently hidden.',
  resolveEntities: () => ({}),
  buildCommand: () => ({ type: 'hiddenColumnsInfo', params: {} }),
  execute: (_command, api) => {
    const hidden = api.getAllColumns().filter((c) => c.visible === false).map((c) => c.header);
    return hidden.length === 0 ? 'No columns are hidden.' : `Hidden columns: ${hidden.join(', ')}.`;
  },
};

const groupInfo: IntentDefinition = {
  key: 'groupInfo',
  // The 3-word variants exist because "what is it grouped by" ties in alias
  // length with `groupBy`'s ["group", "by"] otherwise — see the comment on
  // `hiddenColumnsInfo` above for why the tie must resolve to the question.
  aliases: [
    ['what', 'group'], ['which', 'group'], ['group', 'state'], ['how', 'group'],
    ['what', 'group', 'by'], ['which', 'group', 'by'],
  ],
  description: 'Reports which column(s) rows are currently grouped by.',
  resolveEntities: () => ({}),
  buildCommand: () => ({ type: 'groupInfo', params: {} }),
  execute: (_command, api) => {
    const groupedColumns = api.getGridState().groupedColumns ?? [];
    return groupedColumns.length === 0
      ? "Rows aren't grouped by anything."
      : `Grouped by: ${groupedColumns.map((colId) => columnLabel(api, colId)).join(' > ')}.`;
  },
};

/** Registers a "help" intent that lists every command Photon AI currently understands — including custom intents a host app registered at runtime, since it reads the registry lazily at execute time. */
function registerHelp(registry: PhotonAICommandRegistry): void {
  const help: IntentDefinition = {
    key: 'help',
    aliases: [['help'], ['what', 'do'], ['list', 'command'], ['what', 'command']],
    description: 'Lists every command Photon AI understands.',
    resolveEntities: () => ({}),
    buildCommand: () => ({ type: 'help', params: {} }),
    execute: () => {
      const descriptions = registry
        .getAll()
        .map((intent) => intent.description)
        .filter((d): d is string => !!d);
      return `Here's what I can do:\n${descriptions.map((d) => `• ${d}`).join('\n')}`;
    },
  };
  registry.register(help);
}

/** Registers every read-only "question answering" Photon AI intent. */
export function registerInfoCommands(registry: PhotonAICommandRegistry): void {
  registry.registerAll([
    rowCount,
    columnCount,
    selectionInfo,
    filterInfo,
    sortInfo,
    pinInfo,
    hiddenColumnsInfo,
    groupInfo,
  ]);
  registerHelp(registry);
}
