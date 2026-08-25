---
sidebar_position: 4
title: "Calculated Columns"
description: "Create derived and computed column values in Photon Grid, the JavaScript data grid, using a column renderer to format salaries or combine fields into a display value."
keywords: [photon grid, javascript data grid, calculated columns, computed columns, renderer, derived values]
---

# Calculated Columns

A calculated column shows a value that is **derived** from a row rather than stored directly on it — a formatted salary, a combined label, or a computed status. In Photon Grid you build these with a column `renderer`, which controls exactly what the JavaScript data grid displays for each cell.

## Overview

Sometimes the value you want to show does not exist verbatim in your data. You might store `salary: 85000` but want to display `$85,000`, or store separate fields you want to present as one label. A `renderer` receives the row's data and returns the content the cell should show, leaving your underlying data untouched.

Because the calculation happens at render time, the source data stays clean and you keep a single source of truth.

## Formatting a value with a renderer

The most common calculated column reformats an existing field. Here a `salary` column keeps its raw numeric field but displays a currency-formatted string through a `renderer`:

```js
const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0
});

const columns = [
  {
    field: "salary",
    header: "Salary",
    colId: "salary",
    width: 140,
    renderer: (params) => currency.format(params.value)
  }
];
```

The grid still sorts and filters on the raw `salary` number, while the cell shows the formatted text.

## Combining fields into one column

A `renderer` can read the whole row, so you can compose a display value from several fields. This column produces a single label from `name` and `department`:

```js
{
  header: "Employee",
  colId: "employeeLabel",
  field: "name",
  flex: 1,
  minWidth: 200,
  renderer: (params) => {
    const row = params.data;
    return `${row.name} — ${row.department}`;
  }
}
```

Set a stable `colId` on derived columns so you can still target them with `grid.api` even though the displayed value is computed.

:::note
Renderer parameters expose the cell `value` and the full row `data`. Keep renderer logic pure — return the display value and avoid side effects — so cells re-render predictably.
:::

## Live Example

<iframe
  src="/examples/calculated-columns/index.html"
  width="100%"
  height="500"
  style={{border: '1px solid #ddd', borderRadius: '8px'}}
></iframe>

## API Reference

| Option | Type | Description |
| --- | --- | --- |
| `renderer` | `function` \| `object` | Returns the content displayed for each cell; receives the cell value and row data. |
| `field` | `string` | Underlying data field the column reads (sorting/filtering use this). |
| `colId` | `string` | Stable column id for a derived column. |
| `header` | `string` | Header label. |
| `width` | `number` | Fixed column width in pixels. |
| `flex` | `number` | Proportional grow factor. |
| `minWidth` | `number` | Minimum width. |

## Related

- [Columns Definition](/docs/more-photon-features/columns-definition)
- [Columns Overview](/docs/more-photon-features/columns-overview)
- [Auto Generate Columns](/docs/more-photon-features/auto-generate-columns)
