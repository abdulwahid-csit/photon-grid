---
sidebar_position: 3
title: "Auto Generate Columns"
description: "Generate Photon Grid column definitions programmatically from your data in the JavaScript data grid by mapping the keys of the first row into column objects."
keywords: [photon grid, javascript data grid, auto generate columns, dynamic columns, column definition]
---

# Auto Generate Columns

When your data shape is not known ahead of time, you can build Photon Grid column definitions **programmatically** from the data itself. This page shows how to generate columns from the keys of the first data row so the JavaScript data grid adapts to whatever structure you feed it.

## Overview

A column definition is just an object, and the `columns` option is just an array. That means you can produce the array with ordinary JavaScript instead of hand-writing each column. The most common approach is to read the keys of the first row and map each one into a column definition.

This is ideal when you load rows from an API, a CSV import, or a query where the fields vary between requests.

## Generating columns from the first row

Read `Object.keys` of the first row and map each key into a column definition. Use the key as both the `field` and the `colId`, and derive a readable `header`:

```js
function buildColumns(rows) {
  if (!rows.length) return [];

  return Object.keys(rows[0]).map((key) => ({
    field: key,
    colId: key,
    header: key.charAt(0).toUpperCase() + key.slice(1),
    flex: 1,
    sortable: true
  }));
}

const columns = buildColumns(rowData);

new PhotonGrid.GridCore(document.getElementById("grid"), {
  columns,
  data: rowData
});
```

Every generated column gets `flex: 1` so the columns share width evenly, and `sortable: true` so each is immediately sortable.

## Customizing generated columns

You rarely want every column treated identically. Because you are in plain JavaScript, you can special-case fields as you map them — for example, giving an `id` field a fixed width and locking it from configuration:

```js
const columns = Object.keys(rowData[0]).map((key) => {
  const col = {
    field: key,
    colId: key,
    header: key.charAt(0).toUpperCase() + key.slice(1),
    sortable: true
  };

  if (key === "id") {
    col.width = 80;
    col.configurable = false;
  } else {
    col.flex = 1;
    col.minWidth = 120;
  }

  return col;
});
```

This keeps the convenience of auto-generation while still applying the confirmed keys — `width`, `flex`, `minWidth`, `configurable`, `sortable` — where you need them.

## Live Example

<iframe
  src="/examples/auto-generate-columns/index.html"
  width="100%"
  height="500"
  style={{border: '1px solid #ddd', borderRadius: '8px'}}
></iframe>

## API Reference

| Option | Type | Description |
| --- | --- | --- |
| `columns` | `array` | Column definition array — here produced programmatically. |
| `field` | `string` | Row property to read; set from the row key. |
| `colId` | `string` | Stable column id; set from the row key. |
| `header` | `string` | Header label; derived from the row key. |
| `flex` | `number` | Proportional grow factor applied to generated columns. |
| `width` | `number` | Fixed width applied to special-cased columns. |
| `minWidth` | `number` | Minimum width for flexed columns. |
| `sortable` | `boolean` | Enables sorting on generated columns. |
| `configurable` | `boolean` | Whether a generated column may be hidden or configured. |

## Related

- [Columns Overview](/docs/more-photon-features/columns-overview)
- [Columns Definition](/docs/more-photon-features/columns-definition)
- [Calculated Columns](/docs/more-photon-features/calculated-columns)
