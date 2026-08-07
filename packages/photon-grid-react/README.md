# Photon Grid for React — React Data Grid & Data Table Component

<p align="center">
  <img src="https://raw.githubusercontent.com/abdulwahid-csit/photon-grid/main/assets/logo.svg" alt="Photon Grid — React data grid / React table" width="180"/>
</p>

<p align="center">
  <strong>A fast, enterprise-grade React data grid built on the zero-dependency Photon Grid engine.</strong><br/>
  Virtual scrolling over millions of rows, Excel-style editing, grouping, pinning and themes — as one React component.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/photon-grid-react"><img src="https://img.shields.io/npm/v/photon-grid-react" alt="npm version"/></a>
  <a href="https://www.npmjs.com/package/photon-grid-react"><img src="https://img.shields.io/npm/dm/photon-grid-react" alt="npm downloads"/></a>
  <a href="https://github.com/abdulwahid-csit/photon-grid/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/photon-grid-react" alt="license"/></a>
  <img src="https://img.shields.io/badge/React-18%2B-61dafb" alt="React 18+"/>
  <img src="https://img.shields.io/badge/TypeScript-5.x-blue" alt="TypeScript"/>
</p>

---

![React data grid screenshot — Photon Grid, light theme](https://raw.githubusercontent.com/abdulwahid-csit/photon-grid/main/assets/screenshots/grid-light.png)

<details>
<summary>Dark theme</summary>

![React data table screenshot — Photon Grid, dark theme](https://raw.githubusercontent.com/abdulwahid-csit/photon-grid/main/assets/screenshots/grid-dark.png)

</details>

---

## Overview

**Photon Grid for React** (`photon-grid-react`) is the official React wrapper for [Photon Grid Core](https://www.npmjs.com/package/photon-grid-core) — a framework-agnostic **data grid** / **data table** engine written in TypeScript with zero runtime dependencies.

One `<PhotonGrid />` component binds React props and callbacks to the core engine: virtual scrolling, sorting, filtering, grouping, editing, and cell renderers written as ordinary React components.

A modern, lightweight alternative to AG Grid, TanStack Table, MUI DataGrid and react-data-grid.

---

## Installation

```bash
npm install photon-grid-react
```

```bash
yarn add photon-grid-react
```

```bash
pnpm add photon-grid-react
```

`photon-grid-core` is a regular dependency and is installed for you. `react` and `react-dom` (≥18) are peer dependencies you already have.

No CSS import is required: the core injects its own stylesheet on first render.

---

## Quick start

```tsx
import { useCallback } from 'react';
import { PhotonGrid } from 'photon-grid-react';
import type { PhotonGridColumnDef } from 'photon-grid-react';
import type { GridApi, GridOptions } from 'photon-grid-core';

// Only `field` is required — colId, header and type are defaulted for you.
const columns: PhotonGridColumnDef[] = [
  { field: 'sku',      header: 'SKU',      width: 110, pinned: 'left' },
  { field: 'product',  header: 'Product',  width: 190 },
  { field: 'category', header: 'Category', width: 140 },
  { field: 'price',    header: 'Price',    width: 120, type: 'number', editable: true },
  { field: 'released', header: 'Released', width: 130, type: 'date' },
];

const rows = [
  { sku: 'PG-1001', product: 'Photon Keyboard', category: 'Hardware', price: 1249, released: '2024-01-18' },
  { sku: 'PG-1002', product: 'Quantum Mouse',   category: 'Hardware', price:  349, released: '2024-02-04' },
  { sku: 'PG-1003', product: 'Nebula Dock',     category: 'Hardware', price: 2199, released: '2024-02-22' },
];

// Declared outside the component (or memoized): a new `options` identity
// recreates the grid.
const options: Partial<GridOptions> = {
  mode: 'light',
  rowHeight: 40,
  showSerialNumber: true,
  pagination: { enabled: true, pageSize: 10 },
  editing: { mode: 'cell' },
};

export function Products() {
  const onGridReady = useCallback((api: GridApi) => {
    api.sizeColumnsToFit();
  }, []);

  return (
    // The grid fills its host, so give the host a height.
    <div style={{ height: 460 }}>
      <PhotonGrid
        columns={columns}
        dataSet={rows}
        options={options}
        onGridReady={onGridReady}
        onCellValueChanged={(e) => console.log('cell changed', e)}
      />
    </div>
  );
}
```

---

## Props

| Prop      | Type                        | Description |
| --------- | --------------------------- | ----------- |
| `columns` | `PhotonGridColumnDef[]`     | Column definitions. Renderer slots accept React components as well as plain functions. |
| `dataSet` | `Record<string, unknown>[]` | Row data. |
| `options` | `Partial<GridOptions>`      | Everything else — theme, selection, editing, pagination, row model, master/detail, AI panel. A new object identity recreates the grid, so memoize it. |
| `loading` | `boolean`                   | Toggles the loading overlay through `GridApi.setLoading`, so scroll position, selection and column layout survive. Configure its look with `options.loadingOverlay`. |

### Event callbacks

`onGridReady` receives the `GridApi`, which is full programmatic control over the grid.

| Group | Callbacks |
| --- | --- |
| Lifecycle | `onGridReady`, `onDataChanged`, `onLoadingChanged` |
| Rows | `onRowClicked`, `onRowDoubleClicked`, `onRowSelected` |
| Cells | `onCellClicked`, `onCellDoubleClicked`, `onCellValueChanged`, `onCellSelectionChanged` |
| Columns | `onColumnResized`, `onColumnMoved`, `onColumnsStateChanged` |
| Data ops | `onSortChanged`, `onFilterChanged`, `onPageChanged` |
| Misc | `onThemeChanged`, `onExportComplete` |

---

## React cell renderers

Renderer slots accept React components directly — the wrapper mounts and unmounts them as rows are virtualized and recycled. The renderer params arrive as props (`value`, `row`, `rowIndex`, `colDef`, `colIndex`, `api`):

```tsx
const StatusBadge = ({ value }: Record<string, unknown>) => (
  <span className="badge">{String(value)}</span>
);

const columns: PhotonGridColumnDef[] = [
  { field: 'status', header: 'Status', renderer: { display: StatusBadge } },
];
```

Pass `{ kind: 'component', component, props }` instead when you want to map the params to a narrower prop type of your own.

Master–detail panels work the same way:

```tsx
const OrderDetail = ({ data, ctx }) => (
  <button onClick={() => ctx.emit('save', data)}>Save {data.account}</button>
);

<PhotonGrid options={{ masterDetail: { enabled: true, renderer: OrderDetail } }} />
```

---

## Features

- Virtual row and column rendering — millions of rows, thousands of columns
- React components as cell, header, editor and master–detail renderers
- Column pinning, resizing, reordering, auto-size, size-to-fit, column groups
- Sorting, multi-column sorting, filtering, quick filter, filter panels
- Row grouping with aggregations, tree data, master–detail rows
- Client, server-side and infinite row models
- 15+ cell editors, declarative and async validation, fill handle, clipboard, undo/redo
- Excel-style formula engine (`=A1+B1`) with 55+ functions
- Light/dark modes and five variants, all CSS-custom-property driven
- CSV / Excel export and import, summary rows, status bar, context menus, charts
- Full keyboard navigation, ARIA roles, screen-reader support, RTL
- Natural-language AI panel (optional, with a Gemini back-end)

---

## Links

- **GitHub** — https://github.com/abdulwahid-csit/photon-grid
- **Issues** — https://github.com/abdulwahid-csit/photon-grid/issues
- **Core engine** — https://www.npmjs.com/package/photon-grid-core
- **Angular wrapper** — https://www.npmjs.com/package/photon-grid-angular
- **Vue wrapper** — https://www.npmjs.com/package/photon-grid-vue

---

## Keywords

react, react grid, react data grid, react table, react data table, react datatable, react table component, reacttable, tanstack table alternative, ag-grid react alternative, mui datagrid alternative, react-data-grid alternative, grid, data grid, datagrid, table, data table, datatable, table data, spreadsheet, excel grid, editable table, virtual scroll, virtualized table, infinite scroll, large dataset, million rows, tree grid, row grouping, sorting, filtering, pagination, column pinning, column resize, column reorder, row selection, cell selection, csv export, excel export, enterprise data grid, typescript, hooks

---

## License

MIT © Abdul Wahid

⭐ If Photon Grid is useful to you, consider starring the repository.
