function toFilterDataType(type) {
    if (type === 'number' || type === 'currency' || type === 'percentage')
        return 'number';
    if (type === 'date' || type === 'time')
        return 'date';
    if (type === 'boolean')
        return 'boolean';
    if (type === 'dropdown')
        return 'dropdown';
    return 'string';
}
/** Flips an operator to its logical opposite when the user negated the request ("not active", "isn't Sales"). Operators with no natural opposite (e.g. `startsWith`) pass through unchanged. */
const NEGATION_FLIP = {
    equals: 'notEquals',
    notEquals: 'equals',
    contains: 'notContains',
    notContains: 'contains',
    blank: 'notBlank',
    notBlank: 'blank',
};
/** Default operator for a data type when the sentence didn't spell one out (e.g. "filter salary 5000" implies "equals", "filter name john" implies "contains"). */
function defaultOperatorFor(filterType) {
    return filterType === 'string' ? 'contains' : 'equals';
}
/** Resolves the free-text remainder of a filter clause into a typed, operator-aware condition for one already-known column. `null` means the sentence didn't contain a usable value for this column's type. */
function buildConditionForColumn(column, tokens, resolver) {
    const filterType = toFilterDataType(column.type);
    const range = resolver.resolveRange(tokens);
    if (range) {
        if (filterType === 'number') {
            const from = resolver.parseNumberToken(range.from.join(' '));
            const to = resolver.parseNumberToken(range.to.join(' '));
            if (from === null || to === null)
                return null;
            return { operator: 'inRange', value: from, valueTo: to };
        }
        if (filterType === 'date') {
            const from = resolver.parseDateToken(range.from.join(' '));
            const to = resolver.parseDateToken(range.to.join(' '));
            if (!from || !to)
                return null;
            return { operator: 'inRange', value: from, valueTo: to };
        }
        return null;
    }
    const { operator: detectedOperator, remaining: afterOperator } = resolver.resolveOperator(tokens);
    const { negated, remaining: valueTokens } = resolver.resolveNegation(afterOperator);
    const rawValue = valueTokens.join(' ').trim();
    let operator = detectedOperator ?? defaultOperatorFor(filterType);
    if (negated)
        operator = NEGATION_FLIP[operator] ?? operator;
    if (operator === 'blank' || operator === 'notBlank')
        return { operator, value: null };
    if (!rawValue)
        return null;
    switch (filterType) {
        case 'number': {
            const num = resolver.parseNumberToken(rawValue);
            return num === null ? null : { operator, value: num };
        }
        case 'date': {
            const date = resolver.parseDateToken(rawValue);
            return date ? { operator, value: date } : null;
        }
        case 'boolean': {
            const bool = resolver.parseBooleanToken(rawValue);
            return bool === null ? null : { operator, value: bool };
        }
        case 'dropdown': {
            const option = resolver.matchOption(rawValue, column);
            return option ? { operator, value: option.value } : null;
        }
        default:
            return { operator, value: rawValue };
    }
}
/** Builds a condition from an *implicitly* resolved column+value (the user never named a column — e.g. "show active items"). Always a simple equals/notEquals, since there's no explicit operator phrase to detect once the value itself was the only clue to the column. */
function buildConditionForGuessedValue(column, rawValue, negated) {
    const filterType = toFilterDataType(column.type);
    const operator = negated ? 'notEquals' : 'equals';
    if (filterType === 'boolean') {
        const bool = ['true', 'yes', 'active', 'enabled', 'on', 'open'].includes(rawValue);
        return { operator, value: bool };
    }
    return { operator, value: rawValue };
}
function toColumnFilter(column, condition) {
    const filterType = toFilterDataType(column.type);
    const primary = { operator: condition.operator, value: condition.value, valueTo: condition.valueTo };
    const isPositiveDropdownEquals = filterType === 'dropdown' && condition.operator === 'equals';
    return {
        colId: column.colId,
        field: column.field,
        type: filterType,
        logic: 'and',
        conditions: [primary],
        selectedIds: isPositiveDropdownEquals ? [condition.value] : undefined,
    };
}
const applyFilter = {
    key: 'applyFilter',
    aliases: [['show', 'only'], ['filter'], ['where'], ['find'], ['show']],
    description: 'Filters rows by a column value, with full support for string/number/date/dropdown/boolean operators — e.g. "filter salary greater than 5000", "show status active", "filter hire date before 2024-01-01", "show price between 10 and 50".',
    resolveEntities: (tokens, resolver, columns, api) => {
        const column = resolver.resolveColumn(tokens, columns) ?? undefined;
        if (column) {
            const valueTokens = resolver.stripColumnTokens(tokens, column);
            const built = buildConditionForColumn(column, valueTokens, resolver);
            return built
                ? { column, operator: built.operator, coercedValue: built.value, coercedValueTo: built.valueTo }
                : { column };
        }
        if (tokens.length === 0 || (resolver.resolveAllRequested(tokens) && tokens.length <= 2)) {
            return { allColumns: true };
        }
        const { negated, remaining } = resolver.resolveNegation(tokens);
        const guess = resolver.resolveColumnByValue(remaining, columns, api);
        if (!guess)
            return {};
        const built = buildConditionForGuessedValue(guess.column, guess.rawValue, negated);
        return { column: guess.column, operator: built.operator, coercedValue: built.value, coercedValueTo: built.valueTo };
    },
    validate: (entities) => {
        if (entities.allColumns)
            return null;
        if (!entities.column)
            return "I couldn't find a column or a matching value for that in the grid.";
        if (entities.column.filterable === false)
            return `"${entities.column.header}" isn't filterable.`;
        if (entities.coercedValue === undefined) {
            return `What value should I filter "${entities.column.header}" by?`;
        }
        return null;
    },
    buildCommand: (entities) => {
        if (entities.allColumns || !entities.column)
            return { type: 'clearFilters', params: {} };
        const column = entities.column;
        return {
            type: 'applyFilter',
            params: {
                colId: column.colId,
                header: column.header,
                operator: entities.operator,
                value: entities.coercedValue,
                valueTo: entities.coercedValueTo,
            },
        };
    },
    execute: (command, api) => {
        const colId = command.params.colId;
        const column = api.getColumn(colId);
        if (!column)
            return `"${command.params.header}" is no longer a valid column.`;
        const condition = {
            operator: command.params.operator,
            value: command.params.value,
            valueTo: command.params.valueTo,
        };
        api.setColumnFilter(colId, toColumnFilter(column, condition));
        const valueLabel = condition.operator === 'blank' || condition.operator === 'notBlank'
            ? ''
            : condition.valueTo !== undefined
                ? ` between "${describeValue(condition.value)}" and "${describeValue(condition.valueTo)}"`
                : ` to "${describeValue(condition.value)}"`;
        return `Filtered "${command.params.header}"${valueLabel}.`;
    },
};
function describeValue(value) {
    if (value instanceof Date)
        return value.toLocaleDateString();
    return String(value);
}
const clearFilters = {
    key: 'clearFilters',
    aliases: [['clear', 'filter'], ['remove', 'filter'], ['clear', 'all', 'filter']],
    description: 'Clears all active filters.',
    resolveEntities: () => ({}),
    buildCommand: () => ({ type: 'clearFilters', params: {} }),
    execute: (_command, api) => {
        api.clearAllFilters();
        return 'Cleared all filters.';
    },
};
/** Registers all filtering Photon AI intents. */
export function registerFilterCommands(registry) {
    registry.registerAll([applyFilter, clearFilters]);
}
//# sourceMappingURL=filter.commands.js.map