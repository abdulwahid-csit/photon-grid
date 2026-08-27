---
sidebar_position: 2
title: "Columns Definition"
description: "A complete tour of the Photon Grid column definition object for the JavaScript data grid, covering every confirmed key from field and header to pinned, sortable, and tooltip."
keywords: [photon grid, javascript data grid, column definition, column options, sortable, pinned]
---

# Columns Definition

Every column in Photon Grid is described by a **column definition** — a plain JavaScript object whose keys configure how the column reads data, renders, and behaves. This page is a complete reference to every confirmed key you can put on a column definition in this JavaScript data grid.

## Overview

You supply column definitions as the `columns` array when creating the grid. A definition can be as small as a `field`, or it can enable sizing, sorting, filtering, editing, pinning, tooltips, and more:

```js
const columns = [
  {
    field: "name",
    header: "Employee",
    colId: "name",
    flex: 1,
    minWidth: 160,
    sortable: true,
    filter: true,
    tooltip: "Full employee name"
  }
];
```

Add only the keys you need — every key is optional except a `field` (or a `renderer`) to produce a value.

## Column definition keys

The table below lists every confirmed key you can set on a column definition.

| Key | Type | Description |
| --- | --- | --- |
| `field` | `string` | Row property the cell value is read from. |
| `header` | `string` | Header label text. Falls back to the field name if omitted. |
| `colId` | `string` | Stable column id used by every `grid.api` column method. |
| `width` | `number` | Fixed column width in pixels. |
| `minWidth` | `number` | Minimum width the column can shrink to when resized or flexed. |
| `flex` | `number` | Proportional grow factor for sharing remaining horizontal space. |
| `configurable` | `boolean` | Whether the user may hide or configure this column. |
| `sortable` | `boolean` | Enables clicking the header to sort by this column. |
| `filter` | `boolean` \| `object` | Enables column filtering, or a filter configuration object. |
| `editable` | `boolean` | Allows in-cell editing of this column's values. |
| `editor` | `string` | Editor type: `text`, `number`, `date`, `time`, `checkbox`, `dropdown`, `select`, or `boolean`. |
| `dropdownOptions` | `array` | Options list for `dropdown` / `select` editors. |
| `resizable` | `boolean` | Allows the user to drag the column border to resize. |
| `pinned` | `string` | Pins the column to `"left"` or `"right"`. |
| `hide` | `boolean` | Hides the column initially without removing its definition. |
| `checkboxSelection` | `boolean` | Renders a row selection checkbox in this column. |
| `singleClickEdit` | `boolean` | Starts editing on a single click instead of a double click. |
| `tooltip` | `string` \| `object` | Tooltip text or configuration shown on hover. |
| `renderer` | `function` \| `object` | Custom cell renderer that returns the displayed content. |
| `columnGroup` | `object` | Marks a group header containing `children` column definitions. |
| `children` | `array` | Child column definitions nested under a column group. |
| `marryChildren` | `boolean` | Keeps grouped children together when columns move. |

## Sizing keys

Use `width` for fixed columns and `flex` for proportional ones. Pair `flex` with `minWidth` so columns stay readable on narrow layouts:

```js
{ field: "department", header: "Department", colId: "department", flex: 1, minWidth: 140 }
```

## Interaction keys

Enable per-column interactions directly on the definition:

```js
{
  field: "salary",
  header: "Salary",
  colId: "salary",
  sortable: true,
  filter: true,
  resizable: true,
  tooltip: "Annual gross salary in USD"
}
```

## Pinning a column

Set `pinned` to keep a column fixed while the rest of the grid scrolls horizontally:

```js
{ field: "id", header: "ID", colId: "id", width: 80, pinned: "left" }
```

See [Columns Pinning](/docs/columns/column-freezing) for pinning at runtime.

## Live Example

<iframe
  src="/examples/columns-definition/index.html"
  width="100%"
  height="500"
  style={{border: '1px solid #ddd', borderRadius: '8px'}}
></iframe>

## API Reference

| Option | Type | Description |
| --- | --- | --- |
| `field` | `string` | Row property to display. |
| `header` | `string` | Header label. |
| `colId` | `string` | Stable column id. |
| `width` | `number` | Fixed width in pixels. |
| `minWidth` | `number` | Minimum width. |
| `flex` | `number` | Proportional grow factor. |
| `sortable` | `boolean` | Enable header sorting. |
| `filter` | `boolean` \| `object` | Enable column filtering. |
| `resizable` | `boolean` | Allow drag-to-resize. |
| `pinned` | `string` | Pin `"left"` or `"right"`. |
| `tooltip` | `string` \| `object` | Hover tooltip. |

## Related

- [Columns Overview](/docs/more-photon-features/columns-overview)
- [Columns Pinning](/docs/columns/column-freezing)
- [Columns Resizing](/docs/columns/column-widths)
- [Calculated Columns](/docs/more-photon-features/calculated-columns)
