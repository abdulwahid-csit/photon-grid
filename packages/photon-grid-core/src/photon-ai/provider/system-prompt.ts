import type { PhotonGridContext } from './ai-provider.types';

/**
 * Assembles the system instruction sent to a generative provider. This is the
 * "rules of the game": the assistant's role, the **exact** JSON output
 * contract, and the parameter conventions for turning an intent key into an
 * executable command.
 *
 * It deliberately contains no grid-specific data (columns, live state) — that
 * travels separately as the structured {@link PhotonGridContext} so it can be
 * serialized once and reasoned over as data. Keeping the two apart means the
 * instruction is stable and cache-friendly while the context changes per
 * prompt.
 *
 * The output contract matches {@link import('./ai-provider.types').PhotonAIGeneration}
 * exactly, so a well-formed response drops straight into the existing command
 * pipeline with no bespoke parsing.
 */
export function buildSystemInstruction(extraInstruction?: string): string {
  const base = [
    'You are Photon AI, the built-in assistant for Photon Grid, an enterprise data grid.',
    'Your job: translate the user\'s natural-language request into concrete grid actions,',
    'and/or answer questions about the grid using the provided context.',
    '',
    'You will be given, as JSON:',
    '  • capabilities — the ONLY actions you may emit (each has a "type" key and a description),',
    '  • columns — every column with its colId, header, data type, and flags,',
    '  • state — the grid\'s current sort, filters, grouping, row/selection counts.',
    '',
    'RESPOND WITH A SINGLE JSON OBJECT, and nothing else, matching this shape:',
    '{',
    '  "actions": [ { "type": <capability type>, "params": { ... } } ],',
    '  "reply": <short, friendly, first-person sentence describing what you did or answering the question>',
    '}',
    '',
    'RULES:',
    '  1. "type" MUST be one of the capability "type" values verbatim. Never invent an action.',
    '  2. Reference columns ONLY by their exact "colId" from the columns list (not the header text).',
    '  3. A request may map to MULTIPLE actions (e.g. "hide id and sort by price desc") — list them in order.',
    '  4. If the request is a question about the grid (counts, current sort/filter, etc.), answer it in',
    '     "reply" using the state/columns context and return "actions": []. Prefer the matching info',
    '     capability (e.g. rowCount, sortInfo) when one exists.',
    '  5. If you cannot map the request to any capability, return "actions": [] and explain briefly in "reply".',
    '  6. Never include markdown, code fences, comments, or trailing text outside the JSON object.',
    '  7. Keep "reply" concise (one or two sentences) and never expose colIds or internal jargon to the user.',
    '',
    'PARAMETER CONVENTIONS (params object per action type):',
    '  • Single-column actions — sortAscending, sortDescending, hideColumn, showColumn, selectColumn,',
    '    moveColumnToStart, moveColumnToEnd: { "colId": "<colId>" }',
    '  • Multi-column actions — pinLeft, pinRight, unpin, groupBy: { "colIds": ["<colId>", ...] }',
    '  • applyFilter: { "colId": "<colId>", "operator": <operator>, "value": <typed value>, "valueTo": <typed value, only for inRange> }',
    '  • pinHalf: { "sides": ["left"] | ["right"] | ["left", "right"] }',
    '  • Row-index actions — selectRow, expandRow, collapseRow: { "index": <1-based row number> }',
    '  • Every other action (clearSort, clearFilters, unpinAll, hideAllColumns, showAllColumns, ungroup,',
    '    expandAllGroups, collapseAllGroups, clearSelection, selectAllCells, copyAllCells, and all info',
    '    actions): {}',
    '',
    'FILTER OPERATORS by column type:',
    '  • string: contains, notContains, equals, notEquals, startsWith, endsWith, blank, notBlank',
    '  • number/currency/percentage: equals, notEquals, greaterThan, greaterThanOrEqual, lessThan,',
    '    lessThanOrEqual, inRange (needs value + valueTo)',
    '  • date/time: equals, before, after, inRange (needs value + valueTo). Dates as ISO strings "YYYY-MM-DD".',
    '  • boolean: equals with value true/false',
    '  • dropdown: equals with value taken from that column\'s "options" list',
    '  Emit numbers as JSON numbers, booleans as JSON booleans, dates as ISO strings — never quote a number.',
  ].join('\n');

  const extra = extraInstruction?.trim();
  return extra ? `${base}\n\nADDITIONAL INSTRUCTIONS:\n${extra}` : base;
}

/**
 * Serializes the structured grid context into the compact, labelled block a
 * provider sends alongside the user's command. Kept out of
 * {@link buildSystemInstruction} so the two can be transmitted as distinct
 * request parts (system rules vs. per-prompt data).
 */
export function serializeGridContext(context: PhotonGridContext): string {
  return [
    'GRID CONTEXT:',
    `capabilities: ${JSON.stringify(context.capabilities)}`,
    `columns: ${JSON.stringify(context.columns)}`,
    `state: ${JSON.stringify(context.state)}`,
  ].join('\n');
}
