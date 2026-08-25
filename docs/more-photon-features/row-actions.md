---
sidebar_position: 4
title: "Row Actions"
description: "React to row interaction in Photon Grid with row:clicked, row:doubleClicked, and cell:clicked events, and add a custom Actions column with a cell renderer."
keywords: [photon grid, javascript data grid, row actions, row clicked event, cell renderer, action column]
---

# Row Actions

**Row actions** let you respond when a user interacts with a row, and let you surface per-row controls such as a View or Edit button. Photon Grid exposes click events through `grid.api` and lets you render custom action cells with a column `renderer`.

## Overview

There are two complementary patterns for row actions:

- **Listen for interaction events** — subscribe to `row:clicked`, `row:doubleClicked`, or `cell:clicked` to run logic when the user touches a row or cell.
- **Render an actions column** — use a column `renderer` to draw buttons or links directly inside a cell, then react to clicks on them.

Combine both to build rich, interactive tables.

## Listening for row interaction

Subscribe to interaction events after the grid is created. Each handler receives an event describing what the user clicked.

```js
const grid = new PhotonGrid.GridCore(
  document.getElementById("grid"),
  { columns, data: rowData, headerRowHeight: 48, rowHeight: 42 }
);

const api = grid.api;

api.on("row:clicked", (event) => {
  console.log("Row clicked", event);
});

api.on("row:doubleClicked", (event) => {
  console.log("Row double-clicked", event);
});

api.on("cell:clicked", (event) => {
  console.log("Cell clicked", event);
});
```

## Adding an actions column

Define a column with a `renderer` to draw custom content in each cell. The renderer returns the markup shown for that cell.

```js
const columns = [
  { field: "name",       header: "Employee",   colId: "name",       flex: 1 },
  { field: "department", header: "Department", colId: "department", flex: 1 },
  {
    header: "Actions",
    colId: "actions",
    width: 140,
    renderer: () => '<button class="pg-action">View</button>'
  }
];
```

To respond when the button is clicked, listen for `cell:clicked` and check which column was clicked.

```js
api.on("cell:clicked", (event) => {
  if (event && event.colId === "actions") {
    console.log("Action clicked for row", event.data);
  }
});
```

## Live Example

<iframe
  src="/examples/row-actions/index.html"
  width="100%"
  height="500"
  style={{border: '1px solid #ddd', borderRadius: '8px'}}
></iframe>

## API Reference

| Option / Method | Type | Description |
| --- | --- | --- |
| `renderer` | `function` | Renders custom cell content, such as action buttons. |
| `row:clicked` | `event` | Fires when a user clicks a row. |
| `row:doubleClicked` | `event` | Fires when a user double-clicks a row. |
| `cell:clicked` | `event` | Fires when a user clicks a cell. |
| `on(type, handler)` | `method` | Subscribes to a grid event. |

## Related

- [Rows Overview](/docs/more-photon-features/rows-overview)
- [Row Checkboxes](/docs/more-photon-features/row-checkboxes)
- [Row Numbers](/docs/rows/row-headers)
- [Quick Start](/docs/more-photon-features/quick-start)
