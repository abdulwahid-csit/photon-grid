---
sidebar_position: 1
title: "Columns Overview"
description: "Learn how columns work in Photon Grid, the JavaScript data grid. Understand the column definition object, colId, field, header, and sizing with width and flex."
keywords: [photon grid, javascript data grid, columns, column definition, colId, column sizing]
---

# Columns Overview

Columns are the foundation of every Photon Grid. Each column is described by a plain **column definition** object that tells the JavaScript data grid which field to display, how to label it, and how to size and behave. This page explains the core concepts you will use on every grid you build.

## Overview

A Photon Grid is configured with a `columns` array. Every entry in that array is a column definition — a simple object whose keys turn features on or off for that column. You pass the array to the grid through the `columns` option:

```js
const columns = [
  { field: "id",   header: "ID",       colId: "id",   width: 80, configurable: false },
  { field: "name", header: "Employee", colId: "name", flex: 1 }
];

new PhotonGrid.GridCore(document.getElementById("grid"), {
  columns,
  data: rowData
});
```

Because a column definition is just data, you can build it inline, load it from an API, or generate it programmatically — see [Auto Generate Columns](/docs/more-photon-features/auto-generate-columns).

## The column definition object

The three keys you will use most often are `field`, `header`, and `colId`.

| Key | What it does |
| --- | --- |
| `field` | The property name read from each row object. For a row `{ name: "John Smith" }`, `field: "name"` displays `John Smith`. |
| `header` | The text shown in the column header. If omitted, the grid falls back to the field name. |
| `colId` | A stable, unique identifier for the column. Almost every `grid.api` column method takes a `colId`, so setting it explicitly keeps your code predictable. |

```js
{
  field: "department",   // read row.department
  header: "Department",  // label shown in the header
  colId: "department"    // stable id used by the API
}
```

Set `colId` on every column. It decouples your API calls from the underlying `field`, which matters when two columns read the same field or when a column is derived.

## Sizing columns: width vs flex

Photon Grid gives you two ways to size a column, and you pick one per column.

- **`width`** — a fixed pixel width. The column always renders at that size regardless of the grid's width. Use it for narrow, predictable columns such as an ID or a status flag.
- **`flex`** — a proportional grow factor. Flex columns share the remaining horizontal space after all fixed-width columns are laid out. A column with `flex: 2` takes twice the space of a column with `flex: 1`.

```js
const columns = [
  { field: "id",         header: "ID",         colId: "id",         width: 80 },   // fixed
  { field: "name",       header: "Employee",   colId: "name",       flex: 2 },     // 2 shares
  { field: "department", header: "Department", colId: "department", flex: 1 },     // 1 share
  { field: "country",    header: "Country",    colId: "country",    flex: 1 }      // 1 share
];
```

You can combine `flex` with `minWidth` to stop a proportional column from collapsing on narrow screens:

```js
{ field: "name", header: "Employee", colId: "name", flex: 1, minWidth: 160 }
```

Reach for `width` when a column has a known, constant size, and `flex` when you want columns to fill the available space responsively.

## Live Example

<iframe
  src="/examples/columns-overview/index.html"
  width="100%"
  height="500"
  style={{border: '1px solid #ddd', borderRadius: '8px'}}
></iframe>

## API Reference

| Option | Type | Description |
| --- | --- | --- |
| `columns` | `array` | The array of column definitions passed to the grid. |
| `field` | `string` | Row property to read the cell value from. |
| `header` | `string` | Column header label. |
| `colId` | `string` | Stable column id used by `grid.api` column methods. |
| `width` | `number` | Fixed column width in pixels. |
| `minWidth` | `number` | Minimum width a column may shrink to. |
| `flex` | `number` | Proportional grow factor for sharing remaining width. |
| `configurable` | `boolean` | Whether the user can hide or configure the column. |

## Related

- [Columns Definition](/docs/more-photon-features/columns-definition)
- [Auto Generate Columns](/docs/more-photon-features/auto-generate-columns)
- [Columns Resizing](/docs/columns/column-widths)
- [Quick Start](/docs/more-photon-features/quick-start)
