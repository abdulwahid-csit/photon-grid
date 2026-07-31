---
title: "Row Sorting"
description: "Sort rows in Photon Grid — single and multi-column sorting, per-column control, initial sort state, and the sorting API with Vanilla JS, React, Angular, and Vue examples."
keywords:
  - photon grid sorting
  - data grid sort rows
  - multi column sort
  - sortable columns
  - initial sort state
  - sortColumn api
  - javascript grid sorting
---

# Row Sorting

Photon Grid sorts rows by one or more columns. Sorting is enabled by default on
every column — click a header to cycle **ascending → descending → unsorted** —
and can be controlled per column, set as an initial state, or driven entirely
through the API.

## Enable or disable sorting per column

Sorting is on by default. Set `sortable: false` on a column to turn it off.

```js
const columns = [
  { field: "name",   header: "Employee",   colId: "name" },              // sortable
  { field: "salary", header: "Salary",     colId: "salary", type: "number" },
  { field: "notes",  header: "Notes",      colId: "notes", sortable: false } // not sortable
];

const rowData = [
  { name: "John Smith",   salary: 85000, notes: "Team lead" },
  { name: "Sarah Johnson", salary: 72000, notes: "Contractor" },
  { name: "David Miller", salary: 93000, notes: "Remote" }
];
```

<LiveGrid preset="quickStart" height={320} title="Click any header to sort — ascending, descending, then unsorted" />

## Set an initial sort

Provide `sortConfig` in the grid options to sort the grid on first render. Each
entry is `{ colId, field, order }` where `order` is `'asc'` or `'desc'`.

<FrameworkTabs>
<TabItem value="vanilla" label="Vanilla JS">

```js
new PhotonGrid.GridCore(document.getElementById("grid"), {
  columns,
  data: rowData,
  sortConfig: [
    { colId: "salary", field: "salary", order: "desc" }
  ]
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
        options={{ sortConfig: [{ colId: 'salary', field: 'salary', order: 'desc' }] }}
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
  options = { sortConfig: [{ colId: 'salary', field: 'salary', order: 'desc' }] };
}
```

</TabItem>
<TabItem value="vue" label="Vue">

```vue
<script setup lang="ts">
import { PhotonGrid } from 'photon-grid-vue';

const options = { sortConfig: [{ colId: 'salary', field: 'salary', order: 'desc' }] };
</script>

<template>
  <div style="width: 100%; height: 500px;">
    <PhotonGrid :columns="columns" :dataSet="rowData" :options="options" />
  </div>
</template>
```

</TabItem>
</FrameworkTabs>

## Multi-column sorting

Photon Grid supports multi-column sorting: hold **Shift** and click additional
headers to add secondary sorts. The order in which you click determines
priority. Provide multiple `sortConfig` entries to seed a multi-sort:

```js
sortConfig: [
  { colId: "department", field: "department", order: "asc" },  // primary
  { colId: "salary",     field: "salary",     order: "desc" }  // tie-breaker
]
```

Rows are first ordered by department (A→Z), and within each department by salary
(high→low).

## Sorting API

Drive sorting from code via the grid API — reach it through the `GridCore`
instance (`grid.api`) in Vanilla JS or the `onReady` option in the wrappers.

| Method | Description |
|--------|-------------|
| `sortColumn(colId, order)` | Sort a column ascending (`'asc'`) or descending (`'desc'`). |
| `clearSort()` | Remove all sorting. |
| `getSortConfig()` | Return the current sort state as `SortConfig[]`. |

<FrameworkTabs>
<TabItem value="vanilla" label="Vanilla JS">

```js
const grid = new PhotonGrid.GridCore(document.getElementById("grid"), {
  columns,
  data: rowData
});

grid.api.sortColumn("salary", "desc");   // sort by salary, descending
console.log(grid.api.getSortConfig());    // [{ colId: 'salary', field: 'salary', order: 'desc' }]
grid.api.clearSort();                     // back to original order
```

</TabItem>
<TabItem value="react" label="React">

```tsx
import { PhotonGrid } from 'photon-grid-react';

export function App() {
  let api: any;
  return (
    <>
      <button onClick={() => api?.sortColumn('salary', 'desc')}>Sort by salary</button>
      <div style={{ width: '100%', height: 500 }}>
        <PhotonGrid columns={columns} dataSet={rowData}
          options={{ onReady: (a) => (api = a) }} />
      </div>
    </>
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
    <button (click)="api?.sortColumn('salary', 'desc')">Sort by salary</button>
    <div style="width: 100%; height: 500px;">
      <photon-grid [columns]="columns" [dataSet]="rowData" [options]="options"></photon-grid>
    </div>
  `,
})
export class AppComponent {
  api: any;
  columns = columns;
  rowData = rowData;
  options = { onReady: (a: any) => (this.api = a) };
}
```

</TabItem>
<TabItem value="vue" label="Vue">

```vue
<script setup lang="ts">
import { PhotonGrid } from 'photon-grid-vue';

let api: any;
const options = { onReady: (a: any) => (api = a) };
</script>

<template>
  <button @click="api?.sortColumn('salary', 'desc')">Sort by salary</button>
  <div style="width: 100%; height: 500px;">
    <PhotonGrid :columns="columns" :dataSet="rowData" :options="options" />
  </div>
</template>
```

</TabItem>
</FrameworkTabs>

## How values are sorted

Sorting is type-aware: `number`, `currency`, and `percentage` columns sort
numerically, `date` / `time` columns sort chronologically, and `string` columns
sort alphabetically (case-insensitive). Set the column `type` correctly so values
sort the way users expect.

## Next steps

- [Row Pagination](./rows-pagination.md) — page through large, sorted datasets.
- [Row Hiding](./row-hiding.md) — filter rows in and out of view.
- [Column Definitions](../columns/column-definitions.md#behavior-flags) — the `sortable` flag.
