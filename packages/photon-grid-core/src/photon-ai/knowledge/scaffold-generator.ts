/**
 * **Scaffold generators** — produce ready-to-paste artefacts on request:
 * sample column definitions, a matching demo dataset, and the full theme
 * variable catalogue.
 *
 * These are deterministic and local. A language model asked to invent a
 * dataset produces plausible-looking but unusable output (duplicate ids,
 * malformed dates, values that contradict their column type); generating here
 * guarantees the result actually loads into the grid, and costs no tokens.
 *
 * Output is Markdown with fenced code blocks, so the chat panel renders it with
 * a copy button.
 *
 * @packageDocumentation
 */

import type { ColumnDataType, ColumnDef } from '../../types/column.types';
import type { ThemeVariableRegistryReader } from '../../types/theme-ai.types';
import { ThemeCategory } from '../../types/theme-ai.types';

/** A generated column plus the sample values that belong to it. */
interface SampleColumnSpec {
  readonly colId: string;
  readonly header: string;
  readonly type: ColumnDataType;
  readonly width?: number;
  readonly extras?: string;
  /** Produces a value for row `i`, deterministic so output is reproducible. */
  readonly sample: (i: number) => unknown;
}

const FIRST_NAMES = ['Ada', 'Alan', 'Grace', 'Linus', 'Barbara', 'Ken', 'Margaret', 'Dennis', 'Katherine', 'Tim'];
const LAST_NAMES = ['Lovelace', 'Turing', 'Hopper', 'Torvalds', 'Liskov', 'Thompson', 'Hamilton', 'Ritchie', 'Johnson', 'Berners-Lee'];
const DEPARTMENTS = ['Engineering', 'Sales', 'Marketing', 'Finance', 'Operations'];
const REGIONS = ['North America', 'EMEA', 'APAC', 'LATAM'];
const PRODUCTS = ['Starter', 'Professional', 'Enterprise', 'Ultimate'];

/**
 * The default sample schema.
 *
 * Chosen to exercise the features people immediately want to try: a text
 * column, a groupable dimension, a currency measure for aggregation, a date for
 * sorting and trends, a dropdown for set-filtering, and a boolean.
 */
const SAMPLE_COLUMNS: readonly SampleColumnSpec[] = [
  { colId: 'id', header: 'ID', type: 'number', width: 80, sample: (i) => i + 1 },
  {
    colId: 'name', header: 'Name', type: 'string', width: 180,
    sample: (i) => `${FIRST_NAMES[i % FIRST_NAMES.length]} ${LAST_NAMES[(i * 3) % LAST_NAMES.length]}`,
  },
  {
    colId: 'email', header: 'Email', type: 'email', width: 220,
    sample: (i) => `${FIRST_NAMES[i % FIRST_NAMES.length].toLowerCase()}.${LAST_NAMES[(i * 3) % LAST_NAMES.length].toLowerCase().replace(/[^a-z]/g, '')}@example.com`,
  },
  {
    colId: 'department', header: 'Department', type: 'dropdown', width: 150,
    extras: 'groupable: true',
    sample: (i) => DEPARTMENTS[i % DEPARTMENTS.length],
  },
  {
    colId: 'region', header: 'Region', type: 'dropdown', width: 150,
    extras: 'groupable: true',
    sample: (i) => REGIONS[(i * 2) % REGIONS.length],
  },
  {
    colId: 'product', header: 'Product', type: 'dropdown', width: 140,
    extras: 'groupable: true',
    sample: (i) => PRODUCTS[(i * 5) % PRODUCTS.length],
  },
  {
    colId: 'revenue', header: 'Revenue', type: 'currency', width: 140,
    extras: "aggFunc: 'sum'",
    // Deterministic spread so totals differ per category without randomness.
    sample: (i) => 1000 + ((i * 977) % 9000),
  },
  {
    colId: 'satisfaction', header: 'Satisfaction', type: 'percentage', width: 130,
    extras: "aggFunc: 'avg'",
    sample: (i) => Number((0.55 + ((i * 37) % 45) / 100).toFixed(2)),
  },
  {
    colId: 'joinDate', header: 'Join Date', type: 'date', width: 140,
    sample: (i) => {
      // Fixed epoch so the same index always yields the same date.
      const base = Date.UTC(2021, 0, 1);
      const day = 86_400_000;
      return new Date(base + ((i * 13) % 900) * day).toISOString().slice(0, 10);
    },
  },
  {
    colId: 'active', header: 'Active', type: 'boolean', width: 100,
    sample: (i) => i % 4 !== 0,
  },
];

/** Hard cap on generated rows — beyond this, paste size becomes the problem. */
const MAX_ROWS = 500;

/** Generates column definitions, datasets, and the theme catalogue. */
export class ScaffoldGenerator {
  /**
   * Column definitions as a copy-pasteable TypeScript snippet.
   *
   * @param count - How many columns to emit (clamped to the sample schema's size).
   */
  generateColumns(count = SAMPLE_COLUMNS.length): string {
    const specs = SAMPLE_COLUMNS.slice(0, Math.max(1, Math.min(count, SAMPLE_COLUMNS.length)));

    const lines = specs.map((spec) => {
      const parts = [
        `colId: '${spec.colId}'`,
        `field: '${spec.colId}'`,
        `header: '${spec.header}'`,
        `type: '${spec.type}'`,
      ];
      if (spec.width !== undefined) parts.push(`width: ${spec.width}`);
      if (spec.extras) parts.push(spec.extras);
      return `  { ${parts.join(', ')} },`;
    });

    return [
      `Here are ${specs.length} column definitions you can drop straight in:`,
      '',
      '```ts',
      "import type { ColumnDef } from 'photon-grid-core';",
      '',
      'export const columns: ColumnDef[] = [',
      ...lines,
      '];',
      '```',
    ].join('\n');
  }

  /**
   * A dataset matching {@link generateColumns}, as JSON.
   *
   * Values are index-derived rather than random so the same request always
   * produces the same data — which makes generated examples reproducible and
   * diffable.
   */
  generateDataset(rowCount = 25): string {
    const count = Math.max(1, Math.min(rowCount, MAX_ROWS));
    const rows: Record<string, unknown>[] = [];

    for (let i = 0; i < count; i++) {
      const row: Record<string, unknown> = {};
      for (const spec of SAMPLE_COLUMNS) row[spec.colId] = spec.sample(i);
      rows.push(row);
    }

    return [
      `Here is a ${count}-row dataset matching those columns:`,
      '',
      '```ts',
      `export const data = ${JSON.stringify(rows, null, 2)};`,
      '```',
      '',
      'Pass it as the `data` option (`createGrid(\'#grid\', { columns, data })`).',
    ].join('\n');
  }

  /** Columns and dataset together, plus the call that mounts them. */
  generateFullExample(rowCount = 25): string {
    return [
      this.generateColumns(),
      '',
      this.generateDataset(rowCount),
      '',
      'Then mount the grid:',
      '',
      '```ts',
      "import { createGrid } from 'photon-grid-core';",
      '',
      "const grid = createGrid('#grid', {",
      '  columns,',
      '  data,',
      "  mode: 'light',",
      '  rowHeight: 42,',
      '  showGroupingBar: true,',
      '});',
      '```',
    ].join('\n');
  }

  /**
   * The complete themeable variable catalogue, grouped by category, as CSS.
   *
   * Emitted as a `.pg-grid { … }` block rather than a bare list so it is
   * directly usable: paste it into a stylesheet and start editing values.
   */
  generateThemeVariables(registry: ThemeVariableRegistryReader): string {
    const sections: string[] = [];
    let total = 0;

    for (const category of Object.values(ThemeCategory)) {
      const vars = registry.getByCategory(category);
      if (vars.length === 0) continue;
      total += vars.length;
      sections.push(`  /* ── ${category} ── */`);
      for (const v of vars) sections.push(`  ${v.cssVar}: ${v.defaultValue};`);
      sections.push('');
    }

    return [
      `Photon Grid exposes **${total}** themeable CSS variables. Every one can be overridden — scope them to \`.pg-grid\` to theme one grid, or \`:root\` for all of them.`,
      '',
      '```css',
      '.pg-grid {',
      ...sections,
      '}',
      '```',
      '',
      'You can also change any of these at runtime by asking me — for example, *"make the header dark blue with rounded corners"*.',
    ].join('\n');
  }

  /** A typed server-side datasource implementation. */
  generateServerDatasource(): string {
    return [
      'Here is a complete server-side datasource:',
      '',
      '```ts',
      "import { createGrid } from 'photon-grid-core';",
      "import type { ServerSideDatasource } from 'photon-grid-core';",
      '',
      'const datasource: ServerSideDatasource = {',
      '  async getRows(params) {',
      '    const { page, pageSize, sortModel, filterModel, quickFilter } = params.request;',
      '',
      '    try {',
      "      const res = await fetch('/api/rows', {",
      "        method: 'POST',",
      "        headers: { 'Content-Type': 'application/json' },",
      '        body: JSON.stringify({ page, pageSize, sort: sortModel, filter: filterModel, search: quickFilter }),',
      '        signal: params.signal, // the grid aborts superseded requests',
      '      });',
      '',
      '      if (!res.ok) { params.fail(); return; }',
      '',
      '      const { rows, total } = await res.json();',
      '      params.success({ rows, totalRows: total });',
      '    } catch (err) {',
      "      if ((err as Error).name !== 'AbortError') params.fail();",
      '    }',
      '  },',
      '};',
      '',
      "createGrid('#grid', {",
      '  columns,',
      "  rowModel: 'server',",
      '  serverSideDatasource: datasource,',
      '  pagination: { enabled: true, pageSize: 100 },',
      '});',
      '```',
      '',
      'The grid handles cancellation, out-of-order responses, and page caching. Swap the datasource later with `api.setServerSideDatasource(ds)`, or force a reload with `api.refreshServerSide()`.',
    ].join('\n');
  }

  /** Export wiring for CSV and Excel. */
  generateExportCode(): string {
    return [
      'Export the current view — sort, filters, and column order are all respected:',
      '',
      '```ts',
      "// CSV — built in, no extra dependency.",
      "api.exportToCsv({ fileName: 'employees.csv' });",
      '',
      "// Excel — needs the optional 'xlsx' peer dependency installed.",
      "api.exportToExcel({ fileName: 'employees.xlsx', sheetName: 'Employees' });",
      '```',
      '',
      'Or set defaults once:',
      '',
      '```ts',
      "createGrid('#grid', {",
      '  columns,',
      '  data,',
      '  exportConfig: {',
      "    fileName: 'report',",
      '    onlyVisibleColumns: true,',
      '    onlySelectedRows: false,',
      '  },',
      '});',
      '```',
    ].join('\n');
  }

  /** Column validators for common rules. */
  generateValidationRules(columns: readonly ColumnDef[] = []): string {
    const target = columns.find((c) => c.type === 'email')?.colId ?? 'email';
    const numeric = columns.find((c) => c.type === 'number' || c.type === 'currency')?.colId ?? 'amount';

    return [
      'Attach a `validator` to any editable column. Return `true` to accept, or a message to reject:',
      '',
      '```ts',
      'const columns: ColumnDef[] = [',
      '  {',
      `    colId: '${target}', field: '${target}', header: 'Email', type: 'string', editable: true,`,
      '    validator: (value) =>',
      '      /^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$/.test(String(value)) || \'Enter a valid email address\',',
      '  },',
      '  {',
      `    colId: '${numeric}', field: '${numeric}', header: 'Amount', type: 'currency', editable: true,`,
      '    validator: (value) => {',
      '      const n = Number(value);',
      "      if (!Number.isFinite(n)) return 'Must be a number';",
      "      if (n < 0) return 'Cannot be negative';",
      '      return true;',
      '    },',
      '  },',
      '  {',
      "    colId: 'name', field: 'name', header: 'Name', type: 'string', editable: true,",
      "    validator: (value) => String(value).trim().length > 0 || 'Name is required',",
      '  },',
      '];',
      '',
      "createGrid('#grid', { columns, data, editing: { enabled: true } });",
      '```',
      '',
      'A rejected edit keeps the editor open and shows the message, so the original value is never lost.',
    ].join('\n');
  }
}
