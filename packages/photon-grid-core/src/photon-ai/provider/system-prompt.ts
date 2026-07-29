import { PhotonAIDomain, type PhotonAIContextScope, type PhotonGridContext } from './ai-provider.types';

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
 * ### Scoping
 * The parameter conventions and filter-operator tables are the bulk of this
 * instruction, and each line only matters for one domain. When a
 * {@link PhotonAIContextScope} is supplied, only the sections for in-scope
 * domains are emitted — a sort request drops the entire filter-operator table,
 * the row-index conventions, and the pinning/grouping parameter lines.
 *
 * The output contract matches {@link import('./ai-provider.types').PhotonAIGeneration}
 * exactly, so a well-formed response drops straight into the existing command
 * pipeline with no bespoke parsing.
 */

/** Parameter-convention lines, keyed by the domain that needs them. */
const PARAM_SECTIONS: readonly (readonly [PhotonAIDomain, string])[] = [
  [
    PhotonAIDomain.Sort,
    '  • Single-column actions — sortAscending, sortDescending: { "colId": "<colId>" }',
  ],
  [
    PhotonAIDomain.Visibility,
    '  • Single-column actions — hideColumn, showColumn: { "colId": "<colId>" }',
  ],
  [
    PhotonAIDomain.Layout,
    '  • Single-column actions — moveColumnToStart, moveColumnToEnd: { "colId": "<colId>" }',
  ],
  [
    PhotonAIDomain.Pinning,
    '  • Multi-column actions — pinLeft, pinRight, unpin: { "colIds": ["<colId>", ...] }\n' +
      '  • pinHalf: { "sides": ["left"] | ["right"] | ["left", "right"] }',
  ],
  [
    PhotonAIDomain.Grouping,
    '  • Multi-column actions — groupBy: { "colIds": ["<colId>", ...] }\n' +
      '  • Row-index actions — expandRow, collapseRow: { "index": <1-based row number> }',
  ],
  [
    PhotonAIDomain.Filter,
    '  • applyFilter: { "colId": "<colId>", "operator": <operator>, "value": <typed value>, "valueTo": <typed value, only for inRange> }',
  ],
  [
    PhotonAIDomain.Selection,
    '  • selectColumn: { "colId": "<colId>" }\n' +
      '  • selectRowsWhere (highlights matching rows without hiding others): { "colId": "<colId>", "operator": <operator>, "value": <typed value>, "valueTo": <typed value, only for inRange> } — same operator/value rules as applyFilter.\n' +
      '  • selectRow: { "index": <1-based row number> }\n' +
      '  • selectRowRange: { "mode": "first" | "last" | "range", "from": <count for first/last, OR the 1-based start for range>, "to": <1-based end, only for range> }',
  ],
];

/**
 * The filter-operator reference. Easily the largest block in the instruction,
 * and meaningless outside the two domains that compare values — so it is gated
 * rather than always sent.
 */
const FILTER_OPERATORS = [
  'FILTER OPERATORS by column type:',
  '  • string: contains, notContains, equals, notEquals, startsWith, endsWith, blank, notBlank',
  '  • number/currency/percentage: equals, notEquals, greaterThan, greaterThanOrEqual, lessThan,',
  '    lessThanOrEqual, inRange (needs value + valueTo)',
  '  • date/time: equals, before, after, inRange (needs value + valueTo). Dates as ISO strings "YYYY-MM-DD".',
  '  • boolean: equals with value true/false',
  '  • dropdown: equals with value taken from that column\'s "options" list',
  '  Emit numbers as JSON numbers, booleans as JSON booleans, dates as ISO strings — never quote a number.',
].join('\n');

/**
 * Builds the system instruction, optionally narrowed to a routed scope.
 *
 * @param extraInstruction - Host-app guidance appended verbatim.
 * @param scope            - Routing result. Omit to emit every section.
 */
export function buildSystemInstruction(
  extraInstruction?: string,
  scope?: PhotonAIContextScope,
): string {
  const has = (d: PhotonAIDomain): boolean => !scope || scope.domains.has(d);

  const lines: string[] = [
    'You are Photon AI, the built-in assistant for Photon Grid, an enterprise data grid.',
    'Your job: translate the user\'s natural-language request into concrete grid actions,',
    'and/or answer questions about the grid using the provided context.',
    '',
    'You will be given, as JSON:',
    '  • capabilities — the ONLY actions you may emit (each has a "type" key and a description),',
    '  • columns — the columns relevant to this request, with their colId, header, and data type,',
    '  • state — the grid\'s current state relevant to this request.',
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
  ];

  for (const [domain, text] of PARAM_SECTIONS) {
    if (has(domain)) lines.push(text);
  }

  lines.push(
    '  • Every other action (clearSort, clearFilters, unpinAll, hideAllColumns, showAllColumns, ungroup,',
    '    expandAllGroups, collapseAllGroups, clearSelection, selectAllRows, selectAllCells, copyAllCells, and all info',
    '    actions): {}',
  );

  if (has(PhotonAIDomain.Filter) || has(PhotonAIDomain.Selection)) {
    lines.push('', FILTER_OPERATORS);
  }

  const base = lines.join('\n');
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
