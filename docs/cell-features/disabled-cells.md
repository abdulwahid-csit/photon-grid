---
title: "Disabled Cells"
description: "Make cells read-only in Photon Grid — disable editing per column with editable, lock columns against edits, and block editing conditionally with a validator. Vanilla JS, React, Angular, and Vue examples."
keywords:
  - photon grid disabled cells
  - read only cells
  - non editable column
  - lock column grid
  - editable false
  - prevent cell editing
---

# Disabled Cells

A "disabled" cell is one the user cannot edit. In Photon Grid, editing is opt-in
per column, so cells are read-only by default. You control editability with the
`editable` and `locked` column properties, and can block edits conditionally with
a validator.

## Read-only by default

Editing is off unless you enable it. In a grid with editing turned on, leave
`editable` unset (or `false`) on any column that should stay read-only.

<FrameworkTabs>
<TabItem value="vanilla" label="Vanilla JS">

```js
const columns = [
  { field: "id",     header: "ID",       colId: "id",     editable: false }, // read-only
  { field: "name",   header: "Employee", colId: "name",   editable: true  }, // editable
  { field: "salary", header: "Salary",   colId: "salary", type: "currency", editable: true },
  { field: "createdAt", header: "Created", colId: "createdAt", type: "date" } // read-only
];

new PhotonGrid.GridCore(document.getElementById("grid"), {
  columns,
  data: rowData,
  editing: { mode: "cell" }
});
```

</TabItem>
<TabItem value="react" label="React">

```tsx
import { PhotonGrid } from 'photon-grid-react';

const columns = [
  { field: 'id', header: 'ID', colId: 'id', editable: false },
  { field: 'name', header: 'Employee', colId: 'name', editable: true },
  { field: 'salary', header: 'Salary', colId: 'salary', type: 'currency', editable: true },
  { field: 'createdAt', header: 'Created', colId: 'createdAt', type: 'date' },
];

export function App() {
  return (
    <div style={{ width: '100%', height: 500 }}>
      <PhotonGrid columns={columns} dataSet={rowData} options={{ editing: { mode: 'cell' } }} />
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
    { field: 'id', header: 'ID', colId: 'id', editable: false },
    { field: 'name', header: 'Employee', colId: 'name', editable: true },
    { field: 'salary', header: 'Salary', colId: 'salary', type: 'currency', editable: true },
    { field: 'createdAt', header: 'Created', colId: 'createdAt', type: 'date' },
  ];
  rowData = rowData;
  options = { editing: { mode: 'cell' } };
}
```

</TabItem>
<TabItem value="vue" label="Vue">

```vue
<script setup lang="ts">
import { PhotonGrid } from 'photon-grid-vue';

const columns = [
  { field: 'id', header: 'ID', colId: 'id', editable: false },
  { field: 'name', header: 'Employee', colId: 'name', editable: true },
  { field: 'salary', header: 'Salary', colId: 'salary', type: 'currency', editable: true },
  { field: 'createdAt', header: 'Created', colId: 'createdAt', type: 'date' },
];
const options = { editing: { mode: 'cell' } };
</script>

<template>
  <div style="width: 100%; height: 500px;">
    <PhotonGrid :columns="columns" :dataSet="rowData" :options="options" />
  </div>
</template>
```

</TabItem>
</FrameworkTabs>

## Disable editing

| Column property | Type | Effect |
|-----------------|------|--------|
| `editable` | `boolean` | `false` (default) makes the column read-only. |
| `locked` | `boolean` | Locks the column so its cells cannot be edited **regardless** of `editable`. Toggled by the column menu's "Lock Column". |

`locked` is a hard override — useful for columns that should never be edited even
when editing is otherwise enabled, and it can be toggled at runtime from the
column menu:

```js
const columns = [
  { field: "invoiceNo", header: "Invoice #", locked: true },   // never editable
  { field: "amount",    header: "Amount", type: "currency", editable: true }
];
```

## Conditionally block edits

To disable editing only for certain values, keep the column `editable` and use a
`validatorFn` that rejects changes you don't want to allow. The validator returns
an error message string to reject, or `null` to accept:

```js
{
  field: "status", header: "Status", editable: true,
  validatorFn: (value) =>
    value === "archived" ? "Archived records can't be changed" : null
}
```

To visually mark read-only cells, combine with
[`cellCssClass`](./conditional-formatting.md):

```js
{
  field: "id", header: "ID", editable: false,
  cellCssClass: () => "cell-readonly"
}
```

## Disable editing for the whole grid

Set the grid's editing `mode` to `'none'` to make every cell read-only,
regardless of per-column `editable` flags:

```js
new PhotonGrid.GridCore(el, {
  columns,
  data: rowData,
  editing: { mode: "none" }   // fully read-only grid
});
```

## Next steps

- [Conditional Formatting](./conditional-formatting.md) — visually mark read-only cells.
- [Formatting Cells](./formatting-cells.md) · [Cell Selection](./selection.md)
- [Configuration options → Editing](../getting-started/configuration-options.md#editing).
