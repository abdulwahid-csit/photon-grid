---
sidebar_position: 6
title: "Chart Menu"
description: "Download charts and export images in Photon Grid using downloadChart, exportChartAsImage, and getChartImageDataURL from the chart menu in your data grid."
keywords: [photon grid, javascript data grid, chart menu, downloadChart, exportChartAsImage, getChartImageDataURL]
---

# Chart Menu

The **chart menu** exposes the actions a user can take on a chart — most importantly, getting the chart out of the grid as a file or an image. Photon Grid backs these actions with `downloadChart`, `exportChartAsImage`, and `getChartImageDataURL`, so you can trigger the same operations from your own toolbar or menu.

## Overview

Once a chart exists, you often want to save or share it. The chart API provides three export paths, all keyed by the chart id:

| Action | Method | Result |
| --- | --- | --- |
| Download | `downloadChart(id)` | Triggers a file download of the chart. |
| Export image | `exportChartAsImage(id)` | Produces an image of the chart (for example a PNG). |
| Get data URL | `getChartImageDataURL(id)` | Returns the chart image as a data URL string. |

You get the chart id from the `chart:created` event payload (or the value returned when you create the chart). Use `getChartImageDataURL` when you want to embed the image in the DOM or POST it to a server; use `downloadChart` for a one-click save.

## Downloading and exporting a chart

Create a chart, capture its id, then wire the export actions. Guard each call so a missing chart id cannot throw.

```js
const api = grid.api;
let chartId = null;

api.on("chart:created", (event) => {
  chartId = event.chartId || event.id;
});

document.getElementById("download").addEventListener("click", () => {
  try {
    if (chartId) api.downloadChart(chartId);
  } catch (err) {
    console.warn(err.message);
  }
});

document.getElementById("export").addEventListener("click", () => {
  try {
    if (chartId) {
      const image = api.exportChartAsImage(chartId);
      console.log("Exported image", image);
    }
  } catch (err) {
    console.warn(err.message);
  }
});

document.getElementById("dataUrl").addEventListener("click", () => {
  try {
    if (chartId) {
      const url = api.getChartImageDataURL(chartId);
      console.log("Data URL", url);
    }
  } catch (err) {
    console.warn(err.message);
  }
});
```

Depending on your build these methods may return a value directly or a promise; handle both if you consume the result.

## Live Example

<iframe
  src="/examples/chart-menu/index.html"
  width="100%"
  height="500"
  style={{border: '1px solid #ddd', borderRadius: '8px'}}
></iframe>

## API Reference

| Method | Type | Description |
| --- | --- | --- |
| `api.downloadChart(id)` | Method | Trigger a file download of the chart. |
| `api.exportChartAsImage(id)` | Method | Export the chart as an image. |
| `api.getChartImageDataURL(id)` | Method | Return the chart image as a data URL string. |
| `chart:created` | Event | Fired when a chart is created; source of the chart id. |

## Related

- [Integrated Charting Overview](/docs/charting/overview)
- [Chart Tool Pannel](/docs/charting/chart-tool-panel)
- [Saving Charts](/docs/charting/saving-charts)
- [Chart Events](/docs/charting/chart-events)
