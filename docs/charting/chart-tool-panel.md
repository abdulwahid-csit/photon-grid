---
sidebar_position: 7
title: "Chart Tool Pannel"
description: "Edit chart settings in Photon Grid with the chart tool panel and apply changes using updateChart, reacting to the chart:optionsChanged event in a data grid."
keywords: [photon grid, javascript data grid, chart tool panel, updateChart, chart settings, chart:optionsChanged]
---

# Chart Tool Pannel

The **chart tool panel** is where users adjust a chart's settings — its type, series, and appearance — after it has been created. Whatever the panel changes is applied through Photon Grid's `updateChart` method, and every change is announced with the `chart:optionsChanged` event.

## Overview

Think of the tool panel as a live editor bound to an existing chart. Rather than destroying and recreating a chart to change it, you mutate it in place:

- The panel edits settings for a chart identified by its chart id.
- Each edit calls `updateChart(id, options)` to apply the change.
- The grid emits `chart:optionsChanged` so the rest of your app can respond.

This lets users refine a chart interactively — switch from column to line, or adjust which data it shows — without losing the chart or its position. The options object you pass to `updateChart` is illustrative here; provide only the keys your build documents.

## Applying changes with updateChart

Create a chart, keep its id, then apply setting changes as the panel would. Guard the calls so they are safe before a chart exists.

```js
const api = grid.api;
let chartId = null;

api.on("chart:created", (event) => {
  chartId = event.chartId || event.id;
});

// React when chart options change.
api.on("chart:optionsChanged", (event) => {
  console.log("Chart options changed", event);
});

document.getElementById("toBar").addEventListener("click", () => {
  try {
    if (chartId) {
      // Illustrative options — apply only keys your build supports.
      api.updateChart(chartId, { chartType: "bar" });
    }
  } catch (err) {
    console.warn(err.message);
  }
});
```

Every successful `updateChart` call that changes options triggers `chart:optionsChanged`, which you can use to persist the new chart state or update surrounding UI.

## Live Example

<iframe
  src="/examples/chart-tool-panel/index.html"
  width="100%"
  height="500"
  style={{border: '1px solid #ddd', borderRadius: '8px'}}
></iframe>

## API Reference

| Method / Event | Type | Description |
| --- | --- | --- |
| `api.updateChart(id, options)` | Method | Apply setting changes to an existing chart. |
| `api.createChart(config)` | Method | Create a chart to edit. |
| `api.createRangeChart(config)` | Method | Create a chart from a selected range. |
| `chart:optionsChanged` | Event | Fired when a chart's options change. |
| `chart:created` | Event | Fired when a chart is created; source of the chart id. |

## Related

- [Integrated Charting Overview](/docs/charting/overview)
- [Chart Types](/docs/charting/chart-types)
- [Chart Menu](/docs/charting/chart-menu)
- [Chart Events](/docs/charting/chart-events)
- [Saving Charts](/docs/charting/saving-charts)
