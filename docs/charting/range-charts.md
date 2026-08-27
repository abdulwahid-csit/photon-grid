---
sidebar_position: 4
title: "Range Charts"
description: "Chart a selected cell range in Photon Grid with createRangeChart and react to chart:rangeSelectionChanged events for interactive analysis in a data grid."
keywords: [photon grid, javascript data grid, range charts, createRangeChart, cell range selection, chart range]
---

# Range Charts

A **range chart** is built directly from the cells a user selects in the grid. With Photon Grid you highlight a rectangular range, call `createRangeChart`, and the grid turns that selection into a chart — then keeps you informed as the charted range changes through the `chart:rangeSelectionChanged` event.

## Overview

Range charts are the most direct way to let users explore their data. The workflow is:

1. The user selects a range of cells (enabled through the `selection` grid option).
2. Your code reads the selection — `getCellRanges()` reports the current ranges.
3. You call `createRangeChart` to chart the selection.
4. The grid emits `chart:rangeSelectionChanged` when the range backing a chart changes.

This keeps the chart tied to real grid data, so it always reflects the cells the user picked. Include a numeric column (such as `salary`) in the selection so there is a value series to plot.

## Charting the current selection

Enable selection, then create a chart from whatever range is currently active. The config object is illustrative — keep it to the chart type and container.

```js
const grid = new PhotonGrid.GridCore(document.getElementById("grid"), {
  columns,
  data: rowData,
  selection: { mode: "multiple" }
});

const api = grid.api;

// Stay in sync as the charted range changes.
api.on("chart:rangeSelectionChanged", (event) => {
  console.log("Charted range changed", event);
});

document.getElementById("create").addEventListener("click", () => {
  try {
    const ranges = api.getCellRanges();
    console.log("Selected ranges:", ranges);

    api.createRangeChart({
      chartType: "column",
      chartContainer: document.getElementById("chart")
    });
  } catch (err) {
    console.warn("Select a range first:", err.message);
  }
});
```

Because `createRangeChart` depends on an active selection, the `try/catch` ensures the example never hard-crashes if the user clicks before selecting.

## Live Example

<iframe
  src="/examples/range-charts/index.html"
  width="100%"
  height="500"
  style={{border: '1px solid #ddd', borderRadius: '8px'}}
></iframe>

## API Reference

| Method / Event | Type | Description |
| --- | --- | --- |
| `api.createRangeChart(config)` | Method | Create a chart from the currently selected cell range. |
| `api.getCellRanges()` | Method | Return the currently selected cell ranges. |
| `api.setCellRange(...)` | Method | Programmatically set a cell range selection. |
| `api.clearCellSelection()` | Method | Clear the current cell selection. |
| `chart:rangeSelectionChanged` | Event | Fired when the range backing a chart changes. |
| `chart:created` | Event | Fired when the chart is created. |

## Related

- [Integrated Charting Overview](/docs/charting/overview)
- [Chart Types](/docs/charting/chart-types)
- [Chart Events](/docs/charting/chart-events)
- [Saving Charts](/docs/charting/saving-charts)
