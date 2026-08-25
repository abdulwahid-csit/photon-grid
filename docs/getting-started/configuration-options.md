---
title: "Configuration options"
description: "The complete reference for Photon Grid's GridOptions — data, appearance, theming, selection, editing, pagination, and more."
---

# Configuration options

Photon Grid is configured with a single **options object**. In Vanilla JS it is
the second argument to `new PhotonGrid.GridCore(el, options)`; in the framework
wrappers the same object is passed through the `options` prop (with `columns`
and `dataSet` supplied as their own props).

Only `columns` is required — every other option has a sensible default.

## Passing options

<FrameworkTabs>
<TabItem value="vanilla" label="Vanilla JS">

```js
new PhotonGrid.GridCore(document.getElementById("grid"), {
  columns,
  data: rowData,

  // appearance
  mode: "light",
  rowHeight: 42,
  headerRowHeight: 48,
  rowShading: true,

  // features
  selection: { mode: "multiple", checkboxSelection: true },
  editing: { mode: "cell", singleClickEdit: false },
  pagination: { enabled: true, pageSize: 100 }
});
```

</TabItem>
<TabItem value="react" label="React">

```tsx
import { PhotonGrid } from 'photon-grid-react';

export function App() {
  return (
    <div style={{ width: '100%', height: 500 }}>
      <PhotonGrid
        columns={columns}
        dataSet={rowData}
        options={{
          mode: 'light',
          rowHeight: 42,
          headerRowHeight: 48,
          rowShading: true,
          selection: { mode: 'multiple', checkboxSelection: true },
          editing: { mode: 'cell', singleClickEdit: false },
          pagination: { enabled: true, pageSize: 100 },
        }}
      />
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
      <photon-grid [columns]="columns" [dataSet]="rowData" [options]="options"></photon-grid>
    </div>
  `,
})
export class AppComponent {
  columns = columns;
  rowData = rowData;
  options = {
    mode: 'light',
    rowHeight: 42,
    headerRowHeight: 48,
    rowShading: true,
    selection: { mode: 'multiple', checkboxSelection: true },
    editing: { mode: 'cell', singleClickEdit: false },
    pagination: { enabled: true, pageSize: 100 },
  };
}
```

</TabItem>
<TabItem value="vue" label="Vue">

```vue
<script setup lang="ts">
import { PhotonGrid } from 'photon-grid-vue';

const options = {
  mode: 'light',
  rowHeight: 42,
  headerRowHeight: 48,
  rowShading: true,
  selection: { mode: 'multiple', checkboxSelection: true },
  editing: { mode: 'cell', singleClickEdit: false },
  pagination: { enabled: true, pageSize: 100 },
};
</script>

<template>
  <div style="width: 100%; height: 500px;">
    <PhotonGrid :columns="columns" :dataSet="rowData" :options="options" />
  </div>
</template>
```

</TabItem>
</FrameworkTabs>

## Data

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `columns` | `ColumnDef[]` | — | **Required.** Column definitions. Only `field` is required per column. |
| `data` | `Record<string, unknown>[]` | `[]` | The row data. Each row is a plain object keyed by column `field`. |
| `locale` | `string` | browser | Locale used for number, date, and currency formatting. |
| `dateFormat` | `string` | — | Default date format applied to `date` columns. |
| `timeZone` | `string` | — | Time zone used when formatting date/time values. |
| `currencySymbol` | `string` | — | Symbol used for `currency` columns. |

## Appearance & layout

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `rowHeight` | `number` | `42` | Height of a data row, in pixels. |
| `rowHeightMode` | `'fixed' \| 'auto'` | `'fixed'` | Fixed row height, or auto-size to content. |
| `headerRowHeight` | `number` | — | Height of the header row. |
| `footerRowHeight` | `number` | — | Height of the footer/summary row. |
| `filterRowHeight` | `number` | — | Height of the inline filter row. |
| `rowShading` | `boolean` | `false` | Zebra striping on alternating rows. |
| `showVerticalBorders` | `boolean` | — | Show vertical cell borders. |
| `showHorizontalBorders` | `boolean` | — | Show horizontal cell borders. |
| `animateRows` | `boolean` | `true` | FLIP/slide animations on sort, filter, and expand. Set `false` for reduced motion or high-frequency updates. |

## Chrome & toolbars

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `showSerialNumber` | `boolean` | — | Show the serial-number (`#`) column. |
| `showCheckboxes` | `boolean` | — | Show row-selection checkboxes. |
| `showTopBar` | `boolean` | — | Show the top toolbar. |
| `showFooter` | `boolean` | — | Show the footer/summary bar. |
| `showColumnMenu` | `boolean` | — | Enable the per-column `⋯` menu. |
| `showFilterRow` | `boolean` | — | Show the inline filter row. |
| `showSidePanel` | `boolean` | — | Show the side tool panel. |
| `showFullScreen` | `boolean` | — | Show the full-screen toggle. |
| `headerIcons` | `HeaderIconsConfig` | — | When the header filter/menu icons appear (`hover`, `always`, or `hidden`). |

## Theming

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `mode` | `'light' \| 'dark'` | `'light'` | Base color mode — drives the entire palette. |
| `variant` | `ThemeVariant` | — | Cosmetic skin (density, radii, typography, accent) layered on top of `mode`; works in both light and dark. |

```js
new PhotonGrid.GridCore(el, {
  columns,
  data: rowData,
  mode: "dark",
  variant: "quartz"
});
```

:::note
`theme` is a deprecated legacy option. Prefer `mode` + `variant`.
:::

## Selection

The `selection` option accepts a partial `SelectionConfig`:

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `mode` | `'single' \| 'multiple' \| 'none'` | `'none'` | Row selection mode. |
| `checkboxSelection` | `boolean` | `false` | Show a checkbox in each row for selection. |
| `headerCheckbox` | `boolean` | `false` | Show a select-all checkbox in the header. |
| `selectAllOnHeaderClick` | `boolean` | `false` | Clicking the header selects all rows. |
| `suppressRowDeselection` | `boolean` | `false` | Prevent deselecting a row by re-clicking it. |

```js
selection: {
  mode: "multiple",
  checkboxSelection: true,
  headerCheckbox: true
}
```

## Editing

The `editing` option accepts a partial `EditingConfig`:

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `mode` | `'cell' \| 'row' \| 'none'` | `'cell'` | Edit one cell at a time, a whole row, or disable editing. |
| `singleClickEdit` | `boolean` | `false` | Activate the editor on a single click instead of double-click. |
| `stopEditingWhenCellsLoseFocus` | `boolean` | `true` | Commit and close the editor when the grid loses focus. |

```js
editing: {
  mode: "cell",
  singleClickEdit: true,
  stopEditingWhenCellsLoseFocus: true
}
```

## Pagination

The `pagination` option accepts a partial `PaginationConfig`:

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `enabled` | `boolean` | `false` | Turn pagination on. |
| `page` | `number` | `0` | Initial page index (zero-based). |
| `pageSize` | `number` | — | Rows per page. |
| `pageSizeOptions` | `number[]` | — | Page-size choices in the footer selector. |
| `serverSide` | `boolean` | `false` | Server-side paging (provide `totalRows`). |
| `totalRows` | `number` | — | Total row count when `serverSide` is `true`. |

```js
pagination: {
  enabled: true,
  pageSize: 100,
  pageSizeOptions: [50, 100, 250]
}
```

## Grouping & virtualization

| Option | Type | Description |
|--------|------|-------------|
| `grouping` | `Partial<RowGroupingConfig>` | Row grouping: `enabled`, `groupedColumns`, `showGroupCount`, `defaultExpanded`. |
| `showGroupingBar` | `boolean` | Show the drag-to-group bar above the header. |
| `virtualScroll` | `Partial<VirtualScrollConfig>` | Virtualization tuning: `enabled`, `rowBuffer`, `rowHeight`, `dynamicRowHeight`. |
| `suppressColumnVirtualisation` | `boolean` | Disable column virtualization (render all columns). |
| `columnGroups` | `ColumnGroupConfig` | Column-group header configuration. |

## Interaction toggles

| Option | Type | Description |
|--------|------|-------------|
| `enableCellSelection` | `boolean` | Enable individual cell selection. |
| `enableRangeSelection` | `boolean` | Enable rectangular range selection. |
| `enableClipboard` | `boolean` | Enable copy/paste. |
| `enableRowDrag` | `boolean` | Enable row drag-and-drop reordering. |
| `enableColumnDrag` | `boolean` | Enable column drag-and-drop reordering. |
| `enableCharts` | `boolean` | Enable integrated range charts. |
| `enableFullScreen` | `boolean` | Enable the full-screen mode. |

## Overlays & callbacks

| Option | Type | Description |
|--------|------|-------------|
| `loadingOverlayText` | `string` | Text shown while the grid is loading. |
| `noRowsOverlayText` | `string` | Text shown when there are no rows. |
| `rowClassFn` | `(row, index) => string` | Return a CSS class per row. |
| `rowHeightFn` | `(row) => number` | Return a custom height per row. |
| `onReady` | `(api) => void` | Called once the grid is ready, with the grid API. |

```js
new PhotonGrid.GridCore(el, {
  columns,
  data: rowData,
  noRowsOverlayText: "No employees found",
  rowClassFn: (row) => (row.salary > 90000 ? "row-highlight" : ""),
  onReady: (api) => console.log("Grid ready", api)
});
```

## Column options

Each entry in `columns` is a column definition. Only `field` is required; the
rest are optional. The most common properties:

| Property | Type | Description |
|----------|------|-------------|
| `field` | `string` | **Required.** Key on the row object this column reads. |
| `colId` | `string` | Stable column id (defaults to `col_<field>_<index>`). |
| `header` | `string` | Header label (defaults to the field in Title Case). |
| `type` | `ColumnDataType` | `string`, `number`, `boolean`, `date`, `currency`, `dropdown`, `sparkline`, `custom`, … |
| `width` / `minWidth` / `maxWidth` | `number` | Fixed or bounded column width. |
| `flex` | `number` | Proportional width — the column grows to fill space. |
| `pinned` | `'left' \| 'right' \| null` | Pin the column to a side. |
| `sortable` / `filterable` / `resizable` | `boolean` | Enable per-column sorting, filtering, resizing. |
| `editable` | `boolean` | Allow in-cell editing. |
| `textAlign` | `'left' \| 'center' \| 'right'` | Cell text alignment. |
| `renderer` | `ColumnRendererMap` | Custom render functions (e.g. `renderer.display`). |

```js
const columns = [
  { field: "id", header: "ID", colId: "id", width: 80, pinned: "left" },
  { field: "name", header: "Employee", colId: "name", flex: 1, sortable: true },
  { field: "salary", header: "Salary", colId: "salary", type: "currency", editable: true, textAlign: "right" }
];
```

## Next steps

- [Demo](./demo.md) — see these options applied in live grids.
- [Installation](./installation.md) — set Photon Grid up from scratch.
