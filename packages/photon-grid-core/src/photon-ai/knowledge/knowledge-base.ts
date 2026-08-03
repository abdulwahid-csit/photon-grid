/**
 * The **Photon Grid knowledge base** — curated, verified documentation the AI
 * retrieves from when a user asks how to *use* the library rather than asking
 * the grid to do something.
 *
 * ### Why this file exists
 * A language model has never seen Photon Grid. Asked for a React example it
 * will confidently invent an API that does not exist. So "how do I…" questions
 * are answered from content authored here and verified against the source, with
 * the model used only to select and phrase — never to recall.
 *
 * ### Accuracy note
 * Every snippet below was checked against the actual implementation, **not**
 * against the package READMEs, which contain three known errors:
 *
 * | README claims | Reality | Verified in |
 * |---|---|---|
 * | `new PhotonGrid({ element, columns, rowData })` | `createGrid('#el', { columns, data })` — `PhotonGrid` isn't exported, `GridCore`'s constructor is positional, and the key is `data` | `src/index.ts`, `src/core/grid-core.ts`, `src/types/grid.types.ts` |
 * | `<photon-grid>` | `<photon-grid-angular>` | `photon-grid-angular/src/library/photon-grid.component.ts` |
 * | `options.theme` | deprecated — use `mode` + `variant` | `src/types/grid.types.ts` |
 *
 * If you edit an article, re-verify against source rather than against a README.
 *
 * @packageDocumentation
 */

/** A single retrievable documentation article. */
export interface KnowledgeArticle {
  /** Stable id, used in tests and for deduplication. */
  readonly id: string;
  /** Human title, shown to the model as the article heading. */
  readonly title: string;
  /**
   * Words and phrases that should retrieve this article. Matched
   * case-insensitively against the user's prompt as whole words, so a keyword
   * may be a phrase ("server side"). Keep these specific: an over-broad keyword
   * makes this article outrank better ones.
   */
  readonly keywords: readonly string[];
  /** Markdown body. Fenced code blocks render with a copy button in the panel. */
  readonly body: string;
}

/* ────────────────────────── Installation & setup ────────────────────────── */

const INSTALL: KnowledgeArticle = {
  id: 'install',
  title: 'Installing Photon Grid',
  keywords: ['install', 'installation', 'npm', 'yarn', 'pnpm', 'cdn', 'package', 'setup', 'add'],
  body: `Photon Grid ships one framework-agnostic core plus a thin wrapper per framework.

\`\`\`bash
# Vanilla JS / TypeScript
npm install photon-grid-core

# Angular
npm install photon-grid-angular photon-grid-core

# React
npm install photon-grid-react photon-grid-core

# Vue
npm install photon-grid-vue photon-grid-core
\`\`\`

Or straight from a CDN, which exposes the global \`PhotonGrid\`:

\`\`\`html
<script src="https://cdn.jsdelivr.net/npm/photon-grid-core/dist/photon-grid.min.js"></script>
\`\`\`

**No CSS import is needed.** The core injects its own stylesheet on first render.`,
};

const QUICKSTART_VANILLA: KnowledgeArticle = {
  id: 'quickstart-vanilla',
  title: 'Vanilla JS / TypeScript quickstart',
  keywords: ['vanilla', 'javascript', 'typescript', 'plain', 'creategrid', 'gridcore', 'quickstart', 'html'],
  body: `\`createGrid\` is the recommended entry point — it accepts a CSS selector or an element and throws immediately if the target is missing.

\`\`\`ts
import { createGrid } from 'photon-grid-core';
import type { ColumnDef } from 'photon-grid-core';

const columns: ColumnDef[] = [
  { colId: 'name', field: 'name', header: 'Name', type: 'string' },
  { colId: 'balance', field: 'balance', header: 'Balance', type: 'currency' },
  { colId: 'joinDate', field: 'joinDate', header: 'Joined', type: 'date' },
];

const data = [
  { name: 'Ada Lovelace', balance: 91200, joinDate: '2021-03-14' },
  { name: 'Alan Turing', balance: 78400, joinDate: '2020-06-23' },
];

const grid = createGrid('#grid', {
  columns,
  data,
  mode: 'light',
  rowHeight: 42,
});

grid.api.sizeColumnsToFit();
// grid.destroy() when you are finished.
\`\`\`

The host element must have a size — the grid fills its container:

\`\`\`css
#grid { position: absolute; inset: 24px; }
\`\`\`

Notes that trip people up:
- The row-data key is \`data\`, **not** \`rowData\`.
- \`new GridCore(element, options)\` also works, but its arguments are positional and it needs a real element rather than a selector.
- There is no \`grid.render()\` — the grid renders itself.`,
};

const QUICKSTART_ANGULAR: KnowledgeArticle = {
  id: 'quickstart-angular',
  title: 'Angular quickstart',
  keywords: ['angular', 'ng', 'standalone', 'component', 'ngmodule'],
  body: `\`PhotonGridComponent\` is standalone — import it directly.

\`\`\`ts
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { PhotonGridComponent } from 'photon-grid-angular';
import type { ColumnDef } from 'photon-grid-angular';
import type { GridApi, GridOptions } from 'photon-grid-core';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [PhotonGridComponent],
  template: \`
    <photon-grid-angular
      [columns]="columns"
      [dataSet]="data"
      [options]="options"
      (gridReady)="onGridReady($event)">
    </photon-grid-angular>
  \`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  columns: ColumnDef[] = [
    { colId: 'department', field: 'department', header: 'Department', type: 'string', width: 160, groupable: true },
    { colId: 'salary', field: 'salary', header: 'Salary', type: 'currency', width: 140 },
    { colId: 'joinDate', field: 'joinDate', header: 'Join Date', type: 'date', minWidth: 140, flex: 1 },
  ];

  data: Record<string, unknown>[] = [
    { department: 'Engineering', salary: 120000, joinDate: '2021-03-14' },
  ];

  readonly options: Partial<GridOptions> = {
    mode: 'light',
    variant: 'neon',
    showSerialNumber: true,
    showGroupingBar: true,
    rowHeight: 42,
  };

  onGridReady(api: GridApi): void {
    api.sizeColumnsToFit();
  }
}
\`\`\`

The element selector is \`<photon-grid-angular>\`. The host element needs a height, e.g. \`photon-grid-angular { display: block; height: 600px; }\`.`,
};

const QUICKSTART_REACT: KnowledgeArticle = {
  id: 'quickstart-react',
  title: 'React quickstart',
  keywords: ['react', 'jsx', 'tsx', 'hook', 'usememo', 'nextjs', 'next'],
  body: `\`\`\`jsx
import { useMemo } from 'react';
import { PhotonGrid } from 'photon-grid-react';

export default function App() {
  const data = useMemo(() => [
    { department: 'Engineering', salary: 120000, joinDate: '2021-03-14' },
  ], []);

  const columns = useMemo(() => [
    { colId: 'department', field: 'department', header: 'Department', type: 'string', width: 160, groupable: true },
    { colId: 'salary', field: 'salary', header: 'Salary', type: 'currency', width: 140 },
    { colId: 'joinDate', field: 'joinDate', header: 'Join Date', type: 'date', width: 140 },
  ], []);

  const options = useMemo(() => ({
    mode: 'dark',
    variant: 'quantum',
    showGroupingBar: true,
    selection: { mode: 'multiple' },
  }), []);

  return (
    <div style={{ height: 600 }}>
      <PhotonGrid columns={columns} dataSet={data} options={options} />
    </div>
  );
}
\`\`\`

**Wrap \`columns\`, \`dataSet\`, and \`options\` in \`useMemo\`.** They are effect dependencies in the wrapper, so passing fresh object literals re-creates the entire grid on every render — the usual cause of "my React grid flickers, loses scroll position, or feels slow".`,
};

const QUICKSTART_VUE: KnowledgeArticle = {
  id: 'quickstart-vue',
  title: 'Vue quickstart',
  keywords: ['vue', 'vue3', 'sfc', 'composition', 'nuxt'],
  body: `\`\`\`vue
<script setup lang="ts">
import { PhotonGrid } from 'photon-grid-vue';
import type { ColumnDef, GridApi } from 'photon-grid-vue';

const columns: ColumnDef[] = [
  { colId: 'name', field: 'name', header: 'Name', type: 'string' },
  { colId: 'age', field: 'age', header: 'Age', type: 'number' },
];

const rows = [{ name: 'Ada', age: 36 }];

function onReady(api: GridApi) {
  api.sizeColumnsToFit();
}
</script>

<template>
  <PhotonGrid
    :columns="columns"
    :dataSet="rows"
    :options="{ mode: 'light' }"
    @gridReady="onReady"
    style="height: 600px"
  />
</template>
\`\`\``,
};

/* ────────────────────────────── Renderers ────────────────────────────── */

const RENDERERS: KnowledgeArticle = {
  id: 'custom-renderers',
  title: 'Custom cell renderers',
  keywords: ['renderer', 'render', 'custom cell', 'cell template', 'template', 'formatter', 'badge', 'avatar'],
  body: `\`ColumnDef.renderer\` is a map of eight independent slots — set only the ones you need; the rest fall back to built-in rendering.

\`\`\`ts
interface ColumnRendererMap {
  display?:  (params) => HTMLElement | string;  // the data cell
  editor?:   (params) => HTMLElement;           // edit widget
  option?:   (params) => HTMLElement | string;  // dropdown + set-filter rows
  filter?:   (params) => HTMLElement;           // filter panel body
  tooltip?:  (params) => HTMLElement | string;
  group?:    (params) => HTMLElement | string;
  header?:   (params) => HTMLElement | string;
  summary?:  (params) => HTMLElement | string;
}
\`\`\`

A \`display\` renderer receives \`{ value, rawValue, row, colDef, rowIndex, colIndex, api }\`.

**Any framework** — return a DOM element (preferred: no injection risk) or an HTML string:

\`\`\`ts
{
  colId: 'email', field: 'email', header: 'Email', type: 'string',
  renderer: {
    display: (params) => {
      const link = document.createElement('a');
      link.textContent = String(params.value ?? '');
      link.href = \`mailto:\${params.value}\`;
      return link;
    },
  },
}
\`\`\`

**React** — pass the component itself. It receives the params as props:

\`\`\`jsx
function EmployeeCell({ row, rowIndex }) {
  return <strong>{row.fullName}</strong>;
}

{ colId: 'fullName', field: 'fullName', header: 'Name', renderer: { display: EmployeeCell } }
\`\`\`

**Angular** — pass a component class, or a \`TemplateRef\`:

\`\`\`ts
// Component class. It receives one @Input() named params.
{ colId: 'fullName', field: 'fullName', header: 'Name', renderer: { display: EmployeeCellComponent } }

// Or a template, queried with { static: true } so it resolves before the
// columns are built:
@ViewChild('countryTpl', { static: true }) countryTpl!: TemplateRef<unknown>;
{ colId: 'country', field: 'country', header: 'Country', renderer: { display: this.countryTpl } }
\`\`\`

Two gotchas:
- A renderer component is re-created on every render, with no update path — derive visuals from stable data, never from \`Math.random()\`.
- If an Angular \`TemplateRef\` renderer is \`undefined\`, you almost certainly used \`@ViewChild(...)\` without \`{ static: true }\`.`,
};

/* ───────────────────────────── Core concepts ───────────────────────────── */

const VIRTUAL_SCROLLING: KnowledgeArticle = {
  id: 'virtual-scrolling',
  title: 'How virtual scrolling works',
  keywords: ['virtual', 'virtualization', 'virtualisation', 'scrolling', 'windowing', 'million rows', 'large dataset'],
  body: `Photon Grid renders only what is visible, in both axes.

- **Vertically**, it computes the row window from scroll offset and row height, plus a small buffer above and below, and reuses the existing row DOM as you scroll rather than rebuilding it.
- **Horizontally**, off-screen columns are replaced by two spacer elements, so a 200-column grid mounts a couple of dozen cells per row.
- Row positions come from a single generated stylesheet keyed by row id, so scrolling updates one \`<style>\` rule set instead of touching every row's inline style.

The practical consequence: memory and render cost track the size of the **viewport**, not the dataset. A million rows costs about what a hundred does.

Tuning:

\`\`\`ts
{
  virtualScroll: { rowBuffer: 5 },     // extra rows rendered off-screen
  suppressColumnVirtualisation: false, // set true only for very narrow grids
  rowHeight: 42,                       // a fixed height is the fastest path
  rowHeightMode: 'fixed',              // 'auto' measures each row — slower
}
\`\`\``,
};

const SERVER_SIDE: KnowledgeArticle = {
  id: 'server-side-row-model',
  title: 'The server-side row model',
  keywords: ['server side', 'serverside', 'datasource', 'backend', 'remote', 'row model', 'lazy', 'infinite'],
  body: `By default the grid holds every row in memory and sorts/filters/paginates locally (\`rowModel: 'client'\`). With \`rowModel: 'server'\` it delegates all of that to your backend: each change of sort, filter, search, or page issues one request for just that page.

\`\`\`ts
import { createGrid } from 'photon-grid-core';
import type { ServerSideDatasource } from 'photon-grid-core';

const datasource: ServerSideDatasource = {
  async getRows(params) {
    const res = await fetch('/api/rows', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        page: params.request.page,
        pageSize: params.request.pageSize,
        sort: params.request.sortModel,
        filter: params.request.filterModel,
        search: params.request.quickFilter,
      }),
      signal: params.signal,       // the grid aborts superseded requests
    });

    if (!res.ok) { params.fail(); return; }

    const { rows, total } = await res.json();
    params.success({ rows, totalRows: total });
  },
};

createGrid('#grid', {
  columns,
  rowModel: 'server',
  serverSideDatasource: datasource,
  pagination: { enabled: true, pageSize: 100 },
});
\`\`\`

The grid handles request cancellation, out-of-order responses, retries, and page caching for you. You can swap the datasource later with \`api.setServerSideDatasource(ds)\` and force a reload with \`api.refreshServerSide()\`.`,
};

const GROUPING: KnowledgeArticle = {
  id: 'grouping',
  title: 'Row grouping and aggregation',
  keywords: ['group', 'grouping', 'groupby', 'aggregate', 'aggregation', 'aggfunc', 'subtotal', 'rollup'],
  body: `Mark the columns users may group by, then group at runtime (or from the grouping bar).

\`\`\`ts
const columns = [
  { colId: 'department', field: 'department', header: 'Department', groupable: true },
  { colId: 'salary', field: 'salary', header: 'Salary', type: 'currency', aggFunc: 'sum' },
  { colId: 'rating', field: 'rating', header: 'Rating', type: 'number', aggFunc: 'avg' },
];

createGrid('#grid', { columns, data, showGroupingBar: true });

// Or programmatically:
api.groupByColumns(['department']);
\`\`\`

\`aggFunc\` accepts \`'sum' | 'avg' | 'min' | 'max' | 'count'\`. Aggregates roll up through every level: a parent group aggregates its children's accumulators rather than re-scanning leaves, so averages stay correctly weighted and deep hierarchies stay cheap.`,
};

const FILTERING: KnowledgeArticle = {
  id: 'filtering',
  title: 'Filtering',
  keywords: ['filter', 'filtering', 'quickfilter', 'search', 'operator', 'filtermodel', 'where'],
  body: `Three layers, usable together:

1. **Quick filter** — one term across every column: \`api.setQuickFilter('ada')\`.
2. **Column filters** — type-aware, from the filter row or the filters tool panel.
3. **A filter model** — set or restore filters programmatically.

\`\`\`ts
createGrid('#grid', { columns, data, showFilterRow: true, filtersToolPanel: { enabled: true } });

api.setFilterModel({
  salary: { colId: 'salary', conditions: [{ operator: 'greaterThan', value: 50000 }] },
});

api.getFilterModel();
api.clearAllFilters();
\`\`\`

Operators by column type:
- **string** — contains, notContains, equals, notEquals, startsWith, endsWith, blank, notBlank
- **number / currency / percentage** — equals, notEquals, greaterThan, greaterThanOrEqual, lessThan, lessThanOrEqual, inRange
- **date / time** — equals, before, after, inRange
- **boolean** — equals
- **dropdown** — equals, against the column's declared options

Filtering runs before sorting and grouping in the pipeline, so aggregates always reflect the filtered set.`,
};

const FORMULAS: KnowledgeArticle = {
  id: 'formulas',
  title: 'Formulas and recalculation',
  keywords: ['formula', 'formulas', 'recalculate', 'recalculation', 'excel', 'calc', 'dependency'],
  body: `Enable the engine and opt columns in:

\`\`\`ts
createGrid('#grid', {
  columns: [
    { colId: 'qty', field: 'qty', type: 'number' },
    { colId: 'price', field: 'price', type: 'currency' },
    { colId: 'total', field: 'total', type: 'currency', allowFormula: true },
  ],
  data,
  formula: { enabled: true },
});

api.setCellFormula(nodeId, 'total', '=qty * price');
\`\`\`

Recalculation is **dependency-driven, not brute force**. Each formula's references are recorded in a dependency graph; editing a cell recomputes only its dependents, in topological order, so each cell is evaluated once per change. Editing one cell among 50,000 formulas costs well under a millisecond rather than a full re-evaluation. Circular references are detected and reported rather than looping.`,
};

const PERFORMANCE: KnowledgeArticle = {
  id: 'performance',
  title: 'Performance tuning',
  keywords: ['performance', 'slow', 'lag', 'laggy', 'optimize', 'optimise', 'faster', 'speed', 'jank', 'fps', 'stutter'],
  body: `In rough order of impact:

1. **Use a fixed row height.** \`rowHeightMode: 'auto'\` measures every rendered row each pass. Set \`rowHeight\` and leave the mode at \`'fixed'\`.
2. **Keep renderers cheap.** A \`display\` renderer runs for every visible cell on every render. Build one element; avoid layout reads (\`getBoundingClientRect\`, \`offsetWidth\`) inside it.
3. **React: memoize \`columns\`, \`dataSet\`, and \`options\`.** Fresh literals re-create the whole grid on each parent render. This is the single most common cause of a slow React grid.
4. **Move past client-side for very large data.** Beyond a few hundred thousand rows, prefer \`rowModel: 'server'\` so sorting and filtering happen in your database.
5. **Trim the row buffer** — \`virtualScroll: { rowBuffer: 3 }\` renders less per frame.
6. **Turn off row animation during bulk updates** — \`animateRows: false\`.
7. **Use transactions, not full resets.** \`api.applyTransaction({ add, update, remove })\` touches only affected rows, where \`api.setRowData(...)\` rebuilds everything.
8. **Avoid very wide grids with virtualisation disabled** — leave \`suppressColumnVirtualisation\` unset.

Measure before changing anything: a grid that feels slow while scrolling is usually renderer cost, while one slow on load is usually data volume or a synchronous parse.`,
};

const ACCESSIBILITY: KnowledgeArticle = {
  id: 'accessibility',
  title: 'Accessibility',
  keywords: ['accessibility', 'a11y', 'aria', 'screen reader', 'keyboard', 'wcag', 'contrast', 'rtl', 'focus'],
  body: `Built in: ARIA grid/row/cell roles, full keyboard navigation (arrows, Home/End, Page Up/Down, Tab, Enter/F2 to edit, Escape to cancel), managed focus, RTL layout, and visible focus indicators.

What still needs you:

\`\`\`ts
createGrid('#grid', {
  columns: [
    // A meaningful header is what a screen reader announces per cell.
    { colId: 'amt', field: 'amt', header: 'Invoice amount (USD)', type: 'currency' },
  ],
  data,
  mode: 'light',
  locale: 'en-US',
});
\`\`\`

- Give every column a descriptive \`header\` — screen readers read it with each cell.
- In custom renderers, put an accessible name on icon-only content (\`aria-label\`), and never convey meaning by colour alone.
- Check contrast if you customise theme tokens; aim for WCAG AA (4.5:1 for body text).
- Set \`locale\` so dates and numbers are announced correctly.
- Ensure any interactive element you render is reachable by keyboard, not just clickable.`,
};

const THEMING: KnowledgeArticle = {
  id: 'theming',
  title: 'Theming',
  keywords: ['theme', 'theming', 'dark mode', 'light mode', 'variant', 'css variable', 'token', 'colors', 'style'],
  body: `Theming has two independent axes:

- \`mode\` — \`'light'\` or \`'dark'\`, which sets the colour palette.
- \`variant\` — the visual skin: \`'photon' | 'ion' | 'neon' | 'quantum'\`.

\`\`\`ts
createGrid('#grid', { columns, data, mode: 'dark', variant: 'quantum' });
\`\`\`

Everything visual is a \`--pg-*\` CSS custom property, so you can override any of them:

\`\`\`css
.pg-grid {
  --pg-colors-primary: #7c3aed;
  --pg-colors-row-hover: #f5f3ff;
  --pg-borders-radius-md: 10px;
}
\`\`\`

\`options.theme\` is deprecated — use \`mode\` and \`variant\`. Ask me to "list all theme variables" for the complete token catalogue.`,
};

const EXPORT: KnowledgeArticle = {
  id: 'export',
  title: 'Exporting data',
  keywords: ['export', 'csv', 'excel', 'xlsx', 'download', 'save', 'import'],
  body: `\`\`\`ts
// CSV — built in, no dependency.
api.exportToCsv({ fileName: 'employees.csv' });

// Excel — requires the optional 'xlsx' peer dependency.
api.exportToExcel({ fileName: 'employees.xlsx', sheetName: 'Employees' });
\`\`\`

Configure defaults up front:

\`\`\`ts
createGrid('#grid', {
  columns,
  data,
  exportConfig: {
    fileName: 'report',
    onlyVisibleColumns: true,
    onlySelectedRows: false,
  },
});
\`\`\`

Exports respect the current sort, filters, and column order, so what downloads matches what is on screen. For imports, enable \`import: { enabled: true }\` to get the built-in CSV/XLSX import menu.`,
};

const STATE: KnowledgeArticle = {
  id: 'state',
  title: 'Saving and restoring grid state',
  keywords: ['state', 'persist', 'restore', 'save layout', 'localstorage', 'statekey'],
  body: `\`\`\`ts
// Persist automatically to localStorage.
createGrid('#grid', { columns, data, enableStateManagement: true, stateKey: 'employees-grid' });

// Or manage it yourself.
const state = api.getGridState();   // sort, filters, columns, grouping, pagination
localStorage.setItem('grid', JSON.stringify(state));
api.setGridState(JSON.parse(localStorage.getItem('grid')!));
\`\`\``,
};

const PIVOT: KnowledgeArticle = {
  id: 'pivot',
  title: 'Pivot-style analysis',
  keywords: ['pivot', 'crosstab', 'cross tab', 'matrix'],
  body: `Photon Grid approaches pivot-style analysis through **row grouping plus aggregation** rather than a separate pivot mode.

\`\`\`ts
const columns = [
  { colId: 'region', field: 'region', header: 'Region', groupable: true },
  { colId: 'category', field: 'category', header: 'Category', groupable: true },
  { colId: 'revenue', field: 'revenue', header: 'Revenue', type: 'currency', aggFunc: 'sum' },
];

createGrid('#grid', { columns, data, showGroupingBar: true });
api.groupByColumns(['region', 'category']);   // rows become the pivot axis
\`\`\`

Grouping by two columns gives you the row axis of a pivot table with subtotals at every level; the aggregated measure columns give you the values. A dedicated column-axis pivot (values spread across generated columns) is on the roadmap — for a true cross-tab today, pre-shape the data server-side into one column per bucket.`,
};

const VALIDATION: KnowledgeArticle = {
  id: 'validation',
  title: 'Cell editing and validation',
  keywords: ['validation', 'validate', 'editing', 'editable', 'rules', 'required', 'invalid'],
  body: `\`\`\`ts
const columns = [
  {
    colId: 'email', field: 'email', header: 'Email', type: 'string', editable: true,
    // Return true to accept, or a string to reject with a message.
    validator: (value) =>
      /^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$/.test(String(value)) || 'Enter a valid email address',
  },
  {
    colId: 'qty', field: 'qty', header: 'Qty', type: 'number', editable: true,
    validator: (value) => Number(value) >= 0 || 'Quantity cannot be negative',
  },
];

createGrid('#grid', { columns, data, editing: { enabled: true } });
\`\`\`

Rejected edits keep the editor open and surface the message, so the original value is never silently lost.`,
};

/** Every article, in retrieval order. */
export const KNOWLEDGE_ARTICLES: readonly KnowledgeArticle[] = [
  INSTALL,
  QUICKSTART_VANILLA,
  QUICKSTART_ANGULAR,
  QUICKSTART_REACT,
  QUICKSTART_VUE,
  RENDERERS,
  VIRTUAL_SCROLLING,
  SERVER_SIDE,
  GROUPING,
  FILTERING,
  FORMULAS,
  PERFORMANCE,
  ACCESSIBILITY,
  THEMING,
  EXPORT,
  STATE,
  PIVOT,
  VALIDATION,
];
