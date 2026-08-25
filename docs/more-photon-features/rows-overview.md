---
sidebar_position: 1
title: "Rows Overview"
description: "Understand the Photon Grid row data model, work with row objects, and read live row counts using getAllRows, getVisibleRows, and getDisplayedRowCount."
keywords: [photon grid, javascript data grid, row data model, grid rows, getAllRows, displayed row count]
---

# Rows Overview

The **row data model** is the foundation of Photon Grid. Every row you see on screen is backed by a plain JavaScript object, and the grid keeps its rendered rows in sync with the data array you provide. This page explains how row objects work and how to read row state through `grid.api`.

## Overview

You pass Photon Grid an array of row objects through the `data` option. Each object is a row, and each column's `field` maps to a property on that object. The grid never mutates your objects unexpectedly; instead you drive changes through the API and read the current state back out.

At any time your dataset splits into a few useful views:

- **All rows** — every row in the grid, regardless of filtering or grouping.
- **Visible rows** — the rows currently eligible to be shown after filtering and sorting.
- **Displayed row count** — the number of rows the grid is presenting right now.

Reading these views lets you build toolbars, status bars, and dashboards that stay accurate as the data changes.

## Defining rows

A row is just an object whose keys match your column `field` values.

```js
const columns = [
  { field: "id",         header: "ID",         colId: "id",         width: 80, configurable: false },
  { field: "name",       header: "Employee",   colId: "name",       flex: 1 },
  { field: "department", header: "Department", colId: "department", flex: 1 },
  { field: "country",    header: "Country",    colId: "country",    flex: 1 },
  { field: "salary",     header: "Salary",     colId: "salary",     flex: 1 }
];

const rowData = [
  { id: 1, name: "John Smith",    department: "Engineering", country: "USA", salary: 85000, active: true },
  { id: 2, name: "Sarah Johnson", department: "Finance",     country: "UK",  salary: 72000, active: true }
];

const grid = new PhotonGrid.GridCore(
  document.getElementById("grid"),
  { columns, data: rowData, headerRowHeight: 48, rowHeight: 42 }
);
```

## Reading rows through the API

Once the grid is constructed, use `grid.api` to inspect the current rows.

```js
const api = grid.api;

api.getAllRows();            // every row object in the grid
api.getVisibleRows();        // rows after filtering and sorting
api.getDisplayedRowCount();  // number of rows currently displayed
api.getRowByIndex(0);        // the row node at display index 0
```

`getRowByIndex(i)` is handy when you need positional access, for example to read the first or last visible row without scanning the whole array.

## Replacing and appending data

To swap the entire dataset, call `setData`. To add rows to the end without touching existing ones, call `appendData`.

```js
// Replace all rows
api.setData(newRows);

// Add rows to the end
api.appendData([
  { id: 9, name: "Liam Walker", department: "Sales", country: "USA", salary: 70000, active: true }
]);
```

After either call the displayed row count updates automatically, so any UI bound to `getDisplayedRowCount()` should be refreshed in response.

## Live Example

<iframe
  src="/examples/rows-overview/index.html"
  width="100%"
  height="500"
  style={{border: '1px solid #ddd', borderRadius: '8px'}}
></iframe>

## API Reference

| Option / Method | Type | Description |
| --- | --- | --- |
| `data` | `array` | Array of row objects supplied at construction. |
| `getAllRows()` | `method` | Returns every row object in the grid. |
| `getVisibleRows()` | `method` | Returns rows after filtering and sorting. |
| `getDisplayedRowCount()` | `method` | Returns the count of rows currently displayed. |
| `getRowByIndex(i)` | `method` | Returns the row node at the given display index. |
| `setData(rows)` | `method` | Replaces the entire dataset. |
| `appendData(rows)` | `method` | Appends rows to the end of the dataset. |

## Related

- [Sorting](/docs/rows/rows-sorting)
- [Grouping](/docs/more-photon-features/row-grouping)
- [Row Checkboxes](/docs/more-photon-features/row-checkboxes)
- [Quick Start](/docs/more-photon-features/quick-start)
