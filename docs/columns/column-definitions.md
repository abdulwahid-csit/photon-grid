---
title: "Column Definitions"
description: "The complete Photon Grid ColumnDef reference — every column property explained with examples: field, type, width, flex, pinning, sorting, filtering, editing, validation, formatting, custom renderers, summaries, and column groups."
keywords:
  - photon grid column definition
  - ColumnDef reference
  - data grid columns
  - column field type width flex
  - column pinning sorting filtering
  - editable columns validation
  - custom cell renderer
  - column configuration javascript grid
---

# Column Definitions

Columns are the heart of Photon Grid. Every column is described by a
**column definition** — a plain object in the `columns` array — that controls
which data field it reads, how its cells render, and which features
(sorting, filtering, editing, pinning, grouping…) are enabled.

Column definitions are **identical across every framework** (Vanilla JS, React,
Angular, and Vue), so everything on this page applies everywhere.

## The minimum column

Only `field` is required. Everything else is optional and filled in with sensible
defaults during normalization:

```js
const columns = [
  { field: "name" },       // header → "Name", type → "string", colId auto-generated
  { field: "email" },
  { field: "salary" }
];
```

| Omitted property | Default |
|------------------|---------|
| `colId` | `col_<field>_<index>` |
| `header` | the `field` in Title Case |
| `type` | `"string"` |

:::tip Author-friendly input
The `columns` option accepts `ColumnDefInput` — the author-friendly shape where
only `field` is required. Internally the grid normalizes each entry to a full
`ColumnDef`. In practice you set `field`, `header`, `colId`, and `type` explicitly
for clarity and stable ids.
:::

A fuller, explicit definition:

```js
const columns = [
  {
    colId: "salary",
    field: "salary",
    header: "Annual Salary",
    type: "currency",
    width: 140,
    textAlign: "right",
    sortable: true,
    editable: true
  }
];
```

<FrameworkTabs>
<TabItem value="vanilla" label="Vanilla JS">

```js
new PhotonGrid.GridCore(document.getElementById("grid"), {
  columns,
  data: rowData
});
```

</TabItem>
<TabItem value="react" label="React">

```tsx
import { PhotonGrid } from 'photon-grid-react';

export function App() {
  return (
    <div style={{ width: '100%', height: 500 }}>
      <PhotonGrid columns={columns} dataSet={rowData} />
    </div>
  );
}
```

</TabItem>
<TabItem value="angular" label="Angular">

```ts
import { Component } from '@angular/core';
import { PhotonGridComponent } from 'photon-grid-angular';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [PhotonGridComponent],
  template: `
    <div style="width: 100%; height: 500px;">
      <photon-grid [columns]="columns" [dataSet]="rowData"></photon-grid>
    </div>
  `,
})
export class AppComponent {
  columns = columns;
  rowData = rowData;
}
```

</TabItem>
<TabItem value="vue" label="Vue">

```vue
<script setup lang="ts">
import { PhotonGrid } from 'photon-grid-vue';
</script>

<template>
  <div style="width: 100%; height: 500px;">
    <PhotonGrid :columns="columns" :dataSet="rowData" />
  </div>
</template>
```

</TabItem>
</FrameworkTabs>

## Identity & data

| Property | Type | Description |
|----------|------|-------------|
| `field` | `string` | **Required.** Key on the row object this column reads and writes. |
| `colId` | `string` | Stable, unique column id used by the API and saved state. Defaults to `col_<field>_<index>`. |
| `header` | `string` | Header label. Defaults to `field` in Title Case. |
| `type` | `ColumnDataType` | How cells are rendered and edited. Defaults to `"string"`. See [Column Types](./column-types.md). |

```js
const columns = [
  { colId: "id",    field: "id",       header: "#",         type: "number" },
  { colId: "name",  field: "fullName", header: "Employee",  type: "string" },
  { colId: "start", field: "startDate", header: "Start Date", type: "date" }
];

const rowData = [
  { id: 1, fullName: "John Smith",   startDate: "2021-03-14" },
  { id: 2, fullName: "Sarah Johnson", startDate: "2019-11-02" }
];
```

## Sizing

Control column width with a fixed `width`, a flexible `flex`, and hard bounds.
See [Column Widths](./column-widths.md) for the full guide.

| Property | Type | Description |
|----------|------|-------------|
| `width` | `number` | Fixed initial width in pixels. |
| `minWidth` | `number` | Minimum width the column can shrink to. |
| `maxWidth` | `number` | Maximum width the column can grow to. |
| `flex` | `number` | Proportional width — the column grows to fill remaining space (like CSS `flex-grow`). |

```js
const columns = [
  { field: "id",      header: "ID",       width: 80 },              // fixed
  { field: "name",    header: "Name",     flex: 2, minWidth: 160 }, // grows 2×
  { field: "email",   header: "Email",    flex: 1, minWidth: 200 }, // grows 1×
  { field: "country", header: "Country",  width: 120, maxWidth: 160 }
];
```

## Behavior flags

Toggle per-column features. All are booleans.

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `sortable` | `boolean` | `true` | Allow sorting by clicking the header. |
| `filterable` | `boolean` | `true` | Allow filtering. See [Column Filter](./column-filter.md). |
| `resizable` | `boolean` | `true` | Allow the user to drag-resize the column. |
| `draggable` | `boolean` | `true` | Allow reordering the column by dragging. See [Column Moving](./column-moving.md). |
| `editable` | `boolean` | `false` | Allow in-cell editing. |
| `locked` | `boolean` | `false` | Lock the column — cells cannot be edited regardless of `editable`. Toggled by the column menu's "Lock Column". |
| `groupable` | `boolean` | `true` | Allow grouping rows by this column. |
| `rowDrag` | `boolean` | `false` | Show a row-drag handle in this column for reordering rows. |
| `visible` | `boolean` | `true` | Whether the column is shown. See [Column Hiding](./column-hiding.md). |
| `alwaysVisible` | `boolean` | `false` | Prevent the column from being hidden (e.g. by "hide all columns"). |

```js
const columns = [
  { field: "id",     header: "ID",       sortable: false, editable: false, alwaysVisible: true },
  { field: "name",   header: "Name",     rowDrag: true },
  { field: "status", header: "Status",   editable: true },
  { field: "notes",  header: "Notes",    filterable: false, sortable: false }
];
```

## Pinning

Freeze a column to the left or right edge so it stays visible while scrolling.
See [Column Freezing](./column-freezing.md).

| Property | Type | Description |
|----------|------|-------------|
| `pinned` | `'left' \| 'right' \| null` | Pin side, or `null` (default) to leave it unpinned. |

```js
const columns = [
  { field: "id",     header: "ID",      pinned: "left",  width: 70 },
  { field: "name",   header: "Employee", pinned: "left",  width: 200 },
  { field: "dept",   header: "Department" },
  { field: "actions", header: "",        pinned: "right", width: 90 }
];
```

## Alignment & styling

| Property | Type | Description |
|----------|------|-------------|
| `textAlign` | `'left' \| 'center' \| 'right'` | Horizontal alignment of cell content. |
| `headerCssClass` | `string` | CSS class added to the header cell. |
| `cellCssClass` | `string \| (params) => string` | CSS class added to every data cell — a fixed string, or a function returning a class per row. |
| `renderHtml` | `boolean` | When `true`, string cell values are treated as HTML instead of plain text. |

```js
const columns = [
  { field: "salary", header: "Salary", type: "currency", textAlign: "right",
    headerCssClass: "col-emphasis" },

  // Conditional cell class based on the row's value:
  { field: "score", header: "Score", type: "number",
    cellCssClass: ({ value }) => Number(value) >= 90 ? "cell-pass" : "cell-fail" }
];
```

:::caution `renderHtml`
Only enable `renderHtml` for trusted content. Rendering untrusted strings as HTML
exposes your app to XSS. Prefer a [custom `renderer.display`](#custom-rendering)
that builds DOM nodes for rich cells.
:::

## Header action icons

Control when the filter funnel and the column-menu "⋯" icon appear in a column's
header. Overrides the grid-level `headerIcons` default.

| Property | Type | Values | Description |
|----------|------|--------|-------------|
| `filterIconDisplay` | `HeaderIconDisplay` | `hover` · `always` · `hidden` | When the filter funnel shows (on filterable columns). |
| `menuIconDisplay` | `HeaderIconDisplay` | `hover` · `always` · `hidden` | When the column-menu "⋯" icon shows. |

```js
const columns = [
  // Always show the funnel; hide the "⋯" menu button on this column.
  { field: "status", header: "Status",
    filterIconDisplay: "always", menuIconDisplay: "hidden" }
];
```

`HeaderIconDisplay` values: `hover` (reveal on hover — default), `always`
(permanently visible), `hidden` (never render the button; the feature stays
available via the filter row / header right-click). See [Column Menu](./column-menu.md).

## Editing & validation

Turn on editing with `editable`, then constrain input with validation rules.

| Property | Type | Description |
|----------|------|-------------|
| `editable` | `boolean` | Allow in-cell editing for this column. |
| `required` | `boolean` | Value must not be empty. |
| `min` | `number \| null` | Minimum allowed value (for `number` / `currency` / `percentage`). |
| `max` | `number \| null` | Maximum allowed value. |
| `validatorFn` | `(value) => string \| null` | Custom validator. Return an error message string, or `null` when valid. |

```js
const columns = [
  { field: "name", header: "Name", editable: true, required: true },

  { field: "age", header: "Age", type: "number", editable: true, min: 18, max: 99 },

  { field: "email", header: "Email", type: "email", editable: true,
    validatorFn: (value) =>
      /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(value)) ? null : "Enter a valid email"
  }
];
```

## Value options (dropdown / enum / object)

For columns that pick from a set of values.

| Property | Type | Description |
|----------|------|-------------|
| `dropdownOptions` | `ColumnDropdownOption[]` | Options for `dropdown` columns — each `{ value, label, color?, icon?, image? }`. |
| `enumOptions` | `string[]` | Simple string options (shorthand for a set of labels). |
| `objectValueKey` | `string` | For `object`-type columns: the property on the value object matched against `dropdownOptions[].value`. Defaults to `"value"`. |

```js
const columns = [
  {
    field: "status", header: "Status", type: "dropdown", editable: true,
    dropdownOptions: [
      { value: "active",   label: "Active",   color: "#16a34a" },
      { value: "pending",  label: "Pending",  color: "#d97706" },
      { value: "archived", label: "Archived", color: "#64748b" }
    ]
  },
  {
    field: "priority", header: "Priority", type: "dropdown", editable: true,
    enumOptions: ["Low", "Medium", "High", "Critical"]
  }
];

const rowData = [
  { status: "active",  priority: "High" },
  { status: "pending", priority: "Low" }
];
```

See [Column Types](./column-types.md#dropdown) for more on option columns.

## Formatting

| Property | Type | Description |
|----------|------|-------------|
| `isCurrency` | `boolean` | Format a numeric column as currency (alternative to `type: 'currency'`). |
| `dateFormat` | `string` | Date format string for `date` / `time` columns (overrides the grid default). |

```js
const columns = [
  { field: "price", header: "Price", type: "number", isCurrency: true },
  { field: "createdAt", header: "Created", type: "date", dateFormat: "DD MMM YYYY" }
];
```

## Summaries & aggregation

Show an aggregate value in the footer, and aggregate values inside group rows.
See [Column Summary](./column-summary.md).

| Property | Type | Description |
|----------|------|-------------|
| `showSummary` | `boolean` | Show an aggregate for this column in the footer/summary row. |
| `summaryAggregation` | `'sum' \| 'avg' \| 'min' \| 'max' \| 'count' \| 'none'` | Which aggregate to display in the summary row. |
| `summaryLabel` | `string` | Custom label shown beside the summary value. |
| `aggFunc` | `'sum' \| 'avg' \| 'min' \| 'max' \| 'count'` | Aggregation applied inside group rows. Only honored for `currency` / `number` columns. |

```js
const columns = [
  { field: "region", header: "Region", groupable: true },
  { field: "revenue", header: "Revenue", type: "currency",
    aggFunc: "sum", showSummary: true, summaryAggregation: "sum", summaryLabel: "Total" },
  { field: "margin", header: "Margin %", type: "percentage",
    aggFunc: "avg", showSummary: true, summaryAggregation: "avg" }
];
```

## Custom rendering

The `renderer` map overrides how a column is drawn, edited, or described. Every
slot is independently optional — an absent slot falls back to the built-in
rendering, so you can override just one aspect.

| Slot | Purpose |
|------|---------|
| `display` | How a data cell's value is drawn. |
| `editor` | The cell's edit widget. |
| `option` | One row in a dropdown / set-filter option list. |
| `filter` | The full filter-panel body for the column. |
| `tooltip` | Content shown when hovering a cell. |
| `group` | The label of a group-header row for this column. |
| `header` | The header cell's content. |
| `summary` | The aggregate/summary cell's content. |

Each slot is a function that returns an `HTMLElement` or an HTML string.

```js
const columns = [
  {
    field: "name", header: "Employee", flex: 1,
    renderer: {
      // Draw an avatar + name. `p.value` is the cell value; `p.row` the row.
      display: (p) => {
        const wrap = document.createElement("div");
        wrap.className = "person";
        wrap.innerHTML =
          `<strong>${p.value}</strong><small>${p.row.email ?? ""}</small>`;
        return wrap;
      }
    }
  },
  {
    field: "change", header: "Change", type: "number", width: 110,
    renderer: {
      display: (p) => {
        const v = Number(p.value);
        const el = document.createElement("span");
        el.className = v >= 0 ? "up" : "down";
        el.textContent = (v >= 0 ? "▲ " : "▼ ") + Math.abs(v).toFixed(2) + "%";
        return el;
      }
    }
  }
];
```

The `display` renderer receives `DisplayRendererParams`:

| Field | Type | Description |
|-------|------|-------------|
| `value` | `unknown` | The cell's (formatted) value. |
| `rawValue` | `unknown` | The unformatted underlying value. |
| `row` | `object` | The full row data object. |
| `colDef` | `ColumnDef` | This column's definition. |
| `rowIndex` | `number` | Zero-based row index. |
| `colIndex` | `number` | Zero-based column index. |
| `api` | `GridApi` | The grid API. |

<LiveGrid preset="richCells" height={360} title="Custom display renderers — avatars, badges, and formatted numbers" />

## Column groups

A column becomes a **column group** (a multi-row header) when it has a `children`
array instead of reading a data field. See [Column Groups](./column-groups.md).

| Property | Type | Description |
|----------|------|-------------|
| `children` | `ColumnDef[]` | Child columns. Presence makes this a group header. Nestable to any depth. |
| `openByDefault` | `boolean` | Group renders expanded on first load. Default `true`. |
| `marryChildren` | `boolean` | Child columns cannot be dragged out of the group individually. Default `false`. |
| `collapsedWidth` | `number` | Pixel width of the group header when collapsed. Default `26`. |
| `groupResizeStrategy` | `ColumnGroupResizeStrategy` | How resize pixels are shared among children: `proportional` (default), `equal`, `firstFixed`, `lastFixed`. |
| `groupHeaderRendererFn` | `(params) => HTMLElement \| string` | Custom group-header cell renderer. |

```js
const columns = [
  { field: "name", header: "Employee", pinned: "left", width: 200 },
  {
    header: "Compensation",
    marryChildren: true,
    children: [
      { field: "salary", header: "Base",  type: "currency" },
      { field: "bonus",  header: "Bonus", type: "currency" }
    ]
  },
  {
    header: "Contact",
    openByDefault: false,
    children: [
      { field: "email", header: "Email", type: "email" },
      { field: "phone", header: "Phone" }
    ]
  }
];
```

## Sparklines

Render a mini inline chart from an array cell value with `type: 'sparkline'` plus
a `sparkline` config. See the [Sparklines](../sparklines/overview.md) section.

| Property | Type | Description |
|----------|------|-------------|
| `sparkline` | `SparklineConfig` | Chart config — `type` (`line`/`area`/`bar`/`column`/`win-loss`/`candlestick`/`ohlc`), `stroke`, `fill`, `lineWidth`, `showMarkers`, and more. |

```js
const columns = [
  { field: "name", header: "Metric", flex: 1 },
  {
    field: "history", header: "Last 12 months", width: 180,
    type: "sparkline",
    sparkline: { type: "area", stroke: "#2563eb", showMarkers: true }
  }
];

const rowData = [
  { name: "Sessions", history: [12, 18, 9, 22, 31, 27, 40, 38, 52, 61, 55, 70] },
  { name: "Signups",  history: [3, 5, 4, 7, 6, 9, 8, 12, 14, 11, 15, 19] }
];
```

## Runtime state properties

These reflect live state and are usually managed by the grid, not set by hand:

| Property | Type | Description |
|----------|------|-------------|
| `sortOrder` | `'asc' \| 'desc' \| null` | The column's current sort direction. |
| `filterActive` | `boolean` | Whether the column currently has an active filter. |

To read or restore column layout (width, visibility, pinning, order), use
`ColumnState` via the grid API rather than mutating these fields directly.

## Full property index

| Property | Type | Category |
|----------|------|----------|
| `field` | `string` | Identity |
| `colId` | `string` | Identity |
| `header` | `string` | Identity |
| `type` | `ColumnDataType` | Identity |
| `width` · `minWidth` · `maxWidth` · `flex` | `number` | Sizing |
| `pinned` | `'left' \| 'right' \| null` | Pinning |
| `sortable` · `filterable` · `resizable` · `draggable` · `editable` · `locked` · `groupable` · `rowDrag` · `visible` · `alwaysVisible` | `boolean` | Behavior |
| `filterIconDisplay` · `menuIconDisplay` | `HeaderIconDisplay` | Header icons |
| `textAlign` | `'left' \| 'center' \| 'right'` | Styling |
| `headerCssClass` | `string` | Styling |
| `cellCssClass` | `string \| fn` | Styling |
| `renderHtml` | `boolean` | Styling |
| `required` · `min` · `max` · `validatorFn` | validation | Editing |
| `dropdownOptions` · `enumOptions` · `objectValueKey` | options | Values |
| `isCurrency` · `dateFormat` | formatting | Formatting |
| `showSummary` · `summaryAggregation` · `summaryLabel` · `aggFunc` | aggregation | Summaries |
| `renderer` | `ColumnRendererMap` | Rendering |
| `children` · `openByDefault` · `marryChildren` · `collapsedWidth` · `groupResizeStrategy` · `groupHeaderRendererFn` | group | Column groups |
| `sparkline` | `SparklineConfig` | Sparklines |
| `sortOrder` · `filterActive` | runtime state | State |

## Next steps

- [Column Types](./column-types.md) — every `type` value with example data.
- [Column Widths](./column-widths.md) · [Column Freezing](./column-freezing.md) · [Column Hiding](./column-hiding.md)
- [Column Groups](./column-groups.md) · [Column Summary](./column-summary.md)
- [Configuration options](../getting-started/configuration-options.md) — grid-level options.
