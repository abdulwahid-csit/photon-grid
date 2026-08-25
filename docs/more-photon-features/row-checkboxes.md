---
sidebar_position: 5
title: "Row Checkboxes"
description: "Add row selection checkboxes in Photon Grid with checkboxSelection and multiple mode, then use selectAll, deselectAll, and getSelectedRows to manage selection."
keywords: [photon grid, javascript data grid, row checkboxes, checkboxSelection, row selection, getSelectedRows]
---

# Row Checkboxes

**Row checkboxes** give users a familiar way to select one or many rows. Photon Grid renders a checkbox in the column you choose and exposes selection state through `grid.api`, so you can build Select all, Clear, and selected-count controls.

## Overview

Checkbox selection combines two pieces of configuration: a column that shows the checkbox, and a selection mode that decides whether users can pick one row or several. Once configured, the grid keeps the selection in sync and emits events as rows are selected and deselected.

## Enabling checkbox selection

Add `checkboxSelection: true` to the column that should display the checkbox, and set the grid `selection` mode to `"multiple"` so users can select more than one row.

```js
const columns = [
  { field: "name",       header: "Employee",   colId: "name",       flex: 1, checkboxSelection: true },
  { field: "department", header: "Department", colId: "department", flex: 1 },
  { field: "salary",     header: "Salary",     colId: "salary",     flex: 1 }
];

const grid = new PhotonGrid.GridCore(
  document.getElementById("grid"),
  {
    columns,
    data: rowData,
    selection: { mode: "multiple" },
    headerRowHeight: 48,
    rowHeight: 42
  }
);
```

Use `mode: "single"` instead if only one row should be selectable at a time.

## Managing selection from the API

`grid.api` exposes methods to select and read rows programmatically.

```js
const api = grid.api;

api.selectRow(1);          // select a row by id
api.selectAll();           // select every row
api.deselectAll();         // clear the selection
api.getSelectedRows();     // array of selected row objects
api.getSelectedCount();    // number of selected rows
```

## Reacting to selection changes

Subscribe to `row:selected` and `row:allSelected` to keep a counter or an action bar up to date.

```js
api.on("row:selected", (event) => {
  console.log("Selected count", api.getSelectedCount());
});

api.on("row:allSelected", (event) => {
  console.log("All rows selected");
});
```

## Live Example

<iframe
  src="/examples/row-checkboxes/index.html"
  width="100%"
  height="500"
  style={{border: '1px solid #ddd', borderRadius: '8px'}}
></iframe>

## API Reference

| Option / Method | Type | Description |
| --- | --- | --- |
| `checkboxSelection` | `boolean` | Shows a selection checkbox in the column. |
| `selection` | `object` | Selection config; `mode` is `"single"` or `"multiple"`. |
| `selectRow(id)` | `method` | Selects a single row by id. |
| `selectAll()` | `method` | Selects every row. |
| `deselectAll()` | `method` | Clears the current selection. |
| `getSelectedRows()` | `method` | Returns the selected row objects. |
| `getSelectedCount()` | `method` | Returns the number of selected rows. |
| `row:selected` | `event` | Fires when a row is selected. |
| `row:allSelected` | `event` | Fires when all rows are selected. |

## Related

- [Rows Overview](/docs/more-photon-features/rows-overview)
- [Row Actions](/docs/more-photon-features/row-actions)
- [Grouping](/docs/more-photon-features/row-grouping)
- [Quick Start](/docs/more-photon-features/quick-start)
