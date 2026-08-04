# Summary Rows

Configurable aggregate rows docked above and/or below the grid body — grand
totals, page subtotals, "selected rows" running counts — with per-cell control
over value, aggregation, formatting, rendering, styling, span and tooltip.

Framework-agnostic end to end. The calculation half reads the grid only through
a port interface; the render half is plain DOM driven by the grid's own frame.
The Angular, React and Vue wrappers need no summary-specific code — they pass
`GridOptions.summary` through and call the same `GridApi` methods.

---

## Quick start

```ts
import { GridCore, SummaryAggregation, SummaryPosition, SummaryScope } from 'photon-grid-core';

new GridCore(el, {
  columns,
  data,
  summary: {
    position: SummaryPosition.Bottom,
    rows: [
      {
        id: 'total',
        label: 'Total',
        cells: {
          quantity: { aggregate: SummaryAggregation.Sum },
          price:    { aggregate: SummaryAggregation.Avg },
        },
      },
    ],
  },
});
```

With no `rows`, a single total row is derived from any columns declaring
`ColumnDef.showSummary` — so the long-standing per-column properties work with
no further setup:

```ts
columns: [
  { field: 'quantity', showSummary: true },                                  // sum
  { field: 'price',    showSummary: true, summaryAggregation: 'avg',
                       summaryLabel: 'Avg' },                                // "Avg: 12.50"
],
summary: {},
```

---

## Architecture

```text
  GridOptions.summary
         │
         ▼
  SummaryModel ───────────── definitions: which rows, where, what scope
         │
         ▼
  SummaryService ─┬───────── SummaryAggregationEngine   (sum/avg/…/custom)
         │        └───────── SummaryDataPort            (rows, columns, API)
         ▼
  SummaryRowSnapshot[] ───── GridApi.getSummary()
         │
         ▼
  SummaryRowRenderer ─────── one band per (top|bottom) × (sticky|inline)
```

| Module | Responsibility |
|---|---|
| `summary.types.ts` | Every public contract. Plain data and pure function signatures — no DOM. |
| `aggregation-engine.ts` | `SummaryAggregationEngine`: the seven built-ins plus a per-grid custom registry. |
| `summary-model.ts` | `SummaryModel`: definitions, id assignment, mutation, band bucketing, computed snapshots. |
| `summary-service.ts` | `SummaryService`: scope resolution → value extraction → cell computation. |
| `summary-data-port.ts` | `SummaryDataPort`: the only thing the calculation half knows about the grid. |
| `summary-row-renderer.ts` | `SummaryRowRenderer`: one band's DOM, built once and patched thereafter. |

Styling lives in `src/styles/base/summary.css.ts` and resolves entirely through
`--pg-*` theme tokens.

---

## Configuration

### `SummaryConfig` (`GridOptions.summary`)

| Property | Default | Description |
|---|---|---|
| `enabled` | `true` | Master switch. |
| `position` | `Bottom` | Default band: `Top`, `Bottom` or `Both`. |
| `sticky` | `true` | Default anchoring — see [Sticky vs in-content](#sticky-vs-in-content). |
| `scope` | `Filtered` | Default row set — see [Scopes](#scopes). |
| `height` | `GridOptions.rowHeight` | Default row height in px. |
| `autoRefresh` | `true` | Recompute automatically on every relevant change. |
| `aggregations` | — | Named custom aggregations. |
| `rows` | derived | The summary rows. Omit to derive from `ColumnDef.showSummary`. |

### `SummaryRowDef`

`id`, `position`, `sticky`, `scope`, `label`, `height`, `className`,
`defaultAggregate`, `cells`. Each policy property overrides the grid-wide
default for that row.

### `SummaryCellDef`

| Property | Description |
|---|---|
| `value` | A fixed value or a function. **Takes precedence over `aggregate`.** |
| `aggregate` | Built-in name, registered name, or an inline function. |
| `formatter` | Receives `defaultFormattedValue` so it can decorate the column's own formatting. |
| `renderer` | Owns the cell's content entirely. The wrappers mount components here. |
| `className` | Extra class(es) — the preferred styling route. |
| `style` | Inline declarations, as an escape hatch for data-driven values. |
| `colSpan` | Columns covered, clamped to the cell's pinned region. |
| `tooltip` | Static text or a function of the computed value. |

Value precedence: `value` → `aggregate` → row's `defaultAggregate` → empty.
`ColumnDef.summaryAggregation` is deliberately *not* in that chain — it only
drives the derived row, so an explicitly configured summary shows exactly the
cells it declares.

---

## Scopes

| Scope | Rows aggregated |
|---|---|
| `All` | Every row, ignoring filters, pagination and grouping. |
| `Filtered` | Rows surviving column filters and the quick filter, pre-pagination. **Default.** |
| `Visible` | The currently displayed rows — after pagination and grouping. |
| `Selected` | The current selection. Empty aggregates when nothing is selected. |

Group and detail rows are excluded from every scope: they carry no source data,
and counting them would inflate `count` and skew `avg`.

Rows with different scopes coexist freely:

```ts
rows: [
  { id: 'page',  label: 'Page',  scope: SummaryScope.Visible,  cells: { amount: { aggregate: 'sum' } } },
  { id: 'sel',   label: 'Selected', scope: SummaryScope.Selected, cells: { amount: { aggregate: 'sum' } } },
  { id: 'total', label: 'Total', scope: SummaryScope.Filtered, cells: { amount: { aggregate: 'sum' } } },
]
```

---

## Sticky vs in-content

`sticky: true` (the default) docks the band outside the scrolling viewport, like
the header — always visible.

`sticky: false` places the band at the very start (top) or end (bottom) of the
scrollable content, where it scrolls out of view like a regular row. Such a band
occupies **real scroll space**: its height extends the scrollable total, and a
top band offsets every data row down past it. Both bands can coexist on the same
edge — a docked grand total above an in-content subtotal, for instance.

---

## Aggregations

`sum`, `avg`, `min`, `max`, `count`, `first`, `last`.

Numeric aggregations coerce with deliberate strictness: `null`, `undefined`,
`''` and whitespace are skipped rather than treated as `0`, and booleans are
skipped rather than treated as `1`, so a column mixing numbers with blanks
averages the numbers instead of being dragged toward zero. `Date` values reduce
to epoch milliseconds, so `min`/`max` work on date columns.

Custom aggregations register by name or inline:

```ts
summary: {
  aggregations: {
    median: ({ values }) => {
      const nums = values.map(Number).filter(Number.isFinite).sort((a, b) => a - b);
      if (!nums.length) return null;
      const mid = nums.length >> 1;
      return nums.length % 2 ? nums[mid] : (nums[mid - 1] + nums[mid]) / 2;
    },
  },
  rows: [{ cells: { latency: { aggregate: 'median' } } }],
}
```

`gridApi.registerSummaryAggregation(name, fn)` does the same at runtime.

---

## API

| Method | Description |
|---|---|
| `refreshSummary()` | Recompute and repaint now. |
| `getSummary()` / `getSummary(rowId)` | Read the last computed snapshots. |
| `setSummaryRows(rows)` | Replace every definition. |
| `updateSummaryRow(rowId, patch)` | Shallow-merge a patch (`cells` merges one level deep). |
| `removeSummaryRow(rowId)` | Remove one row. |
| `registerSummaryAggregation(name, fn)` | Register a named aggregation at runtime. |

### Events

- `SUMMARY_CHANGED` — values were recomputed. Emitted after the new values are
  stored and before the bands repaint, so a listener reading `getSummary()` sees
  what is about to appear.
- `SUMMARY_ROWS_CHANGED` — the *definitions* changed. A definition change emits
  this first, then `SUMMARY_CHANGED`.

---

## Automatic refresh

With `autoRefresh: true` (the default), summaries recompute after:

- the row pipeline runs — data, filters, sorting, grouping, pagination;
- a cell edit (`CELL_VALUE_CHANGED`), which patches cells without a pipeline run;
- a selection change, **only** when some row scopes to `Selected`.

Set `autoRefresh: false` to take manual control via `refreshSummary()` — useful
when a very large data set is mutated in bursts and one recompute at the end is
enough.

---

## Performance notes

- **Scope row-sets resolve once per distinct scope per refresh.** Ten rows all
  scoped `Filtered` share one filter pass.
- **Column value arrays are extracted once per `(scope, column)` pair** and
  shared by every cell that reads them. Three rows totalling the same column
  scan it once, not three times.
- **Extraction is lazy.** A cell with a static `value` triggers no row scan at
  all, so a label column costs nothing over a million rows.
- **The renderer patches, it does not rebuild.** A full rebuild happens only when
  the band's *structure* changes — the row set, a region's columns, the virtual
  column window, the gutters. A value-only refresh writes `textContent` on
  existing nodes.
- **Every built-in is a single pass with no intermediate allocation** — no
  `filter().map()` chains, and no `Math.min(...values)` spread, which throws
  `RangeError` past roughly 100k values.
- **Custom-renderer params are built by a factory, not retained.** The factory
  closes over the scope rows (a reference the grid already holds) and never over
  the compute pass's value cache, so no materialized array outlives its frame.

---

## Grid integration

Four grid features need no summary-specific code, because a band mirrors the
header's three-panel structure and reuses the same CSS variables:

| Feature | Mechanism |
|---|---|
| Column pinning | `--pg-left-panel-width` / `--pg-right-panel-width` |
| Horizontal scrolling | `translateX(var(--pg-scroll-x))` on the center region |
| Column resizing | Cells carry `data-col-id`; `ColumnStyleManager`'s generated width rules apply |
| Column visibility | Hidden columns are simply absent from the column lists |

Horizontal column virtualization is honoured: a band renders the same visible
center window and spacer widths as the header. The one exception is `colSpan` —
a band containing a span renders every center column instead, since the window's
edge could otherwise fall in the middle of a spanned cell. Total center width is
unchanged (the spacers go to zero), so alignment holds either way.

---

## Accessibility

Each band is a `role="rowgroup"` with an `aria-label` naming its edge; rows are
`role="row"` and cells `role="gridcell"`. Spanned cells carry `aria-colspan`.
Tooltips use the `title` attribute, so they need no listener and are reachable by
assistive technology. Summary rows sit outside the data rows' index sequence, so
they never disturb row counting.

---

## Testing

`tests/summary/` — 94 specs across four suites:

| Suite | Covers |
|---|---|
| `aggregation-engine.test.ts` | Built-in semantics, coercion edge cases, the registry, 500k-element arrays. |
| `summary-model.test.ts` | Default resolution, id assignment, band bucketing, mutation, column derivation. |
| `summary-service.test.ts` | Scopes, caching (asserted via call counts), cell precedence, formatting, spans. |
| `summary-row-renderer.test.ts` | Region structure, gutters, spacers, `colSpan` clamping, patch-vs-rebuild. |

---

## Troubleshooting

**Summary row does not appear.** Check that `summary.enabled` is not `false`, and
that the row has at least one cell — a row whose `cells` is empty and whose
`defaultAggregate` and `label` are both unset renders nothing.

**Values do not update.** If `autoRefresh` is `false`, call `refreshSummary()`.
If it is `true` and you mutated `RowNode.data` directly, the grid cannot observe
that write — call `refreshSummary()`, or route the change through
`applyTransaction`.

**Cells misaligned with columns.** A cell only aligns when its key is a real
`colId`. Keys that match no column are still rendered (useful for gutters) but
have no width rule of their own.

**A `colSpan` looks wrong at the region edge.** Spans are clamped to their pinned
region by design — the three regions are separate DOM subtrees, so a cell cannot
stretch from the left pinned panel into the center.

**`avg` returns `null`.** That is the empty-scope result, distinct from `0`. It
also appears when no value in the column coerces to a finite number.
