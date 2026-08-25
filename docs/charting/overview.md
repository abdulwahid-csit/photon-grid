---
sidebar_position: 1
title: "Integrated Charting Overview"
description: "Turn Photon Grid data into interactive charts with the integrated charting API. Create range charts, handle chart events, and export images in your data grid."
keywords: [photon grid, javascript data grid, integrated charts, grid charting, createRangeChart, chart api]
---

# Integrated Charting

Photon Grid ships with **integrated charting** so you can turn the data already in your grid into interactive charts without a separate charting library. Users select a range of cells, and the grid builds a chart from it — column, bar, line, area, or pie — all driven by the `grid.api` chart methods.

## Overview

Integrated charting connects the grid's data model to a chart surface. Instead of exporting rows and wiring up a third-party library, you call a single API method and the grid reads the selected cells, infers categories and series, and renders a chart. Because the chart is bound to the grid, it can react to changes through the `chart:*` event family.

Use integrated charting when you want business users to explore data visually, or when you want to script chart creation from application code (for dashboards, reports, or snapshots). The core building blocks are:

- **`createRangeChart`** — build a chart from the currently selected cell range.
- **`createChart`** — build a chart programmatically from application code.
- **`updateChart`** / **`destroyChart`** — change or remove an existing chart.
- **`getChartModels`** / **`restoreChart`** — persist charts and rebuild them later.
- **`downloadChart`** / **`exportChartAsImage`** / **`getChartImageDataURL`** — get the chart out as a file or image.
- Events: **`chart:created`**, **`chart:destroyed`**, **`chart:rangeSelectionChanged`**, **`chart:optionsChanged`**.

## Basic usage

Enable cell selection so users can pick a range, then create a chart from the current selection. The configuration object passed to `createRangeChart` below is illustrative — pass the chart type and container your build expects, and keep it minimal.

```js
const grid = new PhotonGrid.GridCore(document.getElementById("grid"), {
  columns,
  data: rowData,
  selection: { mode: "multiple" }
});

const api = grid.api;

// Log every time a chart is created.
api.on("chart:created", (event) => {
  console.log("Chart created", event);
});

document.getElementById("create").addEventListener("click", () => {
  try {
    api.createRangeChart({
      chartType: "column",
      chartContainer: document.getElementById("chart")
    });
  } catch (err) {
    console.warn("Select a range first:", err.message);
  }
});
```

Wrapping chart creation in `try/catch` keeps the page responsive if no range is selected yet.

## Live Example

<iframe
  src="/examples/charts-overview/index.html"
  width="100%"
  height="500"
  style={{border: '1px solid #ddd', borderRadius: '8px'}}
></iframe>

## API Reference

| Method / Event | Type | Description |
| --- | --- | --- |
| `api.createRangeChart(config)` | Method | Create a chart from the currently selected cell range. |
| `api.createChart(config)` | Method | Create a chart programmatically from application code. |
| `api.updateChart(id, options)` | Method | Update an existing chart's options. |
| `api.destroyChart(id)` | Method | Remove a chart by id. |
| `api.getChartModels()` | Method | Return serializable models for all charts. |
| `api.restoreChart(model)` | Method | Rebuild a chart from a saved model. |
| `chart:created` | Event | Fired when a chart is created. |
| `chart:destroyed` | Event | Fired when a chart is destroyed. |

## Related

- [Integrated Charting Installation](/docs/charting/installation)
- [Chart Types](/docs/charting/chart-types)
- [Range Charts](/docs/charting/range-charts)
- [Chart Events](/docs/charting/chart-events)
- [Saving Charts](/docs/charting/saving-charts)
- [Sparklines Overview](/docs/sparklines/overview)
