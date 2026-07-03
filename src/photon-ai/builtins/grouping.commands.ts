import type { IntentDefinition, ResolvedEntities } from '../photon-ai.types';
import type { PhotonAICommandRegistry } from '../photon-ai-registry';

const groupBy: IntentDefinition = {
  key: 'groupBy',
  aliases: [['group', 'by'], ['group']],
  description: 'Groups rows by one or more columns — e.g. "group by department and status".',
  resolveEntities: (tokens, resolver, columns) => ({
    columns: resolver.resolveColumns(tokens, columns),
  }),
  validate: (entities: ResolvedEntities) => {
    if (!entities.columns?.length) return "I couldn't find a column matching your request.";
    const groupable = entities.columns.filter((c) => c.groupable !== false);
    if (groupable.length === 0) {
      return `"${entities.columns.map((c) => c.header).join('", "')}" can't be grouped.`;
    }
    return null;
  },
  buildCommand: (entities) => {
    const requested = entities.columns!;
    const groupable = requested.filter((c) => c.groupable !== false);
    const skipped = requested.filter((c) => c.groupable === false);
    return {
      type: 'groupBy',
      params: {
        colIds: groupable.map((c) => c.colId),
        header: groupable.map((c) => c.header).join('", "'),
        skippedHeader: skipped.length ? skipped.map((c) => c.header).join('", "') : undefined,
      },
    };
  },
  execute: (command, api) => {
    for (const colId of command.params.colIds as string[]) api.groupByColumn(colId);
    const skippedHeader = command.params.skippedHeader as string | undefined;
    const base = `Grouped by "${command.params.header}".`;
    return skippedHeader ? `${base} ("${skippedHeader}" isn't groupable, so it was skipped.)` : base;
  },
};

const ungroup: IntentDefinition = {
  key: 'ungroup',
  aliases: [['ungroup'], ['clear', 'group'], ['remove', 'group']],
  description: 'Clears all row grouping.',
  resolveEntities: () => ({}),
  buildCommand: () => ({ type: 'ungroup', params: {} }),
  execute: (_command, api) => {
    api.clearGrouping();
    return 'Cleared grouping.';
  },
};

const expandAllGroups: IntentDefinition = {
  key: 'expandAllGroups',
  aliases: [['expand', 'all', 'row'], ['expand', 'all', 'group'], ['expand', 'all'], ['expand', 'group'], ['open', 'all', 'group']],
  description: 'Expands every group row (and level qualifiers like "to level one" are treated the same as expanding everything).',
  resolveEntities: () => ({}),
  buildCommand: () => ({ type: 'expandAllGroups', params: {} }),
  execute: (_command, api) => {
    api.expandAllGroups();
    return 'Expanded all groups.';
  },
};

const collapseAllGroups: IntentDefinition = {
  key: 'collapseAllGroups',
  aliases: [['collapse', 'all', 'row'], ['collapse', 'all', 'group'], ['collapse', 'all'], ['collapse', 'group'], ['close', 'all', 'group']],
  description: 'Collapses every group row.',
  resolveEntities: () => ({}),
  buildCommand: () => ({ type: 'collapseAllGroups', params: {} }),
  execute: (_command, api) => {
    api.collapseAllGroups();
    return 'Collapsed all groups.';
  },
};

const expandRow: IntentDefinition = {
  key: 'expandRow',
  aliases: [['expand', 'row'], ['open', 'row']],
  description: 'Expands a specific row by its (1-based) position — its group children if it\'s a group row, or its detail row in a master/detail grid.',
  resolveEntities: (tokens, resolver) => ({ index: resolver.resolveIndex(tokens) ?? undefined }),
  validate: (entities) => (entities.index != null ? null : 'Tell me which row number to expand, e.g. "expand row 2".'),
  buildCommand: (entities) => ({ type: 'expandRow', params: { index: entities.index } }),
  execute: (command, api) => {
    const oneBasedIndex = command.params.index as number;
    const row = api.getRowByIndex(oneBasedIndex - 1);
    if (!row) return `There's no row ${oneBasedIndex}.`;
    if (row.type === 'group' && row.groupKey) {
      api.expandGroup(row.groupKey);
      return `Expanded row ${oneBasedIndex}.`;
    }
    api.expandDetail(row.nodeId);
    return `Expanded row ${oneBasedIndex}.`;
  },
};

const collapseRow: IntentDefinition = {
  key: 'collapseRow',
  aliases: [['collapse', 'row'], ['close', 'row']],
  description: 'Collapses a specific row by its (1-based) position.',
  resolveEntities: (tokens, resolver) => ({ index: resolver.resolveIndex(tokens) ?? undefined }),
  validate: (entities) => (entities.index != null ? null : 'Tell me which row number to collapse, e.g. "collapse row 2".'),
  buildCommand: (entities) => ({ type: 'collapseRow', params: { index: entities.index } }),
  execute: (command, api) => {
    const oneBasedIndex = command.params.index as number;
    const row = api.getRowByIndex(oneBasedIndex - 1);
    if (!row) return `There's no row ${oneBasedIndex}.`;
    if (row.type === 'group' && row.groupKey) {
      api.collapseGroup(row.groupKey);
      return `Collapsed row ${oneBasedIndex}.`;
    }
    api.collapseDetail(row.nodeId);
    return `Collapsed row ${oneBasedIndex}.`;
  },
};

/** Registers all row-grouping Photon AI intents. */
export function registerGroupingCommands(registry: PhotonAICommandRegistry): void {
  registry.registerAll([groupBy, ungroup, expandAllGroups, collapseAllGroups, expandRow, collapseRow]);
}
