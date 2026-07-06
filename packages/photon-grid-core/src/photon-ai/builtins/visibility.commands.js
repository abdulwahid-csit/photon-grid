function resolveVisibilityColumn(tokens, resolver, columns) {
    return { column: resolver.resolveColumn(tokens, columns) ?? undefined };
}
function requireColumn(entities) {
    return entities.column ? null : "I couldn't find a column matching your request.";
}
const hideColumn = {
    key: 'hideColumn',
    aliases: [['hide', 'column'], ['hide']],
    description: 'Hides a column.',
    resolveEntities: resolveVisibilityColumn,
    validate: requireColumn,
    buildCommand: (entities) => ({
        type: 'hideColumn',
        params: { colId: entities.column.colId, header: entities.column.header },
    }),
    execute: (command, api) => {
        api.setColumnVisible(command.params.colId, false);
        return `Hid "${command.params.header}".`;
    },
};
const showColumn = {
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
        params: { colId: entities.column.colId, header: entities.column.header },
    }),
    execute: (command, api) => {
        api.setColumnVisible(command.params.colId, true);
        return `Showed "${command.params.header}".`;
    },
};
const hideAllColumns = {
    key: 'hideAllColumns',
    aliases: [['hide', 'all', 'column'], ['hide', 'every', 'column']],
    description: 'Hides every column in the grid (columns marked `alwaysVisible` are left alone).',
    resolveEntities: () => ({}),
    buildCommand: () => ({ type: 'hideAllColumns', params: {} }),
    execute: (_command, api) => {
        let count = 0;
        for (const col of api.getAllColumns()) {
            if (col.alwaysVisible)
                continue;
            api.setColumnVisible(col.colId, false);
            count++;
        }
        return `Hid ${count} column${count === 1 ? '' : 's'}.`;
    },
};
const showAllColumns = {
    key: 'showAllColumns',
    aliases: [['show', 'all', 'column'], ['show', 'every', 'column'], ['unhide', 'all', 'column'], ['unhide', 'every', 'column']],
    description: 'Shows every column in the grid.',
    resolveEntities: () => ({}),
    buildCommand: () => ({ type: 'showAllColumns', params: {} }),
    execute: (_command, api) => {
        const columns = api.getAllColumns();
        for (const col of columns)
            api.setColumnVisible(col.colId, true);
        return `Showed all ${columns.length} columns.`;
    },
};
/** Registers all column-visibility Photon AI intents. */
export function registerVisibilityCommands(registry) {
    registry.registerAll([hideAllColumns, showAllColumns, hideColumn, showColumn]);
}
//# sourceMappingURL=visibility.commands.js.map