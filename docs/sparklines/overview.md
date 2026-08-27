---
sidebar_position: 1
title: "Sparklines Overview"
description: "Add in-cell sparkline mini charts to Photon Grid with the sparkline option. Compact per-row trend visuals that live inside grid cells in your data grid."
keywords: [photon grid, javascript data grid, sparklines, in-cell charts, sparkline option, mini charts]
---

# Sparklines

**Sparklines** are tiny charts that render inside a grid cell, giving each row a compact visual summary — a trend line, a set of bars, or a win/loss strip — right next to the data. In Photon Grid you enable them with the `sparkline` configuration.

## Overview

Where integrated charts turn a whole range into a standalone chart, sparklines are **per-cell** visuals. They are ideal when every row carries a small series (a history, a distribution, a set of period values) and you want to show its shape without leaving the table. Because they live in cells, sparklines stay aligned with the rest of your row data and scroll with the grid.

Sparklines are controlled by the `sparkline` option. The exact keys for binding a data series and choosing a sparkline style depend on your build, so keep configuration minimal and add only documented keys.

## Enabling sparklines

Pass the `sparkline` option when constructing the grid. The object below is an illustrative placeholder — it references the confirmed option to switch the feature on; extend it with the keys your build documents.

```js
const grid = new PhotonGrid.GridCore(document.getElementById("grid"), {
  columns,
  data: rowData,
  headerRowHeight: 48,
  rowHeight: 42,
  sparkline: {} // enable in-cell sparklines
});
```

Give sparklines a little extra `rowHeight` so the mini chart has room to render clearly within each cell.

## Live Example

<iframe
  src="/examples/sparklines-overview/index.html"
  width="100%"
  height="500"
  style={{border: '1px solid #ddd', borderRadius: '8px'}}
></iframe>

## API Reference

| Option | Type | Description |
| --- | --- | --- |
| `sparkline` | `object` | Grid option that enables in-cell sparkline mini charts. |
| `rowHeight` | `number` | Row height; increase to give sparklines room to render. |
| `columns` | `array` | Column definitions; a numeric field drives the sparkline. |

## Related

- [Sparklines Installation](/docs/sparklines/installation)
- [Integrated Charting Overview](/docs/charting/overview)
- [Chart Types](/docs/charting/chart-types)
