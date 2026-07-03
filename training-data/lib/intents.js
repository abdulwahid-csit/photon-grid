'use strict';

const { toColId } = require('./entities');

/**
 * The canonical intent taxonomy for the Photon AI training dataset.
 *
 * `status: 'implemented'` means the intent maps to a command type that
 * genuinely exists in `src/photon-ai/builtins/*.commands.ts` today and can
 * be replayed against a live `GridApi` as-is. `status: 'planned'` means the
 * underlying grid *engine* usually already exists (e.g. `chart-engine.ts`,
 * `export-engine.ts`, `pagination-engine.ts`) but Photon AI has no
 * natural-language command wired to it yet — these are a forward-looking
 * spec for extending `PhotonAIService`'s registry, not a claim that they
 * work today. Every generated example carries this flag so a consumer of
 * the dataset never mistakes a roadmap item for working behavior.
 *
 * `commandType` is the `PhotonCommand.type` the intent resolves to. It's
 * usually equal to `key`, but several fine-grained NLU intents (e.g.
 * `filterEquals`, `filterContains`, `filterGreaterThan`) all resolve to the
 * *same* real command (`applyFilter`, distinguished only by its `operator`
 * param) — mirroring how `src/photon-ai/builtins/filter.commands.ts`
 * actually works: one executable command, many recognizable phrasings.
 */

function intent(spec) {
  return {
    key: spec.key,
    category: spec.category,
    status: spec.status,
    description: spec.description,
    verbs: spec.verbs || [],
    slots: spec.slots || [],
    templates: spec.templates,
    params: spec.params || (() => ({})),
    synonyms: spec.synonyms || [],
    followUpKey: spec.followUpKey || null,
    commandType: spec.commandType || spec.key,
  };
}

const col = (name) => ({ name, type: 'columnName' });
const slot = (name, type) => ({ name, type });

const INTENTS = [];
const add = (spec) => { INTENTS.push(intent(spec)); };

// ════════════════════════════════════════════════════════════════════════
// SORTING
// ════════════════════════════════════════════════════════════════════════
add({ key: 'sortAscending', category: 'sorting', status: 'implemented',
  description: 'Sorts a column in ascending order.',
  verbs: ['sort', 'arrange', 'order', 'rank'], slots: [col('column')],
  templates: ['{verb} {column}', '{verb} {column} ascending', '{verb} {column} asc', '{verb} {column} from smallest to largest', '{verb} {column} low to high'],
  params: (v) => ({ colId: toColId(v.column), direction: 'asc' }),
  synonyms: ['ascending', 'asc', 'low to high', 'increasing'], followUpKey: 'sortDescending' });

add({ key: 'sortDescending', category: 'sorting', status: 'implemented',
  description: 'Sorts a column in descending order.',
  verbs: ['sort', 'arrange', 'order', 'rank'], slots: [col('column')],
  templates: ['{verb} {column} descending', '{verb} {column} desc', '{verb} {column} from largest to smallest', '{verb} {column} high to low', 'show {column} biggest first'],
  params: (v) => ({ colId: toColId(v.column), direction: 'desc' }),
  synonyms: ['descending', 'desc', 'high to low', 'decreasing'], followUpKey: 'clearSort' });

add({ key: 'clearSort', category: 'sorting', status: 'implemented',
  description: 'Clears all sorting.',
  templates: ['clear the sort', 'remove all sorting', 'unsort the grid', 'reset the sort order', 'stop sorting'],
  synonyms: ['unsort', 'reset sort'], followUpKey: 'sortAscending' });

add({ key: 'sortMultipleColumns', category: 'sorting', status: 'planned',
  description: 'Sorts by two columns in one command, e.g. "sort by department then salary descending".',
  slots: [col('columnA'), col('columnB')],
  templates: ['sort by {columnA} then {columnB}', 'sort {columnA} and then {columnB}', 'multi-sort {columnA}, {columnB}', 'order by {columnA} then by {columnB}'],
  params: (v) => ({ colIds: [toColId(v.columnA), toColId(v.columnB)] }),
  synonyms: ['multi-sort', 'secondary sort'], followUpKey: 'clearSort' });

add({ key: 'setSortPriority', category: 'sorting', status: 'planned',
  description: 'Assigns an explicit sort priority index to a column when multiple columns are sorted.',
  slots: [col('column'), slot('columnSortOrderIndex', 'columnSortOrderIndex')],
  templates: ['make {column} sort priority {columnSortOrderIndex}', 'set {column} as sort level {columnSortOrderIndex}', '{column} should be sort order {columnSortOrderIndex}'],
  params: (v) => ({ colId: toColId(v.column), priority: Number(v.columnSortOrderIndex) }),
  synonyms: ['sort priority', 'sort level'], followUpKey: 'sortMultipleColumns' });

add({ key: 'enableMultiSortModifier', category: 'sorting', status: 'planned',
  description: 'Sets which modifier key (Ctrl/Shift) adds a secondary sort column when clicking headers.',
  slots: [slot('multiSortModifierKey', 'multiSortModifierKey')],
  templates: ['use {multiSortModifierKey} for multi column sort', 'set the multi-sort key to {multiSortModifierKey}', 'multi-sort should use {multiSortModifierKey} click'],
  params: (v) => ({ modifier: v.multiSortModifierKey }),
  synonyms: ['multi-sort modifier'], followUpKey: 'sortMultipleColumns' });

add({ key: 'toggleSortIndicatorVisibility', category: 'sorting', status: 'planned',
  description: 'Shows or hides the little sort-direction arrow in column headers.',
  templates: ['hide the sort arrows', 'show the sort indicators', 'turn off sort icons in the header', 'toggle sort arrow visibility'],
  synonyms: ['sort arrow', 'sort icon'], followUpKey: 'sortAscending' });

add({ key: 'sortInfo', category: 'sorting', status: 'implemented',
  description: "Reports which column(s) the grid is currently sorted by.",
  templates: ['what is the grid sorted by', 'which column is sorted', "what's the current sort", 'show me the sort state', 'how is this sorted right now'],
  synonyms: ['current sort', 'sort state'], followUpKey: 'clearSort' });

// ════════════════════════════════════════════════════════════════════════
// FILTERING
// ════════════════════════════════════════════════════════════════════════
function filterIntent(key, opName, opPhrase, extraSlots, paramsFn, templates, followUpKey) {
  add({ key, category: 'filtering', status: 'implemented', commandType: 'applyFilter',
    description: `Filters rows where a column ${opPhrase} a given value.`,
    slots: [col('column'), ...(extraSlots || [])],
    templates,
    params: paramsFn,
    synonyms: [opPhrase], followUpKey: followUpKey || 'clearAllFilters' });
}
filterIntent('filterEquals', 'equals', 'equals', [slot('filterValue', 'filterValue')],
  (v) => ({ colId: toColId(v.column), operator: 'equals', value: v.filterValue }),
  ['filter {column} equal to {filterValue}', 'show only {column} that is {filterValue}', 'where {column} is {filterValue}', '{column} = {filterValue}']);
filterIntent('filterNotEquals', 'notEquals', "doesn't equal", [slot('filterValue', 'filterValue')],
  (v) => ({ colId: toColId(v.column), operator: 'notEquals', value: v.filterValue }),
  ["filter {column} not equal to {filterValue}", "show {column} that isn't {filterValue}", 'exclude {column} equal to {filterValue}']);
filterIntent('filterContains', 'contains', 'contains', [slot('filterValue', 'filterValue')],
  (v) => ({ colId: toColId(v.column), operator: 'contains', value: v.filterValue }),
  ['filter {column} containing {filterValue}', 'show rows where {column} has {filterValue} in it', 'find {column} with {filterValue}']);
filterIntent('filterNotContains', 'notContains', "doesn't contain", [slot('filterValue', 'filterValue')],
  (v) => ({ colId: toColId(v.column), operator: 'notContains', value: v.filterValue }),
  ["filter {column} not containing {filterValue}", "show {column} without {filterValue}", 'exclude rows where {column} has {filterValue}']);
filterIntent('filterStartsWith', 'startsWith', 'starts with', [slot('filterValue', 'filterValue')],
  (v) => ({ colId: toColId(v.column), operator: 'startsWith', value: v.filterValue }),
  ['filter {column} starting with {filterValue}', 'show {column} that begins with {filterValue}']);
filterIntent('filterEndsWith', 'endsWith', 'ends with', [slot('filterValue', 'filterValue')],
  (v) => ({ colId: toColId(v.column), operator: 'endsWith', value: v.filterValue }),
  ['filter {column} ending with {filterValue}', 'show {column} that finishes with {filterValue}']);
filterIntent('filterGreaterThan', 'greaterThan', 'is greater than', [slot('filterValue', 'numberValue')],
  (v) => ({ colId: toColId(v.column), operator: 'greaterThan', value: Number(v.filterValue) }),
  ['filter {column} greater than {filterValue}', 'show {column} above {filterValue}', '{column} more than {filterValue}', '{column} > {filterValue}']);
filterIntent('filterGreaterThanOrEqual', 'greaterThanOrEqual', 'is at least', [slot('filterValue', 'numberValue')],
  (v) => ({ colId: toColId(v.column), operator: 'greaterThanOrEqual', value: Number(v.filterValue) }),
  ['filter {column} at least {filterValue}', 'show {column} greater than or equal to {filterValue}', '{column} >= {filterValue}']);
filterIntent('filterLessThan', 'lessThan', 'is less than', [slot('filterValue', 'numberValue')],
  (v) => ({ colId: toColId(v.column), operator: 'lessThan', value: Number(v.filterValue) }),
  ['filter {column} less than {filterValue}', 'show {column} below {filterValue}', '{column} under {filterValue}', '{column} < {filterValue}']);
filterIntent('filterLessThanOrEqual', 'lessThanOrEqual', 'is at most', [slot('filterValue', 'numberValue')],
  (v) => ({ colId: toColId(v.column), operator: 'lessThanOrEqual', value: Number(v.filterValue) }),
  ['filter {column} at most {filterValue}', 'show {column} less than or equal to {filterValue}', '{column} <= {filterValue}']);
filterIntent('filterBetween', 'inRange', 'is between', [slot('filterValue', 'numberValue'), slot('filterValueTo', 'numberValue')],
  (v) => ({ colId: toColId(v.column), operator: 'inRange', value: Number(v.filterValue), valueTo: Number(v.filterValueTo) }),
  ['filter {column} between {filterValue} and {filterValueTo}', 'show {column} from {filterValue} to {filterValueTo}', '{column} in range {filterValue}-{filterValueTo}']);
filterIntent('filterBlank', 'blank', 'is blank', [],
  (v) => ({ colId: toColId(v.column), operator: 'blank' }),
  ['filter {column} that is blank', 'show rows where {column} is empty', 'find missing {column} values']);
filterIntent('filterNotBlank', 'notBlank', 'is not blank', [],
  (v) => ({ colId: toColId(v.column), operator: 'notBlank' }),
  ['filter {column} that is not blank', 'show rows where {column} has a value', 'exclude empty {column}']);

add({ key: 'clearColumnFilter', category: 'filtering', status: 'planned',
  description: 'Clears the filter on a single named column, leaving other filters intact.',
  slots: [col('column')],
  templates: ['clear the filter on {column}', 'remove {column} filter only', 'unfilter {column}'],
  params: (v) => ({ colId: toColId(v.column) }),
  synonyms: ['unfilter'], followUpKey: 'clearAllFilters' });

add({ key: 'clearAllFilters', category: 'filtering', status: 'implemented',
  description: 'Clears all active filters.',
  templates: ['clear all filters', 'remove every filter', 'reset the filters', 'stop filtering'],
  synonyms: ['reset filters'], followUpKey: 'filterEquals' });

add({ key: 'quickFilterSearch', category: 'filtering', status: 'planned',
  description: 'Runs a single free-text quick filter across every column at once.',
  slots: [slot('quickFilterText', 'quickFilterText')],
  templates: ['quick filter for {quickFilterText}', 'search the whole grid for {quickFilterText}', 'find {quickFilterText} anywhere in the data'],
  params: (v) => ({ text: v.quickFilterText }),
  synonyms: ['quick search', 'global search'], followUpKey: 'clearAllFilters' });

add({ key: 'setFilterLogic', category: 'filtering', status: 'planned',
  description: 'Sets whether a column\'s multiple filter conditions combine with AND or OR.',
  slots: [col('column'), slot('logicalOperator', 'logicalOperator')],
  templates: ['combine {column} filter conditions with {logicalOperator}', 'use {logicalOperator} logic for the {column} filter'],
  params: (v) => ({ colId: toColId(v.column), logic: v.logicalOperator }),
  synonyms: ['filter logic'], followUpKey: 'filterEquals' });

add({ key: 'filterInfo', category: 'filtering', status: 'implemented',
  description: "Lists every column that currently has an active filter.",
  templates: ['what filters are active', 'which columns are filtered', 'show me the current filters', "what's being filtered right now"],
  synonyms: ['active filters'], followUpKey: 'clearAllFilters' });

// ════════════════════════════════════════════════════════════════════════
// GROUPING
// ════════════════════════════════════════════════════════════════════════
add({ key: 'groupBy', category: 'grouping', status: 'implemented',
  description: 'Groups rows by one or more columns.',
  verbs: ['group'], slots: [col('column')],
  templates: ['group by {column}', 'group the rows by {column}', 'organize by {column}', 'roll up the data by {column}', 'bucket rows by {column}'],
  params: (v) => ({ colIds: [toColId(v.column)] }),
  synonyms: ['organize by', 'roll up', 'bucket'], followUpKey: 'ungroup' });

add({ key: 'groupByMultipleColumns', category: 'grouping', status: 'implemented', commandType: 'groupBy',
  description: 'Groups rows by two columns, nested.',
  slots: [col('columnA'), col('columnB')],
  templates: ['group by {columnA} and {columnB}', 'group by {columnA} then {columnB}', 'nest groups by {columnA} inside {columnB}'],
  params: (v) => ({ colIds: [toColId(v.columnA), toColId(v.columnB)] }),
  synonyms: ['nested grouping'], followUpKey: 'ungroup' });

add({ key: 'ungroup', category: 'grouping', status: 'implemented',
  description: 'Clears all row grouping.',
  templates: ['ungroup the rows', 'clear all grouping', 'remove grouping', 'flatten the grid back out'],
  synonyms: ['flatten', 'clear grouping'], followUpKey: 'groupBy' });

add({ key: 'expandAllGroups', category: 'grouping', status: 'implemented',
  description: 'Expands every group row.',
  templates: ['expand all groups', 'open every group', 'expand all rows', 'show everything expanded'],
  synonyms: ['expand everything'], followUpKey: 'collapseAllGroups' });

add({ key: 'collapseAllGroups', category: 'grouping', status: 'implemented',
  description: 'Collapses every group row.',
  templates: ['collapse all groups', 'close every group', 'collapse all rows', 'fold everything up'],
  synonyms: ['collapse everything'], followUpKey: 'expandAllGroups' });

add({ key: 'expandRow', category: 'grouping', status: 'implemented',
  description: 'Expands a specific group/detail row by its 1-based position.',
  slots: [slot('rowIndex', 'rowIndex')],
  templates: ['expand row {rowIndex}', 'open row number {rowIndex}', 'expand the {rowIndex}th row'],
  params: (v) => ({ index: Number(v.rowIndex) }),
  synonyms: ['open row'], followUpKey: 'collapseRow' });

add({ key: 'collapseRow', category: 'grouping', status: 'implemented',
  description: 'Collapses a specific row by its 1-based position.',
  slots: [slot('rowIndex', 'rowIndex')],
  templates: ['collapse row {rowIndex}', 'close row number {rowIndex}', 'collapse the {rowIndex}th row'],
  params: (v) => ({ index: Number(v.rowIndex) }),
  synonyms: ['close row'], followUpKey: 'expandRow' });

add({ key: 'setGroupAggregation', category: 'grouping', status: 'planned',
  description: 'Sets which aggregation function summarizes a column within each group.',
  slots: [col('column'), slot('aggregationFunction', 'aggregationFunction')],
  templates: ['aggregate {column} by {aggregationFunction} in each group', 'show {aggregationFunction} of {column} per group', 'group {column} totals using {aggregationFunction}'],
  params: (v) => ({ colId: toColId(v.column), fn: v.aggregationFunction }),
  synonyms: ['group aggregation'], followUpKey: 'groupBy' });

add({ key: 'showGroupSubtotal', category: 'grouping', status: 'planned',
  description: 'Shows a subtotal row for each group.',
  templates: ['show subtotals for each group', 'add group subtotal rows', 'turn on group totals'],
  synonyms: ['subtotal'], followUpKey: 'hideGroupSubtotal' });

add({ key: 'hideGroupSubtotal', category: 'grouping', status: 'planned',
  description: 'Hides per-group subtotal rows.',
  templates: ['hide group subtotals', 'remove the subtotal rows', 'turn off group totals'],
  synonyms: ['hide subtotal'], followUpKey: 'showGroupSubtotal' });

add({ key: 'groupInfo', category: 'grouping', status: 'implemented',
  description: 'Reports which column(s) rows are currently grouped by.',
  templates: ['what is the data grouped by', 'which column are we grouped on', "what's the current grouping", 'show me the group state'],
  synonyms: ['group state'], followUpKey: 'ungroup' });

// ════════════════════════════════════════════════════════════════════════
// PIVOTING (planned)
// ════════════════════════════════════════════════════════════════════════
add({ key: 'enablePivotMode', category: 'pivoting', status: 'planned',
  description: 'Switches the grid into pivot mode.',
  templates: ['turn on pivot mode', 'enable pivoting', 'switch to a pivot table', 'pivot this data'],
  synonyms: ['pivot mode'], followUpKey: 'addPivotRowField' });
add({ key: 'disablePivotMode', category: 'pivoting', status: 'planned',
  description: 'Turns pivot mode off, returning to the flat grid.',
  templates: ['turn off pivot mode', 'disable pivoting', 'exit pivot view', 'go back to the normal grid'],
  synonyms: ['exit pivot'], followUpKey: 'enablePivotMode' });
add({ key: 'addPivotRowField', category: 'pivoting', status: 'planned',
  description: 'Adds a column as a pivot row-grouping field.',
  slots: [col('column')],
  templates: ['use {column} as a pivot row', 'add {column} to pivot rows', 'group pivot rows by {column}'],
  params: (v) => ({ colId: toColId(v.column) }),
  synonyms: ['pivot row field'], followUpKey: 'addPivotColumnField' });
add({ key: 'addPivotColumnField', category: 'pivoting', status: 'planned',
  description: 'Adds a column as a pivot column-grouping field.',
  slots: [col('column')],
  templates: ['use {column} as a pivot column', 'add {column} to pivot columns', 'spread {column} across pivot columns'],
  params: (v) => ({ colId: toColId(v.column) }),
  synonyms: ['pivot column field'], followUpKey: 'addPivotValueField' });
add({ key: 'addPivotValueField', category: 'pivoting', status: 'planned',
  description: 'Adds a summarized value field to the pivot table.',
  slots: [col('column'), slot('aggregationFunction', 'aggregationFunction')],
  templates: ['pivot {column} using {aggregationFunction}', 'add {column} as a pivot value with {aggregationFunction}', 'summarize {column} by {aggregationFunction} in the pivot'],
  params: (v) => ({ colId: toColId(v.column), fn: v.aggregationFunction }),
  synonyms: ['pivot value field'], followUpKey: 'removePivotField' });
add({ key: 'removePivotField', category: 'pivoting', status: 'planned',
  description: 'Removes a column from the pivot configuration.',
  slots: [col('column')],
  templates: ['remove {column} from the pivot', 'take {column} out of pivot fields', 'stop pivoting on {column}'],
  params: (v) => ({ colId: toColId(v.column) }),
  synonyms: ['remove pivot field'], followUpKey: 'clearPivotConfiguration' });
add({ key: 'swapPivotRowsAndColumns', category: 'pivoting', status: 'planned',
  description: 'Swaps the pivot table\'s row fields and column fields.',
  templates: ['swap pivot rows and columns', 'flip the pivot axes', 'transpose the pivot table'],
  synonyms: ['transpose pivot'], followUpKey: 'addPivotRowField' });
add({ key: 'clearPivotConfiguration', category: 'pivoting', status: 'planned',
  description: 'Clears every pivot row/column/value field.',
  templates: ['clear the pivot configuration', 'reset the pivot table', 'remove all pivot fields'],
  synonyms: ['reset pivot'], followUpKey: 'enablePivotMode' });
add({ key: 'setPivotValueAggregation', category: 'pivoting', status: 'planned',
  description: 'Changes the aggregation function used for an existing pivot value field.',
  slots: [col('column'), slot('aggregationFunction', 'aggregationFunction')],
  templates: ['change the pivot {column} aggregation to {aggregationFunction}', 'use {aggregationFunction} instead for {column} in the pivot'],
  params: (v) => ({ colId: toColId(v.column), fn: v.aggregationFunction }),
  synonyms: ['pivot aggregation'], followUpKey: 'addPivotValueField' });
add({ key: 'togglePivotColumnTotals', category: 'pivoting', status: 'planned',
  description: 'Shows or hides grand-total columns in pivot mode.',
  templates: ['show pivot column totals', 'hide pivot totals column', 'toggle pivot grand totals'],
  synonyms: ['pivot totals'], followUpKey: 'enablePivotMode' });
add({ key: 'pivotInfo', category: 'pivoting', status: 'planned',
  description: 'Reports the current pivot row/column/value field configuration.',
  templates: ['what is the pivot configuration', 'show me the current pivot fields', "what's set up in the pivot table"],
  synonyms: ['pivot state'], followUpKey: 'clearPivotConfiguration' });

// ════════════════════════════════════════════════════════════════════════
// AGGREGATION (planned)
// ════════════════════════════════════════════════════════════════════════
function aggIntent(key, fn, verbPhrase) {
  add({ key, category: 'aggregation', status: 'planned', commandType: 'setColumnAggregation',
    description: `Aggregates a column with ${fn}.`,
    slots: [col('column')],
    templates: [`${verbPhrase} {column}`, `show the ${fn} of {column}`, `aggregate {column} by ${fn}`, `add a ${fn} summary for {column}`],
    params: (v) => ({ colId: toColId(v.column), fn }),
    synonyms: [fn], followUpKey: 'clearColumnAggregation' });
}
aggIntent('setColumnAggregationSum', 'sum', 'sum');
aggIntent('setColumnAggregationAverage', 'avg', 'average');
aggIntent('setColumnAggregationMin', 'min', 'find the minimum of');
aggIntent('setColumnAggregationMax', 'max', 'find the maximum of');
aggIntent('setColumnAggregationCount', 'count', 'count');

add({ key: 'clearColumnAggregation', category: 'aggregation', status: 'planned',
  description: 'Removes the aggregation summary from a column.',
  slots: [col('column')],
  templates: ['clear the aggregation on {column}', 'remove the {column} summary', 'stop summarizing {column}'],
  params: (v) => ({ colId: toColId(v.column) }),
  synonyms: ['remove aggregation'], followUpKey: 'setColumnAggregationSum' });

add({ key: 'showGrandTotal', category: 'aggregation', status: 'planned',
  description: 'Shows a grand-total row across all aggregated columns.',
  templates: ['show a grand total row', 'add the grand total', 'turn on totals row'],
  synonyms: ['grand total'], followUpKey: 'hideGrandTotal' });

add({ key: 'hideGrandTotal', category: 'aggregation', status: 'planned',
  description: 'Hides the grand-total row.',
  templates: ['hide the grand total row', 'remove the totals row', 'turn off grand total'],
  synonyms: ['hide totals'], followUpKey: 'showGrandTotal' });

add({ key: 'setAggregationLabel', category: 'aggregation', status: 'planned',
  description: 'Sets a custom label for a column\'s aggregation summary.',
  slots: [col('column'), slot('aggregationLabel', 'aggregationLabel')],
  templates: ['label the {column} summary as {aggregationLabel}', 'rename the {column} aggregation to {aggregationLabel}'],
  params: (v) => ({ colId: toColId(v.column), label: v.aggregationLabel }),
  synonyms: ['aggregation label'], followUpKey: 'setColumnAggregationSum' });

add({ key: 'aggregationInfo', category: 'aggregation', status: 'planned',
  description: 'Reports which columns have an active aggregation and what function they use.',
  templates: ['what aggregations are active', 'which columns have summaries', 'show me the current aggregation setup'],
  synonyms: ['aggregation state'], followUpKey: 'clearColumnAggregation' });

// ════════════════════════════════════════════════════════════════════════
// CHARTS (planned)
// ════════════════════════════════════════════════════════════════════════
function chartCreateIntent(key, type) {
  add({ key, category: 'charts', status: 'planned', commandType: 'createChart',
    description: `Creates a ${type} chart from the current data.`,
    slots: [col('column')],
    templates: [`create a ${type} chart of {column}`, `chart {column} as a ${type}`, `visualize {column} with a ${type} chart`, `make me a ${type} chart for {column}`],
    params: (v) => ({ type, colId: toColId(v.column) }),
    synonyms: [`${type} chart`], followUpKey: 'setChartTitle' });
}
chartCreateIntent('createBarChart', 'bar');
chartCreateIntent('createLineChart', 'line');
chartCreateIntent('createPieChart', 'pie');
chartCreateIntent('createScatterChart', 'scatter');
chartCreateIntent('createAreaChart', 'area');

add({ key: 'changeChartType', category: 'charts', status: 'planned',
  description: 'Changes an existing chart to a different chart type.',
  slots: [slot('chartType', 'chartType')],
  templates: ['change the chart to a {chartType} chart', 'switch the chart type to {chartType}', 'make it a {chartType} chart instead'],
  params: (v) => ({ type: v.chartType }),
  synonyms: ['chart type'], followUpKey: 'setChartTitle' });

add({ key: 'deleteChart', category: 'charts', status: 'planned',
  description: 'Removes the current chart.',
  templates: ['delete the chart', 'remove this chart', 'get rid of the chart'],
  synonyms: ['remove chart'], followUpKey: 'createBarChart' });

add({ key: 'moveChart', category: 'charts', status: 'planned',
  description: 'Repositions the chart panel within the grid.',
  slots: [slot('columnPosition', 'columnPosition')],
  templates: ['move the chart to the {columnPosition}', 'reposition the chart to {columnPosition}'],
  params: (v) => ({ position: v.columnPosition }),
  synonyms: ['move chart'], followUpKey: 'resizeChart' });

add({ key: 'resizeChart', category: 'charts', status: 'planned',
  description: 'Resizes the chart panel.',
  slots: [slot('columnWidth', 'columnWidth')],
  templates: ['resize the chart to {columnWidth} wide', 'make the chart {columnWidth}', 'shrink the chart down'],
  params: (v) => ({ width: v.columnWidth }),
  synonyms: ['resize chart'], followUpKey: 'moveChart' });

add({ key: 'addChartSeries', category: 'charts', status: 'planned',
  description: 'Adds another data series to the chart.',
  slots: [col('column')],
  templates: ['add {column} as another series', 'chart {column} alongside the existing series', 'include {column} in the chart'],
  params: (v) => ({ colId: toColId(v.column) }),
  synonyms: ['add series'], followUpKey: 'removeChartSeries' });

add({ key: 'removeChartSeries', category: 'charts', status: 'planned',
  description: 'Removes a data series from the chart.',
  slots: [col('column')],
  templates: ['remove {column} from the chart', 'drop the {column} series', 'stop charting {column}'],
  params: (v) => ({ colId: toColId(v.column) }),
  synonyms: ['remove series'], followUpKey: 'addChartSeries' });

add({ key: 'setChartTitle', category: 'charts', status: 'planned',
  description: 'Sets the chart\'s title text.',
  slots: [slot('chartTitle', 'chartTitle')],
  templates: ['title the chart {chartTitle}', 'set the chart title to {chartTitle}', 'call this chart {chartTitle}'],
  params: (v) => ({ title: v.chartTitle }),
  synonyms: ['chart title'], followUpKey: 'toggleChartLegend' });

add({ key: 'toggleChartLegend', category: 'charts', status: 'planned',
  description: 'Shows or hides the chart legend.',
  slots: [slot('chartLegendPosition', 'chartLegendPosition')],
  templates: ['show the chart legend at the {chartLegendPosition}', 'hide the chart legend', 'move the legend to the {chartLegendPosition}'],
  params: (v) => ({ position: v.chartLegendPosition }),
  synonyms: ['chart legend'], followUpKey: 'exportChartAsImage' });

add({ key: 'setChartColorPalette', category: 'charts', status: 'planned',
  description: 'Changes the color palette used by the chart series.',
  slots: [slot('chartColorPalette', 'chartColorPalette')],
  templates: ['use the {chartColorPalette} palette for the chart', 'change chart colors to {chartColorPalette}'],
  params: (v) => ({ palette: v.chartColorPalette }),
  synonyms: ['chart palette'], followUpKey: 'setChartTitle' });

add({ key: 'exportChartAsImage', category: 'charts', status: 'planned',
  description: 'Exports the current chart as an image file.',
  templates: ['export the chart as an image', 'save this chart as a picture', 'download the chart as png'],
  synonyms: ['chart image'], followUpKey: 'deleteChart' });

add({ key: 'chartInfo', category: 'charts', status: 'planned',
  description: 'Reports what chart type and series are currently configured.',
  templates: ['what chart is currently shown', 'which series are charted', 'describe the current chart'],
  synonyms: ['chart state'], followUpKey: 'changeChartType' });

// ════════════════════════════════════════════════════════════════════════
// EDITING
// ════════════════════════════════════════════════════════════════════════
add({ key: 'editCellValue', category: 'editing', status: 'planned',
  description: 'Sets a specific cell\'s value directly from a command.',
  slots: [col('column'), slot('rowIndex', 'rowIndex'), slot('cellValue', 'cellValue')],
  templates: ['set {column} in row {rowIndex} to {cellValue}', 'change row {rowIndex}\'s {column} to {cellValue}', 'update {column} at row {rowIndex} to {cellValue}'],
  params: (v) => ({ colId: toColId(v.column), rowIndex: Number(v.rowIndex), value: v.cellValue }),
  synonyms: ['edit cell'], followUpKey: 'clearCellValue' });

add({ key: 'clearCellValue', category: 'editing', status: 'planned',
  description: 'Blanks out a specific cell\'s value.',
  slots: [col('column'), slot('rowIndex', 'rowIndex')],
  templates: ['clear {column} in row {rowIndex}', 'blank out row {rowIndex}\'s {column}', 'empty the {column} cell in row {rowIndex}'],
  params: (v) => ({ colId: toColId(v.column), rowIndex: Number(v.rowIndex) }),
  synonyms: ['blank cell'], followUpKey: 'editCellValue' });

add({ key: 'makeColumnEditable', category: 'editing', status: 'planned',
  description: 'Makes a column\'s cells editable.',
  slots: [col('column')],
  templates: ['make {column} editable', 'allow editing on {column}', 'let users edit {column}'],
  params: (v) => ({ colId: toColId(v.column), editable: true }),
  synonyms: ['editable column'], followUpKey: 'makeColumnReadOnly' });

add({ key: 'makeColumnReadOnly', category: 'editing', status: 'planned',
  description: 'Makes a column\'s cells read-only.',
  slots: [col('column')],
  templates: ['make {column} read only', 'lock {column} from editing', "don't let users edit {column}"],
  params: (v) => ({ colId: toColId(v.column), editable: false }),
  synonyms: ['read only column'], followUpKey: 'makeColumnEditable' });

add({ key: 'setColumnEditorType', category: 'editing', status: 'planned',
  description: 'Sets which editor widget a column uses when edited.',
  slots: [col('column'), slot('editorType', 'editorType')],
  templates: ['use a {editorType} editor for {column}', 'set {column}\'s editor to {editorType}', 'edit {column} with a {editorType} input'],
  params: (v) => ({ colId: toColId(v.column), editorType: v.editorType }),
  synonyms: ['cell editor'], followUpKey: 'makeColumnEditable' });

add({ key: 'setColumnValidationRule', category: 'editing', status: 'planned',
  description: 'Adds a validation rule to a column\'s editor.',
  slots: [col('column'), slot('validationRule', 'validationRule')],
  templates: ['validate {column} as {validationRule}', 'add a {validationRule} rule to {column}', 'require {column} to be {validationRule}'],
  params: (v) => ({ colId: toColId(v.column), rule: v.validationRule }),
  synonyms: ['validation rule'], followUpKey: 'setColumnEditorType' });

add({ key: 'undoLastAction', category: 'editing', status: 'planned',
  description: 'Reverts the most recent change.',
  templates: ['undo the last action', 'undo that', 'undo my last change', 'revert the last edit', 'take back the last change'],
  synonyms: ['revert', 'roll back'], followUpKey: 'redoLastAction' });

add({ key: 'redoLastAction', category: 'editing', status: 'planned',
  description: 'Re-applies the most recently undone change.',
  templates: ['redo that', 'redo the last undone action', 'bring back what i just undid', 'reapply the last change'],
  synonyms: ['reapply'], followUpKey: 'undoLastAction' });

add({ key: 'addNewRow', category: 'editing', status: 'planned',
  description: 'Adds a new, empty row to the grid.',
  templates: ['add a new row', 'insert a blank row', 'create a new record', 'add another entry'],
  synonyms: ['insert row', 'new record'], followUpKey: 'deleteRow' });

add({ key: 'deleteRow', category: 'editing', status: 'planned',
  description: 'Deletes a specific row by its 1-based position.',
  slots: [slot('rowIndex', 'rowIndex')],
  templates: ['delete row {rowIndex}', 'remove row number {rowIndex}', 'get rid of row {rowIndex}'],
  params: (v) => ({ index: Number(v.rowIndex) }),
  synonyms: ['remove row'], followUpKey: 'addNewRow' });

add({ key: 'duplicateRow', category: 'editing', status: 'planned',
  description: 'Duplicates a specific row.',
  slots: [slot('rowIndex', 'rowIndex')],
  templates: ['duplicate row {rowIndex}', 'copy row {rowIndex} as a new row', 'clone row number {rowIndex}'],
  params: (v) => ({ index: Number(v.rowIndex) }),
  synonyms: ['clone row'], followUpKey: 'deleteRow' });

add({ key: 'bulkEditColumn', category: 'editing', status: 'planned',
  description: 'Sets the same value for a column across every visible row.',
  slots: [col('column'), slot('cellValue', 'cellValue')],
  templates: ['set every {column} to {cellValue}', 'bulk update {column} to {cellValue}', 'change all {column} values to {cellValue}'],
  params: (v) => ({ colId: toColId(v.column), value: v.cellValue }),
  synonyms: ['bulk edit'], followUpKey: 'undoLastAction' });

// ════════════════════════════════════════════════════════════════════════
// CLIPBOARD
// ════════════════════════════════════════════════════════════════════════
add({ key: 'copyAllCells', category: 'clipboard', status: 'implemented',
  description: 'Selects and copies every cell to the clipboard.',
  templates: ['copy all cells', 'copy everything', 'select and copy all the cells', 'copy the whole grid'],
  synonyms: ['copy everything'], followUpKey: 'cutAllCells' });

add({ key: 'cutAllCells', category: 'clipboard', status: 'implemented',
  description: 'Selects every cell and copies it (cut never deletes data).',
  templates: ['cut all cells', 'cut everything', 'select and cut all the cells'],
  synonyms: ['cut everything'], followUpKey: 'pasteFromClipboard' });

add({ key: 'pasteFromClipboard', category: 'clipboard', status: 'planned',
  description: 'Pastes clipboard contents into the current selection.',
  templates: ['paste here', 'paste the clipboard', 'paste into the selected cells'],
  synonyms: ['paste'], followUpKey: 'undoLastAction' });

add({ key: 'copyWithHeaders', category: 'clipboard', status: 'planned',
  description: 'Copies the current selection including column headers.',
  templates: ['copy with headers', 'copy the selection and include column names', 'copy including the header row'],
  synonyms: ['copy headers'], followUpKey: 'copyAllCells' });

add({ key: 'copyCellValue', category: 'clipboard', status: 'planned',
  description: 'Copies a single cell\'s value to the clipboard.',
  slots: [col('column'), slot('rowIndex', 'rowIndex')],
  templates: ['copy the {column} value from row {rowIndex}', 'copy row {rowIndex}\'s {column}'],
  params: (v) => ({ colId: toColId(v.column), rowIndex: Number(v.rowIndex) }),
  synonyms: ['copy cell'], followUpKey: 'pasteFromClipboard' });

add({ key: 'setClipboardFormat', category: 'clipboard', status: 'planned',
  description: 'Sets whether copy/paste uses CSV, TSV, or HTML formatting.',
  slots: [slot('clipboardFormat', 'clipboardFormat')],
  templates: ['use {clipboardFormat} format for copy paste', 'set the clipboard format to {clipboardFormat}'],
  params: (v) => ({ format: v.clipboardFormat }),
  synonyms: ['clipboard format'], followUpKey: 'copyAllCells' });

add({ key: 'disableClipboard', category: 'clipboard', status: 'planned',
  description: 'Disables copy/cut/paste for the grid.',
  templates: ['disable the clipboard', 'turn off copy and paste', 'block clipboard access'],
  synonyms: ['disable copy paste'], followUpKey: 'enableClipboard' });

add({ key: 'enableClipboard', category: 'clipboard', status: 'planned',
  description: 'Re-enables copy/cut/paste for the grid.',
  templates: ['enable the clipboard', 'turn on copy and paste', 'allow clipboard access again'],
  synonyms: ['enable copy paste'], followUpKey: 'disableClipboard' });

// ════════════════════════════════════════════════════════════════════════
// IMPORT / EXPORT
// ════════════════════════════════════════════════════════════════════════
function exportIntent(key, format) {
  add({ key, category: 'import-export', status: 'planned', commandType: 'exportData',
    description: `Exports the grid's data as ${format.toUpperCase()}.`,
    templates: [`export to ${format}`, `download this as ${format}`, `save the grid as a ${format} file`, `give me a ${format} export`],
    params: () => ({ format }),
    synonyms: [format], followUpKey: 'exportSelectedRows' });
}
exportIntent('exportToCsv', 'csv');
exportIntent('exportToExcel', 'excel');
exportIntent('exportToPdf', 'pdf');
exportIntent('exportToJson', 'json');

add({ key: 'exportSelectedRows', category: 'import-export', status: 'planned',
  description: 'Exports only the currently selected rows.',
  slots: [slot('exportFormat', 'exportFormat')],
  templates: ['export just the selected rows as {exportFormat}', 'download only what I selected as {exportFormat}'],
  params: (v) => ({ format: v.exportFormat, range: 'selected' }),
  synonyms: ['export selection'], followUpKey: 'exportFilteredRows' });

add({ key: 'exportFilteredRows', category: 'import-export', status: 'planned',
  description: 'Exports only the rows currently visible after filtering.',
  slots: [slot('exportFormat', 'exportFormat')],
  templates: ['export the filtered rows as {exportFormat}', 'download what\'s currently filtered as {exportFormat}'],
  params: (v) => ({ format: v.exportFormat, range: 'filtered' }),
  synonyms: ['export filtered'], followUpKey: 'exportAllRows' });

add({ key: 'exportAllRows', category: 'import-export', status: 'planned',
  description: 'Exports every row regardless of filtering or selection.',
  slots: [slot('exportFormat', 'exportFormat')],
  templates: ['export every row as {exportFormat}', 'download the full dataset as {exportFormat}'],
  params: (v) => ({ format: v.exportFormat, range: 'all' }),
  synonyms: ['export all'], followUpKey: 'setExportFileName' });

add({ key: 'setExportFileName', category: 'import-export', status: 'planned',
  description: 'Sets the file name used for the next export.',
  slots: [slot('exportFileName', 'exportFileName')],
  templates: ['name the export {exportFileName}', 'save the export as {exportFileName}', 'call the exported file {exportFileName}'],
  params: (v) => ({ fileName: v.exportFileName }),
  synonyms: ['export file name'], followUpKey: 'exportToCsv' });

add({ key: 'setExportPageOrientation', category: 'import-export', status: 'planned',
  description: 'Sets the page orientation for a PDF export.',
  slots: [slot('printOrientation', 'printOrientation')],
  templates: ['export the pdf in {printOrientation} orientation', 'use {printOrientation} layout for the pdf export'],
  params: (v) => ({ orientation: v.printOrientation }),
  synonyms: ['pdf orientation'], followUpKey: 'exportToPdf' });

add({ key: 'importFromCsv', category: 'import-export', status: 'planned',
  description: 'Imports row data from a CSV file into the grid.',
  slots: [slot('dataSourceName', 'dataSourceName')],
  templates: ['import {dataSourceName}', 'load data from {dataSourceName}', 'bring in the rows from {dataSourceName}'],
  params: (v) => ({ source: v.dataSourceName, format: 'csv' }),
  synonyms: ['import csv'], followUpKey: 'importFromJson' });

add({ key: 'importFromJson', category: 'import-export', status: 'planned',
  description: 'Imports row data from a JSON source into the grid.',
  slots: [slot('dataSourceName', 'dataSourceName')],
  templates: ['import {dataSourceName} as json', 'load json data from {dataSourceName}'],
  params: (v) => ({ source: v.dataSourceName, format: 'json' }),
  synonyms: ['import json'], followUpKey: 'importFromCsv' });

// ════════════════════════════════════════════════════════════════════════
// SELECTION
// ════════════════════════════════════════════════════════════════════════
add({ key: 'selectRow', category: 'selection', status: 'implemented',
  description: 'Selects a row by its 1-based position.',
  slots: [slot('rowIndex', 'rowIndex')],
  templates: ['select row {rowIndex}', 'pick row number {rowIndex}', 'highlight row {rowIndex}'],
  params: (v) => ({ index: Number(v.rowIndex) }),
  synonyms: ['pick row'], followUpKey: 'clearSelection' });

add({ key: 'selectColumn', category: 'selection', status: 'implemented',
  description: 'Selects every cell in a column.',
  slots: [col('column')],
  templates: ['select the {column} column', 'select all of {column}', 'highlight the {column} column'],
  params: (v) => ({ colId: toColId(v.column) }),
  synonyms: ['select all of'], followUpKey: 'clearCellSelection' });

add({ key: 'clearSelection', category: 'selection', status: 'implemented',
  description: 'Clears row and cell selection.',
  templates: ['clear the selection', 'deselect everything', 'unselect all'],
  synonyms: ['deselect all'], followUpKey: 'selectAllCells' });

add({ key: 'selectAllCells', category: 'selection', status: 'implemented',
  description: 'Selects every cell in the grid.',
  templates: ['select all cells', 'select everything', 'highlight the entire grid'],
  synonyms: ['select everything'], followUpKey: 'copyAllCells' });

add({ key: 'selectAllRows', category: 'selection', status: 'planned',
  description: 'Selects every row (not just cells) in the grid.',
  templates: ['select all rows', 'check every row', 'select the entire table of rows'],
  synonyms: ['select all rows'], followUpKey: 'deselectAllRows' });

add({ key: 'deselectAllRows', category: 'selection', status: 'planned',
  description: 'Deselects every currently selected row.',
  templates: ['deselect all rows', 'uncheck every row', 'clear row selection only'],
  synonyms: ['deselect rows'], followUpKey: 'selectAllRows' });

add({ key: 'selectRowRange', category: 'selection', status: 'planned',
  description: 'Selects a contiguous range of rows.',
  slots: [slot('rowIndexFrom', 'rowIndex'), slot('rowIndexTo', 'rowIndex')],
  templates: ['select rows {rowIndexFrom} through {rowIndexTo}', 'select from row {rowIndexFrom} to row {rowIndexTo}'],
  params: (v) => ({ from: Number(v.rowIndexFrom), to: Number(v.rowIndexTo) }),
  synonyms: ['select row range'], followUpKey: 'clearSelection' });

add({ key: 'selectCellRange', category: 'selection', status: 'planned',
  description: 'Selects an explicit cell range.',
  slots: [slot('cellRange', 'cellRange')],
  templates: ['select the range {cellRange}', 'highlight cells {cellRange}'],
  params: (v) => ({ range: v.cellRange }),
  synonyms: ['select range'], followUpKey: 'clearCellSelection' });

add({ key: 'clearCellSelection', category: 'selection', status: 'planned',
  description: 'Clears only the cell range selection, leaving row selection intact.',
  templates: ['clear the cell selection', 'unselect the highlighted cells'],
  synonyms: ['clear cell selection'], followUpKey: 'selectCellRange' });

add({ key: 'setRowSelectionMode', category: 'selection', status: 'planned',
  description: 'Sets whether row selection allows single or multiple rows.',
  slots: [slot('rowSelectionMode', 'rowSelectionMode')],
  templates: ['set row selection to {rowSelectionMode}', 'allow {rowSelectionMode} row selection'],
  params: (v) => ({ mode: v.rowSelectionMode }),
  synonyms: ['selection mode'], followUpKey: 'selectAllRows' });

add({ key: 'invertSelection', category: 'selection', status: 'planned',
  description: 'Inverts which rows are currently selected.',
  templates: ['invert the selection', 'select everything that isn\'t selected', 'flip the current row selection'],
  synonyms: ['invert selection'], followUpKey: 'clearSelection' });

add({ key: 'selectionInfo', category: 'selection', status: 'implemented',
  description: 'Reports how many rows/cells are currently selected.',
  templates: ['how many rows are selected', 'what is currently selected', 'show me the selection summary'],
  synonyms: ['selection summary'], followUpKey: 'clearSelection' });

// ════════════════════════════════════════════════════════════════════════
// VIRTUALIZATION (planned)
// ════════════════════════════════════════════════════════════════════════
add({ key: 'enableRowVirtualization', category: 'virtualization', status: 'planned',
  description: 'Enables row virtualization for large datasets.',
  templates: ['turn on row virtualization', 'enable virtual scrolling for rows', 'virtualize the rows'],
  synonyms: ['virtual scrolling'], followUpKey: 'setRowBufferSize' });
add({ key: 'disableRowVirtualization', category: 'virtualization', status: 'planned',
  description: 'Disables row virtualization, rendering every row.',
  templates: ['turn off row virtualization', 'disable virtual scrolling', 'render every row without virtualization'],
  synonyms: ['disable virtual scroll'], followUpKey: 'enableRowVirtualization' });
add({ key: 'setRowBufferSize', category: 'virtualization', status: 'planned',
  description: 'Sets how many extra rows are pre-rendered outside the visible viewport.',
  slots: [slot('virtualizationBufferSize', 'virtualizationBufferSize')],
  templates: ['set the row buffer to {virtualizationBufferSize}', 'render {virtualizationBufferSize} extra rows off-screen'],
  params: (v) => ({ buffer: Number(v.virtualizationBufferSize) }),
  synonyms: ['row buffer'], followUpKey: 'enableRowVirtualization' });
add({ key: 'enableColumnVirtualization', category: 'virtualization', status: 'planned',
  description: 'Enables column virtualization for grids with many columns.',
  templates: ['turn on column virtualization', 'virtualize the columns too'],
  synonyms: ['column virtual scroll'], followUpKey: 'disableColumnVirtualization' });
add({ key: 'disableColumnVirtualization', category: 'virtualization', status: 'planned',
  description: 'Disables column virtualization, rendering every column.',
  templates: ['turn off column virtualization', 'render all columns without virtualization'],
  synonyms: ['disable column virtual'], followUpKey: 'enableColumnVirtualization' });
add({ key: 'virtualizationInfo', category: 'virtualization', status: 'planned',
  description: 'Reports current virtualization settings and estimated render load.',
  templates: ['is virtualization on', 'what are the virtualization settings', 'how many rows are actually rendered right now'],
  synonyms: ['virtualization state'], followUpKey: 'setRowBufferSize' });

// ════════════════════════════════════════════════════════════════════════
// TREE DATA (planned)
// ════════════════════════════════════════════════════════════════════════
add({ key: 'enableTreeData', category: 'tree-data', status: 'planned',
  description: 'Turns the grid into a hierarchical tree-data view.',
  templates: ['turn on tree data', 'enable hierarchical rows', 'show this as a tree'],
  synonyms: ['tree mode'], followUpKey: 'setTreeDataField' });
add({ key: 'disableTreeData', category: 'tree-data', status: 'planned',
  description: 'Turns off tree-data mode, returning to a flat row list.',
  templates: ['turn off tree data', 'disable hierarchical rows', 'flatten the tree back out'],
  synonyms: ['exit tree mode'], followUpKey: 'enableTreeData' });
add({ key: 'setTreeDataField', category: 'tree-data', status: 'planned',
  description: 'Sets which field describes each row\'s path in the tree.',
  slots: [slot('treeFieldName', 'treeFieldName')],
  templates: ['use {treeFieldName} as the tree path field', 'build the tree from {treeFieldName}'],
  params: (v) => ({ field: v.treeFieldName }),
  synonyms: ['tree path field'], followUpKey: 'enableTreeData' });
add({ key: 'expandTreeNode', category: 'tree-data', status: 'planned',
  description: 'Expands a specific tree node by row position.',
  slots: [slot('rowIndex', 'rowIndex')],
  templates: ['expand the tree node at row {rowIndex}', 'open the tree branch at row {rowIndex}'],
  params: (v) => ({ index: Number(v.rowIndex) }),
  synonyms: ['expand tree node'], followUpKey: 'collapseTreeNode' });
add({ key: 'collapseTreeNode', category: 'tree-data', status: 'planned',
  description: 'Collapses a specific tree node by row position.',
  slots: [slot('rowIndex', 'rowIndex')],
  templates: ['collapse the tree node at row {rowIndex}', 'close the tree branch at row {rowIndex}'],
  params: (v) => ({ index: Number(v.rowIndex) }),
  synonyms: ['collapse tree node'], followUpKey: 'expandTreeNode' });
add({ key: 'expandAllTreeNodes', category: 'tree-data', status: 'planned',
  description: 'Expands every node in the tree.',
  templates: ['expand the entire tree', 'open every tree branch', 'expand all tree nodes'],
  synonyms: ['expand all tree'], followUpKey: 'collapseAllTreeNodes' });
add({ key: 'collapseAllTreeNodes', category: 'tree-data', status: 'planned',
  description: 'Collapses every node in the tree.',
  templates: ['collapse the entire tree', 'close every tree branch', 'collapse all tree nodes'],
  synonyms: ['collapse all tree'], followUpKey: 'expandAllTreeNodes' });
add({ key: 'showTreeIndentGuides', category: 'tree-data', status: 'planned',
  description: 'Shows or hides the vertical indent guide lines in tree data.',
  templates: ['show the tree indent guides', 'hide the tree connector lines', 'toggle tree indentation lines'],
  synonyms: ['tree indent guides'], followUpKey: 'enableTreeData' });

// ════════════════════════════════════════════════════════════════════════
// PAGINATION (planned)
// ════════════════════════════════════════════════════════════════════════
add({ key: 'enablePagination', category: 'pagination', status: 'planned',
  description: 'Turns on pagination instead of infinite scroll.',
  templates: ['turn on pagination', 'paginate the grid', 'show rows in pages'],
  synonyms: ['paginate'], followUpKey: 'setPageSize' });
add({ key: 'disablePagination', category: 'pagination', status: 'planned',
  description: 'Turns off pagination, showing all rows in a scrollable list.',
  templates: ['turn off pagination', 'stop paginating', 'show all rows without paging'],
  synonyms: ['disable paging'], followUpKey: 'enablePagination' });
add({ key: 'setPageSize', category: 'pagination', status: 'planned',
  description: 'Sets how many rows appear per page.',
  slots: [slot('pageSize', 'pageSize')],
  templates: ['show {pageSize} rows per page', 'set the page size to {pageSize}', 'change rows per page to {pageSize}'],
  params: (v) => ({ size: Number(v.pageSize) }),
  synonyms: ['page size'], followUpKey: 'goToNextPage' });
add({ key: 'goToNextPage', category: 'pagination', status: 'planned',
  description: 'Advances to the next page of rows.',
  templates: ['go to the next page', 'next page please', 'show me more rows'],
  synonyms: ['next page'], followUpKey: 'goToPreviousPage' });
add({ key: 'goToPreviousPage', category: 'pagination', status: 'planned',
  description: 'Goes back to the previous page of rows.',
  templates: ['go to the previous page', 'go back a page', 'show the last page again'],
  synonyms: ['previous page'], followUpKey: 'goToNextPage' });
add({ key: 'goToFirstPage', category: 'pagination', status: 'planned',
  description: 'Jumps to the first page.',
  templates: ['go to the first page', 'jump to page one', 'take me to the start'],
  synonyms: ['first page'], followUpKey: 'goToLastPage' });
add({ key: 'goToLastPage', category: 'pagination', status: 'planned',
  description: 'Jumps to the last page.',
  templates: ['go to the last page', 'jump to the final page', 'take me to the end'],
  synonyms: ['last page'], followUpKey: 'goToFirstPage' });
add({ key: 'goToPageNumber', category: 'pagination', status: 'planned',
  description: 'Jumps directly to a specific page number.',
  slots: [slot('pageNumber', 'pageNumber')],
  templates: ['go to page {pageNumber}', 'jump to page number {pageNumber}', 'take me to page {pageNumber}'],
  params: (v) => ({ page: v.pageNumber }),
  synonyms: ['go to page'], followUpKey: 'goToNextPage' });
add({ key: 'showPaginationSummary', category: 'pagination', status: 'planned',
  description: 'Shows or hides the "showing X-Y of Z rows" summary text.',
  templates: ['show the pagination summary', 'hide the page count text', 'toggle the rows shown counter'],
  synonyms: ['pagination summary'], followUpKey: 'setPageSize' });
add({ key: 'paginationInfo', category: 'pagination', status: 'planned',
  description: 'Reports the current page number and page size.',
  templates: ['what page am i on', 'how many pages are there', 'show me the pagination state'],
  synonyms: ['pagination state'], followUpKey: 'goToPageNumber' });

// ════════════════════════════════════════════════════════════════════════
// THEMES
// ════════════════════════════════════════════════════════════════════════
add({ key: 'switchToDarkTheme', category: 'themes', status: 'planned', commandType: 'setTheme',
  description: 'Switches the grid to a dark theme.',
  templates: ['switch to dark mode', 'use the dark theme', 'turn on dark mode', 'make the grid dark'],
  params: () => ({ theme: 'dark' }),
  synonyms: ['dark mode'], followUpKey: 'switchToLightTheme' });
add({ key: 'switchToLightTheme', category: 'themes', status: 'planned', commandType: 'setTheme',
  description: 'Switches the grid to a light theme.',
  templates: ['switch to light mode', 'use the light theme', 'turn off dark mode', 'make the grid light'],
  params: () => ({ theme: 'light' }),
  synonyms: ['light mode'], followUpKey: 'switchToDarkTheme' });
add({ key: 'switchToCompactTheme', category: 'themes', status: 'planned', commandType: 'setTheme',
  description: 'Switches to a visually compact theme with tighter spacing.',
  templates: ['switch to compact mode', 'use a more compact theme', 'make the rows tighter'],
  params: () => ({ theme: 'compact' }),
  synonyms: ['compact theme'], followUpKey: 'switchToLightTheme' });
add({ key: 'switchToHighContrastTheme', category: 'themes', status: 'planned', commandType: 'setTheme',
  description: 'Switches to a high-contrast theme for readability/accessibility.',
  templates: ['switch to high contrast mode', 'use the high contrast theme', 'increase the color contrast'],
  params: () => ({ theme: 'high-contrast' }),
  synonyms: ['high contrast'], followUpKey: 'switchToLightTheme' });
add({ key: 'setThemeAccentColor', category: 'themes', status: 'planned',
  description: 'Sets the theme\'s primary accent color.',
  slots: [slot('color', 'color')],
  templates: ['make the accent color {color}', 'set the theme color to {color}', 'change the primary color to {color}'],
  params: (v) => ({ color: v.color }),
  synonyms: ['accent color'], followUpKey: 'resetThemeToDefault' });
add({ key: 'resetThemeToDefault', category: 'themes', status: 'planned',
  description: 'Resets the theme to its default settings.',
  templates: ['reset the theme', 'go back to the default theme', 'undo my theme changes'],
  synonyms: ['default theme'], followUpKey: 'switchToLightTheme' });
add({ key: 'listAvailableThemes', category: 'themes', status: 'planned',
  description: 'Lists the themes available to switch to.',
  templates: ['what themes are available', 'list the available themes', 'what color schemes can i use'],
  synonyms: ['available themes'], followUpKey: 'switchToDarkTheme' });
add({ key: 'currentThemeInfo', category: 'themes', status: 'planned',
  description: 'Reports which theme is currently active.',
  templates: ['what theme is active right now', 'which theme am i using', "what's the current theme"],
  synonyms: ['current theme'], followUpKey: 'listAvailableThemes' });

// ════════════════════════════════════════════════════════════════════════
// LAYOUTS
// ════════════════════════════════════════════════════════════════════════
add({ key: 'setRowHeight', category: 'layouts', status: 'planned',
  description: 'Sets the height of every row.',
  slots: [slot('rowHeight', 'rowHeight')],
  templates: ['set the row height to {rowHeight}', 'make rows {rowHeight} tall', 'change row height to {rowHeight}'],
  params: (v) => ({ height: v.rowHeight }),
  synonyms: ['row height'], followUpKey: 'setHeaderHeight' });
add({ key: 'setHeaderHeight', category: 'layouts', status: 'planned',
  description: 'Sets the height of the header row.',
  slots: [slot('headerHeight', 'headerHeight')],
  templates: ['set the header height to {headerHeight}', 'make the header {headerHeight} tall'],
  params: (v) => ({ height: v.headerHeight }),
  synonyms: ['header height'], followUpKey: 'setRowHeight' });
add({ key: 'setColumnWidth', category: 'layouts', status: 'planned',
  description: 'Sets a specific column\'s width.',
  slots: [col('column'), slot('columnWidth', 'columnWidth')],
  templates: ['set {column} width to {columnWidth}', 'make {column} {columnWidth} wide', 'resize {column} to {columnWidth}'],
  params: (v) => ({ colId: toColId(v.column), width: v.columnWidth }),
  synonyms: ['column width'], followUpKey: 'autoSizeColumn' });
add({ key: 'autoSizeColumn', category: 'layouts', status: 'planned',
  description: 'Automatically sizes a column to fit its contents.',
  slots: [col('column')],
  templates: ['autosize {column}', 'fit {column} to its content', 'auto fit the {column} column'],
  params: (v) => ({ colId: toColId(v.column) }),
  synonyms: ['auto fit column'], followUpKey: 'autoSizeAllColumns' });
add({ key: 'autoSizeAllColumns', category: 'layouts', status: 'planned',
  description: 'Automatically sizes every column to fit its contents.',
  templates: ['autosize all columns', 'fit every column to its content', 'auto fit all the columns'],
  synonyms: ['auto fit all'], followUpKey: 'resetColumnWidths' });
add({ key: 'resetColumnWidths', category: 'layouts', status: 'planned',
  description: 'Resets every column back to its default width.',
  templates: ['reset all column widths', 'undo my column resizing', 'go back to default column widths'],
  synonyms: ['reset widths'], followUpKey: 'autoSizeAllColumns' });
add({ key: 'switchToCompactLayout', category: 'layouts', status: 'planned',
  description: 'Switches the overall layout density to compact.',
  templates: ['switch to a compact layout', 'make everything more compact', 'use tighter spacing everywhere'],
  synonyms: ['compact layout'], followUpKey: 'switchToComfortableLayout' });
add({ key: 'switchToComfortableLayout', category: 'layouts', status: 'planned',
  description: 'Switches the overall layout density to comfortable/spacious.',
  templates: ['switch to a comfortable layout', 'give everything more breathing room', 'use a more spacious layout'],
  synonyms: ['comfortable layout'], followUpKey: 'switchToCompactLayout' });

// ════════════════════════════════════════════════════════════════════════
// KEYBOARD
// ════════════════════════════════════════════════════════════════════════
add({ key: 'listKeyboardShortcuts', category: 'keyboard', status: 'planned',
  description: 'Lists the grid\'s keyboard shortcuts.',
  templates: ['what keyboard shortcuts are there', 'list the keyboard shortcuts', 'show me the hotkeys'],
  synonyms: ['keyboard shortcuts', 'hotkeys'], followUpKey: 'enableKeyboardNavigation' });
add({ key: 'enableKeyboardNavigation', category: 'keyboard', status: 'planned',
  description: 'Enables arrow-key navigation between cells.',
  templates: ['turn on keyboard navigation', 'enable arrow key navigation', 'let me navigate with the keyboard'],
  synonyms: ['keyboard navigation'], followUpKey: 'disableKeyboardNavigation' });
add({ key: 'disableKeyboardNavigation', category: 'keyboard', status: 'planned',
  description: 'Disables keyboard navigation between cells.',
  templates: ['turn off keyboard navigation', 'disable arrow key navigation'],
  synonyms: ['disable keyboard nav'], followUpKey: 'enableKeyboardNavigation' });
add({ key: 'rebindShortcut', category: 'keyboard', status: 'planned',
  description: 'Rebinds a keyboard shortcut to a different key combination.',
  slots: [slot('keyboardShortcut', 'keyboardShortcut')],
  templates: ['rebind copy to {keyboardShortcut}', 'change the copy shortcut to {keyboardShortcut}', 'use {keyboardShortcut} for paste instead'],
  params: (v) => ({ shortcut: v.keyboardShortcut }),
  synonyms: ['rebind key'], followUpKey: 'listKeyboardShortcuts' });
add({ key: 'jumpToCellByKeyboard', category: 'keyboard', status: 'planned',
  description: 'Explains or performs jumping directly to a cell via keyboard.',
  slots: [col('column'), slot('rowIndex', 'rowIndex')],
  templates: ['jump to {column} row {rowIndex} with the keyboard', 'focus {column} at row {rowIndex}'],
  params: (v) => ({ colId: toColId(v.column), rowIndex: Number(v.rowIndex) }),
  synonyms: ['jump to cell'], followUpKey: 'enableKeyboardNavigation' });
add({ key: 'enableMultiSortModifierKey', category: 'keyboard', status: 'planned',
  description: 'Sets the modifier key used for adding a secondary sort via header click.',
  slots: [slot('keyboardModifier', 'keyboardModifier')],
  templates: ['use {keyboardModifier} click to multi sort', 'set the multi-sort modifier to {keyboardModifier}'],
  params: (v) => ({ modifier: v.keyboardModifier }),
  synonyms: ['multi-sort key'], followUpKey: 'listKeyboardShortcuts' });
add({ key: 'navigateToNextCell', category: 'keyboard', status: 'planned',
  description: 'Moves keyboard focus to the next cell.',
  templates: ['move to the next cell', 'go to the next cell', 'tab to the next cell'],
  synonyms: ['next cell'], followUpKey: 'navigateToPreviousCell' });
add({ key: 'navigateToPreviousCell', category: 'keyboard', status: 'planned',
  description: 'Moves keyboard focus to the previous cell.',
  templates: ['move to the previous cell', 'go back a cell', 'shift tab to the previous cell'],
  synonyms: ['previous cell'], followUpKey: 'navigateToNextCell' });

// ════════════════════════════════════════════════════════════════════════
// MOUSE
// ════════════════════════════════════════════════════════════════════════
add({ key: 'enableDragToReorderColumns', category: 'mouse', status: 'planned',
  description: 'Enables dragging column headers to reorder columns.',
  templates: ['let me drag columns to reorder them', 'enable column drag reordering', 'turn on drag to reorder columns'],
  synonyms: ['drag reorder'], followUpKey: 'disableDragToReorderColumns' });
add({ key: 'disableDragToReorderColumns', category: 'mouse', status: 'planned',
  description: 'Disables dragging column headers to reorder columns.',
  templates: ["don't let me drag columns around", 'disable column drag reordering', 'lock the column order'],
  synonyms: ['disable drag reorder'], followUpKey: 'enableDragToReorderColumns' });
add({ key: 'enableRangeSelectionByMouse', category: 'mouse', status: 'planned',
  description: 'Enables click-and-drag range selection with the mouse.',
  templates: ['let me select a range by dragging', 'enable mouse range selection', 'turn on drag to select cells'],
  synonyms: ['drag select'], followUpKey: 'disableRangeSelectionByMouse' });
add({ key: 'disableRangeSelectionByMouse', category: 'mouse', status: 'planned',
  description: 'Disables click-and-drag range selection.',
  templates: ["don't let me drag select cells", 'disable mouse range selection'],
  synonyms: ['disable drag select'], followUpKey: 'enableRangeSelectionByMouse' });
add({ key: 'setDoubleClickAction', category: 'mouse', status: 'planned',
  description: 'Sets what happens when a cell is double-clicked.',
  slots: [slot('mouseAction', 'mouseAction')],
  templates: ['make double click trigger {mouseAction}', 'set the double click action to {mouseAction}'],
  params: (v) => ({ action: v.mouseAction }),
  synonyms: ['double click action'], followUpKey: 'enableRangeSelectionByMouse' });
add({ key: 'enableRowDrag', category: 'mouse', status: 'planned',
  description: 'Enables dragging a row handle to reorder rows.',
  templates: ['let me drag rows to reorder them', 'enable row drag handles', 'turn on drag to reorder rows'],
  synonyms: ['row drag'], followUpKey: 'disableDragToReorderColumns' });
add({ key: 'disableRowDrag', category: 'mouse', status: 'planned',
  description: 'Disables row drag reordering.',
  templates: ["don't let me drag rows around", 'disable row drag handles'],
  synonyms: ['disable row drag'], followUpKey: 'enableRowDrag' });

// ════════════════════════════════════════════════════════════════════════
// CONTEXT MENUS
// ════════════════════════════════════════════════════════════════════════
add({ key: 'openContextMenuForCell', category: 'context-menus', status: 'planned',
  description: 'Opens the right-click context menu for a given cell.',
  slots: [col('column'), slot('rowIndex', 'rowIndex')],
  templates: ['open the context menu for {column} row {rowIndex}', 'right click {column} at row {rowIndex}'],
  params: (v) => ({ colId: toColId(v.column), rowIndex: Number(v.rowIndex) }),
  synonyms: ['open context menu'], followUpKey: 'listContextMenuItems' });
add({ key: 'addCustomContextMenuItem', category: 'context-menus', status: 'planned',
  description: 'Adds a custom item to the right-click context menu.',
  slots: [slot('contextMenuItem', 'contextMenuItem')],
  templates: ['add a "{contextMenuItem}" item to the context menu', 'add {contextMenuItem} to the right click menu'],
  params: (v) => ({ label: v.contextMenuItem }),
  synonyms: ['add context menu item'], followUpKey: 'removeContextMenuItem' });
add({ key: 'removeContextMenuItem', category: 'context-menus', status: 'planned',
  description: 'Removes an item from the right-click context menu.',
  slots: [slot('contextMenuItem', 'contextMenuItem')],
  templates: ['remove "{contextMenuItem}" from the context menu', 'take {contextMenuItem} out of the right click menu'],
  params: (v) => ({ label: v.contextMenuItem }),
  synonyms: ['remove context menu item'], followUpKey: 'addCustomContextMenuItem' });
add({ key: 'disableContextMenu', category: 'context-menus', status: 'planned',
  description: 'Disables the right-click context menu entirely.',
  templates: ['disable the right click menu', 'turn off the context menu', "don't show a context menu"],
  synonyms: ['disable context menu'], followUpKey: 'enableContextMenu' });
add({ key: 'enableContextMenu', category: 'context-menus', status: 'planned',
  description: 'Re-enables the right-click context menu.',
  templates: ['enable the right click menu', 'turn the context menu back on'],
  synonyms: ['enable context menu'], followUpKey: 'disableContextMenu' });
add({ key: 'listContextMenuItems', category: 'context-menus', status: 'planned',
  description: 'Lists the items currently in the right-click context menu.',
  templates: ['what is in the context menu', 'list the right click menu items', 'show me the context menu options'],
  synonyms: ['context menu items'], followUpKey: 'addCustomContextMenuItem' });

// ════════════════════════════════════════════════════════════════════════
// TOOL PANELS
// ════════════════════════════════════════════════════════════════════════
add({ key: 'openColumnsToolPanel', category: 'tool-panels', status: 'planned',
  description: 'Opens the Columns tool panel sidebar.',
  templates: ['open the columns panel', 'show the column chooser', 'open the columns tool panel'],
  synonyms: ['column chooser'], followUpKey: 'closeColumnsToolPanel' });
add({ key: 'closeColumnsToolPanel', category: 'tool-panels', status: 'planned',
  description: 'Closes the Columns tool panel sidebar.',
  templates: ['close the columns panel', 'hide the column chooser', 'close the columns tool panel'],
  synonyms: ['close column chooser'], followUpKey: 'openColumnsToolPanel' });
add({ key: 'openFiltersToolPanel', category: 'tool-panels', status: 'planned',
  description: 'Opens the Filters tool panel sidebar.',
  templates: ['open the filters panel', 'show the filter sidebar', 'open the filters tool panel'],
  synonyms: ['filter panel'], followUpKey: 'closeFiltersToolPanel' });
add({ key: 'closeFiltersToolPanel', category: 'tool-panels', status: 'planned',
  description: 'Closes the Filters tool panel sidebar.',
  templates: ['close the filters panel', 'hide the filter sidebar'],
  synonyms: ['close filter panel'], followUpKey: 'openFiltersToolPanel' });
add({ key: 'toggleToolPanel', category: 'tool-panels', status: 'planned',
  description: 'Shows or hides a named tool panel.',
  slots: [slot('toolPanelName', 'toolPanelName')],
  templates: ['toggle the {toolPanelName} panel', 'open the {toolPanelName} tool panel', 'close the {toolPanelName} panel'],
  params: (v) => ({ panel: v.toolPanelName }),
  synonyms: ['toggle tool panel'], followUpKey: 'pinToolPanelToSide' });
add({ key: 'pinToolPanelToSide', category: 'tool-panels', status: 'planned',
  description: 'Docks the tool panel sidebar to the left or right edge.',
  slots: [slot('sideBarPosition', 'sideBarPosition')],
  templates: ['move the tool panel to the {sideBarPosition}', 'dock the sidebar on the {sideBarPosition}'],
  params: (v) => ({ side: v.sideBarPosition }),
  synonyms: ['dock sidebar'], followUpKey: 'toggleToolPanel' });
add({ key: 'openChartsToolPanel', category: 'tool-panels', status: 'planned',
  description: 'Opens the Charts tool panel sidebar.',
  templates: ['open the charts panel', 'show the chart tool panel'],
  synonyms: ['charts panel'], followUpKey: 'createBarChart' });
add({ key: 'openPivotToolPanel', category: 'tool-panels', status: 'planned',
  description: 'Opens the Pivot tool panel sidebar.',
  templates: ['open the pivot panel', 'show the pivot tool panel'],
  synonyms: ['pivot panel'], followUpKey: 'enablePivotMode' });

// ════════════════════════════════════════════════════════════════════════
// STATUS BAR
// ════════════════════════════════════════════════════════════════════════
add({ key: 'showRowCountInStatusBar', category: 'status-bar', status: 'planned',
  description: 'Shows the row count segment in the status bar.',
  templates: ['show row count in the status bar', 'add a row count segment to the status bar'],
  synonyms: ['status bar row count'], followUpKey: 'hideRowCountInStatusBar' });
add({ key: 'hideRowCountInStatusBar', category: 'status-bar', status: 'planned',
  description: 'Hides the row count segment in the status bar.',
  templates: ['hide the row count in the status bar', 'remove the row count segment'],
  synonyms: ['hide status bar row count'], followUpKey: 'showRowCountInStatusBar' });
add({ key: 'showSelectionSummaryInStatusBar', category: 'status-bar', status: 'planned',
  description: 'Shows a selection summary segment in the status bar.',
  templates: ['show selection summary in the status bar', 'add a selected count to the status bar'],
  synonyms: ['status bar selection'], followUpKey: 'showAggregationSummaryInStatusBar' });
add({ key: 'showAggregationSummaryInStatusBar', category: 'status-bar', status: 'planned',
  description: 'Shows sum/avg/count aggregation of the selection in the status bar.',
  templates: ['show sum and average in the status bar', 'add an aggregation summary to the status bar'],
  synonyms: ['status bar aggregation'], followUpKey: 'customizeStatusBarSegments' });
add({ key: 'customizeStatusBarSegments', category: 'status-bar', status: 'planned',
  description: 'Sets which segments appear in the status bar.',
  slots: [slot('statusBarSegment', 'statusBarSegment')],
  templates: ['add {statusBarSegment} to the status bar', 'show {statusBarSegment} in the status bar'],
  params: (v) => ({ segment: v.statusBarSegment }),
  synonyms: ['status bar segments'], followUpKey: 'statusBarInfo' });
add({ key: 'statusBarInfo', category: 'status-bar', status: 'planned',
  description: 'Reports what\'s currently shown in the status bar.',
  templates: ['what is shown in the status bar', 'list the status bar segments'],
  synonyms: ['status bar state'], followUpKey: 'customizeStatusBarSegments' });

// ════════════════════════════════════════════════════════════════════════
// AI PANEL
// ════════════════════════════════════════════════════════════════════════
add({ key: 'openAIPanel', category: 'ai-panel', status: 'implemented',
  description: 'Opens the Photon AI side panel.',
  templates: ['open photon ai', 'open the ai panel', 'show the ai assistant', 'bring up photon ai'],
  synonyms: ['open ai assistant'], followUpKey: 'closeAIPanel' });
add({ key: 'closeAIPanel', category: 'ai-panel', status: 'implemented',
  description: 'Closes the Photon AI side panel.',
  templates: ['close photon ai', 'close the ai panel', 'hide the ai assistant', 'dismiss the ai panel'],
  synonyms: ['close ai assistant'], followUpKey: 'openAIPanel' });
add({ key: 'clearAIChatHistory', category: 'ai-panel', status: 'planned',
  description: 'Clears the conversation history shown in the AI panel.',
  templates: ['clear the chat history', 'wipe the ai conversation', 'start a new ai chat'],
  synonyms: ['clear chat'], followUpKey: 'openAIPanel' });
add({ key: 'listAICapabilities', category: 'ai-panel', status: 'implemented', commandType: 'help',
  description: 'Lists every command Photon AI understands.',
  templates: ['help', 'what can you do', 'list your commands', 'what do you understand'],
  synonyms: ['help', 'capabilities'], followUpKey: 'greetAI' });
add({ key: 'repeatLastAICommand', category: 'ai-panel', status: 'planned',
  description: 'Repeats the last successfully executed AI command.',
  templates: ['do that again', 'repeat the last command', 'run that one more time'],
  synonyms: ['repeat command'], followUpKey: 'undoLastAICommand' });
add({ key: 'undoLastAICommand', category: 'ai-panel', status: 'planned',
  description: 'Undoes the most recent action Photon AI performed.',
  templates: ['undo what you just did', 'undo the last ai command', 'revert your last change'],
  synonyms: ['undo ai command'], followUpKey: 'repeatLastAICommand' });
add({ key: 'greetAI', category: 'ai-panel', status: 'implemented',
  description: 'A conversational greeting with no command content.',
  templates: ['hi', 'hello', 'hey', 'hey there', 'good morning'],
  synonyms: ['hello', 'hey'], followUpKey: 'listAICapabilities' });
add({ key: 'thankAI', category: 'ai-panel', status: 'implemented',
  description: 'A conversational thanks with no command content.',
  templates: ['thanks', 'thank you', 'thanks a lot', 'appreciate it'],
  synonyms: ['thank you'], followUpKey: 'greetAI' });

// ════════════════════════════════════════════════════════════════════════
// DEVELOPER API (planned / documentation Q&A)
// ════════════════════════════════════════════════════════════════════════
add({ key: 'howToRegisterCustomCommand', category: 'developer-api', status: 'planned',
  description: 'Explains how to register a custom Photon AI intent at runtime.',
  templates: ['how do i register a custom ai command', 'how can i add my own photon ai intent', 'how do i extend the ai command registry'],
  synonyms: ['register custom command'], followUpKey: 'howToExtendPhotonAI' });
add({ key: 'howToSubscribeToGridEvent', category: 'developer-api', status: 'planned',
  description: 'Explains how to subscribe to a grid event via the API.',
  slots: [slot('gridEventName', 'gridEventName')],
  templates: ['how do i listen for {gridEventName}', 'how can i subscribe to the {gridEventName} event'],
  params: (v) => ({ event: v.gridEventName }),
  synonyms: ['subscribe to event'], followUpKey: 'listAvailableApiMethods' });
add({ key: 'howToGetColumnApi', category: 'developer-api', status: 'planned',
  description: 'Explains how to get a reference to the column API.',
  templates: ['how do i get the column api', 'how can i access column definitions programmatically'],
  synonyms: ['column api'], followUpKey: 'howToSetGridState' });
add({ key: 'howToSetGridState', category: 'developer-api', status: 'planned',
  description: 'Explains how to serialize/restore grid state via the API.',
  templates: ['how do i save and restore grid state', 'how can i persist the column layout', 'how do i set the grid state programmatically'],
  synonyms: ['grid state api'], followUpKey: 'saveGridState' });
add({ key: 'howToExportColumnDefs', category: 'developer-api', status: 'planned',
  description: 'Explains how to export the current column definitions as code/JSON.',
  templates: ['how do i export the column definitions', 'how can i get the current columndefs as json'],
  synonyms: ['export column defs'], followUpKey: 'howToGetColumnApi' });
add({ key: 'howToAddCustomRenderer', category: 'developer-api', status: 'planned',
  description: 'Explains how to add a custom cell renderer to a column.',
  slots: [col('column')],
  templates: ['how do i add a custom renderer to {column}', 'how can i customize how {column} displays'],
  params: (v) => ({ colId: toColId(v.column) }),
  synonyms: ['custom renderer'], followUpKey: 'howToAddCustomEditor' });
add({ key: 'howToAddCustomEditor', category: 'developer-api', status: 'planned',
  description: 'Explains how to add a custom cell editor to a column.',
  slots: [col('column')],
  templates: ['how do i add a custom editor to {column}', 'how can i customize editing for {column}'],
  params: (v) => ({ colId: toColId(v.column) }),
  synonyms: ['custom editor'], followUpKey: 'howToAddCustomRenderer' });
add({ key: 'howToAccessRowNode', category: 'developer-api', status: 'planned',
  description: 'Explains how to get a row node reference from the API.',
  templates: ['how do i get a row node by id', 'how can i access a specific row programmatically'],
  synonyms: ['row node api'], followUpKey: 'howToGetColumnApi' });
add({ key: 'listAvailableApiMethods', category: 'developer-api', status: 'planned',
  description: 'Lists notable GridApi methods available to developers.',
  slots: [slot('apiMethodName', 'apiMethodName')],
  templates: ['what does {apiMethodName} do', 'list the available grid api methods', 'show me the public api surface'],
  params: (v) => ({ method: v.apiMethodName }),
  synonyms: ['api methods'], followUpKey: 'howToSubscribeToGridEvent' });
add({ key: 'howToExtendPhotonAI', category: 'developer-api', status: 'planned',
  description: 'Explains how a host application can extend Photon AI with custom intents.',
  templates: ["how do i extend photon ai", 'how can i add my own natural language commands', 'how do i plug into the ai command pipeline'],
  synonyms: ['extend photon ai'], followUpKey: 'howToRegisterCustomCommand' });

// ════════════════════════════════════════════════════════════════════════
// STATE MANAGEMENT (planned)
// ════════════════════════════════════════════════════════════════════════
add({ key: 'saveGridState', category: 'state-management', status: 'planned',
  description: 'Saves the current grid state (columns, sort, filter, group) for later restoration.',
  templates: ['save the current grid layout', 'remember this grid state', 'save my column setup'],
  synonyms: ['save layout'], followUpKey: 'loadGridState' });
add({ key: 'loadGridState', category: 'state-management', status: 'planned',
  description: 'Restores a previously saved grid state.',
  templates: ['load my saved grid layout', 'restore the saved state', 'bring back my saved setup'],
  synonyms: ['restore layout'], followUpKey: 'resetGridStateToDefault' });
add({ key: 'resetGridStateToDefault', category: 'state-management', status: 'planned',
  description: 'Resets the grid back to its default state.',
  templates: ['reset the grid to default', 'undo all my layout changes', 'go back to the original setup'],
  synonyms: ['reset state'], followUpKey: 'saveGridState' });
add({ key: 'exportGridStateAsJson', category: 'state-management', status: 'planned',
  description: 'Exports the grid\'s serialized state as JSON.',
  templates: ['export the grid state as json', 'give me the state as a json blob', 'download the current layout as json'],
  synonyms: ['export state json'], followUpKey: 'importGridStateFromJson' });
add({ key: 'importGridStateFromJson', category: 'state-management', status: 'planned',
  description: 'Imports a grid state from a JSON blob.',
  templates: ['import this grid state json', 'load the layout from this json', 'apply this saved state json'],
  synonyms: ['import state json'], followUpKey: 'loadGridState' });
add({ key: 'getStateKeyValue', category: 'state-management', status: 'planned',
  description: 'Reports the current value of a specific piece of grid state.',
  slots: [slot('stateKeyName', 'stateKeyName')],
  templates: ['what is the current {stateKeyName}', 'show me the {stateKeyName}'],
  params: (v) => ({ key: v.stateKeyName }),
  synonyms: ['state key'], followUpKey: 'saveGridState' });
add({ key: 'clearSavedState', category: 'state-management', status: 'planned',
  description: 'Deletes any previously saved grid state.',
  templates: ['clear the saved grid state', 'forget my saved layout', 'delete the saved state'],
  synonyms: ['clear saved state'], followUpKey: 'saveGridState' });
add({ key: 'autoSaveStateToggle', category: 'state-management', status: 'planned',
  description: 'Turns automatic state saving on or off.',
  templates: ['turn on auto save for the layout', 'disable auto saving state', 'toggle auto save'],
  synonyms: ['auto save'], followUpKey: 'saveGridState' });

// ════════════════════════════════════════════════════════════════════════
// PERFORMANCE (planned)
// ════════════════════════════════════════════════════════════════════════
add({ key: 'measureRenderPerformance', category: 'performance', status: 'planned',
  description: 'Reports render-time performance metrics.',
  slots: [slot('performanceMetric', 'performanceMetric')],
  templates: ['what is the current {performanceMetric}', 'measure the {performanceMetric}', 'show me {performanceMetric} stats'],
  params: (v) => ({ metric: v.performanceMetric }),
  synonyms: ['performance metrics'], followUpKey: 'diagnoseSlowScrolling' });
add({ key: 'reduceRowHeightForPerformance', category: 'performance', status: 'planned',
  description: 'Suggests/applies a smaller row height to improve render performance.',
  templates: ['make rows shorter for better performance', 'reduce row height to speed things up'],
  synonyms: ['reduce row height'], followUpKey: 'enableFastCellUpdates' });
add({ key: 'enableFastCellUpdates', category: 'performance', status: 'planned',
  description: 'Enables a fast-path for single-cell value updates instead of a full re-render.',
  templates: ['turn on fast cell updates', 'enable fast cell refresh mode'],
  synonyms: ['fast cell updates'], followUpKey: 'setChangeDetectionStrategy' });
add({ key: 'setChangeDetectionStrategy', category: 'performance', status: 'planned',
  description: 'Sets how aggressively the grid diffs data changes before re-rendering.',
  templates: ['use a lighter change detection strategy', 'set change detection to identity comparison'],
  synonyms: ['change detection'], followUpKey: 'enableFastCellUpdates' });
add({ key: 'diagnoseSlowScrolling', category: 'performance', status: 'planned',
  description: 'Diagnoses why scrolling feels slow or janky.',
  templates: ['why is scrolling so slow', 'the grid is laggy when i scroll', 'scrolling feels janky, what should i check'],
  synonyms: ['slow scrolling'], followUpKey: 'enableRowVirtualization' });
add({ key: 'reportHighMemoryUsage', category: 'performance', status: 'planned',
  description: 'Diagnoses unexpectedly high memory usage.',
  templates: ['the grid is using too much memory', 'why is memory usage so high', 'memory keeps growing, what should i check'],
  synonyms: ['high memory usage'], followUpKey: 'measureRenderPerformance' });
add({ key: 'enableWebWorkerFiltering', category: 'performance', status: 'planned',
  description: 'Offloads filtering computation to a web worker thread.',
  templates: ['run filtering in a web worker', 'offload filtering off the main thread', 'enable background filtering'],
  synonyms: ['web worker filtering'], followUpKey: 'setChangeDetectionStrategy' });
add({ key: 'throttleScrollEvents', category: 'performance', status: 'planned',
  description: 'Sets a throttle interval on scroll event handling.',
  slots: [slot('throttleMs', 'throttleMs')],
  templates: ['throttle scroll events to {throttleMs}', 'limit scroll handling to every {throttleMs}'],
  params: (v) => ({ throttleMs: v.throttleMs }),
  synonyms: ['throttle scroll'], followUpKey: 'diagnoseSlowScrolling' });

// ════════════════════════════════════════════════════════════════════════
// ACCESSIBILITY (planned)
// ════════════════════════════════════════════════════════════════════════
add({ key: 'enableScreenReaderMode', category: 'accessibility', status: 'planned',
  description: 'Optimizes the grid\'s markup/ARIA attributes for screen readers.',
  templates: ['turn on screen reader mode', 'optimize this for a screen reader', 'enable screen reader support'],
  synonyms: ['screen reader mode'], followUpKey: 'announceRowSelectionAriaLive' });
add({ key: 'increaseFontSizeForAccessibility', category: 'accessibility', status: 'planned',
  description: 'Increases the grid\'s font size for readability.',
  slots: [slot('fontSize', 'fontSize')],
  templates: ['increase the font size to {fontSize}', 'make the text bigger, like {fontSize}'],
  params: (v) => ({ fontSize: v.fontSize }),
  synonyms: ['increase font size'], followUpKey: 'enableHighContrastTheme' });
add({ key: 'enableHighContrastTheme', category: 'accessibility', status: 'planned',
  description: 'Switches to a high-contrast color theme for accessibility.',
  templates: ['turn on high contrast for accessibility', 'increase contrast for low vision', 'enable an accessible high contrast theme'],
  synonyms: ['accessible contrast'], followUpKey: 'enableKeyboardOnlyNavigation' });
add({ key: 'enableKeyboardOnlyNavigation', category: 'accessibility', status: 'planned',
  description: 'Ensures every feature is reachable without a mouse.',
  templates: ['make the grid fully keyboard operable', 'enable keyboard-only navigation', 'i need to use this without a mouse'],
  synonyms: ['keyboard only'], followUpKey: 'setAriaRoleDescriptions' });
add({ key: 'announceRowSelectionAriaLive', category: 'accessibility', status: 'planned',
  description: 'Announces row selection changes via an ARIA live region.',
  templates: ['announce row selection changes', 'read out loud when a row is selected', 'enable aria live announcements for selection'],
  synonyms: ['aria live selection'], followUpKey: 'enableScreenReaderMode' });
add({ key: 'setAriaRoleDescriptions', category: 'accessibility', status: 'planned',
  description: 'Sets custom ARIA role descriptions for grid elements.',
  slots: [slot('ariaRole', 'ariaRole')],
  templates: ['set the aria role for cells to {ariaRole}', 'customize the {ariaRole} aria description'],
  params: (v) => ({ role: v.ariaRole }),
  synonyms: ['aria role'], followUpKey: 'enableScreenReaderMode' });
add({ key: 'enableFocusIndicators', category: 'accessibility', status: 'planned',
  description: 'Shows a visible focus outline when navigating by keyboard.',
  templates: ['show a focus outline on the active cell', 'enable visible focus indicators', 'make keyboard focus more visible'],
  synonyms: ['focus indicator'], followUpKey: 'enableKeyboardOnlyNavigation' });
add({ key: 'accessibilityInfo', category: 'accessibility', status: 'planned',
  description: 'Reports which accessibility features are currently enabled.',
  slots: [slot('accessibilityFeature', 'accessibilityFeature')],
  templates: ['is {accessibilityFeature} turned on', 'what accessibility features are active', 'list the enabled accessibility settings'],
  params: (v) => ({ feature: v.accessibilityFeature }),
  synonyms: ['accessibility state'], followUpKey: 'enableScreenReaderMode' });

// ════════════════════════════════════════════════════════════════════════
// TROUBLESHOOTING (planned diagnostics)
// ════════════════════════════════════════════════════════════════════════
function troubleIntent(key, phrase, followUpKey) {
  add({ key, category: 'troubleshooting', status: 'planned', commandType: 'diagnose',
    description: `Helps diagnose: ${phrase}.`,
    templates: [phrase, `why ${phrase.replace(/^my |^the /i, '')}`, `help, ${phrase}`, `${phrase}, what do i check`],
    params: () => ({ symptom: phrase }),
    synonyms: [phrase], followUpKey });
}
troubleIntent('reportColumnNotSortable', "a column isn't sortable", 'reportFilterNotApplying');
troubleIntent('reportFilterNotApplying', "my filter isn't applying", 'reportDataNotLoading');
troubleIntent('reportDataNotLoading', "the data isn't loading", 'reportGridFrozen');
troubleIntent('reportGridFrozen', 'the grid appears frozen', 'diagnoseSlowScrolling');
troubleIntent('reportExportFailing', 'my export keeps failing', 'reportChartNotRendering');
troubleIntent('reportChartNotRendering', "the chart won't render", 'reportGroupingNotWorking');
troubleIntent('reportGroupingNotWorking', "grouping isn't doing anything", 'reportColumnNotSortable');
troubleIntent('reportStyleNotApplying', "my custom styles aren't applying", 'reportAICommandNotUnderstood');
troubleIntent('reportAICommandNotUnderstood', "photon ai doesn't understand my command", 'listAICapabilities');
troubleIntent('reportRowsMissingAfterFilter', 'rows disappeared after i filtered', 'reportFilterNotApplying');

// ════════════════════════════════════════════════════════════════════════
// COLUMNS
// ════════════════════════════════════════════════════════════════════════
add({ key: 'hideColumn', category: 'columns', status: 'implemented',
  description: 'Hides a column.',
  verbs: ['hide'], slots: [col('column')],
  templates: ['{verb} {column}', '{verb} the {column} column', 'get rid of {column} for now', 'i don\'t need to see {column}'],
  params: (v) => ({ colId: toColId(v.column) }),
  synonyms: ['remove from view'], followUpKey: 'showColumn' });
add({ key: 'showColumn', category: 'columns', status: 'implemented',
  description: 'Shows a previously hidden column.',
  verbs: ['show', 'unhide'], slots: [col('column')],
  templates: ['{verb} {column}', '{verb} the {column} column', 'bring back {column}', 'i need to see {column} again'],
  params: (v) => ({ colId: toColId(v.column) }),
  synonyms: ['unhide'], followUpKey: 'hideColumn' });
add({ key: 'hideAllColumns', category: 'columns', status: 'implemented',
  description: 'Hides every column in the grid.',
  templates: ['hide all columns', 'hide every column', 'hide everything'],
  synonyms: ['hide everything'], followUpKey: 'showAllColumns' });
add({ key: 'showAllColumns', category: 'columns', status: 'implemented',
  description: 'Shows every column in the grid.',
  templates: ['show all columns', 'show every column', 'unhide everything'],
  synonyms: ['show everything'], followUpKey: 'hideAllColumns' });
add({ key: 'pinLeft', category: 'columns', status: 'implemented',
  description: 'Pins a column to the left side of the grid.',
  verbs: ['pin', 'freeze'], slots: [col('column')],
  templates: ['{verb} {column} left', '{verb} {column} to the left', '{verb} the {column} column on the left side'],
  params: (v) => ({ colIds: [toColId(v.column)], side: 'left' }),
  synonyms: ['freeze left'], followUpKey: 'pinRight' });
add({ key: 'pinRight', category: 'columns', status: 'implemented',
  description: 'Pins a column to the right side of the grid.',
  verbs: ['pin', 'freeze'], slots: [col('column')],
  templates: ['{verb} {column} right', '{verb} {column} to the right', '{verb} the {column} column on the right side'],
  params: (v) => ({ colIds: [toColId(v.column)], side: 'right' }),
  synonyms: ['freeze right'], followUpKey: 'unpin' });
add({ key: 'unpin', category: 'columns', status: 'implemented',
  description: 'Unpins a column.',
  verbs: ['unpin'], slots: [col('column')],
  templates: ['{verb} {column}', '{verb} the {column} column', 'remove the pin from {column}'],
  params: (v) => ({ colIds: [toColId(v.column)], side: null }),
  synonyms: ['remove pin'], followUpKey: 'pinLeft' });
add({ key: 'unpinAll', category: 'columns', status: 'implemented',
  description: 'Unpins every column in the grid.',
  templates: ['unpin all columns', 'unpin everything', 'clear all pins'],
  synonyms: ['clear pins'], followUpKey: 'pinLeft' });
add({ key: 'pinHalf', category: 'columns', status: 'implemented',
  description: 'Splits the columns in half and pins each half to a side.',
  slots: [slot('pinSide', 'pinSide')],
  templates: ['pin half the columns to the {pinSide}', 'pin half to the left and half to the right'],
  params: (v) => ({ sides: [v.pinSide] }),
  synonyms: ['pin half'], followUpKey: 'unpinAll' });
add({ key: 'moveColumnToStart', category: 'columns', status: 'implemented',
  description: 'Moves a column to the leftmost position.',
  slots: [col('column')],
  templates: ['move {column} to the start', 'move {column} to the beginning', 'move {column} to the front', 'make {column} the first column'],
  params: (v) => ({ colId: toColId(v.column) }),
  synonyms: ['move to front'], followUpKey: 'moveColumnToEnd' });
add({ key: 'moveColumnToEnd', category: 'columns', status: 'implemented',
  description: 'Moves a column to the rightmost position.',
  slots: [col('column')],
  templates: ['move {column} to the end', 'move {column} to the last position', 'make {column} the last column'],
  params: (v) => ({ colId: toColId(v.column) }),
  synonyms: ['move to back'], followUpKey: 'moveColumnToStart' });
add({ key: 'moveColumnLeft', category: 'columns', status: 'planned',
  description: 'Moves a column one position to the left.',
  slots: [col('column')],
  templates: ['move {column} one to the left', 'shift {column} left by one', 'nudge {column} left'],
  params: (v) => ({ colId: toColId(v.column), by: -1 }),
  synonyms: ['shift left'], followUpKey: 'moveColumnRight' });
add({ key: 'moveColumnRight', category: 'columns', status: 'planned',
  description: 'Moves a column one position to the right.',
  slots: [col('column')],
  templates: ['move {column} one to the right', 'shift {column} right by one', 'nudge {column} right'],
  params: (v) => ({ colId: toColId(v.column), by: 1 }),
  synonyms: ['shift right'], followUpKey: 'moveColumnLeft' });
add({ key: 'moveColumnToPosition', category: 'columns', status: 'planned',
  description: 'Moves a column to a specific index/position.',
  slots: [col('column'), slot('columnPosition', 'columnPosition')],
  templates: ['move {column} to {columnPosition}', 'put {column} at {columnPosition}'],
  params: (v) => ({ colId: toColId(v.column), position: v.columnPosition }),
  synonyms: ['move to position'], followUpKey: 'moveColumnToStart' });
add({ key: 'lockColumn', category: 'columns', status: 'planned',
  description: 'Locks a column so its position/pin state can\'t be changed by drag.',
  slots: [col('column')],
  templates: ['lock {column} in place', 'lock the {column} column', "don't let {column} be moved"],
  params: (v) => ({ colId: toColId(v.column), locked: true }),
  synonyms: ['lock column'], followUpKey: 'unlockColumn' });
add({ key: 'unlockColumn', category: 'columns', status: 'planned',
  description: 'Unlocks a previously locked column.',
  slots: [col('column')],
  templates: ['unlock {column}', 'let {column} be moved again', 'remove the lock on {column}'],
  params: (v) => ({ colId: toColId(v.column), locked: false }),
  synonyms: ['unlock column'], followUpKey: 'lockColumn' });
add({ key: 'renameColumnHeader', category: 'columns', status: 'planned',
  description: 'Changes a column\'s displayed header text.',
  slots: [col('column'), slot('columnAlias', 'columnAlias')],
  templates: ['rename {column} to {columnAlias}', 'call the {column} column {columnAlias} instead', 'change {column}\'s header to {columnAlias}'],
  params: (v) => ({ colId: toColId(v.column), header: v.columnAlias }),
  synonyms: ['rename column'], followUpKey: 'setColumnTooltip' });
add({ key: 'setColumnDataType', category: 'columns', status: 'planned',
  description: 'Changes a column\'s declared data type.',
  slots: [col('column'), slot('columnDataType', 'columnDataType')],
  templates: ['make {column} a {columnDataType} column', 'set {column}\'s type to {columnDataType}'],
  params: (v) => ({ colId: toColId(v.column), type: v.columnDataType }),
  synonyms: ['column data type'], followUpKey: 'setColumnEditorType' });
add({ key: 'setColumnTooltip', category: 'columns', status: 'planned',
  description: 'Sets a header tooltip for a column.',
  slots: [col('column'), slot('tooltipText', 'tooltipText')],
  templates: ['set {column}\'s tooltip to {tooltipText}', 'add a tooltip "{tooltipText}" to {column}'],
  params: (v) => ({ colId: toColId(v.column), tooltip: v.tooltipText }),
  synonyms: ['column tooltip'], followUpKey: 'renameColumnHeader' });
add({ key: 'resetColumnState', category: 'columns', status: 'planned',
  description: 'Resets every column back to its original defined state.',
  templates: ['reset all columns', 'undo all my column changes', 'restore the default columns'],
  synonyms: ['reset columns'], followUpKey: 'resetColumnWidths' });
add({ key: 'hiddenColumnsInfo', category: 'columns', status: 'implemented',
  description: 'Lists which columns are currently hidden.',
  templates: ['which columns are hidden', 'what columns are hidden right now', 'list the hidden columns'],
  synonyms: ['hidden columns'], followUpKey: 'showAllColumns' });
add({ key: 'columnCount', category: 'columns', status: 'implemented',
  description: 'Reports how many columns the grid has.',
  templates: ['how many columns are there', 'what is the column count', 'count the columns'],
  synonyms: ['column count'], followUpKey: 'hiddenColumnsInfo' });
add({ key: 'pinInfo', category: 'columns', status: 'implemented',
  description: 'Lists which columns are pinned left/right.',
  templates: ['which columns are pinned', 'what is pinned right now', 'show me the pinned columns'],
  synonyms: ['pinned columns'], followUpKey: 'unpinAll' });

// ════════════════════════════════════════════════════════════════════════
// ROWS
// ════════════════════════════════════════════════════════════════════════
add({ key: 'rowCount', category: 'rows', status: 'implemented',
  description: 'Reports how many rows the grid has.',
  templates: ['how many rows are there', 'what is the row count', 'count the rows', 'how many records do we have'],
  synonyms: ['row count'], followUpKey: 'selectionInfo' });
add({ key: 'addNewRowTop', category: 'rows', status: 'planned', commandType: 'addNewRow',
  description: 'Adds a new row at the top of the grid.',
  templates: ['add a new row at the top', 'insert a row above everything', 'add a row to the beginning'],
  params: () => ({ position: 'top' }),
  synonyms: ['add row top'], followUpKey: 'addNewRowBottom' });
add({ key: 'addNewRowBottom', category: 'rows', status: 'planned', commandType: 'addNewRow',
  description: 'Adds a new row at the bottom of the grid.',
  templates: ['add a new row at the bottom', 'insert a row at the end', 'append a new row'],
  params: () => ({ position: 'bottom' }),
  synonyms: ['add row bottom'], followUpKey: 'deleteRow' });
add({ key: 'pinRowTop', category: 'rows', status: 'planned',
  description: 'Pins a specific row to the top of the grid, above scrollable rows.',
  slots: [slot('rowIndex', 'rowIndex')],
  templates: ['pin row {rowIndex} to the top', 'freeze row {rowIndex} at the top'],
  params: (v) => ({ index: Number(v.rowIndex), position: 'top' }),
  synonyms: ['pin row top'], followUpKey: 'pinRowBottom' });
add({ key: 'pinRowBottom', category: 'rows', status: 'planned',
  description: 'Pins a specific row to the bottom of the grid.',
  slots: [slot('rowIndex', 'rowIndex')],
  templates: ['pin row {rowIndex} to the bottom', 'freeze row {rowIndex} at the bottom'],
  params: (v) => ({ index: Number(v.rowIndex), position: 'bottom' }),
  synonyms: ['pin row bottom'], followUpKey: 'pinRowTop' });
add({ key: 'unpinRow', category: 'rows', status: 'planned',
  description: 'Unpins a previously pinned row.',
  slots: [slot('rowIndex', 'rowIndex')],
  templates: ['unpin row {rowIndex}', 'remove the pin from row {rowIndex}'],
  params: (v) => ({ index: Number(v.rowIndex) }),
  synonyms: ['unpin row'], followUpKey: 'pinRowTop' });
add({ key: 'moveRowUp', category: 'rows', status: 'planned',
  description: 'Moves a row one position up.',
  slots: [slot('rowIndex', 'rowIndex')],
  templates: ['move row {rowIndex} up', 'shift row {rowIndex} up by one'],
  params: (v) => ({ index: Number(v.rowIndex), by: -1 }),
  synonyms: ['move row up'], followUpKey: 'moveRowDown' });
add({ key: 'moveRowDown', category: 'rows', status: 'planned',
  description: 'Moves a row one position down.',
  slots: [slot('rowIndex', 'rowIndex')],
  templates: ['move row {rowIndex} down', 'shift row {rowIndex} down by one'],
  params: (v) => ({ index: Number(v.rowIndex), by: 1 }),
  synonyms: ['move row down'], followUpKey: 'moveRowUp' });
add({ key: 'highlightRow', category: 'rows', status: 'planned',
  description: 'Applies a highlight color to a specific row.',
  slots: [slot('rowIndex', 'rowIndex'), slot('color', 'color')],
  templates: ['highlight row {rowIndex} in {color}', 'color row {rowIndex} {color}'],
  params: (v) => ({ index: Number(v.rowIndex), color: v.color }),
  synonyms: ['highlight row'], followUpKey: 'expandRow' });
add({ key: 'setRowIdField', category: 'rows', status: 'planned',
  description: 'Sets which data field is used as each row\'s unique id.',
  slots: [col('column')],
  templates: ['use {column} as the row id', 'set the row id field to {column}'],
  params: (v) => ({ field: toColId(v.column) }),
  synonyms: ['row id field'], followUpKey: 'rowCount' });
add({ key: 'flashRowOnUpdate', category: 'rows', status: 'planned',
  description: 'Flashes a row briefly when its data updates, to draw attention to the change.',
  templates: ['flash rows when they update', 'highlight a row briefly on change', 'flash the row on data update'],
  synonyms: ['flash row'], followUpKey: 'highlightRow' });
add({ key: 'setRowClassRule', category: 'rows', status: 'planned',
  description: 'Applies a conditional CSS class to rows matching a rule.',
  slots: [col('column'), slot('comparisonOperator', 'comparisonOperator'), slot('filterValue', 'filterValue')],
  templates: ['style rows where {column} {comparisonOperator} {filterValue}', 'highlight rows if {column} {comparisonOperator} {filterValue}'],
  params: (v) => ({ colId: toColId(v.column), operator: v.comparisonOperator, value: v.filterValue }),
  synonyms: ['row class rule'], followUpKey: 'highlightRow' });
add({ key: 'setMasterDetailField', category: 'rows', status: 'planned',
  description: 'Sets which field supplies each row\'s nested detail rows.',
  slots: [slot('masterDetailField', 'masterDetailField')],
  templates: ['use {masterDetailField} for the detail rows', 'expand rows using the {masterDetailField} field'],
  params: (v) => ({ field: v.masterDetailField }),
  synonyms: ['master detail field'], followUpKey: 'expandRow' });
add({ key: 'setDetailRowHeight', category: 'rows', status: 'planned',
  description: 'Sets the height of expanded master-detail rows.',
  slots: [slot('detailRowHeight', 'detailRowHeight')],
  templates: ['make detail rows {detailRowHeight} tall', 'set the detail row height to {detailRowHeight}'],
  params: (v) => ({ height: v.detailRowHeight }),
  synonyms: ['detail row height'], followUpKey: 'setMasterDetailField' });

// ════════════════════════════════════════════════════════════════════════
// CELLS
// ════════════════════════════════════════════════════════════════════════
add({ key: 'setCellFormat', category: 'cells', status: 'planned',
  description: 'Sets the display format for a column\'s cells.',
  slots: [col('column'), slot('cellFormat', 'cellFormat')],
  templates: ['format {column} as {cellFormat}', 'display {column} as {cellFormat}', 'show {column} in {cellFormat} format'],
  params: (v) => ({ colId: toColId(v.column), format: v.cellFormat }),
  synonyms: ['cell format'], followUpKey: 'setCellTextAlignment' });
add({ key: 'setCellTextAlignment', category: 'cells', status: 'planned',
  description: 'Sets text alignment within a column\'s cells.',
  slots: [col('column'), slot('cellTextAlignment', 'cellTextAlignment')],
  templates: ['align {column} to the {cellTextAlignment}', 'set {column} text alignment to {cellTextAlignment}'],
  params: (v) => ({ colId: toColId(v.column), align: v.cellTextAlignment }),
  synonyms: ['cell alignment'], followUpKey: 'setColumnHeaderAlignment' });
add({ key: 'setColumnHeaderAlignment', category: 'cells', status: 'planned',
  description: 'Sets text alignment within a column\'s header.',
  slots: [col('column'), slot('columnHeaderAlignment', 'columnHeaderAlignment')],
  templates: ['align {column}\'s header to the {columnHeaderAlignment}', 'set the {column} header alignment to {columnHeaderAlignment}'],
  params: (v) => ({ colId: toColId(v.column), align: v.columnHeaderAlignment }),
  synonyms: ['header alignment'], followUpKey: 'setCellTextAlignment' });
add({ key: 'highlightCell', category: 'cells', status: 'planned',
  description: 'Highlights a single cell with a background color.',
  slots: [col('column'), slot('rowIndex', 'rowIndex'), slot('color', 'color')],
  templates: ['highlight {column} row {rowIndex} in {color}', 'color the {column} cell at row {rowIndex} {color}'],
  params: (v) => ({ colId: toColId(v.column), rowIndex: Number(v.rowIndex), color: v.color }),
  synonyms: ['highlight cell'], followUpKey: 'addCellComment' });
add({ key: 'addCellComment', category: 'cells', status: 'planned',
  description: 'Attaches a comment/note to a specific cell.',
  slots: [col('column'), slot('rowIndex', 'rowIndex'), slot('cellValue', 'cellValue')],
  templates: ['add a comment "{cellValue}" to {column} row {rowIndex}', 'note "{cellValue}" on the {column} cell at row {rowIndex}'],
  params: (v) => ({ colId: toColId(v.column), rowIndex: Number(v.rowIndex), comment: v.cellValue }),
  synonyms: ['cell comment'], followUpKey: 'highlightCell' });
add({ key: 'mergeCells', category: 'cells', status: 'planned',
  description: 'Merges a range of cells into one spanning cell.',
  slots: [slot('cellRange', 'cellRange')],
  templates: ['merge cells {cellRange}', 'combine the cells in {cellRange}'],
  params: (v) => ({ range: v.cellRange }),
  synonyms: ['merge cells'], followUpKey: 'unmergeCells' });
add({ key: 'unmergeCells', category: 'cells', status: 'planned',
  description: 'Splits a previously merged cell range back apart.',
  slots: [slot('cellRange', 'cellRange')],
  templates: ['unmerge {cellRange}', 'split the merged cells in {cellRange} back apart'],
  params: (v) => ({ range: v.cellRange }),
  synonyms: ['unmerge cells'], followUpKey: 'mergeCells' });
add({ key: 'setCellBorder', category: 'cells', status: 'planned',
  description: 'Sets a border style for a range of cells.',
  slots: [slot('cellRange', 'cellRange'), slot('borderStyle', 'borderStyle')],
  templates: ['add a {borderStyle} border to {cellRange}', 'set the border on {cellRange} to {borderStyle}'],
  params: (v) => ({ range: v.cellRange, border: v.borderStyle }),
  synonyms: ['cell border'], followUpKey: 'highlightCell' });
add({ key: 'flashCellUpdate', category: 'cells', status: 'planned',
  description: 'Flashes a cell briefly whenever its value changes.',
  slots: [col('column')],
  templates: ['flash {column} cells when they update', 'flash-highlight changes to {column}'],
  params: (v) => ({ colId: toColId(v.column) }),
  synonyms: ['flash cell'], followUpKey: 'highlightCell' });
add({ key: 'setCellIcon', category: 'cells', status: 'planned',
  description: 'Shows an icon inside a column\'s cells based on its value.',
  slots: [col('column'), slot('iconName', 'iconName')],
  templates: ['show a {iconName} icon in {column} cells', 'add the {iconName} icon to {column}'],
  params: (v) => ({ colId: toColId(v.column), icon: v.iconName }),
  synonyms: ['cell icon'], followUpKey: 'setCellFormat' });
add({ key: 'setCellTooltip', category: 'cells', status: 'planned',
  description: 'Sets a tooltip shown when hovering a cell.',
  slots: [col('column'), slot('tooltipText', 'tooltipText')],
  templates: ['show "{tooltipText}" as a tooltip on {column} cells', 'add a hover tooltip "{tooltipText}" to {column}'],
  params: (v) => ({ colId: toColId(v.column), tooltip: v.tooltipText }),
  synonyms: ['cell tooltip'], followUpKey: 'setColumnTooltip' });
add({ key: 'readCellValue', category: 'cells', status: 'planned', commandType: 'copyCellValue',
  description: 'Reads back a single cell\'s current value.',
  slots: [col('column'), slot('rowIndex', 'rowIndex')],
  templates: ['what is the value in {column} row {rowIndex}', 'read {column} at row {rowIndex}', "what's in {column} for row {rowIndex}"],
  params: (v) => ({ colId: toColId(v.column), rowIndex: Number(v.rowIndex) }),
  synonyms: ['read cell value'], followUpKey: 'editCellValue' });

module.exports = { INTENTS };
