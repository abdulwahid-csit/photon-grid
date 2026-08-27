---
title: "Cell Selection"
description: "Select cells and ranges in Photon Grid — single-cell focus, rectangular range selection, clipboard copy/paste, and the selection API. Vanilla JS, React, Angular, and Vue examples."
keywords:
  - photon grid cell selection
  - range selection data grid
  - select cells
  - clipboard copy paste grid
  - CellRange getCellRanges
  - focused cell
  - excel-like selection
---

# Cell Selection

Photon Grid supports spreadsheet-style cell selection: focus a single cell,
drag out a rectangular range, and copy/paste to and from the clipboard. Each
capability is a separate opt-in so you enable exactly what you need.

## Enable cell & range selection

Turn on the features with three grid options:

| Option | Type | Description |
|--------|------|-------------|
| `enableCellSelection` | `boolean` | Select and focus individual cells. |
| `enableRangeSelection` | `boolean` | Drag to select a rectangular range of cells. |
| `enableClipboard` | `boolean` | Copy (and paste) selected cells via the clipboard. |

<FrameworkTabs>
<TabItem value="vanilla" label="Vanilla JS">

```js
new PhotonGrid.GridCore(document.getElementById("grid"), {
  columns,
  data: rowData,
  enableCellSelection: true,
  enableRangeSelection: true,
  enableClipboard: true
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
          enableCellSelection: true,
          enableRangeSelection: true,
          enableClipboard: true,
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
    enableCellSelection: true,
    enableRangeSelection: true,
    enableClipboard: true,
  };
}
```

</TabItem>
<TabItem value="vue" label="Vue">

```vue
<script setup lang="ts">
import { PhotonGrid } from 'photon-grid-vue';

const options = {
  enableCellSelection: true,
  enableRangeSelection: true,
  enableClipboard: true,
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

<LiveGrid preset="finance" height={360} options={{enableCellSelection: true, enableRangeSelection: true, enableClipboard: true}} title="Click a cell, drag to select a range, then press Ctrl/Cmd+C to copy" />

## Interacting with selections

- **Click** a cell to focus it.
- **Click and drag** (with `enableRangeSelection`) to select a rectangular range.
- **Shift+Click** to extend the range from the current anchor.
- **Ctrl/Cmd+C** (with `enableClipboard`) to copy the selected cells as
  tab-separated values, ready to paste into a spreadsheet.
- **Arrow keys** move the focused cell; **Shift+Arrow** grows the range.

## Selection API

A cell range is described by a `CellRange`:

| Field | Type | Description |
|-------|------|-------------|
| `startRowIndex` | `number` | First row of the range. |
| `endRowIndex` | `number` | Last row of the range. |
| `startColIndex` | `number` | First column of the range. |
| `endColIndex` | `number` | Last column of the range. |

| Method | Description |
|--------|-------------|
| `getCellRanges()` | Return the currently selected `CellRange`s. |
| `setCellRange(range)` | Programmatically select a rectangular range. |
| `clearCellSelection()` | Clear the current cell/range selection. |
| `setFocusedCell(rowIndex, colId)` | Focus a specific cell. |
| `getFocusedCell()` | Return `{ rowIndex, colId }` for the focused cell, or `null`. |

```js
const grid = new PhotonGrid.GridCore(el, {
  columns,
  data: rowData,
  enableCellSelection: true,
  enableRangeSelection: true
});

// Select the first three rows across the first two columns.
grid.api.setCellRange({ startRowIndex: 0, endRowIndex: 2, startColIndex: 0, endColIndex: 1 });

console.log(grid.api.getCellRanges());
grid.api.setFocusedCell(0, "name");
console.log(grid.api.getFocusedCell()); // { rowIndex: 0, colId: 'name' }
```

## Cell vs. row selection

Cell selection (this page) highlights individual cells and ranges. To select
whole **rows** — with checkboxes or a serial-column handle — see
[Row Headers](../rows/row-headers.md).

## Next steps

- [Row Headers](../rows/row-headers.md) — row-level selection with checkboxes.
- [Text Alignment](./text-alignment.md) · [Formatting Cells](./formatting-cells.md)
- [Configuration options](../getting-started/configuration-options.md#interaction-toggles).
