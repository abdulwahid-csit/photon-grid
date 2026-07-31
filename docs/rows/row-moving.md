---
title: "Row Moving"
description: "Reorder rows in Photon Grid with drag-and-drop. Enable row dragging, add a drag handle column, and respond to drop events. Vanilla JS, React, Angular, and Vue examples."
keywords:
  - photon grid row moving
  - drag and drop rows
  - reorder rows data grid
  - row drag handle
  - enableRowDrag rowDrag
  - javascript grid row reorder
---

# Row Moving

Photon Grid lets users reorder rows by dragging them. Turn on dragging at the
grid level, choose which column shows the drag handle, and the grid animates rows
into their new positions as they move.

## Enable row dragging

Set `enableRowDrag: true` on the grid, then mark the column that should show the
drag handle with `rowDrag: true`.

<FrameworkTabs>
<TabItem value="vanilla" label="Vanilla JS">

```js
const columns = [
  { field: "name", header: "Employee", colId: "name", flex: 1, rowDrag: true }, // drag handle here
  { field: "department", header: "Department", colId: "department", flex: 1 },
  { field: "salary", header: "Salary", colId: "salary", type: "number", width: 120 }
];

new PhotonGrid.GridCore(document.getElementById("grid"), {
  columns,
  data: rowData,
  enableRowDrag: true
});
```

</TabItem>
<TabItem value="react" label="React">

```tsx
import { PhotonGrid } from 'photon-grid-react';

const columns = [
  { field: 'name', header: 'Employee', colId: 'name', flex: 1, rowDrag: true },
  { field: 'department', header: 'Department', colId: 'department', flex: 1 },
  { field: 'salary', header: 'Salary', colId: 'salary', type: 'number', width: 120 },
];

export function App() {
  return (
    <div style={{ width: '100%', height: 500 }}>
      <PhotonGrid columns={columns} dataSet={rowData} options={{ enableRowDrag: true }} />
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
  columns = [
    { field: 'name', header: 'Employee', colId: 'name', flex: 1, rowDrag: true },
    { field: 'department', header: 'Department', colId: 'department', flex: 1 },
    { field: 'salary', header: 'Salary', colId: 'salary', type: 'number', width: 120 },
  ];
  rowData = rowData;
  options = { enableRowDrag: true };
}
```

</TabItem>
<TabItem value="vue" label="Vue">

```vue
<script setup lang="ts">
import { PhotonGrid } from 'photon-grid-vue';

const columns = [
  { field: 'name', header: 'Employee', colId: 'name', flex: 1, rowDrag: true },
  { field: 'department', header: 'Department', colId: 'department', flex: 1 },
  { field: 'salary', header: 'Salary', colId: 'salary', type: 'number', width: 120 },
];
const options = { enableRowDrag: true };
</script>

<template>
  <div style="width: 100%; height: 500px;">
    <PhotonGrid :columns="columns" :dataSet="rowData" :options="options" />
  </div>
</template>
```

</TabItem>
</FrameworkTabs>

## Options

| Option / property | Where | Type | Description |
|-------------------|-------|------|-------------|
| `enableRowDrag` | grid options | `boolean` | Master switch for drag-to-reorder. |
| `rowDrag` | column def | `boolean` | Show a drag handle in this column. |

The grid plays a slide animation as rows reorder. To disable that motion (for
reduced-motion preferences or very high-frequency updates), set
`animateRows: false` in the grid options.

## Responding to a drop

A row move produces a drop payload describing what moved and where:

| Field | Type | Description |
|-------|------|-------------|
| `draggedRows` | `RowNode[]` | The rows being moved. |
| `targetRow` | `RowNode` | The row the drop landed on. |
| `position` | `'before' \| 'after' \| 'inside'` | Where relative to the target the rows were dropped. |

Use it to persist the new order to your back-end or update your own data model.
`'inside'` is used for re-parenting when combined with
[tree data](./row-parent-child.md).

## Reordering from the API

Beyond drag-and-drop, you can rearrange rows programmatically by updating the
data set — replace it with `setData`, or apply a [transaction](./row-pre-populating.md)
to add, move, or remove rows.

## Next steps

- [Row Parent / Child](./row-parent-child.md) — drag rows to re-parent them in a tree.
- [Row Headers](./row-headers.md) — selection handles and checkboxes.
- [Column Moving](../columns/column-moving.md) — reorder columns by dragging.
