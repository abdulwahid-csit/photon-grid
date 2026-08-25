---
title: "Installation"
description: "Add Photon Grid to your project — via CDN for Vanilla JS, or npm for React, Angular, and Vue."
---

# Installation

Photon Grid ships as a single, zero-dependency package,
[`photon-grid-core`](https://www.npmjs.com/package/photon-grid-core). You can
drop it onto a page from the CDN or install it from npm and mount it inside your
framework of choice.

:::tip No stylesheet to import
Photon Grid injects its base styles automatically the first time a grid is
created. There is **no separate CSS file** to import in any framework.
:::

## 1. Add the package

Pick your framework — your choice is remembered across the whole documentation.

<FrameworkTabs>
<TabItem value="vanilla" label="Vanilla JS">

Load the minified UMD bundle from the CDN. It exposes a global `PhotonGrid`
object with the `GridCore` class:

```html
<script src="https://cdn.jsdelivr.net/npm/photon-grid-core@latest/photon-grid.min.js"></script>
```

Prefer to self-host or bundle it yourself? Install from npm and import `GridCore`:

```bash
npm install photon-grid-core
```

```js
import { GridCore } from "photon-grid-core";
```

</TabItem>
<TabItem value="react" label="React">

Install the React wrapper together with the core engine:

```bash
npm install photon-grid-react photon-grid-core
```

</TabItem>
<TabItem value="angular" label="Angular">

Install the Angular wrapper together with the core engine:

```bash
npm install photon-grid-angular photon-grid-core
```

</TabItem>
<TabItem value="vue" label="Vue">

Install the Vue wrapper together with the core engine:

```bash
npm install photon-grid-vue photon-grid-core
```

</TabItem>
</FrameworkTabs>

## 2. Add a container

The grid mounts into a sized element. Give it an explicit height so the
virtualized viewport has room to render.

<FrameworkTabs>
<TabItem value="vanilla" label="Vanilla JS">

```html
<div id="grid" style="width: 100%; height: 500px;"></div>
```

</TabItem>
<TabItem value="react" label="React">

The wrapper renders its own container — you only control its size:

```tsx
<div style={{ width: '100%', height: 500 }}>
  {/* <PhotonGrid /> goes here */}
</div>
```

</TabItem>
<TabItem value="angular" label="Angular">

```html
<div style="width: 100%; height: 500px;">
  <!-- <photon-grid> goes here -->
</div>
```

</TabItem>
<TabItem value="vue" label="Vue">

```vue
<template>
  <div style="width: 100%; height: 500px;">
    <!-- <PhotonGrid /> goes here -->
  </div>
</template>
```

</TabItem>
</FrameworkTabs>

## 3. Define columns and data

Columns and row data are **plain objects, identical across every framework**.
Only `field` is required per column — `colId`, `header`, and `type` are derived
automatically when omitted.

```js
const columns = [
  { field: "id", header: "ID", colId: "id", width: 80 },
  { field: "name", header: "Employee", colId: "name", flex: 1 },
  { field: "department", header: "Department", colId: "department", flex: 1 },
  { field: "salary", header: "Salary", colId: "salary", type: "number", flex: 1 }
];

const rowData = [
  { id: 1, name: "John Smith", department: "Engineering", salary: 85000 },
  { id: 2, name: "Sarah Johnson", department: "Finance", salary: 72000 },
  { id: 3, name: "Michael Brown", department: "Marketing", salary: 68000 }
];
```

## 4. Create the grid

<FrameworkTabs>
<TabItem value="vanilla" label="Vanilla JS">

Construct a `GridCore` with the container element and an options object
containing your `columns` and `data`:

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

When importing from npm instead of the CDN, use the `GridCore` export directly:

```js
import { GridCore } from "photon-grid-core";

const grid = new GridCore(document.getElementById("grid"), {
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
      <PhotonGrid
        columns={columns}
        dataSet={rowData}
        options={{ headerRowHeight: 48, rowHeight: 42 }}
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
      <photon-grid
        [columns]="columns"
        [dataSet]="rowData"
        [options]="options">
      </photon-grid>
    </div>
  `,
})
export class AppComponent {
  columns = columns;
  rowData = rowData;
  options = { headerRowHeight: 48, rowHeight: 42 };
}
```

</TabItem>
<TabItem value="vue" label="Vue">

```vue
<script setup lang="ts">
import { PhotonGrid } from 'photon-grid-vue';

const options = { headerRowHeight: 48, rowHeight: 42 };
</script>

<template>
  <div style="width: 100%; height: 500px;">
    <PhotonGrid :columns="columns" :dataSet="rowData" :options="options" />
  </div>
</template>
```

</TabItem>
</FrameworkTabs>

## Result

<LiveGrid preset="quickStart" height={340} title="The grid produced by the steps above" />

## TypeScript

Photon Grid Core is written in TypeScript and ships with built-in declaration
files — no additional `@types` package is required. Key types such as
`GridOptions`, `ColumnDef`, and `ColumnDefInput` are exported from
`photon-grid-core`:

```ts
import { GridCore } from "photon-grid-core";
import type { GridOptions, ColumnDefInput } from "photon-grid-core";

const columns: ColumnDefInput[] = [
  { field: "name", header: "Employee" }
];

const options: GridOptions = { columns, data: [] };
const grid = new GridCore(document.getElementById("grid")!, options);
```

## Next steps

- [Configuration options](./configuration-options.md) — every grid option, explained.
- [Demo](./demo.md) — live, interactive grids with copy-paste code.
