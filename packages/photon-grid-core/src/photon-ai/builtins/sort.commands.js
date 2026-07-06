function resolveSortColumn(tokens, resolver, columns) {
    return { column: resolver.resolveColumn(tokens, columns) ?? undefined };
}
function requireColumn(entities) {
    if (!entities.column)
        return "I couldn't find a column matching your request.";
    if (entities.column.sortable === false)
        return `"${entities.column.header}" isn't sortable.`;
    return null;
}
const sortAscending = {
    key: 'sortAscending',
    aliases: [
        ['sort', 'ascending'], ['sort', 'asc'],
        ['ascending'], ['asc'],
        ['low', 'high'], ['smallest', 'largest'],
        ['sort'], // fallback: plain "sort <column>" defaults to ascending
    ],
    description: 'Sorts a column in ascending order.',
    resolveEntities: resolveSortColumn,
    validate: requireColumn,
    buildCommand: (entities) => ({
        type: 'sortAscending',
        params: { colId: entities.column.colId, header: entities.column.header },
    }),
    execute: (command, api) => {
        const colId = command.params.colId;
        api.sortColumn(colId, 'asc');
        return `Sorted "${command.params.header}" ascending.`;
    },
};
const sortDescending = {
    key: 'sortDescending',
    aliases: [
        ['sort', 'descending'], ['sort', 'desc'],
        ['descending'], ['desc'],
        ['high', 'low'], ['largest', 'smallest'],
    ],
    description: 'Sorts a column in descending order.',
    resolveEntities: resolveSortColumn,
    validate: requireColumn,
    buildCommand: (entities) => ({
        type: 'sortDescending',
        params: { colId: entities.column.colId, header: entities.column.header },
    }),
    execute: (command, api) => {
        const colId = command.params.colId;
        api.sortColumn(colId, 'desc');
        return `Sorted "${command.params.header}" descending.`;
    },
};
const clearSort = {
    key: 'clearSort',
    aliases: [['clear', 'sort'], ['remove', 'sort'], ['unsort']],
    description: 'Clears all sorting.',
    resolveEntities: () => ({}),
    buildCommand: () => ({ type: 'clearSort', params: {} }),
    execute: (_command, api) => {
        api.clearSort();
        return 'Cleared sorting.';
    },
};
/** Registers all sorting-related Photon AI intents. */
export function registerSortCommands(registry) {
    registry.registerAll([sortAscending, sortDescending, clearSort]);
}
//# sourceMappingURL=sort.commands.js.map