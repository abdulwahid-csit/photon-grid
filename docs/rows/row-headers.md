---
title: "Row Headers"
description: "Row headers in Photon Grid — show a serial-number (#) column, add row-selection checkboxes with single or multiple selection, and use the serial column as a selection handle. Vanilla JS, React, Angular, and Vue examples."
keywords:
  - photon grid row header
  - serial number column
  - row numbers grid
  - row selection checkbox
  - select all rows
  - showSerialNumber showCheckboxes
  - data grid row selection
---

# Row Headers

The row header is the leading area of each row — the serial-number (`#`) column
and the row-selection checkbox. Photon Grid lets you show either or both, and
choose how rows are selected.

## Serial number column

Set `showSerialNumber: true` to add a leading `#` column that numbers every row.

<FrameworkTabs>
<TabItem value="vanilla" label="Vanilla JS">

```js
new PhotonGrid.GridCore(document.getElementById("grid"), {
  columns,
  data: rowData,
  showSerialNumber: true
});
```

</TabItem>
<TabItem value="react" label="React">

```tsx
import { PhotonGrid } from 'photon-grid-react';

export function App() {
  return (
    <div style={{ width: '100%', height: 500 }}>
      <PhotonGrid columns={columns} dataSet={rowData} options={{ showSerialNumber: true }} />
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
  options = { showSerialNumber: true };
}
```

</TabItem>
<TabItem value="vue" label="Vue">

```vue
<script setup lang="ts">
import { PhotonGrid } from 'photon-grid-vue';

const options = { showSerialNumber: true };
</script>

<template>
  <div style="width: 100%; height: 500px;">
    <PhotonGrid :columns="columns" :dataSet="rowData" :options="options" />
  </div>
</template>
```

</TabItem>
</FrameworkTabs>

<LiveGrid preset="quickStart" height={320} options={{showSerialNumber: true}} title="showSerialNumber: true — a leading # column" />

## Selection checkboxes

Enable row-selection checkboxes with the `selection` option. Set the selection
`mode` and turn on `checkboxSelection`; add `headerCheckbox` for a select-all box
in the header.

<FrameworkTabs>
<TabItem value="vanilla" label="Vanilla JS">

```js
new PhotonGrid.GridCore(document.getElementById("grid"), {
  columns,
  data: rowData,
  selection: {
    mode: "multiple",       // "single" | "multiple" | "none"
    checkboxSelection: true,
    headerCheckbox: true
  }
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
        options={{
          selection: { mode: 'multiple', checkboxSelection: true, headerCheckbox: true },
        }}
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
  options = {
    selection: { mode: 'multiple', checkboxSelection: true, headerCheckbox: true },
  };
}
```

</TabItem>
<TabItem value="vue" label="Vue">

```vue
<script setup lang="ts">
import { PhotonGrid } from 'photon-grid-vue';

const options = {
  selection: { mode: 'multiple', checkboxSelection: true, headerCheckbox: true },
};
</script>

<template>
  <div style="width: 100%; height: 500px;">
    <PhotonGrid :columns="columns" :dataSet="rowData" :options="options" />
  </div>
</template>
```

</TabItem>
</FrameworkTabs>

<LiveGrid preset="quickStart" height={320} options={{selection: {mode: 'multiple', checkboxSelection: true, headerCheckbox: true}}} title="Row checkboxes with a select-all header box" />

### Selection options

The `selection` option accepts a partial `SelectionConfig`:

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `mode` | `'single' \| 'multiple' \| 'none'` | `'none'` | Row selection mode. |
| `checkboxSelection` | `boolean` | `false` | Show a checkbox in each row. |
| `headerCheckbox` | `boolean` | `false` | Show a select-all checkbox in the header. |
| `selectAllOnHeaderClick` | `boolean` | `false` | Selecting the header selects all rows. |
| `suppressRowDeselection` | `boolean` | `false` | Prevent deselecting a row by re-clicking it. |
| `serialColumnSelection` | `boolean` | `false` | Make the serial-number column act as a selection handle (see below). |

## Serial column selection

With `showSerialNumber`, a non-`none` selection `mode`, and
`serialColumnSelection: true`, the `#` column becomes a selection handle:
mouse-down on a serial cell selects the row, dragging extends a contiguous range,
Ctrl/Cmd toggles individual rows, and Shift selects a range from the anchor. With
rows selected, Ctrl+C copies them and Delete/Backspace removes them.

```js
new PhotonGrid.GridCore(el, {
  columns,
  data: rowData,
  showSerialNumber: true,
  selection: { mode: "multiple", serialColumnSelection: true }
});
```

## Reading and setting selection from the API

| Method | Description |
|--------|-------------|
| `selectRow(nodeId)` / `deselectRow(nodeId)` | Select or deselect one row. |
| `selectRows(nodeIds)` / `deselectRows(nodeIds)` | Select or deselect many rows. |
| `selectAll()` / `deselectAll()` | Select or clear all rows. |
| `selectRowsByIndex(indexes)` | Select rows by their zero-based indexes. |
| `selectRowRange(fromIndex, toIndex)` | Select a contiguous range. |
| `getSelectedRows()` | Return the selected `RowNode`s. |
| `getSelectedRowIds()` | Return the selected row ids. |
| `getSelectedCount()` | Return how many rows are selected. |

```js
const grid = new PhotonGrid.GridCore(el, {
  columns,
  data: rowData,
  selection: { mode: "multiple", checkboxSelection: true }
});

grid.api.selectAll();
console.log(grid.api.getSelectedCount(), "rows selected");
console.log(grid.api.getSelectedRows().map((r) => r.data));
```

## Next steps

- [Row Moving](./row-moving.md) — drag rows to reorder them.
- [Row Parent / Child](./row-parent-child.md) — tree data and master/detail rows.
- [Configuration options](../getting-started/configuration-options.md#selection).
