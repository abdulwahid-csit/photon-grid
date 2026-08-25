---
sidebar_position: 1
title: "Key Features"
description: "Explore the key features of Photon Grid — a high-performance data grid for vanilla JS, React, Angular, and Vue with sorting, filtering, grouping, selection, editing, pagination, charts, and theming."
keywords: [photon grid, javascript data grid, react data grid, angular data grid, vue data grid, data grid features, sorting, filtering, virtual scrolling]
---

# Key Features

Photon Grid is a high-performance data grid that packs sorting, filtering, grouping, selection, inline editing, pagination, integrated charts, theming, and virtual scrolling into a single lightweight bundle — available for vanilla JS, React, Angular, and Vue. This page gives you a high-level tour before you dive into the individual guides.

## Overview

Every Photon Grid feature is available from the same core engine and its `GridApi`. You turn features on through grid options and column definitions, then drive them at runtime through the API. The runtime API is identical across frameworks — only how you obtain `api` differs (`grid.api` in vanilla, or the ready callback in React/Angular/Vue). Because the grid virtualizes rows and columns, these features stay fast even with large datasets.

Use this page as a map: each section links to a dedicated guide where the feature is covered in depth. Pick your framework in the tabs below — your choice is remembered across the whole documentation.

## Getting the grid API

Almost every runtime example below calls a method on the grid's `api`. Here is how you obtain it in each framework.

<FrameworkTabs>
<TabItem value="vanilla" label="Vanilla JS">

```js
const grid = new PhotonGrid.GridCore(el, { columns, data: rowData });
const api = grid.api;
```

</TabItem>
<TabItem value="react" label="React">

```tsx
<PhotonGrid columns={columns} dataSet={rowData} onGridReady={(api) => {
  // use api here
}} />
```

</TabItem>
<TabItem value="angular" label="Angular">

```html
<photon-grid [columns]="columns" [dataSet]="rowData" (gridReady)="onReady($event)"></photon-grid>
```

</TabItem>
<TabItem value="vue" label="Vue">

```vue
<PhotonGrid :columns="columns" :dataSet="rowData" @gridReady="onReady" />
```

</TabItem>
</FrameworkTabs>

## Columns

Columns are defined declaratively with a `field`, a `header`, and a stable `colId`. You control layout with `width`, `minWidth`, and `flex`, and behavior with flags such as `sortable`, `filter`, `editable`, `resizable`, and `pinned`. Column definitions are the same across every framework.

```js
const columns = [
  { field: "id", header: "ID", colId: "id", width: 80, configurable: false },
  { field: "name", header: "Employee", colId: "name", flex: 1, sortable: true },
  { field: "department", header: "Department", colId: "department", flex: 1, filter: true },
  { field: "salary", header: "Salary", colId: "salary", flex: 1, sortable: true }
];
```

## Sorting

Enable sorting per column with `sortable: true`, and drive it programmatically with `api.sortColumn(colId, dir)`, `api.multiSort(configs)`, and `api.clearSort()`.

```js
api.sortColumn("salary", "desc");
```

## Filtering

Turn on column filters with `filter: true`, then filter data at runtime with `api.setColumnFilter(colId, model)` or the built-in quick filter `api.setQuickFilter(text)`.

```js
api.setQuickFilter("engineering");
```

## Grouping

Group rows by any column with `api.groupByColumn(colId)` and expand or collapse groups with `api.expandAllGroups()` and `api.collapseAllGroups()`.

```js
api.groupByColumn("department");
```

## Selection

Configure selection with the `selection` option using `mode: "single"` or `mode: "multiple"`, and read the current selection with `api.getSelectedRows()` and `api.getSelectedCount()`.

<FrameworkTabs>
<TabItem value="vanilla" label="Vanilla JS">

```js
const grid = new PhotonGrid.GridCore(el, {
  columns,
  data: rowData,
  selection: { mode: "multiple" }
});
```

</TabItem>
<TabItem value="react" label="React">

```tsx
<PhotonGrid
  columns={columns}
  dataSet={rowData}
  options={{ selection: { mode: 'multiple' } }}
/>
```

</TabItem>
<TabItem value="angular" label="Angular">

```html
<photon-grid
  [columns]="columns"
  [dataSet]="rowData"
  [options]="{ selection: { mode: 'multiple' } }">
</photon-grid>
```

</TabItem>
<TabItem value="vue" label="Vue">

```vue
<PhotonGrid
  :columns="columns"
  :dataSet="rowData"
  :options="{ selection: { mode: 'multiple' } }"
/>
```

</TabItem>
</FrameworkTabs>

## Editing

Make cells editable with `editable: true` and choose an `editor` such as `"text"`, `"number"`, or `"dropdown"`. Start and stop editing with `api.startCellEditing(rowId, colId)` and `api.stopEditing()`.

```js
{ field: "salary", header: "Salary", colId: "salary", editable: true, editor: "number" }
```

## Pagination

Turn on pagination with the `pagination` option and navigate with `api.goToPage(n)` and `api.setPageSize(n)`.

<FrameworkTabs>
<TabItem value="vanilla" label="Vanilla JS">

```js
const grid = new PhotonGrid.GridCore(el, {
  columns,
  data: rowData,
  pagination: { enabled: true, pageSize: 100 }
});
```

</TabItem>
<TabItem value="react" label="React">

```tsx
<PhotonGrid
  columns={columns}
  dataSet={rowData}
  options={{ pagination: { enabled: true, pageSize: 100 } }}
/>
```

</TabItem>
<TabItem value="angular" label="Angular">

```html
<photon-grid
  [columns]="columns"
  [dataSet]="rowData"
  [options]="{ pagination: { enabled: true, pageSize: 100 } }">
</photon-grid>
```

</TabItem>
<TabItem value="vue" label="Vue">

```vue
<PhotonGrid
  :columns="columns"
  :dataSet="rowData"
  :options="{ pagination: { enabled: true, pageSize: 100 } }"
/>
```

</TabItem>
</FrameworkTabs>

## Charts

Photon Grid ships integrated charting. Enable it with the `chart` option and create charts from data with `api.createChart(...)` or `api.createRangeChart(...)`.

## Theming

Apply a built-in theme with the `theme` option (`PhotonGrid.lightTheme` or `PhotonGrid.darkTheme`), and switch at runtime with `api.setTheme(theme)` or `api.toggleDarkMode()`.

## Virtual Scrolling

Rows and columns are virtualized automatically, so the grid renders only what is visible. Scroll programmatically with `api.scrollToRow(i)`, `api.scrollToTop()`, and refresh rendering with `api.refresh()`.

## Live Example

The example below combines several features at once: sortable columns, a column filter, multiple-row selection, and pagination.

<iframe
  src="/examples/key-features/index.html"
  width="100%"
  height="500"
  style={{border: '1px solid #ddd', borderRadius: '8px'}}
></iframe>

## API Reference

| Option / Method | Type | Description |
| --- | --- | --- |
| `sortable` | `boolean` | Enables sorting on a column. |
| `filter` | `boolean` | Enables filtering on a column. |
| `editable` | `boolean` | Makes a column's cells editable. |
| `selection` | `object` | Selection config; uses `mode: "single" \| "multiple"`. |
| `pagination` | `object` | `{ enabled: true, pageSize: 100 }`. |
| `theme` | `object` | A theme object such as `PhotonGrid.darkTheme`. |
| `api.sortColumn(colId, dir)` | `method` | Sorts a column ascending or descending. |
| `api.setQuickFilter(text)` | `method` | Applies a global quick filter. |
| `api.groupByColumn(colId)` | `method` | Groups rows by a column. |
| `api.getSelectedRows()` | `method` | Returns the currently selected rows. |
| `api.goToPage(n)` | `method` | Navigates to a page. |
| `api.toggleDarkMode()` | `method` | Toggles between light and dark themes. |

## Related

- [Quick Start](/docs/more-photon-features/quick-start)
- [Installation](/docs/getting-started/installation)
- [Creating a Basic Grid](/docs/more-photon-features/creating-a-basic-grid)
- [Styling a Grid](/docs/more-photon-features/styling-a-grid)
