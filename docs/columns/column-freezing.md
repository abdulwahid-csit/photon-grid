---
title: "Column Freezing"
description: "Pin (freeze) Photon Grid columns to the left or right edge so they stay visible while scrolling horizontally — set with the pinned column property."
keywords:
  - photon grid pinned columns
  - freeze columns data grid
  - pin column left right
  - sticky columns
  - frozen columns javascript grid
---

# Column Freezing

Pinning (freezing) keeps a column fixed to the left or right edge while the rest
of the grid scrolls horizontally. Use it for identifiers on the left and actions
on the right.

| Property | Type | Description |
|----------|------|-------------|
| `pinned` | `'left' \| 'right' \| null` | Edge to pin the column to, or `null` (default) for a normal scrolling column. |

## Pin to the left

Left-pinned columns stay at the start of the grid. A subtle shadow separates them
from the scrolling area.

```js
const columns = [
  { field: "id",   header: "ID",       pinned: "left", width: 70 },
  { field: "name", header: "Employee", pinned: "left", width: 200 },
  { field: "department", header: "Department" },
  { field: "email",      header: "Email" },
  { field: "phone",      header: "Phone" },
  { field: "location",   header: "Location" }
];
```

## Pin to the right

Right-pinned columns stay at the end — ideal for action buttons or totals.

```js
const columns = [
  { field: "name",    header: "Employee" },
  { field: "salary",  header: "Salary", type: "currency" },
  { field: "actions", header: "",       pinned: "right", width: 90 }
];
```

## Pin both edges

Combine left and right pinning to lock context on both sides:

```js
const columns = [
  { field: "id",      header: "ID",    pinned: "left",  width: 70 },
  { field: "name",    header: "Name",  pinned: "left",  width: 200 },
  { field: "q1",      header: "Q1", type: "currency" },
  { field: "q2",      header: "Q2", type: "currency" },
  { field: "q3",      header: "Q3", type: "currency" },
  { field: "q4",      header: "Q4", type: "currency" },
  { field: "total",   header: "Total", type: "currency", pinned: "right", width: 130 }
];
```

## Complete example

<FrameworkTabs>
<TabItem value="vanilla" label="Vanilla JS">

```js
const columns = [
  { field: "id",         header: "ID",       pinned: "left",  width: 70 },
  { field: "name",       header: "Employee", pinned: "left",  width: 200 },
  { field: "department", header: "Department" },
  { field: "email",      header: "Email" },
  { field: "salary",     header: "Salary", type: "currency" },
  { field: "actions",    header: "",        pinned: "right", width: 90 }
];

new PhotonGrid.GridCore(document.getElementById("grid"), { columns, data: rowData });
```

</TabItem>
<TabItem value="react" label="React">

```tsx
import { PhotonGrid } from 'photon-grid-react';

const columns = [
  { field: 'id',         header: 'ID',       pinned: 'left',  width: 70 },
  { field: 'name',       header: 'Employee', pinned: 'left',  width: 200 },
  { field: 'department', header: 'Department' },
  { field: 'email',      header: 'Email' },
  { field: 'salary',     header: 'Salary', type: 'currency' },
  { field: 'actions',    header: '',        pinned: 'right', width: 90 },
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
  columns = [
    { field: 'id',         header: 'ID',       pinned: 'left',  width: 70 },
    { field: 'name',       header: 'Employee', pinned: 'left',  width: 200 },
    { field: 'department', header: 'Department' },
    { field: 'email',      header: 'Email' },
    { field: 'salary',     header: 'Salary', type: 'currency' },
    { field: 'actions',    header: '',        pinned: 'right', width: 90 },
  ];
  rowData = rowData;
}
```

</TabItem>
<TabItem value="vue" label="Vue">

```vue
<script setup lang="ts">
import { PhotonGrid } from 'photon-grid-vue';

const columns = [
  { field: 'id',         header: 'ID',       pinned: 'left',  width: 70 },
  { field: 'name',       header: 'Employee', pinned: 'left',  width: 200 },
  { field: 'department', header: 'Department' },
  { field: 'email',      header: 'Email' },
  { field: 'salary',     header: 'Salary', type: 'currency' },
  { field: 'actions',    header: '',        pinned: 'right', width: 90 },
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

:::tip Pin from the column menu
Users can also pin and unpin columns at runtime from the column "⋯" menu. See
[Column Menu](./column-menu.md).
:::

## Next steps

- [Column Definitions](./column-definitions.md) — the full `ColumnDef` reference.
- [Column Widths](./column-widths.md) · [Column Groups](./column-groups.md)
