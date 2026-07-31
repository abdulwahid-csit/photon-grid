---
title: "Row Pre-populating"
description: "Populate Photon Grid with rows — seed initial data, add new (or blank) rows for data entry, update existing rows, and stream rows in with transactions. Vanilla JS, React, Angular, and Vue examples."
keywords:
  - photon grid populate rows
  - set row data
  - add new rows
  - blank row data entry
  - applyTransaction add
  - setData updateRow
---

# Row Pre-populating

"Pre-populating" is seeding the grid with rows — the initial dataset you pass at
creation, plus any rows you add later (including blank rows for data entry).
Photon Grid populates rows from the `data` option and mutates them through the
API.

## Seed initial rows

Provide the starting rows with the `data` option. Each row is a plain object
keyed by your column `field`s.

<FrameworkTabs>
<TabItem value="vanilla" label="Vanilla JS">

```js
const rowData = [
  { id: 1, name: "John Smith",   department: "Engineering", salary: 85000 },
  { id: 2, name: "Sarah Johnson", department: "Finance",     salary: 72000 },
  { id: 3, name: "Michael Brown", department: "Marketing",   salary: 68000 }
];

new PhotonGrid.GridCore(document.getElementById("grid"), {
  columns,
  data: rowData
});
```

</TabItem>
<TabItem value="react" label="React">

```tsx
import { PhotonGrid } from 'photon-grid-react';

const rowData = [
  { id: 1, name: 'John Smith', department: 'Engineering', salary: 85000 },
  { id: 2, name: 'Sarah Johnson', department: 'Finance', salary: 72000 },
];

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
  rowData = [
    { id: 1, name: 'John Smith', department: 'Engineering', salary: 85000 },
    { id: 2, name: 'Sarah Johnson', department: 'Finance', salary: 72000 },
  ];
}
```

</TabItem>
<TabItem value="vue" label="Vue">

```vue
<script setup lang="ts">
import { PhotonGrid } from 'photon-grid-vue';

const rowData = [
  { id: 1, name: 'John Smith', department: 'Engineering', salary: 85000 },
  { id: 2, name: 'Sarah Johnson', department: 'Finance', salary: 72000 },
];
</script>

<template>
  <div style="width: 100%; height: 500px;">
    <PhotonGrid :columns="columns" :dataSet="rowData" />
  </div>
</template>
```

</TabItem>
</FrameworkTabs>

:::tip Stable ids
Include an id field in each row (e.g. `id`) so the grid can match rows for
updates and removals. That id becomes the row's `nodeId`, used by
`updateRow`, `removeRows`, and transactions.
:::

## Replace the dataset later

Swap in a new set of rows at any time with `setData` — handy after fetching data
asynchronously:

```js
const grid = new PhotonGrid.GridCore(el, { columns, data: [] });

const rows = await fetch("/api/employees").then((r) => r.json());
grid.api.setData(rows);   // populate once the data arrives
```

## Add new rows

Append rows with `applyTransaction`. Its `add` array carries the new row objects.

```js
grid.api.applyTransaction({
  add: [
    { id: 10, name: "New Hire", department: "Engineering", salary: 70000 }
  ]
});
```

### Add a blank row for data entry

To let users fill in a fresh row, add an empty (or partially defaulted) object,
then enable [editing](../getting-started/configuration-options.md#editing):

```js
new PhotonGrid.GridCore(el, {
  columns,
  data: rowData,
  editing: { mode: "cell", singleClickEdit: true }
});

// "Add row" button handler — append a blank, editable row:
function addBlankRow() {
  const newId = Date.now();
  grid.api.applyTransaction({
    add: [{ id: newId, name: "", department: "", salary: null }]
  });
}
```

## Update existing rows

Change a single row by id with `updateRow`, or many at once with a transaction's
`update` array (each object is matched by `nodeId` and shallow-merged):

```js
grid.api.updateRow("2", { salary: 78000 });          // one row

grid.api.applyTransaction({                            // several rows
  update: [
    { id: 1, department: "Platform" },
    { id: 3, salary: 71000 }
  ]
});
```

## Populate from a server, page by page

When combined with [server-side pagination](./rows-pagination.md#server-side-pagination),
call `setData` with each page's rows as the user navigates.

## Next steps

- [Row Trimming](./row-trimming.md) — remove rows you no longer need.
- [Row Sorting](./rows-sorting.md) · [Row Pagination](./rows-pagination.md)
- [Configuration options](../getting-started/configuration-options.md#data) — the `data` option.
