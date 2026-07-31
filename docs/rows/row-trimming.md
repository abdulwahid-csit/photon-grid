---
title: "Row Trimming"
description: "Remove rows from Photon Grid — delete rows by id, apply row transactions to remove many at once, and replace the whole dataset. Vanilla JS, React, Angular, and Vue examples."
keywords:
  - photon grid remove rows
  - delete rows data grid
  - row transaction remove
  - trim rows
  - removeRows applyTransaction
  - clear grid data
---

# Row Trimming

Row trimming is about **removing rows from the dataset** — permanently, unlike
[hiding rows](./row-hiding.md), which only filters them out of view. Photon Grid
removes rows by id, in bulk via a transaction, or by replacing the whole dataset.

## Remove rows by id

`removeRows(nodeIds)` deletes one or more rows by their `nodeId`. A row's
`nodeId` is the value of its id field when one was supplied at `setData` time.

<FrameworkTabs>
<TabItem value="vanilla" label="Vanilla JS">

```js
const grid = new PhotonGrid.GridCore(document.getElementById("grid"), {
  columns,
  data: rowData
});

grid.api.removeRows(["3"]);          // remove a single row
grid.api.removeRows(["5", "6", "7"]); // remove several rows
```

</TabItem>
<TabItem value="react" label="React">

```tsx
import { PhotonGrid } from 'photon-grid-react';

export function App() {
  let api: any;
  return (
    <>
      <button onClick={() => api?.removeRows(['3'])}>Remove row 3</button>
      <div style={{ width: '100%', height: 500 }}>
        <PhotonGrid columns={columns} dataSet={rowData} options={{ onReady: (a) => (api = a) }} />
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
    <button (click)="api?.removeRows(['3'])">Remove row 3</button>
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
  <button @click="api?.removeRows(['3'])">Remove row 3</button>
  <div style="width: 100%; height: 500px;">
    <PhotonGrid :columns="columns" :dataSet="rowData" :options="options" />
  </div>
</template>
```

</TabItem>
</FrameworkTabs>

## Remove rows with a transaction

`applyTransaction` applies a batch of row mutations in a single pass. Its
`remove` array carries the `nodeId`s to delete — combine it with `add` / `update`
to change many rows at once.

```js
grid.api.applyTransaction({
  remove: ["3", "8"],                    // delete these rows
  add:    [{ id: 20, name: "New Hire" }], // and add a new one
});
```

| Transaction field | Type | Description |
|-------------------|------|-------------|
| `add` | `object[]` | New rows to append. |
| `update` | `object[]` | Existing rows to shallow-merge, matched by `nodeId`. |
| `remove` | `string[]` | `nodeId`s of rows to remove. |

For large batches that shouldn't block the UI, use `applyTransactionAsync`, which
schedules the same operation asynchronously.

## Remove selected rows

Combine [selection](./row-headers.md) with `removeRows` to delete whatever the
user has selected:

```js
const selectedIds = grid.api.getSelectedRowIds();
grid.api.removeRows(selectedIds);
```

## Clear or replace all rows

To remove every row, set an empty dataset; to replace the data wholesale, pass
the new array:

```js
grid.api.setData([]);          // remove all rows
grid.api.setData(freshRows);   // replace the entire dataset
```

## Next steps

- [Row Pre-populating](./row-pre-populating.md) — seed and add rows.
- [Row Hiding](./row-hiding.md) — hide rows non-destructively with filters.
- [Row Headers](./row-headers.md) — select the rows to remove.
