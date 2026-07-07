import type { ColumnDef } from '../../types/column.types';
import type { GridApi } from '../../core/grid-api';
import type { EntityResolver } from '../entity-resolver';
import type { IntentDefinition, ResolvedEntities } from '../photon-ai.types';
import type { PhotonAICommandRegistry } from '../photon-ai-registry';

function resolveMoveColumn(tokens: string[], resolver: EntityResolver, columns: ColumnDef[]): ResolvedEntities {
  return { column: resolver.resolveColumn(tokens, columns) ?? undefined };
}

function requireColumn(entities: ResolvedEntities): string | null {
  return entities.column ? null : "I couldn't find a column matching your request.";
}

function currentVisibleIndex(api: GridApi, colId: string): number {
  return api.getVisibleColumns().findIndex((c) => c.colId === colId);
}

const moveColumnToStart: IntentDefinition = {
  key: 'moveColumnToStart',
  aliases: [['move', 'start'], ['move', 'left'], ['move', 'beginning'], ['move', 'front'], ['move', 'first']],
  description: 'Moves a column to the leftmost position — e.g. "move country column to the start".',
  resolveEntities: resolveMoveColumn,
  validate: requireColumn,
  buildCommand: (entities) => ({
    type: 'moveColumnToStart',
    params: { colId: entities.column!.colId, header: entities.column!.header },
  }),
  execute: (command, api) => {
    const colId = command.params.colId as string;
    const idx = currentVisibleIndex(api, colId);
    if (idx <= 0) return `"${command.params.header}" is already at the start.`;
    api.moveColumn(idx, 0);
    return `Moved "${command.params.header}" to the start.`;
  },
};

const moveColumnToEnd: IntentDefinition = {
  key: 'moveColumnToEnd',
  aliases: [['move', 'end'], ['move', 'right'], ['move', 'last']],
  description: 'Moves a column to the rightmost position — e.g. "move country column to the end".',
  resolveEntities: resolveMoveColumn,
  validate: requireColumn,
  buildCommand: (entities) => ({
    type: 'moveColumnToEnd',
    params: { colId: entities.column!.colId, header: entities.column!.header },
  }),
  execute: (command, api) => {
    const colId = command.params.colId as string;
    const idx = currentVisibleIndex(api, colId);
    const lastIndex = api.getVisibleColumns().length - 1;
    if (idx < 0 || idx === lastIndex) return `"${command.params.header}" is already at the end.`;
    api.moveColumn(idx, lastIndex);
    return `Moved "${command.params.header}" to the end.`;
  },
};

/** Registers all column-reordering Photon AI intents. */
export function registerMoveCommands(registry: PhotonAICommandRegistry): void {
  registry.registerAll([moveColumnToStart, moveColumnToEnd]);
}
