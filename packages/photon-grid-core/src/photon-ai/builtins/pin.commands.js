function resolvePinColumns(tokens, resolver, columns) {
    return { columns: resolver.resolveColumns(tokens, columns) };
}
function requireColumns(entities) {
    return entities.columns?.length ? null : "I couldn't find a column matching your request.";
}
function pinAll(colIds, header, api, side) {
    for (const colId of colIds)
        api.setColumnPin(colId, side);
    const sideLabel = side ? ` to the ${side}` : '';
    return `${side ? 'Pinned' : 'Unpinned'} ${header}${sideLabel}.`;
}
const pinLeft = {
    key: 'pinLeft',
    aliases: [['pin', 'left'], ['freeze', 'left']],
    description: 'Pins one or more columns to the left side of the grid — e.g. "pin price and income to the left".',
    resolveEntities: resolvePinColumns,
    validate: requireColumns,
    buildCommand: (entities) => ({
        type: 'pinLeft',
        params: { colIds: entities.columns.map((c) => c.colId), header: entities.columns.map((c) => c.header).join('", "') },
    }),
    execute: (command, api) => pinAll(command.params.colIds, `"${command.params.header}"`, api, 'left'),
};
const pinRight = {
    key: 'pinRight',
    aliases: [['pin', 'right'], ['freeze', 'right']],
    description: 'Pins one or more columns to the right side of the grid — e.g. "pin price and income to the right".',
    resolveEntities: resolvePinColumns,
    validate: requireColumns,
    buildCommand: (entities) => ({
        type: 'pinRight',
        params: { colIds: entities.columns.map((c) => c.colId), header: entities.columns.map((c) => c.header).join('", "') },
    }),
    execute: (command, api) => pinAll(command.params.colIds, `"${command.params.header}"`, api, 'right'),
};
const unpin = {
    key: 'unpin',
    aliases: [['unpin'], ['remove', 'pin'], ['un', 'pin']],
    description: 'Unpins one or more columns — e.g. "unpin status, income and year".',
    resolveEntities: resolvePinColumns,
    validate: requireColumns,
    buildCommand: (entities) => ({
        type: 'unpin',
        params: { colIds: entities.columns.map((c) => c.colId), header: entities.columns.map((c) => c.header).join('", "') },
    }),
    execute: (command, api) => pinAll(command.params.colIds, `"${command.params.header}"`, api, null),
};
const unpinAll = {
    key: 'unpinAll',
    aliases: [['unpin', 'all', 'column'], ['unpin', 'every', 'column'], ['remove', 'all', 'pin'], ['clear', 'all', 'pin'], ['clear', 'pin']],
    description: 'Unpins every column in the grid.',
    resolveEntities: () => ({}),
    buildCommand: () => ({ type: 'unpinAll', params: {} }),
    execute: (_command, api) => {
        const columns = api.getAllColumns();
        for (const col of columns)
            api.setColumnPin(col.colId, null);
        return `Unpinned all ${columns.length} columns.`;
    },
};
/**
 * "pin half the columns left and half right" — splits the grid's columns
 * down the middle and pins each half to whichever side(s) were mentioned.
 * Mentioning only one side pins just the first half there and leaves the
 * rest untouched, matching how a user would read that sentence literally.
 */
const pinHalf = {
    key: 'pinHalf',
    aliases: [['pin', 'half'], ['freeze', 'half']],
    description: 'Splits the grid\'s columns in half and pins them — "pin half the columns to the left and half to the right" pins the first half left and the second half right.',
    resolveEntities: (tokens, resolver) => {
        const words = new Set(tokens.map((t) => t.toLowerCase()));
        const sides = [];
        if (words.has('left'))
            sides.push('left');
        if (words.has('right'))
            sides.push('right');
        return { sides };
    },
    validate: (entities) => (entities.sides?.length ? null : 'Which side should I pin the columns to — left, right, or both?'),
    buildCommand: (entities) => ({ type: 'pinHalf', params: { sides: entities.sides } }),
    execute: (command, api) => {
        const sides = command.params.sides;
        const columns = api.getAllColumns();
        const mid = Math.ceil(columns.length / 2);
        const firstHalf = columns.slice(0, mid);
        const secondHalf = columns.slice(mid);
        if (sides.includes('left') && sides.includes('right')) {
            for (const col of firstHalf)
                api.setColumnPin(col.colId, 'left');
            for (const col of secondHalf)
                api.setColumnPin(col.colId, 'right');
            return `Pinned ${firstHalf.length} columns left and ${secondHalf.length} columns right.`;
        }
        const side = sides[0];
        for (const col of firstHalf)
            api.setColumnPin(col.colId, side);
        return `Pinned ${firstHalf.length} columns to the ${side}.`;
    },
};
/** Registers all column-pinning Photon AI intents. */
export function registerPinCommands(registry) {
    registry.registerAll([unpinAll, pinHalf, pinLeft, pinRight, unpin]);
}
//# sourceMappingURL=pin.commands.js.map