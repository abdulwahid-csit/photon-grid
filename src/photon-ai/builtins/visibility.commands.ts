import type { ColumnDef } from '../../types/column.types';
import type { EntityResolver } from '../entity-resolver';
import type { IntentDefinition, ResolvedEntities } from '../photon-ai.types';
import type { PhotonAICommandRegistry } from '../photon-ai-registry';

function resolveVisibilityColumn(tokens: string[], resolver: EntityResolver, columns: ColumnDef[]): ResolvedEntities {
  return { column: resolver.resolveColumn(tokens, columns) ?? undefined };
}

function requireColumn(entities: ResolvedEntities): string | null {
  return entities.column ? null : "I couldn't find a column matching your request.";
}

const hideColumn: IntentDefinition = {
  key: 'hideColumn',
  aliases: [['hide', 'column'], ['hide']],
  description: 'Hides a column.',
  resolveEntities: resolveVisibilityColumn,
  validate: requireColumn,
  buildCommand: (entities) => ({
    type: 'hideColumn',
    params: { colId: entities.column!.colId, header: entities.column!.header },
  }),
  execute: (command, api) => {
    api.setColumnVisible(command.params.colId as string, false);
    return `Hid "${command.params.header}".`;
  },
};

const showColumn: IntentDefinition = {
  key: 'showColumn',
  aliases: [['show', 'column'], ['unhide', 'column'], ['unhide']],
  description: 'Shows a previously hidden column.',
  resolveEntities: (tokens, resolver, columns) => {
    // Match against every column, not just currently visible ones — the
    // whole point of this intent is finding a column the user hid earlier.
    return { column: resolver.resolveColumn(tokens, columns) ?? undefined };
  },
  validate: requireColumn,
  buildCommand: (entities) => ({
    type: 'showColumn',
    params: { colId: entities.column!.colId, header: entities.column!.header },
  }),
  execute: (command, api) => {
    api.setColumnVisible(command.params.colId as string, true);
    return `Showed "${command.params.header}".`;
  },
};

const hideAllColumns: IntentDefinition = {
  key: 'hideAllColumns',
  aliases: [['hide', 'all', 'column'], ['hide', 'every', 'column']],
  description: 'Hides every column in the grid (columns marked `alwaysVisible` are left alone).',
  resolveEntities: () => ({}),
  buildCommand: () => ({ type: 'hideAllColumns', params: {} }),
  execute: (_command, api) => {
    let count = 0;
    for (const col of api.getAllColumns()) {
      if (col.alwaysVisible) continue;
      api.setColumnVisible(col.colId, false);
      count++;
    }
    return `Hid ${count} column${count === 1 ? '' : 's'}.`;
  },
};

const showAllColumns: IntentDefinition = {
  key: 'showAllColumns',
  aliases: [['show', 'all', 'column'], ['show', 'every', 'column'], ['unhide', 'all', 'column'], ['unhide', 'every', 'column']],
  description: 'Shows every column in the grid.',
  resolveEntities: () => ({}),
  buildCommand: () => ({ type: 'showAllColumns', params: {} }),
  execute: (_command, api) => {
    const columns = api.getAllColumns();
    for (const col of columns) api.setColumnVisible(col.colId, true);
    return `Showed all ${columns.length} columns.`;
  },
};

/** Registers all column-visibility Photon AI intents. */
export function registerVisibilityCommands(registry: PhotonAICommandRegistry): void {
  registry.registerAll([hideAllColumns, showAllColumns, hideColumn, showColumn]);
}
