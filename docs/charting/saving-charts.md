---
sidebar_position: 8
title: "Saving Charts"
description: "Persist and restore Photon Grid charts with getChartModels and restoreChart. Save chart state, destroy charts, and rebuild them later in your data grid."
keywords: [photon grid, javascript data grid, saving charts, getChartModels, restoreChart, chart persistence]
---

# Saving Charts

Charts in Photon Grid can be **saved and restored** so they survive a page reload, a saved view, or a round trip to your server. You serialize charts to plain models with `getChartModels`, store them wherever you like, and rebuild them later with `restoreChart`.

## Overview

Persistence works in two steps:

1. **Save** — `getChartModels()` returns serializable models describing the charts currently on the grid. Store these as part of your application state (local storage, a database, a saved layout).
2. **Restore** — `restoreChart(model)` rebuilds a chart from one of those models. Call it once per saved model to recreate every chart.

Because the models are plain data, you can keep them alongside grid state such as filters and column layout, giving users a fully restorable workspace. When a chart is torn down with `destroyChart`, its model is exactly what you need to bring it back.

## Save, destroy, and restore

Save the current charts, destroy them, then restore from the saved models. Guard each step so the flow is safe in any order.

```js
const api = grid.api;
let savedModels = null;
let chartId = null;

api.on("chart:created", (event) => {
  chartId = event.chartId || event.id;
});

// 1. Save every chart to models you can persist.
document.getElementById("save").addEventListener("click", () => {
  savedModels = api.getChartModels();
  console.log("Saved models", savedModels);
});

// 2. Tear a chart down (e.g. before a reload).
document.getElementById("destroy").addEventListener("click", () => {
  try {
    if (chartId) api.destroyChart(chartId);
  } catch (err) {
    console.warn(err.message);
  }
});

// 3. Rebuild charts from the saved models.
document.getElementById("restore").addEventListener("click", () => {
  if (!savedModels) return;
  const models = Array.isArray(savedModels) ? savedModels : [savedModels];
  models.forEach((model) => api.restoreChart(model));
});
```

Persisting `getChartModels()` output alongside your grid state gives users charts that come back exactly as they left them.

## Live Example

<iframe
  src="/examples/saving-charts/index.html"
  width="100%"
  height="500"
  style={{border: '1px solid #ddd', borderRadius: '8px'}}
></iframe>

## API Reference

| Method / Event | Type | Description |
| --- | --- | --- |
| `api.getChartModels()` | Method | Return serializable models for all current charts. |
| `api.restoreChart(model)` | Method | Rebuild a chart from a saved model. |
| `api.destroyChart(id)` | Method | Remove a chart by id. |
| `chart:created` | Event | Fired when a chart is created. |
| `chart:destroyed` | Event | Fired when a chart is destroyed. |

## Related

- [Integrated Charting Overview](/docs/charting/overview)
- [Range Charts](/docs/charting/range-charts)
- [Chart Tool Pannel](/docs/charting/chart-tool-panel)
- [Chart Menu](/docs/charting/chart-menu)
