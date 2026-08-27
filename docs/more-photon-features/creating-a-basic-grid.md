---
sidebar_position: 1
title: "Creating a Basic Grid"
description: "Follow a step-by-step tutorial to build your first Photon Grid in vanilla JS, React, Angular, or Vue — from a container and column definitions to reading the grid API."
keywords: [photon grid, javascript data grid, create data grid, gridcore, react data grid, angular data grid, vue data grid, basic grid tutorial]
---

# Creating a Basic Grid

This tutorial walks you through building your first Photon Grid from scratch. You will add a container, define columns and data, render the grid, and read the grid's `api` object so you can drive it later. Pick your framework in the tabs below — your choice is remembered across the whole documentation.

## Overview

A Photon Grid needs three things: somewhere to render, a set of column definitions, and an array of row data. In vanilla JS you pass these to the `GridCore` constructor; in React, Angular, and Vue you pass them as props/inputs to the wrapper component. Either way the grid handles rendering and virtualization for you.

## Step 1: Set up the grid host

<FrameworkTabs>
<TabItem value="vanilla" label="Vanilla JS">

Include the CDN build and add a sized container element.

```html
<script src="https://cdn.jsdelivr.net/npm/photon-grid-core@latest/photon-grid.min.js"></script>

<div id="grid" style="width:100%;height:460px;"></div>
```

</TabItem>
<TabItem value="react" label="React">

Install the wrapper, then import the component:

```bash
npm install photon-grid-react photon-grid-core
```

```tsx
import { PhotonGrid } from 'photon-grid-react';
import type { PhotonGridColumnDef } from 'photon-grid-react';
import type { GridApi } from 'photon-grid-core';
```

</TabItem>
<TabItem value="angular" label="Angular">

Install the wrapper, then import the standalone component:

```bash
npm install photon-grid-angular photon-grid-core
```

```ts
import { PhotonGridComponent } from 'photon-grid-angular';
import type { ColumnDef } from 'photon-grid-angular';
import type { GridApi } from 'photon-grid-core';
```

</TabItem>
<TabItem value="vue" label="Vue">

Install the wrapper, then import the component:

```bash
npm install photon-grid-vue photon-grid-core
```

```ts
import { PhotonGrid } from 'photon-grid-vue';
import type { ColumnDef, GridApi } from 'photon-grid-vue';
```

</TabItem>
</FrameworkTabs>

## Step 2: Define your columns

Each column needs a `field` that maps to a property on your row objects, a `header` label, and a stable `colId`. Use `width` for fixed columns and `flex` to share remaining space. Column definitions are the same across every framework.

```js
const columns = [
  { field: "id", header: "ID", colId: "id", width: 80, configurable: false },
  { field: "name", header: "Employee", colId: "name", flex: 1 },
  { field: "department", header: "Department", colId: "department", flex: 1 },
  { field: "country", header: "Country", colId: "country", flex: 1 },
  { field: "salary", header: "Salary", colId: "salary", flex: 1 },
  { field: "active", header: "Active", colId: "active", width: 100 }
];
```

## Step 3: Provide your data

Data is a plain array of objects. Each object's keys must match the `field` names in your columns.

```js
const rowData = [
  { id: 1, name: "John Smith", department: "Engineering", country: "USA", salary: 85000, active: true },
  { id: 2, name: "Sarah Johnson", department: "Finance", country: "UK", salary: 72000, active: true },
  { id: 3, name: "Michael Brown", department: "Marketing", country: "Canada", salary: 68000, active: false }
];
```

## Step 4: Render the grid

Pass your `columns` and `data` to the grid, along with any options such as `headerRowHeight` and `rowHeight`.

<FrameworkTabs>
<TabItem value="vanilla" label="Vanilla JS">

Create the grid by passing the container element and an options object.

```js
const grid = new PhotonGrid.GridCore(
  document.getElementById("grid"),
  {
    columns,
    data: rowData,
    headerRowHeight: 48,
    rowHeight: 42
  }
);
```

</TabItem>
<TabItem value="react" label="React">

```tsx
export function App() {
  return (
    <div style={{ width: '100%', height: 460 }}>
      <PhotonGrid
        columns={columns}
        dataSet={rowData}
        options={{ headerRowHeight: 48, rowHeight: 42 }}
        onGridReady={(api) => { /* Step 5 */ }}
      />
    </div>
  );
}
```

</TabItem>
<TabItem value="angular" label="Angular">

```ts
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [PhotonGridComponent],
  template: `
    <div style="width: 100%; height: 460px;">
      <photon-grid
        [columns]="columns"
        [dataSet]="rowData"
        [options]="{ headerRowHeight: 48, rowHeight: 42 }"
        (gridReady)="onReady($event)">
      </photon-grid>
    </div>
  `,
})
export class AppComponent {
  columns = columns;
  rowData = rowData;
  onReady(api: GridApi) { /* Step 5 */ }
}
```

</TabItem>
<TabItem value="vue" label="Vue">

```vue
<template>
  <div style="width: 100%; height: 460px;">
    <PhotonGrid
      :columns="columns"
      :dataSet="rowData"
      :options="{ headerRowHeight: 48, rowHeight: 42 }"
      @gridReady="onReady"
    />
  </div>
</template>
```

</TabItem>
</FrameworkTabs>

## Step 5: Read the grid API

Every grid exposes a `GridApi`. Use it to read state and drive the grid at runtime — for example, checking how many rows are displayed. The API methods are identical across frameworks; only how you obtain the `api` differs.

<FrameworkTabs>
<TabItem value="vanilla" label="Vanilla JS">

The instance exposes its API as `grid.api`.

```js
const api = grid.api;
console.log(api.getDisplayedRowCount()); // 3
```

</TabItem>
<TabItem value="react" label="React">

`onGridReady` hands you the `GridApi`.

```tsx
const onReady = (api: GridApi) => {
  console.log(api.getDisplayedRowCount()); // 3
};
```

</TabItem>
<TabItem value="angular" label="Angular">

`(gridReady)` emits the `GridApi`.

```ts
onReady(api: GridApi): void {
  console.log(api.getDisplayedRowCount()); // 3
}
```

</TabItem>
<TabItem value="vue" label="Vue">

`@gridReady` emits the `GridApi`.

```ts
function onReady(api: GridApi) {
  console.log(api.getDisplayedRowCount()); // 3
}
```

</TabItem>
</FrameworkTabs>

## Live Example

<iframe
  src="/examples/basic-grid/index.html"
  width="100%"
  height="500"
  style={{border: '1px solid #ddd', borderRadius: '8px'}}
></iframe>

## API Reference

| Option / Method | Type | Description |
| --- | --- | --- |
| `PhotonGrid.GridCore` | `constructor` | Creates a grid (vanilla): `new PhotonGrid.GridCore(element, options)`. |
| `<PhotonGrid>` / `<photon-grid>` | `component` | Wrapper component for React, Vue, and Angular. |
| `columns` | `array` | Array of column definitions. |
| `data` / `dataSet` | `array` | Row data — `data` in vanilla, `dataSet` in the wrappers. |
| `field` | `string` | Row property a column maps to. |
| `colId` | `string` | Stable column id. |
| `flex` | `number` | Flex grow factor for column width. |
| `grid.api` / `onGridReady` | `GridApi` | The API instance for driving the grid. |
| `api.getDisplayedRowCount()` | `method` | Returns the number of displayed rows. |

## Related

- [Installation](/docs/getting-started/installation)
- [Styling a Grid](/docs/more-photon-features/styling-a-grid)
- [Testing](/docs/tools-and-building/testing)
